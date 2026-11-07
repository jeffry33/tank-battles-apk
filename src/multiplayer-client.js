export class MultiplayerClient {
  constructor({ onStatus = () => {}, onState = () => {}, onShot = () => {} } = {}) {
    this.onStatus = onStatus;
    this.onState = onState;
    this.onShot = onShot;
    this.socket = null;
    this.playerId = null;
    this.roomId = null;
  }

  connect(url, roomId = 'quick-match', mode = 'free-for-all', displayName = 'Commander') {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.send({ type: 'join', roomId, mode, displayName });
      return;
    }
    if (this.socket) this.socket.close();
    this.onStatus('Connecting to multiplayer server…');
    try {
      this.socket = new WebSocket(url);
      this.socket.addEventListener('open', () => {
        this.onStatus('Connected · joining room…');
        this.send({ type: 'join', roomId, mode, displayName });
      });
      this.socket.addEventListener('message', event => {
        let message;
        try { message = JSON.parse(event.data); } catch { return; }
        if (message.type === 'joined') {
          this.playerId = message.playerId;
          this.roomId = message.roomId;
          this.onStatus('Joined room ' + this.roomId);
          if (message.state) this.onState(message.state);
        } else if (message.type === 'state') {
          this.onState(message.state);
        } else if (message.type === 'shot') {
          this.onShot(message);
        } else if (message.type === 'shot-resolved') {
          this.onShot(message);
          if (message.state) this.onState(message.state);
        } else if (message.type === 'error') {
          this.onStatus('Server: ' + message.message);
        } else if (message.type === 'pong') {
          this.onStatus('Server connected');
        }
      });
      this.socket.addEventListener('close', () => this.onStatus('Disconnected from server'));
      this.socket.addEventListener('error', () => this.onStatus('Connection failed · check server URL'));
    } catch (error) {
      this.onStatus('Connection error: ' + error.message);
    }
  }

  send(payload) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      this.onStatus('Not connected to multiplayer server');
      return false;
    }
    this.socket.send(JSON.stringify(payload));
    return true;
  }

  startDeployment() { return this.send({ type: 'start-deployment' }); }
  land(x, z) { return this.send({ type: 'land', x, z }); }
  move(x, z, yaw) { return this.send({ type: 'move', x, z, yaw }); }
  shoot(shot) { return this.send({ type: 'shoot', shot }); }
  ping() { return this.send({ type: 'ping' }); }
  disconnect() { this.socket?.close(); this.socket = null; }
}
