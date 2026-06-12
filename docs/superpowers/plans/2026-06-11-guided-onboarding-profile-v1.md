# Guided Onboarding Profile V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a focused first-run profile layer so onboarding captures the user's primary financial focus, computes a starter confidence tier, and shows focus-aware first actions.

**Architecture:** Keep the existing five-step onboarding flow. Add three settings columns, centralize deterministic onboarding profile logic in `src/renderer/js/utils/onboarding.js`, then have the shared onboarding handler persist the derived values and the onboarding component render them.

**Tech Stack:** Electron main process, SQL.js migrations, vanilla renderer modules, Jest, ESLint.

---

## File Structure

- Create: `src/main/migrations/013-guided-onboarding-profile.js`
  - Adds `settings.onboarding_focus`, `settings.onboarding_confidence`, and `settings.onboarding_completed_at`.
- Modify: `src/main/database.js`
  - Runs migration 013, returns defaults from `getSettings()`, and persists new settings in `updateSettings()`.
- Modify: `src/renderer/js/utils/onboarding.js`
  - Owns valid focus options, focus normalization, confidence calculation, confidence summaries, and focus-based fallback action selection.
- Modify: `src/renderer/js/handlers/shared.js`
  - Reads focus and numeric inputs from step 1, persists focus/confidence, keeps command-center refresh behavior, and stores completion timestamp.
- Modify: `src/renderer/js/components/onboarding-stepper.js`
  - Renders the compact focus selector on step 1 and the confidence/explanation on step 4.
- Modify: `tests/database-settings.test.js`
  - Covers the new database settings and explicit zero persistence.
- Modify: `tests/onboarding-utils.test.js`
  - Covers confidence calculation, summary fallback, and focus-based onboarding actions.
- Modify: `tests/shared-action-refresh.test.js`
  - Covers step 1 persistence and completion timestamp, preserving existing refresh tests.
- Create: `tests/onboarding-stepper.test.js`
  - Covers focus selector rendering and step 4 confidence copy.

---

### Task 1: Persist Guided Onboarding Settings

**Files:**
- Create: `src/main/migrations/013-guided-onboarding-profile.js`
- Modify: `src/main/database.js`
- Test: `tests/database-settings.test.js`

- [ ] **Step 1: Write the failing database tests**

Add these tests inside the existing `describe('WealthFlowDatabase onboarding settings', () => { ... })` block in `tests/database-settings.test.js`:

```js
  test('persists guided onboarding profile fields', () => {
    database.updateSettings({
      onboarding_focus: 'build_savings',
      onboarding_confidence: 'high',
      onboarding_completed_at: '2026-06-11T18:00:00.000Z',
    });

    const settings = database.getSettings();

    expect(settings.onboarding_focus).toBe('build_savings');
    expect(settings.onboarding_confidence).toBe('high');
    expect(settings.onboarding_completed_at).toBe('2026-06-11T18:00:00.000Z');
  });

  test('persists explicit zero onboarding estimates', () => {
    database.updateSettings({
      monthly_income: 5000,
      monthly_expenses: 3200,
      total_debt: 12000,
      savings_buffer: 1500,
    });

    database.updateSettings({
      monthly_income: 0,
      monthly_expenses: 0,
      total_debt: 0,
      savings_buffer: 0,
    });

    const settings = database.getSettings();

    expect(settings.monthly_income).toBe(0);
    expect(settings.monthly_expenses).toBe(0);
    expect(settings.total_debt).toBe(0);
    expect(settings.savings_buffer).toBe(0);
  });
```

- [ ] **Step 2: Run the database tests and verify the new settings test fails**

Run:

```powershell
npm test -- tests/database-settings.test.js
```

Expected: FAIL because `settings.onboarding_focus`, `settings.onboarding_confidence`, and `settings.onboarding_completed_at` are not persisted yet.

- [ ] **Step 3: Add migration 013**

Create `src/main/migrations/013-guided-onboarding-profile.js`:

```js
module.exports = {
  version: 13,
  name: '013-guided-onboarding-profile',
  up(db) {
    try { db.run('ALTER TABLE settings ADD COLUMN onboarding_focus TEXT DEFAULT NULL'); } catch { /* column may exist */ }
    try { db.run("ALTER TABLE settings ADD COLUMN onboarding_confidence TEXT DEFAULT 'starter'"); } catch { /* column may exist */ }
    try { db.run('ALTER TABLE settings ADD COLUMN onboarding_completed_at TEXT DEFAULT NULL'); } catch { /* column may exist */ }
  },
};
```

- [ ] **Step 4: Register migration 013 in `database.js`**

In `runMigrations()`, append the new migration after `012-onboarding-settings`:

```js
      require('./migrations/012-onboarding-settings'),
      require('./migrations/013-guided-onboarding-profile'),
```

- [ ] **Step 5: Add settings defaults in `getSettings()`**

In the no-row default object returned by `getSettings()`, add:

```js
        onboarding_focus: null,
        onboarding_confidence: 'starter',
        onboarding_completed_at: null,
```

After the normal `settings` object is built from `row`, normalize the new fields:

```js
    settings.onboarding_focus = settings.onboarding_focus || null;
    settings.onboarding_confidence = settings.onboarding_confidence || 'starter';
    settings.onboarding_completed_at = settings.onboarding_completed_at || null;
```

- [ ] **Step 6: Persist new settings in `updateSettings()`**

Replace the `UPDATE settings SET ...` SQL in `updateSettings()` with:

```js
      `UPDATE settings SET user_name = ?, dark_mode = ?, onboarded = ?, level = ?, xp = ?, province = ?, profile_completed = ?, last_wizard_step = ?, ai_api_key = ?, ai_model = ?, monthly_income = ?, monthly_expenses = ?, total_debt = ?, savings_buffer = ?, first_action_completed = ?, onboarding_focus = ?, onboarding_confidence = ?, onboarding_completed_at = ?, updated_at = datetime('now') WHERE id = 1`,
```

Add these values after the `first_action_completed` value in the parameter array:

```js
        data.onboarding_focus !== undefined ? data.onboarding_focus : current.onboarding_focus,
        data.onboarding_confidence ?? current.onboarding_confidence ?? 'starter',
        data.onboarding_completed_at !== undefined ? data.onboarding_completed_at : current.onboarding_completed_at,
```

- [ ] **Step 7: Run the database tests and verify they pass**

Run:

```powershell
npm test -- tests/database-settings.test.js
```

Expected: PASS.

- [ ] **Step 8: Commit Task 1**

Run:

```powershell
git add src/main/database.js src/main/migrations/013-guided-onboarding-profile.js tests/database-settings.test.js
git commit -m "Add guided onboarding settings persistence"
```

---

### Task 2: Add Onboarding Profile Utility Logic

**Files:**
- Modify: `src/renderer/js/utils/onboarding.js`
- Test: `tests/onboarding-utils.test.js`

- [ ] **Step 1: Write the failing onboarding utility tests**

Replace `tests/onboarding-utils.test.js` with:

```js
const {
  calculateOnboardingConfidence,
  getOnboardingConfidenceSummary,
  selectOnboardingActions,
} = require('../src/renderer/js/utils/onboarding.js');

describe('selectOnboardingActions', () => {
  test('uses open next-best actions from the first-run state', () => {
    const state = {
      settings: { onboarding_focus: 'reduce_debt' },
      nextBestActions: [
        { id: 'done', status: 'done', title: 'Completed action' },
        { id: 'open-1', status: 'open', title: 'Open action 1' },
        { id: 'open-2', status: 'open', title: 'Open action 2' },
        { id: 'open-3', status: 'open', title: 'Open action 3' },
        { id: 'open-4', status: 'open', title: 'Open action 4' },
      ],
    };

    const actions = selectOnboardingActions(state);

    expect(actions.map((a) => a.id)).toEqual(['open-1', 'open-2', 'open-3']);
  });

  test('uses focus-specific fallback actions when no open actions exist', () => {
    const actions = selectOnboardingActions({
      settings: { onboarding_focus: 'reduce_debt' },
      nextBestActions: [],
    });

    expect(actions).toHaveLength(3);
    expect(actions[0]).toMatchObject({
      title: 'List debts by interest rate before making extra payments',
      icon: 'credit-card',
      priority: 'high',
    });
    expect(actions[1].title).toBe('Complete your Financial Profile for sharper advice');
    expect(actions[2].title).toBe('Review your largest recurring expense');
  });

  test('falls back to generic starter action when focus is unknown', () => {
    const actions = selectOnboardingActions({
      settings: { onboarding_focus: 'unknown-focus' },
      nextBestActions: [],
    });

    expect(actions[0].title).toBe('Track your top 3 spending categories this week');
  });
});

describe('calculateOnboardingConfidence', () => {
  test('returns high when focus, cashflow, and a pressure signal are present', () => {
    expect(calculateOnboardingConfidence({
      onboarding_focus: 'build_savings',
      monthly_income: '0',
      monthly_expenses: '0',
      total_debt: '0',
      savings_buffer: '',
    })).toBe('high');
  });

  test('returns medium for partial but useful starter context', () => {
    expect(calculateOnboardingConfidence({
      onboarding_focus: 'plan_month',
      monthly_income: '4500',
      monthly_expenses: '',
      total_debt: '',
      savings_buffer: '',
    })).toBe('medium');

    expect(calculateOnboardingConfidence({
      onboarding_focus: '',
      monthly_income: '4500',
      monthly_expenses: '3200',
      total_debt: '',
      savings_buffer: '',
    })).toBe('medium');
  });

  test('returns starter when context is sparse', () => {
    expect(calculateOnboardingConfidence({
      onboarding_focus: '',
      monthly_income: '',
      monthly_expenses: '',
      total_debt: '',
      savings_buffer: '',
    })).toBe('starter');
  });
});

describe('getOnboardingConfidenceSummary', () => {
  test('returns labels and explanations for known confidence tiers', () => {
    expect(getOnboardingConfidenceSummary({ onboarding_confidence: 'high' })).toEqual({
      confidence: 'high',
      label: 'High',
      explanation: 'Based on your cashflow, buffer, and focus area.',
    });

    expect(getOnboardingConfidenceSummary({ onboarding_confidence: 'medium' })).toEqual({
      confidence: 'medium',
      label: 'Medium',
      explanation: 'Based on your starting estimates and focus area.',
    });
  });

  test('normalizes unknown confidence to starter', () => {
    expect(getOnboardingConfidenceSummary({ onboarding_confidence: 'unexpected' })).toEqual({
      confidence: 'starter',
      label: 'Starter',
      explanation: 'Based on a starter profile. Add more details any time for sharper actions.',
    });
  });
});
```

- [ ] **Step 2: Run the onboarding utility tests and verify they fail**

Run:

```powershell
npm test -- tests/onboarding-utils.test.js
```

Expected: FAIL because the new exports and focus-specific fallbacks do not exist yet.

- [ ] **Step 3: Replace onboarding utility implementation**

Replace `src/renderer/js/utils/onboarding.js` with:

```js
export const ONBOARDING_FOCUS_OPTIONS = [
  { value: 'improve_cashflow', label: 'Improve monthly cashflow' },
  { value: 'reduce_debt', label: 'Reduce debt' },
  { value: 'build_savings', label: 'Build a cash buffer' },
  { value: 'invest_more', label: 'Invest more' },
  { value: 'plan_month', label: 'Plan this month' },
];

const VALID_FOCUSES = new Set(ONBOARDING_FOCUS_OPTIONS.map((option) => option.value));
const VALID_CONFIDENCE = new Set(['high', 'medium', 'starter']);

const FOCUS_FALLBACK_ACTIONS = {
  improve_cashflow: { title: 'Check your top spending categories this week', icon: 'bar-chart-3', priority: 'high' },
  reduce_debt: { title: 'List debts by interest rate before making extra payments', icon: 'credit-card', priority: 'high' },
  build_savings: { title: 'Set a first cash-buffer target', icon: 'piggy-bank', priority: 'high' },
  invest_more: { title: 'Review TFSA, RRSP, or FHSA room before investing more', icon: 'trending-up', priority: 'high' },
  plan_month: { title: "Review this month's income, bills, and planned spending", icon: 'calendar', priority: 'high' },
};

const GENERIC_FIRST_ACTION = {
  title: 'Track your top 3 spending categories this week',
  icon: 'bar-chart-3',
  priority: 'high',
};

const SUPPORTING_FALLBACK_ACTIONS = [
  { title: 'Complete your Financial Profile for sharper advice', icon: 'user-check', priority: 'medium' },
  { title: 'Review your largest recurring expense', icon: 'repeat', priority: 'medium' },
];

const CONFIDENCE_SUMMARIES = {
  high: {
    confidence: 'high',
    label: 'High',
    explanation: 'Based on your cashflow, buffer, and focus area.',
  },
  medium: {
    confidence: 'medium',
    label: 'Medium',
    explanation: 'Based on your starting estimates and focus area.',
  },
  starter: {
    confidence: 'starter',
    label: 'Starter',
    explanation: 'Based on a starter profile. Add more details any time for sharper actions.',
  },
};

function getOpenOnboardingActions(state) {
  return (state?.nextBestActions || [])
    .filter(a => a.status === 'open')
    .slice(0, 3);
}

function hasTypedValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== '';
}

export function normalizeOnboardingFocus(focus) {
  return VALID_FOCUSES.has(focus) ? focus : null;
}

export function normalizeOnboardingConfidence(confidence) {
  return VALID_CONFIDENCE.has(confidence) ? confidence : 'starter';
}

export function calculateOnboardingConfidence(inputs = {}) {
  const focus = normalizeOnboardingFocus(inputs.onboarding_focus);
  const hasIncome = hasTypedValue(inputs.monthly_income);
  const hasExpenses = hasTypedValue(inputs.monthly_expenses);
  const hasDebt = hasTypedValue(inputs.total_debt);
  const hasSavings = hasTypedValue(inputs.savings_buffer);
  const estimateCount = [hasIncome, hasExpenses, hasDebt, hasSavings].filter(Boolean).length;

  if (focus && hasIncome && hasExpenses && (hasDebt || hasSavings)) return 'high';
  if ((focus && estimateCount > 0) || (hasIncome && hasExpenses)) return 'medium';
  return 'starter';
}

export function getOnboardingConfidenceSummary(settings = {}) {
  const confidence = normalizeOnboardingConfidence(settings.onboarding_confidence);
  return CONFIDENCE_SUMMARIES[confidence];
}

export function hasOpenOnboardingActions(state) {
  return getOpenOnboardingActions(state).length > 0;
}

export function selectOnboardingActions(state) {
  const actions = getOpenOnboardingActions(state);
  if (actions.length > 0) return actions;

  const focus = normalizeOnboardingFocus(state?.settings?.onboarding_focus);
  const firstAction = FOCUS_FALLBACK_ACTIONS[focus] || GENERIC_FIRST_ACTION;
  return [firstAction, ...SUPPORTING_FALLBACK_ACTIONS];
}
```

- [ ] **Step 4: Run the onboarding utility tests and verify they pass**

Run:

```powershell
npm test -- tests/onboarding-utils.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit Task 2**

Run:

```powershell
git add src/renderer/js/utils/onboarding.js tests/onboarding-utils.test.js
git commit -m "Add onboarding focus and confidence utilities"
```

---

### Task 3: Persist Step 1 Focus And Completion Timestamp

**Files:**
- Modify: `src/renderer/js/handlers/shared.js`
- Test: `tests/shared-action-refresh.test.js`

- [ ] **Step 1: Write the failing shared handler tests**

Add this import expectation by keeping the existing top-level mocks unchanged. Then add these tests inside `describe('handleSharedAction refresh actions', () => { ... })`:

```js
  test('persists onboarding focus and confidence from financial setup step', async () => {
    const elements = {
      'ob-name': { value: 'Alex' },
      'ob-province': { value: 'AB' },
      'ob-income': { value: '0' },
      'ob-expenses': { value: '0' },
      'ob-debt': { value: '0' },
      'ob-savings': { value: '' },
      'ob-api-key': { value: '' },
    };
    global.document = {
      getElementById: jest.fn((id) => elements[id] || null),
      querySelector: jest.fn((selector) => (
        selector === 'input[name="ob-focus"]:checked' ? { value: 'build_savings' } : null
      )),
      querySelectorAll: jest.fn(() => []),
    };
    const ctx = {
      State: {
        getState: jest.fn(() => ({ settings: { last_wizard_step: 1, user_name: '' } })),
        updateSettings: jest.fn().mockResolvedValue(),
      },
      render: jest.fn(),
    };

    const handled = await handleSharedAction('ob-next', {}, ctx);

    expect(handled).toBe(true);
    expect(ctx.State.updateSettings).toHaveBeenCalledWith({
      user_name: 'Alex',
      province: 'AB',
      monthly_income: 0,
      monthly_expenses: 0,
      total_debt: 0,
      onboarding_focus: 'build_savings',
      onboarding_confidence: 'high',
      last_wizard_step: 2,
    });
    expect(ctx.render).toHaveBeenCalledTimes(1);
  });

  test('stores onboarding completion timestamp', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-06-11T18:00:00.000Z'));

    const ctx = {
      State: {
        updateSettings: jest.fn().mockResolvedValue(),
      },
      render: jest.fn(),
    };

    const handled = await handleSharedAction('ob-complete', {}, ctx);

    expect(handled).toBe(true);
    expect(ctx.State.updateSettings).toHaveBeenCalledWith({
      onboarded: true,
      onboarding_completed_at: '2026-06-11T18:00:00.000Z',
    });
    expect(ctx.render).toHaveBeenCalledTimes(1);

    jest.useRealTimers();
  });
```

- [ ] **Step 2: Run the shared handler tests and verify the new tests fail**

Run:

```powershell
npm test -- tests/shared-action-refresh.test.js
```

Expected: FAIL because `ob-next` does not read focus or compute confidence, and `ob-complete` does not store a timestamp.

- [ ] **Step 3: Import onboarding utility helpers in `shared.js`**

Add this import below the existing utility imports:

```js
import {
  calculateOnboardingConfidence,
  normalizeOnboardingFocus,
} from '../utils/onboarding.js';
```

- [ ] **Step 4: Add local input helper functions in `shared.js`**

Add these functions below the imports and above `export async function handleSharedAction(...)`:

```js
function readOnboardingInput(id) {
  return document.getElementById(id)?.value ?? '';
}

function readNonNegativeNumber(value) {
  const trimmed = String(value ?? '').trim();
  if (trimmed === '') return null;
  const numeric = Number(trimmed);
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : null;
}
```

- [ ] **Step 5: Update the `ob-next` step 1 save logic**

Inside the existing `if (obStep === 1) { ... }` block, replace the current field-reading block with:

```js
        const name = readOnboardingInput('ob-name').trim();
        updates.user_name = name || s.user_name || 'User';
        updates.province = readOnboardingInput('ob-province') || 'AB';

        const income = readOnboardingInput('ob-income');
        const parsedIncome = readNonNegativeNumber(income);
        if (parsedIncome !== null) updates.monthly_income = parsedIncome;

        const expenses = readOnboardingInput('ob-expenses');
        const parsedExpenses = readNonNegativeNumber(expenses);
        if (parsedExpenses !== null) updates.monthly_expenses = parsedExpenses;

        const debt = readOnboardingInput('ob-debt');
        const parsedDebt = readNonNegativeNumber(debt);
        if (parsedDebt !== null) updates.total_debt = parsedDebt;

        const savings = readOnboardingInput('ob-savings');
        const parsedSavings = readNonNegativeNumber(savings);
        if (parsedSavings !== null) updates.savings_buffer = parsedSavings;

        const focus = normalizeOnboardingFocus(
          document.querySelector?.('input[name="ob-focus"]:checked')?.value
        );
        updates.onboarding_focus = focus;
        updates.onboarding_confidence = calculateOnboardingConfidence({
          onboarding_focus: focus,
          monthly_income: income,
          monthly_expenses: expenses,
          total_debt: debt,
          savings_buffer: savings,
        });

        const key = readOnboardingInput('ob-api-key').trim();
        if (key) updates.ai_api_key = key;
```

- [ ] **Step 6: Update the `ob-complete` handler**

Replace:

```js
      await State.updateSettings({ onboarded: true });
```

With:

```js
      await State.updateSettings({
        onboarded: true,
        onboarding_completed_at: new Date().toISOString(),
      });
```

- [ ] **Step 7: Run the shared handler tests and verify they pass**

Run:

```powershell
npm test -- tests/shared-action-refresh.test.js
```

Expected: PASS.

- [ ] **Step 8: Commit Task 3**

Run:

```powershell
git add src/renderer/js/handlers/shared.js tests/shared-action-refresh.test.js
git commit -m "Persist guided onboarding step state"
```

---

### Task 4: Render Focus Selection And Confidence Summary

**Files:**
- Modify: `src/renderer/js/components/onboarding-stepper.js`
- Test: `tests/onboarding-stepper.test.js`

- [ ] **Step 1: Write the failing component tests**

Create `tests/onboarding-stepper.test.js`:

```js
const { renderOnboardingStepper } = require('../src/renderer/js/components/onboarding-stepper.js');

describe('renderOnboardingStepper', () => {
  test('renders primary focus options on financial setup step', () => {
    const html = renderOnboardingStepper(1, {
      province: 'AB',
      onboarding_focus: 'reduce_debt',
    }, {});

    expect(html).toContain('What should WealthFlow help with first?');
    expect(html).toContain('name="ob-focus"');
    expect(html).toContain('value="reduce_debt" checked');
    expect(html).toContain('Reduce debt');
  });

  test('renders confidence summary on instant value step', () => {
    const html = renderOnboardingStepper(4, {}, {
      settings: {
        onboarding_confidence: 'medium',
        onboarding_focus: 'plan_month',
      },
      nextBestActions: [],
    });

    expect(html).toContain('Medium profile');
    expect(html).toContain('Based on your starting estimates and focus area.');
    expect(html).toContain("Review this month's income, bills, and planned spending");
  });
});
```

- [ ] **Step 2: Run the component tests and verify they fail**

Run:

```powershell
npm test -- tests/onboarding-stepper.test.js
```

Expected: FAIL because the focus selector and confidence summary are not rendered yet.

- [ ] **Step 3: Import onboarding UI helpers**

In `src/renderer/js/components/onboarding-stepper.js`, replace:

```js
import { selectOnboardingActions } from '../utils/onboarding.js';
```

With:

```js
import {
  getOnboardingConfidenceSummary,
  ONBOARDING_FOCUS_OPTIONS,
  selectOnboardingActions,
} from '../utils/onboarding.js';
```

- [ ] **Step 4: Add focus selector rendering to `renderStep1(settings)`**

After `provOptions` is defined, add:

```js
  const selectedFocus = settings?.onboarding_focus || '';
  const focusOptions = ONBOARDING_FOCUS_OPTIONS.map(option => `
    <label style="display:flex;align-items:center;gap:7px;padding:8px;border:1px solid ${selectedFocus === option.value ? 'var(--accent)' : 'var(--border)'};border-radius:6px;cursor:pointer;background:${selectedFocus === option.value ? 'var(--abg)' : 'transparent'}">
      <input type="radio" name="ob-focus" value="${h(option.value)}" ${selectedFocus === option.value ? 'checked' : ''} style="margin:0">
      <span style="font-size:12px;line-height:1.25">${h(option.label)}</span>
    </label>
  `).join('');
```

Add this block in the form after the savings/cash buffer field and before the Claude API key field:

```js
        <div>
          <div class="input-label">What should WealthFlow help with first?</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
            ${focusOptions}
          </div>
        </div>
```

- [ ] **Step 5: Add confidence summary rendering to `renderStep4(state)`**

At the start of `renderStep4(state)`, after `const displayActions = selectOnboardingActions(state);`, add:

```js
  const confidence = getOnboardingConfidenceSummary(state?.settings || {});
```

Replace the current subtitle under `Here are your top priorities right now` with:

```js
      <div style="display:inline-flex;align-items:center;gap:6px;padding:4px 8px;border:1px solid var(--border);border-radius:999px;font-size:11px;color:var(--accent);font-weight:700;margin:4px 0 8px">
        ${h(confidence.label)} profile
      </div>
      <div style="font-size:12px;color:var(--sub);margin-bottom:16px">
        ${h(confidence.explanation)}
      </div>
```

- [ ] **Step 6: Run the component tests and verify they pass**

Run:

```powershell
npm test -- tests/onboarding-stepper.test.js
```

Expected: PASS.

- [ ] **Step 7: Commit Task 4**

Run:

```powershell
git add src/renderer/js/components/onboarding-stepper.js tests/onboarding-stepper.test.js
git commit -m "Render guided onboarding profile cues"
```

---

### Task 5: Run Focused Regression Verification

**Files:**
- No source edits expected.
- Test files from Tasks 1-4.

- [ ] **Step 1: Run the focused Jest regression set**

Run:

```powershell
npm test -- tests/database-settings.test.js tests/onboarding-utils.test.js tests/shared-action-refresh.test.js tests/onboarding-stepper.test.js
```

Expected: PASS.

- [ ] **Step 2: Run touched-file ESLint**

Run:

```powershell
npx eslint src/main/database.js src/main/migrations/013-guided-onboarding-profile.js src/renderer/js/components/onboarding-stepper.js src/renderer/js/handlers/shared.js src/renderer/js/utils/onboarding.js
```

Expected: PASS, or warnings only if the repo's current ESLint config reports accepted warning-level issues. Fix any errors in touched files before continuing.

- [ ] **Step 3: Commit any verification fixes**

If Step 1 or Step 2 required code fixes, commit them:

```powershell
git add src/main/database.js src/main/migrations/013-guided-onboarding-profile.js src/renderer/js/components/onboarding-stepper.js src/renderer/js/handlers/shared.js src/renderer/js/utils/onboarding.js tests/database-settings.test.js tests/onboarding-utils.test.js tests/shared-action-refresh.test.js tests/onboarding-stepper.test.js
git commit -m "Stabilize guided onboarding verification"
```

If no fixes were needed, do not create a commit for this task.

---

### Task 6: Run Full Verification And Prepare Handoff

**Files:**
- No source edits expected.

- [ ] **Step 1: Run full Jest**

Run:

```powershell
npm test
```

Expected: PASS.

- [ ] **Step 2: Check branch status**

Run:

```powershell
git status --short --branch
```

Expected: the guided onboarding implementation files are committed. The existing untracked `AGENTS.md` may still appear and should remain untouched.

- [ ] **Step 3: Summarize implementation evidence**

Prepare the final handoff with:

- The branch name.
- The commits created.
- The focused Jest result.
- The full Jest result.
- Touched-file ESLint result.
- A note that `AGENTS.md` was left untouched if it remains untracked.

---

### Task 7: Preserve Saved Zero Estimates In Onboarding UI

**Files:**
- Modify: `src/renderer/js/components/onboarding-stepper.js`
- Test: `tests/onboarding-stepper.test.js`

- [ ] **Step 1: Add component regression tests**

Add tests proving saved zero estimates render as `0` when onboarding profile context exists, while untouched default zero estimates stay visually blank.

- [ ] **Step 2: Implement an explicit numeric display helper**

Add a helper that returns `''` for default zero settings with no onboarding profile signal, but returns `'0'` for real saved zeroes once focus, non-starter confidence, completion, or onboarded context exists.

- [ ] **Step 3: Run verification**

Run:

```powershell
npm test -- tests/onboarding-stepper.test.js
npm test -- tests/database-settings.test.js tests/onboarding-utils.test.js tests/shared-action-refresh.test.js tests/onboarding-stepper.test.js
```

- [ ] **Step 4: Commit**

```powershell
git add src/renderer/js/components/onboarding-stepper.js tests/onboarding-stepper.test.js docs/superpowers/plans/2026-06-11-guided-onboarding-profile-v1.md
git commit -m "Preserve saved onboarding zero estimates"
```
