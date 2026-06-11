const CATEGORY_STEPS = {
  budget: [
    'Check your transactions page for this category right now',
    'Identify one purchase pattern you can reduce this week',
    'Re-check progress after your next transaction import',
  ],
  debt: [
    'Open your debts page and note the current balance',
    'Decide on an extra payment amount for this month',
    'Apply it to the highest-interest balance first',
  ],
  investing: [
    'Check your registered accounts for current room',
    'Decide on a contribution amount',
    'Log or make the contribution',
  ],
  bills: [
    'Open your bills page and verify the amount due',
    'Pay or schedule the payment today',
    'Mark complete once paid or scheduled',
  ],
  cashflow: [
    'Check your savings goals for your current balance',
    'Set up a recurring transfer to build your buffer',
    'Track progress monthly',
  ],
  planning: [
    'Open your profile or planning page',
    'Fill in the missing detail that affects this recommendation',
    'Return to your dashboard and refresh your actions',
  ],
};

const DEFAULT_STEPS = [
  'Open the relevant page and review the details',
  'Take the recommended step today',
  'Mark complete when done',
];

export function getFocusStepsForAction(action, profile = {}) {
  const cat = (action?.category || '').toLowerCase();
  const base = CATEGORY_STEPS[cat] || DEFAULT_STEPS;

  if (profile.focusModeAffinity || profile.primaryFocus === cat) {
    if (cat === 'budget') {
      return [
        'Open your transactions and focus on this category',
        'Choose one spending pattern to reduce before your next import',
        'Mark this complete after you make the change',
      ];
    }

    return [
      base[0],
      base[1],
      'Mark this complete when the step is handled',
    ];
  }

  return base;
}
