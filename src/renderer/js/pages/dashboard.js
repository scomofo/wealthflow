import { icon } from '../icons.js';
import { fmt, h } from '../helpers.js';
import { stat } from '../components/stat-card.js';
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

export function setShowAllActions(val) { /* no-op: panel handles its own display */ }

const BADGE_DEFS = [
  { id: 'first-steps',   emoji: '🚀', label: 'First Steps',   check: (s, c) => (c.transactions || 0) >= 1 },
  { id: 'budget-master', emoji: '📊', label: 'Budget Master',  check: (s, c) => (c.budgets || 0) >= 3 },
  { id: 'goal-setter',   emoji: '🎯', label: 'Goal Setter',    check: (s, c) => (c.goals || 0) >= 1 },
  { id: 'debt-aware',    emoji: '💪', label: 'Debt Aware',     check: (s, c) => (c.debts || 0) >= 1 },
  { id: 'investor',      emoji: '📈', label: 'Investor',       check: (s, c) => (c.investments || 0) >= 1 },
  { id: 'level-5',       emoji: '⭐', label: 'Level 5',        check: (s, c) => (s.level || 1) >= 5 },
  { id: 'data-rich',     emoji: '📚', label: 'Data Rich',      check: (s, c) => (c.transactions || 0) >= 10 },
  { id: 'diversified',   emoji: '🌐', label: 'Diversified',    check: (s, c) => (c.investments || 0) >= 3 },
];

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

  // ── Achievements strip ───────────────────────────────────────────────────
  const level = s.level || 1;
  const xp = s.xp || 0;
  const xpForNext = level * 100;
  const earnedBadges = BADGE_DEFS.filter(b => b.check(s, state.counts || {}));

  // ── Render ───────────────────────────────────────────────────────────────
  return `
    <div class="card dashboard-hero" style="margin-bottom:18px;padding:22px">
      <div style="font-size:18px;font-weight:700;letter-spacing:-0.5px">${monthLabel}</div>
      <div class="dashboard-subtitle" style="margin-top:4px">Your monthly financial command center</div>
      <div class="dashboard-subtitle" style="margin-top:1px">Welcome back, <b style="color:var(--text)">${h(s.user_name || 'User')}</b></div>
    </div>

    ${renderAISummary(buildDashboardAISummary(state, F, generateAISummary))}

    ${renderProactiveBanner(state.proactiveNudges)}

    ${renderFinancialSnapshotBar(state, F)}

    ${renderProgressStrip(state.engagementProgress)}

    ${renderNextBestActionsPanel(state.nextBestActions || [], { financials: F })}

    <div class="card dashboard-section">
      <div style="font-weight:700;font-size:14px;margin-bottom:12px">AI Recommendations</div>
      <button class="btn btn-primary" data-action="run-workflow" data-workflow="monthly_action_planner"${workflowCtx?.workflowLoading ? ' disabled' : ''}>
        ${icon('sparkles', 14)} Generate Monthly Action Plan
      </button>
      ${workflowCtx?.workflowLoading ? `<div style="display:flex;align-items:center;gap:8px;margin-top:10px;color:var(--sub);font-size:13px">${icon('loader', 14)} Analyzing your finances...</div>` : ''}
      ${workflowCtx?.activeWorkflowResult ? renderDecisionCard(workflowCtx.activeWorkflowResult) : ''}
    </div>
    ${renderActionList(state.recommendedActions)}

    <div class="card dashboard-section">
      <div style="font-weight:600;font-size:14px;margin-bottom:12px;display:flex;align-items:center;gap:6px">
        ${icon('bar-chart-2', 15, 'var(--accent)')} Monthly Spending Snapshot
      </div>
      ${catHtml}
    </div>

    ${renderDashboardInsightCards(state, F)}

    <div class="card dashboard-section">
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
        <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
          <span style="font-size:13px;font-weight:700;color:var(--accent)">Lv ${level}</span>
        </div>
        <div style="display:flex;align-items:center;gap:6px">
          <div style="width:120px;max-width:120px;height:6px;border-radius:3px;background:var(--border);overflow:hidden">
            <div style="height:100%;width:${Math.min(xp / xpForNext * 100, 100).toFixed(1)}%;background:var(--accent);border-radius:3px;transition:width 0.3s"></div>
          </div>
          <span style="font-size:11px;color:var(--sub)">${xp} / ${xpForNext} XP</span>
        </div>
        ${earnedBadges.length > 0 ? `
        <div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap">
          ${earnedBadges.map(b => `<span title="${b.label}" style="font-size:16px">${b.emoji}</span>`).join('')}
        </div>` : ''}
      </div>
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
