import { FEDERAL_CREDITS_2026, ALBERTA_CREDITS_2026, EMPLOYEE_TAX_AMOUNTS_2026, PROVINCES } from './constants.js';
import { calculateFederalTax, calculateProvincialTax, calculateDividendTaxCredit, getFederalBasicPersonalAmount, getProvincialBasicPersonalAmount, getMarginalRate } from './formatters.js';

const moneyFields = [
  'employment', 'other', 'pensionIncome', 'rrspDeduction', 'eligibleDividends',
  'nonEligibleDividends', 'spouseIncome', 'cppBaseContributions', 'eiPremiums',
  'enhancedCppDeduction',
];
const booleanFields = ['disabilityApproved', 'spouseAmountEligible', 'pensionSplitting', 'splitPensionCreditEligible'];

function nonNegative(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
}

export function normalizeTaxInputs(inputs = {}) {
  const normalized = {};
  for (const field of moneyFields) normalized[field] = nonNegative(inputs[field]);
  for (const field of booleanFields) normalized[field] = inputs[field] === true || inputs[field] === 'true';
  normalized.ageAtYearEnd = Math.min(120, Math.floor(nonNegative(inputs.ageAtYearEnd)));
  normalized.spouseAgeAtYearEnd = Math.min(120, Math.floor(nonNegative(inputs.spouseAgeAtYearEnd)));
  normalized.province = PROVINCES.some(p => p.code === inputs.province) ? inputs.province : 'AB';
  normalized.cppBaseContributions = Math.min(normalized.cppBaseContributions, EMPLOYEE_TAX_AMOUNTS_2026.cppBaseMax);
  normalized.eiPremiums = Math.min(normalized.eiPremiums, EMPLOYEE_TAX_AMOUNTS_2026.eiMax);
  normalized.enhancedCppDeduction = Math.min(normalized.enhancedCppDeduction, EMPLOYEE_TAX_AMOUNTS_2026.enhancedCppDeductionMax);
  return normalized;
}

function ageAmount(netIncome, age, rule) {
  return age >= 65 ? Math.max(0, rule.max - Math.max(0, netIncome - rule.phaseoutStart) * rule.phaseoutRate) : 0;
}

function totalAmounts(amounts) {
  return Object.values(amounts).reduce((sum, amount) => sum + amount, 0);
}

function cents(amount) {
  return Math.round((amount + Number.EPSILON * Math.max(1, Math.abs(amount))) * 100) / 100;
}

/**
 * Alberta-first 2026 personal-income-tax estimate. Pension income is a
 * separate income source and is counted once. "Other" excludes this pension
 * and dividends; CPP/OAS belong in Other and do not earn a pension credit.
 * For the deductions modeled here, net income equals taxable income.
 * Eligibility is explicitly supplied; this is not an eligibility classifier.
 */
export function calculateTaxEstimate(inputs = {}) {
  const values = normalizeTaxInputs(inputs);
  const province = values.province;
  const alberta = province === 'AB';
  const dividendCredit = calculateDividendTaxCredit(values.eligibleDividends, values.nonEligibleDividends, province);
  const grossIncome = values.employment + values.other + values.pensionIncome;
  const cashIncome = grossIncome + values.eligibleDividends + values.nonEligibleDividends;
  // Optional employee deduction is currently verified/supported for AB only.
  const enhancedCppDeduction = alberta ? values.enhancedCppDeduction : 0;
  const taxableIncome = Math.max(0, grossIncome + dividendCredit.taxableAmount - values.rrspDeduction - enhancedCppDeduction);
  const netIncome = taxableIncome;
  const adultDisability = values.disabilityApproved && values.ageAtYearEnd >= 18;

  const federalAmounts = {
    basic: getFederalBasicPersonalAmount(netIncome),
    age: alberta ? ageAmount(netIncome, values.ageAtYearEnd, FEDERAL_CREDITS_2026.age) : 0,
    pension: alberta ? Math.min(values.pensionIncome, FEDERAL_CREDITS_2026.pensionMax) : 0,
    disability: alberta && adultDisability ? FEDERAL_CREDITS_2026.disability : 0,
    spouse: alberta && values.spouseAmountEligible ? Math.max(0, getFederalBasicPersonalAmount(netIncome) - values.spouseIncome) : 0,
    employment: alberta ? Math.min(values.employment, FEDERAL_CREDITS_2026.employmentMax) : 0,
    cpp: alberta ? values.cppBaseContributions : 0,
    ei: alberta ? values.eiPremiums : 0,
  };
  const provincialAmounts = {
    basic: getProvincialBasicPersonalAmount(netIncome, province),
    age: alberta ? ageAmount(netIncome, values.ageAtYearEnd, ALBERTA_CREDITS_2026.age) : 0,
    pension: alberta ? Math.min(values.pensionIncome, ALBERTA_CREDITS_2026.pensionMax) : 0,
    disability: alberta && adultDisability ? ALBERTA_CREDITS_2026.disability : 0,
    spouse: alberta && values.spouseAmountEligible ? Math.max(0, getProvincialBasicPersonalAmount(netIncome, province) - values.spouseIncome) : 0,
    cpp: alberta ? values.cppBaseContributions : 0,
    ei: alberta ? values.eiPremiums : 0,
  };
  const federalCreditBase = totalAmounts(federalAmounts);
  const provincialCreditBase = totalAmounts(provincialAmounts);
  const federalPersonalCredit = federalCreditBase * FEDERAL_CREDITS_2026.rate;
  const federalTopUp = alberta ? Math.max(0, federalPersonalCredit - FEDERAL_CREDITS_2026.topUpThreshold * FEDERAL_CREDITS_2026.rate) * FEDERAL_CREDITS_2026.topUpMultiplier : 0;
  const supplementalCredit = alberta ? Math.max(0, provincialCreditBase - ALBERTA_CREDITS_2026.supplementalThreshold) * ALBERTA_CREDITS_2026.supplementalRate : 0;

  // The base helpers already subtract BPA. Subtract only additional credits
  // here, and floor EACH jurisdiction independently: unused federal credits
  // must not pay Alberta tax (or vice versa).
  const federalAfterBpa = calculateFederalTax(taxableIncome, province);
  const provincialAfterBpa = calculateProvincialTax(taxableIncome, province);
  const federalAdditionalCredit = (federalCreditBase - federalAmounts.basic) * FEDERAL_CREDITS_2026.rate + federalTopUp;
  const provincialAdditionalCredit = alberta ? (provincialCreditBase - provincialAmounts.basic) * ALBERTA_CREDITS_2026.rate + supplementalCredit : 0;
  const federalTax = cents(Math.max(0, federalAfterBpa - federalAdditionalCredit - dividendCredit.federalCredit));
  const provincialTax = cents(Math.max(0, provincialAfterBpa - provincialAdditionalCredit - dividendCredit.provincialCredit));
  // Round each jurisdiction before adding, so displayed components, total
  // and scenario savings agree to the cent.
  const totalTax = cents(federalTax + provincialTax);
  return {
    inputs: values, grossIncome, cashIncome, netIncome, taxableIncome, enhancedCppDeduction,
    federalTax, provincialTax, totalTax, dividendCredit,
    afterTax: cents(cashIncome - totalTax),
    effectiveRate: cashIncome > 0 ? totalTax / cashIncome * 100 : 0,
    marginal: getMarginalRate(taxableIncome, province),
    credits: { federalAmounts, provincialAmounts, federalCreditBase, provincialCreditBase, federalPersonalCredit, federalTopUp, supplementalCredit },
    // Actual reduction beyond BPA; entitlement may be larger when tax is low.
    additionalCreditsUsed: cents(cents(federalAfterBpa) + cents(provincialAfterBpa) - totalTax),
  };
}

export function calculateRRSPImpact(inputs = {}) {
  const withRRSP = calculateTaxEstimate(inputs);
  const withoutRRSP = calculateTaxEstimate({ ...inputs, rrspDeduction: 0 });
  const savings = cents(Math.max(0, withoutRRSP.totalTax - withRRSP.totalTax));
  return {
    taxWithoutRRSP: withoutRRSP.totalTax,
    taxWithRRSP: withRRSP.totalTax,
    savings,
    benefitPercent: withRRSP.inputs.rrspDeduction > 0 ? savings / withRRSP.inputs.rrspDeduction * 100 : 0,
  };
}

/**
 * Compare no split with a 50% split, using the same credit model. This is
 * not an optimizer. Spouse income is assumed to be ordinary net/taxable
 * income before splitting; spouse deductions and other credits are unknown.
 * T1032 Step 4 requires independent recipient pension-credit eligibility.
 */
export function calculatePensionSplitComparison(inputs = {}) {
  const values = normalizeTaxInputs(inputs);
  const maxSplitAmount = values.pensionIncome * 0.5;
  const spouseInputs = { province: values.province, other: values.spouseIncome, ageAtYearEnd: values.spouseAgeAtYearEnd };
  const before = cents(calculateTaxEstimate(values).totalTax + calculateTaxEstimate(spouseInputs).totalTax);
  const sender = calculateTaxEstimate({
    ...values, pensionIncome: values.pensionIncome - maxSplitAmount,
    spouseIncome: values.spouseIncome + maxSplitAmount,
  });
  const receiver = calculateTaxEstimate({
    ...spouseInputs,
    other: values.spouseIncome + (values.splitPensionCreditEligible ? 0 : maxSplitAmount),
    pensionIncome: values.splitPensionCreditEligible ? maxSplitAmount : 0,
  });
  const after = cents(sender.totalTax + receiver.totalTax);
  return { maxSplitAmount, taxWithoutSplitting: before, taxWithSplitting: after, savings: cents(before - after) };
}
