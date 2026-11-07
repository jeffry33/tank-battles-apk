import test from 'node:test';
import assert from 'node:assert/strict';
import { createMessageRateLimiter } from '../rate-limit.js';

test('message rate limiter allows messages within the rolling window', () => {
  let now = 1000;
  const allow = createMessageRateLimiter({ limit: 3, windowMs: 1000, now: () => now });
  assert.equal(allow(), true);
  assert.equal(allow(), true);
  assert.equal(allow(), true);
  assert.equal(allow(), false);
  now = 2000;
  assert.equal(allow(), true);
});

test('message rate limiter rejects invalid configuration', () => {
  assert.throws(() => createMessageRateLimiter({ limit: 0 }), /positive integer/);
  assert.throws(() => createMessageRateLimiter({ windowMs: 0 }), /positive/);
});
