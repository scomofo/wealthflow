const { buildActionBecause } = require('../src/renderer/js/utils/action-reasoning.js');

describe('buildActionBecause', () => {
  test('explains budget actions with monthly cash flow impact', () => {
    expect(buildActionBecause(
      {
        title: 'Reduce Food spending by $180 this month',
        category: 'budget',
        impact_text: 'Freeing up $180/mo improves monthly cash flow.',
      },
      { savingsRate: 6 }
    )).toBe('Because Food is over target, freeing up $180 improves monthly flexibility.');
  });

  test('preserves decimal budget reduction amounts', () => {
    expect(buildActionBecause(
      {
        title: 'Reduce Dining spending by $180.75 this month',
        category: 'budget',
      },
      {}
    )).toBe('Because Dining is over target, freeing up $180.75 improves monthly flexibility.');
  });

  test('explains debt actions with interest drag', () => {
    expect(buildActionBecause(
      {
        title: 'Accelerate payoff on Visa (19.99% APR)',
        category: 'debt',
      },
      { totalDebt: 14500 }
    )).toBe('Because high-interest debt is reducing future flexibility, this should stay near the top.');
  });

  test('falls back to rationale when no category pattern matches', () => {
    expect(buildActionBecause(
      {
        title: 'Complete your financial profile',
        category: 'planning',
        rationale: 'A complete profile improves recommendations.',
      },
      {}
    )).toBe('Because a complete profile improves recommendations.');
  });

  test('normalizes fallback rationale whitespace and existing because prefix', () => {
    expect(buildActionBecause(
      {
        title: 'Review account setup',
        category: 'planning',
        rationale: '  Because this keeps recommendations accurate.',
      },
      {}
    )).toBe('Because this keeps recommendations accurate.');
  });
});
