// Regression coverage for the UTC/local date-handling bugs described in the
// app review (finding L3): code that parses a date-only "YYYY-MM-DD" string
// with `new Date(str)` (UTC midnight) and then reads/writes it with *local*
// getters/setters (getDate(), getFullYear(), toISOString()) silently shifts
// the date by a day for anyone west of UTC — i.e. everywhere in Canada.
//
// This machine's own local timezone is UTC, so the bug (and the fix) are
// both invisible to `new Date()` running in-process here — under TZ=UTC,
// "parse as UTC then read with local getters" and "parse and read
// consistently in local time" produce identical results. To actually
// exercise the west-of-UTC case, each check below spawns a real `node`
// subprocess with TZ forced to a Canadian zone (America/Vancouver, UTC-8,
// no DST in January) *before* the process starts — the only point at which
// Node's timezone can reliably be changed; setting process.env.TZ after
// Node has already resolved a timezone for the process does not work.
const { execFileSync } = require('child_process');
const path = require('path');

function runInVancouver(script) {
  const out = execFileSync(process.execPath, ['--no-warnings', '-e', script], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, TZ: 'America/Vancouver' },
    encoding: 'utf8',
  });
  return JSON.parse(out.trim());
}

function runInVancouverESM(script) {
  const out = execFileSync(process.execPath, ['--no-warnings', '--input-type=module', '-e', script], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, TZ: 'America/Vancouver' },
    encoding: 'utf8',
  });
  return JSON.parse(out.trim());
}

describe('date-utils (main) — local-time date-only handling under a west-of-UTC zone', () => {
  test('formatLocalDate reports the Vancouver calendar day for an instant that is already tomorrow in UTC', () => {
    // 2026-01-15T02:00:00Z is 2026-01-14 18:00 in Vancouver — still "the 14th"
    // locally, even though it's already the 15th in UTC.
    const result = runInVancouver(`
      const { formatLocalDate } = require('./src/main/date-utils.js');
      console.log(JSON.stringify(formatLocalDate(new Date('2026-01-15T02:00:00Z'))));
    `);
    expect(result).toBe('2026-01-14');
  });

  test('parseLocalDate reads a date-only string as Vancouver midnight, not UTC midnight', () => {
    const result = runInVancouver(`
      const { parseLocalDate } = require('./src/main/date-utils.js');
      const d = parseLocalDate('2026-01-31');
      console.log(JSON.stringify({ y: d.getFullYear(), m: d.getMonth(), day: d.getDate() }));
    `);
    expect(result).toEqual({ y: 2026, m: 0, day: 31 });
  });
});

describe('date-utils (renderer) — local-time date-only handling under a west-of-UTC zone', () => {
  test('formatLocalDate / parseLocalDate behave identically to the main-process copy', () => {
    const result = runInVancouverESM(`
      import { formatLocalDate, parseLocalDate } from './src/renderer/js/utils/date-utils.js';
      console.log(JSON.stringify({
        boundary: formatLocalDate(new Date('2026-01-15T02:00:00Z')),
        parsed: parseLocalDate('2026-01-31').getDate(),
      }));
    `);
    expect(result).toEqual({ boundary: '2026-01-14', parsed: 31 });
  });
});

describe('WealthFlowDatabase._calculateNextDue — month-overflow clamping under a west-of-UTC zone', () => {
  test('a bill due Jan 31 (monthly) rolls to Feb 28, not Mar 1', () => {
    // Bug this replaces: new Date('2026-01-31') parses as UTC midnight,
    // which in Vancouver is Jan 30 16:00 local. origDay is read as 30
    // instead of 31, so the month-end overflow check (`getDate() !==
    // origDay`) misfires and the result clamps to Feb 28, *then advances
    // one more day* when re-serialized through toISOString() — landing on
    // Mar 1 instead of Feb 28.
    const result = runInVancouver(`
      const { WealthFlowDatabase } = require('./src/main/database.js');
      const db = new WealthFlowDatabase();
      console.log(JSON.stringify(db._calculateNextDue('2026-01-31', 'monthly')));
    `);
    expect(result).toBe('2026-02-28');
  });

  test('a bill due Jan 15 (monthly) stays on the 15th, not the 16th', () => {
    const result = runInVancouver(`
      const { WealthFlowDatabase } = require('./src/main/database.js');
      const db = new WealthFlowDatabase();
      console.log(JSON.stringify(db._calculateNextDue('2026-01-15', 'monthly')));
    `);
    expect(result).toBe('2026-02-15');
  });
});

describe('calculateCurrentFHSARoom / calculateCurrentTFSARoom — Jan 1 known-date boundary under a west-of-UTC zone', () => {
  test('FHSA: known room recorded exactly on Jan 1 of this year grants no extra year yet', () => {
    // Bug this replaces: new Date(`${year}-01-01`).getFullYear() reads
    // (year - 1) in Vancouver, so the accumulation loop (knownYear+1 ..
    // currentYear) incorrectly runs for the current year and adds a full
    // $8,000 grant that hasn't actually happened yet.
    const result = runInVancouverESM(`
      import { calculateCurrentFHSARoom } from './src/renderer/js/canadian/calculators.js';
      const thisYear = new Date().getFullYear();
      const result = calculateCurrentFHSARoom(8000, \`\${thisYear}-01-01\`, []);
      console.log(JSON.stringify(result.currentRoom));
    `);
    expect(result).toBe(8000);
  });

  test('TFSA: known room recorded exactly on Jan 1 of this year grants no extra year yet', () => {
    const result = runInVancouverESM(`
      import { calculateCurrentTFSARoom } from './src/renderer/js/canadian/calculators.js';
      const thisYear = new Date().getFullYear();
      const result = calculateCurrentTFSARoom(50000, \`\${thisYear}-01-01\`, []);
      console.log(JSON.stringify(result.currentRoom));
    `);
    expect(result).toBe(50000);
  });
});
