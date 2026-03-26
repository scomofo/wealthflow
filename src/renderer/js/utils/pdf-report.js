// PDF Report Generator for WealthFlow
import { fmt } from '../helpers.js';

export function generateMonthlyReportHTML(state, F, monthStr) {
  const now = monthStr || new Date().toISOString().slice(0, 7);
  const [year, month] = now.split('-');
  const monthName = new Date(+year, +month - 1).toLocaleString('en-CA', { month: 'long', year: 'numeric' });

  // Filter transactions for the month
  const txs = state.transactions.filter(t => t.date && t.date.startsWith(now));
  const income = txs.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const expenses = txs.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
  const net = income - expenses;

  // Category breakdown
  const catTotals = {};
  txs.filter(t => t.amount < 0).forEach(t => {
    catTotals[t.category] = (catTotals[t.category] || 0) + Math.abs(t.amount);
  });
  const catSorted = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);

  // Budget status
  const budgets = state.budgets.map(b => {
    const spent = Math.abs(txs.filter(t => t.category === b.category && t.amount < 0).reduce((s, t) => s + t.amount, 0));
    return { ...b, spent, pct: b.amount > 0 ? Math.round((spent / b.amount) * 100) : 0 };
  });

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #1a1a2e; line-height: 1.6; }
  h1 { color: #d4a843; margin-bottom: 4px; font-size: 28px; }
  h2 { font-size: 18px; margin-top: 28px; margin-bottom: 12px; border-bottom: 2px solid #d4a843; padding-bottom: 6px; }
  .subtitle { color: #666; font-size: 14px; margin-bottom: 24px; }
  .summary { display: flex; gap: 16px; margin-bottom: 24px; }
  .summary-card { flex: 1; background: #f8f9fa; border-radius: 8px; padding: 16px; text-align: center; }
  .summary-card .label { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 1px; }
  .summary-card .value { font-size: 22px; font-weight: 700; margin-top: 4px; }
  .green { color: #10b981; }
  .red { color: #ef4444; }
  .gold { color: #d4a843; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { background: #f1f3f5; text-align: left; padding: 8px 12px; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: .5px; color: #666; }
  td { padding: 8px 12px; border-bottom: 1px solid #eee; }
  .right { text-align: right; }
  .budget-bar { height: 8px; background: #e9ecef; border-radius: 4px; overflow: hidden; }
  .budget-fill { height: 100%; border-radius: 4px; }
  .footer { margin-top: 32px; text-align: center; font-size: 11px; color: #aaa; border-top: 1px solid #eee; padding-top: 12px; }
</style>
</head>
<body>
  <h1>WealthFlow</h1>
  <div class="subtitle">Monthly Financial Report - ${monthName}</div>

  <div class="summary">
    <div class="summary-card">
      <div class="label">Income</div>
      <div class="value green">${fmt(income)}</div>
    </div>
    <div class="summary-card">
      <div class="label">Expenses</div>
      <div class="value red">${fmt(expenses)}</div>
    </div>
    <div class="summary-card">
      <div class="label">Net</div>
      <div class="value ${net >= 0 ? 'green' : 'red'}">${fmt(net)}</div>
    </div>
    <div class="summary-card">
      <div class="label">Net Worth</div>
      <div class="value gold">${fmt(F.netWorth)}</div>
    </div>
  </div>

  <h2>Spending by Category</h2>
  <table>
    <tr><th>Category</th><th class="right">Amount</th><th class="right">% of Total</th></tr>
    ${catSorted.map(([cat, val]) => `
      <tr><td>${cat}</td><td class="right">${fmt(val)}</td><td class="right">${expenses > 0 ? Math.round((val / expenses) * 100) : 0}%</td></tr>
    `).join('')}
    ${catSorted.length === 0 ? '<tr><td colspan="3" style="text-align:center;color:#aaa">No expenses this month</td></tr>' : ''}
  </table>

  <h2>Budget Status</h2>
  <table>
    <tr><th>Category</th><th class="right">Budget</th><th class="right">Spent</th><th style="width:120px">Progress</th><th class="right">%</th></tr>
    ${budgets.map(b => `
      <tr>
        <td>${b.category}</td>
        <td class="right">${fmt(b.amount)}</td>
        <td class="right ${b.pct > 100 ? 'red' : ''}">${fmt(b.spent)}</td>
        <td><div class="budget-bar"><div class="budget-fill" style="width:${Math.min(b.pct, 100)}%;background:${b.pct > 100 ? '#ef4444' : b.color || '#10b981'}"></div></div></td>
        <td class="right ${b.pct > 100 ? 'red' : ''}">${b.pct}%</td>
      </tr>
    `).join('')}
    ${budgets.length === 0 ? '<tr><td colspan="5" style="text-align:center;color:#aaa">No budgets set</td></tr>' : ''}
  </table>

  <h2>Transactions</h2>
  <table>
    <tr><th>Date</th><th>Description</th><th>Category</th><th class="right">Amount</th></tr>
    ${txs.sort((a, b) => b.date.localeCompare(a.date)).map(t => `
      <tr>
        <td>${t.date}</td>
        <td>${t.description}</td>
        <td>${t.category}</td>
        <td class="right ${t.amount >= 0 ? 'green' : 'red'}">${fmt(t.amount)}</td>
      </tr>
    `).join('')}
    ${txs.length === 0 ? '<tr><td colspan="4" style="text-align:center;color:#aaa">No transactions this month</td></tr>' : ''}
  </table>

  <div class="footer">Generated by WealthFlow - Canadian Personal Finance</div>
</body>
</html>`;
}
