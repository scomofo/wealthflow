// Regression coverage for the modal.js XSS fix: getModalConfig() interpolated
// stored/imported text fields (transaction description, goal/debt/investment
// name, bill title, residence address/notes) directly into HTML attribute
// values and textarea content with no escaping. Since modal.js never
// imported the h() helper, any of those values containing a quote or angle
// bracket could break out of the attribute or inject markup.
const { getModalConfig } = require('../src/renderer/js/components/modal.js');

const PAYLOAD = '"><script>alert(1)</script>';
const ESCAPED = '&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;';

describe('modal.js getModalConfig escaping', () => {
  test('escapes transaction description', () => {
    const { html } = getModalConfig('tx', { description: PAYLOAD });
    expect(html).not.toContain(PAYLOAD);
    expect(html).toContain(ESCAPED);
  });

  test('escapes goal name', () => {
    const { html } = getModalConfig('goal', { name: PAYLOAD });
    expect(html).not.toContain(PAYLOAD);
    expect(html).toContain(ESCAPED);
  });

  test('escapes debt name', () => {
    const { html } = getModalConfig('debt', { name: PAYLOAD });
    expect(html).not.toContain(PAYLOAD);
    expect(html).toContain(ESCAPED);
  });

  test('escapes investment symbol and name', () => {
    const { html } = getModalConfig('inv', { symbol: PAYLOAD, name: PAYLOAD });
    expect(html).not.toContain(PAYLOAD);
  });

  test('escapes bill title', () => {
    const { html } = getModalConfig('bill', { title: PAYLOAD });
    expect(html).not.toContain(PAYLOAD);
    expect(html).toContain(ESCAPED);
  });

  test('escapes residence address and notes', () => {
    const { html } = getModalConfig('residence', { address: PAYLOAD, notes: PAYLOAD });
    expect(html).not.toContain(PAYLOAD);
  });

  test('escapes deposit-goal target name', () => {
    const { html } = getModalConfig('deposit-goal', { name: PAYLOAD });
    expect(html).not.toContain(PAYLOAD);
  });

  test('escapes wizard-asset description', () => {
    const { html } = getModalConfig('wizard-asset', { description: PAYLOAD });
    expect(html).not.toContain(PAYLOAD);
  });

  test('escapes wizard-doc original filename', () => {
    const { html } = getModalConfig('wizard-doc', { originalName: PAYLOAD });
    expect(html).not.toContain(PAYLOAD);
  });
});
