const {
  getNextActionAfterCompletion,
  buildCompletionToast,
  shouldShowFocusFinishState,
} = require('../src/renderer/js/utils/action-momentum.js');

describe('action momentum utils', () => {
  test('selects the next open action after completion', () => {
    const actions = [
      { id: 'done-1', title: 'Completed action' },
      { id: 'next-1', title: 'Review budget', status: 'open' },
      { id: 'next-2', title: 'Pay bill', status: 'open' },
    ];

    expect(getNextActionAfterCompletion(actions, 'done-1')).toEqual(actions[1]);
  });

  test('ignores completed action and unavailable statuses', () => {
    const actions = [
      { id: 'a', status: 'done' },
      { id: 'b', status: 'snoozed' },
      { id: 'c', status: 'open', title: 'Use this' },
    ];

    expect(getNextActionAfterCompletion(actions, 'a')).toEqual(actions[2]);
  });

  test('builds first-action toast from feedback', () => {
    expect(buildCompletionToast({
      message: "Nice - you've taken your first step.",
      milestone: 'first_action',
    })).toEqual({
      message: "Nice - you've taken your first step.",
      type: 'success',
    });
  });

  test('shows focus finish state only when completion happened in focus mode', () => {
    expect(shouldShowFocusFinishState({ source: 'focus' })).toBe(true);
    expect(shouldShowFocusFinishState({ source: 'dashboard' })).toBe(false);
  });
});
