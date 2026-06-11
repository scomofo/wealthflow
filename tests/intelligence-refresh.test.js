const { getIntelligenceRefreshPlan } = require('../src/renderer/js/utils/intelligence-refresh.js');

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
