const { buildDashboardAISummary } = require('../src/renderer/js/utils/dashboard-intelligence.js');
const { generateAISummary } = require('../src/renderer/js/utils/ai-summary.js');

describe('buildDashboardAISummary', () => {
  test('uses personalization summary emphasis when building dashboard summary', () => {
    const state = {
      summaryEmphasis: 'debt_reduction',
      nextBestActions: [
        {
          title: 'Review Food spending',
          category: 'budget',
          score: 72,
          impact_text: 'Free up cash flow',
        },
      ],
    };

    const summary = buildDashboardAISummary(state, { savingsRate: 5, totalDebt: 20000 }, generateAISummary);

    expect(summary.headline).toContain('reducing interest drag');
  });
});
