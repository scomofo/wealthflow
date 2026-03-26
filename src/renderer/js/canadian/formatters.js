import { FEDERAL_TAX_BRACKETS_2026, PROVINCIAL_TAX_BRACKETS_2026 } from './constants.js';

export function calculateFederalTax(income) {
  let tax = 0;
  for (const bracket of FEDERAL_TAX_BRACKETS_2026) {
    if (income <= bracket.min) break;
    const taxable = Math.min(income, bracket.max) - bracket.min;
    tax += taxable * bracket.rate;
  }
  return tax;
}

export function calculateProvincialTax(income, province) {
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

export function calculateTotalTax(income, province) {
  return calculateFederalTax(income) + calculateProvincialTax(income, province);
}

export function calculateDividendTaxCredit(eligibleDividends, nonEligibleDividends, province) {
  // Eligible dividends: 38% gross-up, 15.0198% federal credit
  const eligibleGrossUp = eligibleDividends * 0.38;
  const eligibleTaxableAmount = eligibleDividends + eligibleGrossUp;
  const eligibleFederalCredit = eligibleTaxableAmount * 0.150198;

  // Non-eligible dividends: 15% gross-up, 9.0301% federal credit
  const nonEligibleGrossUp = nonEligibleDividends * 0.15;
  const nonEligibleTaxableAmount = nonEligibleDividends + nonEligibleGrossUp;
  const nonEligibleFederalCredit = nonEligibleTaxableAmount * 0.090301;

  // Provincial dividend tax credit rates (approximate)
  const provincialRates = {
    AB: { eligible: 0.0812, nonEligible: 0.0218 },
    BC: { eligible: 0.12, nonEligible: 0.0196 },
    ON: { eligible: 0.10, nonEligible: 0.029863 },
    QC: { eligible: 0.117, nonEligible: 0.0342 },
    SK: { eligible: 0.11, nonEligible: 0.02105 },
    MB: { eligible: 0.08, nonEligible: 0.007835 },
    NS: { eligible: 0.0885, nonEligible: 0.0299 },
    NB: { eligible: 0.14, nonEligible: 0.0275 },
    PE: { eligible: 0.105, nonEligible: 0.027 },
    NL: { eligible: 0.063, nonEligible: 0.032 },
    YT: { eligible: 0.1202, nonEligible: 0.0067 },
    NT: { eligible: 0.115, nonEligible: 0.06 },
    NU: { eligible: 0.0551, nonEligible: 0.0261 },
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
    netTaxOnDividends: (eligibleTaxableAmount + nonEligibleTaxableAmount) - (eligibleFederalCredit + nonEligibleFederalCredit + eligibleProvCredit + nonEligibleProvCredit),
  };
}

export function calculatePensionSplitting(income1, income2, pensionIncome, province) {
  const maxSplit = pensionIncome * 0.5;

  // Calculate tax with no split
  const tax1NoSplit = calculateTotalTax(income1, province);
  const tax2NoSplit = calculateTotalTax(income2, province);
  const totalNoSplit = tax1NoSplit + tax2NoSplit;

  // Calculate tax with max split
  const tax1Split = calculateTotalTax(income1 - maxSplit, province);
  const tax2Split = calculateTotalTax(income2 + maxSplit, province);
  const totalSplit = tax1Split + tax2Split;

  return {
    maxSplitAmount: maxSplit,
    taxWithoutSplitting: totalNoSplit,
    taxWithSplitting: totalSplit,
    savings: totalNoSplit - totalSplit,
    optimalSplit: maxSplit, // simplified — full optimization would iterate
  };
}

export function getMarginalRate(income, province) {
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
