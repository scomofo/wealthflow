// Full-jitter exponential backoff for retrying transient API failures
// (429/5xx/network). See AWS's "Exponential Backoff and Jitter" — a random
// delay in [0, min(maxMs, baseMs * 2^attempt)] spreads retries out instead
// of every failed request waiting the same fixed interval and retrying in
// lockstep.
function backoffDelay(attempt, baseMs = 1000, maxMs = 8000) {
  const exponential = Math.min(maxMs, baseMs * 2 ** attempt);
  return Math.floor(Math.random() * exponential);
}

module.exports = { backoffDelay };
