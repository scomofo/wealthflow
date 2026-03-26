import { icon } from '../icons.js';
import { fmt, h } from '../helpers.js';
import { stat } from '../components/stat-card.js';
import { progress } from '../components/progress-bar.js';

export function renderDashboard(state, F) {
  const s = state.settings;
  const widgets = JSON.parse(s?.dashboard_widgets || '["summary","budgets","goals","transactions","insights"]');

  // Budget alerts — budgets over 80%
  const budgetAlerts = state.budgets.map(b => {
    const sp = F.catSpending[b.category] || 0;
    const pct = b.amount > 0 ? (sp / b.amount * 100) : 0;
    return { ...b, spent: sp, pct };
  }).filter(b => b.pct > 80);

  // Spending insight — compare category spending
  const topCats = Object.entries(F.catSpending).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const totalSpent = Object.values(F.catSpending).reduce((s, v) => s + v, 0);

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
    ${widgets.includes('summary') ? `
    <div class="welcome-card">
      <div>
        <div style="font-size:13px;color:var(--sub)">Welcome back,</div>
        <div style="font-size:26px;font-weight:800;letter-spacing:-1px">${h(s.user_name)} ${icon('maple-leaf', 20, 'var(--red)')}</div>
        <div style="font-size:12px;color:var(--sub);margin-top:3px">Savings rate: ${F.savingsRate.toFixed(1)}%</div>
      </div>
      <div style="display:flex;gap:10px">
        <div style="padding:8px 16px;background:var(--card);border-radius:11px;border:1px solid var(--border);text-align:center">
          <div style="font-size:10px;color:var(--sub)">Level</div>
          <div style="font-size:20px;font-weight:700;color:var(--accent)">${s.level}</div>
        </div>
        <div style="padding:8px 16px;background:var(--card);border-radius:11px;border:1px solid var(--border);text-align:center">
          <div style="font-size:10px;color:var(--sub)">XP</div>
          <div style="font-size:20px;font-weight:700;color:var(--orange)">${s.xp}</div>
        </div>
      </div>
    </div>
    <div class="grid4">
      ${stat('Net Worth', fmt(F.netWorth), 5.2, 'wallet', 'var(--accent)')}
      ${stat('Income', fmt(F.income), 14.1, 'arrow-up-right', 'var(--green)')}
      ${stat('Expenses', fmt(F.expenses), -3.8, 'receipt', 'var(--red)')}
      ${stat('Savings Rate', F.savingsRate.toFixed(1) + '%', 4.2, 'piggy-bank', 'var(--blue)')}
    </div>
    ` : ''}
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
    ${widgets.includes('insights') && totalSpent > 0 ? `
    <div class="card insight-card" style="margin-top:${budgetAlerts.length > 0 ? '0' : '14px'}">
      <div style="font-weight:600;font-size:14px;margin-bottom:10px;display:flex;align-items:center;gap:6px">
        ${icon('lightbulb', 15, 'var(--accent)')} Spending Insights
      </div>
      <div style="font-size:12px;color:var(--sub);line-height:1.6">
        Total spending this period: <b style="color:var(--text)">${fmt(totalSpent)}</b>.
        ${topCats.length > 0 ? `Top categories: ${topCats.map(([k, v]) => `<b style="color:var(--text)">${k}</b> (${fmt(v)}, ${(v / totalSpent * 100).toFixed(0)}%)`).join(', ')}.` : ''}
        ${F.savingsRate > 20 ? ' Your savings rate is strong — keep it up!' : ' Consider trimming discretionary spending to boost your savings rate above 20%.'}
      </div>
    </div>` : ''}
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
          ${icon('flame', 15, 'var(--orange)')} Challenges
        </div>
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
      </div>
    </div>`;
}
