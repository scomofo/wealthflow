const { NextBestActionsEngine } = require('../src/main/next-best-actions-engine.js');

function mockDb(existingActions = []) {
  return {
    listNextBestActions: jest.fn((filter) =>
      filter
        ? existingActions.filter((a) => a.status === filter)
        : existingActions
    ),
    upsertNextBestAction: jest.fn((a) => a),
    clearStaleNextBestActions: jest.fn(),
    getSettings: jest.fn(() => ({ province: 'AB', profile_completed: true })),
    listBudgets: jest.fn(() => []),
    listDebts: jest.fn(() => []),
    listBills: jest.fn(() => []),
    listGoals: jest.fn(() => []),
    listInvestments: jest.fn(() => []),
    listContributionRoom: jest.fn(() => []),
    computeFinancials: jest.fn(() => ({
      income: 5000,
      expenses: 3000,
      savingsRate: 40,
      catSpending: {},
      netWorth: 50000,
      totalDebt: 0,
    })),
  };
}

describe('NextBestActionsEngine', () => {
  test('generates budget overrun action', async () => {
    const db = mockDb();
    db.listBudgets.mockReturnValue([
      { id: 'b1', category: 'Food', amount: 500 },
    ]);
    db.computeFinancials.mockReturnValue({
      income: 5000,
      expenses: 3000,
      savingsRate: 40,
      catSpending: { Food: 750 },
      netWorth: 50000,
      totalDebt: 0,
    });

    const engine = new NextBestActionsEngine(db);
    await engine.generateActions();

    const upserted = db.upsertNextBestAction.mock.calls.map((c) => c[0]);
    const budgetAction = upserted.find((a) => a.category === 'budget');
    expect(budgetAction).toBeDefined();
    expect(budgetAction.title).toContain('Food');
    expect(budgetAction.action_key).toMatch(/^budget_overrun_food_/);
    expect(budgetAction.score).toBeGreaterThanOrEqual(70);
  });

  test('generates high-interest debt action', async () => {
    const db = mockDb();
    db.listDebts.mockReturnValue([
      { id: 'd1', name: 'Credit Card', balance: 6000, rate: 19.99, min_payment: 100 },
    ]);

    const engine = new NextBestActionsEngine(db);
    await engine.generateActions();

    const upserted = db.upsertNextBestAction.mock.calls.map((c) => c[0]);
    const debtAction = upserted.find((a) => a.category === 'debt');
    expect(debtAction).toBeDefined();
    expect(debtAction.title).toContain('Credit Card');
    expect(debtAction.score).toBeGreaterThanOrEqual(80);
  });

  test('generates bills due soon action', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const db = mockDb();
    db.listBills.mockReturnValue([
      {
        id: 'bill1',
        title: 'Internet',
        amount: 100,
        next_due_date: tomorrow.toISOString().slice(0, 10),
      },
    ]);

    const engine = new NextBestActionsEngine(db);
    await engine.generateActions();

    const upserted = db.upsertNextBestAction.mock.calls.map((c) => c[0]);
    const billAction = upserted.find((a) => a.category === 'bills');
    expect(billAction).toBeDefined();
    expect(billAction.title).toContain('Internet');
    expect(billAction.score).toBeGreaterThanOrEqual(90);
  });

  test('generates contribution room action', async () => {
    const db = mockDb();
    db.listContributionRoom.mockReturnValue([
      { account_type: 'TFSA', known_room: 7000 },
    ]);

    const engine = new NextBestActionsEngine(db);
    await engine.generateActions();

    const upserted = db.upsertNextBestAction.mock.calls.map((c) => c[0]);
    const investAction = upserted.find((a) => a.category === 'investing');
    expect(investAction).toBeDefined();
    expect(investAction.title).toContain('TFSA');
    expect(investAction.score).toBeGreaterThanOrEqual(60);
  });

  test('does not flag emergency fund when total saved covers a month of expenses', async () => {
    const db = mockDb();
    db.computeFinancials.mockReturnValue({
      income: 5000,
      expenses: 3000,
      savingsRate: 40,
      catSpending: {},
      netWorth: 50000,
      totalDebt: 0,
      totalSaved: 3500,
    });

    const engine = new NextBestActionsEngine(db);
    await engine.generateActions();

    const upserted = db.upsertNextBestAction.mock.calls.map((c) => c[0]);
    const fundAction = upserted.find((a) => a.action_key === 'low_emergency_fund');
    expect(fundAction).toBeUndefined();
  });

  test('flags emergency fund using the dashboard saved total when below expenses', async () => {
    const db = mockDb();
    db.computeFinancials.mockReturnValue({
      income: 5000,
      expenses: 3000,
      savingsRate: 40,
      catSpending: {},
      netWorth: 50000,
      totalDebt: 0,
      totalSaved: 500,
    });

    const engine = new NextBestActionsEngine(db);
    await engine.generateActions();

    const upserted = db.upsertNextBestAction.mock.calls.map((c) => c[0]);
    const fundAction = upserted.find((a) => a.action_key === 'low_emergency_fund');
    expect(fundAction).toBeDefined();
    expect(fundAction.description).toContain('$500');
    expect(fundAction.score).toBeGreaterThanOrEqual(75);
  });

  test('generates goal off-track action', async () => {
    const sixMonths = new Date();
    sixMonths.setMonth(sixMonths.getMonth() + 4);
    const db = mockDb();
    db.listGoals.mockReturnValue([
      {
        id: 'g1',
        name: 'Vacation',
        target_amount: 10000,
        current_amount: 1000,
        monthly_contribution: 200,
        deadline: sixMonths.toISOString().slice(0, 10),
      },
    ]);

    const engine = new NextBestActionsEngine(db);
    await engine.generateActions();

    const upserted = db.upsertNextBestAction.mock.calls.map((c) => c[0]);
    const goalAction = upserted.find((a) => a.category === 'planning');
    expect(goalAction).toBeDefined();
    expect(goalAction.title).toContain('Vacation');
    expect(goalAction.score).toBeGreaterThanOrEqual(65);
  });

  test('generates missing profile action', async () => {
    const db = mockDb();
    db.getSettings.mockReturnValue({ province: 'AB', profile_completed: false });

    const engine = new NextBestActionsEngine(db);
    await engine.generateActions();

    const upserted = db.upsertNextBestAction.mock.calls.map((c) => c[0]);
    const profileAction = upserted.find(
      (a) => a.action_key === 'missing_profile'
    );
    expect(profileAction).toBeDefined();
    expect(profileAction.score).toBe(40);
    expect(profileAction.priority).toBe('low');
  });

  test('ranks actions by score descending', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const db = mockDb();
    db.getSettings.mockReturnValue({ province: 'AB', profile_completed: false });
    db.listDebts.mockReturnValue([
      { id: 'd1', name: 'Loan', balance: 6000, rate: 20, min_payment: 100 },
    ]);
    db.listBills.mockReturnValue([
      {
        id: 'bill1',
        title: 'Rent',
        amount: 1500,
        next_due_date: tomorrow.toISOString().slice(0, 10),
      },
    ]);
    // Make listNextBestActions return open actions sorted by score desc
    const openActions = [];
    db.upsertNextBestAction.mockImplementation((a) => {
      openActions.push(a);
      return a;
    });
    db.listNextBestActions.mockImplementation((filter) => {
      if (filter === 'open') {
        return [...openActions].sort((a, b) => b.score - a.score);
      }
      return [];
    });

    const engine = new NextBestActionsEngine(db);
    const result = await engine.generateActions();

    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].score).toBeGreaterThanOrEqual(result[i].score);
    }
  });

  test('does not regenerate recently completed action', async () => {
    const recentlyCompleted = {
      action_key: 'missing_profile',
      status: 'completed',
      completed_at: new Date().toISOString(),
    };
    const db = mockDb([recentlyCompleted]);
    db.getSettings.mockReturnValue({ province: 'AB', profile_completed: false });

    const engine = new NextBestActionsEngine(db);
    await engine.generateActions();

    const upserted = db.upsertNextBestAction.mock.calls.map((c) => c[0]);
    const profileAction = upserted.find(
      (a) => a.action_key === 'missing_profile'
    );
    expect(profileAction).toBeUndefined();
  });

  test('does not regenerate recently done action', async () => {
    const recentlyDone = {
      action_key: 'missing_profile',
      status: 'done',
      completed_at: new Date().toISOString(),
    };
    const db = mockDb([recentlyDone]);
    db.getSettings.mockReturnValue({ province: 'AB', profile_completed: false });

    const engine = new NextBestActionsEngine(db);
    await engine.generateActions();

    const upserted = db.upsertNextBestAction.mock.calls.map((c) => c[0]);
    const profileAction = upserted.find(
      (a) => a.action_key === 'missing_profile'
    );
    expect(profileAction).toBeUndefined();
  });

  test('persists generated actions via upsert', async () => {
    const db = mockDb();
    db.listDebts.mockReturnValue([
      { id: 'd1', name: 'Card', balance: 3000, rate: 18, min_payment: 50 },
    ]);
    db.getSettings.mockReturnValue({ province: 'AB', profile_completed: false });

    const engine = new NextBestActionsEngine(db);
    await engine.generateActions();

    expect(db.upsertNextBestAction).toHaveBeenCalled();
    const calls = db.upsertNextBestAction.mock.calls;
    expect(calls.length).toBeGreaterThanOrEqual(2); // at least debt + profile
    for (const [action] of calls) {
      expect(action).toHaveProperty('id');
      expect(action).toHaveProperty('action_key');
      expect(action).toHaveProperty('title');
      expect(action).toHaveProperty('score');
      expect(action).toHaveProperty('priority');
      expect(action).toHaveProperty('source_type', 'rule');
    }
  });
});
