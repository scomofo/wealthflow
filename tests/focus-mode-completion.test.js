const { renderFocusMode } = require('../src/renderer/js/components/focus-mode.js');

describe('renderFocusMode completion state', () => {
  const action = {
    id: 'a1',
    title: 'Review high-interest debt',
    priority: 'high',
    category: 'debt',
    rationale: 'This debt is reducing cash flow.',
    impact_text: 'Reduces interest drag.',
  };

  test('renders completion feedback and disables repeated completion', () => {
    const html = renderFocusMode(action, {}, {
      completionFeedback: {
        message: 'Nice - progress made.',
        detail: 'Completed: Review high-interest debt',
        weeklyCount: 2,
      },
    });

    expect(html).toContain('focus-mode-complete');
    expect(html).toContain('Nice - progress made.');
    expect(html).toContain('Completed: Review high-interest debt');
    expect(html).not.toContain('data-action="complete-next-best-action"');
  });

  test('renders next action shortcut when provided', () => {
    const html = renderFocusMode(action, {}, {
      completionFeedback: { message: 'Nice - progress made.' },
      nextAction: { id: 'a2', title: 'Check budget' },
    });

    expect(html).toContain('data-action="open-focus-mode"');
    expect(html).toContain('data-id="a2"');
    expect(html).toContain('Check budget');
  });
});
