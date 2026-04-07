const { buildTfsaRrspPrompt, buildDebtVsInvestingPrompt, buildMonthlyPlannerPrompt } = require('../src/main/ai-workflow-prompts');

const sampleContext = {
  financials: { netWorth: 50000, income: 5000, expenses: 3000, savingsRate: 40, catSpending: { Food: 400 } },
  budgets: [{ category: 'Food', amount: 500 }],
  debts: [{ name: 'CC', balance: 3000, rate: 19.99, min_payment: 100 }],
  investments: [{ symbol: 'XEQT', shares: 50, current_price: 25 }],
  goals: [{ name: 'Vacation', target: 5000, current: 2000 }],
  contributionRoom: [{ account_type: 'tfsa', known_room: 15000 }, { account_type: 'rrsp', known_room: 20000 }],
  advisorProfile: { personal: { province: 'AB' }, employment: { annual_gross_income: 75000 } },
  settings: { province: 'AB' },
};

describe('buildTfsaRrspPrompt', () => {
  test('returns non-empty string with workflow type and JSON instruction', () => {
    const prompt = buildTfsaRrspPrompt(sampleContext);
    expect(typeof prompt).toBe('string');
    expect(prompt.length).toBeGreaterThan(100);
    expect(prompt).toContain('tfsa_rrsp_optimizer');
    expect(prompt.toLowerCase()).toContain('json');
  });

  test('includes contribution room data', () => {
    const prompt = buildTfsaRrspPrompt(sampleContext);
    expect(prompt).toContain('15,000');
    expect(prompt).toContain('20,000');
  });
});

describe('buildDebtVsInvestingPrompt', () => {
  test('includes debt data and workflow type', () => {
    const prompt = buildDebtVsInvestingPrompt(sampleContext);
    expect(prompt).toContain('debt_vs_investing');
    expect(prompt).toContain('19.99');
  });
});

describe('buildMonthlyPlannerPrompt', () => {
  test('includes budget data and top_actions key', () => {
    const prompt = buildMonthlyPlannerPrompt(sampleContext);
    expect(prompt).toContain('monthly_action_planner');
    expect(prompt).toContain('top_actions');
  });
});
