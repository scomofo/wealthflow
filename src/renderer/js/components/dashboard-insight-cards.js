import { icon } from '../icons.js';

export function renderDashboardInsightCards(state, F) {
  const insights = [];

  if ((F.savingsRate || 0) > 20) {
    insights.push({
      title: 'Strong savings rate',
      desc: 'You are saving more than 20% of your income — keep it up.',
      icon: 'trending-up'
    });
  }

  if ((F.savingsRate || 0) < 10) {
    insights.push({
      title: 'Low savings rate',
      desc: 'Consider reducing discretionary spending to improve savings.',
      icon: 'alert-triangle'
    });
  }

  if ((F.totalDebt || 0) > 0) {
    insights.push({
      title: 'Debt is a key factor',
      desc: 'Reducing debt will improve your overall financial position.',
      icon: 'credit-card'
    });
  }

  const visible = insights.slice(0, 2);

  if (!visible.length) return '';

  return `
    <div class="grid2" style="margin-top:14px">
      ${visible.map(i => `
        <div class="card insight-card">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px">
            ${icon(i.icon, 14)}
            <span style="font-weight:600;font-size:13px">${i.title}</span>
          </div>
          <div style="font-size:12px;color:var(--sub)">${i.desc}</div>
        </div>
      `).join('')}
    </div>`;
}
