import { WebSocketServer } from 'ws';
import { randomUUID } from 'node:crypto';
import { MatchState, MATCH_RULES } from '../match-state.js';
import { createMessageRateLimiter } from '../rate-limit.js';

const PORT = Number(process.env.PORT || 2567);
const wss = new WebSocketServer({ port: PORT, maxPayload: 16 * 1024 });
const rooms = new Map();
const RECONNECT_GRACE_MS = 90000;

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
    room = { id: roomId, match: new MatchState(mode), clients: new Set(), playerSockets: new Map(), reconnectTokens: new Map(), emptySince: null };
    rooms.set(roomId, room);
  }
  return room;
}

wss.on('connection', socket => {
  socket.id = randomUUID();
  socket.room = null;
  socket.playerId = null;
  const allowMessage = createMessageRateLimiter({ limit: 50, windowMs: 10000 });

  socket.on('message', raw => {
    if (!allowMessage()) return send(socket, 'error', { message: 'Message rate limit exceeded; slow down' });
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
        let playerId;
        let reconnectToken;
        if (message.reconnectToken) {
          const existingId = [...room.reconnectTokens.entries()]
            .find(([, token]) => token === message.reconnectToken)?.[0];
          if (!existingId) throw new Error('Reconnect token is invalid for this room');
          playerId = existingId;
          const existingSocket = room.playerSockets.get(playerId);
          if (existingSocket && existingSocket !== socket) {
            room.clients.delete(existingSocket);
            existingSocket.close(4001, 'Session replaced by reconnect');
          }
          room.match.reconnectPlayer(playerId);
          reconnectToken = message.reconnectToken;
        } else {
          playerId = socket.id;
          room.match.addPlayer(playerId, String(message.displayName || 'Commander'));
          reconnectToken = randomUUID();
          room.reconnectTokens.set(playerId, reconnectToken);
        }
        room.emptySince = null;
        room.clients.add(socket);
        room.playerSockets.set(playerId, socket);
        socket.room = room;
        socket.playerId = playerId;
        send(socket, 'joined', { playerId, roomId, reconnectToken, state: publicState(room) });
        broadcast(room, 'state', { state: publicState(room) });
        return;
      }

      const room = socket.room;
      if (!room) throw new Error('Join a room first');

      if (message.type === 'ready') {
        const state = room.match.setReady(socket.playerId, message.ready);
        broadcast(room, 'state', { state });
      } else if (message.type === 'start-deployment') {
        if (room.match.status !== 'waiting') throw new Error('Deployment already started');
        room.match.addBotPlayers();
        room.match.beginDeployment(socket.playerId);
        broadcast(room, 'state', { state: publicState(room) });
      } else if (message.type === 'land') {
        const { x, z } = message;
        // Only validate payload types here. MatchState owns arena bounds, river,
        // bridge, bunker-footprint and spacing rules; duplicating partial rules
        // here previously rejected the valid bridge landing at x=0.
        const valid = Number.isFinite(x) && Number.isFinite(z);
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
    if (room.playerSockets.get(socket.playerId) === socket) {
      room.playerSockets.delete(socket.playerId);
      room.match.markDisconnected(socket.playerId);
      broadcast(room, 'state', { state: publicState(room) });
    }
    // Retain the room briefly so a dropped mobile connection can resume its session.
    if (room.clients.size === 0) room.emptySince = Date.now();
  });
});


// Authoritative room clocks: deployment fallback and turn expiration are processed on the server.
setInterval(() => {
  const now = Date.now();
  for (const [roomId, room] of rooms) {
    if (room.clients.size === 0 && room.emptySince !== null &&
        now - room.emptySince >= RECONNECT_GRACE_MS && room.match.status === 'waiting') {
      rooms.delete(roomId);
      continue;
    }
    const expired = room.match.expireDisconnectedPlayers(now, RECONNECT_GRACE_MS);
    for (const playerId of expired) room.reconnectTokens.delete(playerId);
    if (expired.length) broadcast(room, 'state', { state: publicState(room) });
    const current = room.match.status === 'combat' ? room.match.players.get(room.match.currentPlayerId()) : null;
    if (current?.isBot) {
      current.botThinkAt ??= now + 1200;
      if (now >= current.botThinkAt) {
        const enemies = [...room.match.players.values()].filter(p => p.alive && p.id !== current.id &&
          !(room.match.mode === MATCH_RULES.modes.TEAMS && p.team === current.team));
        if (enemies.length) {
          const target = enemies.sort((a,b) => Math.hypot(a.x-current.x,a.z-current.z)-Math.hypot(b.x-current.x,b.z-current.z))[0];
          const dx = target.x-current.x, dz = target.z-current.z;
          const distance = Math.hypot(dx,dz);
          const yaw = Math.atan2(-dx,-dz) * 180 / Math.PI;
          const elevation = 38;
          const requiredSpeed = Math.sqrt(Math.max(1,distance) * 9.81 / Math.max(0.2,Math.sin(2*elevation*Math.PI/180)));
          const power = Math.max(25,Math.min(100,requiredSpeed/42*100));
          const result = room.match.resolveShot(current.id,{yaw,elevation,power,weapon:'standard'},now);
          broadcast(room,'shot-resolved',{playerId:current.id,shot:result.shot,impact:result.impact,impacts:result.impacts,objectImpacts:result.objectImpacts,state:result.state});
        }
        current.botThinkAt = null;
      }
    }
    const result = room.match.tick(now);
    if (result) {
      broadcast(room, 'phase-event', { event: result.event });
      broadcast(room, 'state', { state: result.state });
    }
  }
}, 250);

wss.on('listening', () => console.log(`TANK BATTLE WebSocket server listening on :${PORT}`));
