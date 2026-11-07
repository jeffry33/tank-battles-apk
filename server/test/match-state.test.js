import test from 'node:test';
import assert from 'node:assert/strict';
import { MatchState, MATCH_RULES } from '../match-state.js';
import { chooseBotShot } from '../bot-controller.js';

function combatMatch(mode = MATCH_RULES.modes.FFA) {
  const match = new MatchState(mode);
  match.addPlayer('p1');
  match.addPlayer('p2');
  if (mode === MATCH_RULES.modes.TEAMS) {
    match.addPlayer('p3');
    match.addPlayer('p4');
  }
  for (const id of match.players.keys()) match.setReady(id, true);
  for (const id of match.players.keys()) match.setReady(id, true);
  match.beginDeployment('p1', 1000);
  for (const [id, p] of match.players) match.setLanding(id, p.x, p.z, true);
  return match;
}

test('only the host can start deployment', () => {
  const match = new MatchState();
  match.addPlayer('p1');
  match.addPlayer('p2');
  assert.throws(() => match.beginDeployment('p2', 1000), /host/);
  for (const id of match.players.keys()) match.setReady(id, true);
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


test('landing rejects deep river and bunker footprints but accepts the bridge', () => {
  const match = new MatchState();
  match.addPlayer('p1');
  match.addPlayer('p2');
  for (const id of match.players.keys()) match.setReady(id, true);
  match.beginDeployment('p1', 1000);
  assert.throws(() => match.setLanding('p1', 0, -20, true), /safe terrain/);
  assert.throws(() => match.setLanding('p1', -20, 13, true), /safe terrain/);
  assert.doesNotThrow(() => match.setLanding('p1', 0, 8, true));
});

test('tank movement cannot enter deep water or cross arena boundary', () => {
  const match = combatMatch();
  const p = match.players.get('p1');
  // Start close to the channel but on the west bank.
  p.x = -5.8; p.z = -20;
  assert.throws(() => match.updateMovement('p1', -5.2, -20, 0, 2000), /blocked/);
  p.x = 47.5; p.z = -30;
  assert.throws(() => match.updateMovement('p1', 48.2, -30, 0, 2000), /blocked/);
});


test('tank movement is blocked when it would overlap another living tank', () => {
  const match = combatMatch();
  const p2 = match.players.get('p2');
  p2.x = -27; p2.z = -30;
  assert.throws(() => match.updateMovement('p1', -29, -30, 0, 2000), /another tank/);
});

test('landing zones must keep safe spacing between tanks', () => {
  const match = new MatchState();
  match.addPlayer('p1');
  match.addPlayer('p2');
  for (const id of match.players.keys()) match.setReady(id, true);
  match.beginDeployment('p1', 1000);
  match.setLanding('p1', -30, -30, true);
  assert.throws(() => match.setLanding('p2', -28, -30, true), /too close/);
});

test('match snapshots include destructible object health for late join synchronization', () => {
  const match = new MatchState();
  const state = match.snapshot();
  assert.equal(state.destructibles.length, 14);
  assert.equal(state.destructibles.find(item => item.id === 'bunker-west').hp, 160);
});


test('landing request rejects non-finite coordinates before terrain checks', () => {
  const match = new MatchState();
  match.addPlayer('p1');
  match.addPlayer('p2');
  for (const id of match.players.keys()) match.setReady(id, true);
  match.beginDeployment('p1', 1000);
  assert.throws(() => match.setLanding('p1', Number.NaN, 8, false), /Invalid landing/);
  assert.throws(() => match.setLanding('p1', 0, Number.POSITIVE_INFINITY, false), /Invalid landing/);
});

test('deployment timeout moves non-landing players to their assigned safe spawns', () => {
  const match = new MatchState();
  match.addPlayer('p1');
  match.addPlayer('p2');
  for (const id of match.players.keys()) match.setReady(id, true);
  match.beginDeployment('p1', 1000);
  const result = match.tick(31000);
  assert.equal(result.event, 'deployment-timeout');
  assert.equal(match.status, 'combat');
  assert.ok([...match.players.values()].every(player => player.landed));
});

test('room cannot exceed the four-player match limit', () => {
  const match = new MatchState();
  for (let i = 1; i <= 4; i++) match.addPlayer('p' + i);
  assert.throws(() => match.addPlayer('p5'), /full/);
});


test('player connection state can be suspended and restored for reconnect', () => {
  const match = new MatchState();
  match.addPlayer('p1');
  match.addPlayer('p2');
  match.markDisconnected('p2', 5000);
  assert.equal(match.players.get('p2').connected, false);
  assert.equal(match.players.get('p2').disconnectedAt, 5000);
  match.reconnectPlayer('p2');
  assert.equal(match.players.get('p2').connected, true);
  assert.equal(match.players.get('p2').disconnectedAt, null);
});

test('eliminated player cannot reconnect into a match', () => {
  const match = new MatchState();
  match.addPlayer('p1');
  match.players.get('p1').alive = false;
  assert.throws(() => match.reconnectPlayer('p1'), /no longer rejoin/);
});


test('guided missile uses server-side homing against the nearest valid enemy', () => {
  const match = combatMatch();
  const shooter = match.players.get('p1');
  const target = match.players.get('p2');
  target.x = shooter.x + 12;
  target.z = shooter.z + 4;
  const result = match.resolveShot('p1', {
    yaw: 0, elevation: 35, power: 70, weapon: 'guided'
  }, 2000);
  assert.equal(result.impact.guided, true);
  assert.equal(result.shot.weapon, 'guided');
});

test('cluster bomb resolves four server-authoritative submunitions', () => {
  const match = combatMatch();
  const result = match.resolveShot('p1', {
    yaw: 0, elevation: 35, power: 70, weapon: 'cluster'
  }, 2000);
  assert.equal(result.impact.submunitions, 4);
  assert.equal(result.impact.submunitionPoints.length, 4);
  assert.equal(result.shot.weapon, 'cluster');
});


test('disconnected player is eliminated after the reconnect grace period', () => {
  const match = combatMatch();
  match.markDisconnected('p1', 5000);
  assert.deepEqual(match.expireDisconnectedPlayers(94999, 90000), []);
  assert.deepEqual(match.expireDisconnectedPlayers(95000, 90000), ['p1']);
  assert.equal(match.players.get('p1').alive, false);
  assert.equal(match.status, 'finished');
  assert.equal(match.winner, 'p2');
});

test('disconnected player can reconnect before the grace period expires', () => {
  const match = combatMatch();
  match.markDisconnected('p2', 5000);
  assert.deepEqual(match.expireDisconnectedPlayers(94000, 90000), []);
  match.reconnectPlayer('p2');
  assert.equal(match.players.get('p2').alive, true);
  assert.deepEqual(match.expireDisconnectedPlayers(100000, 90000), []);
});


test('lobby requires every connected player to ready up before deployment', () => {
  const match = new MatchState();
  match.addPlayer('p1');
  match.addPlayer('p2');
  assert.throws(() => match.beginDeployment('p1', 1000), /ready/);
  match.setReady('p1', true);
  assert.throws(() => match.beginDeployment('p1', 1000), /ready/);
  match.setReady('p2', true);
  for (const id of match.players.keys()) match.setReady(id, true);
  match.beginDeployment('p1', 1000);
  assert.equal(match.status, 'deploying');
});

test('disconnected players cannot ready up', () => {
  const match = new MatchState();
  match.addPlayer('p1');
  match.markDisconnected('p1', 5000);
  assert.throws(() => match.setReady('p1', true), /Disconnected/);
});


test('solo host can fill the remaining seats with ready AI bots', () => {
  const match = new MatchState();
  match.addPlayer('human');
  match.setReady('human', true);
  match.addBotPlayers();
  assert.equal(match.players.size, 4);
  assert.equal([...match.players.values()].filter(p => p.isBot).length, 3);
  assert.ok([...match.players.values()].filter(p => p.isBot).every(p => p.ready));
  match.beginDeployment('human', 1000);
  assert.ok([...match.players.values()].filter(p => p.isBot).every(p => p.landed));
  assert.equal(match.status, 'deploying');
});


test('match snapshot exposes per-player combat statistics and stable match id', () => {
  const match = combatMatch();
  const before = match.snapshot();
  assert.ok(before.matchId);
  assert.equal(before.players[0].shotsFired, 0);
  assert.equal(before.players[0].damageDealt, 0);
  assert.equal(before.players[0].eliminations, 0);
  match.resolveShot('p1', { yaw: 0, elevation: 35, power: 70, weapon: 'standard' }, 2000);
  const shooter = match.snapshot().players.find(player => player.id === 'p1');
  assert.equal(shooter.shotsFired, 1);
  assert.ok(shooter.damageDealt >= 0);
});


test('AI controller selects the nearest valid enemy and returns a bounded shot', () => {
  const match = combatMatch();
  const bot = match.players.get('p1');
  bot.isBot = true;
  match.players.get('p2').x = bot.x + 18;
  match.players.get('p2').z = bot.z + 2;
  const shot = chooseBotShot(match, bot);
  assert.equal(shot.targetId, 'p2');
  assert.equal(shot.weapon, 'standard');
  assert.ok(shot.power >= 25 && shot.power <= 100);
  assert.equal(chooseBotShot(match, match.players.get('p2')), null);
});

test('AI controller never targets a teammate in Team Battle', () => {
  const match = combatMatch(MATCH_RULES.modes.TEAMS);
  const bot = match.players.get('p1');
  bot.isBot = true;
  match.players.get('p3').x = bot.x + 2;
  match.players.get('p3').z = bot.z;
  const shot = chooseBotShot(match, bot);
  assert.notEqual(shot.targetId, 'p3');
});


test('solo host may start after readying and then fill remaining seats with bots', () => {
  const match = new MatchState();
  match.addPlayer('human');
  match.setReady('human', true);
  match.addBotPlayers();
  match.beginDeployment('human', 5000);
  assert.equal(match.status, 'deploying');
  assert.equal(match.players.size, 4);
  assert.equal([...match.players.values()].filter(player => player.isBot && player.landed).length, 3);
});
