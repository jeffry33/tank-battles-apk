export class MultiplayerClient {
  constructor({ onStatus = () => {}, onState = () => {}, onShot = () => {} } = {}) {
    this.onStatus = onStatus;
    this.onState = onState;
    this.onShot = onShot;
    this.socket = null;
    this.playerId = null;
    this.roomId = null;
    this.hostId = null;
    this.reconnectKey = null;
    this.reconnectToken = null;
  }

  connect(url, roomId = 'quick-match', mode = 'free-for-all', displayName = 'Commander') {
    this.reconnectKey = 'tank-battle-reconnect:' + url + ':' + roomId;
    try { this.reconnectToken = localStorage.getItem(this.reconnectKey); } catch { this.reconnectToken = null; }
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.send({ type: 'join', roomId, mode, displayName, reconnectToken: this.reconnectToken });
      return;
    }
    if (this.socket) this.socket.close();
    this.onStatus('Connecting to multiplayer server…');
    try {
      this.socket = new WebSocket(url);
      this.socket.addEventListener('open', () => {
        this.onStatus('Connected · joining room…');
        this.send({ type: 'join', roomId, mode, displayName, reconnectToken: this.reconnectToken });
      });
      this.socket.addEventListener('message', event => {
        let message;
        try { message = JSON.parse(event.data); } catch { return; }
        if (message.type === 'joined') {
          this.playerId = message.playerId;
          this.reconnectToken = message.reconnectToken || this.reconnectToken;
          try { if (this.reconnectToken && this.reconnectKey) localStorage.setItem(this.reconnectKey, this.reconnectToken); } catch { /* Storage may be unavailable in private browsing. */ }
          this.roomId = message.roomId;
          this.hostId = message.state?.hostId || null;
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

  setReady(ready) { return this.send({ type: 'ready', ready: Boolean(ready) }); }
  startDeployment() { return this.send({ type: 'start-deployment' }); }
  land(x, z) { return this.send({ type: 'land', x, z }); }
  move(x, z, yaw) { return this.send({ type: 'move', x, z, yaw }); }
  shoot(shot) { return this.send({ type: 'shoot', shot }); }
  ping() { return this.send({ type: 'ping' }); }
  disconnect({ forgetSession = false } = {}) {
    this.socket?.close();
    this.socket = null;
    if (forgetSession && this.reconnectKey) {
      try { localStorage.removeItem(this.reconnectKey); } catch { /* Storage may be unavailable. */ }
      this.reconnectToken = null;
    }
  }
}
