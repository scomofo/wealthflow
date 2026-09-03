// Regression coverage for finding M5: the actions:list-next-best IPC
// handler called database.listNextBestActions('open') directly — a plain
// `ORDER BY score DESC` SQL query with no personalization weighting — while
// actions:generate-next-best's final step applied
// PersonalizationEngine.applyActionWeighting() on top of the same raw rows.
// personalizedDelta is computed fresh each call rather than persisted, so
// the two paths could return the *same underlying actions in a different
// order* depending on which one last ran — a visibly inconsistent ranking
// for the dashboard's hero element per CLAUDE.md.
const { NextBestActionsEngine } = require('../src/main/next-best-actions-engine.js');

function mockDb(openActions, profile) {
  return {
    listNextBestActions: jest.fn((filter) =>
      filter ? openActions.filter((a) => a.status === filter) : openActions
    ),
    getPersonalizationProfile: jest.fn(() => profile),
    updatePersonalizationProfile: jest.fn(),
  };
}

describe('NextBestActionsEngine.getRankedOpenActions', () => {
  test('applies personalization weighting, unlike a raw listNextBestActions call', () => {
    // Two actions with the same raw score, one in the user's personalized
    // primary-focus category (debt) and one not. A raw `ORDER BY score DESC`
    // can't distinguish them (tied score) and returns them in whatever order
    // the DB gives back; personalization should reliably rank 'debt' first.
    const openActions = [
      { id: 'a1', category: 'investing', priority: 'medium', score: 60, status: 'open' },
      { id: 'a2', category: 'debt', priority: 'medium', score: 60, status: 'open' },
    ];
    const profile = {
      completions: { debt: 5 },
      completions_updated: { debt: new Date().toISOString() },
    };
    const db = mockDb(openActions, profile);
    const engine = new NextBestActionsEngine(db);

    const ranked = engine.getRankedOpenActions();

    expect(ranked[0].id).toBe('a2'); // debt, personalization-boosted
    expect(ranked[0].score).toBeGreaterThan(60);
  });

  test('generateActions()\'s final ranking matches getRankedOpenActions() directly for the same state', async () => {
    const openActions = [
      { id: 'a1', category: 'investing', priority: 'medium', score: 60, status: 'open' },
      { id: 'a2', category: 'debt', priority: 'medium', score: 60, status: 'open' },
    ];
    const profile = {
      completions: { debt: 5 },
      completions_updated: { debt: new Date().toISOString() },
    };
    const db = mockDb(openActions, profile);
    // generateActions() also needs the rule-gathering methods; stub them to
    // produce no new candidates so it exercises just the final ranking step.
    db.listBudgets = jest.fn(() => []);
    db.listDebts = jest.fn(() => []);
    db.listBills = jest.fn(() => []);
    db.listGoals = jest.fn(() => []);
    db.listContributionRoom = jest.fn(() => []);
    db.getSettings = jest.fn(() => ({ profile_completed: true }));
    db.computeFinancials = jest.fn(() => ({ income: 0, expenses: 0, savingsRate: 0, catSpending: {}, netWorth: 0, totalDebt: 0 }));
    db.upsertNextBestAction = jest.fn();
    db.clearStaleNextBestActions = jest.fn();

    const engine = new NextBestActionsEngine(db);

    const fromGenerate = await engine.generateActions();
    const fromList = engine.getRankedOpenActions();

    expect(fromGenerate.map((a) => a.id)).toEqual(fromList.map((a) => a.id));
    expect(fromGenerate.map((a) => a.score)).toEqual(fromList.map((a) => a.score));
  });
});
