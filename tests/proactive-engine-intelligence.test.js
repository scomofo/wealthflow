const { ProactiveEngine } = require('../src/main/proactive-engine');

function makeDb(overrides = {}) {
  const profile = overrides.profile || {};
  return {
    computeFinancials: () => overrides.financials || { catSpending: { Food: 760 }, savingsRate: 5 },
    listBudgets: () => overrides.budgets || [{ id: 'b1', category: 'Food', amount: 600 }],
    listBills: () => overrides.bills || [],
    listDebts: () => overrides.debts || [],
    listContributionRoom: () => overrides.contributionRoom || [],
    listContributions: () => overrides.contributions || [],
    getSettings: () => overrides.settings || {},
    getPersonalizationProfile: () => profile,
    updatePersonalizationProfile: (next) => { Object.assign(profile, next); },
  };
}

describe('ProactiveEngine intelligence metadata', () => {
  test('adds related action category and why-now copy to risk nudges', () => {
    const nudges = new ProactiveEngine(makeDb()).evaluate();

    expect(nudges[0]).toMatchObject({
      type: 'risk',
      category: 'budget',
      related_action_category: 'budget',
      cta_label: 'Focus action',
    });
    expect(nudges[0].why_now).toContain('over budget');
  });

  test('records cooldown using type and category key', () => {
    const profile = {};
    new ProactiveEngine(makeDb({ profile })).evaluate();

    expect(profile.nudge_shown.risk_budget).toBeTruthy();
  });

  test('uses room remaining after logged contributions for opportunity nudges', () => {
    const nudges = new ProactiveEngine(makeDb({
      budgets: [],
      financials: { catSpending: {}, savingsRate: 25 },
      contributionRoom: [
        { account_type: 'TFSA', known_room: 9000, known_as_of_date: '2026-01-01' },
      ],
      contributions: [
        { account_type: 'tfsa', amount: 2500, date: '2026-03-01' },
      ],
    })).evaluate();

    const opportunity = nudges.find((n) => n.category === 'investing');
    expect(opportunity).toBeDefined();
    expect(opportunity.message).toContain('$6,500');
    expect(opportunity.why_now).toContain('after logged contributions');
  });
});
