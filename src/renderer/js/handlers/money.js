// WealthFlow - Money action handlers (transactions, budgets, bills, debts, recurring)
// Extracted from app.js
// Note: innerHTML usage mirrors original app.js code — this is a pure refactor with no behavior change

import { detectRecurringPayments } from '../utils/recurring-detector.js';
import { renderRecurringModal } from '../components/recurring-modal.js';
import { addXP } from './shared.js';

function calculateNextDue(fromDate, frequency) {
  const d = new Date(fromDate);
  switch (frequency) {
    case 'weekly': d.setDate(d.getDate() + 7); break;
    case 'biweekly': d.setDate(d.getDate() + 14); break;
    case 'monthly': d.setMonth(d.getMonth() + 1); break;
    case 'quarterly': d.setMonth(d.getMonth() + 3); break;
    case 'annual': d.setFullYear(d.getFullYear() + 1); break;
  }
  return d.toISOString().slice(0, 10);
}

export async function handleMoneyAction(action, btn, ctx) {
  const { State, render, showToast, uid, appState, getSection,
    setTxFilter, nextTxPage, renderTransactions,
  } = ctx;

  switch (action) {
    case 'edit-tx': {
      const tx = State.getState().transactions.find(t => t.id === btn.dataset.id);
      if (tx) { appState.editData = tx; appState.activeModal = 'tx'; render(); }
      return true;
    }

    case 'delete-tx':
      if (confirm('Delete this transaction?')) {
        await State.deleteTransaction(btn.dataset.id);
        showToast('Transaction deleted');
        render();
      }
      return true;

    case 'edit-budget': {
      const b = State.getState().budgets.find(x => x.id === btn.dataset.id);
      if (b) { appState.editData = b; appState.activeModal = 'budget'; render(); }
      return true;
    }

    case 'delete-budget':
      if (confirm('Delete this budget?')) {
        await State.deleteBudget(btn.dataset.id);
        showToast('Budget deleted');
        render();
      }
      return true;

    case 'edit-bill': {
      const b = State.getState().bills.find(x => x.id === btn.dataset.id);
      if (b) { appState.editData = b; appState.activeModal = 'bill'; render(); }
      return true;
    }

    case 'delete-bill':
      if (confirm('Delete this reminder?')) {
        await State.deleteBill(btn.dataset.id);
        showToast('Reminder deleted');
        render();
      }
      return true;

    case 'mark-paid': {
      const billId = btn.dataset.id;
      const bill = State.getState().bills.find(b => b.id === billId);
      if (bill) {
        const today = new Date().toISOString().slice(0, 10);
        await State.addTransaction({
          id: uid(), description: bill.title,
          amount: bill.type === 'income' ? Math.abs(bill.amount) : -Math.abs(bill.amount),
          category: bill.category || 'Other', date: today, icon: 'receipt',
        });
        await State.addRecurringLog({
          id: uid(), bill_id: billId, paid_date: today, amount: bill.amount,
        });
        if (bill.frequency) {
          const nextDue = calculateNextDue(today, bill.frequency);
          await State.updateBill({ ...bill, last_paid_date: today, next_due_date: nextDue });
        }
        await addXP(10, ctx);
        showToast('Payment recorded');
        render();
      }
      return true;
    }

    case 'edit-debt': {
      const d = State.getState().debts.find(x => x.id === btn.dataset.id);
      if (d) { appState.editData = d; appState.activeModal = 'debt'; render(); }
      return true;
    }

    case 'delete-debt':
      if (confirm('Delete this debt?')) {
        await State.deleteDebt(btn.dataset.id);
        showToast('Debt deleted');
        render();
      }
      return true;

    case 'detect-recurring': {
      const state = State.getState();
      const patterns = detectRecurringPayments(state.transactions, state.bills);
      appState.recurringModalData = { patterns, selected: new Set() };
      render();
      return true;
    }

    case 'confirm-recurring': {
      if (!appState.recurringModalData || appState.recurringModalData.selected.size === 0) return true;
      const { patterns, selected } = appState.recurringModalData;
      let created = 0;
      for (const p of patterns) {
        if (!selected.has(p.id) || p.alreadyTracked) continue;
        await State.addBill({
          id: uid(),
          title: p.description,
          type: 'bill',
          amount: p.avgAmount,
          date: p.nextDate,
          frequency: p.frequency,
          category: p.category || 'Other',
          next_due_date: p.nextDate,
          auto_generate: 0,
        });
        created++;
      }
      appState.recurringModalData = null;
      showToast(`Created ${created} recurring reminder${created !== 1 ? 's' : ''}`);
      await State.loadAll();
      render();
      return true;
    }

    case 'close-recurring-modal':
      appState.recurringModalData = null;
      render();
      return true;

    case 'filter-tx-cat': {
      setTxFilter('category', btn.dataset.cat);
      const page = document.getElementById('page');
      if (page && getSection() === 'transactions') {
        page.innerHTML = renderTransactions(State.getState()); // safe: renderTransactions returns sanitized HTML
      }
      return true;
    }

    case 'load-more-tx': {
      nextTxPage();
      const page = document.getElementById('page');
      if (page && getSection() === 'transactions') {
        page.innerHTML = renderTransactions(State.getState()); // safe: renderTransactions returns sanitized HTML
      }
      return true;
    }

    case 'set-tx-type': {
      const val = btn.dataset.value;
      const typeInput = document.getElementById('m-type');
      if (typeInput) typeInput.value = val;
      const expBtn = document.getElementById('m-type-exp');
      const incBtn = document.getElementById('m-type-inc');
      if (val === 'expense') {
        expBtn.className = 'btn btn-primary';
        incBtn.className = 'btn btn-secondary';
      } else {
        incBtn.className = 'btn btn-primary';
        expBtn.className = 'btn btn-secondary';
      }
      return true;
    }

    case 'ai-recategorize': {
      try {
        showToast('AI is categorizing transactions...', 'info');
        const result = await window.wealthflow.aiRecategorizeOthers();
        await State.loadAll();
        showToast(`Categorized ${result.categorized} of ${result.total} transactions`, 'success');
        render();
      } catch (err) {
        showToast('Categorization failed: ' + err.message, 'error');
      }
      return true;
    }

    default: return false;
  }
}

export function handleMoneyInput(e, ctx) {
  const { setTxFilter, debouncedPageRender, renderTransactions } = ctx;

  // Transaction search
  if (e.target.classList.contains('tx-search')) {
    setTxFilter('search', e.target.value);
    debouncedPageRender('transactions', (s) => renderTransactions(s), 150);
    return true;
  }

  return false;
}

export function handleMoneyChange(e, ctx) {
  const { State, appState, setTxFilter, getSection, renderTransactions } = ctx;

  // Recurring detection checkboxes
  if (e.target.dataset.action === 'recurring-select') {
    if (!appState.recurringModalData) return false;
    const id = e.target.dataset.id;
    if (e.target.checked) appState.recurringModalData.selected.add(id);
    else appState.recurringModalData.selected.delete(id);
    const mr = document.getElementById('modal-root');
    if (mr) mr.innerHTML = renderRecurringModal(appState.recurringModalData); // safe: renders sanitized component HTML
    return true;
  }
  if (e.target.dataset.action === 'recurring-select-all') {
    if (!appState.recurringModalData) return false;
    const newPatterns = appState.recurringModalData.patterns.filter(p => !p.alreadyTracked);
    if (e.target.checked) {
      newPatterns.forEach(p => appState.recurringModalData.selected.add(p.id));
    } else {
      appState.recurringModalData.selected.clear();
    }
    const mr = document.getElementById('modal-root');
    if (mr) mr.innerHTML = renderRecurringModal(appState.recurringModalData); // safe: renders sanitized component HTML
    return true;
  }

  // Transaction sort
  if (e.target.classList.contains('tx-sort')) {
    setTxFilter('sort', e.target.value);
    const page = document.getElementById('page');
    if (page && getSection() === 'transactions') {
      page.innerHTML = renderTransactions(State.getState()); // safe: renderTransactions returns sanitized HTML
    }
    return true;
  }

  return false;
}
