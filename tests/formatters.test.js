// Tests for Canadian tax formatters

const FEDERAL_TAX_BRACKETS_2026 = [
  { min: 0, max: 57375, rate: 0.15 },
  { min: 57375, max: 114750, rate: 0.205 },
  { min: 114750, max: 158468, rate: 0.26 },
  { min: 158468, max: 221708, rate: 0.29 },
  { min: 221708, max: Infinity, rate: 0.33 },
];

const PROVINCIAL_TAX_BRACKETS_2026 = {
  AB: [
    { min: 0, max: 148269, rate: 0.10 },
    { min: 148269, max: 177922, rate: 0.12 },
    { min: 177922, max: 237230, rate: 0.13 },
    { min: 237230, max: 355845, rate: 0.14 },
    { min: 355845, max: Infinity, rate: 0.15 },
  ],
  ON: [
    { min: 0, max: 52886, rate: 0.0505 },
    { min: 52886, max: 105775, rate: 0.0915 },
    { min: 105775, max: 150000, rate: 0.1116 },
    { min: 150000, max: 220000, rate: 0.1216 },
    { min: 220000, max: Infinity, rate: 0.1316 },
  ],
};

function calculateFederalTax(income) {
  let tax = 0;
  for (const bracket of FEDERAL_TAX_BRACKETS_2026) {
    if (income <= bracket.min) break;
    const taxable = Math.min(income, bracket.max) - bracket.min;
    tax += taxable * bracket.rate;
  }
  return tax;
}

function calculateProvincialTax(income, province) {
  const brackets = PROVINCIAL_TAX_BRACKETS_2026[province];
  if (!brackets) return 0;
  let tax = 0;
  for (const bracket of brackets) {
    if (income <= bracket.min) break;
    const taxable = Math.min(income, bracket.max) - bracket.min;
    tax += taxable * bracket.rate;
  }
  return tax;
}

function getMarginalRate(income, province) {
  let federalRate = 0;
  for (const bracket of FEDERAL_TAX_BRACKETS_2026) {
    if (income > bracket.min) federalRate = bracket.rate;
  }
  let provincialRate = 0;
  const brackets = PROVINCIAL_TAX_BRACKETS_2026[province];
  if (brackets) {
    for (const bracket of brackets) {
      if (income > bracket.min) provincialRate = bracket.rate;
    }
  }
  return { federal: federalRate, provincial: provincialRate, combined: federalRate + provincialRate };
}

function calculateDividendTaxCredit(eligibleDividends, nonEligibleDividends, province) {
  const eligibleGrossUp = eligibleDividends * 0.38;
  const eligibleTaxableAmount = eligibleDividends + eligibleGrossUp;
  const eligibleFederalCredit = eligibleTaxableAmount * 0.150198;

  const nonEligibleGrossUp = nonEligibleDividends * 0.15;
  const nonEligibleTaxableAmount = nonEligibleDividends + nonEligibleGrossUp;
  const nonEligibleFederalCredit = nonEligibleTaxableAmount * 0.090301;

  const provincialRates = {
    AB: { eligible: 0.0812, nonEligible: 0.0218 },
    ON: { eligible: 0.10, nonEligible: 0.029863 },
  };
  const provRates = provincialRates[province] || { eligible: 0.10, nonEligible: 0.025 };
  const eligibleProvCredit = eligibleTaxableAmount * provRates.eligible;
  const nonEligibleProvCredit = nonEligibleTaxableAmount * provRates.nonEligible;

  return {
    eligibleGrossUp,
    nonEligibleGrossUp,
    totalGrossUp: eligibleGrossUp + nonEligibleGrossUp,
    taxableAmount: eligibleTaxableAmount + nonEligibleTaxableAmount,
    federalCredit: eligibleFederalCredit + nonEligibleFederalCredit,
    provincialCredit: eligibleProvCredit + nonEligibleProvCredit,
    totalCredit: eligibleFederalCredit + nonEligibleFederalCredit + eligibleProvCredit + nonEligibleProvCredit,
  };
}

// ========== TESTS ==========

describe('Federal Tax Calculation', () => {
  test('zero income = zero tax', () => {
    expect(calculateFederalTax(0)).toBe(0);
  });

  test('income in first bracket only', () => {
    expect(calculateFederalTax(50000)).toBeCloseTo(50000 * 0.15, 2);
  });

  test('income spanning two brackets', () => {
    // First bracket: 57375 * 0.15 = 8606.25
    // Second bracket: (100000 - 57375) * 0.205 = 42625 * 0.205 = 8738.125
    const expected = 57375 * 0.15 + (100000 - 57375) * 0.205;
    expect(calculateFederalTax(100000)).toBeCloseTo(expected, 2);
  });

  test('high income hits all brackets', () => {
    const income = 300000;
    const expected =
      57375 * 0.15 +
      (114750 - 57375) * 0.205 +
      (158468 - 114750) * 0.26 +
      (221708 - 158468) * 0.29 +
      (300000 - 221708) * 0.33;
    expect(calculateFederalTax(income)).toBeCloseTo(expected, 2);
  });
});

describe('Provincial Tax Calculation', () => {
  test('Alberta flat 10% for first bracket', () => {
    expect(calculateProvincialTax(100000, 'AB')).toBeCloseTo(100000 * 0.10, 2);
  });

  test('Ontario two brackets', () => {
    const income = 80000;
    const expected = 52886 * 0.0505 + (80000 - 52886) * 0.0915;
    expect(calculateProvincialTax(income, 'ON')).toBeCloseTo(expected, 2);
  });

  test('unknown province returns 0', () => {
    expect(calculateProvincialTax(100000, 'XX')).toBe(0);
  });
});

describe('Marginal Rate', () => {
  test('low income marginal rates', () => {
    const rates = getMarginalRate(50000, 'AB');
    expect(rates.federal).toBe(0.15);
    expect(rates.provincial).toBe(0.10);
    expect(rates.combined).toBe(0.25);
  });

  test('high income marginal rates - Alberta', () => {
    const rates = getMarginalRate(400000, 'AB');
    expect(rates.federal).toBe(0.33);
    expect(rates.provincial).toBe(0.15);
    expect(rates.combined).toBe(0.48);
  });

  test('Ontario middle income', () => {
    const rates = getMarginalRate(120000, 'ON');
    expect(rates.federal).toBe(0.26);
    expect(rates.provincial).toBe(0.1116);
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
    // Taxable: 13800, federal credit: 13800 * 0.150198 = 2072.73
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
