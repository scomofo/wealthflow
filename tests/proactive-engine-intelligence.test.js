const { ProactiveEngine } = require('../src/main/proactive-engine');

function makeDb(overrides = {}) {
  const profile = overrides.profile || {};
  return {
    computeFinancials: () => overrides.financials || { catSpending: { Food: 760 }, savingsRate: 5 },
    listBudgets: () => overrides.budgets || [{ id: 'b1', category: 'Food', amount: 600 }],
    listBills: () => overrides.bills || [],
    listDebts: () => overrides.debts || [],
    listContributionRoom: () => overrides.contributionRoom || [],
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
});
