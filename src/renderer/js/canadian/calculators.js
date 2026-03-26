import { TFSA_LIMITS, RRSP, RESP, FHSA, CPP, OAS } from './constants.js';
import { getMarginalRate } from './formatters.js';

/**
 * Calculate current TFSA room based on known CRA room + subsequent contributions.
 * Accumulates annual limits for years between known date and now.
 */
export function calculateCurrentTFSARoom(knownRoom, knownDate, contributions) {
  const knownYear = new Date(knownDate).getFullYear();
  const currentYear = new Date().getFullYear();

  // Add annual limits for years after the known date
  let accumulatedLimits = 0;
  for (let y = knownYear + 1; y <= currentYear; y++) {
    accumulatedLimits += TFSA_LIMITS[y] || 0;
  }

  // Sum contributions made after the known date
  const contributedSince = contributions
    .filter(c => c.account_type === 'tfsa' && c.date > knownDate)
    .reduce((sum, c) => sum + c.amount, 0);

  return {
    knownRoom,
    accumulatedLimits,
    contributedSince,
    currentRoom: knownRoom + accumulatedLimits - contributedSince,
    annualLimit: TFSA_LIMITS[currentYear] || 0,
  };
}

/**
 * Calculate current RRSP room based on known CRA room + subsequent contributions.
 * Note: RRSP room doesn't auto-accumulate like TFSA — it depends on earned income.
 * Users enter their known room from CRA My Account and track contributions forward.
 */
export function calculateCurrentRRSPRoom(knownRoom, knownDate, contributions) {
  const contributedSince = contributions
    .filter(c => c.account_type === 'rrsp' && c.date > knownDate)
    .reduce((sum, c) => sum + c.amount, 0);

  const currentRoom = knownRoom - contributedSince;

  return {
    knownRoom,
    contributedSince,
    currentRoom,
    overcontributed: currentRoom < -RRSP.OVERCONTRIBUTION_BUFFER,
    overcontributionAmount: currentRoom < -RRSP.OVERCONTRIBUTION_BUFFER
      ? Math.abs(currentRoom) - RRSP.OVERCONTRIBUTION_BUFFER : 0,
    maxDeduction: RRSP.MAX_2026,
  };
}

/**
 * Calculate CESG details for a RESP beneficiary.
 * CESG: 20% match on first $2,500/year, max $500/year, $7,200 lifetime per child.
 * Eligible until December 31 of the year the child turns 17.
 */
export function calculateCESGDetails(beneficiary) {
  const currentYear = new Date().getFullYear();
  const age = currentYear - beneficiary.birth_year;
  const yearsRemaining = Math.max(0, 17 - age);
  const cesgRemaining = Math.max(0, RESP.CESG_LIFETIME_MAX - (beneficiary.total_cesg_received || 0));
  const optimalAnnual = RESP.OPTIMAL_ANNUAL;
  const cesgThisYear = Math.min(RESP.CESG_MAX_ANNUAL, cesgRemaining);
  const contributionForMaxCesg = cesgThisYear / RESP.CESG_RATE;
  const lifetimeContribRoom = Math.max(0, RESP.LIFETIME_LIMIT - (beneficiary.total_contributions || 0));

  return {
    age,
    yearsRemaining,
    cesgRemaining,
    cesgThisYear,
    optimalAnnual,
    contributionForMaxCesg,
    lifetimeContribRoom,
    isEligible: age <= 17,
  };
}

/**
 * Calculate current FHSA room based on known room + subsequent contributions.
 * FHSA: $8,000/year, $40,000 lifetime, unused room carries forward up to $8,000.
 */
export function calculateCurrentFHSARoom(knownRoom, knownDate, contributions) {
  const knownYear = new Date(knownDate).getFullYear();
  const currentYear = new Date().getFullYear();

  // FHSA: $8,000/year with unused room carrying forward, but max $8,000 carryforward
  // Each year's contribution room = annual limit + min(unused from prior year, $8,000)
  let accumulatedLimits = 0;
  let unusedPriorYear = 0;
  for (let y = knownYear + 1; y <= currentYear; y++) {
    if (y >= FHSA.START_YEAR) {
      const yearLimit = FHSA.ANNUAL_LIMIT + Math.min(unusedPriorYear, FHSA.CARRYFORWARD_MAX);
      accumulatedLimits += yearLimit;
      unusedPriorYear = yearLimit; // carries forward (will be capped next iteration)
    }
  }

  const contributedSince = contributions
    .filter(c => c.account_type === 'fhsa' && c.date > knownDate)
    .reduce((sum, c) => sum + c.amount, 0);

  const currentRoom = Math.min(
    FHSA.LIFETIME_LIMIT,
    knownRoom + accumulatedLimits - contributedSince
  );

  return {
    knownRoom,
    accumulatedLimits,
    contributedSince,
    currentRoom: Math.max(0, currentRoom),
    annualLimit: FHSA.ANNUAL_LIMIT,
    lifetimeLimit: FHSA.LIFETIME_LIMIT,
  };
}

/**
 * Calculate GIC maturity details.
 */
export function calculateGICMaturity(gic) {
  const maturity = new Date(gic.maturity_date);
  const now = new Date();
  const msPerDay = 86400000;
  const daysRemaining = Math.ceil((maturity - now) / msPerDay);
  const termDays = gic.term_months * 30.44; // avg days per month

  // Support compounding frequency: annual (default), semi-annual, monthly
  const compounding = gic.compounding || 'annual';
  const periodsPerYear = compounding === 'monthly' ? 12 : compounding === 'semi-annual' ? 2 : 1;
  const totalPeriods = periodsPerYear * (gic.term_months / 12);
  const ratePerPeriod = (gic.rate / 100) / periodsPerYear;
  const maturityValue = gic.principal * Math.pow(1 + ratePerPeriod, totalPeriods);
  const interestEarned = maturityValue - gic.principal;

  let status = 'active';
  let statusColor = 'var(--green)';
  if (daysRemaining <= 0) {
    status = 'matured';
    statusColor = 'var(--accent)';
  } else if (daysRemaining <= 30) {
    status = 'maturing-soon';
    statusColor = 'var(--red)';
  } else if (daysRemaining <= 90) {
    status = 'approaching';
    statusColor = '#f59e0b';
  }

  return {
    daysRemaining: Math.max(0, daysRemaining),
    interestEarned,
    maturityValue,
    status,
    statusColor,
    progressPercent: Math.min(100, ((termDays - Math.max(0, daysRemaining)) / termDays) * 100),
  };
}

/**
 * Estimate CPP benefit based on age and income history.
 * Enhanced with general dropout provision (worst 17% of years excluded)
 * and optional child-rearing dropout provision.
 */
export function estimateCPPBenefit(currentAge, startAge = 65, averageEarnings = 60000, options = {}) {
  const {
    childRearingYears = 0,     // Years as primary caregiver for children under 7
    yearsContributing = null,  // Total CPP contribution years (null = estimate from age)
  } = options;

  // Estimate contributing years: age 18 to current age (max 47 years)
  const totalContributingYears = yearsContributing || Math.max(0, Math.min(currentAge - 18, 47));

  // General dropout provision: exclude worst 17% of contributing years (~8 years for full career)
  const generalDropoutYears = Math.floor(totalContributingYears * 0.17);

  // Child-rearing dropout: additional years excluded
  const crdYears = Math.min(childRearingYears, 7);

  // Effective contributing years after dropouts
  const effectiveYears = Math.max(0, totalContributingYears - generalDropoutYears - crdYears);
  const maxContributingYears = 39;

  // Earnings factor (ratio of actual to max pensionable)
  const earningsFactor = Math.min(1, averageEarnings / CPP.MAX_PENSIONABLE_EARNINGS);

  // Career factor: ratio of effective years to max
  const careerFactor = Math.min(1, effectiveYears / maxContributingYears);

  // Base benefit at 65 scaled by earnings and career
  const baseBenefit = CPP.MAX_MONTHLY_BENEFIT_65 * earningsFactor * careerFactor;

  // Adjust for early/late start
  let adjustedBenefit;
  if (startAge < CPP.NORMAL_AGE) {
    const monthsEarly = (CPP.NORMAL_AGE - startAge) * 12;
    adjustedBenefit = baseBenefit * (1 - monthsEarly * CPP.EARLY_REDUCTION_PER_MONTH);
  } else if (startAge > CPP.NORMAL_AGE) {
    const monthsLate = (startAge - CPP.NORMAL_AGE) * 12;
    adjustedBenefit = baseBenefit * (1 + monthsLate * CPP.LATE_INCREASE_PER_MONTH);
  } else {
    adjustedBenefit = baseBenefit;
  }

  const annualBenefit = adjustedBenefit * 12;
  const yearsUntilStart = Math.max(0, startAge - currentAge);

  return {
    monthlyBenefit: Math.round(adjustedBenefit * 100) / 100,
    annualBenefit: Math.round(annualBenefit),
    startAge,
    yearsUntilStart,
    earningsFactor: Math.round(earningsFactor * 100),
    careerFactor: Math.round(careerFactor * 100),
    totalContributingYears,
    generalDropoutYears,
    childRearingDropoutYears: crdYears,
    effectiveYears,
    reductionOrIncrease: startAge < 65
      ? `-${((CPP.NORMAL_AGE - startAge) * 12 * CPP.EARLY_REDUCTION_PER_MONTH * 100).toFixed(1)}%`
      : startAge > 65
      ? `+${((startAge - CPP.NORMAL_AGE) * 12 * CPP.LATE_INCREASE_PER_MONTH * 100).toFixed(1)}%`
      : '0%',
  };
}

/**
 * Estimate OAS benefit based on years of Canadian residency and income.
 */
export function estimateOASBenefit(yearsInCanada = 40, expectedRetirementIncome = 50000, deferralAge = 65) {
  // Partial OAS based on years of residency (minimum 10 years to qualify)
  if (yearsInCanada < 10) {
    return {
      monthlyBenefit: 0,
      annualBenefit: 0,
      clawbackAmount: 0,
      netAnnualBenefit: 0,
      eligible: false,
      reason: 'Minimum 10 years of Canadian residency required',
    };
  }

  const residencyFactor = Math.min(1, yearsInCanada / OAS.YEARS_REQUIRED_FULL);
  let baseBenefit = OAS.MAX_MONTHLY_BENEFIT * residencyFactor;

  // Deferral bonus (0.6% per month after 65, max age 70)
  if (deferralAge > OAS.ELIGIBLE_AGE) {
    const deferralMonths = Math.min((deferralAge - OAS.ELIGIBLE_AGE) * 12, (OAS.MAX_DEFERRAL_AGE - OAS.ELIGIBLE_AGE) * 12);
    baseBenefit *= (1 + deferralMonths * OAS.DEFERRAL_INCREASE_PER_MONTH);
  }

  const annualBenefit = baseBenefit * 12;

  // OAS clawback calculation
  let clawbackAmount = 0;
  if (expectedRetirementIncome > OAS.CLAWBACK_THRESHOLD) {
    clawbackAmount = Math.min(
      annualBenefit,
      (expectedRetirementIncome - OAS.CLAWBACK_THRESHOLD) * OAS.CLAWBACK_RATE
    );
  }

  const netAnnualBenefit = Math.max(0, annualBenefit - clawbackAmount);

  return {
    monthlyBenefit: Math.round(baseBenefit * 100) / 100,
    annualBenefit: Math.round(annualBenefit),
    clawbackAmount: Math.round(clawbackAmount),
    netAnnualBenefit: Math.round(netAnnualBenefit),
    netMonthlyBenefit: Math.round((netAnnualBenefit / 12) * 100) / 100,
    eligible: true,
    residencyFactor: Math.round(residencyFactor * 100),
    deferralBonus: deferralAge > 65 ? `+${((deferralAge - 65) * 12 * OAS.DEFERRAL_INCREASE_PER_MONTH * 100).toFixed(1)}%` : '0%',
  };
}

/**
 * RRSP vs TFSA optimizer.
 * Recommends which account to prioritize based on current vs expected retirement marginal rates.
 */
export function optimizeRRSPvsTFSA(currentIncome, expectedRetirementIncome, province, rrspRoom, tfsaRoom) {
  const currentRate = getMarginalRate(currentIncome, province);
  const retirementRate = getMarginalRate(expectedRetirementIncome, province);

  const rrspNetAdvantage = currentRate.combined - retirementRate.combined;

  let recommendation, reasoning;

  if (rrspRoom <= 0 && tfsaRoom <= 0) {
    recommendation = 'neither';
    reasoning = 'No contribution room available in either account.';
  } else if (rrspRoom <= 0) {
    recommendation = 'tfsa';
    reasoning = 'No RRSP room available. Contribute to TFSA.';
  } else if (tfsaRoom <= 0) {
    recommendation = 'rrsp';
    reasoning = 'No TFSA room available. Contribute to RRSP.';
  } else if (rrspNetAdvantage > 0.05) {
    recommendation = 'rrsp';
    reasoning = `Your current marginal rate (${(currentRate.combined * 100).toFixed(1)}%) is significantly higher than your expected retirement rate (${(retirementRate.combined * 100).toFixed(1)}%). RRSP gives you a ${(rrspNetAdvantage * 100).toFixed(1)}% net tax advantage.`;
  } else if (rrspNetAdvantage < -0.02) {
    recommendation = 'tfsa';
    reasoning = `Your expected retirement rate (${(retirementRate.combined * 100).toFixed(1)}%) is higher than your current rate (${(currentRate.combined * 100).toFixed(1)}%). TFSA avoids paying higher taxes on withdrawal.`;
  } else {
    recommendation = 'both';
    reasoning = `Your current rate (${(currentRate.combined * 100).toFixed(1)}%) is similar to your expected retirement rate (${(retirementRate.combined * 100).toFixed(1)}%). Split contributions between RRSP and TFSA for flexibility.`;
  }

  const rrspTaxRefund = 1000 * currentRate.combined;
  const rrspFutureTax = 1000 * retirementRate.combined;

  return {
    recommendation,
    reasoning,
    currentMarginalRate: currentRate,
    retirementMarginalRate: retirementRate,
    rrspNetAdvantage,
    rrspRoom,
    tfsaRoom,
    dollarExample: {
      contribution: 1000,
      rrspTaxRefundNow: Math.round(rrspTaxRefund),
      rrspTaxOnWithdrawal: Math.round(rrspFutureTax),
      rrspNetBenefit: Math.round(rrspTaxRefund - rrspFutureTax),
      tfsaNetBenefit: 0,
    },
  };
}

/**
 * Smith Manoeuvre calculator.
 * Projects the tax benefit of converting mortgage interest to tax-deductible via HELOC + investment.
 */
export function calculateSmithManoeuvre(mortgageBalance, mortgageRate, helocRate, investmentReturn, marginalRate, years = 25) {
  const projections = [];
  let mortBal = mortgageBalance;
  let helocBal = 0;
  let investmentValue = 0;
  let totalTaxSavings = 0;
  const monthlyMortgageRate = mortgageRate / 100 / 12;
  const monthlyHelocRate = helocRate / 100 / 12;
  const monthlyInvReturn = investmentReturn / 100 / 12;

  // Calculate fixed monthly mortgage payment (standard amortization)
  const totalPayments = years * 12;
  const monthlyPayment = mortBal * (monthlyMortgageRate * Math.pow(1 + monthlyMortgageRate, totalPayments)) /
    (Math.pow(1 + monthlyMortgageRate, totalPayments) - 1);

  for (let year = 1; year <= years; year++) {
    let yearTaxSavings = 0;
    for (let m = 0; m < 12; m++) {
      if (mortBal <= 0) break;
      // Mortgage payment splits into interest and principal
      const mortInterest = mortBal * monthlyMortgageRate;
      const principal = Math.min(monthlyPayment - mortInterest, mortBal);
      mortBal = Math.max(0, mortBal - principal);

      // Re-borrow principal portion via HELOC and invest it
      helocBal += principal;
      investmentValue = (investmentValue + principal) * (1 + monthlyInvReturn);

      // HELOC interest is tax-deductible (Smith Manoeuvre benefit)
      const helocInterest = helocBal * monthlyHelocRate;
      const taxSaving = helocInterest * marginalRate;
      yearTaxSavings += taxSaving;
      totalTaxSavings += taxSaving;

      // Apply tax refund to pay down HELOC
      helocBal -= taxSaving;
    }

    projections.push({
      year,
      mortgageBalance: Math.round(mortBal),
      helocBalance: Math.round(helocBal),
      investmentValue: Math.round(investmentValue),
      netPosition: Math.round(investmentValue - helocBal),
      yearTaxSavings: Math.round(yearTaxSavings),
      totalTaxSavings: Math.round(totalTaxSavings),
    });
  }

  const finalYear = projections[projections.length - 1] || {};
  return {
    monthlyPayment: Math.round(monthlyPayment),
    projections,
    totalTaxSavings: Math.round(totalTaxSavings),
    finalInvestmentValue: finalYear.investmentValue || 0,
    finalHelocBalance: finalYear.helocBalance || 0,
    finalNetBenefit: finalYear.netPosition || 0,
    breakEvenYear: projections.findIndex(p => p.netPosition > 0) + 1 || null,
  };
}
