// Regression coverage for finding M19: two unrelated but co-filed issues.
//
// 1. debts.js's "Total Debt" stat card passed a hardcoded -5.2 as the
//    period-over-period "change" — a fake trend number with no relationship
//    to the user's actual debt data, always telling them their debt went
//    down 5.2% no matter what it actually did. stat-card.js's stat() now
//    omits the trend badge entirely when no real change value is supplied,
//    instead of rendering a fabricated one.
//
// 2. The dashboard's XP progress bar computed xpForNext as `level * 100`,
//    while the actual leveling formula in handlers/shared.js's addXP()
//    derives level from total XP at 500 XP per level
//    (`Math.floor(newXP / 500) + 1`). The two were never kept in sync, so
//    the bar's fill fraction bore no relation to how close the user
//    actually was to leveling up. Both now derive from one shared
//    XP_PER_LEVEL constant (utils/gamification.js), and the bar measures
//    progress within the current level (xp minus the current level's
//    starting threshold) rather than raw cumulative XP against a
//    mismatched denominator.

const { stat } = require('../src/renderer/js/components/stat-card.js');
const { XP_PER_LEVEL } = require('../src/renderer/js/utils/gamification.js');

describe('stat() omits the trend badge instead of fabricating a change value', () => {
  test('renders no percent badge when change is null', () => {
    const html = stat('Total Debt', '$1,000', null, 'credit-card', 'var(--red)');
    expect(html).not.toMatch(/%/);
    expect(html).not.toMatch(/color:var\(--(green|red)\)/);
  });

  test('renders no badge when change is undefined', () => {
    const html = stat('Total Debt', '$1,000', undefined, 'credit-card', 'var(--red)');
    expect(html).not.toMatch(/%/);
  });

  test('still renders a real change value, including exactly 0', () => {
    const html = stat('Min Payments', '$100', 0, 'clock', 'var(--orange)');
    expect(html).toMatch(/color:var\(--green\)/);
    expect(html).toMatch(/0%/);
  });

  test('still renders a real negative change value', () => {
    const html = stat('Total Debt', '$1,000', -3.4, 'credit-card', 'var(--red)');
    expect(html).toMatch(/color:var\(--red\)/);
    expect(html).toMatch(/3\.4%/);
  });
});

describe("debts.js no longer hardcodes a fake -5.2% trend for Total Debt", () => {
  test('renderDebts never passes a fabricated -5.2 into stat()', () => {
    const fs = require('fs');
    const path = require('path');
    const source = fs.readFileSync(
      path.join(__dirname, '..', 'src', 'renderer', 'js', 'pages', 'debts.js'),
      'utf8'
    );
    expect(source).not.toMatch(/-5\.2/);
  });
});

describe('XP leveling and the dashboard XP bar share one XP_PER_LEVEL constant', () => {
  test('XP_PER_LEVEL is 500, matching the addXP leveling formula', () => {
    expect(XP_PER_LEVEL).toBe(500);
  });

  test('addXP (handlers/shared.js) computes level using XP_PER_LEVEL, not a hardcoded number', async () => {
    jest.resetModules();
    const State = { getState: jest.fn(), updateSettings: jest.fn() };
    State.getState.mockReturnValue({ settings: { xp: 400 } });
    const { addXP } = require('../src/renderer/js/handlers/shared.js');

    // 400 + 150 = 550 total XP -> floor(550/500)+1 = level 2
    await addXP(150, { State });

    expect(State.updateSettings).toHaveBeenCalledWith({ xp: 550, level: 2 });
  });

  test('dashboard XP bar measures progress within the current level using XP_PER_LEVEL, not level*100', () => {
    jest.resetModules();
    jest.doMock('../src/renderer/js/components/next-best-actions-panel.js', () => ({ renderNextBestActionsPanel: () => '' }));
    jest.doMock('../src/renderer/js/components/ai-decision-card.js', () => ({ renderDecisionCard: () => '' }));
    jest.doMock('../src/renderer/js/components/ai-action-list.js', () => ({ renderActionList: () => '' }));
    jest.doMock('../src/renderer/js/components/financial-snapshot-bar.js', () => ({ renderFinancialSnapshotBar: () => '' }));
    jest.doMock('../src/renderer/js/components/dashboard-insight-cards.js', () => ({ renderDashboardInsightCards: () => '' }));
    jest.doMock('../src/renderer/js/components/ai-summary.js', () => ({ renderAISummary: () => '' }));
    jest.doMock('../src/renderer/js/utils/ai-summary.js', () => ({ generateAISummary: () => '' }));
    jest.doMock('../src/renderer/js/utils/dashboard-intelligence.js', () => ({ buildDashboardAISummary: () => '' }));
    jest.doMock('../src/renderer/js/components/proactive-banner.js', () => ({ renderProactiveBanner: () => '' }));
    jest.doMock('../src/renderer/js/components/progress-strip.js', () => ({ renderProgressStrip: () => '' }));

    const { renderDashboard } = require('../src/renderer/js/pages/dashboard.js');

    // Level 3 (floor(1100/500)+1 = 3) started at 1000 total XP, so 1100 total
    // XP is 100 XP into a 500-XP level: the bar should show "100 / 500 XP",
    // not the old level*100 = 300 denominator (which would show "1100 / 300").
    const state = {
      settings: { user_name: 'Alex', level: 3, xp: 1100 },
      budgets: [],
      counts: {},
      nextBestActions: [],
      proactiveNudges: [],
      engagementProgress: null,
      recommendedActions: [],
    };
    const F = { catSpending: {} };

    const html = renderDashboard(state, F, {});

    expect(html).toContain('100 / 500 XP');
    expect(html).not.toContain('1100 / 300 XP');
  });
});
