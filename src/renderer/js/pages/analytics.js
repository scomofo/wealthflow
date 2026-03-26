import { fmt, CC } from '../helpers.js';
import { stat } from '../components/stat-card.js';
import { progress } from '../components/progress-bar.js';
import { icon } from '../icons.js';

let charts = [];

export function destroyCharts() {
  charts.forEach(c => c.destroy());
  charts = [];
}

export async function initCharts(state, F) {
  destroyCharts();
  const Chart = window.Chart;
  if (!Chart) return;

  // Detect theme
  const isDark = !document.body.classList.contains('light');
  const gridColor = isDark ? '#1c1d2688' : '#e5e7eb88';
  const textColor = isDark ? '#76757a' : '#6b7280';

  Chart.defaults.color = textColor;
  Chart.defaults.borderColor = gridColor;
  Chart.defaults.font.family = "'Segoe UI', 'SF Pro Display', sans-serif";
  Chart.defaults.font.size = 11;

  // 1. Monthly income vs expenses bar chart
  const monthlyData = await window.wealthflow.getMonthlyTotals(6);
  const barCtx = document.getElementById('chart-income-expenses');
  if (barCtx && monthlyData.length > 0) {
    charts.push(new Chart(barCtx, {
      type: 'bar',
      data: {
        labels: monthlyData.map(m => {
          const [y, mo] = m.month.split('-');
          return new Date(+y, +mo - 1).toLocaleString('en-CA', { month: 'short' });
        }),
        datasets: [
          { label: 'Income', data: monthlyData.map(m => m.income), backgroundColor: '#10b98166', borderColor: '#10b981', borderWidth: 1, borderRadius: 4 },
          { label: 'Expenses', data: monthlyData.map(m => m.expenses), backgroundColor: '#ef444466', borderColor: '#ef4444', borderWidth: 1, borderRadius: 4 },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'top', labels: { boxWidth: 12, padding: 12 } } },
        scales: { y: { beginAtZero: true, grid: { color: gridColor }, ticks: { callback: v => '$' + (v / 1000).toFixed(0) + 'k' } }, x: { grid: { display: false } } },
      },
    }));
  }

  // 2. Category breakdown doughnut
  const catCtx = document.getElementById('chart-category');
  const catEntries = Object.entries(F.catSpending).sort((a, b) => b[1] - a[1]).slice(0, 8);
  if (catCtx && catEntries.length > 0) {
    charts.push(new Chart(catCtx, {
      type: 'doughnut',
      data: {
        labels: catEntries.map(([name]) => name),
        datasets: [{
          data: catEntries.map(([, val]) => val),
          backgroundColor: catEntries.map(([name]) => CC[name] || '#6b7280'),
          borderWidth: 0,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '65%',
        plugins: { legend: { position: 'right', labels: { boxWidth: 10, padding: 8, font: { size: 10 } } } },
      },
    }));
  }

  // 3. Net worth over time line chart
  const nwHistory = await window.wealthflow.getNetWorthHistory();
  const nwCtx = document.getElementById('chart-net-worth');
  if (nwCtx && nwHistory.length > 0) {
    // Calculate projection
    const projectionMonths = 12;
    const lastNW = nwHistory[nwHistory.length - 1].net_worth;
    let monthlyGrowth = 0;
    if (nwHistory.length >= 2) {
      const firstNW = nwHistory[0].net_worth;
      const months = nwHistory.length;
      monthlyGrowth = months > 1 ? (lastNW - firstNW) / (months - 1) : 0;
    }
    const projLabels = [];
    const projData = [];
    const lastDate = new Date(nwHistory[nwHistory.length - 1].date);
    for (let i = 1; i <= projectionMonths; i++) {
      const d = new Date(lastDate);
      d.setMonth(d.getMonth() + i);
      projLabels.push(d.toISOString().slice(0, 10));
      projData.push(lastNW + monthlyGrowth * i);
    }

    const allLabels = [...nwHistory.map(h => h.date), ...projLabels];
    const actualData = [...nwHistory.map(h => h.net_worth), ...new Array(projectionMonths).fill(null)];
    const projectionData = [...new Array(nwHistory.length - 1).fill(null), lastNW, ...projData];

    charts.push(new Chart(nwCtx, {
      type: 'line',
      data: {
        labels: allLabels,
        datasets: [{
          label: 'Net Worth',
          data: actualData,
          borderColor: '#d4a843',
          backgroundColor: '#d4a84322',
          fill: true, tension: 0.3, pointRadius: 3, borderWidth: 2,
        }, {
          label: 'Projection',
          data: projectionData,
          borderColor: '#d4a84366',
          backgroundColor: '#d4a84311',
          borderDash: [6, 4],
          fill: true, tension: 0.3, pointRadius: 2, borderWidth: 2,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: true, labels: { boxWidth: 12, padding: 8 } } },
        scales: {
          y: { grid: { color: gridColor }, ticks: { callback: v => '$' + (v / 1000).toFixed(0) + 'k' } },
          x: { grid: { display: false }, ticks: { maxTicksLimit: 8, font: { size: 9 } } },
        },
      },
    }));
  }

  // 4. Spending trends line chart
  const trendCtx = document.getElementById('chart-spending-trends');
  if (trendCtx && monthlyData.length > 0) {
    charts.push(new Chart(trendCtx, {
      type: 'line',
      data: {
        labels: monthlyData.map(m => {
          const [y, mo] = m.month.split('-');
          return new Date(+y, +mo - 1).toLocaleString('en-CA', { month: 'short' });
        }),
        datasets: [{
          label: 'Expenses',
          data: monthlyData.map(m => m.expenses),
          borderColor: '#ef4444', backgroundColor: '#ef444422',
          fill: true, tension: 0.3, pointRadius: 3, borderWidth: 2,
        }, {
          label: 'Income',
          data: monthlyData.map(m => m.income),
          borderColor: '#10b981', backgroundColor: '#10b98122',
          fill: true, tension: 0.3, pointRadius: 3, borderWidth: 2,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'top', labels: { boxWidth: 12, padding: 12 } } },
        scales: { y: { grid: { color: gridColor }, ticks: { callback: v => '$' + (v / 1000).toFixed(0) + 'k' } }, x: { grid: { display: false } } },
      },
    }));
  }
}

export function renderAnalytics(state, F) {
  return `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <div style="font-size:12px;color:var(--sub)">Financial Analytics</div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-secondary btn-sm" data-action="export-json">${icon('download', 12)} Backup</button>
        <button class="btn btn-secondary btn-sm" data-action="export-csv">${icon('download', 12)} CSV</button>
        <button class="btn btn-secondary btn-sm" data-action="import-csv">${icon('upload', 12)} Import</button>
        <button class="btn btn-secondary btn-sm" data-action="export-pdf">${icon('file-text', 12)} PDF</button>
        <button class="btn btn-secondary btn-sm" data-action="export-qif">${icon('download', 12)} QIF</button>
        <button class="btn btn-primary btn-sm" data-action="generate-monthly-report">${icon('file-text', 12)} AI Report</button>
      </div>
    </div>
    <div class="grid4">
      ${stat('Net Worth', fmt(F.netWorth), 0, 'trending-up', 'var(--accent)')}
      ${stat('Total Debt', fmt(F.totalDebt), 0, 'credit-card', 'var(--red)')}
      ${stat('Investments', fmt(F.totalInv), 0, 'activity', 'var(--green)')}
      ${stat('Savings', fmt(F.totalSaved), 0, 'piggy-bank', '#6366f1')}
    </div>
    <div class="grid2" style="margin-top:14px">
      <div class="card">
        <div style="font-weight:600;font-size:14px;margin-bottom:12px">Spending Trends</div>
        <div class="chart-container"><canvas id="chart-spending-trends"></canvas></div>
      </div>
      <div class="card">
        <div style="font-weight:600;font-size:14px;margin-bottom:12px">Income vs Expenses</div>
        <div class="chart-container"><canvas id="chart-income-expenses"></canvas></div>
      </div>
    </div>
    <div class="grid2" style="margin-top:14px">
      <div class="card">
        <div style="font-weight:600;font-size:14px;margin-bottom:12px">Category Breakdown</div>
        <div class="chart-container"><canvas id="chart-category"></canvas></div>
      </div>
      <div class="card">
        <div style="font-weight:600;font-size:14px;margin-bottom:12px">Net Worth Over Time</div>
        <div class="chart-container"><canvas id="chart-net-worth"></canvas></div>
      </div>
    </div>
    <div class="card" style="margin-top:14px">
      <div style="font-weight:600;font-size:14px;margin-bottom:14px">Spending by Category</div>
      ${Object.entries(F.catSpending).length === 0 ? '<div class="empty">No spending data</div>' :
        Object.entries(F.catSpending).sort((a, b) => b[1] - a[1]).map(([name, val]) => {
          const max = Math.max(...Object.values(F.catSpending));
          return `<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
            <div style="width:110px;font-size:12px;color:var(--sub)">${name}</div>
            <div style="flex:1">${progress(val, max, CC[name] || '#6b7280', 10)}</div>
            <div class="mono" style="font-size:11px;font-weight:600;min-width:80px;text-align:right">${fmt(val)}</div>
          </div>`;
        }).join('')}
    </div>`;
}
