import { icon } from '../icons.js';
import { fmt, h } from '../helpers.js';
import { progress } from '../components/progress-bar.js';

export function renderBudget(state, F) {
  const top = Object.entries(F.catSpending).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => `${k} (${fmt(v)})`).join(', ');
  const advice = F.savingsRate > 20
    ? 'Great savings rate! Consider boosting your TFSA or RRSP contributions.'
    : 'Try reducing discretionary spending to get savings above 20%. Even small cuts to dining out add up.';

  return `
    <div class="card" style="background:var(--abg);border-color:var(--accent)33">
      <div style="display:flex;gap:12px;align-items:flex-start">
        <div style="width:42px;height:42px;border-radius:11px;background:linear-gradient(135deg,var(--accent),#8b6914);display:flex;align-items:center;justify-content:center;flex-shrink:0">
          ${icon('lightbulb', 18, '#0a0b0f')}
        </div>
        <div>
          <div style="font-weight:700;font-size:16px;margin-bottom:4px">AI Budget Analysis</div>
          <div style="font-size:12px;color:var(--sub);line-height:1.6">Top spending: ${top || 'No data'}. ${advice}</div>
        </div>
      </div>
    </div>
    <div style="display:flex;justify-content:flex-end;margin-bottom:14px">
      <button class="btn btn-primary" data-action="open-modal" data-modal="budget">${icon('plus', 14)} Add Budget</button>
    </div>
    <div class="grid2">
      ${state.budgets.map(b => {
        const rollover = b.rollover === 1;
        const carried = rollover ? (b.carried_amount || 0) : 0;
        const effective = b.amount + carried;
        const sp = F.catSpending[b.category] || 0;
        const p = effective > 0 ? (sp / effective * 100) : 0;
        const ov = sp > effective;
        return `<div class="card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
            <div>
              <div style="font-weight:600;font-size:13px;display:flex;align-items:center;gap:6px">${h(b.category)}
                <span style="font-size:9px;padding:2px 5px;border-radius:4px;background:${rollover ? 'var(--accent)22' : 'var(--border)'};color:${rollover ? 'var(--accent)' : 'var(--muted)'};font-weight:600" title="Budget rollover ${rollover ? 'enabled' : 'disabled'}">${icon('refresh-cw', 9)} ${rollover ? 'ON' : 'OFF'}</span>
              </div>
              <div style="font-size:11px;color:var(--sub)">${fmt(sp)} of ${fmt(effective)}${carried > 0 ? ` <span style="color:var(--accent);font-weight:500">(Rolled: ${fmt(carried)})</span>` : ''}</div>
            </div>
            <div style="display:flex;align-items:center;gap:6px">
              <div class="mono" style="font-size:13px;font-weight:600;color:${ov ? 'var(--red)' : 'var(--green)'}">${p.toFixed(0)}%</div>
              <button class="edit-btn" data-action="edit-budget" data-id="${b.id}">${icon('edit', 12)}</button>
              <button class="edit-btn" style="color:var(--red)" data-action="delete-budget" data-id="${b.id}">${icon('trash-2', 12)}</button>
            </div>
          </div>
          ${progress(sp, effective, ov ? 'var(--red)' : p > 80 ? 'var(--orange)' : 'var(--green)')}
          ${ov ? `<div style="margin-top:7px;font-size:11px;color:var(--red);display:flex;align-items:center;gap:4px">${icon('alert-triangle', 12)} Over by ${fmt(sp - effective)}</div>` : ''}
        </div>`;
      }).join('')}
    </div>
    ${state.budgets.length === 0 ? '<div class="card empty">No budgets set. Add one to start tracking spending against targets.</div>' : ''}`;
}
