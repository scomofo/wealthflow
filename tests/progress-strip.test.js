const { renderProgressStrip } = require('../src/renderer/js/components/progress-strip.js');

describe('renderProgressStrip', () => {
  test('renders nothing without progress', () => {
    expect(renderProgressStrip(null)).toBe('');
  });

  test('renders momentum message and helper text', () => {
    const html = renderProgressStrip({
      state: 'building',
      count: 3,
      message: "You're building momentum - 3 meaningful actions completed this week",
      helperText: 'Keep the next action small and specific.',
    });

    expect(html).toContain('progress-strip');
    expect(html).toContain('You&#39;re building momentum');
    expect(html).toContain('Keep the next action small and specific.');
    expect(html).toContain('3');
  });

  test('uses low state class for low progress', () => {
    const html = renderProgressStrip({
      state: 'low',
      count: 0,
      message: 'Take one small step to get back on track',
      helperText: 'Your highest-impact action is waiting below.',
    });

    expect(html).toContain('progress-strip-low');
    expect(html).toContain('Take one small step');
  });
});
