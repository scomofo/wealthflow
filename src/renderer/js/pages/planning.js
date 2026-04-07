// Financial Planning & Forecasting Page
import { fmt } from '../helpers.js';
import { estimateCPPBenefit, estimateOASBenefit, optimizeRRSPvsTFSA, calculateSmithManoeuvre } from '../canadian/calculators.js';
import { stat } from '../components/stat-card.js';
import { progress } from '../components/progress-bar.js';
import { icon } from '../icons.js';

let planInputs = {
  // Debt payoff
  extraPayment: 200,
  // Savings timeline
  monthlySavings: 500,
  // FIRE calculator
  annualExpenses: 48000,
  currentInvestments: 50000,
  monthlyInvSavings: 1000,
  expectedReturn: 7,
  // Emergency fund
  emergencyMonths: 6,
  // Mortgage amortization
  mortgage_principal: 400000,
  mortgage_rate: 5.5,
  mortgage_years: 25,
  mortgage_frequency: 'monthly',
  // CPP/OAS
  cpp_current_age: 35,
  cpp_start_age: 65,
  cpp_avg_earnings: 60000,
  oas_years_in_canada: 40,
  oas_retirement_income: 50000,
  oas_deferral_age: 65,
  // RRSP vs TFSA
  rrsp_current_income: 80000,
  rrsp_retirement_income: 45000,
  rrsp_room: 30000,
  tfsa_room: 20000,
  // Smith Manoeuvre
  smith_mortgage: 400000,
  smith_mortgage_rate: 5.5,
  smith_heloc_rate: 7.0,
  smith_inv_return: 8,
  smith_marginal_rate: 0.38,
  smith_years: 25,
  // CPP enhancements
  cpp_child_rearing_years: 0,
};

export function updatePlanInput(field, value) {
  if (field === 'mortgage_frequency') {
    planInputs[field] = value;
  } else {
    planInputs[field] = parseFloat(value) || 0;
  }
}

export function renderPlanning(state) {
  const debts = state.debts || [];
  const F_catSpending = {};
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  (state.transactions || []).filter(t => t.amount < 0 && t.date?.startsWith(monthStart)).forEach(t => {
    F_catSpending[t.category] = (F_catSpending[t.category] || 0) + Math.abs(t.amount);
  });
  const monthlyExpenses = Object.values(F_catSpending).reduce((s, v) => s + v, 0);

  return `
    <div style="font-size:12px;color:var(--sub);margin-bottom:16px">Financial Planning & Forecasting</div>
    <div style="margin-bottom:14px">
      <button class="btn btn-secondary" data-action="run-workflow" data-workflow="debt_vs_investing">
        ${icon('lightbulb', 14)} Decide: Debt vs Investing
      </button>
    </div>
    <div class="grid2">
      <div class="card">
        <div style="font-weight:600;font-size:14px;margin-bottom:14px">${icon('credit-card', 16)} Debt Payoff Simulator</div>
        ${renderDebtPayoff(debts)}
      </div>
      <div class="card">
        <div style="font-weight:600;font-size:14px;margin-bottom:14px">${icon('target', 16)} Savings Goal Timeline</div>
        ${renderSavingsTimeline(state.goals || [])}
      </div>
    </div>
    <div class="grid2" style="margin-top:14px">
      <div class="card">
        <div style="font-weight:600;font-size:14px;margin-bottom:14px">${icon('flame', 16)} FIRE / Retirement Calculator</div>
        ${renderFIRECalc()}
      </div>
      <div class="card">
        <div style="font-weight:600;font-size:14px;margin-bottom:14px">${icon('lock', 16)} Emergency Fund Calculator</div>
        ${renderEmergencyFund(monthlyExpenses)}
      </div>
    </div>
    <div style="margin-top:14px">
      <div class="card">
        <div style="font-weight:600;font-size:14px;margin-bottom:14px">${icon('home', 16)} Mortgage Amortization</div>
        ${renderMortgageAmortization()}
      </div>
    </div>
    <div class="grid2" style="margin-top:14px">
      <div class="card">
        <div style="font-weight:600;font-size:14px;margin-bottom:14px">${icon('wallet', 16)} CPP/QPP Estimate</div>
        ${renderCPPEstimate()}
      </div>
      <div class="card">
        <div style="font-weight:600;font-size:14px;margin-bottom:14px">${icon('piggy-bank', 16)} OAS Estimate</div>
        ${renderOASEstimate()}
      </div>
    </div>
    <div class="grid2" style="margin-top:14px">
      <div class="card">
        <div style="font-weight:600;font-size:14px;margin-bottom:14px">${icon('bar-chart-3', 16)} RRSP vs TFSA Optimizer</div>
        ${renderRRSPvsTFSA(state)}
      </div>
      <div class="card">
        <div style="font-weight:600;font-size:14px;margin-bottom:14px">${icon('home', 16)} Smith Manoeuvre</div>
        ${renderSmithManoeuvre()}
      </div>
    </div>`;
}

function renderDebtPayoff(debts) {
  if (debts.length === 0) return '<div class="empty">No debts to simulate</div>';

  const extra = planInputs.extraPayment;
  const snowball = simulatePayoff(debts, extra, 'snowball');
  const avalanche = simulatePayoff(debts, extra, 'avalanche');
  const minOnly = simulatePayoff(debts, 0, 'snowball');

  return `
    <div class="plan-field">
      <div class="input-label">Extra Monthly Payment</div>
      <input class="input-field plan-input" data-field="extraPayment" type="number" value="${extra}" step="50" style="margin-bottom:14px">
    </div>
    <div style="display:flex;gap:12px;margin-bottom:14px">
      ${planStatMini('Min Only', `${minOnly.months} mo`, fmt(minOnly.totalInterest) + ' int.')}
      ${planStatMini('Snowball', `${snowball.months} mo`, fmt(snowball.totalInterest) + ' int.', '#10b981')}
      ${planStatMini('Avalanche', `${avalanche.months} mo`, fmt(avalanche.totalInterest) + ' int.', '#6366f1')}
    </div>
    <div style="font-size:11px;color:var(--sub);margin-bottom:8px">
      ${extra > 0 ? `Avalanche saves ${fmt(minOnly.totalInterest - avalanche.totalInterest)} vs minimum payments` : 'Add extra payment to see comparison'}
    </div>
    <div style="font-size:10px;color:var(--muted)">
      Snowball: smallest balance first | Avalanche: highest rate first
    </div>`;
}

function simulatePayoff(debts, extraMonthly, strategy) {
  if (debts.length === 0) return { months: 0, totalInterest: 0 };

  let balances = debts.map(d => ({ ...d, bal: d.balance }));
  let totalInterest = 0;
  let months = 0;
  const maxMonths = 600;

  while (balances.some(d => d.bal > 0) && months < maxMonths) {
    months++;
    let extraLeft = extraMonthly;

    // Apply interest
    balances.forEach(d => {
      if (d.bal > 0) {
        const interest = (d.bal * (d.rate / 100)) / 12;
        totalInterest += interest;
        d.bal += interest;
      }
    });

    // Apply minimum payments
    balances.forEach(d => {
      if (d.bal > 0) {
        const payment = Math.min(d.min_payment, d.bal);
        d.bal -= payment;
      }
    });

    // Sort for strategy and apply extra
    const sorted = balances.filter(d => d.bal > 0);
    if (strategy === 'snowball') sorted.sort((a, b) => a.bal - b.bal);
    else sorted.sort((a, b) => b.rate - a.rate);

    for (const d of sorted) {
      if (extraLeft <= 0) break;
      const payment = Math.min(extraLeft, d.bal);
      d.bal -= payment;
      extraLeft -= payment;
    }
  }

  return { months, totalInterest: Math.round(totalInterest) };
}

function renderSavingsTimeline(goals) {
  if (goals.length === 0) return '<div class="empty">No savings goals set</div>';

  const monthly = planInputs.monthlySavings;
  return `
    <div class="plan-field">
      <div class="input-label">Monthly Savings Rate</div>
      <input class="input-field plan-input" data-field="monthlySavings" type="number" value="${monthly}" step="100" style="margin-bottom:14px">
    </div>
    ${goals.map(g => {
      const remaining = Math.max(0, g.target - g.current);
      const monthsToGoal = monthly > 0 ? Math.ceil(remaining / monthly) : Infinity;
      const targetDate = new Date();
      targetDate.setMonth(targetDate.getMonth() + monthsToGoal);
      const pct = g.target > 0 ? Math.round((g.current / g.target) * 100) : 0;
      const deadlineDate = g.deadline ? new Date(g.deadline) : null;
      const onTrack = deadlineDate ? targetDate <= deadlineDate : true;

      return `<div style="margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
          <div style="font-size:12px;font-weight:600">${g.name}</div>
          <div style="font-size:11px;color:${onTrack ? 'var(--green)' : 'var(--red)'}">${monthsToGoal === Infinity ? 'Set savings rate' : monthsToGoal + ' months'}</div>
        </div>
        <div style="margin-bottom:4px">${progress(g.current, g.target, g.color || '#10b981', 8)}</div>
        <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--sub)">
          <span>${fmt(g.current)} / ${fmt(g.target)}</span>
          <span>${monthsToGoal !== Infinity && monthsToGoal > 0 ? `Est. ${targetDate.toLocaleDateString('en-CA', { month: 'short', year: 'numeric' })}` : ''}</span>
        </div>
      </div>`;
    }).join('')}`;
}

function renderFIRECalc() {
  const { annualExpenses, currentInvestments, monthlyInvSavings, expectedReturn } = planInputs;
  const fireNumber = annualExpenses * 25; // 4% rule
  const monthlyReturn = (expectedReturn / 100) / 12;

  // Future value calculation with monthly contributions
  let balance = currentInvestments;
  let months = 0;
  const maxMonths = 1200; // 100 years max
  while (balance < fireNumber && months < maxMonths) {
    balance = balance * (1 + monthlyReturn) + monthlyInvSavings;
    months++;
  }
  const years = (months / 12).toFixed(1);
  const pct = fireNumber > 0 ? Math.min(100, Math.round((currentInvestments / fireNumber) * 100)) : 0;

  return `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">
      <div>
        <div class="input-label">Annual Expenses</div>
        <input class="input-field plan-input" data-field="annualExpenses" type="number" value="${annualExpenses}" step="1000">
      </div>
      <div>
        <div class="input-label">Current Investments</div>
        <input class="input-field plan-input" data-field="currentInvestments" type="number" value="${currentInvestments}" step="1000">
      </div>
      <div>
        <div class="input-label">Monthly Investment</div>
        <input class="input-field plan-input" data-field="monthlyInvSavings" type="number" value="${monthlyInvSavings}" step="100">
      </div>
      <div>
        <div class="input-label">Expected Return (%)</div>
        <input class="input-field plan-input" data-field="expectedReturn" type="number" value="${expectedReturn}" step="0.5">
      </div>
    </div>
    <div style="display:flex;gap:12px;margin-bottom:12px">
      ${planStatMini('FIRE Number', fmt(fireNumber), '4% rule', '#d4a843')}
      ${planStatMini('Years to FI', months >= maxMonths ? 'N/A' : years + ' yrs', months >= maxMonths ? 'Increase savings' : `${Math.round(months)} months`, '#10b981')}
    </div>
    <div style="margin-bottom:4px">${progress(currentInvestments, fireNumber, '#d4a843', 10)}</div>
    <div style="font-size:10px;color:var(--sub);text-align:center">${pct}% to Financial Independence</div>`;
}

function renderEmergencyFund(monthlyExpenses) {
  const targetMonths = planInputs.emergencyMonths;
  const target3 = monthlyExpenses * 3;
  const target6 = monthlyExpenses * 6;
  const targetCustom = monthlyExpenses * targetMonths;

  // Use savings goals to find emergency fund
  // For now just calculate based on spending

  return `
    <div class="plan-field">
      <div class="input-label">Target Months of Runway</div>
      <input class="input-field plan-input" data-field="emergencyMonths" type="number" value="${targetMonths}" min="1" max="24" step="1" style="margin-bottom:14px">
    </div>
    <div style="font-size:12px;color:var(--sub);margin-bottom:12px">
      Based on ${fmt(monthlyExpenses)}/month in expenses this month
    </div>
    <div style="display:flex;gap:12px;margin-bottom:14px">
      ${planStatMini('3 Months', fmt(target3), 'Minimum', '#f59e0b')}
      ${planStatMini('6 Months', fmt(target6), 'Recommended', '#10b981')}
      ${planStatMini(`${targetMonths} Months`, fmt(targetCustom), 'Your target', '#6366f1')}
    </div>
    <div style="font-size:11px;color:var(--sub);line-height:1.6">
      ${monthlyExpenses > 0
        ? `At your current spending, you need ${fmt(targetCustom)} for a ${targetMonths}-month emergency fund.`
        : 'Add transactions this month to calculate emergency fund targets.'}
    </div>`;
}

function renderMortgageAmortization() {
  const { mortgage_principal, mortgage_rate, mortgage_years, mortgage_frequency } = planInputs;
  const principal = mortgage_principal;
  const annualRate = mortgage_rate / 100;

  // Canadian mortgages compound semi-annually
  const semiAnnualRate = annualRate / 2;
  const effectiveAnnualRate = Math.pow(1 + semiAnnualRate, 2) - 1;

  let paymentsPerYear, periodRate, totalPayments;
  if (mortgage_frequency === 'biweekly' || mortgage_frequency === 'accelerated_biweekly') {
    paymentsPerYear = 26;
    periodRate = Math.pow(1 + effectiveAnnualRate, 1 / 26) - 1;
    totalPayments = mortgage_years * 26;
  } else {
    paymentsPerYear = 12;
    periodRate = Math.pow(1 + effectiveAnnualRate, 1 / 12) - 1;
    totalPayments = mortgage_years * 12;
  }

  // Calculate monthly payment first (always needed for biweekly)
  const monthlyPeriodRate = Math.pow(1 + effectiveAnnualRate, 1 / 12) - 1;
  const totalMonthlyPayments = mortgage_years * 12;
  const monthlyPayment = principal > 0 && monthlyPeriodRate > 0
    ? principal * (monthlyPeriodRate * Math.pow(1 + monthlyPeriodRate, totalMonthlyPayments)) / (Math.pow(1 + monthlyPeriodRate, totalMonthlyPayments) - 1)
    : 0;

  let payment;
  if (mortgage_frequency === 'biweekly') {
    // Regular biweekly: monthly payment * 12 / 26
    payment = monthlyPayment * 12 / 26;
  } else if (mortgage_frequency === 'accelerated_biweekly') {
    // Accelerated biweekly: monthly payment / 2 (pays off faster)
    payment = monthlyPayment / 2;
  } else {
    payment = monthlyPayment;
  }

  // Build amortization schedule year by year
  let balance = principal;
  let totalInterest = 0;
  const yearlyData = [];
  let actualPayments = 0;

  for (let year = 1; year <= mortgage_years && balance > 0.01; year++) {
    let yearPrincipal = 0;
    let yearInterest = 0;

    for (let p = 0; p < paymentsPerYear && balance > 0.01; p++) {
      const interestPayment = balance * periodRate;
      const principalPayment = Math.min(payment - interestPayment, balance);
      if (payment <= interestPayment) break; // can't afford payments

      yearInterest += interestPayment;
      yearPrincipal += principalPayment;
      balance -= principalPayment;
      totalInterest += interestPayment;
      actualPayments++;
    }

    yearlyData.push({
      year,
      principalPaid: yearPrincipal,
      interestPaid: yearInterest,
      remainingBalance: Math.max(0, balance),
    });

    if (balance <= 0.01) break;
  }

  const payoffDate = new Date();
  if (mortgage_frequency === 'monthly') {
    payoffDate.setMonth(payoffDate.getMonth() + actualPayments);
  } else {
    payoffDate.setDate(payoffDate.getDate() + actualPayments * 14);
  }

  const freqLabel = mortgage_frequency === 'biweekly' ? 'Biweekly' : mortgage_frequency === 'accelerated_biweekly' ? 'Accelerated Biweekly' : 'Monthly';
  const paymentLabel = mortgage_frequency === 'monthly' ? 'Monthly Payment' : 'Biweekly Payment';

  return `
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px;margin-bottom:14px">
      <div>
        <div class="input-label">Principal ($)</div>
        <input class="input-field plan-input" data-field="mortgage_principal" type="number" value="${mortgage_principal}" step="10000">
      </div>
      <div>
        <div class="input-label">Annual Rate (%)</div>
        <input class="input-field plan-input" data-field="mortgage_rate" type="number" value="${mortgage_rate}" step="0.25">
      </div>
      <div>
        <div class="input-label">Amortization (years)</div>
        <input class="input-field plan-input" data-field="mortgage_years" type="number" value="${mortgage_years}" step="1" min="1" max="30">
      </div>
      <div>
        <div class="input-label">Payment Frequency</div>
        <select class="input-field plan-input" data-field="mortgage_frequency">
          <option value="monthly" ${mortgage_frequency === 'monthly' ? 'selected' : ''}>Monthly</option>
          <option value="biweekly" ${mortgage_frequency === 'biweekly' ? 'selected' : ''}>Biweekly</option>
          <option value="accelerated_biweekly" ${mortgage_frequency === 'accelerated_biweekly' ? 'selected' : ''}>Accelerated Biweekly</option>
        </select>
      </div>
    </div>
    <div style="display:flex;gap:12px;margin-bottom:16px">
      ${planStatMini(paymentLabel, fmt(payment), freqLabel, '#6366f1')}
      ${planStatMini('Total Interest', fmt(totalInterest), 'Over life of mortgage', 'var(--red)')}
      ${planStatMini('Total Cost', fmt(principal + totalInterest), 'Principal + interest', '#f59e0b')}
      ${planStatMini('Payoff Date', payoffDate.toLocaleDateString('en-CA', { month: 'short', year: 'numeric' }), `${actualPayments} payments`, 'var(--green)')}
    </div>
    ${yearlyData.length > 0 ? `
    <div style="max-height:300px;overflow-y:auto;border:1px solid var(--border);border-radius:10px">
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead>
          <tr style="background:var(--input);position:sticky;top:0">
            <th style="padding:8px 12px;text-align:left;font-weight:600;font-size:11px;color:var(--sub)">Year</th>
            <th style="padding:8px 12px;text-align:right;font-weight:600;font-size:11px;color:var(--sub)">Principal Paid</th>
            <th style="padding:8px 12px;text-align:right;font-weight:600;font-size:11px;color:var(--sub)">Interest Paid</th>
            <th style="padding:8px 12px;text-align:right;font-weight:600;font-size:11px;color:var(--sub)">Remaining Balance</th>
          </tr>
        </thead>
        <tbody>
          ${yearlyData.map(d => `
            <tr style="border-top:1px solid var(--border)">
              <td style="padding:6px 12px;font-weight:600">${d.year}</td>
              <td class="mono" style="padding:6px 12px;text-align:right;color:var(--green)">${fmt(d.principalPaid)}</td>
              <td class="mono" style="padding:6px 12px;text-align:right;color:var(--red)">${fmt(d.interestPaid)}</td>
              <td class="mono" style="padding:6px 12px;text-align:right">${fmt(d.remainingBalance)}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>` : '<div class="empty">Enter mortgage details to see amortization schedule</div>'}
  `;
}

function renderCPPEstimate() {
  const { cpp_current_age, cpp_start_age, cpp_avg_earnings } = planInputs;
  const cppOptions = { childRearingYears: planInputs.cpp_child_rearing_years };
  const cpp60 = estimateCPPBenefit(cpp_current_age, 60, cpp_avg_earnings, cppOptions);
  const cpp65 = estimateCPPBenefit(cpp_current_age, 65, cpp_avg_earnings, cppOptions);
  const cpp70 = estimateCPPBenefit(cpp_current_age, 70, cpp_avg_earnings, cppOptions);
  const selected = estimateCPPBenefit(cpp_current_age, cpp_start_age, cpp_avg_earnings, cppOptions);

  return `
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px;margin-bottom:14px">
      <div>
        <div class="input-label">Your Age</div>
        <input class="input-field plan-input" data-field="cpp_current_age" type="number" value="${cpp_current_age}" min="18" max="70">
      </div>
      <div>
        <div class="input-label">Start Age</div>
        <input class="input-field plan-input" data-field="cpp_start_age" type="number" value="${cpp_start_age}" min="60" max="70">
      </div>
      <div>
        <div class="input-label">Avg Annual Earnings</div>
        <input class="input-field plan-input" data-field="cpp_avg_earnings" type="number" value="${cpp_avg_earnings}" step="5000">
      </div>
      <div>
        <div class="input-label">Child-Rearing Yrs</div>
        <input class="input-field plan-input" data-field="cpp_child_rearing_years" type="number" value="${planInputs.cpp_child_rearing_years}" min="0" max="7">
      </div>
    </div>
    <div style="display:flex;gap:12px;margin-bottom:14px">
      ${planStatMini('Age 60', fmt(cpp60.monthlyBenefit) + '/mo', cpp60.reductionOrIncrease, 'var(--orange)')}
      ${planStatMini('Age 65', fmt(cpp65.monthlyBenefit) + '/mo', 'Standard', 'var(--green)')}
      ${planStatMini('Age 70', fmt(cpp70.monthlyBenefit) + '/mo', cpp70.reductionOrIncrease, 'var(--blue)')}
    </div>
    <div style="font-size:11px;color:var(--sub);line-height:1.6">
      At age <b style="color:var(--text)">${cpp_start_age}</b> with ${selected.earningsFactor}% of max earnings:
      <b style="color:var(--accent)">${fmt(selected.monthlyBenefit)}/mo</b> (${fmt(selected.annualBenefit)}/yr).
      ${selected.yearsUntilStart > 0 ? `Starts in ${selected.yearsUntilStart} years.` : ''}
      ${selected.generalDropoutYears > 0 ? `General dropout: ${selected.generalDropoutYears} low-earning years excluded.` : ''}
      ${selected.childRearingDropoutYears > 0 ? ` Child-rearing dropout: ${selected.childRearingDropoutYears} years excluded.` : ''}
    </div>
    <div style="font-size:10px;color:var(--muted);margin-top:6px">
      Estimates only. Check your CPP Statement of Contributions at canada.ca for actuals.
    </div>`;
}

function renderOASEstimate() {
  const { oas_years_in_canada, oas_retirement_income, oas_deferral_age } = planInputs;
  const oas = estimateOASBenefit(oas_years_in_canada, oas_retirement_income, oas_deferral_age);
  const oas65 = estimateOASBenefit(oas_years_in_canada, oas_retirement_income, 65);
  const oas70 = estimateOASBenefit(oas_years_in_canada, oas_retirement_income, 70);

  return `
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:14px">
      <div>
        <div class="input-label">Years in Canada</div>
        <input class="input-field plan-input" data-field="oas_years_in_canada" type="number" value="${oas_years_in_canada}" min="0" max="50">
      </div>
      <div>
        <div class="input-label">Retirement Income</div>
        <input class="input-field plan-input" data-field="oas_retirement_income" type="number" value="${oas_retirement_income}" step="5000">
      </div>
      <div>
        <div class="input-label">Start Age</div>
        <input class="input-field plan-input" data-field="oas_deferral_age" type="number" value="${oas_deferral_age}" min="65" max="70">
      </div>
    </div>
    ${oas.eligible ? `
    <div style="display:flex;gap:12px;margin-bottom:14px">
      ${planStatMini('Age 65', fmt(oas65.netMonthlyBenefit) + '/mo', oas65.clawbackAmount > 0 ? 'After clawback' : 'Full benefit', 'var(--green)')}
      ${planStatMini('Age 70', fmt(oas70.netMonthlyBenefit) + '/mo', oas70.deferralBonus, 'var(--blue)')}
      ${planStatMini('Your Plan', fmt(oas.netMonthlyBenefit) + '/mo', fmt(oas.netAnnualBenefit) + '/yr', 'var(--accent)')}
    </div>
    ${oas.clawbackAmount > 0 ? `
    <div style="font-size:11px;color:var(--orange);margin-bottom:8px">
      ⚠ OAS clawback: ${fmt(oas.clawbackAmount)}/yr at ${fmt(oas_retirement_income)} retirement income.
      ${oas_retirement_income > 148000 ? 'Full clawback — consider income splitting strategies.' : 'Consider TFSA withdrawals to reduce clawback.'}
    </div>` : ''}
    <div style="font-size:11px;color:var(--sub);line-height:1.6">
      ${oas.residencyFactor < 100 ? `Partial OAS: ${oas.residencyFactor}% (${oas_years_in_canada} of 40 years).` : 'Full OAS eligibility.'}
      Gross benefit: ${fmt(oas.monthlyBenefit)}/mo (${fmt(oas.annualBenefit)}/yr).
    </div>` : `
    <div style="font-size:12px;color:var(--red);padding:12px;background:rgba(239,68,68,0.08);border-radius:8px">
      ${oas.reason}
    </div>`}
    <div style="font-size:10px;color:var(--muted);margin-top:6px">
      Estimates based on 2026 rates. Actual benefits depend on residency and income at retirement.
    </div>`;
}

function renderRRSPvsTFSA(state) {
  const { rrsp_current_income, rrsp_retirement_income, rrsp_room, tfsa_room } = planInputs;
  const province = state.settings?.province || 'ON';
  const result = optimizeRRSPvsTFSA(rrsp_current_income, rrsp_retirement_income, province, rrsp_room, tfsa_room);

  const recColor = result.recommendation === 'rrsp' ? '#6366f1' : result.recommendation === 'tfsa' ? 'var(--green)' : 'var(--accent)';
  const recLabel = result.recommendation === 'rrsp' ? 'RRSP' : result.recommendation === 'tfsa' ? 'TFSA' : result.recommendation === 'both' ? 'Split Both' : 'N/A';

  return `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">
      <div>
        <div class="input-label">Current Income</div>
        <input class="input-field plan-input" data-field="rrsp_current_income" type="number" value="${rrsp_current_income}" step="5000">
      </div>
      <div>
        <div class="input-label">Expected Retirement Income</div>
        <input class="input-field plan-input" data-field="rrsp_retirement_income" type="number" value="${rrsp_retirement_income}" step="5000">
      </div>
      <div>
        <div class="input-label">RRSP Room</div>
        <input class="input-field plan-input" data-field="rrsp_room" type="number" value="${rrsp_room}" step="1000">
      </div>
      <div>
        <div class="input-label">TFSA Room</div>
        <input class="input-field plan-input" data-field="tfsa_room" type="number" value="${tfsa_room}" step="1000">
      </div>
    </div>
    <div style="background:rgba(99,102,241,0.06);border:1px solid rgba(99,102,241,0.15);border-radius:10px;padding:14px 16px;margin-bottom:14px;text-align:center">
      <div style="font-size:10px;color:var(--sub);text-transform:uppercase;letter-spacing:.5px">Recommendation</div>
      <div style="font-size:22px;font-weight:800;color:${recColor};margin-top:2px">${recLabel}</div>
    </div>
    <div style="font-size:11px;color:var(--sub);line-height:1.6;margin-bottom:12px">${result.reasoning}</div>
    <div style="display:flex;gap:12px">
      ${planStatMini('$1K RRSP', '+' + fmt(result.dollarExample.rrspTaxRefundNow), 'Tax refund now', '#6366f1')}
      ${planStatMini('RRSP Withdrawal', '-' + fmt(result.dollarExample.rrspTaxOnWithdrawal), 'Tax in retirement', 'var(--red)')}
      ${planStatMini('Net Advantage', fmt(result.dollarExample.rrspNetBenefit), 'Per $1K RRSP', result.dollarExample.rrspNetBenefit > 0 ? 'var(--green)' : 'var(--red)')}
    </div>`;
}

function renderSmithManoeuvre() {
  const { smith_mortgage, smith_mortgage_rate, smith_heloc_rate, smith_inv_return, smith_marginal_rate, smith_years } = planInputs;
  const result = calculateSmithManoeuvre(smith_mortgage, smith_mortgage_rate, smith_heloc_rate, smith_inv_return, smith_marginal_rate, smith_years);

  return `
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:14px">
      <div>
        <div class="input-label">Mortgage Balance</div>
        <input class="input-field plan-input" data-field="smith_mortgage" type="number" value="${smith_mortgage}" step="10000">
      </div>
      <div>
        <div class="input-label">Mortgage Rate (%)</div>
        <input class="input-field plan-input" data-field="smith_mortgage_rate" type="number" value="${smith_mortgage_rate}" step="0.25">
      </div>
      <div>
        <div class="input-label">HELOC Rate (%)</div>
        <input class="input-field plan-input" data-field="smith_heloc_rate" type="number" value="${smith_heloc_rate}" step="0.25">
      </div>
      <div>
        <div class="input-label">Investment Return (%)</div>
        <input class="input-field plan-input" data-field="smith_inv_return" type="number" value="${smith_inv_return}" step="0.5">
      </div>
      <div>
        <div class="input-label">Marginal Tax Rate</div>
        <input class="input-field plan-input" data-field="smith_marginal_rate" type="number" value="${smith_marginal_rate}" step="0.01" min="0" max="0.55">
      </div>
      <div>
        <div class="input-label">Years</div>
        <input class="input-field plan-input" data-field="smith_years" type="number" value="${smith_years}" step="1" min="5" max="30">
      </div>
    </div>
    <div style="display:flex;gap:12px;margin-bottom:14px">
      ${planStatMini('Tax Savings', fmt(result.totalTaxSavings), 'Total over ' + smith_years + 'yr', 'var(--green)')}
      ${planStatMini('Investment', fmt(result.finalInvestmentValue), 'Portfolio value', '#6366f1')}
      ${planStatMini('Net Benefit', fmt(result.finalNetBenefit), result.breakEvenYear ? 'Break even yr ' + result.breakEvenYear : 'N/A', result.finalNetBenefit > 0 ? 'var(--green)' : 'var(--red)')}
    </div>
    <div style="font-size:11px;color:var(--sub);line-height:1.6">
      Monthly payment: ${fmt(result.monthlyPayment)}. The Smith Manoeuvre converts non-deductible mortgage interest into tax-deductible investment loan interest.
    </div>
    <div style="font-size:10px;color:var(--muted);margin-top:6px">
      Consult a tax professional before implementing. Investment returns are not guaranteed.
    </div>`;
}

function planStatMini(label, value, sub, color = 'var(--sub)') {
  return `<div style="flex:1;background:var(--input);border-radius:10px;padding:10px 12px;text-align:center">
    <div style="font-size:10px;color:var(--sub);text-transform:uppercase;letter-spacing:.5px">${label}</div>
    <div style="font-size:16px;font-weight:700;color:${color};margin-top:2px">${value}</div>
    <div style="font-size:9px;color:var(--muted)">${sub}</div>
  </div>`;
}
