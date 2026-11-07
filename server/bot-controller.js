// Deterministic server-owned artillery decision for AI commanders.
// The search mirrors the server's projectile integrator so bots use the same
// gravity, muzzle height and time step as human-fired shells.
function simulateClosestApproach(distance, elevationDegrees, power) {
  const elevation = elevationDegrees * Math.PI / 180;
  const speed = power / 100 * 42;
  let horizontal = 0;
  let y = 1.8;
  let verticalSpeed = Math.sin(elevation) * speed;
  const horizontalSpeed = Math.cos(elevation) * speed;
  const step = 0.04;
  let closest = Number.POSITIVE_INFINITY;
  for (let t = 0; t < 8; t += step) {
    horizontal += horizontalSpeed * step;
    y += verticalSpeed * step - 0.5 * 9.81 * step * step;
    verticalSpeed -= 9.81 * step;
    // Server tank hitbox is centered around y=0.8 and uses a 1.6m threshold.
    const miss = Math.hypot(horizontal - distance, Math.max(0, Math.abs(y - 0.8) - 1.6));
    if (miss < closest) closest = miss;
    if (y <= 0 || horizontal > distance + 8) break;
  }
  return closest;
}

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
  if (distance < 0.1) return null;
  const yaw = Math.atan2(-dx, -dz) * 180 / Math.PI;

  // Search the legal firing envelope instead of assuming one fixed elevation.
  // This substantially improves first-play accuracy over a single-angle guess.
  let best = null;
  for (let elevation = 20; elevation <= 65; elevation += 5) {
    for (let power = 20; power <= 100; power += 1) {
      const miss = simulateClosestApproach(distance, elevation, power);
      const score = miss + Math.abs(elevation - 40) * 0.002;
      if (!best || score < best.score) best = { elevation, power, score };
    }
  }

  return {
    yaw,
    elevation: best.elevation,
    power: best.power,
    weapon: 'standard',
    targetId: target.id
  };
}
