// Tests for the real Canadian financial calculators. These intentionally import
// production implementations instead of maintaining parallel formula copies.

const {
  calculateCurrentTFSARoom,
  calculateCurrentRRSPRoom,
  calculateCESGDetails,
  calculateCurrentFHSARoom,
  calculateGICMaturity,
  estimateCPPBenefit,
  estimateOASBenefit,
  optimizeRRSPvsTFSA,
} = require('../src/renderer/js/canadian/calculators.js');
const {
  TFSA_LIMITS,
  RRSP,
  FHSA,
  CPP,
  OAS,
} = require('../src/renderer/js/canadian/constants.js');

jest.useFakeTimers().setSystemTime(new Date('2026-09-07T12:00:00Z'));

describe('registered account room', () => {
  test('TFSA adds the next annual limit and subtracts later contributions', () => {
    const result = calculateCurrentTFSARoom(50000, '2025-12-31', [
      { account_type: 'tfsa', amount: 5000, date: '2026-02-01' },
      { account_type: 'rrsp', amount: 1000, date: '2026-03-01' },
    ]);

    expect(result.accumulatedLimits).toBe(TFSA_LIMITS[2026]);
    expect(result.contributedSince).toBe(5000);
    expect(result.currentRoom).toBe(50000 + TFSA_LIMITS[2026] - 5000);
  });

  test('RRSP room tracks contributions forward and flags material overcontribution', () => {
    const normal = calculateCurrentRRSPRoom(10000, '2026-01-01', [
      { account_type: 'rrsp', amount: 2500, date: '2026-03-01' },
    ]);
    expect(normal.currentRoom).toBe(7500);
    expect(normal.overcontributed).toBe(false);
    expect(normal.maxDeduction).toBe(RRSP.MAX_2026);

    const over = calculateCurrentRRSPRoom(1000, '2026-01-01', [
      { account_type: 'rrsp', amount: 4000, date: '2026-03-01' },
    ]);
    expect(over.currentRoom).toBe(-3000);
    expect(over.overcontributed).toBe(true);
    expect(over.overcontributionAmount).toBe(1000);
  });

  test('FHSA adds annual room without compounding carry-forward', () => {
    const result = calculateCurrentFHSARoom(8000, '2025-12-31', [
      { account_type: 'fhsa', amount: 6000, date: '2026-06-01' },
    ]);
    expect(result.accumulatedLimits).toBe(FHSA.ANNUAL_LIMIT);
    expect(result.currentRoom).toBe(10000);
    expect(result.lifetimeLimit).toBe(FHSA.LIFETIME_LIMIT);
  });
});

describe('RESP and GIC calculations', () => {
  test('CESG uses the real annual and lifetime limits', () => {
    const result = calculateCESGDetails({
      birth_year: 2016,
      total_contributions: 10000,
      total_cesg_received: 2000,
    });
    expect(result.age).toBe(10);
    expect(result.cesgThisYear).toBe(500);
    expect(result.contributionForMaxCesg).toBe(2500);
    expect(result.lifetimeContribRoom).toBe(40000);
    expect(result.isEligible).toBe(true);
  });

  test('GIC maturity uses the production compounding calculation', () => {
    const result = calculateGICMaturity({
      principal: 10000,
      rate: 5,
      term_months: 12,
      maturity_date: '2027-09-07',
      compounding: 'annual',
    });
    expect(result.interestEarned).toBeCloseTo(500, 2);
    expect(result.maturityValue).toBeCloseTo(10500, 2);
    expect(result.status).toBe('active');
  });
});

describe('CPP and OAS planning', () => {
  test('full-career CPP at 65 reaches the current maximum when earnings are at YMPE', () => {
    const result = estimateCPPBenefit(65, 65, CPP.MAX_PENSIONABLE_EARNINGS, {
      yearsContributing: 47,
    });
    expect(result.monthlyBenefit).toBeCloseTo(CPP.MAX_MONTHLY_BENEFIT_65, 2);
    expect(result.reductionOrIncrease).toBe('0%');
  });

  test('starting CPP at 60 applies the statutory early reduction', () => {
    const at65 = estimateCPPBenefit(65, 65, CPP.MAX_PENSIONABLE_EARNINGS, { yearsContributing: 47 });
    const at60 = estimateCPPBenefit(65, 60, CPP.MAX_PENSIONABLE_EARNINGS, { yearsContributing: 47 });
    expect(at60.monthlyBenefit).toBeCloseTo(at65.monthlyBenefit * 0.64, 2);
  });

  test('full OAS at 65 uses the current quarter amount', () => {
    const result = estimateOASBenefit(40, 50000, 65);
    expect(result.monthlyBenefit).toBeCloseTo(OAS.MAX_MONTHLY_BENEFIT, 2);
    expect(result.clawbackAmount).toBe(0);
    expect(result.eligible).toBe(true);
  });

  test('OAS is ineligible below the minimum Canadian residency period', () => {
    expect(estimateOASBenefit(9, 50000, 65).eligible).toBe(false);
  });
});

describe('Alberta-first RRSP vs TFSA planning', () => {
  test('higher current Alberta marginal rate can favor RRSP', () => {
    const result = optimizeRRSPvsTFSA(180000, 60000, 'AB', 20000, 20000);
    expect(result.recommendation).toBe('rrsp');
    expect(result.currentMarginalRate.combined).toBeGreaterThan(result.retirementMarginalRate.combined);
  });

  test('available-room guardrails override tax-rate preference', () => {
    expect(optimizeRRSPvsTFSA(180000, 60000, 'AB', 0, 10000).recommendation).toBe('tfsa');
    expect(optimizeRRSPvsTFSA(180000, 60000, 'AB', 10000, 0).recommendation).toBe('rrsp');
    expect(optimizeRRSPvsTFSA(180000, 60000, 'AB', 0, 0).recommendation).toBe('neither');
  });
});
