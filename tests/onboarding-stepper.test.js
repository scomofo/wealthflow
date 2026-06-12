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
