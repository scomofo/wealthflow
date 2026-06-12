export const ONBOARDING_FOCUS_OPTIONS = [
  { value: 'improve_cashflow', label: 'Improve monthly cashflow' },
  { value: 'reduce_debt', label: 'Reduce debt' },
  { value: 'build_savings', label: 'Build a cash buffer' },
  { value: 'invest_more', label: 'Invest more' },
  { value: 'plan_month', label: 'Plan this month' },
];

const VALID_FOCUSES = new Set(ONBOARDING_FOCUS_OPTIONS.map((option) => option.value));
const VALID_CONFIDENCE = new Set(['high', 'medium', 'starter']);

const FOCUS_FALLBACK_ACTIONS = {
  improve_cashflow: { title: 'Check your top spending categories this week', icon: 'bar-chart-3', priority: 'high' },
  reduce_debt: { title: 'List debts by interest rate before making extra payments', icon: 'credit-card', priority: 'high' },
  build_savings: { title: 'Set a first cash-buffer target', icon: 'piggy-bank', priority: 'high' },
  invest_more: { title: 'Review TFSA, RRSP, or FHSA room before investing more', icon: 'trending-up', priority: 'high' },
  plan_month: { title: "Review this month's income, bills, and planned spending", icon: 'calendar', priority: 'high' },
};

const GENERIC_FIRST_ACTION = {
  title: 'Track your top 3 spending categories this week',
  icon: 'bar-chart-3',
  priority: 'high',
};

const SUPPORTING_FALLBACK_ACTIONS = [
  { title: 'Complete your Financial Profile for sharper advice', icon: 'user', priority: 'medium' },
  { title: 'Review your largest recurring expense', icon: 'repeat', priority: 'medium' },
];

const CONFIDENCE_SUMMARIES = {
  high: {
    confidence: 'high',
    label: 'High',
    explanation: 'Based on your cashflow, buffer, and focus area.',
  },
  medium: {
    confidence: 'medium',
    label: 'Medium',
    explanation: 'Based on your starting estimates and focus area.',
  },
  starter: {
    confidence: 'starter',
    label: 'Starter',
    explanation: 'Based on a starter profile. Add more details any time for sharper actions.',
  },
};

function getOpenOnboardingActions(state) {
  return (state?.nextBestActions || [])
    .filter(a => a.status === 'open')
    .slice(0, 3);
}

function hasTypedValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== '';
}

export function normalizeOnboardingFocus(focus) {
  return VALID_FOCUSES.has(focus) ? focus : null;
}

export function normalizeOnboardingConfidence(confidence) {
  return VALID_CONFIDENCE.has(confidence) ? confidence : 'starter';
}

export function calculateOnboardingConfidence(inputs = {}) {
  const values = inputs || {};
  const focus = normalizeOnboardingFocus(values.onboarding_focus);
  const hasIncome = hasTypedValue(values.monthly_income);
  const hasExpenses = hasTypedValue(values.monthly_expenses);
  const hasDebt = hasTypedValue(values.total_debt);
  const hasSavings = hasTypedValue(values.savings_buffer);
  const estimateCount = [hasIncome, hasExpenses, hasDebt, hasSavings].filter(Boolean).length;

  if (focus && hasIncome && hasExpenses && (hasDebt || hasSavings)) return 'high';
  if ((focus && estimateCount > 0) || (hasIncome && hasExpenses)) return 'medium';
  return 'starter';
}

export function getOnboardingConfidenceSummary(settings = {}) {
  const values = settings || {};
  const confidence = normalizeOnboardingConfidence(values.onboarding_confidence);
  return { ...CONFIDENCE_SUMMARIES[confidence] };
}

export function hasOpenOnboardingActions(state) {
  return getOpenOnboardingActions(state).length > 0;
}

export function selectOnboardingActions(state) {
  const actions = getOpenOnboardingActions(state);
  if (actions.length > 0) return actions;

  const focus = normalizeOnboardingFocus(state?.settings?.onboarding_focus);
  const firstAction = FOCUS_FALLBACK_ACTIONS[focus] || GENERIC_FIRST_ACTION;
  return [firstAction, ...SUPPORTING_FALLBACK_ACTIONS].map(action => ({ ...action }));
}
