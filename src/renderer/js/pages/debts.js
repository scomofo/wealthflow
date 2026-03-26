import { icon } from '../icons.js';
import { fmt, h } from '../helpers.js';
import { stat } from '../components/stat-card.js';

export function renderDebts(state) {
  const tot = state.debts.reduce((s, d) => s + d.balance, 0);
  const ar = state.debts.length ? (state.debts.reduce((s, d) => s + d.rate, 0) / state.debts.length) : 0;
  const av = [...state.debts].sort((a, b) => b.rate - a.rate);

  return `
    <div class="grid3">
      ${stat('Total Debt', fmt(tot), -5.2, 'credit-card', 'var(--red)')}
      ${stat('Min Payments', fmt(state.debts.reduce((s, d) => s + d.min_payment, 0)), 0, 'clock', 'var(--orange)')}
      ${stat('Avg Rate', ar.toFixed(1) + '%', 0, 'activity', 'var(--purple)')}
    </div>
    ${state.debts.length > 1 ? `
      <div class="card" style="background:var(--abg);border-color:var(--accent)22;margin-top:14px">
        <div style="display:flex;gap:10px;align-items:flex-start">
          ${icon('lightbulb', 16, 'var(--accent)')}
          <div>
            <div style="font-weight:700;font-size:14px;margin-bottom:3px">AI: Avalanche Method</div>
            <div style="font-size:12px;color:var(--sub);line-height:1.5">Pay minimums on all, then extra toward <b style="color:var(--accent)">${h(av[0]?.name || '')}</b> (${av[0]?.rate}% APR) first.</div>
          </div>
        </div>
      </div>` : ''}
    <div style="display:flex;justify-content:flex-end;margin:14px 0">
      <button class="btn btn-primary" data-action="open-modal" data-modal="debt">${icon('plus', 14)} Add Debt</button>
    </div>
    ${state.debts.map(d => `
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div style="display:flex;align-items:center;gap:10px">
            <div style="width:40px;height:40px;border-radius:10px;background:${d.type === 'credit' ? 'var(--red)18' : 'var(--blue)18'};display:flex;align-items:center;justify-content:center">
              ${icon('credit-card', 17, d.type === 'credit' ? 'var(--red)' : 'var(--blue)')}
            </div>
            <div>
              <div style="font-weight:600;font-size:13.5px">${h(d.name)}</div>
              <div style="font-size:11px;color:var(--sub)">${d.rate}% · Min: ${fmt(d.min_payment)}/mo</div>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:10px">
            <div style="text-align:right">
              <div style="font-size:19px;font-weight:700">${fmt(d.balance)}</div>
            </div>
            <button class="edit-btn" data-action="edit-debt" data-id="${d.id}">${icon('edit', 14)}</button>
            <button class="edit-btn" style="color:var(--red)" data-action="delete-debt" data-id="${d.id}">${icon('trash-2', 14)}</button>
          </div>
        </div>
      </div>`).join('')}
    ${state.debts.length === 0 ? '<div class="card empty">No debts tracked</div>' : ''}`;
}
