# Can I Afford This V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a deterministic Planning-page affordability workflow that returns a clear purchase verdict and saveable next action.

**Architecture:** Build a pure renderer utility for affordability rules, then wire it into the existing Planning page and Plan handler. Render results through the existing decision-card component so save-action behavior stays unchanged.

**Tech Stack:** Electron renderer modules, vanilla JavaScript, existing Planning page patterns, Jest, ESLint.

---

## File Structure

- Create: `src/renderer/js/utils/affordability.js`
  - Pure deterministic affordability engine. Normalizes purchase inputs and returns a decision-card-compatible result.
- Create: `tests/affordability-engine.test.js`
  - Unit tests for one-time, monthly, invalid, and normalization rules.
- Modify: `src/renderer/js/components/ai-decision-card.js`
  - Add `affordability_check` label.
- Create: `tests/ai-decision-card.test.js`
  - Verifies the affordability workflow label renders and save attributes remain compatible.
- Modify: `src/renderer/js/pages/planning.js`
  - Adds affordability inputs, result rendering, and exported helpers for the Plan handler.
- Create: `tests/planning-affordability.test.js`
  - Verifies Planning page UI and result rendering.
- Modify: `src/renderer/js/handlers/plan.js`
  - Adds `run-affordability-check` action.
- Create: `tests/plan-handler-affordability.test.js`
  - Verifies handler computes and renders the affordability decision.

---

### Task 1: Affordability Engine

**Files:**
- Create: `src/renderer/js/utils/affordability.js`
- Test: `tests/affordability-engine.test.js`

- [ ] **Step 1: Write failing engine tests**

Create `tests/affordability-engine.test.js`:

```js
const {
  evaluateAffordability,
  normalizeAffordabilityPurchase,
} = require('../src/renderer/js/utils/affordability.js');

const baseFinancials = {
  income: 5000,
  expenses: 3000,
  totalSaved: 12000,
  totalDebt: 2000,
};

function run(purchase, financials = baseFinancials) {
  return evaluateAffordability({
    purchase,
    financials,
    state: { budgets: [], goals: [], debts: [] },
  });
}

describe('normalizeAffordabilityPurchase', () => {
  test('normalizes unknown and missing fields conservatively', () => {
    expect(normalizeAffordabilityPurchase({
      name: '',
      amount: '1200',
      frequency: 'bad',
      category: '',
      timing: 'later',
    })).toEqual({
      name: 'this purchase',
      amount: 1200,
      frequency: 'one_time',
      category: 'General',
      timing: 'now',
    });
  });

  test('marks negative and non-finite amounts invalid', () => {
    expect(normalizeAffordabilityPurchase({ amount: '-1' }).amount).toBe(null);
    expect(normalizeAffordabilityPurchase({ amount: 'abc' }).amount).toBe(null);
    expect(normalizeAffordabilityPurchase({ amount: 0 }).amount).toBe(0);
  });
});

describe('evaluateAffordability one-time purchase', () => {
  test('returns yes when buffer remains healthy', () => {
    const result = run({ name: 'bike', amount: 500, frequency: 'one_time', category: 'Shopping', timing: 'now' });
    expect(result.verdict).toBe('yes');
    expect(result.summary).toBe('Yes - this looks affordable.');
    expect(result.next_actions).toHaveLength(1);
    expect(result.workflow_type).toBe('affordability_check');
  });

  test('returns yes_adjust when purchase uses more than 30 percent of buffer', () => {
    const result = run({ amount: 4000, frequency: 'one_time' });
    expect(result.verdict).toBe('yes_adjust');
    expect(result.summary).toBe('Yes, but adjust your plan first.');
  });

  test('returns not_yet when buffer would fall below three months of expenses', () => {
    const result = run({ amount: 4500, frequency: 'one_time' });
    expect(result.verdict).toBe('not_yet');
    expect(result.summary).toBe('Not yet - wait until your buffer improves.');
  });

  test('returns no when buffer would fall below one month of expenses', () => {
    const result = run({ amount: 10000, frequency: 'one_time' });
    expect(result.verdict).toBe('no');
    expect(result.summary).toBe('No - this creates too much risk right now.');
  });

  test('returns invalid result for missing or zero amount', () => {
    const result = run({ amount: 0, frequency: 'one_time' });
    expect(result.verdict).toBe('invalid');
    expect(result.next_actions).toEqual([]);
    expect(result.recommendation.primary_action).toContain('Enter an amount');
  });
});

describe('evaluateAffordability monthly commitment', () => {
  test('returns yes when recurring amount uses little surplus', () => {
    const result = run({ amount: 200, frequency: 'monthly' });
    expect(result.verdict).toBe('yes');
  });

  test('returns yes_adjust when recurring amount uses more than 25 percent of surplus', () => {
    const result = run({ amount: 600, frequency: 'monthly' });
    expect(result.verdict).toBe('yes_adjust');
  });

  test('returns not_yet when recurring amount uses more than 50 percent of surplus', () => {
    const result = run({ amount: 1200, frequency: 'monthly' });
    expect(result.verdict).toBe('not_yet');
  });

  test('returns no when recurring amount exceeds surplus', () => {
    const result = run({ amount: 2500, frequency: 'monthly' });
    expect(result.verdict).toBe('no');
  });

  test('returns no when monthly surplus is not positive', () => {
    const result = run(
      { amount: 100, frequency: 'monthly' },
      { income: 3000, expenses: 3200, totalSaved: 2000, totalDebt: 0 }
    );
    expect(result.verdict).toBe('no');
  });
});
```

- [ ] **Step 2: Run engine tests and verify they fail**

Run:

```powershell
npm test -- tests/affordability-engine.test.js
```

Expected: FAIL because `src/renderer/js/utils/affordability.js` does not exist.

- [ ] **Step 3: Create affordability engine**

Create `src/renderer/js/utils/affordability.js`:

```js
const DEFAULT_DISCLAIMER = 'This is general educational guidance, not financial advice.';

const VERDICT_SUMMARIES = {
  yes: 'Yes - this looks affordable.',
  yes_adjust: 'Yes, but adjust your plan first.',
  not_yet: 'Not yet - wait until your buffer improves.',
  no: 'No - this creates too much risk right now.',
  invalid: 'Enter an amount to check affordability.',
};

const VALID_FREQUENCIES = new Set(['one_time', 'monthly']);
const VALID_TIMINGS = new Set(['now', 'this_month', 'next_month']);

function money(value) {
  return '$' + Math.round(value || 0).toLocaleString('en-CA');
}

function toNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function cleanText(value, fallback) {
  const text = String(value || '').trim();
  return text || fallback;
}

export function normalizeAffordabilityPurchase(purchase = {}) {
  const amount = toNumber(purchase.amount);
  return {
    name: cleanText(purchase.name, 'this purchase'),
    amount: amount !== null && amount >= 0 ? amount : null,
    frequency: VALID_FREQUENCIES.has(purchase.frequency) ? purchase.frequency : 'one_time',
    category: cleanText(purchase.category, 'General'),
    timing: VALID_TIMINGS.has(purchase.timing) ? purchase.timing : 'now',
  };
}

function buildAction(verdict, purchase, targetText) {
  const actions = {
    yes: {
      title: `Buy ${purchase.name} only if planned bills are covered`,
      priority: 'low',
      impact: 'Keeps the decision tied to your current plan',
    },
    yes_adjust: {
      title: targetText || `Set aside a buffer before buying ${purchase.name}`,
      priority: 'medium',
      impact: 'Protects your cash buffer',
    },
    not_yet: {
      title: targetText || `Wait before buying ${purchase.name}`,
      priority: 'medium',
      impact: 'Avoids weakening your financial buffer',
    },
    no: {
      title: `Do not buy ${purchase.name} until cashflow improves`,
      priority: 'high',
      impact: 'Avoids adding financial stress',
    },
  }[verdict];

  if (!actions) return [];
  return [{ ...actions, type: 'affordability' }];
}

function resultFor(verdict, purchase, metrics, details = {}) {
  const summary = VERDICT_SUMMARIES[verdict];
  const targetText = details.targetText || '';
  const why = details.why || [];
  const tradeoffs = details.tradeoffs || [];

  return {
    workflow_type: 'affordability_check',
    verdict,
    summary,
    recommendation: {
      primary_action: details.primaryAction || summary,
    },
    why,
    tradeoffs,
    next_actions: buildAction(verdict, purchase, targetText),
    confidence: details.confidence || 'medium',
    disclaimer: DEFAULT_DISCLAIMER,
    _deterministic: true,
    source_payload: {
      purchase,
      metrics,
    },
  };
}

function invalidResult(purchase) {
  return {
    workflow_type: 'affordability_check',
    verdict: 'invalid',
    summary: VERDICT_SUMMARIES.invalid,
    recommendation: { primary_action: 'Enter an amount greater than $0 to check this decision.' },
    why: ['There is no purchase amount to evaluate yet.'],
    tradeoffs: [],
    next_actions: [],
    confidence: 'low',
    disclaimer: DEFAULT_DISCLAIMER,
    _deterministic: true,
    source_payload: { purchase },
  };
}

function calculateMetrics(financials = {}) {
  const income = Number(financials.income) || 0;
  const expenses = Number(financials.expenses) || 0;
  const totalSaved = Number(financials.totalSaved) || 0;
  const totalDebt = Number(financials.totalDebt) || 0;
  const monthlySurplus = income - expenses;
  return {
    income,
    expenses,
    totalSaved,
    totalDebt,
    monthlySurplus,
    bufferMonths: totalSaved / Math.max(expenses, 1),
    debtPressure: income > 0 && totalDebt > income * 3,
  };
}

function evaluateOneTime(purchase, metrics) {
  const remainingBuffer = metrics.totalSaved - purchase.amount;
  const bufferUse = purchase.amount / Math.max(metrics.totalSaved, 1);
  const why = [
    `This would use about ${Math.round(bufferUse * 100)}% of your current cash buffer.`,
    `Your buffer after purchase would be about ${money(Math.max(remainingBuffer, 0))}.`,
  ];
  const tradeoffs = [];
  let verdict = 'yes';
  let primaryAction = `You can consider buying ${purchase.name} if planned bills are covered.`;
  let targetText = '';

  if (metrics.totalSaved === 0 && purchase.amount > 0) {
    verdict = 'no';
    primaryAction = `Wait on ${purchase.name} until you have cash set aside.`;
  } else if (remainingBuffer < metrics.expenses) {
    verdict = 'no';
    primaryAction = `Do not buy ${purchase.name} until your one-month buffer is protected.`;
  } else if (remainingBuffer < metrics.expenses * 3) {
    verdict = 'not_yet';
    primaryAction = `Delay ${purchase.name} until your buffer is closer to three months of expenses.`;
    targetText = `Wait until your cash buffer reaches ${money(metrics.expenses * 3)}`;
  } else if (bufferUse > 0.3) {
    verdict = 'yes_adjust';
    primaryAction = `Set aside extra cash before buying ${purchase.name}.`;
    targetText = `Set aside a buffer before buying ${purchase.name}`;
  }

  if (bufferUse > 0.3) tradeoffs.push('Buying now may slow emergency fund progress.');
  if (purchase.timing === 'next_month' && verdict !== 'no') tradeoffs.push('Waiting one month gives you more time to protect cashflow.');

  return resultFor(verdict, purchase, metrics, { why, tradeoffs, primaryAction, targetText });
}

function evaluateMonthly(purchase, metrics) {
  const pressure = purchase.amount / Math.max(metrics.monthlySurplus, 1);
  const why = [
    `Your estimated monthly surplus is ${money(metrics.monthlySurplus)}.`,
    `This commitment would use about ${Math.round(pressure * 100)}% of that surplus.`,
  ];
  const tradeoffs = [];
  let verdict = 'yes';
  let primaryAction = `You can consider adding ${purchase.name} if bills and savings stay on track.`;
  let targetText = '';

  if (metrics.monthlySurplus <= 0 || purchase.amount > metrics.monthlySurplus) {
    verdict = 'no';
    primaryAction = `Do not add ${purchase.name} until monthly cashflow improves.`;
  } else if (pressure > 0.5) {
    verdict = 'not_yet';
    primaryAction = `Wait before adding ${purchase.name}; it uses too much monthly surplus.`;
    targetText = `Wait until monthly surplus can cover ${purchase.name} comfortably`;
  } else if (pressure > 0.25 || (metrics.debtPressure && pressure > 0.15)) {
    verdict = 'yes_adjust';
    primaryAction = `Adjust spending before adding ${purchase.name}.`;
    targetText = `Reduce another expense before adding ${purchase.name}`;
  }

  if (metrics.debtPressure) tradeoffs.push('Existing debt makes new monthly commitments riskier.');
  if (pressure > 0.25) tradeoffs.push('This may reduce room for savings or debt payments.');
  if (purchase.timing === 'next_month' && verdict !== 'no') tradeoffs.push('Waiting one month gives you more time to confirm cashflow.');

  return resultFor(verdict, purchase, metrics, { why, tradeoffs, primaryAction, targetText });
}

export function evaluateAffordability({ purchase, financials } = {}) {
  const normalized = normalizeAffordabilityPurchase(purchase);
  if (!normalized.amount || normalized.amount <= 0) return invalidResult(normalized);

  const metrics = calculateMetrics(financials);
  if (normalized.frequency === 'monthly') return evaluateMonthly(normalized, metrics);
  return evaluateOneTime(normalized, metrics);
}
```

- [ ] **Step 4: Run engine tests and verify they pass**

Run:

```powershell
npm test -- tests/affordability-engine.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit Task 1**

```powershell
git add src/renderer/js/utils/affordability.js tests/affordability-engine.test.js
git commit -m "Add deterministic affordability engine"
```

---

### Task 2: Decision Card Compatibility

**Files:**
- Modify: `src/renderer/js/components/ai-decision-card.js`
- Create: `tests/ai-decision-card.test.js`

- [ ] **Step 1: Write failing decision-card tests**

Create `tests/ai-decision-card.test.js`:

```js
const { renderDecisionCard } = require('../src/renderer/js/components/ai-decision-card.js');

describe('renderDecisionCard affordability workflow', () => {
  test('renders affordability label and save attributes', () => {
    const html = renderDecisionCard({
      workflow_type: 'affordability_check',
      summary: 'Yes - this looks affordable.',
      recommendation: { primary_action: 'Buy only if bills are covered.' },
      why: ['Your buffer stays healthy.'],
      tradeoffs: ['It may slow a savings goal.'],
      next_actions: [{
        title: 'Buy this only if planned bills are covered',
        type: 'affordability',
        priority: 'low',
        impact: 'Keeps the decision tied to your current plan',
      }],
      confidence: 'medium',
      disclaimer: 'General guidance.',
    });

    expect(html).toContain('Can I Afford This?');
    expect(html).toContain('data-workflow="affordability_check"');
    expect(html).toContain('data-type="affordability"');
    expect(html).toContain('Buy this only if planned bills are covered');
  });
});
```

- [ ] **Step 2: Run decision-card test and verify it fails**

Run:

```powershell
npm test -- tests/ai-decision-card.test.js
```

Expected: FAIL because the workflow label is not defined yet.

- [ ] **Step 3: Add affordability workflow label**

In `src/renderer/js/components/ai-decision-card.js`, add:

```js
  affordability_check: 'Can I Afford This?',
```

to `WORKFLOW_LABELS`.

- [ ] **Step 4: Run decision-card test and verify it passes**

Run:

```powershell
npm test -- tests/ai-decision-card.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit Task 2**

```powershell
git add src/renderer/js/components/ai-decision-card.js tests/ai-decision-card.test.js
git commit -m "Label affordability decision cards"
```

---

### Task 3: Planning Page Affordability Card

**Files:**
- Modify: `src/renderer/js/pages/planning.js`
- Create: `tests/planning-affordability.test.js`

- [ ] **Step 1: Write failing Planning page tests**

Create `tests/planning-affordability.test.js`:

```js
const {
  renderPlanning,
  runAffordabilityCheck,
  updatePlanInput,
} = require('../src/renderer/js/pages/planning.js');

const state = { transactions: [], debts: [], goals: [], budgets: [] };

describe('Planning affordability card', () => {
  beforeEach(() => {
    updatePlanInput('affordabilityName', '');
    updatePlanInput('affordabilityAmount', '');
    updatePlanInput('affordabilityFrequency', 'one_time');
    updatePlanInput('affordabilityCategory', 'General');
    updatePlanInput('affordabilityTiming', 'now');
  });

  test('renders affordability inputs and action button', () => {
    const html = renderPlanning(state);

    expect(html).toContain('Can I afford this?');
    expect(html).toContain('data-field="affordabilityName"');
    expect(html).toContain('data-field="affordabilityAmount"');
    expect(html).toContain('data-action="run-affordability-check"');
  });

  test('renders affordability result after running check', () => {
    updatePlanInput('affordabilityName', 'New bike');
    updatePlanInput('affordabilityAmount', '500');
    updatePlanInput('affordabilityFrequency', 'one_time');

    runAffordabilityCheck(state, {
      income: 5000,
      expenses: 3000,
      totalSaved: 12000,
      totalDebt: 0,
    });

    const html = renderPlanning(state);

    expect(html).toContain('Can I Afford This?');
    expect(html).toContain('Yes - this looks affordable.');
    expect(html).toContain('New bike');
  });
});
```

- [ ] **Step 2: Run Planning page tests and verify they fail**

Run:

```powershell
npm test -- tests/planning-affordability.test.js
```

Expected: FAIL because the card and exported helper do not exist yet.

- [ ] **Step 3: Import helpers and categories**

In `src/renderer/js/pages/planning.js`, change the imports:

```js
import { fmt, h } from '../helpers.js';
import { CATEGORIES } from '../canadian/constants.js';
import { renderDecisionCard } from '../components/ai-decision-card.js';
import { evaluateAffordability } from '../utils/affordability.js';
```

Keep the existing calculator imports.

- [ ] **Step 4: Extend `planInputs` and add result state**

Add these fields to `planInputs`:

```js
  affordabilityName: '',
  affordabilityAmount: '',
  affordabilityFrequency: 'one_time',
  affordabilityCategory: 'General',
  affordabilityTiming: 'now',
```

Add below `planInputs`:

```js
let affordabilityResult = null;

const AFFORDABILITY_SELECT_FIELDS = new Set([
  'affordabilityFrequency',
  'affordabilityCategory',
  'affordabilityTiming',
]);

const AFFORDABILITY_TEXT_FIELDS = new Set([
  'affordabilityName',
  'affordabilityAmount',
]);
```

- [ ] **Step 5: Update `updatePlanInput`**

Replace the current `updatePlanInput` function with:

```js
export function updatePlanInput(field, value) {
  if (field === 'mortgage_frequency' || AFFORDABILITY_SELECT_FIELDS.has(field) || AFFORDABILITY_TEXT_FIELDS.has(field)) {
    planInputs[field] = value;
  } else {
    planInputs[field] = parseFloat(value) || 0;
  }

  if (field && field.startsWith('affordability')) {
    affordabilityResult = null;
  }
}
```

- [ ] **Step 6: Add run helper and card renderer**

Add these functions before `renderPlanning(state)`:

```js
export function runAffordabilityCheck(state, financials) {
  affordabilityResult = evaluateAffordability({
    purchase: {
      name: planInputs.affordabilityName,
      amount: planInputs.affordabilityAmount,
      frequency: planInputs.affordabilityFrequency,
      category: planInputs.affordabilityCategory,
      timing: planInputs.affordabilityTiming,
    },
    financials,
    state,
  });
  return affordabilityResult;
}

function renderAffordabilityCard() {
  const categoryOptions = ['General', ...CATEGORIES.filter(c =>
    c !== 'Income' && c !== 'Investment Income' && c !== 'Government Benefits' && c !== 'GST/HST'
  )];

  return `
    <div class="card" style="margin-bottom:14px">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px">
        <div>
          <div style="font-weight:700;font-size:15px">${icon('calculator', 16)} Can I afford this?</div>
          <div style="font-size:11px;color:var(--sub);margin-top:3px">Check a purchase or monthly commitment against your current cashflow.</div>
        </div>
        <button class="btn btn-primary" data-action="run-affordability-check">${icon('lightbulb', 14)} Check affordability</button>
      </div>
      <div style="display:grid;grid-template-columns:1.2fr .8fr .8fr .8fr .8fr;gap:10px;margin-bottom:12px">
        <div>
          <div class="input-label">Purchase</div>
          <input class="input-field plan-input" data-field="affordabilityName" value="${h(planInputs.affordabilityName)}" placeholder="e.g. New bike">
        </div>
        <div>
          <div class="input-label">Amount</div>
          <input class="input-field plan-input" data-field="affordabilityAmount" type="number" min="0" value="${h(String(planInputs.affordabilityAmount))}" placeholder="1200">
        </div>
        <div>
          <div class="input-label">Frequency</div>
          <select class="input-field plan-input" data-field="affordabilityFrequency">
            <option value="one_time" ${planInputs.affordabilityFrequency === 'one_time' ? 'selected' : ''}>One-time</option>
            <option value="monthly" ${planInputs.affordabilityFrequency === 'monthly' ? 'selected' : ''}>Monthly</option>
          </select>
        </div>
        <div>
          <div class="input-label">Category</div>
          <select class="input-field plan-input" data-field="affordabilityCategory">
            ${categoryOptions.map(c => `<option value="${h(c)}" ${planInputs.affordabilityCategory === c ? 'selected' : ''}>${h(c)}</option>`).join('')}
          </select>
        </div>
        <div>
          <div class="input-label">Timing</div>
          <select class="input-field plan-input" data-field="affordabilityTiming">
            <option value="now" ${planInputs.affordabilityTiming === 'now' ? 'selected' : ''}>Now</option>
            <option value="this_month" ${planInputs.affordabilityTiming === 'this_month' ? 'selected' : ''}>This month</option>
            <option value="next_month" ${planInputs.affordabilityTiming === 'next_month' ? 'selected' : ''}>Next month</option>
          </select>
        </div>
      </div>
      ${affordabilityResult ? renderDecisionCard(affordabilityResult) : '<div style="font-size:11px;color:var(--sub)">Enter a purchase and check affordability to see a decision.</div>'}
    </div>`;
}
```

- [ ] **Step 7: Insert affordability card in Planning page**

In `renderPlanning(state)`, insert:

```js
    ${renderAffordabilityCard()}
```

after the existing Debt vs Investing workflow button block and before the first `grid2`.

- [ ] **Step 8: Run Planning page tests and verify they pass**

Run:

```powershell
npm test -- tests/planning-affordability.test.js
```

Expected: PASS.

- [ ] **Step 9: Commit Task 3**

```powershell
git add src/renderer/js/pages/planning.js tests/planning-affordability.test.js
git commit -m "Add affordability card to planning"
```

---

### Task 4: Plan Handler Action

**Files:**
- Modify: `src/renderer/js/handlers/plan.js`
- Test: `tests/plan-handler-affordability.test.js`

- [ ] **Step 1: Write failing handler test**

Create `tests/plan-handler-affordability.test.js`:

```js
jest.mock('../src/renderer/js/pages/planning.js', () => ({
  runAffordabilityCheck: jest.fn(() => ({ workflow_type: 'affordability_check', summary: 'Yes - this looks affordable.' })),
}));

jest.mock('../src/renderer/js/utils/export-import.js', () => ({
  exportJSON: jest.fn(),
  exportCSV: jest.fn(),
  importFile: jest.fn(),
  applyImport: jest.fn(),
  applyHoldingsImport: jest.fn(),
  checkDuplicates: jest.fn(),
  aiCategorizeImport: jest.fn(),
  saveImportHistory: jest.fn(),
  exportPDF: jest.fn(),
  reconcileAfterImport: jest.fn(),
}));

jest.mock('../src/renderer/js/utils/qif-export.js', () => ({
  exportToQIF: jest.fn(),
}));

jest.mock('../src/renderer/js/components/import-modal.js', () => ({
  renderImportModal: jest.fn(),
}));

const { handlePlanAction } = require('../src/renderer/js/handlers/plan.js');
const { runAffordabilityCheck } = require('../src/renderer/js/pages/planning.js');

describe('handlePlanAction affordability', () => {
  test('runs affordability check and re-renders', async () => {
    const state = { budgets: [], goals: [], debts: [] };
    const financials = { income: 5000, expenses: 3000, totalSaved: 12000, totalDebt: 0 };
    const ctx = {
      State: {
        getState: jest.fn(() => state),
        computeFinancials: jest.fn().mockResolvedValue(financials),
      },
      render: jest.fn(),
      showToast: jest.fn(),
    };

    const handled = await handlePlanAction('run-affordability-check', {}, ctx);

    expect(handled).toBe(true);
    expect(ctx.State.computeFinancials).toHaveBeenCalledTimes(1);
    expect(runAffordabilityCheck).toHaveBeenCalledWith(state, financials);
    expect(ctx.showToast).toHaveBeenCalledWith('Affordability checked', 'success');
    expect(ctx.render).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run handler test and verify it fails**

Run:

```powershell
npm test -- tests/plan-handler-affordability.test.js
```

Expected: FAIL because `run-affordability-check` is not handled.

- [ ] **Step 3: Import Planning helper**

In `src/renderer/js/handlers/plan.js`, add:

```js
import { runAffordabilityCheck } from '../pages/planning.js';
```

- [ ] **Step 4: Handle affordability action**

In `handlePlanAction`, add this case before `default`:

```js
    case 'run-affordability-check': {
      const financials = await State.computeFinancials();
      runAffordabilityCheck(State.getState(), financials);
      showToast('Affordability checked', 'success');
      render();
      return true;
    }
```

- [ ] **Step 5: Run handler test and verify it passes**

Run:

```powershell
npm test -- tests/plan-handler-affordability.test.js
```

Expected: PASS.

- [ ] **Step 6: Commit Task 4**

```powershell
git add src/renderer/js/handlers/plan.js tests/plan-handler-affordability.test.js
git commit -m "Wire affordability planning action"
```

---

### Task 5: Focused Verification

**Files:**
- No source edits expected unless verification finds an issue.

- [ ] **Step 1: Run focused Jest suite**

Run:

```powershell
npm test -- tests/affordability-engine.test.js tests/planning-affordability.test.js tests/ai-decision-card.test.js tests/plan-handler-affordability.test.js
```

Expected: PASS.

- [ ] **Step 2: Run adjacent workflow regression tests**

Run:

```powershell
npm test -- tests/ai-workflow-schema.test.js tests/ai-workflow-prompts.test.js
```

Expected: PASS.

- [ ] **Step 3: Run touched-file ESLint**

Run:

```powershell
npx eslint src/renderer/js/pages/planning.js src/renderer/js/handlers/plan.js src/renderer/js/utils/affordability.js src/renderer/js/components/ai-decision-card.js
```

Expected: PASS with 0 errors. Fix any errors in touched files.

- [ ] **Step 4: Commit any verification fixes**

If fixes are needed:

```powershell
git add src/renderer/js/pages/planning.js src/renderer/js/handlers/plan.js src/renderer/js/utils/affordability.js src/renderer/js/components/ai-decision-card.js tests/affordability-engine.test.js tests/planning-affordability.test.js tests/ai-decision-card.test.js tests/plan-handler-affordability.test.js
git commit -m "Stabilize affordability workflow verification"
```

If no fixes are needed, do not create a commit.

---

### Task 6: Full Verification And Handoff

**Files:**
- No source edits expected.

- [ ] **Step 1: Run full Jest**

Run:

```powershell
npm test
```

Expected: PASS.

- [ ] **Step 2: Run whitespace check**

Run:

```powershell
git diff --check
```

Expected: no output and exit code 0.

- [ ] **Step 3: Check branch status**

Run:

```powershell
git status --short --branch
```

Expected: branch `codex/affordability-workflow-v1`, clean except existing untracked `AGENTS.md`.

- [ ] **Step 4: Prepare handoff summary**

Report:

- Branch name
- Commits created
- Focused Jest result
- Adjacent workflow regression result
- Full Jest result
- ESLint result
- `AGENTS.md` untouched status
