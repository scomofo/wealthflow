// Regression coverage for the toast.js XSS fix: renderToasts() interpolated
// the toast message and action label directly into HTML with no escaping.
// Many toast messages embed values from user input, imports, or AI
// responses (e.g. "Deposited $50 to <goal name>"), so an unescaped goal/debt
// name could inject markup into every toast shown while it's visible.
const { showToast, showActionToast, renderToasts } = require('../src/renderer/js/components/toast.js');

const PAYLOAD = '<img src=x onerror=alert(1)>';
const ESCAPED = '&lt;img src=x onerror=alert(1)&gt;';

describe('toast.js renderToasts escaping', () => {
  beforeAll(() => jest.useFakeTimers());
  afterAll(() => jest.useRealTimers());


  test('escapes a malicious toast message', () => {
    showToast(`Deposited $50 to ${PAYLOAD}`);
    const html = renderToasts();
    expect(html).not.toContain(PAYLOAD);
    expect(html).toContain(ESCAPED);
  });

  test('escapes a malicious action label', () => {
    showActionToast('Apply category to all transactions?', PAYLOAD, () => {});
    const html = renderToasts();
    expect(html).not.toContain(PAYLOAD);
    expect(html).toContain(ESCAPED);
  });
});
