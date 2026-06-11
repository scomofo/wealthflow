const FULL_REFRESH = [
  'nextBestActions',
  'personalization',
  'proactiveNudges',
  'engagementProgress',
];

export function getIntelligenceRefreshPlan(reason = 'manual') {
  switch (reason) {
    case 'financial_data_changed':
    case 'action_completed':
    case 'action_snoozed':
    case 'action_dismissed':
    case 'onboarding_completed':
    case 'manual':
      return FULL_REFRESH.slice();
    case 'summary_only':
      return ['personalization', 'proactiveNudges'];
    default:
      return FULL_REFRESH.slice();
  }
}
