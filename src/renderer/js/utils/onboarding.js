const FALLBACK_ONBOARDING_ACTIONS = [
  { title: 'Track your top 3 spending categories this week', icon: 'bar-chart', priority: 'high' },
  { title: 'Review your largest recurring expense', icon: 'repeat', priority: 'medium' },
  { title: 'Complete your Financial Profile for better advice', icon: 'user-check', priority: 'medium' },
];

function getOpenOnboardingActions(state) {
  return (state?.nextBestActions || [])
    .filter(a => a.status === 'open')
    .slice(0, 3);
}

export function hasOpenOnboardingActions(state) {
  return getOpenOnboardingActions(state).length > 0;
}

export function selectOnboardingActions(state) {
  const actions = getOpenOnboardingActions(state);
  return actions.length > 0 ? actions : FALLBACK_ONBOARDING_ACTIONS;
}
