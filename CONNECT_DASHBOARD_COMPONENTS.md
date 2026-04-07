# Connect Dashboard Components — Integration Guide

This guide wires the newly added dashboard components into WealthFlow.

Created components:
- `src/renderer/js/components/next-best-actions-panel.js`
- `src/renderer/js/components/financial-snapshot-bar.js`
- `src/renderer/js/components/dashboard-action-list.js`
- `src/renderer/js/components/dashboard-insight-cards.js`

---

## 1. Update `src/renderer/js/pages/dashboard.js`

### Add imports at the top
```js
import { icon } from '../icons.js';
import { fmt, h } from '../helpers.js';
import { progress } from '../components/progress-bar.js';
import { renderNextBestActionsPanel } from '../components/next-best-actions-panel.js';
import { renderFinancialSnapshotBar } from '../components/financial-snapshot-bar.js';
import { renderDashboardActionList } from '../components/dashboard-action-list.js';
import { renderDashboardInsightCards } from '../components/dashboard-insight-cards.js';
```

### Remove unused import
Delete:
```js
import { stat } from '../components/stat-card.js';
```

### Recommended `renderDashboard` replacement
Replace the body of `renderDashboard(state, F)` with:

```js
export function renderDashboard(state, F) {
  const s = state.settings;
  const widgets = JSON.parse(s?.dashboard_widgets || '["summary","budgets","goals","transactions","insights"]');

  const nextBestActions = (state.nextBestActions || [])
    .filter(a => !a.deleted_at && a.status !== 'done' && a.status !== 'dismissed')
    .slice(0, 3);

  const recommendedActions = (state.recommendedActions || [])
    .filter(a => a.status !== 'done' && !a.deleted_at)
    .slice(0, 5);

  const budgetAlerts = state.budgets.map(b => {
    const sp = F.catSpending[b.category] || 0;
    const pct = b.amount > 0 ? (sp / b.amount * 100) : 0;
    return { ...b, spent: sp, pct };
  }).filter(b => b.pct > 80);

  const showProfileCTA = !s.profile_completed;

  return `
    ${showProfileCTA ? `
    <div class="card" style="margin-bottom:14px;background:linear-gradient(135deg,var(--abg),#d4a84308);border-color:var(--accent)33;display:flex;align-items:center;gap:16px;padding:18px 22px">
      <div style="width:44px;height:44px;border-radius:12px;background:var(--accent)18;display:flex;align-items:center;justify-content:center;flex-shrink:0">
        ${icon('clipboard-list', 22, 'var(--accent)')}
      </div>
      <div style="flex:1">
        <div style="font-weight:700;font-size:14px;margin-bottom:3px">Complete Your Financial Profile</div>
        <div style="font-size:11px;color:var(--sub);line-height:1.5">Answer a few questions to get personalized recommendations on savings, investments, insurance, and tax strategy.</div>
      </div>
      <button class="btn btn-primary" data-action="nav-to-advisor">${icon('arrow-up-right', 13)} Get Started</button>
    </div>
    ` : ''}

    <div style="display:flex;justify-content:flex-end;margin-bottom:6px">
      <button class="edit-btn" data-action="config-widgets" title="Customize dashboard widgets" style="padding:4px 8px;border-radius:6px;background:var(--card);border:1px solid var(--border);cursor:pointer;display:flex;align-items:center;gap:4px;font-size:11px;color:var(--sub)">
        ${icon('settings', 13)} Widgets
      </button>
    </div>

    ${renderNextBestActionsPanel(nextBestActions, { loading: !!state.loadingNextBestActions, stale: false })}
    ${renderFinancialSnapshotBar(state, F)}
    ${widgets.includes('insights') ? renderDashboardInsightCards(state, F) : ''}
    ${renderDashboardActionList(recommendedActions)}

    <div class="grid3" style="margin-top:14px">
      ${widgets.includes('transactions') ? `
      <div class="card">
        <div style="display:flex;justify-content:space-between;margin-bottom:12px">
          <span style="font-weight:600;font-size:14px">Recent Transactions</span>
          <button class="btn-ghost" style="font-size:11px;color:var(--accent);background:none;border:none" data-nav="transactions">See all</button>
        </div>
        ${state.transactions.length === 0 ? '<div class="empty">No transactions yet<br><button class="btn btn-primary btn-sm" style="margin-top:8px" data-action="open-modal" data-modal="tx">Add your first transaction</button></div>' : ''}
        ${state.transactions.slice(0, 5).map(t => `
          <div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--border)">
            <div class="tx-icon" style="width:32px;height:32px;border-radius:8px">${icon(t.icon || 'receipt', 14)}</div>
            <div style="flex:1">
              <div style="font-size:12px;font-weight:500">${h(t.description)}</div>
              <div style="font-size:10px;color:var(--sub)">${t.date}</div>
            </div>
            <div class="mono" style="font-size:12.5px;font-weight:600;color:${t.amount > 0 ? 'var(--green)' : 'var(--text)'}">
              ${t.amount > 0 ? '+' : ''}${fmt(t.amount)}
            </div>
          </div>`).join('')}
      </div>` : ''}

      ${widgets.includes('goals') ? `
      <div class="card">
        <div style="display:flex;justify-content:space-between;margin-bottom:12px">
          <span style="font-weight:600;font-size:14px">Savings Goals</span>
          <button class="btn-ghost" style="font-size:11px;color:var(--accent);background:none;border:none" data-nav="savings">See all</button>
        </div>
        ${state.goals.length === 0 ? '<div class="empty">No savings goals yet<br><button class="btn btn-primary btn-sm" style="margin-top:8px" data-action="open-modal" data-modal="goal">Create a goal</button></div>' : ''}
        ${state.goals.slice(0, 4).map(g => `
          <div style="margin-bottom:12px">
            <div style="display:flex;justify-content:space-between;margin-bottom:4px">
              <span style="font-size:12px;font-weight:500">${h(g.name)}</span>
              <span class="mono" style="font-size:10.5px;color:var(--sub)">${Math.round(g.current / g.target * 100)}%</span>
            </div>
            ${progress(g.current, g.target, g.color)}
          </div>`).join('')}
      </div>` : ''}

      <div class="card">
        <div style="font-weight:600;font-size:14px;margin-bottom:12px;display:flex;align-items:center;gap:6px">
          ${icon(showProfileCTA ? 'clipboard-list' : 'flame', 15, showProfileCTA ? 'var(--accent)' : 'var(--orange)')}
          ${showProfileCTA ? 'Profile Progress' : 'Challenges'}
        </div>
        ${showProfileCTA ? `
          <div style="font-size:12px;color:var(--sub);line-height:1.6;margin-bottom:12px">Complete your financial profile to improve AI recommendations and planning guidance.</div>
          <button class="btn btn-primary btn-sm" data-action="nav-to-advisor">${icon('arrow-up-right', 12)} Finish profile</button>
        ` : `
          ${state.challenges.map(ch => `
            <div style="padding:10px;background:var(--input);border-radius:9px;margin-bottom:7px">
              <div style="display:flex;justify-content:space-between;margin-bottom:4px">
                <span style="font-size:12px;font-weight:600">${h(ch.name)}</span>
                <span style="font-size:10px;color:var(--accent);font-weight:600">+${ch.xp}XP</span>
              </div>
              ${progress(ch.progress, ch.target, 'var(--accent)', 5)}
              <div style="font-size:10px;color:var(--muted);margin-top:3px;text-align:right">${ch.progress}/${ch.target}</div>
            </div>`).join('')}
          ${state.challenges.length === 0 ? '<div class="empty">No active challenges</div>' : ''}
        `}
      </div>
    </div>

    ${widgets.includes('budgets') && budgetAlerts.length > 0 ? `
    <div class="card insight-card" style="margin-top:14px">
      <div style="font-weight:600;font-size:14px;margin-bottom:10px;display:flex;align-items:center;gap:6px">
        ${icon('alert-triangle', 15, 'var(--orange)')} Budget Alerts
      </div>
      ${budgetAlerts.map(b => `
        <div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid var(--border)">
          <div style="flex:1;font-size:12px;font-weight:500">${h(b.category)}</div>
          <div class="mono" style="font-size:12px;color:${b.pct > 100 ? 'var(--red)' : 'var(--orange)'}">
            ${b.pct.toFixed(0)}% — ${fmt(b.spent)} / ${fmt(b.amount)}
          </div>
        </div>`).join('')}
    </div>` : ''}
  `;
}
```

---

## 2. Update `src/renderer/js/state.js`

### Add state fields
Inside the initial `state` object, add:
```js
recommendedActions: [],
nextBestActions: [],
loadingNextBestActions: false,
```

### Add methods
Add these methods near the bottom:

```js
export async function loadRecommendedActions() {
  if (!api.getRecommendedActions) return [];
  state.recommendedActions = await api.getRecommendedActions();
  return state.recommendedActions;
}

export async function loadNextBestActions() {
  if (!api.getNextBestActions) return [];
  state.nextBestActions = await api.getNextBestActions();
  return state.nextBestActions;
}

export async function generateNextBestActions() {
  if (!api.generateNextBestActions) return [];
  state.loadingNextBestActions = true;
  try {
    state.nextBestActions = await api.generateNextBestActions();
    return state.nextBestActions;
  } finally {
    state.loadingNextBestActions = false;
  }
}

export async function completeNextBestAction(id) {
  if (!api.completeNextBestAction) return;
  await api.completeNextBestAction(id);
  state.nextBestActions = state.nextBestActions.filter(a => a.id !== id);
}

export async function dismissNextBestAction(id) {
  if (!api.dismissNextBestAction) return;
  await api.dismissNextBestAction(id);
  state.nextBestActions = state.nextBestActions.filter(a => a.id !== id);
}

export async function snoozeNextBestAction(id, untilDate) {
  if (!api.snoozeNextBestAction) return;
  await api.snoozeNextBestAction(id, untilDate);
  state.nextBestActions = state.nextBestActions.filter(a => a.id !== id);
}

export async function completeRecommendedAction(id) {
  if (!api.completeRecommendedAction) return;
  await api.completeRecommendedAction(id);
  state.recommendedActions = state.recommendedActions.filter(a => a.id !== id);
}

export async function deleteRecommendedAction(id) {
  if (!api.deleteRecommendedAction) return;
  await api.deleteRecommendedAction(id);
  state.recommendedActions = state.recommendedActions.filter(a => a.id !== id);
}
```

### Extend `loadAll()`
After your existing `Promise.all(...)` result assignment, add:
```js
  try {
    if (api.getRecommendedActions) state.recommendedActions = await api.getRecommendedActions();
    if (api.getNextBestActions) state.nextBestActions = await api.getNextBestActions();
  } catch {
    state.recommendedActions = state.recommendedActions || [];
    state.nextBestActions = state.nextBestActions || [];
  }
```

---

## 3. Update `src/renderer/js/app.js`

### Add handlers in the big click switch
Add these cases:

```js
      case 'generate-next-best-actions': {
        try {
          showToast('Refreshing actions...', 'info');
          await State.generateNextBestActions();
          render();
        } catch (err) {
          showToast('Failed to refresh actions: ' + err.message, 'error');
        }
        break;
      }

      case 'complete-next-best-action': {
        try {
          await State.completeNextBestAction(btn.dataset.id);
          showToast('Action marked complete', 'success');
          render();
        } catch (err) {
          showToast('Failed to complete action', 'error');
        }
        break;
      }

      case 'dismiss-next-best-action': {
        try {
          await State.dismissNextBestAction(btn.dataset.id);
          showToast('Action dismissed', 'success');
          render();
        } catch (err) {
          showToast('Failed to dismiss action', 'error');
        }
        break;
      }

      case 'snooze-next-best-action': {
        try {
          const until = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
          await State.snoozeNextBestAction(btn.dataset.id, until);
          showToast('Action snoozed for 7 days', 'success');
          render();
        } catch (err) {
          showToast('Failed to snooze action', 'error');
        }
        break;
      }

      case 'complete-ai-action': {
        try {
          await State.completeRecommendedAction(btn.dataset.id);
          showToast('Plan item completed', 'success');
          render();
        } catch (err) {
          showToast('Failed to complete saved action', 'error');
        }
        break;
      }

      case 'delete-ai-action': {
        try {
          await State.deleteRecommendedAction(btn.dataset.id);
          showToast('Saved action removed', 'success');
          render();
        } catch (err) {
          showToast('Failed to remove saved action', 'error');
        }
        break;
      }
```

### Add startup refresh in `init()`
After `await State.loadAll();`, add:
```js
  try {
    await State.loadNextBestActions?.();
    await State.loadRecommendedActions?.();
  } catch (e) { /* ignore dashboard action load failures */ }
```

---

## 4. Bridge requirements
These dashboard connections expect the preload/API bridge to expose these methods if your backend work is already in place:

```js
getRecommendedActions()
completeRecommendedAction(id)
deleteRecommendedAction(id)
getNextBestActions()
generateNextBestActions()
completeNextBestAction(id)
dismissNextBestAction(id)
snoozeNextBestAction(id, untilDate)
```

If some of these are not implemented yet, the dashboard will still render because the state methods guard for missing bridge functions.

---

## 5. Quick smoke test
Once wired:
1. Open dashboard
2. Confirm hero panel renders even with zero actions
3. Confirm snapshot bar renders
4. Confirm saved action list renders
5. Click Refresh actions
6. Click Mark done / Dismiss / Snooze if actions exist
7. Confirm Recent Transactions and Savings Goals still render below

---

## Result
After these changes, the dashboard becomes:
- action-first
- state-aware
- wired to your new component system

It will feel substantially more like a financial command center than the current widget-driven layout.
