// Tax Season Summary / T1 Prep Helper
import { fmt, h } from '../helpers.js';
import { icon } from '../icons.js';
import { calculateFederalTax, calculateProvincialTax, calculateDividendTaxCredit } from '../canadian/formatters.js';
import { RRSP } from '../canadian/constants.js';

export function renderTaxSeason(state) {
  const txs = state.transactions || [];
  const province = state.settings?.province || 'ON';
  const year = new Date().getFullYear();

  // Aggregate income by type
  const income = txs.filter(t => t.amount > 0 && !t.deleted_at);
  const totalIncome = income.reduce((s, t) => s + t.amount, 0);
  const employmentIncome = income.filter(t => t.category === 'Income').reduce((s, t) => s + t.amount, 0);
  const investmentIncome = income.filter(t => t.category === 'Investment Income').reduce((s, t) => s + t.amount, 0);
  const govBenefits = income.filter(t => t.category === 'Government Benefits').reduce((s, t) => s + t.amount, 0);
  const otherIncome = totalIncome - employmentIncome - investmentIncome - govBenefits;

  // Deductions
  const rrspContributions = (state.contributions || [])
    .filter(c => c.account_type === 'rrsp')
    .reduce((s, c) => s + c.amount, 0);

  // Tax calculations
  const taxableIncome = Math.max(0, totalIncome - rrspContributions);
  const federalTax = calculateFederalTax(taxableIncome);
  const provincialTax = calculateProvincialTax(taxableIncome, province);
  const totalTax = federalTax + provincialTax;
  const effectiveRate = totalIncome > 0 ? (totalTax / totalIncome * 100) : 0;

  // Expenses for deduction tracking
  const expenses = txs.filter(t => t.amount < 0 && !t.deleted_at);
  const medical = expenses.filter(t => t.category === 'Healthcare').reduce((s, t) => s + Math.abs(t.amount), 0);
  const childcare = expenses.filter(t => t.category === 'Childcare').reduce((s, t) => s + Math.abs(t.amount), 0);

  return `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <div>
        <div style="font-size:18px;font-weight:700">Tax Season ${year} Summary</div>
        <div style="font-size:12px;color:var(--sub);margin-top:4px">T1 Preparation Helper - Province: ${province}</div>
      </div>
      <button class="btn btn-primary" data-action="export-tax-pdf">${icon('file-text', 14)} Export PDF</button>
    </div>

    <div class="grid4" style="margin-bottom:16px">
      ${taxStatCard('Total Income', fmt(totalIncome), 'var(--green)')}
      ${taxStatCard('RRSP Deduction', fmt(rrspContributions), '#6366f1')}
      ${taxStatCard('Taxable Income', fmt(taxableIncome), 'var(--accent)')}
      ${taxStatCard('Est. Total Tax', fmt(totalTax), 'var(--red)', (effectiveRate.toFixed(1) + '% effective rate'))}
    </div>

    <div class="grid2" style="margin-bottom:14px">
      <div class="card">
        <div style="font-weight:700;font-size:14px;margin-bottom:14px">${icon('trending-up', 16)} Income Breakdown</div>
        ${incomeRow('Employment Income (Line 10100)', employmentIncome)}
        ${incomeRow('Investment Income (Line 12100)', investmentIncome)}
        ${incomeRow('Government Benefits (Lines 11300-14600)', govBenefits)}
        ${incomeRow('Other Income (Line 13000)', otherIncome)}
        <div style="border-top:2px solid var(--border);margin-top:8px;padding-top:8px">
          ${incomeRow('Total Income (Line 15000)', totalIncome, true)}
        </div>
      </div>
      <div class="card">
        <div style="font-weight:700;font-size:14px;margin-bottom:14px">${icon('minus-circle', 16)} Deductions & Credits</div>
        ${incomeRow('RRSP Contributions (Line 20800)', rrspContributions)}
        ${incomeRow('Medical Expenses (Line 33099)', medical)}
        ${incomeRow('Childcare Expenses (Line 21400)', childcare)}
        <div style="border-top:2px solid var(--border);margin-top:8px;padding-top:8px">
          ${incomeRow('Net Income (Line 23600)', taxableIncome, true)}
        </div>
      </div>
    </div>

    <div class="grid2">
      <div class="card">
        <div style="font-weight:700;font-size:14px;margin-bottom:14px">${icon('wallet', 16)} Tax Estimate</div>
        ${incomeRow('Federal Tax', federalTax)}
        ${incomeRow('Provincial Tax (' + province + ')', provincialTax)}
        <div style="border-top:2px solid var(--border);margin-top:8px;padding-top:8px">
          ${incomeRow('Total Estimated Tax', totalTax, true)}
        </div>
        <div style="font-size:10px;color:var(--muted);margin-top:12px;line-height:1.5">
          This is an estimate only. Does not include all credits, deductions, or special situations.
          Consult a tax professional or use certified tax software for actual filing.
        </div>
      </div>
      <div class="card">
        <div style="font-weight:700;font-size:14px;margin-bottom:14px">${icon('clipboard-list', 16)} CRA Filing Checklist</div>
        ${checklistItem('T4 Employment Income', employmentIncome > 0)}
        ${checklistItem('T5 Investment Income', investmentIncome > 0)}
        ${checklistItem('RRSP Contribution Receipts', rrspContributions > 0)}
        ${checklistItem('Medical Expense Receipts', medical > 0)}
        ${checklistItem('Childcare Receipts', childcare > 0)}
        ${checklistItem('T2202 Tuition (if applicable)', false)}
        ${checklistItem('Charitable Donation Receipts', false)}
        ${checklistItem('Home Office Expenses (T2200)', false)}
        <div style="font-size:10px;color:var(--muted);margin-top:12px">
          Filing deadline: April 30, ${year + 1} (June 15 for self-employed, payment still April 30)
        </div>
      </div>
    </div>`;
}

function taxStatCard(label, value, color, sub = '') {
  return `<div class="card" style="padding:16px;text-align:center">
    <div style="font-size:11px;color:var(--sub);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">${label}</div>
    <div class="mono" style="font-size:20px;font-weight:800;color:${color}">${value}</div>
    ${sub ? `<div style="font-size:10px;color:var(--muted);margin-top:4px">${sub}</div>` : ''}
  </div>`;
}

function incomeRow(label, amount, bold = false) {
  return `<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;font-size:12px;${bold ? 'font-weight:700;font-size:13px' : ''}">
    <span style="color:var(--sub)">${label}</span>
    <span class="mono" style="font-weight:${bold ? '700' : '600'};color:${amount > 0 ? 'var(--text)' : 'var(--muted)'}">${fmt(amount)}</span>
  </div>`;
}

function checklistItem(label, hasData) {
  return `<div style="display:flex;align-items:center;gap:8px;padding:4px 0;font-size:12px">
    <div style="width:18px;height:18px;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:10px;${hasData ? 'background:var(--green);color:#fff' : 'border:1px solid var(--border);color:var(--muted)'}">
      ${hasData ? '&#10003;' : ''}
    </div>
    <span style="color:${hasData ? 'var(--text)' : 'var(--sub)'}">${label}</span>
    ${hasData ? '<span style="font-size:10px;color:var(--green);margin-left:auto">Data found</span>' : ''}
  </div>`;
}
