const { getIntelligenceRefreshPlan } = require('../src/renderer/js/utils/intelligence-refresh.js');
const {
  initPlan,
  refreshCommandCenterIntelligence,
} = require('../src/renderer/js/state/plan.js');

describe('getIntelligenceRefreshPlan', () => {
  test('refreshes everything after financial data changes', () => {
    expect(getIntelligenceRefreshPlan('financial_data_changed')).toEqual([
      'nextBestActions',
      'personalization',
      'proactiveNudges',
      'engagementProgress',
    ]);
  });

  test('refreshes actions and nudges after action completion', () => {
    expect(getIntelligenceRefreshPlan('action_completed')).toEqual([
      'nextBestActions',
      'personalization',
      'proactiveNudges',
      'engagementProgress',
    ]);
  });

  test('uses a light refresh for manual summary updates', () => {
    expect(getIntelligenceRefreshPlan('summary_only')).toEqual([
      'personalization',
      'proactiveNudges',
    ]);
  });
});

describe('refreshCommandCenterIntelligence', () => {
  let state;
  let api;

  beforeEach(() => {
    state = {
      nextBestActions: [],
      proactiveNudges: [],
      engagementProgress: null,
      personalizationProfile: null,
      summaryEmphasis: null,
      lastIntelligenceRefresh: null,
    };
    api = {
      generateNextBestActions: jest.fn().mockResolvedValue([{ id: 'nba-1' }]),
      getPersonalizationProfile: jest.fn().mockResolvedValue({ tone: 'direct' }),
      getSummaryEmphasis: jest.fn().mockResolvedValue({ focus: 'cashflow' }),
      evaluateProactiveNudges: jest.fn().mockResolvedValue([{ id: 'nudge-1' }]),
      getEngagementProgress: jest.fn().mockResolvedValue({ completed: 2 }),
    };
    initPlan(state, api);
  });

  test('updates planned intelligence state fields and records refresh metadata', async () => {
    const result = await refreshCommandCenterIntelligence('action_completed');

    expect(state.nextBestActions).toEqual([{ id: 'nba-1' }]);
    expect(state.personalizationProfile).toEqual({ tone: 'direct' });
    expect(state.summaryEmphasis).toEqual({ focus: 'cashflow' });
    expect(state.proactiveNudges).toEqual([{ id: 'nudge-1' }]);
    expect(state.engagementProgress).toEqual({ completed: 2 });
    expect(result).toEqual({
      reason: 'action_completed',
      refreshed_at: expect.any(String),
      plan: [
        'nextBestActions',
        'personalization',
        'proactiveNudges',
        'engagementProgress',
      ],
    });
    expect(state.lastIntelligenceRefresh).toBe(result);
  });

  test('records step errors without rejecting and keeps successful updates', async () => {
    delete api.generateNextBestActions;
    api.evaluateProactiveNudges.mockRejectedValue(new Error('nudge service unavailable'));

    const result = await refreshCommandCenterIntelligence('financial_data_changed');

    expect(state.personalizationProfile).toEqual({ tone: 'direct' });
    expect(state.summaryEmphasis).toEqual({ focus: 'cashflow' });
    expect(state.engagementProgress).toEqual({ completed: 2 });
    expect(state.lastIntelligenceRefresh).toBe(result);
    expect(result).toEqual({
      reason: 'financial_data_changed',
      refreshed_at: expect.any(String),
      plan: [
        'nextBestActions',
        'personalization',
        'proactiveNudges',
        'engagementProgress',
      ],
      errors: [
        {
          step: 'nextBestActions',
          message: expect.stringContaining('generateNextBestActions'),
        },
        {
          step: 'proactiveNudges',
          message: 'nudge service unavailable',
        },
      ],
    });
  });
});
