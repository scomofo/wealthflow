// WealthFlow - Growth action handlers (investments, registered accounts, goals)
// Extracted from app.js
// Note: This is a pure refactor — no behavior changes from original app.js

import { addXP } from './shared.js';

export async function handleGrowthAction(action, btn, ctx) {
  const { State, render, showToast, uid, appState, navigate, fmt,
    setRegTab, setLastPriceRefresh,
  } = ctx;

  switch (action) {
    case 'edit-inv': {
      const i = State.getState().investments.find(x => x.id === btn.dataset.id);
      if (i) { appState.editData = i; appState.activeModal = 'inv'; render(); }
      return true;
    }

    case 'delete-inv':
      if (confirm('Delete this investment?')) {
        await State.deleteInvestment(btn.dataset.id);
        showToast('Investment deleted');
        render();
      }
      return true;

    case 'refresh-stock-prices': {
      showToast('Refreshing stock prices...');
      try {
        const quotes = await State.refreshStockPrices();
        const success = quotes.filter(q => !q.error).length;
        const failed = quotes.filter(q => q.error).length;
        let msg = `Updated ${success} price${success !== 1 ? 's' : ''}`;
        if (failed > 0) msg += `, ${failed} failed`;
        setLastPriceRefresh(new Date().toISOString());
        showToast(msg);
        render();
      } catch (err) {
        showToast('Failed to refresh prices', 'error');
      }
      return true;
    }

    case 'set-reg-tab':
      setRegTab(btn.dataset.tab);
      render();
      return true;

    case 'delete-contribution':
      if (confirm('Delete this contribution?')) {
        await State.deleteContribution(btn.dataset.id);
        showToast('Contribution deleted');
        render();
      }
      return true;

    case 'delete-gic':
      if (confirm('Delete this GIC?')) {
        await State.deleteGIC(btn.dataset.id);
        showToast('GIC deleted');
        render();
      }
      return true;

    case 'delete-resp-beneficiary':
      if (confirm('Delete this beneficiary?')) {
        await State.deleteRESPBeneficiary(btn.dataset.id);
        showToast('Beneficiary deleted');
        render();
      }
      return true;

    case 'nav-to-tax':
      navigate('tax-calc');
      return true;

    case 'deposit-goal': {
      const amt = prompt('Deposit amount ($):');
      if (amt && +amt > 0) {
        const state = State.getState();
        const g = state.goals.find(x => x.id === btn.dataset.id);
        if (g) {
          await State.updateGoal({ ...g, current: g.current + +amt });
          await addXP(15, ctx);
          showToast(`Deposited ${fmt(+amt)} to ${g.name}`);
          render();
        }
      }
      return true;
    }

    case 'delete-goal':
      if (confirm('Delete this savings goal?')) {
        await State.deleteGoal(btn.dataset.id);
        showToast('Goal deleted');
        render();
      }
      return true;

    default: return false;
  }
}
