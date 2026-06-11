const { findRelatedActionForNudge } = require('../src/renderer/js/utils/proactive-routing.js');

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
});
