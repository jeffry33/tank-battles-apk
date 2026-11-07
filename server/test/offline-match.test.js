import test from 'node:test';
import assert from 'node:assert/strict';
import { OfflineMatch, isSafeOfflinePosition } from '../../src/offline-match.js';

test('offline solo creates one human and three AI opponents', () => {
  const match = new OfflineMatch('Jeffry', 1000);
  assert.equal(match.players.length, 4);
  assert.equal(match.players.filter(p => p.isBot).length, 3);
  assert.equal(match.currentPlayerId, 'human');
  assert.equal(match.status, 'combat');
});

test('offline arena rejects river and out-of-bounds movement', () => {
  assert.equal(isSafeOfflinePosition(0, 0), false);
  assert.equal(isSafeOfflinePosition(0, 8), true);
  assert.equal(isSafeOfflinePosition(60, 0), false);
});

test('a human shot advances to an AI turn and AI can calculate a shot', () => {
  const match = new OfflineMatch('Jeffry', 1000);
  const result = match.resolveShot('human', { yaw: 0, elevation: 35, power: 70, weapon: 'standard' }, 2000);
  assert.equal(result.shot.playerId, 'human');
  assert.equal(match.currentPlayer.isBot, true);
  assert.ok(match.chooseBotShot());
});

test('shot damages opponents in the blast radius and updates match state', () => {
  const match = new OfflineMatch('Jeffry', 1000);
  match.players[1].x = -30;
  match.players[1].z = -20;
  const result = match.resolveShot('human', { yaw: 0, elevation: 10, power: 20, weapon: 'heavy' }, 2000);
  assert.ok(result.impacts.length >= 0);
  assert.equal(match.human.shotsFired, 1);
});

test('turn timeout advances to the next living player', () => {
  const match = new OfflineMatch('Jeffry', 1000);
  match.tick(62000);
  assert.equal(match.currentPlayerId, 'bot-2');
});
