// Small rolling-window guard for untrusted WebSocket messages.
export function createMessageRateLimiter({ limit = 50, windowMs = 10000, now = Date.now } = {}) {
  if (!Number.isInteger(limit) || limit < 1) throw new Error('Rate limit must be a positive integer');
  if (!Number.isFinite(windowMs) || windowMs <= 0) throw new Error('Rate window must be positive');
  const timestamps = [];
  return function allowMessage() {
    const current = now();
    while (timestamps.length && timestamps[0] <= current - windowMs) timestamps.shift();
    if (timestamps.length >= limit) return false;
    timestamps.push(current);
    return true;
  };
}
