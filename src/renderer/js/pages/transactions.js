import { icon } from '../icons.js';
import { fmt, h, CATS } from '../helpers.js';

let txSearch = '';
let txCategory = 'All';
let txSort = 'date-desc';
let txPage = 0;
const TX_PAGE_SIZE = 50;

export function setTxFilter(field, value) {
  if (field === 'search') txSearch = value;
  else if (field === 'category') txCategory = value;
  else if (field === 'sort') txSort = value;
  txPage = 0;
}

export function nextTxPage() {
  txPage++;
}

export function renderTransactions(state) {
  let txs = [...state.transactions];

  // Filter by search
  if (txSearch) {
    const q = txSearch.toLowerCase();
    txs = txs.filter(t => t.description.toLowerCase().includes(q) || t.category.toLowerCase().includes(q));
  }

  // Filter by category
  if (txCategory !== 'All') {
    txs = txs.filter(t => t.category === txCategory);
  }

  // Sort
  if (txSort === 'date-desc') txs.sort((a, b) => b.date.localeCompare(a.date));
  else if (txSort === 'date-asc') txs.sort((a, b) => a.date.localeCompare(b.date));
  else if (txSort === 'amount-high') txs.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
  else if (txSort === 'amount-low') txs.sort((a, b) => Math.abs(a.amount) - Math.abs(b.amount));

  const totalFiltered = txs.length;
  const end = (txPage + 1) * TX_PAGE_SIZE;
  txs = txs.slice(0, end);
  const hasMore = end < totalFiltered;

  const sortOptions = [
    { v: 'date-desc', l: 'Newest' }, { v: 'date-asc', l: 'Oldest' },
    { v: 'amount-high', l: 'Highest' }, { v: 'amount-low', l: 'Lowest' },
  ];

  return `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:8px">
      <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:200px">
        <div class="search-input-wrap">
          ${icon('search', 14)}
          <input class="input-field search-input tx-search" placeholder="Search transactions..." value="${h(txSearch)}" aria-label="Search transactions">
        </div>
        <select class="input-field tx-sort" style="width:auto;min-width:100px">
          ${sortOptions.map(o => `<option value="${o.v}" ${txSort === o.v ? 'selected' : ''}>${o.l}</option>`).join('')}
        </select>
      </div>
      <button class="btn btn-secondary" data-action="ai-recategorize">${icon('lightbulb', 14)} AI Categorize</button>
      <button class="btn btn-primary" data-action="open-modal" data-modal="tx">${icon('plus', 14)} Add Transaction</button>
    </div>
    <div style="font-size:12px;color:var(--sub);margin-bottom:8px">Showing ${txs.length} of ${totalFiltered} transactions</div>
    <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:14px">
      ${['All', ...CATS.filter(c => c !== 'Investment Income' && c !== 'Government Benefits')].map(c =>
        `<button class="cat-pill ${txCategory === c ? 'filter-active' : ''}" data-action="filter-tx-cat" data-cat="${c}">${c}</button>`
      ).join('')}
    </div>
    <div class="card" style="padding:0">
      ${txs.length === 0 ? '<div class="empty">No transactions found</div>' : ''}
      ${txs.map(t => `
        <div class="tx-row">
          <div class="tx-icon">${icon(t.icon || 'receipt', 15)}</div>
          <div style="flex:1">
            <div style="font-size:13px;font-weight:500">${h(t.description)}</div>
            <div style="font-size:11px;color:var(--sub)">${h(t.category)} · ${t.date}</div>
          </div>
          <div class="mono" style="font-size:13.5px;font-weight:600;color:${t.amount > 0 ? 'var(--green)' : 'var(--text)'}">
            ${t.amount > 0 ? '+' : ''}${fmt(t.amount)}
          </div>
          <button class="edit-btn" data-action="edit-tx" data-id="${t.id}" aria-label="Edit transaction">${icon('edit', 13)}</button>
          <button class="edit-btn" style="color:var(--red)" data-action="delete-tx" data-id="${t.id}" aria-label="Delete transaction">${icon('trash-2', 13)}</button>
        </div>`).join('')}
    </div>
    ${hasMore ? `<div style="text-align:center;margin-top:14px"><button class="btn btn-secondary" data-action="load-more-tx">Load More</button></div>` : ''}`;
}
