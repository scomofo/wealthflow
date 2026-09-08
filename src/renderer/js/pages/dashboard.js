import { icon } from '../icons.js';
import { fmt, h } from '../helpers.js';
import { renderNextBestActionsPanel } from '../components/next-best-actions-panel.js';
import { renderDecisionCard } from '../components/ai-decision-card.js';
import { renderActionList } from '../components/ai-action-list.js';
import { renderFinancialSnapshotBar } from '../components/financial-snapshot-bar.js';
import { renderDashboardInsightCards } from '../components/dashboard-insight-cards.js';
import { renderAISummary } from '../components/ai-summary.js';
import { generateAISummary } from '../utils/ai-summary.js';
import { buildDashboardAISummary } from '../utils/dashboard-intelligence.js';
import { renderProactiveBanner } from '../components/proactive-banner.js';
import { renderProgressStrip } from '../components/progress-strip.js';

export function setShowAllActions(_val) { /* no-op: panel handles its own display */ }

export function renderDashboard(state, F, workflowCtx) {
  const s = state.settings || {};
  const now = new Date();
  const monthLabel = now.toLocaleString('en-CA', { month: 'long', year: 'numeric' });

  // ── Monthly Spending Snapshot ────────────────────────────────────────────
  const catEntries = Object.entries(F.catSpending || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const catHtml = catEntries.length === 0
    ? '<div class="empty">No spending data this month</div>'
    : catEntries.map(([cat, spent]) => {
        const budget = (state.budgets || []).find(b => b.category === cat);
        const max = budget ? budget.amount : spent;
        const over = budget && spent > budget.amount;
        const barColor = over ? 'var(--red)' : 'var(--accent)';
        return `
        <div style="margin-bottom:10px">
          <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:4px">
            <span style="font-size:12px;font-weight:500">${h(cat)}</span>
            <span class="mono" style="font-size:11px;color:${over ? 'var(--red)' : 'var(--sub)'}">
              ${fmt(spent)}${budget ? ` / ${fmt(budget.amount)}` : ''}
            </span>
          </div>
          <div style="height:6px;border-radius:3px;background:var(--border);overflow:hidden">
            <div style="height:100%;width:${Math.min(spent / max * 100, 100).toFixed(1)}%;background:${barColor};border-radius:3px;transition:width 0.3s"></div>
          </div>
        </div>`;
      }).join('');

  // ── Render ───────────────────────────────────────────────────────────────
  // Keep decision surfaces ahead of status/context surfaces. The first thing
  // below the monthly header should answer "what should I do next?".
  return `
    <div class="card dashboard-hero" style="margin-bottom:18px;padding:22px">
      <div style="font-size:18px;font-weight:700;letter-spacing:-0.5px">${monthLabel}</div>
      <div class="dashboard-subtitle" style="margin-top:4px">Your monthly financial command center</div>
      <div class="dashboard-subtitle" style="margin-top:1px">Welcome back, <b style="color:var(--text)">${h(s.user_name || 'User')}</b></div>
    </div>

    ${renderNextBestActionsPanel(state.nextBestActions || [], { financials: F })}

    ${renderFinancialSnapshotBar(state, F)}

    ${renderAISummary(buildDashboardAISummary(state, F, generateAISummary))}

    ${renderProactiveBanner(state.proactiveNudges)}

    ${renderProgressStrip(state.engagementProgress)}

    <div class="card dashboard-section">
      <div style="font-weight:700;font-size:14px;margin-bottom:12px">AI Recommendations</div>
      <button class="btn btn-primary" data-action="run-workflow" data-workflow="monthly_action_planner"${workflowCtx?.workflowLoading ? ' disabled' : ''}>
        ${icon('sparkles', 14)} Generate Monthly Action Plan
      </button>
      ${workflowCtx?.workflowLoading ? `<div style="display:flex;align-items:center;gap:8px;margin-top:10px;color:var(--sub);font-size:13px">${icon('loader', 14)} Analyzing your finances...</div>` : ''}
      ${workflowCtx?.activeWorkflowResult ? renderDecisionCard(workflowCtx.activeWorkflowResult) : ''}
    </div>
    ${renderActionList(state.recommendedActions)}

    ${renderDashboardInsightCards(state, F)}

    <div class="card dashboard-section">
      <div style="font-weight:600;font-size:14px;margin-bottom:12px;display:flex;align-items:center;gap:6px">
        ${icon('bar-chart-2', 15, 'var(--accent)')} Monthly Spending Snapshot
      </div>
      ${catHtml}
    </div>

    <div class="grid3" style="margin-top:14px">
      <button class="card" style="text-align:left;cursor:pointer;padding:14px 16px;display:flex;align-items:center;gap:10px;background:var(--bg-soft);border-color:var(--border-soft)" data-action="import-csv">
        ${icon('upload', 18, 'var(--accent)')}
        <span style="font-size:13px;font-weight:500">Import Transactions</span>
      </button>
      <button class="card" style="text-align:left;cursor:pointer;padding:14px 16px;display:flex;align-items:center;gap:10px;background:var(--bg-soft);border-color:var(--border-soft)" data-action="generate-monthly-report">
        ${icon('file-text', 18, 'var(--green)')}
        <span style="font-size:13px;font-weight:500">AI Monthly Report</span>
      </button>
      <button class="card" style="text-align:left;cursor:pointer;padding:14px 16px;display:flex;align-items:center;gap:10px;background:var(--bg-soft);border-color:var(--border-soft)" data-nav="analytics">
        ${icon('trending-up', 18, 'var(--blue)')}
        <span style="font-size:13px;font-weight:500">View Analytics</span>
      </button>
    </div>`;
}
