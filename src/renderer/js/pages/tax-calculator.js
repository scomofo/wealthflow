import { icon } from '../icons.js';
import { fmt } from '../helpers.js';
import { PROVINCES, FEDERAL_TAX_BRACKETS_2026, PROVINCIAL_TAX_BRACKETS_2026, EMPLOYEE_TAX_AMOUNTS_2026 } from '../canadian/constants.js';
import { calculateTaxEstimate, calculateRRSPImpact, calculatePensionSplitComparison, normalizeTaxInputs } from '../canadian/tax-estimate.js';

let taxInputs = {
  employment: 0,
  other: 0,
  rrspDeduction: 0,
  province: 'AB',
  eligibleDividends: 0,
  nonEligibleDividends: 0,
  pensionSplitting: false,
  spouseIncome: 0,
  pensionIncome: 0,
  ageAtYearEnd: 0,
  disabilityApproved: false,
  spouseAmountEligible: false,
  cppBaseContributions: 0,
  eiPremiums: 0,
  enhancedCppDeduction: 0,
  spouseAgeAtYearEnd: 0,
  splitPensionCreditEligible: false,
};
let provinceInitialized = false;

export function updateTaxInput(field, value) {
  if (!Object.hasOwn(taxInputs, field)) return;
  taxInputs = normalizeTaxInputs({ ...taxInputs, [field]: value });
  if (field === 'province') provinceInitialized = true;
}

export function initTaxInputs(province) {
  if (!provinceInitialized) {
    taxInputs = normalizeTaxInputs({ ...taxInputs, province: province || 'AB' });
    provinceInitialized = true;
  }
}

export function renderTaxCalculator(_state) {
  const province = taxInputs.province;
  const estimate = calculateTaxEstimate(taxInputs);
  const { dividendCredit, taxableIncome, federalTax, provincialTax, totalTax, afterTax, effectiveRate, marginal } = estimate;
  const totalDividends = taxInputs.eligibleDividends + taxInputs.nonEligibleDividends;

  const { taxWithoutRRSP, savings: rrspSavings, benefitPercent: rrspBenefitPct } = calculateRRSPImpact(taxInputs);

  // Pension splitting
  const pensionSplit = taxInputs.pensionSplitting && taxInputs.pensionIncome > 0
    ? calculatePensionSplitComparison(taxInputs)
    : null;

  return `
    <div class="grid2 tax-calculator" style="gap:18px">
      <div>
        <div class="card" style="margin-bottom:14px">
          <div style="font-weight:700;font-size:15px;margin-bottom:16px">${icon('calculator', 16)} Income & Deductions</div>
          <label class="input-label" for="tax-province">Province</label>
          <select class="input-field tax-input" id="tax-province" data-field="province" style="margin-bottom:12px">
            ${PROVINCES.map(p => `<option value="${p.code}" ${p.code === province ? 'selected' : ''}>${p.name}</option>`).join('')}
          </select>
          <label class="input-label" for="tax-employment">Employment Income ($)</label>
          <input class="input-field tax-input" id="tax-employment" data-field="employment" type="number" min="0" step="100" value="${taxInputs.employment || ''}" placeholder="0" style="margin-bottom:12px">
          <label class="input-label" for="tax-other">Other Income ($)</label>
          <input class="input-field tax-input" id="tax-other" data-field="other" type="number" min="0" step="100" value="${taxInputs.other || ''}" placeholder="0" style="margin-bottom:4px">
          <div style="font-size:11px;color:var(--text);opacity:.78;margin-bottom:12px">Include taxable CPP/OAS here. Exclude dividends and the eligible pension entered below.</div>
          <label class="input-label" for="tax-pension">Eligible Pension Income ($)</label>
          <input class="input-field tax-input" id="tax-pension" data-field="pensionIncome" type="number" min="0" step="100" value="${taxInputs.pensionIncome || ''}" placeholder="0" style="margin-bottom:4px" aria-describedby="tax-pension-help">
          <div id="tax-pension-help" style="font-size:11px;color:var(--text);opacity:.78;margin-bottom:12px">Counted as income once, even without splitting. Enter only income eligible for the pension income amount; CPP/OAS and ordinary RRSP withdrawals do not qualify. RRIF/annuity eligibility depends on age or survivor status.</div>
          <label class="input-label" for="tax-rrsp">RRSP Deduction ($)</label>
          <input class="input-field tax-input" id="tax-rrsp" data-field="rrspDeduction" type="number" min="0" step="100" value="${taxInputs.rrspDeduction || ''}" placeholder="0" style="margin-bottom:4px">
          <div style="font-size:10px;color:var(--text);opacity:.78;margin-bottom:12px">Deducting RRSP contributions reduces your taxable income</div>

          <div style="border-top:1px solid var(--border);margin:12px 0;padding-top:12px">
            <div style="font-weight:600;font-size:13px;margin-bottom:10px">${icon('trending-up', 14)} Dividend Income</div>
            <label class="input-label" for="tax-eligible-div">Eligible Dividends ($)</label>
            <input class="input-field tax-input" id="tax-eligible-div" data-field="eligibleDividends" type="number" min="0" step="100" value="${taxInputs.eligibleDividends || ''}" placeholder="0" style="margin-bottom:8px">
            <label class="input-label" for="tax-noneligible-div">Non-Eligible Dividends ($)</label>
            <input class="input-field tax-input" id="tax-noneligible-div" data-field="nonEligibleDividends" type="number" min="0" step="100" value="${taxInputs.nonEligibleDividends || ''}" placeholder="0" style="margin-bottom:4px">
            <div style="font-size:10px;color:var(--text);opacity:.78;margin-bottom:12px">Eligible: from public corporations | Non-eligible: from CCPCs</div>
          </div>

          ${province === 'AB' ? renderAlbertaCreditInputs() : '<div style="font-size:11px;color:var(--text);opacity:.78;margin:12px 0">Additional personal credits and employee CPP/EI amounts are currently modeled for Alberta only.</div>'}

          <div style="border-top:1px solid var(--border);margin:12px 0;padding-top:12px">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
              <div style="font-weight:600;font-size:13px">${icon('users', 14)} Pension Income Splitting</div>
              <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:12px;color:var(--sub)">
                <input type="checkbox" class="tax-input" data-field="pensionSplitting" ${taxInputs.pensionSplitting ? 'checked' : ''} style="accent-color:var(--accent)"> Enable
              </label>
            </div>
            ${taxInputs.pensionSplitting ? `
              ${province !== 'AB' || !taxInputs.spouseAmountEligible ? spouseIncomeInput() : ''}
              <label class="input-label" for="tax-spouse-age">Spouse Age on December 31, 2026</label>
              <input class="input-field tax-input" id="tax-spouse-age" data-field="spouseAgeAtYearEnd" type="number" min="18" max="120" step="1" value="${taxInputs.spouseAgeAtYearEnd || ''}" placeholder="Optional" style="margin-bottom:8px">
              <label style="display:flex;align-items:start;gap:6px;font-size:12px;margin-bottom:8px">
                <input type="checkbox" class="tax-input" data-field="splitPensionCreditEligible" ${taxInputs.splitPensionCreditEligible ? 'checked' : ''}> Split income qualifies for my spouse's pension income amount (T1032 Step 4)
              </label>
              <div style="font-size:11px;color:var(--text);opacity:.78;margin-bottom:8px">Compares no split with a 50% split; it does not find the optimal percentage. Assumes spouse income is ordinary net/taxable income before splitting, with no other deductions or credits. Recipient pension-credit eligibility must be confirmed separately. Benefit/OAS recovery changes are excluded.</div>
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
              <div style="font-size:10px;color:var(--text);opacity:.78;margin-top:2px">${rrspBenefitPct.toFixed(1)}% effective benefit</div>
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
              <div style="font-size:10px;color:var(--text);opacity:.78;margin-top:2px">Added to taxable income</div>
            </div>
            <div>
              <div style="font-size:10px;color:var(--sub);text-transform:uppercase;letter-spacing:.5px">Taxable Dividend Amount</div>
              <div class="mono" style="font-size:15px;font-weight:700;margin-top:4px">${fmt(dividendCredit.taxableAmount)}</div>
              <div style="font-size:10px;color:var(--text);opacity:.78;margin-top:2px">Grossed-up amount</div>
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
              <div style="font-size:10px;color:var(--text);opacity:.78;margin-top:2px">50% of pension income</div>
            </div>
            <div>
              <div style="font-size:10px;color:var(--sub);text-transform:uppercase;letter-spacing:.5px">Tax Change from 50% Split</div>
              <div class="mono" style="font-size:15px;font-weight:700;color:var(--green);margin-top:4px">${fmt(pensionSplit.savings)}</div>
              <div style="font-size:10px;color:var(--text);opacity:.78;margin-top:2px">${pensionSplit.savings > 0 ? 'Estimated saving for this comparison' : pensionSplit.savings < 0 ? 'This split increases estimated tax' : 'No estimated tax change'}</div>
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
          ${resultCard('Income After Income Tax', fmt(afterTax), 'var(--green)')}
          ${resultCard('Effective Rate', effectiveRate.toFixed(2) + '%', '#f59e0b')}
          ${resultCard('Combined Bracket Rate', (marginal.combined * 100).toFixed(2) + '%', '#8b5cf6')}
        </div>

        ${province === 'AB' ? renderCreditBreakdown(estimate) : ''}

        <div class="card" style="margin-bottom:14px">
          <div style="font-weight:700;font-size:14px;margin-bottom:14px">Federal Tax Brackets (Before Credits)</div>
          ${renderBrackets(FEDERAL_TAX_BRACKETS_2026, taxableIncome, federalTax)}
        </div>

        ${PROVINCIAL_TAX_BRACKETS_2026[province] ? `
        <div class="card">
          <div style="font-weight:700;font-size:14px;margin-bottom:14px">${getProvinceName(province)} Tax Brackets (Before Credits)</div>
          ${renderBrackets(PROVINCIAL_TAX_BRACKETS_2026[province], taxableIncome, provincialTax)}
        </div>` : `
        <div class="card empty">
          Provincial tax brackets not available for this province/territory.
        </div>`}
      </div>
    </div>
    <div style="margin-top:12px;font-size:12px;color:var(--text);opacity:.78;line-height:1.5">
      2026 planning estimate only. Alberta includes the personal credits shown above, optional employee CPP/EI amounts, the Alberta supplemental credit and the federal top-up where applicable. Net income equals taxable income for the deductions modeled here. Other provinces retain basic-amount estimates. Credit phaseouts can change the incremental tax rate beyond the combined bracket rate. Income after income tax excludes payroll deductions and RRSP cash contributions. Caregiver/dependant claims, transfers, medical/donation/tuition credits, refundable benefits, OAS recovery, AMT and self-employment contributions are not modeled. Confirm filing decisions with CRA or a qualified tax professional.
    </div>
  `;
}

function spouseIncomeInput() {
  return `
    <label class="input-label" for="tax-spouse">Spouse / Partner Net Income Before Splitting ($)</label>
    <input class="input-field tax-input" id="tax-spouse" data-field="spouseIncome" type="number" min="0" step="100" value="${taxInputs.spouseIncome || ''}" placeholder="0" style="margin-bottom:8px">
  `;
}

function renderAlbertaCreditInputs() {
  return `
    <div style="border-top:1px solid var(--border);margin:12px 0;padding-top:12px">
      <div style="font-weight:600;font-size:13px;margin-bottom:10px">Federal + Alberta Personal Credits</div>
      <label class="input-label" for="tax-age">Your Age on December 31, 2026</label>
      <input class="input-field tax-input" id="tax-age" data-field="ageAtYearEnd" type="number" min="18" max="120" step="1" value="${taxInputs.ageAtYearEnd || ''}" placeholder="Optional" style="margin-bottom:8px">
      <label style="display:flex;align-items:start;gap:6px;font-size:12px;margin-bottom:8px">
        <input type="checkbox" class="tax-input" data-field="disabilityApproved" ${taxInputs.disabilityApproved ? 'checked' : ''}> I qualify for the adult disability amount (approved T2201)
      </label>
      <div style="font-size:11px;color:var(--text);opacity:.78;margin-bottom:8px">Enter an adult age to include the disability amount. Age credits apply from 65 and decrease as net income rises.</div>
      <label style="display:flex;align-items:start;gap:6px;font-size:12px;margin-bottom:8px">
        <input type="checkbox" class="tax-input" data-field="spouseAmountEligible" ${taxInputs.spouseAmountEligible ? 'checked' : ''}> I support my spouse / partner and qualify for the basic spouse amount
      </label>
      ${taxInputs.spouseAmountEligible ? spouseIncomeInput() : ''}
      <div style="font-size:11px;color:var(--text);opacity:.78;margin-bottom:12px">Spouse amount uses their net income. Caregiver supplements, eligible-dependant claims and unused-credit transfers require separate eligibility checks and are excluded.</div>
      <div style="font-weight:600;font-size:12px;margin-bottom:8px">Optional Employee CPP / EI Amounts</div>
      <label class="input-label" for="tax-cpp">Base CPP Credit Amount ($) — Line 30800</label>
      <input class="input-field tax-input" id="tax-cpp" data-field="cppBaseContributions" type="number" min="0" max="${EMPLOYEE_TAX_AMOUNTS_2026.cppBaseMax}" step="0.01" value="${taxInputs.cppBaseContributions || ''}" placeholder="0" style="margin-bottom:8px">
      <label class="input-label" for="tax-ei">EI Premiums ($) — Line 31200</label>
      <input class="input-field tax-input" id="tax-ei" data-field="eiPremiums" type="number" min="0" max="${EMPLOYEE_TAX_AMOUNTS_2026.eiMax}" step="0.01" value="${taxInputs.eiPremiums || ''}" placeholder="0" style="margin-bottom:8px">
      <label class="input-label" for="tax-enhanced-cpp">Enhanced CPP Deduction ($) — Line 22215</label>
      <input class="input-field tax-input" id="tax-enhanced-cpp" data-field="enhancedCppDeduction" type="number" min="0" max="${EMPLOYEE_TAX_AMOUNTS_2026.enhancedCppDeductionMax}" step="0.01" value="${taxInputs.enhancedCppDeduction || ''}" placeholder="0" style="margin-bottom:4px">
      <div style="font-size:11px;color:var(--text);opacity:.78">Use Schedule 8 / return claim amounts, not the full T4 CPP amount. Base CPP and EI reduce tax; enhanced CPP reduces income. Blank fields assume zero. Amounts are capped at 2026 employee maxima.</div>
    </div>
  `;
}

function renderCreditBreakdown(estimate) {
  const credits = estimate.credits;
  const names = { basic: 'Basic personal', age: 'Age', pension: 'Eligible pension', disability: 'Adult disability', spouse: 'Spouse / partner', employment: 'Canada employment', cpp: 'Base CPP', ei: 'EI premiums' };
  return `
    <div class="card" style="margin-bottom:14px">
      <div style="font-weight:700;font-size:14px;margin-bottom:10px">2026 Credit Breakdown</div>
      <div style="font-size:11px;color:var(--text);opacity:.78;line-height:1.5;margin-bottom:12px">Claim amounts below are multiplied by 14% federally and 8% in Alberta. Credits reduce tax only in their own jurisdiction and are capped by tax owing.</div>
      <table style="width:100%;font-size:12px;border-collapse:collapse">
        <caption style="text-align:left;font-size:11px;color:var(--sub);margin-bottom:6px">Eligible claim amounts</caption>
        <thead><tr><th scope="col" style="text-align:left">Claim</th><th scope="col" style="text-align:right">Federal</th><th scope="col" style="text-align:right">Alberta</th></tr></thead>
        <tbody>
          ${Object.entries(names).map(([key, name]) => `<tr><th scope="row" style="text-align:left;font-weight:400;padding:5px 0">${name}</th><td class="mono" style="text-align:right">${fmt(credits.federalAmounts[key] || 0)}</td><td class="mono" style="text-align:right">${fmt(credits.provincialAmounts[key] || 0)}</td></tr>`).join('')}
        </tbody>
      </table>
      <div style="border-top:1px solid var(--border);padding-top:10px;margin-top:8px;font-size:12px">
        ${creditRow('Federal top-up entitlement', credits.federalTopUp)}
        ${creditRow('Alberta supplemental entitlement', credits.supplementalCredit)}
        <div style="font-size:11px;color:var(--text);opacity:.78;line-height:1.5;margin:6px 0 12px">Alberta adds 2% of modeled eligible claim amounts above $61,200. Dividends, donations and tuition carryforwards do not increase this base. Entitlements can exceed the tax reduction available.</div>
        ${creditRow('Tax reduction beyond basic amounts (including dividends)', estimate.additionalCreditsUsed)}
        ${creditRow('Federal tax after credits', estimate.federalTax)}
        ${creditRow('Alberta tax after credits', estimate.provincialTax)}
        ${creditRow('Total income tax', estimate.totalTax)}
      </div>
    </div>
  `;
}

function creditRow(label, amount) {
  return `<div style="display:flex;justify-content:space-between;gap:12px;margin-bottom:8px"><span>${label}</span><span class="mono" style="white-space:nowrap">${fmt(amount)}</span></div>`;
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
