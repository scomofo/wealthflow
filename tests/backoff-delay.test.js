const { backoffDelay } = require('../src/main/backoff-delay.js');

describe('backoffDelay', () => {
  test('never exceeds the exponential ceiling for a given attempt', () => {
    for (let attempt = 0; attempt < 5; attempt++) {
      for (let i = 0; i < 50; i++) {
        const delay = backoffDelay(attempt, 1000, 8000);
        expect(delay).toBeGreaterThanOrEqual(0);
        expect(delay).toBeLessThanOrEqual(Math.min(8000, 1000 * 2 ** attempt));
      }
    }
  });

  test('is capped at maxMs even for a large attempt number', () => {
    for (let i = 0; i < 20; i++) {
      expect(backoffDelay(10, 1000, 8000)).toBeLessThanOrEqual(8000);
    }
  });

  test('grows with attempt number on average (not a fixed delay)', () => {
    // Not deterministic per-call, but the ceiling doubles each attempt, so
    // sampling many draws should show a clear upward trend rather than the
    // old fixed 1000ms every time.
    const sample = (attempt, n = 200) =>
      Array.from({ length: n }, () => backoffDelay(attempt, 1000, 8000)).reduce((a, b) => a + b, 0) / n;

    const avg0 = sample(0);
    const avg2 = sample(2);
    expect(avg2).toBeGreaterThan(avg0);
  });
});
