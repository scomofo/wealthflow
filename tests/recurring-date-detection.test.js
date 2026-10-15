import { detectRecurringPayments } from '../src/renderer/js/utils/recurring-detector.js';

describe('recurring payment detector uses calendar dates', () => {
  test('weekly intervals remain seven days across the spring DST transition', () => {
    const transactions = [
      { description: 'Internet Provider', amount: -80, category: 'Bills', date: '2026-02-22' },
      { description: 'Internet Provider', amount: -80, category: 'Bills', date: '2026-03-01' },
      { description: 'Internet Provider', amount: -80, category: 'Bills', date: '2026-03-08' },
    ];
    const [result] = detectRecurringPayments(transactions, []);
    expect(result.frequency).toBe('weekly');
    expect(result.avgInterval).toBe(7);
    expect(result.nextDate).toBe('2026-03-15');
  });

  test('predicts month-end recurrence without JavaScript month overflow', () => {
    const transactions = [
      { description: 'Mortgage Payment', amount: -1800, category: 'Housing', date: '2026-01-31' },
      { description: 'Mortgage Payment', amount: -1800, category: 'Housing', date: '2026-02-28' },
      { description: 'Mortgage Payment', amount: -1800, category: 'Housing', date: '2026-03-31' },
    ];
    const [result] = detectRecurringPayments(transactions, []);
    expect(result.frequency).toBe('monthly');
    expect(result.nextDate).toBe('2026-04-30');
  });
});
