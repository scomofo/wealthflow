import { icon } from '../icons.js';
import { fmt, h } from '../helpers.js';
import { progress } from '../components/progress-bar.js';

export function renderSavings(state) {
  const tot = state.goals.reduce((s, g) => s + g.current, 0);
  return `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <div>
        <div style="font-size:12px;color:var(--sub)">Total Saved</div>
        <div style="font-size:28px;font-weight:800;letter-spacing:-1px">${fmt(tot)}</div>
      </div>
      <button class="btn btn-primary" data-action="open-modal" data-modal="goal">${icon('plus', 14)} New Goal</button>
    </div>
    <div class="grid2">
      ${state.goals.map(g => {
        const p = Math.round(g.current / (g.target || 1) * 100);
        const dl = g.deadline ? Math.max(0, Math.ceil((new Date(g.deadline) - new Date()) / 864e5)) : null;
        const mn = dl ? Math.round((g.target - g.current) / Math.max(dl / 30, 1)) : 0;
        return `<div class="card">
          <div style="display:flex;justify-content:space-between;margin-bottom:12px">
            <div>
              <div style="font-weight:700;font-size:15px">${h(g.name)}</div>
              ${g.deadline ? `<div style="font-size:10.5px;color:var(--sub);margin-top:2px">Due ${g.deadline} · ${dl}d left</div>` : ''}
            </div>
            <div style="font-size:22px;font-weight:800;color:${g.color}">${p}%</div>
          </div>
          ${progress(g.current, g.target, g.color, 9)}
          <div style="display:flex;justify-content:space-between;margin-top:8px;font-size:12px">
            <span style="color:var(--sub)">Saved: <b class="mono">${fmt(g.current)}</b></span>
            <span style="color:var(--sub)">Target: <b class="mono">${fmt(g.target)}</b></span>
          </div>
          ${mn > 0 ? `<div style="margin-top:8px;padding:6px 8px;border-radius:6px;background:var(--input);font-size:10px;color:var(--sub);display:flex;align-items:center;gap:4px">${icon('lightbulb', 10, 'var(--accent)')} Save ${fmt(mn)}/mo to hit deadline</div>` : ''}
          <div style="display:flex;gap:6px;margin-top:8px">
            <button class="btn btn-secondary" style="flex:1;justify-content:center;font-size:11px;padding:6px 0" data-action="deposit-goal" data-id="${g.id}">${icon('plus', 12)} Deposit</button>
            <button class="btn btn-danger" style="padding:6px 8px" data-action="delete-goal" data-id="${g.id}">${icon('trash-2', 12)}</button>
          </div>
        </div>`;
      }).join('')}
    </div>
    ${state.goals.length === 0 ? '<div class="card empty">No goals yet. Create one!</div>' : ''}`;
}
