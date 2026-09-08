import { icon } from '../icons.js';
import { fmt, h } from '../helpers.js';

let lastPriceRefresh = null;

export function setLastPriceRefresh(ts) { lastPriceRefresh = ts; }

function finiteNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function investmentValueCad(investment, field = 'current_price') {
  const shares = finiteNumber(investment?.shares);
  const price = finiteNumber(investment?.[field]);
  const currency = (investment?.currency || 'CAD').toUpperCase();
  const fx = currency === 'USD' ? finiteNumber(investment?.exchange_rate_to_cad, 1) : 1;
  return shares * price * (fx > 0 ? fx : 1);
}

export function getPortfolioTotals(investments = []) {
  const valueCad = investments.reduce((sum, investment) => sum + investmentValueCad(investment, 'current_price'), 0);
  const costCadAtCurrentFx = investments.reduce((sum, investment) => sum + investmentValueCad(investment, 'avg_cost'), 0);
  const gainCadAtCurrentFx = valueCad - costCadAtCurrentFx;
  return {
    valueCad,
    costCadAtCurrentFx,
    gainCadAtCurrentFx,
    returnPctExcludingFxHistory: costCadAtCurrentFx > 0 ? gainCadAtCurrentFx / costCadAtCurrentFx * 100 : 0,
  };
}

function fmtPrice(value, currency) {
  if (currency && currency !== 'CAD') return `US$${value.toFixed(2)}`;
  return fmt(value);
}

export function renderInvestments(state) {
  const totals = getPortfolioTotals(state.investments);
  const tv = totals.valueCad;
  const tc = totals.costCadAtCurrentFx;
  const g = totals.gainCadAtCurrentFx;
  const gp = totals.returnPctExcludingFxHistory;
  const totalValue = tv;
  const totalCost = tc;
  const totalReturn = gp;
  const usdHoldings = state.investments.filter(i => (i.currency || 'CAD').toUpperCase() === 'USD');
  const hasUSD = usdHoldings.length > 0;
  const latestUsdCadRate = usdHoldings.find(i => finiteNumber(i.exchange_rate_to_cad, 0) > 0)?.exchange_rate_to_cad || null;

  const refreshLabel = lastPriceRefresh
    ? `<span style="font-size:11px;color:var(--sub);margin-right:8px">Last updated: ${new Date(lastPriceRefresh).toLocaleTimeString()}</span>`
    : '';

  return `
    ${hasUSD ? `<div style="background:var(--input);border-radius:8px;padding:8px 12px;margin-bottom:12px;font-size:11px;color:var(--sub)">${icon('info', 12)} USD holdings are converted to CAD using the last stored USD/CAD rate${latestUsdCadRate ? ` (${Number(latestUsdCadRate).toFixed(4)})` : ''}. Return figures exclude historical FX effects.</div>` : ''}
    <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:16px">
      <div>
        <div style="font-size:12px;color:var(--sub)">Portfolio Value</div>
        <div style="font-size:30px;font-weight:800;letter-spacing:-1px">${fmt(tv)}</div>
        <div style="display:flex;align-items:center;gap:4px;font-size:13px;color:${g >= 0 ? 'var(--green)' : 'var(--red)'};margin-top:3px">
          ${icon(g >= 0 ? 'arrow-up-right' : 'arrow-down-right', 14)}
          <b>${fmt(Math.abs(g))}</b> <span style="font-size:11px">(${gp.toFixed(2)}%)</span>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        ${refreshLabel}
        <button class="btn btn-secondary" data-action="refresh-stock-prices">${icon('refresh-cw', 14)} Refresh Prices</button>
        <button class="btn btn-primary" data-action="open-modal" data-modal="inv">${icon('plus', 14)} Add</button>
      </div>
    </div>
    <div class="card" style="padding:0">
      <div class="inv-grid inv-head">
        <span>Symbol</span><span>Shares</span><span>Avg Cost</span><span>Price</span><span>Value</span><span>Return</span><span></span>
      </div>
      ${state.investments.map(i => {
        const nativeValue = finiteNumber(i.shares) * finiteNumber(i.current_price);
        const nativeCost = finiteNumber(i.shares) * finiteNumber(i.avg_cost);
        const vCad = investmentValueCad(i, 'current_price');
        const r = nativeCost > 0 ? ((nativeValue - nativeCost) / nativeCost * 100) : 0;
        const cur = i.currency || 'CAD';
        const acctLabel = i.account_type && i.account_type !== 'non-registered' ? ` <span class="tag">${i.account_type.toUpperCase()}</span>` : '';
        return `<div class="inv-grid">
          <span class="mono" style="font-weight:700">${h(i.symbol)}${acctLabel}</span>
          <span>${i.shares}</span>
          <span class="mono" style="font-size:11px">${fmtPrice(i.avg_cost, cur)}</span>
          <span class="mono" style="font-size:11px">${fmtPrice(i.current_price, cur)}</span>
          <span class="mono" style="font-weight:600;font-size:11px">${fmt(vCad)}</span>
          <span class="mono" style="font-weight:600;font-size:11px;color:${r >= 0 ? 'var(--green)' : 'var(--red)'}">${r >= 0 ? '+' : ''}${r.toFixed(1)}%</span>
          <span style="display:flex;gap:4px">
            <button class="edit-btn" data-action="edit-inv" data-id="${i.id}">${icon('edit', 12)}</button>
            <button class="edit-btn" style="color:var(--red)" data-action="delete-inv" data-id="${i.id}">${icon('trash-2', 12)}</button>
          </span>
        </div>`;
      }).join('')}
      ${state.investments.length === 0 ? '<div class="empty">No investments</div>' : ''}
    </div>
    <div class="card" style="margin-top:14px">
      <div style="font-weight:700;font-size:14px;margin-bottom:12px">${icon('bar-chart-3', 16)} Portfolio Benchmarking</div>
      <div style="font-size:12px;color:var(--sub);line-height:1.6;margin-bottom:12px">
        Your portfolio: <span class="mono" style="font-weight:700;color:var(--accent)">${fmt(totalValue)}</span>
        ${totalCost > 0 ? ` | Return: <span class="mono" style="font-weight:700;color:${totalReturn >= 0 ? 'var(--green)' : 'var(--red)'}">${totalReturn >= 0 ? '+' : ''}${totalReturn.toFixed(1)}%</span>` : ''}
      </div>
      <div style="font-size:11px;color:var(--sub)">
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
          <div style="background:var(--input);border-radius:8px;padding:8px 10px;text-align:center">
            <div style="font-weight:600">XEQT.TO</div>
            <div style="font-size:10px;color:var(--muted)">iShares All-Equity</div>
          </div>
          <div style="background:var(--input);border-radius:8px;padding:8px 10px;text-align:center">
            <div style="font-weight:600">VEQT.TO</div>
            <div style="font-size:10px;color:var(--muted)">Vanguard All-Equity</div>
          </div>
          <div style="background:var(--input);border-radius:8px;padding:8px 10px;text-align:center">
            <div style="font-weight:600">XIU.TO</div>
            <div style="font-size:10px;color:var(--muted)">S&P/TSX 60</div>
          </div>
        </div>
      </div>
    </div>`;
}
