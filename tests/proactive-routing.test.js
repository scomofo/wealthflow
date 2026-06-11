const {
  findRelatedActionForNudge,
  getNudgeFallbackRoute,
} = require('../src/renderer/js/utils/proactive-routing.js');

describe('findRelatedActionForNudge', () => {
  test('matches by related action id first', () => {
    const actions = [
      { id: 'a1', category: 'budget', title: 'Budget action' },
      { id: 'a2', category: 'debt', title: 'Debt action' },
    ];

    expect(findRelatedActionForNudge({ related_action_id: 'a2', related_action_category: 'budget' }, actions)).toBe(actions[1]);
  });

  test('falls back to category match', () => {
    const actions = [
      { id: 'a1', category: 'debt', title: 'Debt action' },
      { id: 'a2', category: 'budget', title: 'Budget action' },
    ];

    expect(findRelatedActionForNudge({ related_action_category: 'budget' }, actions)).toBe(actions[1]);
  });

  test('returns null without a usable match', () => {
    expect(findRelatedActionForNudge({ related_action_category: 'bills' }, [{ id: 'a1', category: 'debt' }])).toBeNull();
  });

  test('matches malformed category values without throwing', () => {
    const actions = [{ id: 'a1', category: 123, title: 'Numeric category action' }];

    expect(findRelatedActionForNudge({ related_action_category: 123 }, actions)).toBe(actions[0]);
  });
});

describe('getNudgeFallbackRoute', () => {
  test('maps proactive categories to route ids', () => {
    expect(getNudgeFallbackRoute('budget')).toBe('budget');
    expect(getNudgeFallbackRoute('debt')).toBe('debts');
    expect(getNudgeFallbackRoute('bills')).toBe('bills');
    expect(getNudgeFallbackRoute('investing')).toBe('registered');
    expect(getNudgeFallbackRoute('cashflow')).toBe('savings');
    expect(getNudgeFallbackRoute('planning')).toBe('dashboard');
  });

  test('defaults unknown or malformed categories to dashboard', () => {
    expect(getNudgeFallbackRoute('unknown')).toBe('dashboard');
    expect(getNudgeFallbackRoute({})).toBe('dashboard');
    expect(getNudgeFallbackRoute()).toBe('dashboard');
  });
});
