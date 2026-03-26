// Principal Residence Tracker
import { fmt, h } from '../helpers.js';
import { icon } from '../icons.js';

export function renderResidence(residence) {
  if (!residence) {
    return `
      <div class="card" style="text-align:center;padding:40px">
        <div style="font-size:40px;margin-bottom:12px">${icon('home', 40)}</div>
        <div style="font-size:18px;font-weight:700;margin-bottom:8px">Track Your Home</div>
        <div style="color:var(--sub);font-size:13px;margin-bottom:20px;max-width:400px;margin-left:auto;margin-right:auto;line-height:1.6">
          Track your principal residence value, mortgage, and equity for a complete financial picture.
        </div>
        <button class="btn btn-primary" data-action="edit-residence">${icon('plus', 14)} Add Residence</button>
      </div>`;
  }

  const equity = (residence.current_value || 0) - (residence.mortgage_balance || 0) - (residence.heloc_balance || 0);
  const ltv = residence.current_value > 0 ? ((residence.mortgage_balance || 0) / residence.current_value * 100) : 0;
  const appreciation = residence.purchase_price > 0 ? ((residence.current_value - residence.purchase_price) / residence.purchase_price * 100) : 0;
  const monthlyCarry = (residence.mortgage_payment || 0) + ((residence.property_tax_annual || 0) / 12);

  return `
    <div style="font-size:12px;color:var(--sub);margin-bottom:16px">Principal Residence Tracker</div>
    <div class="grid4" style="margin-bottom:16px">
      ${resStatCard('Current Value', fmt(residence.current_value || 0), 'var(--accent)')}
      ${resStatCard('Equity', fmt(equity), equity >= 0 ? 'var(--green)' : 'var(--red)')}
      ${resStatCard('Mortgage', fmt(residence.mortgage_balance || 0), '#6366f1', ltv.toFixed(1) + '% LTV')}
      ${resStatCard('Monthly Cost', fmt(monthlyCarry), 'var(--orange)', 'Mortgage + tax')}
    </div>

    <div class="grid2" style="margin-bottom:14px">
      <div class="card">
        <div style="font-weight:700;font-size:14px;margin-bottom:14px">${icon('home', 16)} Property Details</div>
        ${detailRow('Address', residence.address || 'Not set')}
        ${detailRow('Purchase Price', fmt(residence.purchase_price || 0))}
        ${detailRow('Current Value', fmt(residence.current_value || 0))}
        ${detailRow('Purchase Date', residence.purchase_date || 'Not set')}
        ${detailRow('Appreciation', (appreciation >= 0 ? '+' : '') + appreciation.toFixed(1) + '%', appreciation >= 0 ? 'var(--green)' : 'var(--red)')}
        ${detailRow('PRE Eligible', residence.pre_eligible ? 'Yes' : 'No', residence.pre_eligible ? 'var(--green)' : 'var(--red)')}
        ${detailRow('Annual Property Tax', fmt(residence.property_tax_annual || 0))}
      </div>
      <div class="card">
        <div style="font-weight:700;font-size:14px;margin-bottom:14px">${icon('credit-card', 16)} Mortgage & HELOC</div>
        ${detailRow('Mortgage Balance', fmt(residence.mortgage_balance || 0))}
        ${detailRow('Interest Rate', (residence.mortgage_rate || 0) + '%')}
        ${detailRow('Monthly Payment', fmt(residence.mortgage_payment || 0))}
        ${detailRow('Amortization', Math.round((residence.mortgage_amortization_months || 0) / 12) + ' years')}
        <div style="border-top:1px solid var(--border);margin:8px 0;padding-top:8px"></div>
        ${detailRow('HELOC Balance', fmt(residence.heloc_balance || 0))}
        ${detailRow('HELOC Limit', fmt(residence.heloc_limit || 0))}
        ${detailRow('HELOC Rate', (residence.heloc_rate || 0) + '%')}
      </div>
    </div>

    <div style="display:flex;gap:8px">
      <button class="btn btn-primary" data-action="edit-residence">${icon('edit', 14)} Edit Details</button>
    </div>

    ${residence.notes ? `
    <div class="card" style="margin-top:14px">
      <div style="font-weight:600;font-size:13px;margin-bottom:8px">Notes</div>
      <div style="font-size:12px;color:var(--sub);line-height:1.6">${h(residence.notes)}</div>
    </div>` : ''}
  `;
}

function resStatCard(label, value, color, sub = '') {
  return `<div class="card" style="padding:16px;text-align:center">
    <div style="font-size:11px;color:var(--sub);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">${label}</div>
    <div class="mono" style="font-size:20px;font-weight:800;color:${color}">${value}</div>
    ${sub ? `<div style="font-size:10px;color:var(--muted);margin-top:4px">${sub}</div>` : ''}
  </div>`;
}

function detailRow(label, value, color = 'var(--text)') {
  return `<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;font-size:12px">
    <span style="color:var(--sub)">${label}</span>
    <span class="mono" style="font-weight:600;color:${color}">${value}</span>
  </div>`;
}
