import { icon } from '../icons.js';
import { h } from '../helpers.js';
import { progress } from '../components/progress-bar.js';

export function renderAchievements(state) {
  const s = state.settings;
  const c = state.counts;
  const badges = [
    { n: 'First Steps', d: 'Added first transaction', i: '🚀', c: c.transactions >= 1 },
    { n: 'Budget Master', d: 'Has budgets', i: '📊', c: c.budgets >= 3 },
    { n: 'Goal Setter', d: 'Created a goal', i: '🎯', c: c.goals >= 1 },
    { n: 'Debt Aware', d: 'Tracking debts', i: '💪', c: c.debts >= 1 },
    { n: 'Investor', d: 'Added investment', i: '📈', c: c.investments >= 1 },
    { n: 'Level 5', d: 'Reached level 5', i: '⭐', c: s.level >= 5 },
    { n: 'Data Rich', d: '10+ transactions', i: '📚', c: c.transactions >= 10 },
    { n: 'Diversified', d: '3+ investments', i: '🌐', c: c.investments >= 3 },
  ];

  return `
    <div class="card" style="background:var(--abg);border-color:var(--accent)22">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <div>
          <div style="font-size:24px;font-weight:800">Level ${s.level}</div>
          <div style="font-size:12px;color:var(--sub);margin-top:2px">${s.xp} / ${s.level * 500} XP</div>
        </div>
        <div style="text-align:center">
          <div style="font-size:20px;font-weight:700;color:var(--accent)">${badges.filter(b => b.c).length}</div>
          <div style="font-size:10px;color:var(--sub)">Badges</div>
        </div>
      </div>
      ${progress(s.xp % 500, 500, 'var(--accent)', 10)}
    </div>
    <div style="font-weight:600;font-size:16px;margin:14px 0 10px">Challenges</div>
    <div class="grid3">
      ${state.challenges.map(ch => `
        <div class="card">
          <div style="display:flex;justify-content:space-between;margin-bottom:6px">
            <span style="font-weight:600;font-size:13px">${h(ch.name)}</span>
            <span style="font-size:10px;color:var(--accent);font-weight:600">+${ch.xp}XP</span>
          </div>
          <div style="font-size:11px;color:var(--sub);margin-bottom:8px">${h(ch.description)}</div>
          ${progress(ch.progress, ch.target, 'var(--accent)')}
          <div style="display:flex;justify-content:space-between;margin-top:5px;align-items:center">
            <span style="font-size:10px;color:var(--muted)">${ch.progress}/${ch.target}</span>
            <button class="btn btn-secondary" style="padding:4px 9px;font-size:10px" data-action="log-challenge" data-id="${ch.id}">
              ${icon('plus', 11)} Log
            </button>
          </div>
        </div>`).join('')}
      ${state.challenges.length === 0 ? '<div class="card empty">No challenges</div>' : ''}
    </div>
    <div style="font-weight:600;font-size:16px;margin:14px 0 10px">Badges</div>
    <div class="grid4">
      ${badges.map(b => `
        <div class="card badge-card" style="opacity:${b.c ? 1 : .35};${b.c ? 'border-color:var(--accent)44' : ''}">
          <div class="badge-icon">${b.i}</div>
          <div style="font-weight:600;font-size:12px;margin-bottom:2px">${h(b.n)}</div>
          <div style="font-size:10px;color:var(--sub)">${h(b.d)}</div>
          ${b.c ? '<div style="margin-top:4px;font-size:10px;color:var(--green)">Earned</div>' : ''}
        </div>`).join('')}
    </div>
    <div class="card" style="margin-top:14px">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <div style="font-weight:600;font-size:14px">Reset All Data</div>
          <div style="font-size:11px;color:var(--sub)">Clear everything and start fresh</div>
        </div>
        <button class="btn btn-danger" data-action="reset-all">${icon('trash-2', 13)} Reset</button>
      </div>
    </div>`;
}
