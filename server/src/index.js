import { WebSocketServer } from 'ws';
import { randomUUID } from 'node:crypto';
import { MatchState, MATCH_RULES } from '../match-state.js';

const PORT = Number(process.env.PORT || 2567);
const wss = new WebSocketServer({ port: PORT });
const rooms = new Map();

function send(socket, type, payload = {}) {
  if (socket.readyState === socket.OPEN) socket.send(JSON.stringify({ type, ...payload }));
}
function broadcast(room, type, payload = {}) {
  const message = JSON.stringify({ type, ...payload });
  for (const socket of room.clients) {
    if (socket.readyState === socket.OPEN) socket.send(message);
  }
}
function publicState(room) {
  return room.match.snapshot();
}
function getRoom(roomId, mode) {
  let room = rooms.get(roomId);
  if (!room) {
    room = { id: roomId, match: new MatchState(mode), clients: new Set(), playerSockets: new Map() };
    rooms.set(roomId, room);
  }
  return room;
}

wss.on('connection', socket => {
  socket.id = randomUUID();
  socket.room = null;
  socket.playerId = null;

  socket.on('message', raw => {
    let message;
    try { message = JSON.parse(raw.toString()); }
    catch { return send(socket, 'error', { message: 'Invalid JSON message' }); }

    try {
      if (message.type === 'join') {
        if (socket.room) throw new Error('Already joined a room');
        const roomId = String(message.roomId || 'quick-match').slice(0, 32);
        const mode = message.mode === MATCH_RULES.modes.TEAMS ? MATCH_RULES.modes.TEAMS : MATCH_RULES.modes.FFA;
        const room = getRoom(roomId, mode);
        if (room.match.mode !== mode) throw new Error('Room game mode does not match');
        const playerId = socket.id;
        room.match.addPlayer(playerId, String(message.displayName || 'Commander'));
        room.clients.add(socket);
        room.playerSockets.set(playerId, socket);
        socket.room = room;
        socket.playerId = playerId;
        send(socket, 'joined', { playerId, roomId, state: publicState(room) });
        broadcast(room, 'state', { state: publicState(room) });
        return;
      }

      const room = socket.room;
      if (!room) throw new Error('Join a room first');

      if (message.type === 'start-deployment') {
        if (room.match.status !== 'waiting') throw new Error('Deployment already started');
        room.match.beginDeployment(socket.playerId);
        broadcast(room, 'state', { state: publicState(room) });
      } else if (message.type === 'land') {
        const { x, z } = message;
        // Server performs basic arena bounds validation; production needs terrain/navmesh validation.
        const valid = Number.isFinite(x) && Number.isFinite(z) &&
          Math.abs(x) <= 48 && Math.abs(z) <= 48 && Math.abs(x) >= 7;
        room.match.setLanding(socket.playerId, x, z, valid);
        broadcast(room, 'state', { state: publicState(room) });
      } else if (message.type === 'move') {
        const state = room.match.updateMovement(socket.playerId, message.x, message.z, message.yaw);
        broadcast(room, 'state', { state });
      } else if (message.type === 'shoot') {
        const result = room.match.resolveShot(socket.playerId, message.shot);
        broadcast(room, 'shot-resolved', {
          playerId: socket.playerId,
          shot: result.shot,
          impact: result.impact,
          impacts: result.impacts,
          objectImpacts: result.objectImpacts,
          state: result.state
        });
      } else if (message.type === 'turn-expired') {
        if (room.match.currentPlayerId() !== socket.playerId) throw new Error('Not your turn');
        if (!room.match.skipExpiredTurn(Date.now())) throw new Error('Turn has not expired');
        broadcast(room, 'state', { state: publicState(room) });
      } else if (message.type === 'ping') {
        send(socket, 'pong', { at: Date.now() });
      } else {
        throw new Error('Unknown message type');
      }
    } catch (error) {
      send(socket, 'error', { message: error.message || 'Request rejected' });
    }
  });

  socket.on('close', () => {
    const room = socket.room;
    if (!room) return;
    room.clients.delete(socket);
    // Disconnects are not yet handled as eliminations; retain player state for reconnect work.
    if (room.clients.size === 0 && room.match.status === 'waiting') rooms.delete(room.id);
  });
});


// Authoritative room clocks: deployment fallback and turn expiration are processed on the server.
setInterval(() => {
  for (const room of rooms.values()) {
    const result = room.match.tick(Date.now());
    if (result) {
      broadcast(room, 'phase-event', { event: result.event });
      broadcast(room, 'state', { state: result.state });
    }
  }
}, 250);

wss.on('listening', () => console.log(`TANK BATTLE WebSocket server listening on :${PORT}`));
