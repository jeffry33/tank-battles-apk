import test from 'node:test';
import assert from 'node:assert/strict';
import { MatchState, MATCH_RULES } from '../match-state.js';

function combatMatch(mode = MATCH_RULES.modes.FFA) {
  const match = new MatchState(mode);
  match.addPlayer('p1');
  match.addPlayer('p2');
  if (mode === MATCH_RULES.modes.TEAMS) {
    match.addPlayer('p3');
    match.addPlayer('p4');
  }
  match.beginDeployment('p1', 1000);
  for (const [id, p] of match.players) match.setLanding(id, p.x, p.z, true);
  return match;
}

test('only the host can start deployment', () => {
  const match = new MatchState();
  match.addPlayer('p1');
  match.addPlayer('p2');
  assert.throws(() => match.beginDeployment('p2', 1000), /host/);
  match.beginDeployment('p1', 1000);
  assert.equal(match.status, 'deploying');
});

test('turns advance after one validated shot', () => {
  const match = combatMatch();
  assert.equal(match.currentPlayerId(), 'p1');
  match.resolveShot('p1', { yaw: 0, elevation: 35, power: 70, weapon: 'standard' }, 2000);
  assert.equal(match.currentPlayerId(), 'p2');
  assert.throws(() => match.resolveShot('p1', { yaw: 0, elevation: 35, power: 70 }, 2001), /turn/);
});

test('movement is bounded by step and per-turn allowance', () => {
  const match = combatMatch();
  assert.throws(() => match.updateMovement('p1', 0, 0, 0, 2000), /step/);
  assert.doesNotThrow(() => match.updateMovement('p1', -29, -30, 0, 2000));
});

test('team battle prevents friendly fire and retains opposing team', () => {
  const match = combatMatch(MATCH_RULES.modes.TEAMS);
  const ally = match.players.get('p3');
  ally.x = match.players.get('p1').x;
  ally.z = match.players.get('p1').z;
  const before = ally.hp;
  match.resolveShot('p1', { yaw: 0, elevation: 35, power: 70, weapon: 'heavy' }, 2000);
  assert.equal(ally.hp, before);
});

test('team match with no surviving players ends with no winner', () => {
  const match = combatMatch(MATCH_RULES.modes.TEAMS);
  for (const p of match.players.values()) { p.alive = false; p.hp = 0; }
  match.advanceTurn(3000);
  assert.equal(match.status, 'finished');
  assert.equal(match.winner, null);
});


test('Frozen River destructible registry is initialized consistently on the server', () => {
  const match = new MatchState();
  assert.equal(match.destructibles.size, 14);
  assert.equal(match.destructibles.get('bunker-west').hp, 160);
  assert.equal(match.destructibles.get('bridge-rail-east').hp, 65);
  assert.equal(match.destructibles.get('supply-crate-8').alive, true);
});

test('projectile collides with an intact bunker before reaching the ground', () => {
  const match = combatMatch();
  const shooter = match.players.get('p1');
  shooter.x = -20;
  shooter.z = 0;
  const bunker = match.destructibles.get('bunker-west');
  const before = bunker.hp;
  const result = match.resolveShot('p1', {
    yaw: 180, elevation: 10, power: 20, weapon: 'standard'
  }, 2000);
  assert.equal(result.impact.reason, 'object');
  assert.ok(bunker.hp < before);
  assert.ok(result.objectImpacts.some(item => item.id === 'bunker-west'));
});
