const { renderOnboardingStepper } = require('../src/renderer/js/components/onboarding-stepper.js');

describe('renderOnboardingStepper', () => {
  test('renders primary focus options on financial setup step', () => {
    const html = renderOnboardingStepper(1, {
      province: 'AB',
      onboarding_focus: 'reduce_debt',
    }, {});

    expect(html).toContain('What should WealthFlow help with first?');
    expect(html).toContain('name="ob-focus"');
    expect(html).toContain('value="reduce_debt" checked');
    expect(html).toContain('Reduce debt');
  });

  test('renders saved zero estimates when onboarding context exists', () => {
    const html = renderOnboardingStepper(1, {
      province: 'AB',
      onboarding_focus: 'plan_month',
      onboarding_confidence: 'medium',
      monthly_income: 0,
      monthly_expenses: 0,
      total_debt: 0,
      savings_buffer: 0,
    }, {});

    expect(html).toContain('id="ob-income" type="number" placeholder="e.g. 5000" value="0"');
    expect(html).toContain('id="ob-expenses" type="number" placeholder="e.g. 3000" value="0"');
    expect(html).toContain('id="ob-debt" type="number" placeholder="e.g. 15000" value="0"');
    expect(html).toContain('id="ob-savings" type="number" placeholder="e.g. 3000" value="0"');
  });

  test('keeps untouched default zero estimates visually blank', () => {
    const html = renderOnboardingStepper(1, {
      province: 'AB',
      onboarding_focus: null,
      onboarding_confidence: 'starter',
      monthly_income: 0,
      monthly_expenses: 0,
      total_debt: 0,
      savings_buffer: 0,
    }, {});

    expect(html).toContain('id="ob-income" type="number" placeholder="e.g. 5000" value=""');
    expect(html).toContain('id="ob-expenses" type="number" placeholder="e.g. 3000" value=""');
    expect(html).toContain('id="ob-debt" type="number" placeholder="e.g. 15000" value=""');
    expect(html).toContain('id="ob-savings" type="number" placeholder="e.g. 3000" value=""');
  });

  test('keeps starter profile zero estimates visually blank when focus is selected', () => {
    const html = renderOnboardingStepper(1, {
      province: 'AB',
      onboarding_focus: 'plan_month',
      onboarding_confidence: 'starter',
      monthly_income: 0,
      monthly_expenses: 0,
      total_debt: 0,
      savings_buffer: 0,
    }, {});

    expect(html).toContain('id="ob-income" type="number" placeholder="e.g. 5000" value=""');
    expect(html).toContain('id="ob-expenses" type="number" placeholder="e.g. 3000" value=""');
    expect(html).toContain('id="ob-debt" type="number" placeholder="e.g. 15000" value=""');
    expect(html).toContain('id="ob-savings" type="number" placeholder="e.g. 3000" value=""');
  });

  test('renders confidence summary on instant value step', () => {
    const html = renderOnboardingStepper(4, {}, {
      settings: {
        onboarding_confidence: 'medium',
        onboarding_focus: 'plan_month',
      },
      nextBestActions: [],
    });

    expect(html).toContain('Medium profile');
    expect(html).toContain('Based on your starting estimates and focus area.');
    expect(html).toContain('Review this month&#39;s income, bills, and planned spending');
  });
});
