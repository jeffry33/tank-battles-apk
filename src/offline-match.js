// Browser-safe offline match rules for Solo vs AI. No WebSocket or Node APIs required.
export const OFFLINE_RULES = Object.freeze({ turnSeconds: 60, arenaLimit: 48, movementPerTurn: 8 });
const SPAWNS = [
  { x: -30, z: -30 }, { x: 30, z: -30 },
  { x: -30, z: 30 }, { x: 30, z: 30 }
];

export function isSafeOfflinePosition(x, z) {
  if (!Number.isFinite(x) || !Number.isFinite(z) ||
      Math.abs(x) > OFFLINE_RULES.arenaLimit || Math.abs(z) > OFFLINE_RULES.arenaLimit) return false;
  const onBridge = Math.abs(x) <= 8.9 && z >= 4.2 && z <= 11.8;
  if (Math.abs(x) < 5.5 && !onBridge) return false;
  for (const bx of [-20, 20]) {
    if (Math.abs(x - bx) < 5.8 && Math.abs(z - 13) < 4.8) return false;
  }
  return true;
}

export class OfflineMatch {
  constructor(commanderName = 'Commander', now = 0) {
    this.matchId = 'offline-' + now + '-' + Math.random().toString(36).slice(2, 9);
    this.mode = 'free-for-all';
    this.status = 'combat';
    this.winner = null;
    this.turnOrder = ['human', 'bot-2', 'bot-3', 'bot-4'];
    this.turnIndex = 0;
    this.turnDeadline = now + OFFLINE_RULES.turnSeconds * 1000;
    this.players = this.turnOrder.map((id, index) => ({
      id, displayName: index === 0 ? String(commanderName || 'Commander').slice(0, 20) : 'AI Commander ' + (index + 1),
      isBot: index > 0, team: null, hp: 100, alive: true, x: SPAWNS[index].x, z: SPAWNS[index].z,
      yaw: 0, movedThisTurn: 0, shotsFired: 0, damageDealt: 0, eliminations: 0
    }));
  }

  get currentPlayer() { return this.players.find(p => p.id === this.currentPlayerId) || null; }
  get currentPlayerId() { return this.status === 'combat' ? (this.turnOrder[this.turnIndex] || null) : null; }
  get human() { return this.players[0]; }

  snapshot() {
    return {
      matchId: this.matchId, mode: this.mode, status: this.status, winner: this.winner,
      currentPlayerId: this.currentPlayerId, turnDeadline: this.turnDeadline,
      players: this.players.map(p => ({ ...p }))
    };
  }

  updateHumanPosition(x, z, yaw) {
    const player = this.human;
    if (this.status !== 'combat' || this.currentPlayerId !== 'human' || !player.alive) return false;
    if (![x, z, yaw].every(Number.isFinite) || !isSafeOfflinePosition(x, z)) return false;
    const distance = Math.hypot(x - player.x, z - player.z);
    if (distance > 1.3 || player.movedThisTurn + distance > OFFLINE_RULES.movementPerTurn) return false;
    if (this.players.some(other => other.id !== 'human' && other.alive && Math.hypot(other.x - x, other.z - z) < 3.2)) return false;
    player.x = x; player.z = z; player.yaw = ((yaw % 360) + 360) % 360;
    player.movedThisTurn += distance;
    return true;
  }

  chooseBotShot(bot = this.currentPlayer) {
    if (!bot?.isBot || !bot.alive || this.status !== 'combat' || this.currentPlayerId !== bot.id) return null;
    const target = this.players.filter(p => p.alive && p.id !== bot.id)
      .sort((a, b) => Math.hypot(a.x - bot.x, a.z - bot.z) - Math.hypot(b.x - bot.x, b.z - bot.z))[0];
    if (!target) return null;
    const dx = target.x - bot.x, dz = target.z - bot.z, distance = Math.hypot(dx, dz);
    const yaw = Math.atan2(-dx, -dz) * 180 / Math.PI;
    let best = null;
    for (let elevation = 20; elevation <= 65; elevation += 5) {
      const radians = elevation * Math.PI / 180;
      for (let power = 20; power <= 100; power++) {
        const speed = power / 100 * 42, horizontal = Math.cos(radians) * speed;
        let x = 0, y = 1.8, vy = Math.sin(radians) * speed, miss = Infinity;
        for (let t = 0; t < 8; t += 0.04) {
          x += horizontal * 0.04; vy -= 9.81 * 0.04; y += vy * 0.04;
          miss = Math.min(miss, Math.hypot(x - distance, Math.max(0, Math.abs(y - 0.8) - 1.6)));
          if (y <= 0 || x > distance + 8) break;
        }
        const score = miss + Math.abs(elevation - 40) * 0.002;
        if (!best || score < best.score) best = { elevation, power, score };
      }
    }
    return { yaw, elevation: best.elevation, power: best.power, weapon: 'standard', targetId: target.id };
  }

  resolveShot(playerId, shot, now = 0) {
    if (this.status !== 'combat' || this.currentPlayerId !== playerId) throw new Error('Not this player\'s turn');
    const shooter = this.players.find(p => p.id === playerId);
    if (!shooter?.alive) throw new Error('Shooter is eliminated');
    const yawDeg = Number(shot.yaw), elevationDeg = Math.max(10, Math.min(80, Number(shot.elevation)));
    const power = Math.max(20, Math.min(100, Number(shot.power)));
    if (![yawDeg, elevationDeg, power].every(Number.isFinite)) throw new Error('Invalid shot');
    const weapon = ['standard', 'heavy', 'guided', 'cluster'].includes(shot.weapon) ? shot.weapon : 'standard';
    const yaw = yawDeg * Math.PI / 180, elevation = elevationDeg * Math.PI / 180;
    const speed = power / 100 * 42;
    let vx = -Math.sin(yaw) * Math.cos(elevation) * speed;
    let vy = Math.sin(elevation) * speed;
    let vz = -Math.cos(yaw) * Math.cos(elevation) * speed;
    let x = shooter.x, y = 1.8, z = shooter.z, elapsed = 0, reason = 'ground';
    while (elapsed < 8) {
      elapsed += 0.04; x += vx * 0.04; vy -= 9.81 * 0.04; y += vy * 0.04; z += vz * 0.04;
      const hit = this.players.find(p => p.alive && p.id !== playerId &&
        Math.hypot(p.x - x, p.z - z) < 1.8 && Math.abs(y - 0.8) < 1.8);
      if (hit) { reason = 'tank'; break; }
      if (y <= 0) { y = 0; break; }
      if (Math.abs(x) > 50 || Math.abs(z) > 50) { reason = 'boundary'; break; }
    }
    const radius = weapon === 'heavy' ? 5.5 : weapon === 'cluster' ? 2.6 : weapon === 'guided' ? 4.5 : 4;
    const baseDamage = weapon === 'heavy' ? 42 : weapon === 'cluster' ? 24 : weapon === 'guided' ? 34 : 30;
    const blastPoints = weapon === 'cluster'
      ? [{ x, z }, { x: x - 2.2, z }, { x: x + 2.2, z }, { x, z: z - 2.2 }, { x, z: z + 2.2 }]
      : [{ x, z }];
    const damageById = new Map();
    for (const blast of blastPoints) {
      for (const target of this.players) {
        if (!target.alive || target.id === playerId) continue;
        const distance = Math.hypot(target.x - blast.x, target.z - blast.z);
        if (distance > radius) continue;
        const damage = Math.max(0, Math.round(baseDamage * (1 - distance / (radius * 1.5))));
        if (damage) damageById.set(target.id, (damageById.get(target.id) || 0) + damage);
      }
    }
    const impacts = [];
    shooter.shotsFired++;
    for (const [id, total] of damageById) {
      const target = this.players.find(p => p.id === id);
      const damage = Math.min(target.hp, total);
      target.hp = Math.max(0, target.hp - total);
      target.alive = target.hp > 0;
      shooter.damageDealt += damage;
      if (!target.alive) shooter.eliminations++;
      impacts.push({ playerId: id, damage, hp: target.hp, eliminated: !target.alive });
    }
    const impact = { x, y, z, reason, flightSeconds: Number(elapsed.toFixed(2)), radius };
    this.advanceTurn(now);
    return { shot: { playerId, yaw: yawDeg, elevation: elevationDeg, power, weapon }, impact, impacts, state: this.snapshot() };
  }

  skipTurn(now = 0) {
    if (this.status !== 'combat') return this.snapshot();
    this.advanceTurn(now);
    return this.snapshot();
  }

  tick(now = 0) {
    if (this.status === 'combat' && now >= this.turnDeadline) this.advanceTurn(now);
    return this.snapshot();
  }

  advanceTurn(now) {
    const living = this.players.filter(p => p.alive);
    if (living.length <= 1) {
      this.status = 'finished';
      this.winner = living[0]?.id ?? null;
      this.turnIndex = -1;
      this.turnDeadline = 0;
      return;
    }
    for (let i = 0; i < this.turnOrder.length; i++) {
      this.turnIndex = (this.turnIndex + 1) % this.turnOrder.length;
      const next = this.players.find(p => p.id === this.turnOrder[this.turnIndex]);
      if (next?.alive) break;
    }
    this.currentPlayer.movedThisTurn = 0;
    this.turnDeadline = now + OFFLINE_RULES.turnSeconds * 1000;
  }
}
