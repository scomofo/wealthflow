// generateMonthlyReportHTML interpolates imported/AI-controlled transaction
// and category text directly into the HTML string printed to PDF in a
// BrowserWindow. Values must be escaped so a malicious description can't
// inject markup/script, and the document should carry its own CSP as a
// second layer of defense.
const { generateMonthlyReportHTML } = require('../src/renderer/js/utils/pdf-report.js');

function baseState(overrides = {}) {
  return {
    transactions: [],
    budgets: [],
    ...overrides,
  };
}

const baseFinancials = { netWorth: 1000 };

describe('generateMonthlyReportHTML escaping', () => {
  test('escapes a malicious transaction description and category', () => {
    const monthStr = new Date().toISOString().slice(0, 7);
    const state = baseState({
      transactions: [
        {
          id: 't1',
          date: `${monthStr}-05`,
          description: '<img src=x onerror=alert(1)>',
          category: '<script>alert(2)</script>',
          amount: -50,
        },
      ],
    });

    const html = generateMonthlyReportHTML(state, baseFinancials, monthStr);

    expect(html).not.toContain('<img src=x onerror=alert(1)>');
    expect(html).not.toContain('<script>alert(2)</script>');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).toContain('&lt;script&gt;alert(2)&lt;/script&gt;');
  });

  test('escapes a malicious budget category and color', () => {
    const monthStr = new Date().toISOString().slice(0, 7);
    const state = baseState({
      budgets: [
        { id: 'b1', category: '"><script>alert(3)</script>', amount: 100, color: '"><script>alert(4)</script>' },
      ],
    });

    const html = generateMonthlyReportHTML(state, baseFinancials, monthStr);

    expect(html).not.toContain('<script>alert(3)</script>');
    expect(html).not.toContain('<script>alert(4)</script>');
  });

  test('escapes a malicious spending category name', () => {
    const monthStr = new Date().toISOString().slice(0, 7);
    const state = baseState({
      transactions: [
        { id: 't1', date: `${monthStr}-05`, description: 'Groceries', category: '<b>Injected</b>', amount: -20 },
      ],
    });

    const html = generateMonthlyReportHTML(state, baseFinancials, monthStr);

    expect(html).not.toContain('<b>Injected</b>');
    expect(html).toContain('&lt;b&gt;Injected&lt;/b&gt;');
  });

  test('includes a restrictive Content-Security-Policy meta tag', () => {
    const html = generateMonthlyReportHTML(baseState(), baseFinancials);

    expect(html).toMatch(/<meta http-equiv="Content-Security-Policy" content="default-src 'none';/);
  });
});
