const { computeNextActions } = require('../src/renderer/js/utils/next-actions.js');

describe('computeNextActions', () => {
  const baseState = {
    budgets: [],
    goals: [],
    debts: [],
    bills: [],
    investments: [],
    contributionRoom: [],
    settings: { profile_completed: true },
  };
  const baseFinancials = {
    catSpending: {},
    expenses: 2000,
    income: 4000,
    savingsRate: 50,
    netWorth: 10000,
  };

  test('returns empty array when no issues detected', () => {
    const actions = computeNextActions(baseState, baseFinancials);
    expect(actions).toEqual([]);
  });

  test('detects budget over 80%', () => {
    const state = { ...baseState, budgets: [{ id: '1', category: 'Food', amount: 500 }] };
    const financials = { ...baseFinancials, catSpending: { Food: 420 } };
    const actions = computeNextActions(state, financials);
    expect(actions.length).toBe(1);
    expect(actions[0].priority).toBe('high');
    expect(actions[0].link).toBe('budget');
    expect(actions[0].text).toContain('Food');
  });

  test('detects budget blown over 100%', () => {
    const state = { ...baseState, budgets: [{ id: '1', category: 'Food', amount: 500 }] };
    const financials = { ...baseFinancials, catSpending: { Food: 550 } };
    const actions = computeNextActions(state, financials);
    expect(actions.length).toBe(1);
    expect(actions[0].priority).toBe('high');
    expect(actions[0].text).toContain('over budget');
  });

  test('detects high-interest debt', () => {
    const state = { ...baseState, debts: [{ id: '1', name: 'Credit Card', balance: 5000, rate: 19.99, min_payment: 100 }] };
    const actions = computeNextActions(state, baseFinancials);
    expect(actions.some(a => a.link === 'debts' && a.priority === 'high')).toBe(true);
  });

  test('detects unused TFSA room', () => {
    const state = { ...baseState, contributionRoom: [{ account_type: 'tfsa', known_room: 15000 }] };
    const actions = computeNextActions(state, baseFinancials);
    expect(actions.some(a => a.link === 'registered')).toBe(true);
  });

  test('detects overdue bills', () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const state = { ...baseState, bills: [{ id: '1', title: 'Rent', amount: 1500, next_due_date: yesterday, type: 'bill' }] };
    const actions = computeNextActions(state, baseFinancials);
    expect(actions.some(a => a.priority === 'high' && a.link === 'bills')).toBe(true);
  });

  test('detects bills due within 7 days', () => {
    const nextWeek = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10);
    const state = { ...baseState, bills: [{ id: '1', title: 'Internet', amount: 80, next_due_date: nextWeek, type: 'bill' }] };
    const actions = computeNextActions(state, baseFinancials);
    expect(actions.some(a => a.link === 'bills')).toBe(true);
  });

  test('detects missing financial profile', () => {
    const state = { ...baseState, settings: { profile_completed: false } };
    const actions = computeNextActions(state, baseFinancials);
    expect(actions.some(a => a.link === 'advisor' && a.priority === 'low')).toBe(true);
  });

  test('detects no budgets configured', () => {
    const actions = computeNextActions(baseState, baseFinancials);
    // baseState has empty budgets, but also has profile_completed: true
    // so only "no budgets" should fire
    expect(actions.some(a => a.link === 'budget' && a.priority === 'low')).toBe(true);
  });

  test('detects goal behind pace', () => {
    const deadline = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);
    const state = { ...baseState, goals: [{ id: '1', name: 'Vacation', target: 5000, current: 500, deadline }] };
    const financials = { ...baseFinancials, savingsRate: 10 };
    const actions = computeNextActions(state, financials);
    expect(actions.some(a => a.link === 'savings')).toBe(true);
  });

  test('sorts by priority: high before medium before low', () => {
    const state = {
      ...baseState,
      debts: [{ id: '1', name: 'CC', balance: 5000, rate: 20, min_payment: 100 }],
      contributionRoom: [{ account_type: 'tfsa', known_room: 15000 }],
      settings: { profile_completed: false },
    };
    const actions = computeNextActions(state, baseFinancials);
    const priorities = actions.map(a => a.priority);
    const order = { high: 0, medium: 1, low: 2 };
    for (let i = 1; i < priorities.length; i++) {
      expect(order[priorities[i]]).toBeGreaterThanOrEqual(order[priorities[i - 1]]);
    }
  });
});
