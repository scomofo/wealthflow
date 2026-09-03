// Tests for Canadian tax formatters.
//
// These import the real calculateFederalTax/calculateProvincialTax/
// getMarginalRate/calculateDividendTaxCredit from formatters.js and the
// real bracket/BPA data from constants.js, rather than a hardcoded local
// copy — a prior version of this file reimplemented both the bracket data
// and the calculation functions locally, so it validated a fictional
// parallel implementation and would have kept passing no matter what the
// real formatters.js did.
const {
  FEDERAL_TAX_BRACKETS_2026,
  PROVINCIAL_TAX_BRACKETS_2026,
  BASIC_PERSONAL_AMOUNT,
} = require('../src/renderer/js/canadian/constants.js');

const {
  calculateFederalTax,
  calculateProvincialTax,
  getMarginalRate,
  calculateDividendTaxCredit,
} = require('../src/renderer/js/canadian/formatters.js');

// Mirrors the bracket-walking loop inside calculateFederalTax/
// calculateProvincialTax, but operates on the real, live bracket arrays —
// so unlike a hardcoded copy, this cannot silently drift from what's
// actually published in constants.js. Used to derive the pre-BPA-credit
// "gross" tax so each test can assert the BPA credit was correctly applied
// on top of it.
function grossBracketTax(income, brackets) {
  let tax = 0;
  for (const bracket of brackets) {
    if (income <= bracket.min) break;
    tax += (Math.min(income, bracket.max) - bracket.min) * bracket.rate;
  }
  return tax;
}

const FEDERAL_BPA_CREDIT = BASIC_PERSONAL_AMOUNT.FEDERAL * FEDERAL_TAX_BRACKETS_2026[0].rate;

describe('Federal Tax Calculation', () => {
  test('zero income = zero tax', () => {
    expect(calculateFederalTax(0)).toBe(0);
  });

  test('low income is fully absorbed by the basic personal amount credit', () => {
    // Any income low enough that bracket tax doesn't exceed the BPA credit
    // must floor at 0, never go negative.
    const income = 1000;
    expect(grossBracketTax(income, FEDERAL_TAX_BRACKETS_2026)).toBeLessThan(FEDERAL_BPA_CREDIT);
    expect(calculateFederalTax(income)).toBe(0);
  });

  test('income within the first bracket, net of the BPA credit', () => {
    const income = 50000;
    const gross = grossBracketTax(income, FEDERAL_TAX_BRACKETS_2026);
    expect(calculateFederalTax(income)).toBeCloseTo(Math.max(0, gross - FEDERAL_BPA_CREDIT), 2);
  });

  test('income spanning multiple brackets, net of the BPA credit', () => {
    const income = 200000;
    const gross = grossBracketTax(income, FEDERAL_TAX_BRACKETS_2026);
    expect(calculateFederalTax(income)).toBeCloseTo(gross - FEDERAL_BPA_CREDIT, 2);
  });

  test('high income hits all brackets, net of the BPA credit', () => {
    const income = 300000;
    const gross = grossBracketTax(income, FEDERAL_TAX_BRACKETS_2026);
    expect(calculateFederalTax(income)).toBeCloseTo(gross - FEDERAL_BPA_CREDIT, 2);
  });
});

describe('Provincial Tax Calculation', () => {
  test.each(['AB', 'ON', 'BC', 'SK', 'MB', 'NS'])('%s: matches gross bracket tax minus the provincial BPA credit', (province) => {
    const income = 90000;
    const brackets = PROVINCIAL_TAX_BRACKETS_2026[province];
    const gross = grossBracketTax(income, brackets);
    const bpaCredit = BASIC_PERSONAL_AMOUNT[province] * brackets[0].rate;
    expect(calculateProvincialTax(income, province)).toBeCloseTo(Math.max(0, gross - bpaCredit), 2);
  });

  test('Alberta: low income within the new 8% bracket only', () => {
    const income = 40000;
    const brackets = PROVINCIAL_TAX_BRACKETS_2026.AB;
    expect(brackets[0].rate).toBe(0.08); // the 8% bracket added for 2025/2026
    const gross = income * brackets[0].rate;
    const bpaCredit = BASIC_PERSONAL_AMOUNT.AB * brackets[0].rate;
    expect(calculateProvincialTax(income, 'AB')).toBeCloseTo(Math.max(0, gross - bpaCredit), 2);
  });

  test('unknown province returns 0', () => {
    expect(calculateProvincialTax(100000, 'XX')).toBe(0);
  });
});

describe('Marginal Rate', () => {
  test('low income marginal rates', () => {
    const rates = getMarginalRate(50000, 'AB');
    expect(rates.federal).toBe(FEDERAL_TAX_BRACKETS_2026[0].rate);
    expect(rates.provincial).toBe(PROVINCIAL_TAX_BRACKETS_2026.AB[0].rate);
    expect(rates.combined).toBeCloseTo(rates.federal + rates.provincial, 10);
  });

  test('high income marginal rates - Alberta', () => {
    const rates = getMarginalRate(400000, 'AB');
    const topFederal = FEDERAL_TAX_BRACKETS_2026[FEDERAL_TAX_BRACKETS_2026.length - 1];
    const topAB = PROVINCIAL_TAX_BRACKETS_2026.AB[PROVINCIAL_TAX_BRACKETS_2026.AB.length - 1];
    expect(rates.federal).toBe(topFederal.rate);
    expect(rates.provincial).toBe(topAB.rate);
  });

  test('unknown province has zero provincial marginal rate', () => {
    const rates = getMarginalRate(120000, 'XX');
    expect(rates.provincial).toBe(0);
  });
});

describe('Dividend Tax Credit', () => {
  test('eligible dividends gross-up 38%', () => {
    const result = calculateDividendTaxCredit(10000, 0, 'AB');
    expect(result.eligibleGrossUp).toBeCloseTo(3800, 2);
    expect(result.taxableAmount).toBeCloseTo(13800, 2);
  });

  test('non-eligible dividends gross-up 15%', () => {
    const result = calculateDividendTaxCredit(0, 10000, 'AB');
    expect(result.nonEligibleGrossUp).toBeCloseTo(1500, 2);
    expect(result.taxableAmount).toBeCloseTo(11500, 2);
  });

  test('federal credit calculated correctly for eligible', () => {
    const result = calculateDividendTaxCredit(10000, 0, 'AB');
    // Taxable: 13800, federal credit: 13800 * 0.150198
    expect(result.federalCredit).toBeCloseTo(13800 * 0.150198, 2);
  });

  test('total credit includes both federal and provincial', () => {
    const result = calculateDividendTaxCredit(10000, 5000, 'ON');
    expect(result.totalCredit).toBeGreaterThan(0);
    expect(result.totalCredit).toBe(result.federalCredit + result.provincialCredit);
  });

  test('zero dividends = zero credits', () => {
    const result = calculateDividendTaxCredit(0, 0, 'AB');
    expect(result.totalCredit).toBe(0);
    expect(result.totalGrossUp).toBe(0);
  });
});
