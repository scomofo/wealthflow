import { icon } from '../icons.js';
import { fmt } from '../helpers.js';
import { PROVINCES, FEDERAL_TAX_BRACKETS_2026, PROVINCIAL_TAX_BRACKETS_2026 } from '../canadian/constants.js';
import { calculateFederalTax, calculateProvincialTax, calculateTotalTax, getMarginalRate, calculateDividendTaxCredit, calculatePensionSplitting } from '../canadian/formatters.js';

let taxInputs = {
  employment: 0,
  other: 0,
  rrspDeduction: 0,
  province: 'ON',
  eligibleDividends: 0,
  nonEligibleDividends: 0,
  pensionSplitting: false,
  spouseIncome: 0,
  pensionIncome: 0,
};

export function updateTaxInput(field, value) {
  if (field === 'province') {
    taxInputs.province = value;
  } else if (field === 'pensionSplitting') {
    taxInputs.pensionSplitting = value === 'true' || value === true;
  } else {
    taxInputs[field] = parseFloat(value) || 0;
  }
}

export function initTaxInputs(province) {
  if (!taxInputs.province || taxInputs.province === 'ON') {
    taxInputs.province = province || 'ON';
  }
}

export function renderTaxCalculator(_state) {
  const province = taxInputs.province;
  const grossIncome = taxInputs.employment + taxInputs.other;

  // Dividend gross-up added to taxable income
  const dividendCredit = calculateDividendTaxCredit(taxInputs.eligibleDividends, taxInputs.nonEligibleDividends, province);
  const taxableIncome = Math.max(0, grossIncome - taxInputs.rrspDeduction + dividendCredit.taxableAmount);

  const federalTax = calculateFederalTax(taxableIncome);
  const provincialTax = calculateProvincialTax(taxableIncome, province);
  const totalTaxBeforeCredits = federalTax + provincialTax;
  const totalTax = Math.max(0, totalTaxBeforeCredits - dividendCredit.totalCredit);
  const totalDividends = taxInputs.eligibleDividends + taxInputs.nonEligibleDividends;
  const afterTax = grossIncome + totalDividends - totalTax;
  const effectiveRate = (grossIncome + totalDividends) > 0 ? (totalTax / (grossIncome + totalDividends) * 100) : 0;
  const marginal = getMarginalRate(taxableIncome, province);

  // RRSP impact
  const taxWithoutRRSP = calculateTotalTax(grossIncome + dividendCredit.taxableAmount, province) - dividendCredit.totalCredit;
  const rrspSavings = Math.max(0, taxWithoutRRSP - totalTax);
  const rrspBenefitPct = taxInputs.rrspDeduction > 0 ? (rrspSavings / taxInputs.rrspDeduction * 100) : 0;

  // Pension splitting
  const pensionSplit = taxInputs.pensionSplitting && taxInputs.pensionIncome > 0
    ? calculatePensionSplitting(grossIncome, taxInputs.spouseIncome, taxInputs.pensionIncome, province)
    : null;

  return `
    <div class="grid2" style="gap:18px">
      <div>
        <div class="card" style="margin-bottom:14px">
          <div style="font-weight:700;font-size:15px;margin-bottom:16px">${icon('calculator', 16)} Income & Deductions</div>
          <div class="input-label">Province</div>
          <select class="input-field tax-input" id="tax-province" data-field="province" style="margin-bottom:12px">
            ${PROVINCES.map(p => `<option value="${p.code}" ${p.code === province ? 'selected' : ''}>${p.name}</option>`).join('')}
          </select>
          <div class="input-label">Employment Income ($)</div>
          <input class="input-field tax-input" id="tax-employment" data-field="employment" type="number" step="100" value="${taxInputs.employment || ''}" placeholder="0" style="margin-bottom:12px">
          <div class="input-label">Other Income ($)</div>
          <input class="input-field tax-input" id="tax-other" data-field="other" type="number" step="100" value="${taxInputs.other || ''}" placeholder="0" style="margin-bottom:12px">
          <div class="input-label">RRSP Deduction ($)</div>
          <input class="input-field tax-input" id="tax-rrsp" data-field="rrspDeduction" type="number" step="100" value="${taxInputs.rrspDeduction || ''}" placeholder="0" style="margin-bottom:4px">
          <div style="font-size:10px;color:var(--muted);margin-bottom:12px">Deducting RRSP contributions reduces your taxable income</div>

          <div style="border-top:1px solid var(--border);margin:12px 0;padding-top:12px">
            <div style="font-weight:600;font-size:13px;margin-bottom:10px">${icon('trending-up', 14)} Dividend Income</div>
            <div class="input-label">Eligible Dividends ($)</div>
            <input class="input-field tax-input" id="tax-eligible-div" data-field="eligibleDividends" type="number" step="100" value="${taxInputs.eligibleDividends || ''}" placeholder="0" style="margin-bottom:8px">
            <div class="input-label">Non-Eligible Dividends ($)</div>
            <input class="input-field tax-input" id="tax-noneligible-div" data-field="nonEligibleDividends" type="number" step="100" value="${taxInputs.nonEligibleDividends || ''}" placeholder="0" style="margin-bottom:4px">
            <div style="font-size:10px;color:var(--muted);margin-bottom:12px">Eligible: from public corporations | Non-eligible: from CCPCs</div>
          </div>

          <div style="border-top:1px solid var(--border);margin:12px 0;padding-top:12px">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
              <div style="font-weight:600;font-size:13px">${icon('users', 14)} Pension Income Splitting</div>
              <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:12px;color:var(--sub)">
                <input type="checkbox" class="tax-input" data-field="pensionSplitting" ${taxInputs.pensionSplitting ? 'checked' : ''} style="accent-color:var(--accent)"> Enable
              </label>
            </div>
            ${taxInputs.pensionSplitting ? `
              <div class="input-label">Your Pension Income ($)</div>
              <input class="input-field tax-input" id="tax-pension" data-field="pensionIncome" type="number" step="100" value="${taxInputs.pensionIncome || ''}" placeholder="0" style="margin-bottom:8px">
              <div class="input-label">Spouse Total Income ($)</div>
              <input class="input-field tax-input" id="tax-spouse" data-field="spouseIncome" type="number" step="100" value="${taxInputs.spouseIncome || ''}" placeholder="0" style="margin-bottom:4px">
              <div style="font-size:10px;color:var(--muted);margin-bottom:8px">Up to 50% of eligible pension income can be split with spouse</div>
            ` : ''}
          </div>
        </div>

        ${taxInputs.rrspDeduction > 0 ? `
        <div class="card" style="border-color:var(--green);background:rgba(16,185,129,0.04);margin-bottom:14px">
          <div style="font-weight:700;font-size:14px;margin-bottom:12px;color:var(--green)">${icon('trending-up', 16)} RRSP Tax Impact</div>
          <div class="grid3">
            <div>
              <div style="font-size:10px;color:var(--sub);text-transform:uppercase;letter-spacing:.5px">Tax Without RRSP</div>
              <div class="mono" style="font-size:15px;font-weight:700;margin-top:4px">${fmt(taxWithoutRRSP)}</div>
            </div>
            <div>
              <div style="font-size:10px;color:var(--sub);text-transform:uppercase;letter-spacing:.5px">Tax With RRSP</div>
              <div class="mono" style="font-size:15px;font-weight:700;color:var(--green);margin-top:4px">${fmt(totalTax)}</div>
            </div>
            <div>
              <div style="font-size:10px;color:var(--sub);text-transform:uppercase;letter-spacing:.5px">You Save</div>
              <div class="mono" style="font-size:15px;font-weight:700;color:var(--green);margin-top:4px">${fmt(rrspSavings)}</div>
              <div style="font-size:10px;color:var(--muted);margin-top:2px">${rrspBenefitPct.toFixed(1)}% effective benefit</div>
            </div>
          </div>
        </div>` : ''}

        ${totalDividends > 0 ? `
        <div class="card" style="border-color:#8b5cf6;background:rgba(139,92,246,0.04);margin-bottom:14px">
          <div style="font-weight:700;font-size:14px;margin-bottom:12px;color:#8b5cf6">${icon('trending-up', 16)} Dividend Tax Credit</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
            <div>
              <div style="font-size:10px;color:var(--sub);text-transform:uppercase;letter-spacing:.5px">Gross-Up Amount</div>
              <div class="mono" style="font-size:15px;font-weight:700;margin-top:4px">${fmt(dividendCredit.totalGrossUp)}</div>
              <div style="font-size:10px;color:var(--muted);margin-top:2px">Added to taxable income</div>
            </div>
            <div>
              <div style="font-size:10px;color:var(--sub);text-transform:uppercase;letter-spacing:.5px">Taxable Dividend Amount</div>
              <div class="mono" style="font-size:15px;font-weight:700;margin-top:4px">${fmt(dividendCredit.taxableAmount)}</div>
              <div style="font-size:10px;color:var(--muted);margin-top:2px">Grossed-up amount</div>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">
            <div>
              <div style="font-size:10px;color:var(--sub);text-transform:uppercase;letter-spacing:.5px">Federal Credit</div>
              <div class="mono" style="font-size:15px;font-weight:700;color:var(--green);margin-top:4px">${fmt(dividendCredit.federalCredit)}</div>
            </div>
            <div>
              <div style="font-size:10px;color:var(--sub);text-transform:uppercase;letter-spacing:.5px">Provincial Credit</div>
              <div class="mono" style="font-size:15px;font-weight:700;color:var(--green);margin-top:4px">${fmt(dividendCredit.provincialCredit)}</div>
            </div>
            <div>
              <div style="font-size:10px;color:var(--sub);text-transform:uppercase;letter-spacing:.5px">Total Credit</div>
              <div class="mono" style="font-size:15px;font-weight:700;color:var(--green);margin-top:4px">${fmt(dividendCredit.totalCredit)}</div>
            </div>
          </div>
        </div>` : ''}

        ${pensionSplit ? `
        <div class="card" style="border-color:#f59e0b;background:rgba(245,158,11,0.04)">
          <div style="font-weight:700;font-size:14px;margin-bottom:12px;color:#f59e0b">${icon('users', 16)} Pension Income Splitting</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
            <div>
              <div style="font-size:10px;color:var(--sub);text-transform:uppercase;letter-spacing:.5px">Max Split Amount</div>
              <div class="mono" style="font-size:15px;font-weight:700;margin-top:4px">${fmt(pensionSplit.maxSplitAmount)}</div>
              <div style="font-size:10px;color:var(--muted);margin-top:2px">50% of pension income</div>
            </div>
            <div>
              <div style="font-size:10px;color:var(--sub);text-transform:uppercase;letter-spacing:.5px">Tax Savings</div>
              <div class="mono" style="font-size:15px;font-weight:700;color:var(--green);margin-top:4px">${fmt(pensionSplit.savings)}</div>
              <div style="font-size:10px;color:var(--muted);margin-top:2px">${pensionSplit.savings > 0 ? 'Splitting is beneficial' : 'No benefit from splitting'}</div>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
            <div>
              <div style="font-size:10px;color:var(--sub);text-transform:uppercase;letter-spacing:.5px">Combined Tax (No Split)</div>
              <div class="mono" style="font-size:14px;font-weight:700;margin-top:4px">${fmt(pensionSplit.taxWithoutSplitting)}</div>
            </div>
            <div>
              <div style="font-size:10px;color:var(--sub);text-transform:uppercase;letter-spacing:.5px">Combined Tax (With Split)</div>
              <div class="mono" style="font-size:14px;font-weight:700;color:var(--green);margin-top:4px">${fmt(pensionSplit.taxWithSplitting)}</div>
            </div>
          </div>
        </div>` : ''}
      </div>

      <div>
        <div class="grid2" style="margin-bottom:14px">
          ${resultCard('Total Tax', fmt(totalTax), 'var(--red)')}
          ${resultCard('After-Tax Income', fmt(afterTax), 'var(--green)')}
          ${resultCard('Effective Rate', effectiveRate.toFixed(2) + '%', '#f59e0b')}
          ${resultCard('Marginal Rate', (marginal.combined * 100).toFixed(2) + '%', '#8b5cf6')}
        </div>

        <div class="card" style="margin-bottom:14px">
          <div style="font-weight:700;font-size:14px;margin-bottom:14px">Federal Tax Brackets</div>
          ${renderBrackets(FEDERAL_TAX_BRACKETS_2026, taxableIncome, federalTax)}
        </div>

        ${PROVINCIAL_TAX_BRACKETS_2026[province] ? `
        <div class="card">
          <div style="font-weight:700;font-size:14px;margin-bottom:14px">${getProvinceName(province)} Tax Brackets</div>
          ${renderBrackets(PROVINCIAL_TAX_BRACKETS_2026[province], taxableIncome, provincialTax)}
        </div>` : `
        <div class="card empty">
          Provincial tax brackets not available for this province/territory.
        </div>`}
      </div>
    </div>
  `;
}

function resultCard(label, value, color) {
  return `
    <div class="card" style="padding:16px;text-align:center">
      <div style="font-size:10px;color:var(--sub);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">${label}</div>
      <div class="mono" style="font-size:20px;font-weight:800;color:${color};letter-spacing:-.5px">${value}</div>
    </div>`;
}

function renderBrackets(brackets, income, _totalTax) {
  return brackets.map((b, i) => {
    const bracketSize = b.max === Infinity ? income - b.min : b.max - b.min;
    const taxableInBracket = Math.max(0, Math.min(income, b.max === Infinity ? income : b.max) - b.min);
    const pct = bracketSize > 0 ? (taxableInBracket / bracketSize * 100) : 0;
    const taxInBracket = taxableInBracket * b.rate;
    const maxLabel = b.max === Infinity ? '+' : fmt(b.max);

    return `
      <div class="bracket-row" style="margin-bottom:10px">
        <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px">
          <span style="color:var(--sub)">${fmt(b.min)} - ${maxLabel}</span>
          <span style="display:flex;gap:12px">
            <span class="mono" style="color:var(--sub)">${(b.rate * 100).toFixed(1)}%</span>
            <span class="mono" style="font-weight:600;color:${taxableInBracket > 0 ? 'var(--text)' : 'var(--muted)'}">${fmt(taxInBracket)}</span>
          </span>
        </div>
        <div class="progress-bg" style="height:6px">
          <div class="progress-fill" style="width:${Math.min(100, pct)}%;background:${taxableInBracket > 0 ? bracketColor(i) : 'var(--muted)'}"></div>
        </div>
      </div>`;
  }).join('');
}

function bracketColor(index) {
  const colors = ['#10b981', '#6366f1', '#f59e0b', '#ec4899', '#ef4444', '#8b5cf6', '#14b8a6'];
  return colors[index % colors.length];
}

function getProvinceName(code) {
  const p = PROVINCES.find(p => p.code === code);
  return p ? p.name : code;
}
