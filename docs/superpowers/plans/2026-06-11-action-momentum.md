# Action Momentum Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build WealthFlow's next behavioral UX phase: quiet momentum feedback after meaningful actions, a stronger dashboard progress signal, and a Focus Mode finish state that helps users take the next action.

**Architecture:** Keep engagement intelligence in the main process through `EngagementEngine`, expose structured progress and completion feedback through IPC, and keep renderer UI as small pure components/utilities. The dashboard renders momentum near the command center hierarchy, while shared action handlers refresh engagement state after completions and render a focused completion state when the user acts from Focus Mode.

**Tech Stack:** Electron IPC, sql.js-backed app database, CommonJS main-process modules, ESM renderer modules, Jest, ESLint, existing CSS system in `src/renderer/styles/main.css`.

---

## Pre-Flight

The local `master` was left intentionally divergent after PR #1 because it has a separate icon commit. Start execution from the remote merged base and leave the untracked `AGENTS.md` alone.

- [ ] **Step 1: Create a clean implementation branch from GitHub master**

```powershell
git fetch origin
git switch -c codex/action-momentum origin/master
```

Expected: branch `codex/action-momentum` is created from `origin/master`.

- [ ] **Step 2: Confirm worktree scope**

```powershell
git status --short --branch
```

Expected: current branch is `codex/action-momentum`; `AGENTS.md` may appear untracked and must not be staged.

---

## File Structure

Create:
- `src/renderer/js/components/progress-strip.js` - pure dashboard progress strip renderer.
- `src/renderer/js/utils/action-momentum.js` - small renderer helpers for completion feedback and next-action selection.
- `tests/engagement-engine.test.js` - main-process engagement behavior.
- `tests/progress-strip.test.js` - dashboard progress rendering.
- `tests/action-momentum.test.js` - renderer helper behavior.
- `tests/focus-mode-completion.test.js` - Focus Mode finish-state rendering.

Modify:
- `src/main/engagement-engine.js` - add structured progress summary and completion feedback.
- `src/main/ipc-handlers.js` - expose completion feedback.
- `src/main/preload.js` - expose `getCompletionFeedback`.
- `src/renderer/js/state/core.js` - keep `lastCompletionFeedback` in state.
- `src/renderer/js/state/plan.js` - add engagement refresh and completion feedback wrappers.
- `src/renderer/js/components/focus-mode.js` - support completion finish state.
- `src/renderer/js/pages/dashboard.js` - move progress strip directly after snapshot and before Next Best Actions.
- `src/renderer/js/handlers/shared.js` - refresh momentum, use enhanced feedback, and render Focus Mode finish state.
- `src/renderer/styles/main.css` - add progress and focus finish-state classes.

---

### Task 1: Main Engagement Engine Contract

**Files:**
- Modify: `src/main/engagement-engine.js`
- Create: `tests/engagement-engine.test.js`

- [ ] **Step 1: Write failing engagement engine tests**

Create `tests/engagement-engine.test.js`:

```js
const { EngagementEngine } = require('../src/main/engagement-engine');

function makeDb({ recommended = 0, nextBest = 0 } = {}) {
  return {
    getAll(sql) {
      if (sql.includes('recommended_actions')) return [{ cnt: recommended }];
      if (sql.includes('next_best_actions')) return [{ cnt: nextBest }];
      return [{ cnt: 0 }];
    },
  };
}

describe('EngagementEngine', () => {
  test('builds low progress summary for one weekly action', () => {
    const engine = new EngagementEngine(makeDb({ recommended: 1, nextBest: 0 }));
    expect(engine.getProgressSummary()).toEqual({
      count: 1,
      state: 'low',
      message: '1 meaningful action completed this week',
      helperText: 'One more action will start building momentum.',
    });
  });

  test('builds momentum summary for multiple weekly actions', () => {
    const engine = new EngagementEngine(makeDb({ recommended: 1, nextBest: 2 }));
    expect(engine.getProgressSummary()).toEqual({
      count: 3,
      state: 'building',
      message: "You're building momentum - 3 meaningful actions completed this week",
      helperText: 'Keep the next action small and specific.',
    });
  });

  test('builds strong summary for five or more weekly actions', () => {
    const engine = new EngagementEngine(makeDb({ recommended: 2, nextBest: 3 }));
    expect(engine.getProgressSummary()).toEqual({
      count: 5,
      state: 'strong',
      message: "You've been consistent this week - 5 meaningful actions completed",
      helperText: 'The system is learning what helps you move fastest.',
    });
  });

  test('returns first-action completion feedback', () => {
    const engine = new EngagementEngine(makeDb({ recommended: 0, nextBest: 1 }));
    expect(engine.getCompletionFeedback({
      isFirstAction: true,
      actionTitle: 'Pay down high-interest debt',
    })).toEqual({
      message: "Nice - you've taken your first step. That already improves your financial position.",
      detail: 'Completed: Pay down high-interest debt',
      milestone: 'first_action',
      weeklyCount: 1,
    });
  });

  test('returns weekly milestone feedback on every third completion', () => {
    const engine = new EngagementEngine(makeDb({ recommended: 1, nextBest: 2 }));
    expect(engine.getCompletionFeedback({
      isFirstAction: false,
      actionTitle: 'Review grocery spending',
    })).toEqual({
      message: "Nice - that's 3 actions this week.",
      detail: 'Completed: Review grocery spending',
      milestone: 'weekly_multiple',
      weeklyCount: 3,
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```powershell
npx jest tests/engagement-engine.test.js --runInBand
```

Expected: FAIL because `getProgressSummary` and `getCompletionFeedback` do not exist or return the old shape.

- [ ] **Step 3: Implement structured engagement methods**

Update `src/main/engagement-engine.js`:

```js
class EngagementEngine {
  constructor(database) {
    this.database = database;
  }

  getWeeklyCompletionCount() {
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const recommended = this.database.getAll
      ? this.database.getAll("SELECT COUNT(*) as cnt FROM recommended_actions WHERE status = 'completed' AND completed_at > ? AND deleted_at IS NULL", [sevenDaysAgo])
      : [];
    const recCount = (recommended[0] && recommended[0].cnt) || 0;

    const nba = this.database.getAll
      ? this.database.getAll("SELECT COUNT(*) as cnt FROM next_best_actions WHERE status = 'done' AND completed_at > ? AND deleted_at IS NULL", [sevenDaysAgo])
      : [];
    const nbaCount = (nba[0] && nba[0].cnt) || 0;

    return recCount + nbaCount;
  }

  getMomentumState() {
    const count = this.getWeeklyCompletionCount();
    if (count >= 5) return { state: 'strong', count };
    if (count >= 2) return { state: 'building', count };
    return { state: 'low', count };
  }

  getProgressSummary() {
    const { state, count } = this.getMomentumState();
    if (state === 'strong') {
      return {
        count,
        state,
        message: "You've been consistent this week - " + count + ' meaningful actions completed',
        helperText: 'The system is learning what helps you move fastest.',
      };
    }
    if (state === 'building') {
      return {
        count,
        state,
        message: "You're building momentum - " + count + ' meaningful actions completed this week',
        helperText: 'Keep the next action small and specific.',
      };
    }
    if (count === 0) {
      return {
        count,
        state,
        message: 'Take one small step to get back on track',
        helperText: 'Your highest-impact action is waiting below.',
      };
    }
    return {
      count,
      state,
      message: count + ' meaningful action completed this week',
      helperText: 'One more action will start building momentum.',
    };
  }

  getProgressMessage() {
    return this.getProgressSummary().message;
  }

  getCompletionFeedback({ isFirstAction = false, actionTitle = '' } = {}) {
    const weeklyCount = this.getWeeklyCompletionCount();
    const detail = actionTitle ? 'Completed: ' + actionTitle : 'Completed one meaningful action';

    if (isFirstAction) {
      return {
        message: "Nice - you've taken your first step. That already improves your financial position.",
        detail,
        milestone: 'first_action',
        weeklyCount,
      };
    }

    if (weeklyCount > 0 && weeklyCount % 3 === 0) {
      return {
        message: "Nice - that's " + weeklyCount + ' actions this week.',
        detail,
        milestone: 'weekly_multiple',
        weeklyCount,
      };
    }

    return {
      message: 'Nice - progress made.',
      detail,
      milestone: null,
      weeklyCount,
    };
  }

  getEnhancedToast(baseMessage) {
    return this.getCompletionFeedback({ actionTitle: '' }).message || baseMessage;
  }
}

module.exports = { EngagementEngine };
```

- [ ] **Step 4: Run the engagement test**

```powershell
npx jest tests/engagement-engine.test.js --runInBand
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/main/engagement-engine.js tests/engagement-engine.test.js
git commit -m "Add structured action momentum engine"
```

---

### Task 2: IPC And Renderer State Wrappers

**Files:**
- Modify: `src/main/ipc-handlers.js`
- Modify: `src/main/preload.js`
- Modify: `src/renderer/js/state/core.js`
- Modify: `src/renderer/js/state/plan.js`

- [ ] **Step 1: Update engagement IPC**

In `src/main/ipc-handlers.js`, replace the existing `engagement:progress` handler and add completion feedback:

```js
safeHandle('engagement:progress', () => engagementEngine.getProgressSummary());
safeHandle('engagement:completion-feedback', (_, payload) => engagementEngine.getCompletionFeedback(payload || {}));
safeHandle('engagement:enhanced-toast', (_, baseMessage) => engagementEngine.getEnhancedToast(baseMessage));
```

- [ ] **Step 2: Expose the preload API**

In `src/main/preload.js`, add:

```js
getCompletionFeedback: (payload) => ipcRenderer.invoke('engagement:completion-feedback', payload),
```

Place it next to `getEngagementProgress` and `getEnhancedToast`.

- [ ] **Step 3: Add renderer state fields**

In `src/renderer/js/state/core.js`, add:

```js
lastCompletionFeedback: null,
```

near `engagementProgress`.

- [ ] **Step 4: Add state wrappers**

In `src/renderer/js/state/plan.js`, replace the current engagement functions with:

```js
export async function refreshEngagementProgress() {
  state.engagementProgress = await api.getEngagementProgress();
  return state.engagementProgress;
}

export async function getEngagementProgress() {
  return refreshEngagementProgress();
}

export async function getCompletionFeedback(payload) {
  if (!api.getCompletionFeedback) return null;
  state.lastCompletionFeedback = await api.getCompletionFeedback(payload);
  return state.lastCompletionFeedback;
}

export async function getEnhancedToast(baseMessage) {
  return api.getEnhancedToast(baseMessage);
}
```

- [ ] **Step 5: Verify through existing startup path**

```powershell
npx jest tests/engagement-engine.test.js --runInBand
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add src/main/ipc-handlers.js src/main/preload.js src/renderer/js/state/core.js src/renderer/js/state/plan.js
git commit -m "Wire action momentum IPC state"
```

---

### Task 3: Progress Strip Component

**Files:**
- Create: `src/renderer/js/components/progress-strip.js`
- Create: `tests/progress-strip.test.js`
- Modify: `src/renderer/js/pages/dashboard.js`
- Modify: `src/renderer/styles/main.css`

- [ ] **Step 1: Write failing progress-strip tests**

Create `tests/progress-strip.test.js`:

```js
import { renderProgressStrip } from '../src/renderer/js/components/progress-strip.js';

describe('renderProgressStrip', () => {
  test('renders nothing without progress', () => {
    expect(renderProgressStrip(null)).toBe('');
  });

  test('renders momentum message and helper text', () => {
    const html = renderProgressStrip({
      state: 'building',
      count: 3,
      message: "You're building momentum - 3 meaningful actions completed this week",
      helperText: 'Keep the next action small and specific.',
    });

    expect(html).toContain('progress-strip');
    expect(html).toContain('You&#39;re building momentum');
    expect(html).toContain('Keep the next action small and specific.');
    expect(html).toContain('3');
  });

  test('uses low state class for low progress', () => {
    const html = renderProgressStrip({
      state: 'low',
      count: 0,
      message: 'Take one small step to get back on track',
      helperText: 'Your highest-impact action is waiting below.',
    });

    expect(html).toContain('progress-strip-low');
    expect(html).toContain('Take one small step');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```powershell
npx jest tests/progress-strip.test.js --runInBand
```

Expected: FAIL because `progress-strip.js` does not exist.

- [ ] **Step 3: Create the component**

Create `src/renderer/js/components/progress-strip.js`:

```js
import { icon } from '../icons.js';
import { h } from '../helpers.js';

const META = {
  strong: { iconName: 'check-circle', tone: 'strong', label: 'Strong momentum' },
  building: { iconName: 'trending-up', tone: 'building', label: 'Building momentum' },
  low: { iconName: 'activity', tone: 'low', label: 'Action momentum' },
};

export function renderProgressStrip(progress) {
  if (!progress || !progress.message) return '';

  const state = progress.state || progress.momentum?.state || 'low';
  const meta = META[state] || META.low;
  const count = Number(progress.count ?? progress.momentum?.count ?? 0);

  return `
    <section class="card progress-strip progress-strip-${meta.tone}">
      <div class="progress-strip-icon">${icon(meta.iconName, 16)}</div>
      <div class="progress-strip-copy">
        <div class="progress-strip-label">${h(meta.label)}</div>
        <div class="progress-strip-message">${h(progress.message)}</div>
        ${progress.helperText ? `<div class="progress-strip-helper">${h(progress.helperText)}</div>` : ''}
      </div>
      <div class="progress-strip-count">
        <span>${count}</span>
        <small>this week</small>
      </div>
    </section>`;
}
```

- [ ] **Step 4: Move progress strip in dashboard hierarchy**

In `src/renderer/js/pages/dashboard.js`, add:

```js
import { renderProgressStrip } from '../components/progress-strip.js';
```

Then render it immediately after `renderFinancialSnapshotBar(state, F)`:

```js
${renderFinancialSnapshotBar(state, F)}

${renderProgressStrip(state.engagementProgress)}

${renderNextBestActionsPanel(state.nextBestActions || [])}
```

Remove the old inline `progress-strip` IIFE near the bottom of the dashboard.

- [ ] **Step 5: Add CSS**

In `src/renderer/styles/main.css`, replace the minimal `.progress-strip` rule with:

```css
.progress-strip {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  margin-bottom: 14px;
  border: 1px solid var(--border-soft);
  background: var(--bg-soft);
}
.progress-strip-icon {
  width: 30px;
  height: 30px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--abg);
  color: var(--accent);
  flex-shrink: 0;
}
.progress-strip-copy {
  min-width: 0;
  flex: 1;
}
.progress-strip-label {
  font-size: 10px;
  color: var(--sub);
  text-transform: uppercase;
  font-weight: 700;
  letter-spacing: .5px;
  margin-bottom: 2px;
}
.progress-strip-message {
  font-size: 13px;
  color: var(--text);
  font-weight: 600;
  line-height: 1.4;
}
.progress-strip-helper {
  font-size: 11px;
  color: var(--sub);
  margin-top: 2px;
  line-height: 1.4;
}
.progress-strip-count {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 1px;
  color: var(--sub);
  font-size: 10px;
  flex-shrink: 0;
}
.progress-strip-count span {
  color: var(--accent);
  font-size: 18px;
  font-weight: 800;
  line-height: 1;
}
.progress-strip-strong .progress-strip-icon,
.progress-strip-strong .progress-strip-count span {
  color: var(--green);
}
@media (max-width: 640px) {
  .progress-strip {
    align-items: flex-start;
  }
  .progress-strip-count {
    display: none;
  }
}
```

- [ ] **Step 6: Run component and full renderer utility tests**

```powershell
npx jest tests/progress-strip.test.js --runInBand
```

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add src/renderer/js/components/progress-strip.js src/renderer/js/pages/dashboard.js src/renderer/styles/main.css tests/progress-strip.test.js
git commit -m "Add dashboard action momentum strip"
```

---

### Task 4: Completion Feedback Helpers

**Files:**
- Create: `src/renderer/js/utils/action-momentum.js`
- Create: `tests/action-momentum.test.js`

- [ ] **Step 1: Write failing utility tests**

Create `tests/action-momentum.test.js`:

```js
import {
  getNextActionAfterCompletion,
  buildCompletionToast,
  shouldShowFocusFinishState,
} from '../src/renderer/js/utils/action-momentum.js';

describe('action momentum utils', () => {
  test('selects the next open action after completion', () => {
    const actions = [
      { id: 'done-1', title: 'Completed action' },
      { id: 'next-1', title: 'Review budget', status: 'open' },
      { id: 'next-2', title: 'Pay bill', status: 'open' },
    ];

    expect(getNextActionAfterCompletion(actions, 'done-1')).toEqual(actions[1]);
  });

  test('ignores completed action and unavailable statuses', () => {
    const actions = [
      { id: 'a', status: 'done' },
      { id: 'b', status: 'snoozed' },
      { id: 'c', status: 'open', title: 'Use this' },
    ];

    expect(getNextActionAfterCompletion(actions, 'a')).toEqual(actions[2]);
  });

  test('builds first-action toast from feedback', () => {
    expect(buildCompletionToast({
      message: "Nice - you've taken your first step.",
      milestone: 'first_action',
    })).toEqual({
      message: "Nice - you've taken your first step.",
      type: 'success',
    });
  });

  test('shows focus finish state only when completion happened in focus mode', () => {
    expect(shouldShowFocusFinishState({ source: 'focus' })).toBe(true);
    expect(shouldShowFocusFinishState({ source: 'dashboard' })).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```powershell
npx jest tests/action-momentum.test.js --runInBand
```

Expected: FAIL because `action-momentum.js` does not exist.

- [ ] **Step 3: Create helper implementation**

Create `src/renderer/js/utils/action-momentum.js`:

```js
export function getNextActionAfterCompletion(actions = [], completedId = '') {
  return (actions || []).find(action => {
    if (!action || action.id === completedId) return false;
    const status = action.status || 'open';
    return status === 'open';
  }) || null;
}

export function buildCompletionToast(feedback) {
  return {
    message: feedback?.message || 'Nice - progress made.',
    type: 'success',
  };
}

export function shouldShowFocusFinishState(context = {}) {
  return context.source === 'focus';
}
```

- [ ] **Step 4: Run utility tests**

```powershell
npx jest tests/action-momentum.test.js --runInBand
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/renderer/js/utils/action-momentum.js tests/action-momentum.test.js
git commit -m "Add action momentum renderer helpers"
```

---

### Task 5: Focus Mode Finish State

**Files:**
- Modify: `src/renderer/js/components/focus-mode.js`
- Create: `tests/focus-mode-completion.test.js`
- Modify: `src/renderer/styles/main.css`

- [ ] **Step 1: Write failing Focus Mode finish-state tests**

Create `tests/focus-mode-completion.test.js`:

```js
import { renderFocusMode } from '../src/renderer/js/components/focus-mode.js';

describe('renderFocusMode completion state', () => {
  const action = {
    id: 'a1',
    title: 'Review high-interest debt',
    priority: 'high',
    category: 'debt',
    rationale: 'This debt is reducing cash flow.',
    impact_text: 'Reduces interest drag.',
  };

  test('renders completion feedback and disables repeated completion', () => {
    const html = renderFocusMode(action, {}, {
      completionFeedback: {
        message: 'Nice - progress made.',
        detail: 'Completed: Review high-interest debt',
        weeklyCount: 2,
      },
    });

    expect(html).toContain('focus-mode-complete');
    expect(html).toContain('Nice - progress made.');
    expect(html).toContain('Completed: Review high-interest debt');
    expect(html).not.toContain('data-action="complete-next-best-action"');
  });

  test('renders next action shortcut when provided', () => {
    const html = renderFocusMode(action, {}, {
      completionFeedback: { message: 'Nice - progress made.' },
      nextAction: { id: 'a2', title: 'Check budget' },
    });

    expect(html).toContain('data-action="open-focus-mode"');
    expect(html).toContain('data-id="a2"');
    expect(html).toContain('Check budget');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```powershell
npx jest tests/focus-mode-completion.test.js --runInBand
```

Expected: FAIL because `renderFocusMode` does not accept the third options argument yet.

- [ ] **Step 3: Update Focus Mode component**

Change the function signature in `src/renderer/js/components/focus-mode.js`:

```js
export function renderFocusMode(action, personalizationProfile = {}, options = {}) {
```

Add near the top:

```js
const completionFeedback = options.completionFeedback || null;
const nextAction = options.nextAction || null;
```

Add this block after the subtitle:

```js
${completionFeedback ? `
  <div class="focus-mode-complete">
    <div class="focus-mode-complete-title">${icon('check-circle', 16)} ${h(completionFeedback.message)}</div>
    ${completionFeedback.detail ? `<div class="focus-mode-complete-detail">${h(completionFeedback.detail)}</div>` : ''}
    ${nextAction ? `
      <button class="btn btn-primary btn-sm" data-action="open-focus-mode" data-id="${h(nextAction.id)}">
        ${icon('target', 12)} Focus next: ${h(nextAction.title || 'Next action')}
      </button>
    ` : ''}
  </div>
` : ''}
```

Wrap the action controls so they only render before completion:

```js
${!completionFeedback ? `
  <div class="focus-mode-actions">
    <button class="btn btn-primary" data-action="complete-next-best-action" data-id="${h(action.id)}">${icon('check', 14)} Mark done</button>
    <button class="btn btn-secondary" data-action="dismiss-next-best-action" data-id="${h(action.id)}">${icon('x', 14)} Dismiss</button>
    <button class="btn btn-ghost" data-action="snooze-next-best-action" data-id="${h(action.id)}">${icon('clock', 14)} Snooze 7d</button>
  </div>
` : ''}
```

- [ ] **Step 4: Add finish-state CSS**

Add to `src/renderer/styles/main.css` near Focus Mode styles:

```css
.focus-mode-complete {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  padding: 14px 16px;
  border: 1px solid rgba(76, 146, 106, .28);
  background: rgba(76, 146, 106, .08);
  border-radius: 6px;
}
.focus-mode-complete-title {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--green);
  font-size: 13px;
  font-weight: 700;
  line-height: 1.4;
}
.focus-mode-complete-detail {
  color: var(--sub);
  font-size: 12px;
  line-height: 1.4;
}
```

- [ ] **Step 5: Run Focus Mode tests**

```powershell
npx jest tests/focus-mode-completion.test.js --runInBand
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add src/renderer/js/components/focus-mode.js src/renderer/styles/main.css tests/focus-mode-completion.test.js
git commit -m "Add focus mode completion state"
```

---

### Task 6: Complete-Action Handler Integration

**Files:**
- Modify: `src/renderer/js/handlers/shared.js`
- Modify: `src/renderer/js/state/plan.js`

- [ ] **Step 1: Update handler imports**

At the top of `src/renderer/js/handlers/shared.js`, add:

```js
import {
  buildCompletionToast,
  getNextActionAfterCompletion,
} from '../utils/action-momentum.js';
```

- [ ] **Step 2: Refresh engagement after saved plan completion**

In the `complete-action` case, after `await State.completeRecommendedAction(btn.dataset.id);`, add:

```js
try { await State.refreshEngagementProgress(); } catch (_) { /* non-critical */ }
```

Keep the existing toast for saved plan actions unless product wants saved actions to use the same completion feedback later.

- [ ] **Step 3: Replace next-best-action completion feedback**

In the `complete-next-best-action` case, replace the existing first-action/toast block with:

```js
const wasFocusMode = ctx.appState.activeModal === '_custom';
const settings = ctx.State.getState().settings || {};
const isFirstAction = !settings.first_action_completed;

await ctx.State.completeNextBestAction(btn.dataset.id);
if (nba) await ctx.State.recordInteraction('complete', nba.category || 'other');
if (isFirstAction) await ctx.State.updateSettings({ first_action_completed: true });
await ctx.State.refreshEngagementProgress();

const feedback = await ctx.State.getCompletionFeedback({
  isFirstAction,
  actionTitle: nba?.title || '',
});
const nextAction = getNextActionAfterCompletion(ctx.State.getState().nextBestActions || [], btn.dataset.id);

if (wasFocusMode && nba) {
  const { renderFocusMode } = await import('../components/focus-mode.js');
  ctx.appState.activeModal = '_custom';
  ctx.appState.editData = {
    title: 'Focus Mode',
    body: renderFocusMode(nba, ctx.State.getState().personalizationProfile || {}, {
      completionFeedback: feedback,
      nextAction,
    }),
  };
  ctx.render();
  return true;
}

const toast = buildCompletionToast(feedback);
ctx.showToast(toast.message, toast.type);
ctx.appState.activeModal = null;
ctx.appState.editData = null;
setTimeout(() => ctx.render(), 250);
return true;
```

Important: remove the earlier duplicate `await ctx.State.completeNextBestAction(...)` call if it still exists above this block. Completion must happen exactly once.

- [ ] **Step 4: Refresh engagement after dismiss and snooze**

After dismiss and snooze interactions, add:

```js
try { await ctx.State.refreshEngagementProgress(); } catch (_) { /* non-critical */ }
```

This keeps summary state current when user chooses not to act, without treating those as completions.

- [ ] **Step 5: Run focused tests**

```powershell
npx jest tests/action-momentum.test.js tests/focus-mode-completion.test.js tests/progress-strip.test.js tests/engagement-engine.test.js --runInBand
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add src/renderer/js/handlers/shared.js src/renderer/js/state/plan.js
git commit -m "Wire completion feedback into actions"
```

---

### Task 7: Startup And Dashboard Refresh Polish

**Files:**
- Modify: `src/renderer/js/app.js`
- Modify: `src/renderer/js/pages/dashboard.js`

- [ ] **Step 1: Use the new state wrapper on startup**

In `src/renderer/js/app.js`, replace:

```js
const ep = await State.getEngagementProgress();
State.getState().engagementProgress = ep;
```

with:

```js
await State.refreshEngagementProgress();
```

- [ ] **Step 2: Keep dashboard hierarchy action-first**

Confirm `src/renderer/js/pages/dashboard.js` order is:

```js
${renderAISummary(buildDashboardAISummary(state, F, generateAISummary))}

${renderProactiveBanner(state.proactiveNudges)}

${renderFinancialSnapshotBar(state, F)}

${renderProgressStrip(state.engagementProgress)}

${renderNextBestActionsPanel(state.nextBestActions || [])}
```

This keeps momentum close to the snapshot and before the action cards.

- [ ] **Step 3: Run dashboard-related tests**

```powershell
npx jest tests/dashboard-intelligence.test.js tests/progress-strip.test.js --runInBand
```

Expected: PASS.

- [ ] **Step 4: Commit**

```powershell
git add src/renderer/js/app.js src/renderer/js/pages/dashboard.js
git commit -m "Refresh dashboard action momentum"
```

---

### Task 8: Verification

**Files:**
- No new edits unless tests reveal an issue.

- [ ] **Step 1: Run focused regression tests**

```powershell
npx jest tests/engagement-engine.test.js tests/action-momentum.test.js tests/progress-strip.test.js tests/focus-mode-completion.test.js tests/next-best-actions-engine.test.js tests/database-settings.test.js --runInBand
```

Expected: all selected suites PASS.

- [ ] **Step 2: Run full Jest**

```powershell
npm test -- --runInBand
```

Expected: all test suites PASS.

- [ ] **Step 3: Run touched-file lint**

```powershell
npx eslint src/main/engagement-engine.js src/main/ipc-handlers.js src/main/preload.js src/renderer/js/app.js src/renderer/js/components/focus-mode.js src/renderer/js/components/progress-strip.js src/renderer/js/handlers/shared.js src/renderer/js/pages/dashboard.js src/renderer/js/state/core.js src/renderer/js/state/plan.js src/renderer/js/utils/action-momentum.js
```

Expected: 0 errors. Existing unused-variable warnings may remain in touched legacy files.

- [ ] **Step 4: Run repo lint and record known blockers**

```powershell
npm run lint
```

Expected: may still fail on pre-existing unrelated/vendored issues in `src/renderer/js/lib/chart.umd.js`, `advisor-wizard.js`, `ai-summary.js`, `export-import.js`, or `xlsx-parser.js`. Do not fix those in this feature branch unless the user explicitly expands scope.

- [ ] **Step 5: Manual smoke test**

Run the app:

```powershell
npm start
```

Smoke checklist:
- Dashboard shows progress strip directly after the snapshot bar.
- Completing a Next Best Action from the dashboard removes it, refreshes the next action, and shows calm completion feedback.
- First completed action shows the first-step message once.
- Opening Focus Mode, then marking done, shows the inline finish state and does not show another `Mark done` button.
- Finish state offers the next open action when one exists.
- Dismiss and snooze still close the modal and refresh the dashboard.

- [ ] **Step 6: Final commit if verification fixes were needed**

```powershell
git status --short
git add <only-files-fixed-during-verification>
git commit -m "Stabilize action momentum flow"
```

Skip this step if Task 8 required no edits.

---

## Acceptance Criteria

- Dashboard shows weekly progress near the command center hierarchy, before Next Best Actions.
- Completion feedback is calm and specific, with a first-action milestone and occasional weekly momentum message.
- Completing an action from Focus Mode produces a visible finish state instead of instantly disappearing.
- The next open action is offered after Focus Mode completion.
- Next Best Actions still remove completed/snoozed/dismissed items from visible state.
- Engagement progress refreshes after completion, dismissal, and snooze.
- Full Jest passes.
- Touched-file ESLint has no errors.

## Out Of Scope

- Obvious streak counters.
- New notification/reminder system.
- Full proactive nudge related-action routing.
- Repo-wide lint cleanup of vendored or unrelated legacy files.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-11-action-momentum.md`. Two execution options:

**1. Subagent-Driven (recommended)** - Dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** - Execute tasks in this session using executing-plans, with checkpoints after each task group.

