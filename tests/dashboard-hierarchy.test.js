// Regression coverage for finding M13: CLAUDE.md's own product doc states
// the dashboard hierarchy as "1. Next Best Actions (hero) 2. Snapshot bar
// 3. Insights 4. Saved actions 5. Secondary content", but
// renderNextBestActionsPanel was called 6th in the template — after the AI
// summary, proactive banner, financial snapshot bar, and progress strip —
// so the section meant to tell the user what to do in under 5 seconds
// required scrolling past four other sections first.
//
// Each sub-component is mocked to a unique marker string so this test can
// assert their relative order in the rendered output without needing to
// construct realistic data for every one of them.
jest.mock('../src/renderer/js/components/next-best-actions-panel.js', () => ({
  renderNextBestActionsPanel: () => '<!--NBA_PANEL-->',
}));
jest.mock('../src/renderer/js/components/ai-decision-card.js', () => ({
  renderDecisionCard: () => '<!--DECISION_CARD-->',
}));
jest.mock('../src/renderer/js/components/ai-action-list.js', () => ({
  renderActionList: () => '<!--ACTION_LIST-->',
}));
jest.mock('../src/renderer/js/components/financial-snapshot-bar.js', () => ({
  renderFinancialSnapshotBar: () => '<!--SNAPSHOT_BAR-->',
}));
jest.mock('../src/renderer/js/components/dashboard-insight-cards.js', () => ({
  renderDashboardInsightCards: () => '<!--INSIGHT_CARDS-->',
}));
jest.mock('../src/renderer/js/components/ai-summary.js', () => ({
  renderAISummary: () => '<!--AI_SUMMARY-->',
}));
jest.mock('../src/renderer/js/utils/ai-summary.js', () => ({
  generateAISummary: () => 'summary',
}));
jest.mock('../src/renderer/js/utils/dashboard-intelligence.js', () => ({
  buildDashboardAISummary: () => 'summary',
}));
jest.mock('../src/renderer/js/components/proactive-banner.js', () => ({
  renderProactiveBanner: () => '<!--PROACTIVE_BANNER-->',
}));
jest.mock('../src/renderer/js/components/progress-strip.js', () => ({
  renderProgressStrip: () => '<!--PROGRESS_STRIP-->',
}));

const { renderDashboard } = require('../src/renderer/js/pages/dashboard.js');

describe('dashboard section order', () => {
  test('Next Best Actions renders first among the intelligence sections, ahead of the snapshot bar, insights, and saved actions', () => {
    const state = {
      settings: { user_name: 'Alex', level: 1, xp: 0 },
      budgets: [],
      counts: {},
      nextBestActions: [],
      proactiveNudges: [],
      engagementProgress: null,
      recommendedActions: [],
    };
    const F = { catSpending: {} };

    const html = renderDashboard(state, F, {});

    const positions = {
      nba: html.indexOf('<!--NBA_PANEL-->'),
      snapshotBar: html.indexOf('<!--SNAPSHOT_BAR-->'),
      insights: html.indexOf('<!--INSIGHT_CARDS-->'),
      savedActions: html.indexOf('<!--ACTION_LIST-->'),
    };

    // All sections must actually be present.
    for (const [name, pos] of Object.entries(positions)) {
      expect(pos).toBeGreaterThanOrEqual(0);
    }

    // CLAUDE.md order: Next Best Actions -> Snapshot bar -> Insights -> Saved actions.
    expect(positions.nba).toBeLessThan(positions.snapshotBar);
    expect(positions.snapshotBar).toBeLessThan(positions.insights);
    expect(positions.insights).toBeLessThan(positions.savedActions);
  });

  test('Next Best Actions renders before the AI summary, proactive banner, and progress strip (the sections it used to trail)', () => {
    const state = {
      settings: { user_name: 'Alex', level: 1, xp: 0 },
      budgets: [],
      counts: {},
      nextBestActions: [],
      proactiveNudges: [],
      engagementProgress: null,
      recommendedActions: [],
    };
    const F = { catSpending: {} };

    const html = renderDashboard(state, F, {});

    const nbaPos = html.indexOf('<!--NBA_PANEL-->');
    expect(nbaPos).toBeLessThan(html.indexOf('<!--AI_SUMMARY-->'));
    expect(nbaPos).toBeLessThan(html.indexOf('<!--PROACTIVE_BANNER-->'));
    expect(nbaPos).toBeLessThan(html.indexOf('<!--PROGRESS_STRIP-->'));
  });
});
