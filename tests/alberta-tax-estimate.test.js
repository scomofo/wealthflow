const { calculateTaxEstimate, calculateRRSPImpact, calculatePensionSplitComparison, normalizeTaxInputs } = require('../src/renderer/js/canadian/tax-estimate.js');

describe('2026 federal + Alberta personal-income-tax planning', () => {
  // Expected figures below are independent worked examples from the CRA
  // 2026 bracket/TD1/TD1AB tables, not a second bracket-calculation function.
  test('ordinary employment includes the Canada employment amount', () => {
    const result = calculateTaxEstimate({ employment: 100000 });
    expect(result.inputs.province).toBe('AB');
    expect(result.credits.federalAmounts.employment).toBe(1501);
    expect(result.federalTax).toBe(14182.59);
    expect(result.provincialTax).toBeCloseTo(6954.48, 6);
    expect(result.totalTax).toBe(21137.07);
  });

  test('CPP base/EI credits and enhanced CPP deduction stay distinct', () => {
    const result = calculateTaxEstimate({ employment: 100000, cppBaseContributions: 3519.45, eiPremiums: 1123.07, enhancedCppDeduction: 1127 });
    expect(result.netIncome).toBe(98873);
    expect(result.credits.federalAmounts.cpp).toBe(3519.45);
    expect(result.credits.provincialAmounts.ei).toBe(1123.07);
    expect(result.federalTax).toBe(13301.60);
    expect(result.provincialTax).toBe(6470.38);
    expect(result.totalTax).toBe(19771.98);
    expect(calculateTaxEstimate({ employment: 100000 }).inputs.cppBaseContributions).toBe(0);
  });

  test.each([
    [64, 47234, 0],
    [65, 47234, 6345],
    [65, 57234, 4845],
    [65, 89534, 0],
    [80, 100000, 0],
  ])('Alberta age amount at age %s / net income %s', (age, income, expected) => {
    expect(calculateTaxEstimate({ ageAtYearEnd: age, other: income }).credits.provincialAmounts.age).toBeCloseTo(expected, 6);
  });

  test('federal and Alberta age thresholds are independent', () => {
    const result = calculateTaxEstimate({ ageAtYearEnd: 65, other: 47234 });
    expect(result.credits.federalAmounts.age).toBeCloseTo(9087.7, 6);
    expect(result.credits.provincialAmounts.age).toBe(6345);
  });

  test('RRSP comparison recalculates income-tested age credits', () => {
    const inputs = { ageAtYearEnd: 65, pensionIncome: 60000, rrspDeduction: 10000 };
    const withRRSP = calculateTaxEstimate(inputs);
    expect(withRRSP.netIncome).toBe(50000);
    expect(withRRSP.credits.provincialAmounts.age).toBeCloseTo(5930.1, 6);
    const impact = calculateRRSPImpact(inputs);
    expect(impact.taxWithoutRRSP).toBe(7392.36);
    expect(impact.taxWithRRSP).toBe(4766.36);
    expect(impact.savings).toBe(2626.00);
    // $2,296 bracket saving + $210 federal/$120 AB restored age credit.
    expect(impact.benefitPercent).toBe(26.26);
  });

  test('eligible pension income is counted once and capped separately for each credit', () => {
    const result = calculateTaxEstimate({ employment: 10000, other: 20000, pensionIncome: 30000 });
    expect(result.grossIncome).toBe(60000);
    expect(result.credits.federalAmounts.pension).toBe(2000);
    expect(result.credits.provincialAmounts.pension).toBe(1753);
    const small = calculateTaxEstimate({ pensionIncome: 1000 });
    expect(small.credits.federalAmounts.pension).toBe(1000);
    expect(small.credits.provincialAmounts.pension).toBe(1000);
    const governmentPension = calculateTaxEstimate({ other: 30000, ageAtYearEnd: 65 });
    expect(governmentPension.credits.federalAmounts.pension).toBe(0);
    expect(governmentPension.credits.provincialAmounts.pension).toBe(0);
  });

  test('adult disability and spouse claims require explicit eligibility', () => {
    const noConsent = calculateTaxEstimate({ other: 100000, ageAtYearEnd: 45, spouseIncome: 0 });
    expect(noConsent.credits.federalAmounts.disability).toBe(0);
    expect(noConsent.credits.provincialAmounts.spouse).toBe(0);
    const child = calculateTaxEstimate({ other: 100000, ageAtYearEnd: 17, disabilityApproved: true });
    expect(child.credits.provincialAmounts.disability).toBe(0);
    const adult = calculateTaxEstimate({ other: 100000, ageAtYearEnd: 45, disabilityApproved: true });
    expect(adult.credits.federalAmounts.disability).toBe(10341);
    expect(adult.credits.provincialAmounts.disability).toBe(17563);
  });

  test.each([
    [0, 63101, 38.02],
    [1901, 61200, 0],
    [1900, 61201, 0.02],
    [5000, 58101, 0],
    [30000, 40332, 0],
  ])('spouse income %s drives Alberta supplemental eligibility, not taxpayer income', (spouseIncome, base, supplement) => {
    const result = calculateTaxEstimate({ employment: 100000, ageAtYearEnd: 45, disabilityApproved: true, spouseAmountEligible: true, spouseIncome });
    expect(result.credits.provincialCreditBase).toBe(base);
    expect(result.credits.supplementalCredit).toBeCloseTo(supplement, 6);
    if (spouseIncome === 0) expect(result.provincialTax).toBeCloseTo(3689.9, 6);
  });

  test('high-income federal spouse amount uses the phased BPA', () => {
    const result = calculateTaxEstimate({ other: 300000, spouseAmountEligible: true, spouseIncome: 1000 });
    expect(result.credits.federalAmounts.spouse).toBe(13829);
    expect(result.credits.provincialAmounts.spouse).toBe(21769);
  });

  test('dividend credits do not increase the Alberta supplemental base', () => {
    const inputs = { other: 100000, ageAtYearEnd: 45, disabilityApproved: true, spouseAmountEligible: true };
    const ordinary = calculateTaxEstimate(inputs);
    const withDividends = calculateTaxEstimate({ ...inputs, eligibleDividends: 90000 });
    expect(withDividends.credits.provincialCreditBase).toBe(ordinary.credits.provincialCreditBase);
    expect(withDividends.credits.supplementalCredit).toBeCloseTo(38.02, 6);
  });

  test('unused Alberta dividend credits cannot reduce federal tax', () => {
    const result = calculateTaxEstimate({ eligibleDividends: 90000 });
    expect(result.provincialTax).toBe(0);
    expect(result.federalTax).toBe(1092.66);
    expect(result.totalTax).toBe(1092.66);
    // The previous pooled-credit calculation returned only $382.0984.
    expect(result.totalTax).not.toBeCloseTo(382.0984, 2);
  });

  test('large non-refundable entitlements never produce negative tax or RRSP refunds', () => {
    const inputs = { employment: 5000, pensionIncome: 1000, ageAtYearEnd: 65, disabilityApproved: true, spouseAmountEligible: true, rrspDeduction: 10000 };
    const result = calculateTaxEstimate(inputs);
    expect(result.netIncome).toBe(0);
    expect(result.totalTax).toBe(0);
    expect(result.afterTax).toBe(6000);
    expect(calculateRRSPImpact(inputs).savings).toBe(0);
    expect(calculateRRSPImpact(inputs).taxWithoutRRSP).toBe(0);
  });

  test('rare modeled federal top-up uses the statutory 7.14% multiplier', () => {
    const result = calculateTaxEstimate({ employment: 60000, ageAtYearEnd: 65, disabilityApproved: true, spouseAmountEligible: true, cppBaseContributions: 3519.45, eiPremiums: 1123.07, pensionIncome: 2000 });
    // At $62,000 net income: $58,261.32 federal base, below the threshold.
    expect(result.credits.federalTopUp).toBe(0);
    const nearThreshold = calculateTaxEstimate({ ...result.inputs, employment: 58000 });
    expect(nearThreshold.credits.federalCreditBase).toBeCloseTo(58561.32, 6);
    expect(nearThreshold.credits.federalTopUp).toBeCloseTo(0.38304672, 8);
  });

  test('Alberta personal credits do not bleed into other provinces', () => {
    const plain = calculateTaxEstimate({ province: 'ON', other: 100000 });
    const claims = calculateTaxEstimate({ province: 'ON', other: 100000, ageAtYearEnd: 65, disabilityApproved: true, spouseAmountEligible: true, cppBaseContributions: 3000, enhancedCppDeduction: 1000 });
    expect(claims.totalTax).toBe(plain.totalTax);
    expect(claims.credits.supplementalCredit).toBe(0);
    expect(claims.enhancedCppDeduction).toBe(0);
  });

  test('rejects non-finite/negative inputs and limits employee claims', () => {
    expect(normalizeTaxInputs({ employment: -20, other: Infinity, pensionIncome: 'invalid', ageAtYearEnd: NaN, province: '<script>', disabilityApproved: 'on' })).toMatchObject({ employment: 0, other: 0, pensionIncome: 0, ageAtYearEnd: 0, province: 'AB', disabilityApproved: false });
    const values = normalizeTaxInputs({ cppBaseContributions: 4230.45, eiPremiums: 9999, enhancedCppDeduction: 9999 });
    expect(values.cppBaseContributions).toBe(3519.45);
    expect(values.eiPremiums).toBe(1123.07);
    expect(values.enhancedCppDeduction).toBe(1127);
  });
});

describe('pension-split comparison shares the credit model', () => {
  test('counts the pension once, recalculates spouse claim and compares the same baseline', () => {
    const inputs = { pensionIncome: 60000, other: 20000, spouseIncome: 10000, ageAtYearEnd: 65, spouseAgeAtYearEnd: 65, spouseAmountEligible: true };
    const result = calculatePensionSplitComparison(inputs);
    expect(result.maxSplitAmount).toBe(30000);
    expect(result.taxWithoutSplitting).toBeCloseTo(calculateTaxEstimate(inputs).totalTax, 6); // spouse $10k has no tax
    const sender = calculateTaxEstimate({ ...inputs, pensionIncome: 30000, spouseIncome: 40000 });
    const receiver = calculateTaxEstimate({ other: 40000, ageAtYearEnd: 65 });
    expect(sender.credits.provincialAmounts.spouse).toBe(0);
    expect(result.taxWithSplitting).toBeCloseTo(sender.totalTax + receiver.totalTax, 6);
  });

  test('recipient pension credit needs its own explicit confirmation', () => {
    const inputs = { pensionIncome: 80000, ageAtYearEnd: 65, spouseIncome: 40000, spouseAgeAtYearEnd: 64 };
    const noRecipientCredit = calculatePensionSplitComparison(inputs);
    const recipientCredit = calculatePensionSplitComparison({ ...inputs, splitPensionCreditEligible: true });
    // Federal $2,000 x 14% + Alberta $1,753 x 8% = $420.24.
    expect(noRecipientCredit.taxWithSplitting - recipientCredit.taxWithSplitting).toBeCloseTo(420.24, 6);
  });
});
