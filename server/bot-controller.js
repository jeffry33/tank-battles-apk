// Deterministic baseline artillery decision used by server-owned AI commanders.
export function chooseBotShot(match, bot) {
  if (!bot?.isBot || !bot.alive || match.status !== 'combat' || match.currentPlayerId() !== bot.id) return null;
  const enemies = [...match.players.values()].filter(player => player.alive && player.id !== bot.id &&
    !(match.mode === 'team-battle' && player.team === bot.team));
  if (!enemies.length) return null;
  const target = enemies.sort((a, b) =>
    Math.hypot(a.x - bot.x, a.z - bot.z) - Math.hypot(b.x - bot.x, b.z - bot.z))[0];
  const dx = target.x - bot.x;
  const dz = target.z - bot.z;
  const distance = Math.hypot(dx, dz);
  const elevation = 38;
  const yaw = Math.atan2(-dx, -dz) * 180 / Math.PI;
  const requiredSpeed = Math.sqrt(Math.max(1, distance) * 9.81 / Math.max(0.2, Math.sin(2 * elevation * Math.PI / 180)));
  const power = Math.max(25, Math.min(100, requiredSpeed / 42 * 100));
  return { yaw, elevation, power, weapon: 'standard', targetId: target.id };
}
