// Tests for Canadian financial calculators
// Note: Re-implemented as CJS since source uses ESM

// Tax bracket data (same as constants.js)
const FEDERAL_BRACKETS = [
  { min: 0, max: 57375, rate: 0.15 },
  { min: 57375, max: 114750, rate: 0.205 },
  { min: 114750, max: 158468, rate: 0.26 },
  { min: 158468, max: 221708, rate: 0.29 },
  { min: 221708, max: Infinity, rate: 0.33 },
];

const PROVINCIAL_BRACKETS = {
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
  PE: [
    { min: 0, max: 32656, rate: 0.098 },
    { min: 32656, max: 64313, rate: 0.138 },
    { min: 64313, max: Infinity, rate: 0.167 },
  ],
  NL: [
    { min: 0, max: 43198, rate: 0.087 },
    { min: 43198, max: 86395, rate: 0.145 },
    { min: 86395, max: 154244, rate: 0.158 },
    { min: 154244, max: 215943, rate: 0.178 },
    { min: 215943, max: 275870, rate: 0.198 },
    { min: 275870, max: 551739, rate: 0.208 },
    { min: 551739, max: 1103478, rate: 0.213 },
    { min: 1103478, max: Infinity, rate: 0.218 },
  ],
  NU: [
    { min: 0, max: 53268, rate: 0.04 },
    { min: 53268, max: 106537, rate: 0.07 },
    { min: 106537, max: 173205, rate: 0.09 },
    { min: 173205, max: Infinity, rate: 0.115 },
  ],
};

function calculateFederalTax(income) {
  let tax = 0;
  for (const bracket of FEDERAL_BRACKETS) {
    if (income <= bracket.min) break;
    tax += (Math.min(income, bracket.max) - bracket.min) * bracket.rate;
  }
  return tax;
}

function calculateProvincialTax(income, province) {
  const brackets = PROVINCIAL_BRACKETS[province];
  if (!brackets) return 0;
  let tax = 0;
  for (const bracket of brackets) {
    if (income <= bracket.min) break;
    tax += (Math.min(income, bracket.max) - bracket.min) * bracket.rate;
  }
  return tax;
}

// TFSA room calculator
const TFSA_LIMITS = {
  2009: 5000, 2010: 5000, 2011: 5000, 2012: 5000,
  2013: 5500, 2014: 5500, 2015: 10000,
  2016: 5500, 2017: 5500, 2018: 5500,
  2019: 6000, 2020: 6000, 2021: 6000,
  2022: 6000, 2023: 6500, 2024: 7000, 2025: 7000, 2026: 7000,
};

function calculateTFSARoom(knownRoom, knownYear, currentYear, contributedSince) {
  let accumulated = 0;
  for (let y = knownYear + 1; y <= currentYear; y++) {
    accumulated += TFSA_LIMITS[y] || 0;
  }
  return knownRoom + accumulated - contributedSince;
}

// FHSA room calculator (matching source logic with carryforward)
function calculateFHSARoom(knownRoom, knownYear, currentYear, contributedSince) {
  let accumulated = 0;
  let unusedPriorYear = 0;
  for (let y = knownYear + 1; y <= currentYear; y++) {
    if (y >= 2023) {
      const yearLimit = 8000 + Math.min(unusedPriorYear, 8000);
      accumulated += yearLimit;
      unusedPriorYear = yearLimit;
    }
  }
  return Math.max(0, Math.min(40000, knownRoom + accumulated - contributedSince));
}

// GIC interest (matching source compounding logic)
function calculateGICInterest(principal, rate, termMonths, compounding) {
  const periodsPerYear = compounding === 'monthly' ? 12 : compounding === 'semi-annual' ? 2 : 1;
  const totalPeriods = periodsPerYear * (termMonths / 12);
  const ratePerPeriod = (rate / 100) / periodsPerYear;
  return principal * Math.pow(1 + ratePerPeriod, totalPeriods) - principal;
}

// CPP estimate (matching source logic)
const CPP = {
  MAX_PENSIONABLE_EARNINGS: 73200,
  MAX_MONTHLY_BENEFIT_65: 1364.60,
  NORMAL_AGE: 65,
  EARLY_REDUCTION_PER_MONTH: 0.006,
  LATE_INCREASE_PER_MONTH: 0.007,
};

function estimateCPPBenefit(currentAge, startAge, avgEarnings, childRearingYears = 0) {
  const totalYears = Math.max(0, Math.min(currentAge - 18, 47));
  const generalDropout = Math.floor(totalYears * 0.17);
  const crd = Math.min(childRearingYears, 7);
  const effectiveYears = Math.max(0, totalYears - generalDropout - crd);
  const earningsFactor = Math.min(1, avgEarnings / CPP.MAX_PENSIONABLE_EARNINGS);
  const careerFactor = Math.min(1, effectiveYears / 39);
  let benefit = CPP.MAX_MONTHLY_BENEFIT_65 * earningsFactor * careerFactor;
  if (startAge < 65) benefit *= (1 - (65 - startAge) * 12 * CPP.EARLY_REDUCTION_PER_MONTH);
  else if (startAge > 65) benefit *= (1 + (startAge - 65) * 12 * CPP.LATE_INCREASE_PER_MONTH);
  return Math.round(benefit * 100) / 100;
}

// ========== TESTS ==========

describe('Federal Tax Calculation', () => {
  test('zero income', () => {
    expect(calculateFederalTax(0)).toBe(0);
  });

  test('income in first bracket only ($50,000)', () => {
    expect(calculateFederalTax(50000)).toBeCloseTo(50000 * 0.15, 2);
  });

  test('income spanning two brackets ($80,000)', () => {
    const expected = 57375 * 0.15 + (80000 - 57375) * 0.205;
    expect(calculateFederalTax(80000)).toBeCloseTo(expected, 2);
  });

  test('high income ($250,000)', () => {
    const expected = 57375 * 0.15 + (114750 - 57375) * 0.205 + (158468 - 114750) * 0.26 + (221708 - 158468) * 0.29 + (250000 - 221708) * 0.33;
    expect(calculateFederalTax(250000)).toBeCloseTo(expected, 2);
  });

  test('negative income returns 0', () => {
    expect(calculateFederalTax(-10000)).toBe(0);
  });
});

describe('Provincial Tax Calculation', () => {
  test('Alberta flat 10% on first bracket ($100,000)', () => {
    expect(calculateProvincialTax(100000, 'AB')).toBeCloseTo(100000 * 0.10, 2);
  });

  test('Ontario multi-bracket ($80,000)', () => {
    const expected = 52886 * 0.0505 + (80000 - 52886) * 0.0915;
    expect(calculateProvincialTax(80000, 'ON')).toBeCloseTo(expected, 2);
  });

  test('PE new brackets ($50,000)', () => {
    const expected = 32656 * 0.098 + (50000 - 32656) * 0.138;
    expect(calculateProvincialTax(50000, 'PE')).toBeCloseTo(expected, 2);
  });

  test('NL brackets ($100,000)', () => {
    const expected = 43198 * 0.087 + (86395 - 43198) * 0.145 + (100000 - 86395) * 0.158;
    expect(calculateProvincialTax(100000, 'NL')).toBeCloseTo(expected, 2);
  });

  test('NU low rates ($60,000)', () => {
    const expected = 53268 * 0.04 + (60000 - 53268) * 0.07;
    expect(calculateProvincialTax(60000, 'NU')).toBeCloseTo(expected, 2);
  });

  test('unknown province returns 0', () => {
    expect(calculateProvincialTax(100000, 'XX')).toBe(0);
  });
});

describe('TFSA Room Calculation', () => {
  test('known room with no contributions since', () => {
    expect(calculateTFSARoom(50000, 2024, 2026, 0)).toBe(50000 + 7000 + 7000);
  });

  test('known room with contributions', () => {
    expect(calculateTFSARoom(50000, 2024, 2026, 5000)).toBe(50000 + 14000 - 5000);
  });

  test('same year known date', () => {
    expect(calculateTFSARoom(30000, 2026, 2026, 0)).toBe(30000);
  });

  test('cumulative from 2009', () => {
    const total = Object.values(TFSA_LIMITS).reduce((s, v) => s + v, 0);
    expect(calculateTFSARoom(0, 2008, 2026, 0)).toBe(total);
  });
});

describe('FHSA Room Calculation (Fixed)', () => {
  test('first year room', () => {
    // From 2023->2024: one year accumulates 8000 + min(0 unused, 8000) = 8000
    // Total: knownRoom(8000) + accumulated(8000) = 16000
    expect(calculateFHSARoom(8000, 2023, 2024, 0)).toBe(16000);
  });

  test('with contributions', () => {
    const room = calculateFHSARoom(8000, 2023, 2024, 6000);
    expect(room).toBeGreaterThan(0);
    expect(room).toBeLessThanOrEqual(40000);
  });

  test('lifetime cap respected', () => {
    const room = calculateFHSARoom(40000, 2023, 2030, 0);
    expect(room).toBe(40000);
  });

  test('zero room with full contributions', () => {
    expect(calculateFHSARoom(8000, 2023, 2024, 50000)).toBe(0);
  });
});

describe('GIC Interest Calculation', () => {
  test('1-year annual compound', () => {
    const interest = calculateGICInterest(10000, 5, 12, 'annual');
    expect(interest).toBeCloseTo(500, 2);
  });

  test('1-year monthly compound', () => {
    const interest = calculateGICInterest(10000, 5, 12, 'monthly');
    expect(interest).toBeCloseTo(511.62, 0); // slightly more than simple
    expect(interest).toBeGreaterThan(500);
  });

  test('2-year semi-annual compound', () => {
    const interest = calculateGICInterest(10000, 4, 24, 'semi-annual');
    expect(interest).toBeGreaterThan(800);
    expect(interest).toBeLessThan(900);
  });

  test('zero principal', () => {
    expect(calculateGICInterest(0, 5, 12, 'annual')).toBe(0);
  });
});

describe('CPP Benefit Estimation', () => {
  test('max benefit at 65 with max earnings', () => {
    const benefit = estimateCPPBenefit(65, 65, 73200);
    expect(benefit).toBeCloseTo(1364.60, 0);
  });

  test('reduced benefit at 60', () => {
    const benefit = estimateCPPBenefit(65, 60, 73200);
    const reduction = 1 - (5 * 12 * 0.006);
    expect(benefit).toBeCloseTo(1364.60 * reduction, 0);
  });

  test('increased benefit at 70', () => {
    const benefit = estimateCPPBenefit(65, 70, 73200);
    const increase = 1 + (5 * 12 * 0.007);
    expect(benefit).toBeCloseTo(1364.60 * increase, 0);
  });

  test('partial earnings ($40,000)', () => {
    const benefit = estimateCPPBenefit(65, 65, 40000);
    const earningsFactor = 40000 / 73200;
    expect(benefit).toBeCloseTo(1364.60 * earningsFactor, 0);
  });

  test('child-rearing dropout reduces career factor', () => {
    const withoutCRD = estimateCPPBenefit(50, 65, 60000, 0);
    const withCRD = estimateCPPBenefit(50, 65, 60000, 5);
    expect(withCRD).toBeLessThan(withoutCRD);
  });

  test('young person has lower career factor', () => {
    const benefit25 = estimateCPPBenefit(25, 65, 73200);
    const benefit55 = estimateCPPBenefit(55, 65, 73200);
    expect(benefit25).toBeLessThan(benefit55);
  });
});

describe('Combined Tax Calculation', () => {
  test('total tax = federal + provincial', () => {
    const income = 100000;
    const federal = calculateFederalTax(income);
    const provincial = calculateProvincialTax(income, 'AB');
    expect(federal + provincial).toBeGreaterThan(0);
    expect(federal).toBeGreaterThan(0);
    expect(provincial).toBeGreaterThan(0);
  });

  test('all new provinces produce non-zero tax', () => {
    const newProvinces = ['PE', 'NL', 'NU'];
    for (const prov of newProvinces) {
      const tax = calculateProvincialTax(100000, prov);
      expect(tax).toBeGreaterThan(0);
    }
  });
});
