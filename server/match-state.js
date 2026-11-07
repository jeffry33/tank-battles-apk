// Match rules and server-owned player state. Coordinates use the arena's local X/Z plane.
export const MATCH_RULES = Object.freeze({
  maxPlayers: 4,
  turnSeconds: 60,
  arenaLimit: 48,
  movementPerTurn: 8,
  modes: Object.freeze({ FFA: 'free-for-all', TEAMS: 'team-battle' })
});

import { ARENA_DESTRUCTIBLES } from '../src/arena-destructibles.js';

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
    this.hostId = null;
    this.destructibles = new Map(ARENA_DESTRUCTIBLES.map(item => [item.id, { ...item, alive: true }]));
  }

  addPlayer(id, displayName = 'Commander') {
    if (this.status !== 'waiting') throw new Error('Match already started');
    if (this.players.size >= MATCH_RULES.maxPlayers) throw new Error('Match is full');
    if (this.players.has(id)) throw new Error('Player already joined');
    const team = this.mode === MATCH_RULES.modes.TEAMS ? this.players.size % 2 : null;
    const spawn = [
      { x: -30, z: -30 }, { x: 30, z: -30 },
      { x: -30, z: 30 }, { x: 30, z: 30 }
    ][this.players.size];
    if (!this.hostId) this.hostId = id;
    this.players.set(id, {
      id, displayName: String(displayName).slice(0, 20), team,
      hp: 100, alive: true, landed: false,
      x: spawn.x, z: spawn.z, yaw: 0, movedThisTurn: 0
    });
    return this.snapshot();
  }

  setLanding(id, x, z, valid) {
    const player = this.requirePlayer(id);
    if (this.status !== 'deploying') throw new Error('Not in deployment phase');
    if (!valid || !Number.isFinite(x) || !Number.isFinite(z)) throw new Error('Invalid landing location');
    if (Math.abs(x) > MATCH_RULES.arenaLimit || Math.abs(z) > MATCH_RULES.arenaLimit || Math.abs(x) < 7) throw new Error('Landing outside safe zone');
    player.x = x; player.z = z; player.landed = true;
    if ([...this.players.values()].every(p => p.landed)) this.beginCombat(Date.now());
    return this.snapshot();
  }

  beginDeployment(requesterId, now = Date.now()) {
    if (requesterId !== this.hostId) throw new Error('Only the room host can start the match');
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
    this.turnOrder = this.turnOrder.filter(id => this.players.get(id)?.alive);
    if (this.isMatchOver()) return this.finishMatch();
    this.turnIndex %= Math.max(1, this.turnOrder.length);
    const current = this.players.get(this.currentPlayerId());
    if (current) current.movedThisTurn = 0;
    this.turnDeadline = now + MATCH_RULES.turnSeconds * 1000;
  }

  updateMovement(id, x, z, yaw, now = Date.now()) {
    if (this.status !== 'combat') throw new Error('Match is not in combat');
    if (this.currentPlayerId() !== id) throw new Error('It is not this player\'s turn');
    if (now > this.turnDeadline) throw new Error('Turn expired');
    if (![x, z, yaw].every(Number.isFinite)) throw new Error('Invalid movement values');
    const player = this.requirePlayer(id);
    if (!player.alive) throw new Error('Tank is eliminated');
    const dx = x - player.x, dz = z - player.z;
    const distance = Math.hypot(dx, dz);
    if (distance > 1.25) throw new Error('Movement update exceeds allowed step');
    if (Math.abs(x) > MATCH_RULES.arenaLimit || Math.abs(z) > MATCH_RULES.arenaLimit) throw new Error('Arena boundary reached');
    if (player.movedThisTurn + distance > MATCH_RULES.movementPerTurn) throw new Error('Movement allowance used');
    player.x = x; player.z = z; player.yaw = ((yaw % 360) + 360) % 360;
    player.movedThisTurn += distance;
    return this.snapshot();
  }

  submitShot(id, shot, now = Date.now()) {
    if (this.status !== 'combat') throw new Error('Match is not in combat');
    if (this.currentPlayerId() !== id) throw new Error('It is not this player\'s turn');
    if (now > this.turnDeadline) throw new Error('Turn expired');
    if (!shot || !Number.isFinite(shot.yaw) || !Number.isFinite(shot.elevation) || !Number.isFinite(shot.power)) throw new Error('Invalid shot');
    return {
      playerId: id,
      yaw: ((shot.yaw % 360) + 360) % 360,
      elevation: Math.max(10, Math.min(80, shot.elevation)),
      power: Math.max(20, Math.min(100, shot.power)),
      weapon: ['standard','heavy','guided','cluster'].includes(shot.weapon) ? shot.weapon : 'standard'
    };
  }

  resolveShot(id, shot, now = Date.now()) {
    const validated = this.submitShot(id, shot, now);
    const shooter = this.requirePlayer(id);
    const yaw = validated.yaw * Math.PI / 180;
    const elevation = validated.elevation * Math.PI / 180;
    const speed = validated.power / 100 * 42;
    const vx = -Math.sin(yaw) * Math.cos(elevation) * speed;
    const vy = Math.sin(elevation) * speed;
    const vz = -Math.cos(yaw) * Math.cos(elevation) * speed;
    let x = shooter.x, y = 1.8, z = shooter.z, t = 0;
    const gravity = 9.81, step = 0.04;
    let impactReason = 'ground';
    while (t < 8) {
      t += step;
      x += vx * step;
      y += vy * step - 0.5 * gravity * step * step;
      z += vz * step;
      // Simple tank hit test; terrain and static-object collision are future work.
      const hit = [...this.players.values()].find(target => target.alive && target.id !== id &&
        Math.hypot(target.x - x, target.z - z) < 1.6 && Math.abs(y - 0.8) < 1.6);
      if (hit) { impactReason = 'tank'; break; }
      if (y <= 0) { y = 0; break; }
      if (Math.abs(x) > MATCH_RULES.arenaLimit || Math.abs(z) > MATCH_RULES.arenaLimit) {
        impactReason = 'boundary'; break;
      }
    }
    const radius = validated.weapon === 'heavy' ? 5.5 : validated.weapon === 'cluster' ? 4.8 : validated.weapon === 'guided' ? 4.5 : 4;
    const baseDamage = validated.weapon === 'heavy' ? 42 : validated.weapon === 'cluster' ? 26 : validated.weapon === 'guided' ? 34 : 30;
    const impacts = [];
    const objectImpacts = [];
    for (const object of this.destructibles.values()) {
      if (!object.alive) continue;
      const distance = Math.hypot(object.x - x, object.y - y, object.z - z);
      const reach = radius + object.radius;
      if (distance > reach) continue;
      const damage = Math.max(0, Math.round(baseDamage * (1 - distance / reach)));
      if (!damage) continue;
      object.hp = Math.max(0, object.hp - damage);
      if (object.hp === 0) object.alive = false;
      objectImpacts.push({ id: object.id, hp: object.hp, alive: object.alive });
    }
    const shooterTeam = shooter.team;
    for (const target of this.players.values()) {
      if (!target.alive || target.id === shooter.id) continue;
      // Team Battle disables friendly fire. FFA has no team restriction.
      if (this.mode === MATCH_RULES.modes.TEAMS && target.team === shooterTeam) continue;
      const distance = Math.hypot(target.x - x, target.z - z);
      if (distance <= radius) {
        const damage = Math.max(0, Math.round(baseDamage * (1 - distance / (radius * 1.5))));
        if (damage > 0) {
          target.hp = Math.max(0, target.hp - damage);
          if (target.hp === 0) target.alive = false;
          impacts.push({ playerId: target.id, damage, hp: target.hp, eliminated: !target.alive });
        }
      }
    }
    this.advanceTurn(now);
    return {
      shot: validated,
      impact: { x, y, z, reason: impactReason, flightSeconds: Number(t.toFixed(2)), radius },
      impacts,
      objectImpacts,
      state: this.snapshot()
    };
  }

  resolveDamage(targetId, damage, now = Date.now()) {
    if (this.status !== 'combat') throw new Error('Match is not in combat');
    const target = this.requirePlayer(targetId);
    target.hp = Math.max(0, target.hp - Math.max(0, Math.min(100, Number(damage) || 0)));
    if (target.hp === 0) target.alive = false;
    this.advanceTurn(now);
    return this.snapshot();
  }

  tick(now = Date.now()) {
    if (this.status === 'deploying' && now >= this.turnDeadline) {
      for (const player of this.players.values()) {
        if (!player.landed) player.landed = true; // Keep the assigned safe spawn as timeout fallback.
      }
      this.beginCombat(now);
      return { event: 'deployment-timeout', state: this.snapshot() };
    }
    if (this.status === 'combat' && now >= this.turnDeadline) {
      this.advanceTurn(now);
      return { event: 'turn-timeout', state: this.snapshot() };
    }
    return null;
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

  currentPlayerId() { return this.turnOrder[this.turnIndex] || null; }

  requirePlayer(id) {
    const player = this.players.get(id);
    if (!player) throw new Error('Unknown player');
    return player;
  }

  isMatchOver() {
    const alive = [...this.players.values()].filter(p => p.alive);
    if (this.mode === MATCH_RULES.modes.TEAMS) {
      const teamsInitiallyPresent = new Set([...this.players.values()].map(p => p.team));
      const livingTeams = new Set(alive.map(p => p.team));
      return livingTeams.size <= 1 || alive.length === 0 || teamsInitiallyPresent.size < 2;
    }
    return alive.length <= 1;
  }

  finishMatch() {
    const alive = [...this.players.values()].filter(p => p.alive);
    this.winner = alive.length === 0 ? null : this.mode === MATCH_RULES.modes.TEAMS ? (alive[0]?.team ?? null) : (alive[0]?.id ?? null);
    this.status = 'finished';
  }

  snapshot() {
    return {
      mode: this.mode, status: this.status, hostId: this.hostId, currentPlayerId: this.currentPlayerId(),
      turnDeadline: this.turnDeadline, winner: this.winner,
      players: [...this.players.values()].map(p => ({ ...p }))
    };
  }
}
