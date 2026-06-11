const { getFocusStepsForAction } = require('../src/renderer/js/utils/focus-steps.js');

describe('getFocusStepsForAction', () => {
  test('adapts steps when the user has affinity for Focus Mode', () => {
    const steps = getFocusStepsForAction(
      { category: 'budget' },
      { focusModeAffinity: true, primaryFocus: 'budget' }
    );

    expect(steps).toHaveLength(3);
    expect(steps[0]).toContain('Open your transactions');
    expect(steps[2]).toContain('Mark this complete');
  });
});
