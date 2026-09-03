// Regression coverage for finding M11: USD-denominated investments were
// summed directly into portfolio/account totals with no currency
// conversion at all — a USD holding's raw dollar amount got treated as if
// it were already CAD, understating what it's actually worth. The
// Investments page even displayed a banner claiming "USD investments shown
// at current exchange rate" while never applying any rate whatsoever.
const { convertToCAD, investmentMarketValueCAD, investmentCostBasisCAD } = require('../src/renderer/js/utils/currency.js');

describe('convertToCAD', () => {
  test('converts a USD amount using the given rate', () => {
    expect(convertToCAD(100, 'USD', 1.38)).toBeCloseTo(138, 5);
  });

  test('leaves a CAD amount unchanged regardless of rate', () => {
    expect(convertToCAD(100, 'CAD', 1.38)).toBe(100);
  });

  test('defaults to a 1:1 rate when none is given', () => {
    expect(convertToCAD(100, 'USD')).toBe(100);
  });
});

describe('investmentMarketValueCAD / investmentCostBasisCAD', () => {
  test('a USD holding is converted to CAD using the given rate', () => {
    const inv = { shares: 10, current_price: 100, avg_cost: 80, currency: 'USD' };
    expect(investmentMarketValueCAD(inv, 1.38)).toBeCloseTo(1380, 5);
    expect(investmentCostBasisCAD(inv, 1.38)).toBeCloseTo(1104, 5);
  });

  test('a CAD holding is not affected by the USD/CAD rate', () => {
    const inv = { shares: 10, current_price: 100, avg_cost: 80, currency: 'CAD' };
    expect(investmentMarketValueCAD(inv, 1.38)).toBe(1000);
    expect(investmentCostBasisCAD(inv, 1.38)).toBe(800);
  });

  test('a mixed CAD+USD portfolio sums to the correctly converted CAD total', () => {
    const holdings = [
      { shares: 10, current_price: 100, currency: 'CAD' }, // $1,000 CAD
      { shares: 10, current_price: 100, currency: 'USD' }, // $1,000 USD = $1,380 CAD at 1.38
    ];
    const rate = 1.38;
    const total = holdings.reduce((s, i) => s + investmentMarketValueCAD(i, rate), 0);
    // Before the fix this was 2000 (both summed as if CAD); the correct
    // total credits the USD holding's real CAD value.
    expect(total).toBeCloseTo(2380, 5);
  });

  test('gain/loss percentage for a USD holding is unaffected by the conversion (both sides scale together)', () => {
    const inv = { shares: 10, current_price: 100, avg_cost: 80, currency: 'USD' };
    const rate = 1.38;
    const v = investmentMarketValueCAD(inv, rate);
    const c = investmentCostBasisCAD(inv, rate);
    const pct = (v - c) / c * 100;
    expect(pct).toBeCloseTo(25, 5); // (100-80)/80 = 25%, same in either currency
  });
});
