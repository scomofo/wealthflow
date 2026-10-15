const { calculateNextDue, parseCalendarDate } = require('../src/shared/calendar-date.js');

describe('recurring calendar-date arithmetic', () => {
  test.each([
    ['weekly crosses month end', '2026-01-29', 'weekly', '2026-02-05'],
    ['biweekly crosses year end', '2026-12-25', 'biweekly', '2027-01-08'],
    ['monthly clamps January 31 to February end', '2026-01-31', 'monthly', '2026-02-28'],
    ['monthly retains January 31 when February is leap month', '2024-01-31', 'monthly', '2024-02-29'],
    ['monthly advances from leap day to March 29', '2024-02-29', 'monthly', '2024-03-29'],
    ['quarterly clamps to April end', '2026-01-31', 'quarterly', '2026-04-30'],
    ['annual clamps leap day in a non-leap year', '2024-02-29', 'annual', '2025-02-28'],
    ['annual retains leap day when next year is leap', '2023-02-28', 'annual', '2024-02-28'],
    ['year boundary stays stable', '2026-12-31', 'monthly', '2027-01-31'],
  ])('%s', (_label, from, frequency, expected) => {
    expect(calculateNextDue(from, frequency)).toBe(expected);
  });

  test('rejects malformed and impossible calendar dates', () => {
    expect(() => parseCalendarDate('2026-02-30')).toThrow('Invalid calendar date');
    expect(() => calculateNextDue('2026/02/28', 'monthly')).toThrow('YYYY-MM-DD');
  });

  test('date-only result is independent of host timezone', () => {
    const original = process.env.TZ;
    try {
      process.env.TZ = 'America/Edmonton';
      expect(calculateNextDue('2026-10-31', 'monthly')).toBe('2026-11-30');
      process.env.TZ = 'UTC';
      expect(calculateNextDue('2026-10-31', 'monthly')).toBe('2026-11-30');
    } finally {
      if (original === undefined) delete process.env.TZ;
      else process.env.TZ = original;
    }
  });
});
