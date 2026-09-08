const {
  reconcileContributionRoom,
  totalAvailableContributionRoom,
} = require('../src/main/contribution-room');

describe('contribution room reconciliation', () => {
  test('subtracts only positive matching contributions after the known-as-of date', () => {
    const rows = reconcileContributionRoom([
      { account_type: 'TFSA', known_room: 10000, known_as_of_date: '2026-01-31' },
    ], [
      { account_type: 'tfsa', amount: 1500, date: '2026-02-15' },
      { account_type: 'TFSA', amount: 500, date: '2026-01-31' },
      { account_type: 'RRSP', amount: 2500, date: '2026-03-01' },
      { account_type: 'TFSA', amount: -1000, date: '2026-04-01' },
    ]);

    expect(rows[0].contributed_since_known).toBe(1500);
    expect(rows[0].available_room).toBe(8500);
  });

  test('never reports negative available room', () => {
    const rows = reconcileContributionRoom([
      { account_type: 'FHSA', known_room: 2000, known_as_of_date: '2026-01-01' },
    ], [
      { account_type: 'FHSA', amount: 5000, date: '2026-02-01' },
    ]);

    expect(rows[0].available_room).toBe(0);
  });

  test('does not guess whether contributions were already included when no as-of date exists', () => {
    const rows = reconcileContributionRoom([
      { account_type: 'RRSP', known_room: 12000 },
    ], [
      { account_type: 'RRSP', amount: 3000, date: '2026-02-01' },
    ]);

    expect(rows[0].available_room).toBe(12000);
  });

  test('totals reconciled room across account types', () => {
    const total = totalAvailableContributionRoom([
      { account_type: 'TFSA', known_room: 7000, known_as_of_date: '2026-01-01' },
      { account_type: 'FHSA', known_room: 8000, known_as_of_date: '2026-01-01' },
    ], [
      { account_type: 'TFSA', amount: 2000, date: '2026-02-01' },
      { account_type: 'FHSA', amount: 1000, date: '2026-02-01' },
    ]);

    expect(total).toBe(12000);
  });
});
