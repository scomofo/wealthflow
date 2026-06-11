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

  test('renders expense-specific cashflow reason without duplicate Because', () => {
    const html = renderFocusMode(
      {
        id: 'cash-1',
        title: 'Build emergency cash reserve',
        priority: 'high',
        category: 'cashflow',
      },
      {},
      { financials: { expenses: 4888 } }
    );

    expect(html).toContain('monthly expenses are about $4,888');
    expect(html).not.toContain('Because monthly expenses');
  });
});
