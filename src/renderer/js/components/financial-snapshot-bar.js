import { fmt } from '../helpers.js';

export function renderFinancialSnapshotBar(state, F) {
  const cashflow = (F.income || 0) - (F.expenses || 0);
  const status = cashflow >= 0 ? 'You are cash-flow positive this month' : 'Your expenses are exceeding your income';

  return `
    <div class="card" style="display:flex;gap:14px;flex-wrap:wrap;align-items:center">
      <div style="flex:1;min-width:140px">
        <div class="stat-label">Net Worth</div>
        <div class="stat-val">${fmt(F.netWorth || 0)}</div>
      </div>
      <div style="flex:1;min-width:140px">
        <div class="stat-label">Savings Rate</div>
        <div class="stat-val">${(F.savingsRate || 0).toFixed(1)}%</div>
      </div>
      <div style="flex:1;min-width:140px">
        <div class="stat-label">Debt</div>
        <div class="stat-val">${fmt(F.debt || 0)}</div>
      </div>
      <div style="flex:1;min-width:140px">
        <div class="stat-label">Cash Flow</div>
        <div class="stat-val" style="color:${cashflow >= 0 ? 'var(--green)' : 'var(--red)'}">${fmt(cashflow)}</div>
      </div>
      <div style="flex-basis:100%;font-size:11px;color:var(--sub);margin-top:6px">${status}</div>
    </div>`;
}
