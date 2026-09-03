// Integration coverage for finding M11: renderInvestments() must actually
// use the converted CAD value in the rendered portfolio total and per-row
// "Value" cell, not just have a correct helper function sitting unused.
const { renderInvestments } = require('../src/renderer/js/pages/investments.js');

describe('renderInvestments currency conversion', () => {
  test('portfolio total reflects the converted CAD value of a USD holding, not its raw USD amount', () => {
    const state = {
      investments: [
        { id: 'i1', symbol: 'VOO', shares: 10, current_price: 100, avg_cost: 100, currency: 'USD', account_type: 'non-registered' },
      ],
      usdCadRate: 1.38,
    };

    const html = renderInvestments(state);

    // 10 shares * $100 USD * 1.38 = $1,380 CAD
    expect(html).toContain('$1,380.00');
    // The raw, unconverted USD total must not appear as the CAD portfolio value.
    expect(html).not.toContain('$1,000.00');
  });

  test('a CAD holding is unaffected by the exchange rate', () => {
    const state = {
      investments: [
        { id: 'i1', symbol: 'XEQT', shares: 10, current_price: 50, avg_cost: 50, currency: 'CAD', account_type: 'non-registered' },
      ],
      usdCadRate: 1.38,
    };

    const html = renderInvestments(state);

    expect(html).toContain('$500.00');
  });

  test('the USD conversion banner reports an actual fetched rate, not a false claim', () => {
    const stateWithoutRate = {
      investments: [{ id: 'i1', symbol: 'VOO', shares: 1, current_price: 100, avg_cost: 100, currency: 'USD' }],
      usdCadRate: 1, // default, never actually fetched
    };
    const stateWithRate = {
      investments: [{ id: 'i1', symbol: 'VOO', shares: 1, current_price: 100, avg_cost: 100, currency: 'USD' }],
      usdCadRate: 1.38,
    };

    expect(renderInvestments(stateWithoutRate)).not.toContain('converted to CAD at');
    expect(renderInvestments(stateWithRate)).toContain('converted to CAD at 1 USD = 1.3800 CAD');
  });
});
