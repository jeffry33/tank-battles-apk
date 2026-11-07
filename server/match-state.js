// Minimal server-authoritative match state for a future Colyseus/WebSocket room.
// This module is intentionally transport-agnostic; clients must never decide damage or turns.
export const MATCH_RULES = Object.freeze({
  maxPlayers: 4,
  turnSeconds: 60,
  modes: Object.freeze({ FFA: 'free-for-all', TEAMS: 'team-battle' })
});

export class MatchState {
  constructor(mode = MATCH_RULES.modes.FFA) {
    if (!Object.values(MATCH_RULES.modes).includes(mode)) throw new Error('Unsupported game mode');
    this.mode = mode;
    this.players = new Map();
    this.turnOrder = [];
    this.turnIndex = 0;
    this.turnDeadline = 0;
    this.status = 'waiting';
    this.winner = null;
  }

  addPlayer(id, displayName = 'Commander') {
    if (this.status !== 'waiting') throw new Error('Match already started');
    if (this.players.size >= MATCH_RULES.maxPlayers) throw new Error('Match is full');
    if (this.players.has(id)) throw new Error('Player already joined');
    const team = this.mode === MATCH_RULES.modes.TEAMS ? this.players.size % 2 : null;
    this.players.set(id, {
      id, displayName: String(displayName).slice(0, 20), team,
      hp: 100, alive: true, landed: false, x: 0, z: 0
    });
    return this.snapshot();
  }

  setLanding(id, x, z, valid) {
    const player = this.requirePlayer(id);
    if (this.status !== 'deploying') throw new Error('Not in deployment phase');
    if (!valid || !Number.isFinite(x) || !Number.isFinite(z)) throw new Error('Invalid landing location');
    if (Math.abs(x) > 48 || Math.abs(z) > 48 || Math.abs(x) < 7) throw new Error('Landing outside safe zone');
    player.x = x; player.z = z; player.landed = true;
    if ([...this.players.values()].every(p => p.landed)) this.beginCombat(Date.now());
    return this.snapshot();
  }

  beginDeployment(now = Date.now()) {
    if (this.players.size < 2) throw new Error('At least two players are required');
    this.status = 'deploying';
    this.turnDeadline = now + 30000;
  }

  beginCombat(now = Date.now()) {
    this.status = 'combat';
    this.turnOrder = [...this.players.keys()];
    this.turnIndex = 0;
    this.startTurn(now);
  }

  startTurn(now = Date.now()) {
    const alive = this.turnOrder.filter(id => this.players.get(id)?.alive);
    this.turnOrder = alive;
    if (this.isMatchOver()) return this.finishMatch();
    this.turnIndex %= Math.max(1, this.turnOrder.length);
    this.turnDeadline = now + MATCH_RULES.turnSeconds * 1000;
  }

  submitShot(id, shot, now = Date.now()) {
    if (this.status !== 'combat') throw new Error('Match is not in combat');
    if (this.currentPlayerId() !== id) throw new Error('It is not this player\'s turn');
    if (now > this.turnDeadline) throw new Error('Turn expired');
    if (!shot || !Number.isFinite(shot.yaw) || !Number.isFinite(shot.elevation) || !Number.isFinite(shot.power)) throw new Error('Invalid shot');
    const elevation = Math.max(10, Math.min(80, shot.elevation));
    const power = Math.max(20, Math.min(100, shot.power));
    return { playerId: id, yaw: shot.yaw, elevation, power, weapon: ['standard','heavy','guided','cluster'].includes(shot.weapon) ? shot.weapon : 'standard' };
  }

  resolveDamage(targetId, damage, now = Date.now()) {
    if (this.status !== 'combat') throw new Error('Match is not in combat');
    const target = this.requirePlayer(targetId);
    target.hp = Math.max(0, target.hp - Math.max(0, Math.min(100, Number(damage) || 0)));
    if (target.hp === 0) target.alive = false;
    this.advanceTurn(now);
    return this.snapshot();
  }

  skipExpiredTurn(now = Date.now()) {
    if (this.status !== 'combat' || now < this.turnDeadline) return false;
    this.advanceTurn(now);
    return true;
  }

  advanceTurn(now = Date.now()) {
    this.turnIndex++;
    this.startTurn(now);
  }

  currentPlayerId() {
    return this.turnOrder[this.turnIndex] || null;
  }

  requirePlayer(id) {
    const player = this.players.get(id);
    if (!player) throw new Error('Unknown player');
    return player;
  }

  isMatchOver() {
    const alive = [...this.players.values()].filter(p => p.alive);
    if (this.mode === MATCH_RULES.modes.TEAMS) return new Set(alive.map(p => p.team)).size <= 1;
    return alive.length <= 1;
  }

  finishMatch() {
    const alive = [...this.players.values()].filter(p => p.alive);
    this.winner = this.mode === MATCH_RULES.modes.TEAMS ? (alive[0]?.team ?? null) : (alive[0]?.id ?? null);
    this.status = 'finished';
  }

  snapshot() {
    return {
      mode: this.mode, status: this.status, currentPlayerId: this.currentPlayerId(),
      turnDeadline: this.turnDeadline, winner: this.winner,
      players: [...this.players.values()].map(p => ({ ...p }))
    };
  }
}
