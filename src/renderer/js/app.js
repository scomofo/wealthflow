// WealthFlow - Main App Coordinator (thin dispatcher)
// All domain logic has been extracted to handlers/*.js
//
// SECURITY NOTE: This file uses .innerHTML with the app's own trusted render functions.
// All user-provided text is escaped via the h() helper before HTML interpolation.
// This is the established pattern throughout the codebase and is inherited from
// the original monolithic app.js — this refactor introduces no new innerHTML usage.

import { icon } from './icons.js';
import { h, fmt, uid, validateRequired, validateAmount, showFieldError, clearFieldErrors } from './helpers.js';
import { SAMPLE_DATA, PROVINCES, CATEGORIES } from './canadian/constants.js';
import * as State from './state/core.js';
import { navigate, setOnNavigate, getSection } from './router.js';
import { renderSidebar } from './components/sidebar.js';
import { renderHeader } from './components/header.js';
import { renderModal } from './components/modal.js';
import { renderAiPanel, addUserMsg, clearAiHistory, startStreaming, endStreaming, handleStreamError, setupStreamListeners, isAiStreaming } from './components/ai-panel.js';
import { showToast, showActionToast, handleToastAction, renderToasts, setOnToastChange } from './components/toast.js';
import { renderDashboard } from './pages/dashboard.js';
import { renderBudget } from './pages/budget.js';
import { renderTransactions, setTxFilter, nextTxPage } from './pages/transactions.js';
import { renderSavings } from './pages/savings.js';
import { renderDebts } from './pages/debts.js';
import { renderInvestments, setLastPriceRefresh } from './pages/investments.js';
import { renderAnalytics, initCharts, destroyCharts } from './pages/analytics.js';
import { renderBills } from './pages/bills.js';
import { renderRegisteredAccounts, setRegTab } from './pages/registered-accounts.js';
import { renderTaxCalculator, updateTaxInput, initTaxInputs } from './pages/tax-calculator.js';
import { renderPlanning, updatePlanInput } from './pages/planning.js';
import { renderSettings } from './pages/settings-page.js';
import { renderAdvisorWizard, initWizard, setWizardStep, getWizardStep, updateWizardDraft, getWizardDraft } from './pages/advisor-wizard.js';
import { computeRiskScore, DOCUMENT_TYPES } from './canadian/advisor-constants.js';
import { renderTaxSeason } from './pages/tax-season.js';
import { renderResidence } from './pages/residence.js';
import { renderImportModal } from './components/import-modal.js';
import { renderRecurringModal } from './components/recurring-modal.js';
import { detectRecurringPayments } from './utils/recurring-detector.js';
import { renderOnboardingStepper } from './components/onboarding-stepper.js';

// Handler modules
import { handleSharedAction } from './handlers/shared.js';
import { handleMoneyAction, handleMoneyInput, handleMoneyChange } from './handlers/money.js';
import { handleGrowthAction } from './handlers/growth.js';
import { handleHomeAction, handleHomeInput, handleHomeChange } from './handlers/home.js';
import { handlePlanAction, handlePlanInput, handlePlanChange } from './handlers/plan.js';

// --- Mutable app state ---
const appState = {
  activeModal: null,
  editData: null,
  sideOpen: true,
  showAI: false,
  activeWorkflowResult: null,
  workflowLoading: false,
  importModalData: null,
  recurringModalData: null,
};

// --- Debounced page re-render ---
let _inputRenderTimer = null;
function debouncedPageRender(section, renderFn, delay = 300) {
  if (_inputRenderTimer) clearTimeout(_inputRenderTimer);
  _inputRenderTimer = setTimeout(() => {
    _inputRenderTimer = null;
    const page = document.getElementById('page');
    if (!page || getSection() !== section) return;
    const focused = document.activeElement;
    const focusField = focused?.dataset?.field;
    const cursorPos = focused?.selectionStart;
    page.innerHTML = renderFn(State.getState()); // trusted render function
    if (focusField) {
      const restored = page.querySelector(`[data-field="${focusField}"]`);
      if (restored) {
        restored.focus();
        if (cursorPos !== undefined && restored.setSelectionRange) {
          try { restored.setSelectionRange(cursorPos, cursorPos); } catch { /* input type may not support selection */ }
        }
      }
    }
  }, delay);
}

// --- Build ctx object ---
const ctx = {
  State, render: () => render(), showToast, showActionToast, handleToastAction,
  uid, fmt, h, navigate, getSection, appState,
  clearFieldErrors, validateRequired, validateAmount, showFieldError,
  addUserMsg, clearAiHistory, startStreaming, endStreaming, handleStreamError, isAiStreaming,
  renderModal, renderToasts, renderTransactions, renderTaxCalculator, renderPlanning,
  renderAdvisorWizard, renderRecurringModal, renderImportModal,
  SAMPLE_DATA, CATEGORIES, PROVINCES,
  computeRiskScore, DOCUMENT_TYPES,
  setTxFilter, nextTxPage, setRegTab, setLastPriceRefresh,
  updateTaxInput, initTaxInputs, updatePlanInput,
  initWizard, setWizardStep, getWizardStep, updateWizardDraft, getWizardDraft,
  debouncedPageRender,
};

// --- Router callback ---
setOnNavigate(() => render());

// Toast changes trigger re-render of toast container only
setOnToastChange(() => {
  const tc = document.getElementById('toast-root');
  if (tc) tc.innerHTML = renderToasts(); // trusted render function
});

// Onboarding wizard replaced by renderOnboardingStepper — see components/onboarding-stepper.js

// --- Error screen ---
function renderErrorScreen(error) {
  return `<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:var(--bg)">
    <div class="card" style="max-width:500px;text-align:center;padding:40px">
      <div style="font-size:48px;margin-bottom:16px">&#9888;</div>
      <div style="font-size:20px;font-weight:700;margin-bottom:8px;color:var(--red,#ef4444)">Something went wrong</div>
      <div style="color:var(--sub);font-size:13px;margin-bottom:20px;word-break:break-word">${error}</div>
      <button class="btn btn-primary" onclick="location.reload()" style="justify-content:center;width:100%">Reload App</button>
    </div>
  </div>`;
}

function renderPageSafe(fn, ...args) {
  try {
    return fn(...args);
  } catch (err) {
    const name = fn.name || 'Unknown';
    if (window.wealthflow?.log) window.wealthflow.log('error', `Page render error: ${name}`, err.message);
    return `<div class="card" style="padding:24px;margin:20px;text-align:center">
      <div style="font-size:16px;font-weight:600;color:var(--red,#ef4444);margin-bottom:8px">Failed to load page</div>
      <div style="color:var(--sub);font-size:12px">${err.message}</div>
    </div>`;
  }
}

// --- Undo ---
async function handleUndo() {
  try {
    const entries = await window.wealthflow.getUndoEntries(1);
    if (entries.length === 0) { showToast('Nothing to undo', 'info'); return; }
    const entry = entries[0];
    const oldData = entry.old_data ? JSON.parse(entry.old_data) : null;

    if (entry.action_type === 'delete' && oldData) {
      if (entry.entity_type === 'transaction') await State.addTransaction(oldData);
      else if (entry.entity_type === 'budget') await State.addBudget(oldData);
      else if (entry.entity_type === 'goal') await State.addGoal(oldData);
      else if (entry.entity_type === 'debt') await State.addDebt(oldData);
      else if (entry.entity_type === 'investment') await State.addInvestment(oldData);
    }

    await window.wealthflow.deleteUndoEntry(entry.id);
    showToast('Undone: ' + entry.action_type + ' ' + entry.entity_type, 'success');
    render();
  } catch (err) {
    showToast('Undo failed: ' + err.message, 'error');
  }
}

// --- Render ---
async function render() {
  const el = document.getElementById('app');
  let state, settings;
  try {
    state = State.getState();
    settings = state.settings;
  } catch (err) {
    el.innerHTML = renderErrorScreen(err.message); // trusted function
    return;
  }

  // Apply theme
  if (settings && settings.dark_mode) {
    document.body.classList.remove('light');
  } else {
    document.body.classList.add('light');
  }

  // Onboarding stepper
  if (!settings || !settings.onboarded) {
    const obStep = settings?.last_wizard_step || 0;
    el.innerHTML = renderOnboardingStepper(obStep, settings, state); // trusted function
    return;
  }

  // Get financial computations
  const F = await State.computeFinancials();

  // Build main layout — all content from trusted render functions
  el.innerHTML = `
    <div class="app">
      ${renderSidebar(appState.sideOpen)}
      <main class="main">
        ${renderHeader(settings)}
        <div class="content" id="page"></div>
      </main>
      <button class="ai-fab" data-action="toggle-ai">${appState.showAI ? icon('x', 20) : icon('lightbulb', 20)}</button>
      ${renderAiPanel(appState.showAI)}
      <div id="modal-root">${appState.activeModal ? renderModal(appState.activeModal, appState.editData) : ''}${appState.importModalData ? renderImportModal(appState.importModalData) : ''}${appState.recurringModalData ? renderRecurringModal(appState.recurringModalData) : ''}</div>
      <div id="toast-root">${renderToasts()}</div>
    </div>`;

  // Render current page — all render functions are trusted
  destroyCharts();
  const page = document.getElementById('page');
  const section = getSection();

  if (section === 'dashboard') page.innerHTML = renderPageSafe(renderDashboard, state, F, { activeWorkflowResult: appState.activeWorkflowResult, workflowLoading: appState.workflowLoading });
  else if (section === 'budget') page.innerHTML = renderPageSafe(renderBudget, state, F);
  else if (section === 'transactions') page.innerHTML = renderPageSafe(renderTransactions, state);
  else if (section === 'savings') page.innerHTML = renderPageSafe(renderSavings, state);
  else if (section === 'debts') page.innerHTML = renderPageSafe(renderDebts, state);
  else if (section === 'investments') page.innerHTML = renderPageSafe(renderInvestments, state);
  else if (section === 'analytics') {
    page.innerHTML = renderPageSafe(renderAnalytics, state, F);
    try { initCharts(state, F); } catch (_) { /* charts optional */ }
  }
  else if (section === 'bills') page.innerHTML = renderPageSafe(renderBills, state);
  else if (section === 'registered') page.innerHTML = renderPageSafe(renderRegisteredAccounts, state);
  else if (section === 'tax-calc') {
    initTaxInputs(settings?.province);
    page.innerHTML = renderPageSafe(renderTaxCalculator, state);
  }
  else if (section === 'tax-season') page.innerHTML = renderPageSafe(renderTaxSeason, state);
  else if (section === 'planning') page.innerHTML = renderPageSafe(renderPlanning, state);
  else if (section === 'advisor') {
    initWizard(state);
    if (!state.advisorProfile) await State.loadAdvisorProfile();
    page.innerHTML = renderPageSafe(renderAdvisorWizard, state, state.advisorProfile);
  }
  else if (section === 'residence') {
    if (!state.residence) await State.loadResidence();
    page.innerHTML = renderPageSafe(renderResidence, state.residence);
  }
  else if (section === 'settings') page.innerHTML = renderPageSafe(renderSettings, state);

  // Scroll AI to bottom
  if (appState.showAI) {
    const msgs = document.getElementById('ai-msgs');
    if (msgs) msgs.scrollTop = msgs.scrollHeight;
  }
}

// --- Event binding (thin dispatcher) ---
function bindEvents() {
  const el = document.getElementById('app');

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (appState.activeModal) { appState.activeModal = null; appState.editData = null; render(); return; }
      if (appState.showAI) { appState.showAI = false; render(); return; }
    }
    if (e.ctrlKey && e.key === 'n') {
      e.preventDefault();
      appState.activeModal = 'transaction';
      appState.editData = null;
      render();
      return;
    }
    if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      handleUndo();
      return;
    }
    if (e.key === '/' && !e.ctrlKey && !e.metaKey && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
      e.preventDefault();
      const search = document.querySelector('.search-input');
      if (search) search.focus();
      return;
    }
    if (e.ctrlKey && e.key >= '1' && e.key <= '9') {
      e.preventDefault();
      const NAV = ['dashboard', 'budget', 'transactions', 'savings', 'debts', 'investments', 'registered', 'tax-calc', 'analytics'];
      const idx = parseInt(e.key) - 1;
      if (idx < NAV.length) navigate(NAV[idx]);
      return;
    }
  });

  // Click dispatcher — tries each handler in order
  el.addEventListener('click', async (e) => {
    const modalInner = e.target.closest('.modal, .import-modal');
    const btn = e.target.closest('[data-action]');

    if (modalInner && (!btn || !modalInner.contains(btn))) return;

    if (!btn) {
      const navBtn = e.target.closest('[data-nav]');
      if (navBtn) { navigate(navBtn.dataset.nav); }
      return;
    }

    const action = btn.dataset.action;
    if (await handleSharedAction(action, btn, ctx)) return;
    if (await handleMoneyAction(action, btn, ctx)) return;
    if (await handleGrowthAction(action, btn, ctx)) return;
    if (await handleHomeAction(action, btn, ctx)) return;
    if (await handlePlanAction(action, btn, ctx)) return;
  });

  // AI input enter key
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.id === 'ai-input') {
      document.querySelector('[data-action="send-ai"]')?.click();
    }
  });

  // Input dispatcher
  el.addEventListener('input', (e) => {
    if (handlePlanInput(e, ctx)) return;
    if (handleHomeInput(e, ctx)) return;
    if (handleMoneyInput(e, ctx)) return;
  });

  // Change dispatcher
  el.addEventListener('change', async (e) => {
    if (await handlePlanChange(e, ctx)) return;
    if (handleMoneyChange(e, ctx)) return;
    if (handleHomeChange(e, ctx)) return;
  });
}

// --- Initialize ---
async function init() {
  window.onerror = (msg, source, line, col, _error) => {
    if (window.wealthflow?.log) window.wealthflow.log('error', `Uncaught error: ${msg}`, { source, line, col });
    showToast('An unexpected error occurred', 'error');
  };
  window.onunhandledrejection = (event) => {
    const msg = event.reason?.message || String(event.reason);
    if (window.wealthflow?.log) window.wealthflow.log('error', `Unhandled rejection: ${msg}`);
    showToast('An unexpected error occurred', 'error');
  };

  await State.loadAll();
  try { await State.snapshotNetWorth(); } catch (_) { /* ignore */ }
  try { await State.processRecurringBills(); } catch (_) { /* ignore */ }
  // Per-step command-center refresh errors are captured in lastIntelligenceRefresh.errors.
  try { await State.refreshCommandCenterIntelligence('manual'); } catch (_) { /* non-blocking */ }

  try {
    const s = State.getState();
    const recurring = detectRecurringPayments(s.transactions, s.bills);
    if (recurring.length > 0) {
      const untracked = recurring.filter(r => !r.alreadyTracked);
      if (untracked.length > 0) {
        showToast(`Found ${untracked.length} recurring payment(s). Review in Bills.`, 'info');
      }
    }
  } catch (_) { /* recurring detection not critical */ }

  const state = State.getState();
  if (state.settings?.theme_mode === 'auto') {
    const sysTheme = await window.wealthflow.getSystemTheme();
    if (sysTheme === 'light') document.body.classList.add('light');
    else document.body.classList.remove('light');
  }

  setupStreamListeners();
  bindEvents();
  render();

  if (state.settings?.bill_notifications !== 0) {
    try {
      await window.wealthflow.sendProactiveDesktopNotification();
    } catch (_) { /* notifications not critical */ }
  }
}

init();
