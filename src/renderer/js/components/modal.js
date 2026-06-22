import { icon } from '../icons.js';
import { CATS } from '../helpers.js';
import { CANADIAN_BANKS, INVESTMENT_TYPES, ACCOUNT_TYPES, CATEGORY_COLORS } from '../canadian/constants.js';

const sel = (options, value) => options.map(o => {
  const v = typeof o === 'string' ? o : o.code || o.value;
  const l = typeof o === 'string' ? o : o.name || o.label;
  return `<option value="${v}" ${v === value ? 'selected' : ''}>${l}</option>`;
}).join('');

export function getModalConfig(type, data) {
  const d = data || {};
  const isEdit = !!data;
  const today = new Date().toISOString().slice(0, 10);
  const isIncome = d.amount > 0;

  const configs = {
    tx: {
      title: isEdit ? 'Edit Transaction' : 'Add Transaction',
      html: `
        <div style="display:flex;gap:8px;margin-bottom:14px">
          <button class="btn ${!isIncome ? 'btn-primary' : 'btn-secondary'}" id="m-type-exp" data-action="set-tx-type" data-value="expense" style="flex:1">Expense</button>
          <button class="btn ${isIncome ? 'btn-primary' : 'btn-secondary'}" id="m-type-inc" data-action="set-tx-type" data-value="income" style="flex:1">Income</button>
        </div>
        <input type="hidden" id="m-type" value="${isIncome ? 'income' : 'expense'}">
        <label for="m-desc" class="input-label">Description</label>
        <input class="input-field" id="m-desc" placeholder="e.g. Tim Hortons" value="${d.description || ''}" style="margin-bottom:12px">
        <label for="m-amt" class="input-label">Amount ($)</label>
        <input class="input-field" id="m-amt" type="number" placeholder="0.00" step="0.01" value="${d.amount ? Math.abs(d.amount) : ''}" style="margin-bottom:12px">
        <label for="m-date" class="input-label">Date</label>
        <input class="input-field" id="m-date" type="date" value="${d.date || today}" style="margin-bottom:12px">
        <label for="m-cat" class="input-label">Category</label>
        <select class="input-field" id="m-cat" style="margin-bottom:14px">
          ${CATS.filter(c => c !== 'Income' && c !== 'Investment Income' && c !== 'Government Benefits').map(c => `<option ${c === d.category ? 'selected' : ''}>${c}</option>`).join('')}
        </select>`,
    },
    budget: {
      title: isEdit ? 'Edit Budget' : 'Add Budget',
      html: `
        <label for="m-bcat" class="input-label">Category</label>
        <select class="input-field" id="m-bcat" style="margin-bottom:12px" ${isEdit ? 'disabled' : ''}>
          ${CATS.filter(c => c !== 'Income' && c !== 'Investment Income' && c !== 'Government Benefits').map(c => `<option ${c === d.category ? 'selected' : ''}>${c}</option>`).join('')}
        </select>
        <label for="m-amt" class="input-label">Monthly Budget ($)</label>
        <input class="input-field" id="m-amt" type="number" placeholder="0.00" step="0.01" value="${d.amount || ''}" style="margin-bottom:12px">
        <label for="m-color" class="input-label">Color</label>
        <input class="input-field" id="m-color" type="color" value="${d.color || CATEGORY_COLORS[d.category] || '#6366f1'}" style="margin-bottom:14px;height:40px;padding:4px">`,
    },
    goal: {
      title: isEdit ? 'Edit Goal' : 'New Savings Goal',
      html: `
        <label for="m-name" class="input-label">Goal Name</label>
        <input class="input-field" id="m-name" placeholder="e.g. Emergency Fund" value="${d.name || ''}" style="margin-bottom:12px">
        <div style="display:flex;gap:12px;margin-bottom:12px">
          <div style="flex:1"><label for="m-target" class="input-label">Target ($)</label><input class="input-field" id="m-target" type="number" step="0.01" value="${d.target || ''}"></div>
          <div style="flex:1"><label for="m-cur" class="input-label">Saved ($)</label><input class="input-field" id="m-cur" type="number" step="0.01" value="${d.current || 0}"></div>
        </div>
        <label for="m-dl" class="input-label">Deadline</label>
        <input class="input-field" id="m-dl" type="date" value="${d.deadline || ''}" style="margin-bottom:14px">`,
    },
    debt: {
      title: isEdit ? 'Edit Debt' : 'Add Debt',
      html: `
        <label for="m-name" class="input-label">Name</label>
        <input class="input-field" id="m-name" placeholder="e.g. OSAP Student Loan" value="${d.name || ''}" style="margin-bottom:12px">
        <div style="display:flex;gap:12px;margin-bottom:12px">
          <div style="flex:1"><label for="m-bal" class="input-label">Balance ($)</label><input class="input-field" id="m-bal" type="number" step="0.01" value="${d.balance || ''}"></div>
          <div style="flex:1"><label for="m-rate" class="input-label">Rate (%)</label><input class="input-field" id="m-rate" type="number" step="0.01" value="${d.rate || ''}"></div>
        </div>
        <label for="m-min" class="input-label">Min Payment ($)</label>
        <input class="input-field" id="m-min" type="number" step="0.01" value="${d.min_payment || ''}" style="margin-bottom:12px">
        <label for="m-dtype" class="input-label">Type</label>
        <select class="input-field" id="m-dtype" style="margin-bottom:14px">
          ${sel([{code:'loan',name:'Loan'},{code:'credit',name:'Credit Card'},{code:'mortgage',name:'Mortgage'},{code:'line_of_credit',name:'Line of Credit'},{code:'other',name:'Other'}], d.type)}
        </select>`,
    },
    inv: {
      title: isEdit ? 'Edit Investment' : 'Add Investment',
      html: `
        <div style="display:flex;gap:12px;margin-bottom:12px">
          <div style="flex:1"><label for="m-sym" class="input-label">Symbol</label><input class="input-field" id="m-sym" placeholder="XEQT" value="${d.symbol || ''}"></div>
          <div style="flex:2"><label for="m-name" class="input-label">Name</label><input class="input-field" id="m-name" placeholder="iShares All-Equity ETF" value="${d.name || ''}"></div>
        </div>
        <div style="display:flex;gap:12px;margin-bottom:12px">
          <div style="flex:1"><label for="m-sh" class="input-label">Shares</label><input class="input-field" id="m-sh" type="number" step="0.001" value="${d.shares || ''}"></div>
          <div style="flex:1"><label for="m-avg" class="input-label">Avg Cost</label><input class="input-field" id="m-avg" type="number" step="0.01" value="${d.avg_cost || ''}"></div>
          <div style="flex:1"><label for="m-pr" class="input-label">Price</label><input class="input-field" id="m-pr" type="number" step="0.01" value="${d.current_price || ''}"></div>
        </div>
        <div style="display:flex;gap:12px;margin-bottom:12px">
          <div style="flex:1">
            <label for="m-itype" class="input-label">Type</label>
            <select class="input-field" id="m-itype">${sel(INVESTMENT_TYPES, d.type)}</select>
          </div>
          <div style="flex:1">
            <label for="m-acct" class="input-label">Account</label>
            <select class="input-field" id="m-acct">${sel(ACCOUNT_TYPES, d.account_type)}</select>
          </div>
        </div>
        <label for="m-inst" class="input-label">Institution</label>
        <select class="input-field" id="m-inst" style="margin-bottom:14px">
          <option value="">-- Select --</option>
          ${sel(CANADIAN_BANKS, d.institution)}
        </select>`,
    },
    bill: {
      title: isEdit ? 'Edit Reminder' : 'Add Reminder',
      html: `
        <label for="m-title" class="input-label">Title</label>
        <input class="input-field" id="m-title" placeholder="e.g. Rent" value="${d.title || ''}" style="margin-bottom:12px">
        <div style="display:flex;gap:12px;margin-bottom:12px">
          <div style="flex:1"><label for="m-amt" class="input-label">Amount ($)</label><input class="input-field" id="m-amt" type="number" step="0.01" value="${d.amount || ''}"></div>
          <div style="flex:1"><label for="m-date" class="input-label">Date</label><input class="input-field" id="m-date" type="date" value="${d.date || ''}"></div>
        </div>
        <div style="display:flex;gap:12px;margin-bottom:12px">
          <div style="flex:1">
            <label for="m-btype" class="input-label">Type</label>
            <select class="input-field" id="m-btype">
              ${sel([{code:'bill',name:'Bill'},{code:'income',name:'Income'},{code:'savings',name:'Savings'}], d.type)}
            </select>
          </div>
          <div style="flex:1">
            <label for="m-bcat" class="input-label">Category</label>
            <select class="input-field" id="m-bcat">
              ${CATS.map(c => `<option ${c === d.category ? 'selected' : ''}>${c}</option>`).join('')}
            </select>
          </div>
        </div>
        <div style="display:flex;gap:12px;margin-bottom:12px">
          <div style="flex:1">
            <label for="m-freq" class="input-label">Frequency</label>
            <select class="input-field" id="m-freq">
              ${sel([{code:'',name:'One-time'},{code:'weekly',name:'Weekly'},{code:'biweekly',name:'Bi-weekly'},{code:'monthly',name:'Monthly'},{code:'quarterly',name:'Quarterly'},{code:'annual',name:'Annual'}], d.frequency || '')}
            </select>
          </div>
          <div style="flex:1;display:flex;align-items:flex-end;padding-bottom:2px">
            <label style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--sub);cursor:pointer">
              <input type="checkbox" id="m-autogen" ${d.auto_generate ? 'checked' : ''}> Auto-generate transactions
            </label>
          </div>
        </div>`,
    },
    'tfsa-contribution': {
      title: 'Log TFSA Contribution',
      html: `
        <label for="m-amt" class="input-label">Amount ($)</label>
        <input class="input-field" id="m-amt" type="number" placeholder="0.00" step="0.01" style="margin-bottom:12px">
        <label for="m-date" class="input-label">Date</label>
        <input class="input-field" id="m-date" type="date" value="${today}" style="margin-bottom:12px">
        <label for="m-desc" class="input-label">Description</label>
        <input class="input-field" id="m-desc" placeholder="e.g. Monthly TFSA deposit" style="margin-bottom:12px">
        <label for="m-inst" class="input-label">Institution</label>
        <select class="input-field" id="m-inst" style="margin-bottom:14px">
          <option value="">-- Select --</option>
          ${CANADIAN_BANKS.map(b => `<option value="${b.code}">${b.name}</option>`).join('')}
        </select>`,
    },
    'rrsp-contribution': {
      title: 'Log RRSP Contribution',
      html: `
        <label for="m-amt" class="input-label">Amount ($)</label>
        <input class="input-field" id="m-amt" type="number" placeholder="0.00" step="0.01" style="margin-bottom:12px">
        <label for="m-date" class="input-label">Date</label>
        <input class="input-field" id="m-date" type="date" value="${today}" style="margin-bottom:12px">
        <label for="m-desc" class="input-label">Description</label>
        <input class="input-field" id="m-desc" placeholder="e.g. Bi-weekly RRSP deposit" style="margin-bottom:12px">
        <label for="m-inst" class="input-label">Institution</label>
        <select class="input-field" id="m-inst" style="margin-bottom:14px">
          <option value="">-- Select --</option>
          ${CANADIAN_BANKS.map(b => `<option value="${b.code}">${b.name}</option>`).join('')}
        </select>`,
    },
    'resp-contribution': {
      title: 'Log RESP Contribution',
      html: `
        <label for="m-amt" class="input-label">Amount ($)</label>
        <input class="input-field" id="m-amt" type="number" placeholder="0.00" step="0.01" style="margin-bottom:12px">
        <label for="m-date" class="input-label">Date</label>
        <input class="input-field" id="m-date" type="date" value="${today}" style="margin-bottom:12px">
        <label for="m-desc" class="input-label">Description</label>
        <input class="input-field" id="m-desc" placeholder="e.g. Annual RESP deposit" style="margin-bottom:12px">
        <label for="m-inst" class="input-label">Institution</label>
        <select class="input-field" id="m-inst" style="margin-bottom:14px">
          <option value="">-- Select --</option>
          ${CANADIAN_BANKS.map(b => `<option value="${b.code}">${b.name}</option>`).join('')}
        </select>`,
    },
    'fhsa-contribution': {
      title: 'Log FHSA Contribution',
      html: `
        <label for="m-amt" class="input-label">Amount ($)</label>
        <input class="input-field" id="m-amt" type="number" placeholder="0.00" step="0.01" style="margin-bottom:12px">
        <label for="m-date" class="input-label">Date</label>
        <input class="input-field" id="m-date" type="date" value="${today}" style="margin-bottom:12px">
        <label for="m-desc" class="input-label">Description</label>
        <input class="input-field" id="m-desc" placeholder="e.g. FHSA deposit" style="margin-bottom:12px">
        <label for="m-inst" class="input-label">Institution</label>
        <select class="input-field" id="m-inst" style="margin-bottom:14px">
          <option value="">-- Select --</option>
          ${CANADIAN_BANKS.map(b => `<option value="${b.code}">${b.name}</option>`).join('')}
        </select>`,
    },
    'contribution-room': {
      title: 'Set Contribution Room',
      html: `
        <div style="background:var(--input);border-radius:10px;padding:10px 14px;margin-bottom:14px;font-size:12px;color:var(--sub);line-height:1.5">
          Enter your known contribution room from CRA My Account. WealthFlow will track changes from this baseline.
        </div>
        <label for="m-acct-type" class="input-label">Account Type</label>
        <select class="input-field" id="m-acct-type" style="margin-bottom:12px">
          <option value="tfsa">TFSA</option>
          <option value="rrsp">RRSP</option>
          <option value="fhsa">FHSA</option>
        </select>
        <label for="m-room" class="input-label">Known Room ($)</label>
        <input class="input-field" id="m-room" type="number" placeholder="0.00" step="0.01" style="margin-bottom:12px">
        <label for="m-date" class="input-label">As-of Date</label>
        <input class="input-field" id="m-date" type="date" value="${today}" style="margin-bottom:12px">
        <label for="m-notes" class="input-label">Notes</label>
        <input class="input-field" id="m-notes" placeholder="e.g. From CRA My Account" style="margin-bottom:14px">`,
    },
    'resp-beneficiary': {
      title: 'Add RESP Beneficiary',
      html: `
        <label for="m-name" class="input-label">Child's Name</label>
        <input class="input-field" id="m-name" placeholder="e.g. Emma" style="margin-bottom:12px">
        <label for="m-birth-year" class="input-label">Birth Year</label>
        <input class="input-field" id="m-birth-year" type="number" placeholder="${new Date().getFullYear()}" style="margin-bottom:12px">
        <label for="m-total-contrib" class="input-label">Total Contributions to Date ($)</label>
        <input class="input-field" id="m-total-contrib" type="number" step="0.01" value="0" style="margin-bottom:12px">
        <label for="m-total-cesg" class="input-label">Total CESG Received ($)</label>
        <input class="input-field" id="m-total-cesg" type="number" step="0.01" value="0" style="margin-bottom:14px">`,
    },
    'gic': {
      title: 'Add GIC',
      html: `
        <label for="m-inst" class="input-label">Institution</label>
        <select class="input-field" id="m-inst" style="margin-bottom:12px">
          ${CANADIAN_BANKS.map(b => `<option value="${b.code}">${b.name}</option>`).join('')}
        </select>
        <div style="display:flex;gap:12px;margin-bottom:12px">
          <div style="flex:1"><label for="m-principal" class="input-label">Principal ($)</label><input class="input-field" id="m-principal" type="number" step="0.01"></div>
          <div style="flex:1"><label for="m-rate" class="input-label">Rate (%)</label><input class="input-field" id="m-rate" type="number" step="0.01"></div>
        </div>
        <label for="m-term" class="input-label">Term (months)</label>
        <input class="input-field" id="m-term" type="number" placeholder="12" style="margin-bottom:12px">
        <div style="display:flex;gap:12px;margin-bottom:12px">
          <div style="flex:1"><label for="m-purchase-date" class="input-label">Purchase Date</label><input class="input-field" id="m-purchase-date" type="date" value="${today}"></div>
          <div style="flex:1"><label for="m-maturity-date" class="input-label">Maturity Date</label><input class="input-field" id="m-maturity-date" type="date"></div>
        </div>
        <div style="display:flex;gap:12px;margin-bottom:12px">
          <div style="flex:1">
            <label for="m-acct" class="input-label">Account Type</label>
            <select class="input-field" id="m-acct">${ACCOUNT_TYPES.map(t => `<option value="${t.code}">${t.name}</option>`).join('')}</select>
          </div>
          <div style="flex:1;display:flex;align-items:flex-end;padding-bottom:2px">
            <label style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--sub);cursor:pointer">
              <input type="checkbox" id="m-cashable"> Cashable
            </label>
          </div>
        </div>`,
    },
    'residence': {
      title: isEdit && d.address ? 'Edit Residence' : 'Add Residence',
      html: `
        <label for="m-address" class="input-label">Address</label>
        <input class="input-field" id="m-address" placeholder="123 Main St, Calgary, AB" value="${d.address || ''}" style="margin-bottom:12px">
        <div style="display:flex;gap:12px;margin-bottom:12px">
          <div style="flex:1"><label for="m-purchase-price" class="input-label">Purchase Price ($)</label><input class="input-field" id="m-purchase-price" type="number" step="0.01" value="${d.purchase_price || ''}"></div>
          <div style="flex:1"><label for="m-current-value" class="input-label">Current Value ($)</label><input class="input-field" id="m-current-value" type="number" step="0.01" value="${d.current_value || ''}"></div>
        </div>
        <label for="m-purchase-date" class="input-label">Purchase Date</label>
        <input class="input-field" id="m-purchase-date" type="date" value="${d.purchase_date || ''}" style="margin-bottom:12px">
        <div style="display:flex;gap:12px;margin-bottom:12px">
          <div style="flex:1"><label for="m-mortgage-balance" class="input-label">Mortgage Balance ($)</label><input class="input-field" id="m-mortgage-balance" type="number" step="0.01" value="${d.mortgage_balance || ''}"></div>
          <div style="flex:1"><label for="m-mortgage-rate" class="input-label">Mortgage Rate (%)</label><input class="input-field" id="m-mortgage-rate" type="number" step="0.01" value="${d.mortgage_rate || ''}"></div>
        </div>
        <div style="display:flex;gap:12px;margin-bottom:12px">
          <div style="flex:1"><label for="m-mortgage-payment" class="input-label">Monthly Payment ($)</label><input class="input-field" id="m-mortgage-payment" type="number" step="0.01" value="${d.mortgage_payment || ''}"></div>
          <div style="flex:1"><label for="m-mortgage-amort" class="input-label">Amortization (months)</label><input class="input-field" id="m-mortgage-amort" type="number" value="${d.mortgage_amortization_months || ''}"></div>
        </div>
        <label for="m-property-tax" class="input-label">Annual Property Tax ($)</label>
        <input class="input-field" id="m-property-tax" type="number" step="0.01" value="${d.property_tax_annual || ''}" style="margin-bottom:12px">
        <div style="display:flex;gap:12px;margin-bottom:12px">
          <div style="flex:1"><label for="m-heloc-balance" class="input-label">HELOC Balance ($)</label><input class="input-field" id="m-heloc-balance" type="number" step="0.01" value="${d.heloc_balance || ''}"></div>
          <div style="flex:1"><label for="m-heloc-limit" class="input-label">HELOC Limit ($)</label><input class="input-field" id="m-heloc-limit" type="number" step="0.01" value="${d.heloc_limit || ''}"></div>
        </div>
        <div style="display:flex;gap:12px;margin-bottom:12px">
          <div style="flex:1"><label for="m-heloc-rate" class="input-label">HELOC Rate (%)</label><input class="input-field" id="m-heloc-rate" type="number" step="0.01" value="${d.heloc_rate || ''}"></div>
          <div style="flex:1;display:flex;align-items:flex-end;padding-bottom:2px">
            <label style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--sub);cursor:pointer">
              <input type="checkbox" id="m-pre-eligible" ${d.pre_eligible ? 'checked' : ''}> PRE Eligible
            </label>
          </div>
        </div>
        <label for="m-notes" class="input-label">Notes</label>
        <textarea class="input-field" id="m-notes" rows="2" style="margin-bottom:4px">${d.notes || ''}</textarea>`,
    },
  };
  return configs[type] || null;
}

export function renderModal(type, data) {
  // Custom modal: data provides title and body directly, no save button
  if (type === '_custom' && data) {
    return `<div class="modal-overlay" data-action="close-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div class="modal">
        <div class="modal-head">
          <div class="modal-title" id="modal-title">${data.title || ''}</div>
          <button style="background:none;border:none;color:var(--sub)" data-action="close-modal" aria-label="Close dialog">${icon('x', 18)}</button>
        </div>
        ${data.body || ''}
      </div>
    </div>`;
  }

  const config = getModalConfig(type, data);
  if (!config) return '';
  return `<div class="modal-overlay" data-action="close-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
    <div class="modal">
      <div class="modal-head">
        <div class="modal-title" id="modal-title">${config.title}</div>
        <button style="background:none;border:none;color:var(--sub)" data-action="close-modal" aria-label="Close dialog">${icon('x', 18)}</button>
      </div>
      ${config.html}
      <button class="btn btn-primary" style="width:100%;justify-content:center;margin-top:4px" data-action="save-modal" data-modal-type="${type}">
        ${icon('check', 16)} Save
      </button>
    </div>
  </div>`;
}
