const {
  calculateOnboardingConfidence,
  getOnboardingConfidenceSummary,
  selectOnboardingActions,
} = require('../src/renderer/js/utils/onboarding.js');

describe('selectOnboardingActions', () => {
  test('uses open next-best actions from the first-run state', () => {
    const state = {
      settings: { onboarding_focus: 'reduce_debt' },
      nextBestActions: [
        { id: 'done', status: 'done', title: 'Completed action' },
        { id: 'open-1', status: 'open', title: 'Open action 1' },
        { id: 'open-2', status: 'open', title: 'Open action 2' },
        { id: 'open-3', status: 'open', title: 'Open action 3' },
        { id: 'open-4', status: 'open', title: 'Open action 4' },
      ],
    };

    const actions = selectOnboardingActions(state);

    expect(actions.map((a) => a.id)).toEqual(['open-1', 'open-2', 'open-3']);
  });

  test('uses focus-specific fallback actions when no open actions exist', () => {
    const actions = selectOnboardingActions({
      settings: { onboarding_focus: 'reduce_debt' },
      nextBestActions: [],
    });

    expect(actions).toHaveLength(3);
    expect(actions[0]).toMatchObject({
      title: 'List debts by interest rate before making extra payments',
      icon: 'credit-card',
      priority: 'high',
    });
    expect(actions[1]).toMatchObject({
      title: 'Complete your Financial Profile for sharper advice',
      icon: 'user',
    });
    expect(actions[2].title).toBe('Review your largest recurring expense');
  });

  test('falls back to generic starter action when focus is unknown', () => {
    const actions = selectOnboardingActions({
      settings: { onboarding_focus: 'unknown-focus' },
      nextBestActions: [],
    });

    expect(actions[0].title).toBe('Track your top 3 spending categories this week');
  });

  test('returns fresh fallback action objects each time', () => {
    const actions = selectOnboardingActions({ nextBestActions: [] });

    actions[0].title = 'Mutated action title';

    expect(selectOnboardingActions({ nextBestActions: [] })[0].title)
      .toBe('Track your top 3 spending categories this week');
  });
});

describe('calculateOnboardingConfidence', () => {
  test('returns high when focus, cashflow, and a pressure signal are present', () => {
    expect(calculateOnboardingConfidence({
      onboarding_focus: 'build_savings',
      monthly_income: '0',
      monthly_expenses: '0',
      total_debt: '0',
      savings_buffer: '',
    })).toBe('high');
  });

  test('returns medium for partial but useful starter context', () => {
    expect(calculateOnboardingConfidence({
      onboarding_focus: 'plan_month',
      monthly_income: '4500',
      monthly_expenses: '',
      total_debt: '',
      savings_buffer: '',
    })).toBe('medium');

    expect(calculateOnboardingConfidence({
      onboarding_focus: '',
      monthly_income: '4500',
      monthly_expenses: '3200',
      total_debt: '',
      savings_buffer: '',
    })).toBe('medium');
  });

  test('returns starter when context is sparse', () => {
    expect(calculateOnboardingConfidence({
      onboarding_focus: '',
      monthly_income: '',
      monthly_expenses: '',
      total_debt: '',
      savings_buffer: '',
    })).toBe('starter');
  });

  test('returns starter when inputs are null', () => {
    expect(calculateOnboardingConfidence(null)).toBe('starter');
  });

  test('returns starter when inputs are undefined', () => {
    expect(calculateOnboardingConfidence(undefined)).toBe('starter');
  });
});

describe('getOnboardingConfidenceSummary', () => {
  test('returns labels and explanations for known confidence tiers', () => {
    expect(getOnboardingConfidenceSummary({ onboarding_confidence: 'high' })).toEqual({
      confidence: 'high',
      label: 'High',
      explanation: 'Based on your cashflow, buffer, and focus area.',
    });

    expect(getOnboardingConfidenceSummary({ onboarding_confidence: 'medium' })).toEqual({
      confidence: 'medium',
      label: 'Medium',
      explanation: 'Based on your starting estimates and focus area.',
    });
  });

  test('normalizes unknown confidence to starter', () => {
    expect(getOnboardingConfidenceSummary({ onboarding_confidence: 'unexpected' })).toEqual({
      confidence: 'starter',
      label: 'Starter',
      explanation: 'Based on a starter profile. Add more details any time for sharper actions.',
    });
  });

  test('returns starter summary when settings are null', () => {
    expect(getOnboardingConfidenceSummary(null)).toEqual({
      confidence: 'starter',
      label: 'Starter',
      explanation: 'Based on a starter profile. Add more details any time for sharper actions.',
    });
  });

  test('returns starter summary when settings are undefined', () => {
    expect(getOnboardingConfidenceSummary(undefined)).toEqual({
      confidence: 'starter',
      label: 'Starter',
      explanation: 'Based on a starter profile. Add more details any time for sharper actions.',
    });
  });

  test('returns fresh summary objects each time', () => {
    const summary = getOnboardingConfidenceSummary({ onboarding_confidence: 'medium' });

    summary.label = 'Mutated label';

    expect(getOnboardingConfidenceSummary({ onboarding_confidence: 'medium' }).label)
      .toBe('Medium');
  });
});
