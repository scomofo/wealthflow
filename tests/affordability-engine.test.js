const {
  evaluateAffordability,
  normalizeAffordabilityPurchase,
} = require('../src/renderer/js/utils/affordability.js');

const baseFinancials = {
  income: 5000,
  expenses: 3000,
  totalSaved: 12000,
  totalDebt: 2000,
};

function run(purchase, financials = baseFinancials) {
  return evaluateAffordability({
    purchase,
    financials,
    state: { budgets: [], goals: [], debts: [] },
  });
}

describe('normalizeAffordabilityPurchase', () => {
  test('loads renderer ESM named exports through the Jest transform', () => {
    expect(typeof normalizeAffordabilityPurchase).toBe('function');
    expect(typeof evaluateAffordability).toBe('function');
  });

  test('defaults unknown fields and parses amount', () => {
    expect(
      normalizeAffordabilityPurchase({
        name: '',
        amount: '1200',
        frequency: 'bad',
        category: '',
        timing: 'later',
      })
    ).toEqual({
      name: 'this purchase',
      amount: 1200,
      frequency: 'one_time',
      category: 'General',
      timing: 'now',
    });
  });

  test('normalizes negative and non-finite amounts to null but keeps zero', () => {
    expect(normalizeAffordabilityPurchase({ amount: '-1' }).amount).toBeNull();
    expect(normalizeAffordabilityPurchase({ amount: 'abc' }).amount).toBeNull();
    expect(normalizeAffordabilityPurchase({ amount: Infinity }).amount).toBeNull();
    expect(normalizeAffordabilityPurchase({ amount: 0 }).amount).toBe(0);
  });
});

describe('evaluateAffordability one-time purchases', () => {
  test('returns yes for a small one-time purchase', () => {
    const result = run({ amount: 500 });

    expect(result.verdict).toBe('yes');
    expect(result.summary).toBe('Yes - this looks affordable.');
    expect(result.workflow_type).toBe('affordability_check');
    expect(result.next_actions).toHaveLength(1);
    expect(result._deterministic).toBe(true);
    expect(result.source_payload.purchase.amount).toBe(500);
  });

  test('returns yes_adjust when a purchase uses more than 30 percent of buffer', () => {
    expect(run({ amount: 4000 }).verdict).toBe('yes_adjust');
    expect(run({ amount: 4000 }).summary).toBe(
      'Yes, but adjust your plan first.'
    );
  });

  test('keeps the explicit buffer warning boundary adjustable before not_yet', () => {
    expect(run({ amount: 4200 }).verdict).toBe('yes_adjust');
    expect(run({ amount: 4201 }).verdict).toBe('not_yet');
  });

  test('returns not_yet when remaining buffer is below three months expenses', () => {
    expect(run({ amount: 4500 }).verdict).toBe('not_yet');
    expect(run({ amount: 4500 }).summary).toBe(
      'Not yet - wait until your buffer improves.'
    );
  });

  test('returns no when remaining buffer is below one month expenses', () => {
    expect(run({ amount: 10000 }).verdict).toBe('no');
    expect(run({ amount: 10000 }).summary).toBe(
      'No - this creates too much risk right now.'
    );
  });

  test('returns invalid when amount is zero', () => {
    const result = run({ amount: 0 });

    expect(result.verdict).toBe('invalid');
    expect(result.summary).toBe('Enter an amount to check affordability.');
    expect(result.next_actions).toEqual([]);
    expect(result.recommendation.primary_action).toContain('Enter an amount');
  });

  test('returns invalid when amount is null or undefined', () => {
    expect(run({ amount: null }).verdict).toBe('invalid');
    expect(run({ amount: undefined }).verdict).toBe('invalid');
  });

  test('treats this_month and next_month as tradeoff-only timing', () => {
    const thisMonth = run({ amount: 4500, timing: 'this_month' });
    const nextMonth = run({ amount: 4500, timing: 'next_month' });

    expect(thisMonth.verdict).toBe('not_yet');
    expect(nextMonth.verdict).toBe('not_yet');
    expect(thisMonth.tradeoffs).not.toContain(
      'Waiting one month gives you more time to protect cashflow.'
    );
    expect(nextMonth.tradeoffs).toContain(
      'Waiting one month gives you more time to protect cashflow.'
    );
  });
});

describe('evaluateAffordability monthly purchases', () => {
  test('returns yes for a small monthly commitment', () => {
    expect(run({ amount: 200, frequency: 'monthly' }).verdict).toBe('yes');
  });

  test('returns yes_adjust above 25 percent of monthly surplus', () => {
    expect(run({ amount: 600, frequency: 'monthly' }).verdict).toBe(
      'yes_adjust'
    );
  });

  test('returns not_yet above 50 percent of monthly surplus', () => {
    expect(run({ amount: 1200, frequency: 'monthly' }).verdict).toBe('not_yet');
  });

  test('returns no above monthly surplus', () => {
    expect(run({ amount: 2500, frequency: 'monthly' }).verdict).toBe('no');
  });

  test('returns no when there is no positive monthly surplus', () => {
    const result = run(
      { amount: 100, frequency: 'monthly' },
      { income: 3000, expenses: 3200, totalSaved: 2000, totalDebt: 0 }
    );

    expect(result.verdict).toBe('no');
    expect(result.summary).toBe('No - this creates too much risk right now.');
    expect(result.why[0]).toBe(
      'Your estimated monthly surplus is negative (-$200).'
    );
  });
});
