import { icon } from '../icons.js';
import { h, fmt, uid } from '../helpers.js';
import { PROVINCES } from '../canadian/constants.js';
import {
  MARITAL_STATUSES, CITIZENSHIP_STATUSES, EMPLOYMENT_STATUSES,
  INCOME_CHANGE_OPTIONS, GOAL_TYPES, TIME_HORIZONS,
  EXPERIENCE_LEVELS, DROP_REACTIONS, INCOME_STABILITY_OPTIONS,
  EMERGENCY_FUND_OPTIONS, DOCUMENT_TYPES, ASSET_TYPES,
  PROPERTY_STATUSES, WILL_STATUSES, DISABILITY_OPTIONS,
  LIFE_INSURANCE_TYPES, RESP_STATUSES,
  computeRiskScore, ALLOCATION_MODELS,
} from '../canadian/advisor-constants.js';

// Module-level state
let currentStep = 0;
let initialized = false;
let stepDrafts = {};

const STEPS = [
  { key: 'personal', label: 'Personal Info', icon: 'user' },
  { key: 'employment', label: 'Employment & Income', icon: 'briefcase' },
  { key: 'goals', label: 'Goals & Priorities', icon: 'target' },
  { key: 'risk', label: 'Risk Assessment', icon: 'shield' },
  { key: 'assets', label: 'Assets & Accounts', icon: 'wallet' },
  { key: 'insurance', label: 'Insurance & Estate', icon: 'heart' },
  { key: 'documents', label: 'Documents', icon: 'folder-open' },
  { key: 'review', label: 'Review & Recs', icon: 'check-circle' },
];

export function getWizardStep() { return currentStep; }
export function setWizardStep(step) { currentStep = step; }

export function initWizard(state) {
  if (!initialized && state.settings) {
    currentStep = state.settings.last_wizard_step || 0;
    initialized = true;
  }
  stepDrafts = {};
}

export function updateWizardDraft(step, field, value) {
  if (!stepDrafts[step]) stepDrafts[step] = {};
  stepDrafts[step][field] = value;
}

export function getWizardDraft(step) {
  return stepDrafts[step] || {};
}

function selectOpts(list, selected, codeKey = 'code', nameKey = 'name') {
  return list.map(item => `<option value="${item[codeKey]}" ${item[codeKey] === selected ? 'selected' : ''}>${h(item[nameKey])}</option>`).join('');
}

function field(label, id, value, type = 'text', extra = '') {
  return `<div class="plan-field">
    <div class="input-label">${label}</div>
    <input class="input-field wizard-input" data-step="${STEPS[currentStep].key}" data-field="${id}" type="${type}" value="${h(String(value || ''))}" ${extra}>
  </div>`;
}

function selectField(label, id, options, selected) {
  return `<div class="plan-field">
    <div class="input-label">${label}</div>
    <select class="input-field wizard-input" data-step="${STEPS[currentStep].key}" data-field="${id}">
      <option value="">Select...</option>
      ${options}
    </select>
  </div>`;
}

// Step renderers
function renderStepPersonal(profile) {
  const p = { ...profile.personal, ...getWizardDraft('personal') };
  return `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
      ${field('Full Name', 'full_name', p.full_name)}
      ${field('Date of Birth', 'date_of_birth', p.date_of_birth, 'date')}
      ${selectField('Marital Status', 'marital_status', selectOpts(MARITAL_STATUSES, p.marital_status), p.marital_status)}
      ${field('Number of Dependents', 'dependents_count', p.dependents_count, 'number', 'min="0"')}
      ${selectField('Province / Territory', 'province', selectOpts(PROVINCES, p.province), p.province)}
      ${selectField('Citizenship Status', 'citizenship_status', selectOpts(CITIZENSHIP_STATUSES, p.citizenship_status), p.citizenship_status)}
      ${field('Email', 'email', p.email, 'email')}
      ${field('Phone', 'phone', p.phone, 'tel')}
    </div>
    ${+p.dependents_count > 0 ? `<div class="plan-field" style="margin-top:10px">
      <div class="input-label">Dependents Ages (comma-separated)</div>
      <input class="input-field wizard-input" data-step="personal" data-field="dependents_ages" value="${h(typeof p.dependents_ages === 'string' ? p.dependents_ages.replace(/[\[\]]/g, '') : (Array.isArray(p.dependents_ages) ? p.dependents_ages.join(', ') : ''))}">
    </div>` : ''}`;
}

function renderStepEmployment(profile) {
  const e = { ...profile.employment, ...getWizardDraft('employment') };
  return `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
      ${selectField('Employment Status', 'employment_status', selectOpts(EMPLOYMENT_STATUSES, e.employment_status), e.employment_status)}
      ${field('Employer Name', 'employer_name', e.employer_name)}
      ${field('Annual Gross Income ($)', 'annual_gross_income', e.annual_gross_income, 'number', 'min="0" step="1000"')}
      ${selectField('Expected Income Change', 'expected_income_change', selectOpts(INCOME_CHANGE_OPTIONS, e.expected_income_change), e.expected_income_change)}
    </div>
    <div style="margin-top:18px;font-weight:600;font-size:14px;margin-bottom:10px">Other Income Sources</div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px">
      ${field('Rental Income ($)', 'income_rental', e.income_rental, 'number', 'min="0"')}
      ${field('Pension Income ($)', 'income_pension', e.income_pension, 'number', 'min="0"')}
      ${field('Investment Income ($)', 'income_investment', e.income_investment, 'number', 'min="0"')}
      ${field('Government Benefits ($)', 'income_government', e.income_government, 'number', 'min="0"')}
      ${field('Other Income ($)', 'income_other', e.income_other, 'number', 'min="0"')}
    </div>`;
}

function renderStepGoals(profile) {
  const goals = profile.goals || [];
  const selectedTypes = goals.map(g => g.goal_type);
  const draft = getWizardDraft('goals');

  return `
    <div style="font-size:12px;color:var(--sub);margin-bottom:14px">Select the financial goals that matter most to you. Click to toggle, then set details.</div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:18px">
      ${GOAL_TYPES.map(gt => {
        const isSelected = selectedTypes.includes(gt.code);
        return `<button class="goal-toggle ${isSelected ? 'active' : ''}" data-action="wizard-toggle-goal" data-goal="${gt.code}">
          <div style="font-size:20px;margin-bottom:4px">${icon(gt.icon, 20, isSelected ? 'var(--accent)' : 'var(--sub)')}</div>
          <div style="font-size:11px;font-weight:${isSelected ? '600' : '400'}">${gt.name}</div>
        </button>`;
      }).join('')}
    </div>
    ${goals.length > 0 ? `
      <div style="font-weight:600;font-size:14px;margin-bottom:10px">Goal Details</div>
      ${goals.map((g, i) => {
        const gt = GOAL_TYPES.find(t => t.code === g.goal_type);
        return `<div class="goal-detail card" style="padding:14px;margin-bottom:8px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
            ${icon(gt?.icon || 'target', 16, 'var(--accent)')}
            <span style="font-weight:600;font-size:13px">${gt?.name || g.goal_type}</span>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">
            <div class="plan-field">
              <div class="input-label">Time Horizon</div>
              <select class="input-field wizard-input" data-step="goals" data-field="goal_horizon_${g.id}" style="font-size:12px">
                <option value="">Select...</option>
                ${TIME_HORIZONS.map(th => `<option value="${th.code}" ${g.time_horizon === th.code ? 'selected' : ''}>${th.name}</option>`).join('')}
              </select>
            </div>
            <div class="plan-field">
              <div class="input-label">Target Amount ($)</div>
              <input class="input-field wizard-input" data-step="goals" data-field="goal_amount_${g.id}" type="number" min="0" value="${g.target_amount || ''}" style="font-size:12px">
            </div>
            <div class="plan-field">
              <div class="input-label">Notes</div>
              <input class="input-field wizard-input" data-step="goals" data-field="goal_notes_${g.id}" value="${h(g.notes || '')}" style="font-size:12px">
            </div>
          </div>
        </div>`;
      }).join('')}
    ` : '<div class="empty">Select goals above to get started</div>'}`;
}

function renderStepRisk(profile) {
  const r = { ...profile.risk, ...getWizardDraft('risk') };
  const riskResult = computeRiskScore(r);

  function radioGroup(label, fieldName, options) {
    return `<div style="margin-bottom:18px">
      <div style="font-weight:600;font-size:13px;margin-bottom:8px">${label}</div>
      <div class="wizard-radio-group">
        ${options.map(opt => `
          <label class="wizard-radio ${r[fieldName] === opt.code ? 'active' : ''}">
            <input type="radio" name="${fieldName}" value="${opt.code}" ${r[fieldName] === opt.code ? 'checked' : ''}
              class="wizard-input" data-step="risk" data-field="${fieldName}" style="display:none">
            <span>${opt.name}</span>
          </label>
        `).join('')}
      </div>
    </div>`;
  }

  return `
    ${radioGroup('Investment Experience', 'investment_experience', EXPERIENCE_LEVELS)}
    ${radioGroup('If your portfolio dropped 20%, you would...', 'portfolio_drop_reaction', DROP_REACTIONS)}
    ${radioGroup('Investment Time Horizon', 'investment_time_horizon', TIME_HORIZONS)}
    ${radioGroup('Income Stability', 'income_stability', INCOME_STABILITY_OPTIONS)}
    ${radioGroup('Emergency Fund', 'emergency_fund_months', EMERGENCY_FUND_OPTIONS)}
    ${riskResult.label ? `
      <div class="card" style="padding:16px;background:var(--abg);border-color:${riskResult.color}33">
        <div style="display:flex;align-items:center;gap:12px">
          ${icon('shield', 24, riskResult.color)}
          <div>
            <div style="font-size:11px;color:var(--sub);text-transform:uppercase;letter-spacing:1px">Risk Profile</div>
            <div style="font-size:22px;font-weight:700;color:${riskResult.color}">${riskResult.label}</div>
            <div style="font-size:11px;color:var(--sub);margin-top:2px">Score: ${riskResult.numeric}/100</div>
          </div>
        </div>
        ${ALLOCATION_MODELS[riskResult.label] ? `
          <div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border)">
            <div style="font-size:11px;color:var(--sub);margin-bottom:6px">Suggested Asset Allocation</div>
            <div style="display:flex;gap:8px">
              <div style="flex:${ALLOCATION_MODELS[riskResult.label].equity};background:#10b981;border-radius:4px;padding:6px 8px;font-size:10px;color:#fff;text-align:center;min-width:30px">Equity ${ALLOCATION_MODELS[riskResult.label].equity}%</div>
              ${ALLOCATION_MODELS[riskResult.label].fixed > 0 ? `<div style="flex:${ALLOCATION_MODELS[riskResult.label].fixed};background:#3b82f6;border-radius:4px;padding:6px 8px;font-size:10px;color:#fff;text-align:center;min-width:30px">Fixed ${ALLOCATION_MODELS[riskResult.label].fixed}%</div>` : ''}
              ${ALLOCATION_MODELS[riskResult.label].cash > 0 ? `<div style="flex:${ALLOCATION_MODELS[riskResult.label].cash};background:#6b7280;border-radius:4px;padding:6px 8px;font-size:10px;color:#fff;text-align:center;min-width:30px">Cash ${ALLOCATION_MODELS[riskResult.label].cash}%</div>` : ''}
            </div>
            <div style="font-size:11px;color:var(--sub);margin-top:6px">${ALLOCATION_MODELS[riskResult.label].description}</div>
          </div>
        ` : ''}
      </div>
    ` : ''}`;
}

function renderStepAssets(profile) {
  const reg = { ...profile.registered, ...getWizardDraft('assets') };
  const assets = profile.assets || [];

  return `
    <div style="font-weight:600;font-size:14px;margin-bottom:10px">Registered Accounts</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:18px">
      <div class="plan-field">
        <div class="input-label">TFSA Contribution Room ($)</div>
        <input class="input-field wizard-input" data-step="assets" data-field="tfsa_room" type="number" min="0" value="${reg.tfsa_room || ''}">
      </div>
      <div class="plan-field">
        <div class="input-label">RRSP Contribution Room ($)</div>
        <input class="input-field wizard-input" data-step="assets" data-field="rrsp_room" type="number" min="0" value="${reg.rrsp_room || ''}">
      </div>
      ${selectField('RESP Status', 'resp_status', selectOpts(RESP_STATUSES, reg.resp_status), reg.resp_status)}
      <div class="plan-field">
        <div class="input-label" style="margin-bottom:8px">FHSA Eligible?</div>
        <label style="display:flex;align-items:center;gap:8px;font-size:12px;cursor:pointer">
          <input type="checkbox" class="wizard-input" data-step="assets" data-field="fhsa_eligible" ${reg.fhsa_eligible ? 'checked' : ''}>
          Yes, I'm a first-time home buyer
        </label>
      </div>
    </div>
    <div style="font-weight:600;font-size:14px;margin-bottom:6px">Property</div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin-bottom:18px">
      ${selectField('Property Status', 'property_status', selectOpts(PROPERTY_STATUSES, reg.property_status), reg.property_status)}
      <div class="plan-field">
        <div class="input-label">Home Value ($)</div>
        <input class="input-field wizard-input" data-step="assets" data-field="home_value" type="number" min="0" value="${reg.home_value || ''}">
      </div>
      <div class="plan-field">
        <div class="input-label">Mortgage Balance ($)</div>
        <input class="input-field wizard-input" data-step="assets" data-field="mortgage_balance" type="number" min="0" value="${reg.mortgage_balance || ''}">
      </div>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
      <span style="font-weight:600;font-size:14px">Other Assets</span>
      <button class="btn btn-secondary btn-sm" data-action="wizard-add-asset">${icon('plus', 13)} Add Asset</button>
    </div>
    ${assets.length === 0 ? '<div class="empty">No additional assets added</div>' : ''}
    ${assets.map(a => `
      <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:var(--input);border-radius:10px;margin-bottom:6px">
        <div style="flex:1">
          <div style="font-size:12px;font-weight:500">${h(a.description || a.asset_type)}${a.institution ? ` - ${h(a.institution)}` : ''}</div>
          <div style="font-size:10px;color:var(--sub)">${ASSET_TYPES.find(t => t.code === a.asset_type)?.name || a.asset_type}</div>
        </div>
        <span class="mono" style="font-size:13px;font-weight:600">${fmt(a.balance)}</span>
        <button class="edit-btn" data-action="wizard-delete-asset" data-id="${a.id}">${icon('trash-2', 13)}</button>
      </div>
    `).join('')}`;
}

function renderStepInsurance(profile) {
  const ins = { ...profile.insurance, ...getWizardDraft('insurance') };

  return `
    <div style="font-weight:600;font-size:14px;margin-bottom:10px">Life Insurance</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:18px">
      ${selectField('Life Insurance Type', 'life_insurance_type', selectOpts(LIFE_INSURANCE_TYPES, ins.life_insurance_type), ins.life_insurance_type)}
      <div class="plan-field">
        <div class="input-label">Coverage Amount ($)</div>
        <input class="input-field wizard-input" data-step="insurance" data-field="life_insurance_amount" type="number" min="0" value="${ins.life_insurance_amount || ''}">
      </div>
    </div>
    <div style="font-weight:600;font-size:14px;margin-bottom:10px">Other Insurance</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:18px">
      ${selectField('Disability Insurance', 'disability_insurance', selectOpts(DISABILITY_OPTIONS, ins.disability_insurance), ins.disability_insurance)}
      <div class="plan-field">
        <div class="input-label" style="margin-bottom:8px">Critical Illness Insurance</div>
        <label style="display:flex;align-items:center;gap:8px;font-size:12px;cursor:pointer">
          <input type="checkbox" class="wizard-input" data-step="insurance" data-field="critical_illness" ${ins.critical_illness ? 'checked' : ''}>
          Yes, I have critical illness coverage
        </label>
      </div>
      <div class="plan-field">
        <div class="input-label" style="margin-bottom:8px">Home / Tenant Insurance</div>
        <label style="display:flex;align-items:center;gap:8px;font-size:12px;cursor:pointer">
          <input type="checkbox" class="wizard-input" data-step="insurance" data-field="home_insurance" ${ins.home_insurance ? 'checked' : ''}>
          Yes, I have home/tenant insurance
        </label>
      </div>
    </div>
    <div style="font-weight:600;font-size:14px;margin-bottom:10px">Estate Planning</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px">
      ${selectField('Will Status', 'will_status', selectOpts(WILL_STATUSES, ins.will_status), ins.will_status)}
      <div class="plan-field">
        <div class="input-label" style="margin-bottom:8px">Power of Attorney</div>
        <label style="display:flex;align-items:center;gap:8px;font-size:12px;cursor:pointer">
          <input type="checkbox" class="wizard-input" data-step="insurance" data-field="power_of_attorney" ${ins.power_of_attorney ? 'checked' : ''}>
          Yes, POA is in place
        </label>
      </div>
    </div>
    <div class="plan-field">
      <div class="input-label">Emergency Contact</div>
      <input class="input-field wizard-input" data-step="insurance" data-field="emergency_contact" value="${h(ins.emergency_contact || '')}" placeholder="Name and phone number">
    </div>`;
}

function renderStepDocuments(profile) {
  const docs = profile.documents || [];

  return `
    <div style="font-size:12px;color:var(--sub);margin-bottom:14px">Upload supporting documents. Files are stored securely on your computer.</div>
    <div style="display:flex;gap:10px;margin-bottom:18px">
      <button class="btn btn-primary btn-sm" data-action="wizard-upload-doc">${icon('upload', 13)} Upload Document</button>
    </div>
    ${docs.length === 0 ? '<div class="empty">No documents uploaded yet</div>' : ''}
    ${docs.map(d => {
      const dt = DOCUMENT_TYPES.find(t => t.code === d.doc_type);
      const sizeStr = d.file_size > 1048576 ? `${(d.file_size / 1048576).toFixed(1)} MB` : `${Math.round(d.file_size / 1024)} KB`;
      return `<div class="doc-row">
        <div class="doc-icon">${icon('file-text', 16)}</div>
        <div style="flex:1">
          <div style="font-size:12px;font-weight:500">${h(d.original_name)}</div>
          <div style="font-size:10px;color:var(--sub)">${dt?.name || d.doc_type} - ${sizeStr} - ${d.upload_date?.slice(0, 10) || ''}</div>
          ${d.notes ? `<div style="font-size:10px;color:var(--muted);margin-top:2px">${h(d.notes)}</div>` : ''}
        </div>
        <button class="edit-btn" data-action="wizard-open-doc" data-filename="${h(d.filename)}" title="Open">${icon('eye', 13)}</button>
        <button class="edit-btn" data-action="wizard-delete-doc" data-id="${d.id}" title="Delete">${icon('trash-2', 13)}</button>
      </div>`;
    }).join('')}`;
}

function renderStepReview(profile, state) {
  const p = profile.personal || {};
  const e = profile.employment || {};
  const r = profile.risk || {};
  const reg = profile.registered || {};
  const ins = profile.insurance || {};
  const goals = profile.goals || [];
  const docs = profile.documents || [];
  const riskResult = computeRiskScore(r);

  const totalIncome = (e.annual_gross_income || 0) + (e.income_rental || 0) + (e.income_pension || 0) +
    (e.income_investment || 0) + (e.income_government || 0) + (e.income_other || 0);

  const recs = generateRecommendations(profile, state);

  return `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:18px">
      <div class="card summary-section">
        <div class="summary-section-title">${icon('user', 15)} Personal</div>
        <div style="font-size:12px;line-height:1.8">
          ${p.full_name ? `<b>${h(p.full_name)}</b><br>` : ''}
          ${p.date_of_birth ? `DOB: ${p.date_of_birth}<br>` : ''}
          ${p.marital_status ? `${MARITAL_STATUSES.find(m => m.code === p.marital_status)?.name || p.marital_status}<br>` : ''}
          ${p.dependents_count > 0 ? `${p.dependents_count} dependent(s)<br>` : ''}
          ${p.province ? `Province: ${PROVINCES.find(pr => pr.code === p.province)?.name || p.province}<br>` : ''}
          ${p.email ? `${h(p.email)}<br>` : ''}
          ${p.phone ? `${h(p.phone)}` : ''}
        </div>
      </div>
      <div class="card summary-section">
        <div class="summary-section-title">${icon('briefcase', 15)} Employment & Income</div>
        <div style="font-size:12px;line-height:1.8">
          ${e.employment_status ? `${EMPLOYMENT_STATUSES.find(s => s.code === e.employment_status)?.name || e.employment_status}<br>` : ''}
          ${e.employer_name ? `${h(e.employer_name)}<br>` : ''}
          Gross Income: <b>${fmt(e.annual_gross_income || 0)}</b><br>
          Total Income: <b>${fmt(totalIncome)}</b>
        </div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:18px">
      <div class="card summary-section">
        <div class="summary-section-title">${icon('target', 15)} Goals (${goals.length})</div>
        ${goals.length === 0 ? '<div style="font-size:12px;color:var(--sub)">No goals selected</div>' : ''}
        ${goals.map(g => {
          const gt = GOAL_TYPES.find(t => t.code === g.goal_type);
          return `<div style="font-size:12px;padding:4px 0;display:flex;justify-content:space-between">
            <span>${gt?.name || g.goal_type}</span>
            <span class="mono" style="color:var(--sub)">${g.target_amount ? fmt(g.target_amount) : ''} ${g.time_horizon || ''}</span>
          </div>`;
        }).join('')}
      </div>
      <div class="card summary-section">
        <div class="summary-section-title">${icon('shield', 15)} Risk Profile</div>
        ${riskResult.label ? `
          <div style="font-size:20px;font-weight:700;color:${riskResult.color};margin:8px 0">${riskResult.label}</div>
          <div style="font-size:11px;color:var(--sub)">Score: ${riskResult.numeric}/100</div>
        ` : '<div style="font-size:12px;color:var(--sub)">Not completed</div>'}
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:18px">
      <div class="card summary-section">
        <div class="summary-section-title">${icon('wallet', 15)} Assets & Accounts</div>
        <div style="font-size:12px;line-height:1.8">
          TFSA Room: <b>${fmt(reg.tfsa_room || 0)}</b><br>
          RRSP Room: <b>${fmt(reg.rrsp_room || 0)}</b><br>
          ${reg.property_status === 'owner' ? `Home Value: <b>${fmt(reg.home_value || 0)}</b><br>Mortgage: <b>${fmt(reg.mortgage_balance || 0)}</b>` : `Housing: ${PROPERTY_STATUSES.find(s => s.code === reg.property_status)?.name || 'Not specified'}`}
        </div>
      </div>
      <div class="card summary-section">
        <div class="summary-section-title">${icon('heart', 15)} Insurance & Estate</div>
        <div style="font-size:12px;line-height:1.8">
          Life Insurance: ${LIFE_INSURANCE_TYPES.find(t => t.code === ins.life_insurance_type)?.name || 'None'}<br>
          ${ins.life_insurance_amount > 0 ? `Coverage: <b>${fmt(ins.life_insurance_amount)}</b><br>` : ''}
          Disability: ${DISABILITY_OPTIONS.find(d => d.code === ins.disability_insurance)?.name || 'None'}<br>
          Will: ${WILL_STATUSES.find(w => w.code === ins.will_status)?.name || 'Not specified'}<br>
          POA: ${ins.power_of_attorney ? 'Yes' : 'No'}
        </div>
      </div>
    </div>
    ${docs.length > 0 ? `<div style="font-size:12px;color:var(--sub);margin-bottom:14px">${docs.length} document(s) uploaded</div>` : ''}
    ${recs.length > 0 ? `
      <div style="font-weight:700;font-size:16px;margin-bottom:12px;display:flex;align-items:center;gap:8px">${icon('lightbulb', 18, 'var(--accent)')} Personalized Recommendations</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        ${recs.map(r => `
          <div class="rec-card">
            <div class="rec-icon" style="background:${r.color}18">${icon(r.icon, 16, r.color)}</div>
            <div>
              <div style="font-weight:600;font-size:12px;margin-bottom:3px">${h(r.title)}</div>
              <div style="font-size:11px;color:var(--sub);line-height:1.5">${h(r.description)}</div>
            </div>
          </div>
        `).join('')}
      </div>
    ` : ''}
    <div style="text-align:center;margin-top:24px">
      <button class="btn btn-primary" style="padding:12px 32px;font-size:14px" data-action="wizard-complete-profile">
        ${icon('check-circle', 16)} Complete Profile
      </button>
    </div>`;
}

function generateRecommendations(profile, state) {
  const recs = [];
  const p = profile.personal || {};
  const e = profile.employment || {};
  const r = profile.risk || {};
  const reg = profile.registered || {};
  const ins = profile.insurance || {};
  const goals = profile.goals || [];
  const riskResult = computeRiskScore(r);

  // TFSA recommendation
  if (reg.tfsa_room > 0) {
    recs.push({
      title: 'Maximize TFSA First',
      description: `You have ${fmt(reg.tfsa_room)} in TFSA room. Tax-free growth should be your top priority. Consider automatic monthly contributions.`,
      icon: 'piggy-bank', color: '#10b981',
    });
  }

  // RRSP recommendation based on income
  if (e.annual_gross_income > 55000 && reg.rrsp_room > 0) {
    recs.push({
      title: 'RRSP Tax Deduction',
      description: `With ${fmt(e.annual_gross_income)} income, RRSP contributions give significant tax savings. You have ${fmt(reg.rrsp_room)} in room.`,
      icon: 'wallet', color: '#3b82f6',
    });
  }

  // FHSA recommendation
  const hasHomePurchaseGoal = goals.some(g => g.goal_type === 'home-purchase');
  if (reg.fhsa_eligible && hasHomePurchaseGoal) {
    recs.push({
      title: 'Open an FHSA',
      description: 'As a first-time home buyer, contribute up to $8,000/yr (lifetime $40,000) to your FHSA for tax-deductible, tax-free savings.',
      icon: 'home', color: '#6366f1',
    });
  }

  // Debt strategy
  if (state.debts && state.debts.length > 0) {
    const highRate = state.debts.filter(d => d.rate > 10);
    if (highRate.length > 0) {
      recs.push({
        title: 'Tackle High-Interest Debt',
        description: `You have ${highRate.length} debt(s) above 10% interest. Use the avalanche method - focus extra payments on the highest rate first.`,
        icon: 'trending-up', color: '#ef4444',
      });
    }
  }

  // Emergency fund
  if (r.emergency_fund_months === '0' || r.emergency_fund_months === '1-3') {
    recs.push({
      title: 'Build Emergency Fund',
      description: 'Aim for 3-6 months of expenses in a HISA. This protects against job loss, medical emergencies, and unexpected costs.',
      icon: 'shield', color: '#f59e0b',
    });
  }

  // Asset allocation based on risk
  if (riskResult.label && ALLOCATION_MODELS[riskResult.label]) {
    const model = ALLOCATION_MODELS[riskResult.label];
    recs.push({
      title: `${riskResult.label} Allocation`,
      description: `Target: ${model.equity}% equity, ${model.fixed}% fixed income, ${model.cash}% cash. ${model.description}.`,
      icon: 'bar-chart-3', color: riskResult.color,
    });
  }

  // Insurance gaps
  if (ins.life_insurance_type === 'none' || !ins.life_insurance_type) {
    if (p.dependents_count > 0 || p.marital_status === 'married' || p.marital_status === 'common-law') {
      recs.push({
        title: 'Consider Life Insurance',
        description: 'With dependents or a partner, term life insurance provides essential protection. A common rule: 10-12x your annual income.',
        icon: 'heart', color: '#ec4899',
      });
    }
  }

  // Will / estate
  if (ins.will_status !== 'current') {
    recs.push({
      title: 'Update Your Will',
      description: ins.will_status === 'none' ? 'Having a will is essential for protecting your family and assets. Consult an estate lawyer.' : 'Your will may be outdated. Review it to ensure it reflects your current wishes.',
      icon: 'clipboard-list', color: '#8b5cf6',
    });
  }

  // RESP recommendation
  if (p.dependents_count > 0 && (reg.resp_status === 'none' || !reg.resp_status)) {
    recs.push({
      title: 'Open an RESP',
      description: 'The government matches 20% of contributions (up to $500/yr per child via CESG). Start with $2,500/yr per child to maximize the grant.',
      icon: 'book-open', color: '#14b8a6',
    });
  }

  return recs;
}

export function renderAdvisorWizard(state, profile) {
  if (!profile) return '<div class="empty">Loading profile...</div>';

  const stepRenderers = [
    () => renderStepPersonal(profile),
    () => renderStepEmployment(profile),
    () => renderStepGoals(profile),
    () => renderStepRisk(profile),
    () => renderStepAssets(profile),
    () => renderStepInsurance(profile),
    () => renderStepDocuments(profile),
    () => renderStepReview(profile, state),
  ];

  const isReview = currentStep === STEPS.length - 1;

  return `
    <div class="wizard-container">
      <div class="wizard-steps">
        ${STEPS.map((s, i) => `
          <button class="wizard-step ${i === currentStep ? 'active' : ''} ${i < currentStep ? 'completed' : ''}"
            data-action="wizard-goto-step" data-step="${i}">
            <div class="wizard-step-num">${i < currentStep ? icon('check', 12) : i + 1}</div>
            <div class="wizard-step-label">${s.label}</div>
          </button>
        `).join('')}
      </div>
      <div class="card wizard-body">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:18px">
          ${icon(STEPS[currentStep].icon, 22, 'var(--accent)')}
          <div>
            <div style="font-size:18px;font-weight:700">${STEPS[currentStep].label}</div>
            <div style="font-size:11px;color:var(--sub)">Step ${currentStep + 1} of ${STEPS.length}</div>
          </div>
        </div>
        ${stepRenderers[currentStep]()}
        ${!isReview ? `
          <div class="wizard-nav">
            ${currentStep > 0 ? `<button class="btn btn-secondary" data-action="wizard-prev">${icon('arrow-up-right', 13, 'var(--sub)')} Previous</button>` : '<div></div>'}
            <div style="display:flex;gap:8px">
              <button class="btn btn-ghost" data-action="wizard-skip">Skip</button>
              <button class="btn btn-primary" data-action="wizard-save-step">${icon('check', 13)} Save & Continue</button>
            </div>
          </div>
        ` : ''}
      </div>
    </div>`;
}
