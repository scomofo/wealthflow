const { selectOnboardingActions } = require('../src/renderer/js/utils/onboarding.js');

describe('selectOnboardingActions', () => {
  test('uses open next-best actions from the first-run state', () => {
    const state = {
      nextBestActions: [
        { id: 'done', status: 'done', title: 'Completed action' },
        { id: 'open-1', status: 'open', title: 'Open action 1' },
        { id: 'open-2', status: 'open', title: 'Open action 2' },
        { id: 'open-3', status: 'open', title: 'Open action 3' },
        { id: 'open-4', status: 'open', title: 'Open action 4' },
      ],
    };

    const actions = selectOnboardingActions(state);

    expect(actions.map((a) => a.id)).toEqual(['open-1', 'open-2', 'open-3']);
  });

  test('falls back when no open next-best actions exist', () => {
    const actions = selectOnboardingActions({ nextBestActions: [] });

    expect(actions).toHaveLength(3);
    expect(actions[0].title).toContain('Track your top 3');
  });
});
