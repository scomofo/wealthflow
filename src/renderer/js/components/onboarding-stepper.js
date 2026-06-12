// WealthFlow — Onboarding Stepper component
// Redesigned for quick value delivery: positioning → quick setup → budgets → data choice → instant value

import { icon } from '../icons.js';
import { h } from '../helpers.js';
import { PROVINCES, CATEGORIES } from '../canadian/constants.js';
import {
  getOnboardingConfidenceSummary,
  ONBOARDING_FOCUS_OPTIONS,
  selectOnboardingActions,
} from '../utils/onboarding.js';

const OB_DEFAULT_BUDGETS = ['Food/Groceries', 'Transport', 'Utilities', 'Entertainment', 'Shopping', 'Housing'];

function stepDots(current) {
  const labels = ['Start', 'Setup', 'Budget', 'Data', 'Next Steps'];
  return `<div style="display:flex;align-items:center;justify-content:center;gap:4px;margin-bottom:28px">
    ${labels.map((label, i) => {
      const done = i < current;
      const active = i === current;
      return `<div style="display:flex;align-items:center;gap:4px">
        <div title="${label}" style="width:8px;height:8px;border-radius:50%;${done ? 'background:var(--accent)' : active ? 'background:var(--accent);box-shadow:0 0 0 3px var(--abg)' : 'background:var(--border)'}"></div>
        ${i < labels.length - 1 ? `<div style="width:20px;height:1px;background:${i < current ? 'var(--accent)' : 'var(--border)'}"></div>` : ''}
      </div>`;
    }).join('')}
  </div>`;
}

function logoBlock() {
  return `<div class="side-logo" style="width:52px;height:52px;border-radius:12px;font-size:22px;margin:0 auto 16px;display:flex;align-items:center;justify-content:center">W</div>`;
}

function hasOnboardingProfileSignal(settings) {
  return Boolean(
    settings?.onboarding_focus ||
    settings?.onboarding_completed_at ||
    settings?.onboarded ||
    (settings?.onboarding_confidence && settings.onboarding_confidence !== 'starter')
  );
}

function onboardingNumberValue(settings, field) {
  const value = settings?.[field];
  if (value === undefined || value === null || value === '') return '';
  if (Number(value) === 0 && !hasOnboardingProfileSignal(settings)) return '';
  return String(value);
}

function renderStep0() {
  return `
    <div style="text-align:center">
      ${logoBlock()}
      <div class="onboard-hero-title">WealthFlow helps you decide<br>what to do with your money</div>
      <div class="onboard-hero-subtitle">Not just track it</div>
      <div class="onboard-trust">
        <div class="onboard-trust-item">
          ${icon('lock', 13, 'var(--accent)')}
          <span>Your data stays private — stored locally on your device</span>
        </div>
        <div class="onboard-trust-item">
          ${icon('map-pin', 13, 'var(--accent)')}
          <span>Built for Canadian users — TFSA, RRSP, FHSA, provincial tax</span>
        </div>
        <div class="onboard-trust-item">
          ${icon('lightbulb', 13, 'var(--accent)')}
          <span>Guidance, not financial advice</span>
        </div>
      </div>
      <button class="btn btn-primary" style="width:100%;justify-content:center;margin-top:8px" data-action="ob-next">
        Get started ${icon('arrow-right', 14)}
      </button>
    </div>`;
}

function renderStep1(settings) {
  const provOptions = PROVINCES.map(p =>
    `<option value="${p.code}" ${(settings?.province || 'AB') === p.code ? 'selected' : ''}>${p.name}</option>`
  ).join('');
  const selectedFocus = settings?.onboarding_focus || '';
  const monthlyIncomeValue = onboardingNumberValue(settings, 'monthly_income');
  const monthlyExpensesValue = onboardingNumberValue(settings, 'monthly_expenses');
  const totalDebtValue = onboardingNumberValue(settings, 'total_debt');
  const savingsBufferValue = onboardingNumberValue(settings, 'savings_buffer');
  const focusOptions = ONBOARDING_FOCUS_OPTIONS.map(option => `
    <label style="display:flex;align-items:center;gap:7px;padding:8px;border:1px solid ${selectedFocus === option.value ? 'var(--accent)' : 'var(--border)'};border-radius:6px;cursor:pointer;background:${selectedFocus === option.value ? 'var(--abg)' : 'transparent'}">
      <input type="radio" name="ob-focus" value="${h(option.value)}" ${selectedFocus === option.value ? 'checked' : ''} style="margin:0">
      <span style="font-size:12px;line-height:1.25">${h(option.label)}</span>
    </label>
  `).join('');

  return `
    <div>
      <div style="font-size:17px;font-weight:700;margin-bottom:4px">Let's learn about your finances</div>
      <div style="color:var(--sub);font-size:12.5px;margin-bottom:18px">All fields optional — you can update these any time in Settings.</div>
      <div style="display:flex;flex-direction:column;gap:10px">
        <div>
          <div class="input-label">Your Name</div>
          <input class="input-field" id="ob-name" placeholder="e.g. Alex" value="${h(settings?.user_name || '')}">
        </div>
        <div>
          <div class="input-label">Province</div>
          <select class="input-field" id="ob-province">${provOptions}</select>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div>
            <div class="input-label">Monthly Income</div>
            <input class="input-field" id="ob-income" type="number" placeholder="e.g. 5000" value="${h(monthlyIncomeValue)}" min="0">
            <div style="font-size:10px;color:var(--muted);margin-top:2px">Use your after-tax monthly take-home if possible</div>
          </div>
          <div>
            <div class="input-label">Major Monthly Expenses</div>
            <input class="input-field" id="ob-expenses" type="number" placeholder="e.g. 3000" value="${h(monthlyExpensesValue)}" min="0">
            <div style="font-size:10px;color:var(--muted);margin-top:2px">A rough estimate is fine</div>
          </div>
        </div>
        <div>
          <div class="input-label">Total Debt <span style="color:var(--sub);font-weight:400">(optional)</span></div>
          <input class="input-field" id="ob-debt" type="number" placeholder="e.g. 15000" value="${h(totalDebtValue)}" min="0">
          <div style="font-size:10px;color:var(--muted);margin-top:2px">Optional — helps with payoff guidance</div>
        </div>
        <div style="margin-bottom:10px">
          <div class="input-label">Savings / Cash Buffer</div>
          <input class="input-field" id="ob-savings" type="number" placeholder="e.g. 3000" value="${h(savingsBufferValue)}" min="0">
          <div style="font-size:10px;color:var(--muted);margin-top:2px">Optional — useful for emergency fund decisions</div>
        </div>
        <div>
          <div class="input-label">What should WealthFlow help with first?</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
            ${focusOptions}
          </div>
        </div>
        <div>
          <div class="input-label">Claude API Key <span style="color:var(--sub);font-weight:400">(optional)</span></div>
          <input class="input-field" id="ob-api-key" type="password" placeholder="sk-ant-..." value="${h(settings?.ai_api_key || '')}">
          <div style="color:var(--sub);font-size:11px;margin-top:3px">Powers the AI financial advisor. Add later in Settings if you prefer.</div>
        </div>
      </div>
      <div style="font-size:11px;color:var(--muted);margin-top:12px;text-align:center">
        A rough estimate is enough to get started \u2014 you can refine later
      </div>
      <div style="display:flex;gap:8px;margin-top:16px">
        <button class="btn btn-ghost" style="flex:0 0 auto;justify-content:center" data-action="ob-prev">${icon('arrow-left', 14)}</button>
        <button class="btn btn-primary" style="flex:1;justify-content:center" data-action="ob-next">Continue ${icon('arrow-right', 14)}</button>
        <button class="btn btn-ghost" style="flex:0 0 auto;justify-content:center;font-size:12px" data-action="ob-next">Skip</button>
      </div>
    </div>`;
}

function renderStep2() {
  const cats = CATEGORIES.filter(c =>
    c !== 'Income' && c !== 'Investment Income' && c !== 'Government Benefits' && c !== 'GST/HST'
  );
  const checks = cats.map(c => `
    <label style="display:flex;align-items:center;gap:8px;padding:5px 0;cursor:pointer">
      <input type="checkbox" class="ob-budget-cat" value="${h(c)}" ${OB_DEFAULT_BUDGETS.includes(c) ? 'checked' : ''}>
      <span style="font-size:13px">${h(c)}</span>
    </label>`).join('');

  return `
    <div>
      <div style="font-size:17px;font-weight:700;margin-bottom:4px">Choose categories to track</div>
      <div style="color:var(--sub);font-size:12.5px;margin-bottom:14px">Select the spending areas most relevant to you.</div>
      <div style="max-height:220px;overflow-y:auto;padding:4px 0;border:1px solid var(--border);border-radius:4px;padding:8px 12px">${checks}</div>
      <div style="display:flex;gap:8px;margin-top:16px">
        <button class="btn btn-ghost" style="flex:0 0 auto;justify-content:center" data-action="ob-prev">${icon('arrow-left', 14)}</button>
        <button class="btn btn-primary" style="flex:1;justify-content:center" data-action="ob-next">Continue ${icon('arrow-right', 14)}</button>
      </div>
    </div>`;
}

function renderStep3() {
  return `
    <div style="text-align:center">
      <div style="font-size:17px;font-weight:700;margin-bottom:6px">How would you like to start?</div>
      <div style="color:var(--sub);font-size:12.5px;margin-bottom:20px">Sample data gives you a feel for the app. You can always reset later.</div>
      <div class="onboard-value-card onboard-highlight" style="margin-bottom:12px">
        <button class="btn btn-primary" style="width:100%;justify-content:center" data-action="start-sample">
          ${icon('sparkles', 15)} Start with Sample Data
        </button>
        <div style="font-size:11px;color:var(--sub);margin-top:6px">See your dashboard with realistic Canadian financial data</div>
      </div>
      <div class="onboard-value-card">
        <button class="btn btn-ghost" style="width:100%;justify-content:center" data-action="start-empty">
          ${icon('plus-circle', 14)} Start Fresh
        </button>
        <div style="font-size:11px;color:var(--sub);margin-top:6px">Begin with your own data — blank slate</div>
      </div>
      <button class="btn btn-ghost" style="margin-top:12px;font-size:12px;color:var(--sub)" data-action="ob-prev">
        ${icon('arrow-left', 12)} Back
      </button>
    </div>`;
}

function renderStep4(state) {
  const displayActions = selectOnboardingActions(state);
  const confidence = getOnboardingConfidenceSummary(state?.settings || {});

  const actionCards = displayActions.map((a, i) => `
    <div class="onboard-value-card${i === 0 ? ' onboard-highlight' : ''}" style="display:flex;align-items:flex-start;gap:10px">
      <div style="flex-shrink:0;width:28px;height:28px;border-radius:50%;background:var(--abg);display:flex;align-items:center;justify-content:center">
        ${icon(a.icon || 'lightbulb', 13, 'var(--accent)')}
      </div>
      <div style="flex:1">
        <div style="font-size:13px;font-weight:600;line-height:1.4">${h(a.title || '')}</div>
        ${i === 0 ? `<div style="font-size:11px;color:var(--accent);margin-top:2px;font-weight:600">Focus on this first</div>` : ''}
      </div>
    </div>`).join('');

  return `
    <div style="text-align:center">
      <div style="font-size:17px;font-weight:700;margin-bottom:4px">Here are your top priorities right now</div>
      <div style="display:inline-flex;align-items:center;gap:6px;padding:4px 8px;border:1px solid var(--border);border-radius:999px;font-size:11px;color:var(--accent);font-weight:700;margin:4px 0 8px">
        ${h(confidence.label)} profile
      </div>
      <div style="font-size:12px;color:var(--sub);margin-bottom:16px">
        ${h(confidence.explanation)}
      </div>
      <div style="text-align:left;margin-bottom:20px">
        ${actionCards}
      </div>
      <div style="font-size:11px;color:var(--sub);margin-bottom:8px">Focus Mode helps you complete this step without distractions</div>
      <div style="font-size:12px;color:var(--sub);margin-bottom:14px">↓ Start here — your dashboard is ready</div>
      <button class="btn btn-primary" style="width:100%;justify-content:center" data-action="ob-complete">
        Go to Dashboard ${icon('arrow-right', 14)}
      </button>
    </div>`;
}

export function renderOnboardingStepper(step, settings, state) {
  let body = '';
  if (step === 0) body = renderStep0();
  else if (step === 1) body = renderStep1(settings);
  else if (step === 2) body = renderStep2(settings);
  else if (step === 3) body = renderStep3();
  else if (step === 4) body = renderStep4(state);

  return `<div class="onboard">
    <div class="card onboard-card" style="max-width:460px">
      ${step > 0 ? stepDots(step) : ''}
      ${body}
    </div>
  </div>`;
}
