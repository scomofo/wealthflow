# Intelligent Command Center V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make WealthFlow feel continuously intelligent by improving the dashboard narrative, connecting proactive nudges to Focus Mode, adding concise action reasoning, and refreshing command-center intelligence after meaningful state changes.

**Architecture:** Keep intelligence rule-first and deterministic. Main-process engines continue to own Next Best Actions, personalization, and proactive nudge evaluation; renderer utilities convert those signals into clear dashboard copy and routing decisions. The dashboard remains action-first: summary, nudges, snapshot, momentum, next actions.

**Tech Stack:** Electron IPC, CommonJS main-process modules, ESM renderer modules transformed by Jest, existing CSS in `src/renderer/styles/main.css`, Jest, ESLint.

---

## Pre-Flight

Current local `master` includes the Action Momentum merge and is ahead of `origin/master`. Execute from that local `master` so this phase builds on the momentum work. Leave the untracked `AGENTS.md` alone.

- [ ] **Step 1: Create the feature branch**

```powershell
git switch master
git switch -c codex/intelligent-command-center-v1
```

Expected: branch `codex/intelligent-command-center-v1` exists and includes the Action Momentum merge.

- [ ] **Step 2: Confirm scope**

```powershell
git status --short --branch
```

Expected: current branch is `codex/intelligent-command-center-v1`; `AGENTS.md` may appear untracked and must not be staged.

- [ ] **Step 3: Verify baseline tests**

```powershell
npm test -- --runInBand
```

Expected: all existing suites pass before feature work starts.

---

## File Structure

Create:
- `src/renderer/js/utils/action-reasoning.js` - builds concise "because" explanations from actions and financial state.
- `src/renderer/js/utils/proactive-routing.js` - finds the best open Next Best Action for a proactive nudge.
- `src/renderer/js/utils/intelligence-refresh.js` - defines deterministic refresh plans by trigger reason.
- `tests/action-reasoning.test.js` - action reasoning coverage.
- `tests/proactive-routing.test.js` - nudge-to-action matching coverage.
- `tests/intelligence-refresh.test.js` - refresh orchestration coverage.
- `tests/proactive-engine-intelligence.test.js` - proactive nudge metadata and cooldown behavior.
- `tests/personalization-guardrails.test.js` - urgent override and financial-state summary guardrails.

Modify:
- `src/renderer/js/utils/ai-summary.js` - richer rule-first summary copy with stronger "why this matters" bullets.
- `src/renderer/js/components/ai-summary.js` - render the new summary fields safely.
- `src/renderer/js/components/next-best-actions-panel.js` - show concise action reasoning.
- `src/renderer/js/components/focus-mode.js` - show the same action reasoning in Focus Mode.
- `src/main/proactive-engine.js` - add nudge metadata such as `related_action_category`, `why_now`, and `cta_label`.
- `src/renderer/js/components/proactive-banner.js` - route nudges to related actions when possible.
- `src/renderer/js/handlers/shared.js` - handle nudge focus routing and call intelligence refresh after state changes.
- `src/renderer/js/state/core.js` - track the last intelligence refresh.
- `src/renderer/js/state/plan.js` - add `refreshCommandCenterIntelligence(reason)`.
- `src/main/personalization-engine.js` - tighten summary emphasis when high debt is material even if cashflow is strong.
- `src/renderer/styles/main.css` - add subtle styles for action reasoning and proactive CTA metadata.

---

### Task 1: Rule-First AI Summary Narrative

**Files:**
- Modify: `src/renderer/js/utils/ai-summary.js`
- Modify: `src/renderer/js/components/ai-summary.js`
- Test: `tests/ai-summary-v2.test.js`

- [ ] **Step 1: Write failing summary tests**

Create `tests/ai-summary-v2.test.js`:

```js
const { generateAISummary } = require('../src/renderer/js/utils/ai-summary.js');

describe('generateAISummary V2', () => {
  test('connects budget and debt actions into one financial narrative', () => {
    const summary = generateAISummary(
      [
        {
          title: 'Reduce Food spending by $180 this month',
          category: 'budget',
          score: 82,
          impact_text: 'Freeing up $180/mo improves monthly cash flow.',
        },
        {
          title: 'Accelerate payoff on Visa (19.99% APR)',
          category: 'debt',
          score: 91,
          impact_text: 'Paying down $4,500 at 19.99% saves significant interest.',
        },
      ],
      { savingsRate: 6, totalDebt: 14500, income: 5200, expenses: 4888 },
      'debt_reduction'
    );

    expect(summary.headline).toBe('This month, the clearest move is freeing up cash flow and using it to reduce interest drag.');
    expect(summary.bullets).toEqual([
      'Reducing Food spending by $180 this month creates room in the monthly plan.',
      'Accelerating Visa payoff addresses high-interest debt before it compounds further.',
    ]);
    expect(summary.nextFocus).toBe('Start with the highest-scoring action: Reduce Food spending by $180 this month.');
    expect(summary.confidence).toBe('high');
  });

  test('uses financial state when there are no open actions', () => {
    const summary = generateAISummary([], { savingsRate: 4, totalDebt: 22000 }, 'cashflow_improvement');

    expect(summary.headline).toBe('Cash flow is tight right now, so the next useful step is finding one manageable adjustment.');
    expect(summary.bullets).toEqual([
      'Savings rate is below 10%, so small spending changes matter more this month.',
      'Refresh actions after adding recent transactions for more precise guidance.',
    ]);
    expect(summary.nextFocus).toBe('Add or import recent transactions, then refresh Next Best Actions.');
    expect(summary.confidence).toBe('medium');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```powershell
npx jest tests/ai-summary-v2.test.js --runInBand
```

Expected: FAIL because `nextFocus` does not exist and the current copy is less specific.

- [ ] **Step 3: Replace the generator with rule-first V2 copy**

In `src/renderer/js/utils/ai-summary.js`, replace `generateAISummary` and `summarizeAction` with:

```js
export function generateAISummary(actions, financials = {}, emphasis) {
  const top = (actions || []).slice(0, 2);
  const f = financials || {};

  if (top.length === 0) {
    if ((f.savingsRate || 0) < 10) {
      return {
        headline: 'Cash flow is tight right now, so the next useful step is finding one manageable adjustment.',
        bullets: [
          'Savings rate is below 10%, so small spending changes matter more this month.',
          'Refresh actions after adding recent transactions for more precise guidance.',
        ],
        nextFocus: 'Add or import recent transactions, then refresh Next Best Actions.',
        confidence: 'medium',
      };
    }
    return {
      headline: 'You are on track this month - no urgent financial actions need attention.',
      bullets: ['Keep reviewing new transactions so recommendations stay current.'],
      nextFocus: 'Refresh actions after your next transaction import.',
      confidence: 'low',
    };
  }

  const categories = new Set(top.map(a => (a.category || '').toLowerCase()));
  const headline = buildHeadline(top, categories, emphasis, f);
  const bullets = top.map(a => buildActionBullet(a)).filter(Boolean);
  const nextFocus = 'Start with the highest-scoring action: ' + (top[0].title || 'your top recommendation') + '.';
  const confidence = top.length >= 2 && (top[0].score || 0) >= 70 ? 'high' : 'medium';

  return { headline, bullets, nextFocus, confidence };
}

function buildHeadline(top, categories, emphasis, financials) {
  if (categories.has('budget') && categories.has('debt')) {
    return 'This month, the clearest move is freeing up cash flow and using it to reduce interest drag.';
  }
  if (emphasis === 'debt_reduction') {
    return 'This month, reducing interest drag should come before lower-impact optimizations.';
  }
  if (emphasis === 'savings_growth') {
    return 'This month, your strongest opportunity is turning available cash flow into savings growth.';
  }
  if (emphasis === 'cashflow_improvement' || (financials.savingsRate || 0) < 10) {
    return 'This month, improving cash flow is the priority.';
  }
  if (emphasis === 'spending_control') {
    return 'This month, restoring spending control will improve financial flexibility.';
  }
  const themes = top.map(a => summarizeAction(a));
  return themes.length === 1
    ? 'This month, your top priority is ' + themes[0].toLowerCase() + '.'
    : 'This month, your biggest gains come from ' + themes[0].toLowerCase() + ' and ' + themes[1].toLowerCase() + '.';
}

function buildActionBullet(action) {
  const title = action.title || 'This action';
  const category = (action.category || '').toLowerCase();

  if (category === 'budget') {
    const match = title.match(/Reduce\s+(.+?)\s+spending\s+by\s+\$?([\d,]+)/i);
    if (match) return 'Reducing ' + match[1] + ' spending by $' + match[2] + ' this month creates room in the monthly plan.';
  }
  if (category === 'debt') {
    const match = title.match(/Accelerate payoff on (.+?) \(/i);
    if (match) return 'Accelerating ' + match[1] + ' payoff addresses high-interest debt before it compounds further.';
  }
  if (category === 'bills') return 'Handling upcoming bills protects cash flow and avoids avoidable fees.';
  if (category === 'investing') return 'Using registered contribution room turns surplus cash flow into tax-advantaged progress.';
  if (category === 'cashflow') return 'Building cash reserves lowers the risk of relying on debt when expenses surprise you.';

  return action.impact_text || action.rationale || action.description || title;
}

function summarizeAction(action) {
  const cat = (action.category || '').toLowerCase();
  const title = action.title || '';

  if (cat === 'budget') return 'tightening spending in overrun categories';
  if (cat === 'debt') return 'prioritizing debt repayment';
  if (cat === 'bills') return 'staying current on upcoming bills';
  if (cat === 'investing') return 'making use of available contribution room';
  if (cat === 'cashflow') return 'building your emergency fund';
  if (cat === 'planning') return 'completing your financial profile';
  return title.toLowerCase();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { generateAISummary };
}
```

- [ ] **Step 4: Render `nextFocus` in the AI summary card**

In `src/renderer/js/components/ai-summary.js`, after the bullet list block, add:

```js
${summary.nextFocus ? `<div class="ai-summary-next">${summary.nextFocus}</div>` : ''}
```

Also make sure `headline`, bullets, and `nextFocus` are escaped with `h()`:

```js
import { h } from '../helpers.js';
```

Then update the existing headline and bullet rendering:

```js
<div class="ai-summary-headline">${h(summary.headline)}</div>
...
${summary.bullets.map(b => '<li>' + h(b) + '</li>').join('')}
```

- [ ] **Step 5: Add summary next-focus CSS**

In `src/renderer/styles/main.css`, near the AI summary styles, add:

```css
.ai-summary-next {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--border-soft);
  color: var(--text);
  font-size: 12px;
  line-height: 1.5;
  font-weight: 600;
}
```

- [ ] **Step 6: Run summary tests**

```powershell
npx jest tests/ai-summary-v2.test.js tests/dashboard-intelligence.test.js --runInBand
```

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add src/renderer/js/utils/ai-summary.js src/renderer/js/components/ai-summary.js src/renderer/styles/main.css tests/ai-summary-v2.test.js
git commit -m "Improve command center summary narrative"
```

---

### Task 2: Action Reasoning

**Files:**
- Create: `src/renderer/js/utils/action-reasoning.js`
- Modify: `src/renderer/js/components/next-best-actions-panel.js`
- Modify: `src/renderer/js/components/focus-mode.js`
- Modify: `src/renderer/styles/main.css`
- Test: `tests/action-reasoning.test.js`

- [ ] **Step 1: Write failing action reasoning tests**

Create `tests/action-reasoning.test.js`:

```js
const { buildActionBecause } = require('../src/renderer/js/utils/action-reasoning.js');

describe('buildActionBecause', () => {
  test('explains budget actions with monthly cash flow impact', () => {
    expect(buildActionBecause(
      {
        title: 'Reduce Food spending by $180 this month',
        category: 'budget',
        impact_text: 'Freeing up $180/mo improves monthly cash flow.',
      },
      { savingsRate: 6 }
    )).toBe('Because Food is over target, freeing up $180 improves monthly flexibility.');
  });

  test('explains debt actions with interest drag', () => {
    expect(buildActionBecause(
      {
        title: 'Accelerate payoff on Visa (19.99% APR)',
        category: 'debt',
      },
      { totalDebt: 14500 }
    )).toBe('Because high-interest debt is reducing future flexibility, this should stay near the top.');
  });

  test('falls back to rationale when no category pattern matches', () => {
    expect(buildActionBecause(
      {
        title: 'Complete your financial profile',
        category: 'planning',
        rationale: 'A complete profile improves recommendations.',
      },
      {}
    )).toBe('Because a complete profile improves recommendations.');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```powershell
npx jest tests/action-reasoning.test.js --runInBand
```

Expected: FAIL because `action-reasoning.js` does not exist.

- [ ] **Step 3: Create the reasoning utility**

Create `src/renderer/js/utils/action-reasoning.js`:

```js
export function buildActionBecause(action = {}, financials = {}) {
  const category = (action.category || '').toLowerCase();
  const title = action.title || '';

  if (category === 'budget') {
    const match = title.match(/Reduce\s+(.+?)\s+spending\s+by\s+\$?([\d,]+)/i);
    if (match) {
      return 'Because ' + match[1] + ' is over target, freeing up $' + match[2] + ' improves monthly flexibility.';
    }
    return 'Because spending pressure is lowering flexibility, this action improves the monthly plan.';
  }

  if (category === 'debt') {
    return 'Because high-interest debt is reducing future flexibility, this should stay near the top.';
  }

  if (category === 'bills') {
    return 'Because this is time-sensitive, handling it now avoids late fees and cash-flow surprises.';
  }

  if (category === 'investing') {
    return 'Because cash flow is available, using registered room can move surplus into tax-advantaged growth.';
  }

  if (category === 'cashflow') {
    const expenses = financials.expenses || 0;
    if (expenses > 0) {
      return 'Because monthly expenses are about $' + Math.round(expenses).toLocaleString('en-CA') + ', cash reserves reduce risk.';
    }
    return 'Because cash reserves reduce the chance of relying on debt when expenses surprise you.';
  }

  const fallback = action.rationale || action.description || action.impact_text || '';
  if (fallback) {
    return 'Because ' + fallback.charAt(0).toLowerCase() + fallback.slice(1);
  }

  return '';
}
```

- [ ] **Step 4: Show reasoning on Next Best Action cards**

In `src/renderer/js/components/next-best-actions-panel.js`, import:

```js
import { buildActionBecause } from '../utils/action-reasoning.js';
```

Inside `renderNextBestActionsPanel`, read optional financials:

```js
const { loading = false, stale = false, financials = {} } = options;
```

Inside each card render, before returning the template:

```js
const because = buildActionBecause(a, financials);
```

Add this below `nba-rationale`:

```js
${because ? `<div class="nba-because">${h(because)}</div>` : ''}
```

- [ ] **Step 5: Pass financials from dashboard to action cards**

In `src/renderer/js/pages/dashboard.js`, change:

```js
${renderNextBestActionsPanel(state.nextBestActions || [])}
```

to:

```js
${renderNextBestActionsPanel(state.nextBestActions || [], { financials: F })}
```

- [ ] **Step 6: Show reasoning in Focus Mode**

In `src/renderer/js/components/focus-mode.js`, import:

```js
import { buildActionBecause } from '../utils/action-reasoning.js';
```

Change the signature:

```js
export function renderFocusMode(action, personalizationProfile = {}, options = {}) {
```

Add:

```js
const because = options.because || buildActionBecause(action, options.financials || {});
```

Add this section after the subtitle and before completion feedback:

```js
${because ? `
  <div class="focus-mode-reason">
    <div class="focus-mode-reason-label">Because</div>
    <div>${h(because.replace(/^Because\s+/i, ''))}</div>
  </div>
` : ''}
```

- [ ] **Step 7: Add reasoning CSS**

In `src/renderer/styles/main.css`, add:

```css
.nba-because {
  margin-top: 7px;
  color: var(--sub);
  font-size: 11px;
  line-height: 1.5;
}
.focus-mode-reason {
  padding: 12px 14px;
  border: 1px solid var(--border-soft);
  background: rgba(255,255,255,0.02);
  border-radius: 6px;
  color: var(--text);
  font-size: 13px;
  line-height: 1.55;
}
.focus-mode-reason-label {
  font-size: 10px;
  color: var(--sub);
  text-transform: uppercase;
  font-weight: 700;
  letter-spacing: .5px;
  margin-bottom: 4px;
}
```

- [ ] **Step 8: Run action reasoning tests**

```powershell
npx jest tests/action-reasoning.test.js tests/focus-mode-completion.test.js --runInBand
```

Expected: PASS.

- [ ] **Step 9: Commit**

```powershell
git add src/renderer/js/utils/action-reasoning.js src/renderer/js/components/next-best-actions-panel.js src/renderer/js/components/focus-mode.js src/renderer/js/pages/dashboard.js src/renderer/styles/main.css tests/action-reasoning.test.js
git commit -m "Add concise action reasoning"
```

---

### Task 3: Proactive Nudge Metadata And Routing

**Files:**
- Modify: `src/main/proactive-engine.js`
- Modify: `src/renderer/js/components/proactive-banner.js`
- Create: `src/renderer/js/utils/proactive-routing.js`
- Modify: `src/renderer/js/handlers/shared.js`
- Test: `tests/proactive-engine-intelligence.test.js`
- Test: `tests/proactive-routing.test.js`

- [ ] **Step 1: Write proactive engine metadata tests**

Create `tests/proactive-engine-intelligence.test.js`:

```js
const { ProactiveEngine } = require('../src/main/proactive-engine');

function makeDb(overrides = {}) {
  const profile = overrides.profile || {};
  return {
    computeFinancials: () => overrides.financials || { catSpending: { Food: 760 }, savingsRate: 5 },
    listBudgets: () => overrides.budgets || [{ id: 'b1', category: 'Food', amount: 600 }],
    listBills: () => overrides.bills || [],
    listDebts: () => overrides.debts || [],
    listContributionRoom: () => overrides.contributionRoom || [],
    getPersonalizationProfile: () => profile,
    updatePersonalizationProfile: (next) => { Object.assign(profile, next); },
  };
}

describe('ProactiveEngine intelligence metadata', () => {
  test('adds related action category and why-now copy to risk nudges', () => {
    const nudges = new ProactiveEngine(makeDb()).evaluate();

    expect(nudges[0]).toMatchObject({
      type: 'risk',
      category: 'budget',
      related_action_category: 'budget',
      cta_label: 'Focus action',
    });
    expect(nudges[0].why_now).toContain('over budget');
  });

  test('records cooldown using type and category key', () => {
    const profile = {};
    new ProactiveEngine(makeDb({ profile })).evaluate();

    expect(profile.nudge_shown.risk_budget).toBeTruthy();
  });
});
```

- [ ] **Step 2: Write proactive routing tests**

Create `tests/proactive-routing.test.js`:

```js
const { findRelatedActionForNudge } = require('../src/renderer/js/utils/proactive-routing.js');

describe('findRelatedActionForNudge', () => {
  test('matches by related action id first', () => {
    const actions = [
      { id: 'a1', category: 'budget', title: 'Budget action' },
      { id: 'a2', category: 'debt', title: 'Debt action' },
    ];

    expect(findRelatedActionForNudge({ related_action_id: 'a2', related_action_category: 'budget' }, actions)).toBe(actions[1]);
  });

  test('falls back to category match', () => {
    const actions = [
      { id: 'a1', category: 'debt', title: 'Debt action' },
      { id: 'a2', category: 'budget', title: 'Budget action' },
    ];

    expect(findRelatedActionForNudge({ related_action_category: 'budget' }, actions)).toBe(actions[1]);
  });

  test('returns null without a usable match', () => {
    expect(findRelatedActionForNudge({ related_action_category: 'bills' }, [{ id: 'a1', category: 'debt' }])).toBeNull();
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```powershell
npx jest tests/proactive-engine-intelligence.test.js tests/proactive-routing.test.js --runInBand
```

Expected: FAIL because metadata and routing helper do not exist.

- [ ] **Step 4: Add nudge metadata helper in proactive engine**

In `src/main/proactive-engine.js`, add this method to `ProactiveEngine`:

```js
  _nudge(fields) {
    const message = fields.message || '';
    return {
      id: crypto.createHash('md5').update(message).digest('hex').slice(0, 16),
      related_action_category: fields.category,
      cta_label: 'Focus action',
      ...fields,
    };
  }
```

Then replace each `nudges.push({ ... })` with `nudges.push(this._nudge({ ... }))`.

For the overspending nudge, include:

```js
why_now: pct + '% over budget with the month still active',
```

For bills:

```js
why_now: 'Due within 3 days',
```

For contribution room:

```js
why_now: 'Available room and positive cash flow detected',
```

For high-interest debt:

```js
why_now: 'High APR debt is active',
```

For inactivity:

```js
why_now: 'No recent action completion signal',
```

For end-of-month:

```js
why_now: 'Month-end decision window',
```

- [ ] **Step 5: Create proactive routing helper**

Create `src/renderer/js/utils/proactive-routing.js`:

```js
export function findRelatedActionForNudge(nudge = {}, actions = []) {
  if (!nudge || !Array.isArray(actions)) return null;

  if (nudge.related_action_id) {
    const byId = actions.find(a => a && a.id === nudge.related_action_id);
    if (byId) return byId;
  }

  const category = (nudge.related_action_category || nudge.category || '').toLowerCase();
  if (!category) return null;

  return actions.find(a => (a.category || '').toLowerCase() === category) || null;
}
```

- [ ] **Step 6: Render proactive CTA metadata**

In `src/renderer/js/components/proactive-banner.js`, change the button rendering to:

```js
const targetCategory = h(n.related_action_category || n.category || '');
const whyNow = n.why_now ? '<div class="proactive-why-now">' + h(n.why_now) + '</div>' : '';
return '<div class="card proactive-banner" style="display:flex;align-items:center;gap:12px;margin-bottom:10px">'
  + '<div style="flex-shrink:0">' + icon(ic, 16, color) + '</div>'
  + '<div style="font-size:13px;line-height:1.5;flex:1">' + h(n.message) + whyNow + '</div>'
  + '<button class="btn btn-ghost btn-sm" style="flex-shrink:0" data-action="open-related-nudge-action" data-category="' + targetCategory + '" data-nudge-id="' + h(n.id || '') + '">' + h(n.cta_label || 'Focus action') + ' ' + icon('arrow-right', 12) + '</button>'
  + '</div>';
```

- [ ] **Step 7: Add shared handler for nudge focus routing**

In `src/renderer/js/handlers/shared.js`, import:

```js
import { findRelatedActionForNudge } from '../utils/proactive-routing.js';
```

Add this switch case before `open-focus-mode`:

```js
    case 'open-related-nudge-action': {
      const nudgeId = btn.dataset.nudgeId;
      const category = btn.dataset.category;
      const state = ctx.State.getState();
      const nudges = state.proactiveNudges || [];
      const nudge = nudges.find(n => n.id === nudgeId) || { related_action_category: category };
      const related = findRelatedActionForNudge(nudge, state.nextBestActions || []);

      if (related) {
        const profile = await ctx.State.recordInteraction('focus_open', related.category || 'other');
        const { renderFocusMode } = await import('../components/focus-mode.js');
        ctx.appState.activeModal = '_custom';
        ctx.appState.editData = {
          title: 'Focus Mode',
          body: renderFocusMode(related, profile || state.personalizationProfile || {}, {
            financials: await ctx.State.computeFinancials(),
          }),
        };
        ctx.render();
        return true;
      }

      ctx.navigate(category || 'dashboard');
      return true;
    }
```

- [ ] **Step 8: Add proactive why-now CSS**

In `src/renderer/styles/main.css`, near `.proactive-banner`, add:

```css
.proactive-why-now {
  margin-top: 3px;
  color: var(--sub);
  font-size: 11px;
  line-height: 1.4;
}
```

- [ ] **Step 9: Run proactive tests**

```powershell
npx jest tests/proactive-engine-intelligence.test.js tests/proactive-routing.test.js --runInBand
```

Expected: PASS.

- [ ] **Step 10: Commit**

```powershell
git add src/main/proactive-engine.js src/renderer/js/components/proactive-banner.js src/renderer/js/utils/proactive-routing.js src/renderer/js/handlers/shared.js src/renderer/styles/main.css tests/proactive-engine-intelligence.test.js tests/proactive-routing.test.js
git commit -m "Connect proactive nudges to focus actions"
```

---

### Task 4: Command Center Refresh Orchestration

**Files:**
- Create: `src/renderer/js/utils/intelligence-refresh.js`
- Modify: `src/renderer/js/state/core.js`
- Modify: `src/renderer/js/state/plan.js`
- Modify: `src/renderer/js/handlers/shared.js`
- Test: `tests/intelligence-refresh.test.js`

- [ ] **Step 1: Write failing refresh plan tests**

Create `tests/intelligence-refresh.test.js`:

```js
const { getIntelligenceRefreshPlan } = require('../src/renderer/js/utils/intelligence-refresh.js');

describe('getIntelligenceRefreshPlan', () => {
  test('refreshes everything after financial data changes', () => {
    expect(getIntelligenceRefreshPlan('financial_data_changed')).toEqual([
      'nextBestActions',
      'personalization',
      'proactiveNudges',
      'engagementProgress',
    ]);
  });

  test('refreshes actions and nudges after action completion', () => {
    expect(getIntelligenceRefreshPlan('action_completed')).toEqual([
      'nextBestActions',
      'personalization',
      'proactiveNudges',
      'engagementProgress',
    ]);
  });

  test('uses a light refresh for manual summary updates', () => {
    expect(getIntelligenceRefreshPlan('summary_only')).toEqual([
      'personalization',
      'proactiveNudges',
    ]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```powershell
npx jest tests/intelligence-refresh.test.js --runInBand
```

Expected: FAIL because the utility does not exist.

- [ ] **Step 3: Create refresh plan utility**

Create `src/renderer/js/utils/intelligence-refresh.js`:

```js
const FULL_REFRESH = [
  'nextBestActions',
  'personalization',
  'proactiveNudges',
  'engagementProgress',
];

export function getIntelligenceRefreshPlan(reason = 'manual') {
  switch (reason) {
    case 'financial_data_changed':
    case 'action_completed':
    case 'action_snoozed':
    case 'action_dismissed':
    case 'onboarding_completed':
    case 'manual':
      return FULL_REFRESH.slice();
    case 'summary_only':
      return ['personalization', 'proactiveNudges'];
    default:
      return FULL_REFRESH.slice();
  }
}
```

- [ ] **Step 4: Add state tracking**

In `src/renderer/js/state/core.js`, add:

```js
lastIntelligenceRefresh: null,
```

near `summaryEmphasis`.

- [ ] **Step 5: Add state orchestration**

In `src/renderer/js/state/plan.js`, import:

```js
import { getIntelligenceRefreshPlan } from '../utils/intelligence-refresh.js';
```

Add this function after `evaluateProactiveNudges`:

```js
export async function refreshCommandCenterIntelligence(reason = 'manual') {
  const plan = getIntelligenceRefreshPlan(reason);

  if (plan.includes('nextBestActions')) {
    state.nextBestActions = await api.generateNextBestActions();
  }
  if (plan.includes('personalization')) {
    await loadPersonalizationContext();
  }
  if (plan.includes('proactiveNudges')) {
    state.proactiveNudges = await api.evaluateProactiveNudges();
  }
  if (plan.includes('engagementProgress')) {
    state.engagementProgress = await api.getEngagementProgress();
  }

  state.lastIntelligenceRefresh = {
    reason,
    refreshed_at: new Date().toISOString(),
    plan,
  };
  return state.lastIntelligenceRefresh;
}
```

- [ ] **Step 6: Use refresh after action lifecycle events**

In `src/renderer/js/handlers/shared.js`, replace:

```js
await ctx.State.refreshEngagementProgress();
```

inside `complete-next-best-action` with:

```js
await ctx.State.refreshCommandCenterIntelligence('action_completed');
```

Replace dismiss refresh:

```js
try { await ctx.State.refreshCommandCenterIntelligence('action_dismissed'); } catch (_) { /* non-critical */ }
```

Replace snooze refresh:

```js
try { await ctx.State.refreshCommandCenterIntelligence('action_snoozed'); } catch (_) { /* non-critical */ }
```

For saved plan item completion, keep engagement-only refresh:

```js
try { await State.refreshEngagementProgress(); } catch (_) { /* non-critical */ }
```

- [ ] **Step 7: Refresh after modal saves that change financial state**

In `src/renderer/js/handlers/shared.js`, add this helper above `handleSaveModal`:

```js
async function refreshAfterFinancialSave(State) {
  try {
    await State.refreshCommandCenterIntelligence('financial_data_changed');
  } catch (_) {
    /* non-critical */
  }
}
```

In `handleSaveModal`, after successful saves for these modal types, call:

```js
await refreshAfterFinancialSave(State);
```

Apply it to these cases after the save call and before `render()`:
- `tx`
- `budget`
- `goal`
- `debt`
- `inv`
- `bill`
- contribution-room and contribution modals if present in this file

- [ ] **Step 8: Run refresh tests**

```powershell
npx jest tests/intelligence-refresh.test.js tests/action-momentum.test.js --runInBand
```

Expected: PASS.

- [ ] **Step 9: Commit**

```powershell
git add src/renderer/js/utils/intelligence-refresh.js src/renderer/js/state/core.js src/renderer/js/state/plan.js src/renderer/js/handlers/shared.js tests/intelligence-refresh.test.js
git commit -m "Add command center refresh orchestration"
```

---

### Task 5: Personalization And Priority Guardrails

**Files:**
- Modify: `src/main/personalization-engine.js`
- Test: `tests/personalization-guardrails.test.js`

- [ ] **Step 1: Write failing guardrail tests**

Create `tests/personalization-guardrails.test.js`:

```js
const { PersonalizationEngine } = require('../src/main/personalization-engine');

function makeEngine(raw = {}) {
  return new PersonalizationEngine({
    getPersonalizationProfile: () => raw,
    updatePersonalizationProfile: (next) => Object.assign(raw, next),
  });
}

describe('PersonalizationEngine guardrails', () => {
  test('urgent actions keep their score and rank ahead of personalized preferences', () => {
    const engine = makeEngine({ completions: { investing: 8 }, dismissals: { debt: 8 }, last_updated: new Date().toISOString() });
    const profile = engine.buildProfile();
    const weighted = engine.applyActionWeighting([
      { id: 'urgent-debt', category: 'debt', priority: 'urgent', score: 88 },
      { id: 'investing', category: 'investing', priority: 'medium', score: 86 },
    ], profile);

    expect(weighted[0].id).toBe('urgent-debt');
    expect(weighted[0].score).toBe(88);
    expect(weighted[0].personalizedDelta).toBe(0);
  });

  test('high material debt wins summary emphasis even with strong cash flow', () => {
    const engine = makeEngine({ completions: { investing: 4 }, last_updated: new Date().toISOString() });
    const profile = engine.buildProfile();

    expect(engine.chooseSummaryEmphasis(profile, { totalDebt: 30000, savingsRate: 28 })).toBe('debt_reduction');
  });

  test('snooze records behavior without creating dismissal bias', () => {
    const raw = {};
    const engine = makeEngine(raw);

    engine.recordInteraction('snooze', 'budget');
    const profile = engine.buildProfile();

    expect(raw.snoozes.budget).toBe(1);
    expect(profile.dismissBias.budget).toBe(1);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```powershell
npx jest tests/personalization-guardrails.test.js --runInBand
```

Expected: FAIL on high material debt summary emphasis because current logic returns savings growth when cashflow is strong.

- [ ] **Step 3: Tighten summary emphasis**

In `src/main/personalization-engine.js`, update `chooseSummaryEmphasis`:

```js
  chooseSummaryEmphasis(profile, financials) {
    const f = financials || {};
    const totalDebt = f.totalDebt || 0;
    const highDebt = totalDebt > 10000;
    const materialDebt = totalDebt > 25000;
    const lowCashflow = (f.savingsRate || 0) < 10;
    const strongCashflow = (f.savingsRate || 0) > 25;

    if (materialDebt) return 'debt_reduction';
    if (highDebt && lowCashflow) return 'debt_reduction';
    if (strongCashflow) return 'savings_growth';
    if (lowCashflow) return 'cashflow_improvement';

    if (profile.primaryFocus === 'debt') return 'debt_reduction';
    if (profile.primaryFocus === 'investing') return 'savings_growth';
    if (profile.primaryFocus === 'budget') return 'spending_control';
    if (profile.primaryFocus === 'cashflow') return 'cashflow_improvement';
    return 'balanced';
  }
```

- [ ] **Step 4: Run guardrail tests**

```powershell
npx jest tests/personalization-guardrails.test.js tests/dashboard-intelligence.test.js --runInBand
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/main/personalization-engine.js tests/personalization-guardrails.test.js
git commit -m "Tighten personalization priority guardrails"
```

---

### Task 6: Startup And Manual Refresh Polish

**Files:**
- Modify: `src/renderer/js/app.js`
- Modify: `src/renderer/js/handlers/shared.js`

- [ ] **Step 1: Use command-center refresh on startup**

In `src/renderer/js/app.js`, replace these startup calls:

```js
try { await State.generateNextBestActions(); } catch (_) { /* non-blocking */ }
try { await State.loadPersonalizationContext(); } catch (_) { /* non-blocking */ }
try { await State.evaluateProactiveNudges(); } catch (_) { /* non-blocking */ }
try { await State.refreshEngagementProgress(); } catch (_) { /* non-blocking */ }
```

with:

```js
try { await State.refreshCommandCenterIntelligence('manual'); } catch (_) { /* non-blocking */ }
```

- [ ] **Step 2: Use command-center refresh for manual action refresh**

In `src/renderer/js/handlers/shared.js`, in the `generate-next-best-actions` case, replace:

```js
await ctx.State.generateNextBestActions();
```

with:

```js
await ctx.State.refreshCommandCenterIntelligence('manual');
```

Keep the existing toast and render calls.

- [ ] **Step 3: Run focused startup/refresh tests**

```powershell
npx jest tests/intelligence-refresh.test.js tests/proactive-routing.test.js tests/ai-summary-v2.test.js --runInBand
```

Expected: PASS.

- [ ] **Step 4: Commit**

```powershell
git add src/renderer/js/app.js src/renderer/js/handlers/shared.js
git commit -m "Refresh command center intelligence on startup"
```

---

### Task 7: Verification

**Files:**
- No edits unless verification finds an issue.

- [ ] **Step 1: Run focused regression tests**

```powershell
npx jest tests/ai-summary-v2.test.js tests/action-reasoning.test.js tests/proactive-engine-intelligence.test.js tests/proactive-routing.test.js tests/intelligence-refresh.test.js tests/personalization-guardrails.test.js tests/next-best-actions-engine.test.js tests/focus-mode-completion.test.js --runInBand
```

Expected: all selected suites PASS.

- [ ] **Step 2: Run full Jest**

```powershell
npm test -- --runInBand
```

Expected: all suites PASS.

- [ ] **Step 3: Run touched-file lint**

```powershell
npx eslint src/main/personalization-engine.js src/main/proactive-engine.js src/renderer/js/app.js src/renderer/js/components/ai-summary.js src/renderer/js/components/focus-mode.js src/renderer/js/components/next-best-actions-panel.js src/renderer/js/components/proactive-banner.js src/renderer/js/handlers/shared.js src/renderer/js/pages/dashboard.js src/renderer/js/state/core.js src/renderer/js/state/plan.js src/renderer/js/utils/action-reasoning.js src/renderer/js/utils/ai-summary.js src/renderer/js/utils/intelligence-refresh.js src/renderer/js/utils/proactive-routing.js src/renderer/styles/main.css
```

Expected: 0 errors. Existing unused-variable warnings in legacy files may remain.

- [ ] **Step 4: Run repo-wide lint and record known blockers**

```powershell
npm run lint
```

Expected: may still fail on pre-existing unrelated or vendored lint issues, especially `src/renderer/js/lib/chart.umd.js`, `advisor-wizard.js`, `ai-summary.js` CommonJS globals if not addressed by this task, `export-import.js`, and `xlsx-parser.js`. Do not broaden scope unless the user explicitly asks.

- [ ] **Step 5: Bounded app smoke**

Run a bounded Electron launch:

```powershell
$root = Start-Process -FilePath "node" -ArgumentList "start.js" -WorkingDirectory "C:\dev\wealthflow" -PassThru -WindowStyle Hidden
Start-Sleep -Seconds 8
$root.Refresh()
$root.HasExited
if (-not $root.HasExited) { Stop-Process -Id $root.Id -Force -ErrorAction SilentlyContinue }
```

Expected: `$root.HasExited` is `False` before stopping it. If Electron fails with missing binary, repair ignored dependencies with `npm install` or reinstall the `electron` package, then rerun once.

- [ ] **Step 6: Manual smoke checklist**

Use the running app:
- Dashboard summary explains the top priority and includes a next-focus line.
- Next Best Action cards show a concise "Because..." explanation.
- Focus Mode shows the same reasoning without crowding the steps.
- Proactive banner shows why-now copy and routes to a matching Focus Mode action when one exists.
- Manual Refresh updates actions, summary context, proactive nudges, and momentum state.
- Completing, dismissing, or snoozing an action refreshes command-center intelligence.

---

## Acceptance Criteria

- Dashboard AI summary reads like a short financial narrative, not a generic status card.
- Summary, action reasoning, and proactive nudges all align with top Next Best Actions.
- Proactive nudges can open the relevant Focus Mode action when a matching open action exists.
- Manual and event-based refreshes update actions, personalization context, proactive nudges, and engagement progress through one state method.
- Urgent actions cannot be personalized below less important preferences.
- Material debt can dominate summary emphasis even when cashflow is strong.
- Full Jest passes.
- Touched-file ESLint has 0 errors.

## Out Of Scope

- Push notifications.
- Email reminders.
- Background scheduled jobs outside app startup and user-triggered refresh.
- A full AI service call for summary generation.
- Repo-wide lint cleanup of unrelated legacy files.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-11-intelligent-command-center-v1.md`. Two execution options:

**1. Subagent-Driven (recommended)** - Dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** - Execute tasks in this session using executing-plans, with checkpoints after each task group.

