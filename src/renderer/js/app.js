// WealthFlow - Main App Coordinator
import { icon } from './icons.js';
import { h, fmt, uid, validateRequired, validateAmount, showFieldError, clearFieldErrors } from './helpers.js';
import { SAMPLE_DATA, PROVINCES, CATEGORIES } from './canadian/constants.js';
import * as State from './state.js';
import { navigate, setOnNavigate, getSection } from './router.js';
import { renderSidebar, setExpandedGroup } from './components/sidebar.js';
import { renderHeader } from './components/header.js';
import { renderModal } from './components/modal.js';
import { renderAiPanel, addUserMsg, clearAiHistory, startStreaming, endStreaming, handleStreamError, setupStreamListeners, cleanupStreamListeners, isAiStreaming } from './components/ai-panel.js';
import { showToast, showActionToast, handleToastAction, renderToasts, setOnToastChange } from './components/toast.js';
import { renderDashboard } from './pages/dashboard.js';
import { renderBudget } from './pages/budget.js';
import { renderTransactions, setTxFilter, nextTxPage } from './pages/transactions.js';
import { renderSavings } from './pages/savings.js';
import { renderDebts } from './pages/debts.js';
import { renderInvestments, setLastPriceRefresh } from './pages/investments.js';
import { renderAnalytics, initCharts, destroyCharts } from './pages/analytics.js';
import { renderBills } from './pages/bills.js';
import { setShowAllActions } from './pages/dashboard.js';
import { renderRegisteredAccounts, setRegTab } from './pages/registered-accounts.js';
import { renderTaxCalculator, updateTaxInput, initTaxInputs } from './pages/tax-calculator.js';
import { renderPlanning, updatePlanInput } from './pages/planning.js';
import { renderSettings } from './pages/settings-page.js';
import { renderAdvisorWizard, initWizard, setWizardStep, getWizardStep, updateWizardDraft, getWizardDraft } from './pages/advisor-wizard.js';
import { computeRiskScore, GOAL_TYPES, DOCUMENT_TYPES } from './canadian/advisor-constants.js';
import { exportJSON, exportCSV, importFile, applyImport, applyHoldingsImport, checkDuplicates, aiCategorizeImport, saveImportHistory, exportPDF, reconcileAfterImport } from './utils/export-import.js';
import { renderTaxSeason } from './pages/tax-season.js';
import { renderResidence } from './pages/residence.js';
import { exportToQIF } from './utils/qif-export.js';
import { renderImportModal } from './components/import-modal.js';
import { renderRecurringModal } from './components/recurring-modal.js';
import { detectRecurringPayments } from './utils/recurring-detector.js';

let sideOpen = true;
let showAI = false;
let activeModal = null;
let editData = null;
let importModalData = null;
let recurringModalData = null;

// Setup router callback
setOnNavigate(() => render());

// Toast changes trigger re-render of toast container only
setOnToastChange(() => {
  const tc = document.getElementById('toast-root');
  if (tc) tc.innerHTML = renderToasts();
});

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

const OB_DEFAULT_BUDGETS = ['Food/Groceries', 'Transport', 'Utilities', 'Entertainment', 'Shopping', 'Housing'];

function renderOnboardingWizard(step, settings) {
  const steps = ['Name', 'Province', 'API Key', 'Budgets', 'Data'];
  const dots = steps.map((s, i) => `<div style="display:flex;align-items:center;gap:6px;${i <= step ? 'color:var(--accent)' : 'color:var(--sub)'}">
    <div style="width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;${i < step ? 'background:var(--accent);color:#fff' : i === step ? 'border:2px solid var(--accent);color:var(--accent)' : 'border:2px solid var(--border);color:var(--sub)'}">${i < step ? '&#10003;' : i + 1}</div>
    <span style="font-size:12px;font-weight:${i === step ? '600' : '400'}">${s}</span>
  </div>`).join('');

  let body = '';
  if (step === 0) {
    body = `<div style="text-align:left;margin-bottom:14px">
      <div class="input-label">Your Name</div>
      <input class="input-field" id="ob-name" placeholder="Enter your name" value="${h(settings?.user_name || '')}">
    </div>
    <button class="btn btn-primary" style="width:100%;justify-content:center" data-action="ob-next">Continue</button>`;
  } else if (step === 1) {
    const provOptions = PROVINCES.map(p =>
      `<option value="${p.code}" ${(settings?.province || 'AB') === p.code ? 'selected' : ''}>${p.name}</option>`
    ).join('');
    body = `<div style="text-align:left;margin-bottom:14px">
      <div class="input-label">Your Province</div>
      <select class="input-field" id="ob-province">${provOptions}</select>
    </div>
    <div style="display:flex;gap:8px">
      <button class="btn btn-ghost" style="flex:1;justify-content:center" data-action="ob-prev">${icon('arrow-left', 14)} Back</button>
      <button class="btn btn-primary" style="flex:1;justify-content:center" data-action="ob-next">Continue</button>
    </div>`;
  } else if (step === 2) {
    body = `<div style="text-align:left;margin-bottom:14px">
      <div class="input-label">Claude API Key (optional)</div>
      <input class="input-field" id="ob-api-key" type="password" placeholder="sk-ant-..." value="${h(settings?.ai_api_key || '')}">
      <div style="color:var(--sub);font-size:11px;margin-top:4px">Powers the AI financial advisor. You can add this later in Settings.</div>
    </div>
    <div style="display:flex;gap:8px">
      <button class="btn btn-ghost" style="flex:1;justify-content:center" data-action="ob-prev">${icon('arrow-left', 14)} Back</button>
      <button class="btn btn-primary" style="flex:1;justify-content:center" data-action="ob-next">Continue</button>
      <button class="btn btn-ghost" style="justify-content:center" data-action="ob-next">Skip</button>
    </div>`;
  } else if (step === 3) {
    const cats = CATEGORIES.filter(c => c !== 'Income' && c !== 'Investment Income' && c !== 'Government Benefits' && c !== 'GST/HST');
    const checks = cats.map(c => `<label style="display:flex;align-items:center;gap:8px;padding:6px 0;cursor:pointer">
      <input type="checkbox" class="ob-budget-cat" value="${c}" ${OB_DEFAULT_BUDGETS.includes(c) ? 'checked' : ''}>
      <span style="font-size:13px">${c}</span>
    </label>`).join('');
    body = `<div style="text-align:left;margin-bottom:14px">
      <div class="input-label">Select budget categories to track</div>
      <div style="max-height:200px;overflow-y:auto;padding:4px 0">${checks}</div>
    </div>
    <div style="display:flex;gap:8px">
      <button class="btn btn-ghost" style="flex:1;justify-content:center" data-action="ob-prev">${icon('arrow-left', 14)} Back</button>
      <button class="btn btn-primary" style="flex:1;justify-content:center" data-action="ob-next">Continue</button>
    </div>`;
  } else if (step === 4) {
    body = `<div style="text-align:center;margin-bottom:20px">
      <div style="font-size:15px;font-weight:600;margin-bottom:8px">How would you like to start?</div>
      <div style="color:var(--sub);font-size:12.5px">Sample data gives you a feel for the app. You can always reset later.</div>
    </div>
    <button class="btn btn-primary" style="width:100%;justify-content:center" data-action="start-sample">
      ${icon('sparkles', 15)} Start with Sample Data
    </button>
    <button class="btn btn-ghost" style="width:100%;justify-content:center;margin-top:8px" data-action="start-empty">
      Start fresh (empty)
    </button>
    <button class="btn btn-ghost" style="width:100%;justify-content:center;margin-top:4px;font-size:12px;color:var(--sub)" data-action="ob-prev">
      ${icon('arrow-left', 12)} Back
    </button>`;
  }

  return `<div class="onboard">
    <div class="card onboard-card" style="max-width:440px">
      <div class="side-logo" style="width:60px;height:60px;border-radius:16px;font-size:26px;margin:0 auto 18px">W</div>
      <div style="font-size:26px;font-weight:800;letter-spacing:-1px;margin-bottom:6px">Welcome to WealthFlow</div>
      <div style="color:var(--sub);font-size:13.5px;margin-bottom:20px;line-height:1.6">
        AI-powered personal finance for Canadians.
      </div>
      <div style="display:flex;justify-content:center;gap:16px;margin-bottom:24px">${dots}</div>
      ${body}
    </div>
  </div>`;
}

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

async function render() {
  const el = document.getElementById('app');
  let state, settings;
  try {
    state = State.getState();
    settings = state.settings;
  } catch (err) {
    el.innerHTML = renderErrorScreen(err.message);
    return;
  }

  // Apply theme
  if (settings && settings.dark_mode) {
    document.body.classList.remove('light');
  } else {
    document.body.classList.add('light');
  }

  // Onboarding wizard
  if (!settings || !settings.onboarded) {
    const obStep = settings?.last_wizard_step || 0;
    el.innerHTML = renderOnboardingWizard(obStep, settings);
    return;
  }

  // Get financial computations
  const F = await State.computeFinancials();

  // Build main layout
  el.innerHTML = `
    <div class="app">
      ${renderSidebar(sideOpen)}
      <main class="main">
        ${renderHeader(settings)}
        <div class="content" id="page"></div>
      </main>
      <button class="ai-fab" data-action="toggle-ai">${showAI ? icon('x', 20) : icon('lightbulb', 20)}</button>
      ${renderAiPanel(showAI)}
      <div id="modal-root">${activeModal ? renderModal(activeModal, editData) : ''}${importModalData ? renderImportModal(importModalData) : ''}${recurringModalData ? renderRecurringModal(recurringModalData) : ''}</div>
      <div id="toast-root">${renderToasts()}</div>
    </div>`;

  // Render current page
  destroyCharts();
  const page = document.getElementById('page');
  const section = getSection();

  if (section === 'dashboard') page.innerHTML = renderPageSafe(renderDashboard, state, F);
  else if (section === 'budget') page.innerHTML = renderPageSafe(renderBudget, state, F);
  else if (section === 'transactions') page.innerHTML = renderPageSafe(renderTransactions, state);
  else if (section === 'savings') page.innerHTML = renderPageSafe(renderSavings, state);
  else if (section === 'debts') page.innerHTML = renderPageSafe(renderDebts, state);
  else if (section === 'investments') page.innerHTML = renderPageSafe(renderInvestments, state);
  else if (section === 'analytics') {
    page.innerHTML = renderPageSafe(renderAnalytics, state, F);
    try { initCharts(state, F); } catch (e) { /* charts optional */ }
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
  if (showAI) {
    const msgs = document.getElementById('ai-msgs');
    if (msgs) msgs.scrollTop = msgs.scrollHeight;
  }
}

function bindEvents() {
  const el = document.getElementById('app');

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Escape to close modals
    if (e.key === 'Escape') {
      if (activeModal) { activeModal = null; editData = null; render(); return; }
      if (showAI) { showAI = false; render(); return; }
    }
    // Ctrl+N: new transaction
    if (e.ctrlKey && e.key === 'n') {
      e.preventDefault();
      activeModal = 'transaction';
      editData = null;
      render();
      return;
    }
    // Ctrl+Z: undo
    if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      handleUndo();
      return;
    }
    // / to focus search
    if (e.key === '/' && !e.ctrlKey && !e.metaKey && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
      e.preventDefault();
      const search = document.querySelector('.search-input');
      if (search) search.focus();
      return;
    }
    // Ctrl+1-9: navigate to pages
    if (e.ctrlKey && e.key >= '1' && e.key <= '9') {
      e.preventDefault();
      const NAV = ['dashboard', 'budget', 'transactions', 'savings', 'debts', 'investments', 'registered', 'tax-calc', 'analytics'];
      const idx = parseInt(e.key) - 1;
      if (idx < NAV.length) navigate(NAV[idx]);
      return;
    }
  });

  el.addEventListener('click', async (e) => {
    // Stop propagation for modal inner content so overlay click-to-close works
    const modalInner = e.target.closest('.modal, .import-modal');
    const btn = e.target.closest('[data-action]');

    // If click is inside a modal but the closest [data-action] is outside it (the overlay),
    // ignore the click so inputs/selects work normally
    if (modalInner && (!btn || !modalInner.contains(btn))) return;

    if (!btn) {
      // Check for nav buttons
      const navBtn = e.target.closest('[data-nav]');
      if (navBtn) {
        navigate(navBtn.dataset.nav);
        return;
      }
      return;
    }

    const action = btn.dataset.action;

    switch (action) {
      case 'toggle-side':
        sideOpen = !sideOpen;
        render();
        break;

      case 'toggle-group': {
        const groupId = btn.dataset.group;
        const currentEl = document.querySelector('.nav-group.expanded .nav-group-header');
        const currentExpanded = currentEl?.dataset.group;
        setExpandedGroup(currentExpanded === groupId ? null : groupId);
        render();
        break;
      }
      case 'expand-group': {
        sideOpen = true;
        setExpandedGroup(btn.dataset.group);
        render();
        break;
      }

      case 'toggle-theme': {
        const s = State.getState().settings;
        await State.updateSettings({ dark_mode: !s.dark_mode });
        render();
        break;
      }

      case 'toggle-ai':
        showAI = !showAI;
        render();
        break;

      case 'ob-next': {
        const s = State.getState().settings || {};
        const obStep = s.last_wizard_step || 0;
        const updates = {};
        if (obStep === 0) {
          updates.user_name = document.getElementById('ob-name')?.value || 'User';
        } else if (obStep === 1) {
          updates.province = document.getElementById('ob-province')?.value || 'AB';
        } else if (obStep === 2) {
          const key = document.getElementById('ob-api-key')?.value?.trim();
          if (key) updates.ai_api_key = key;
        }
        updates.last_wizard_step = obStep + 1;
        await State.updateSettings(updates);
        render();
        break;
      }

      case 'ob-prev': {
        const s2 = State.getState().settings || {};
        const prev = Math.max(0, (s2.last_wizard_step || 0) - 1);
        await State.updateSettings({ last_wizard_step: prev });
        render();
        break;
      }

      case 'start-sample': {
        // Create initial budgets from onboarding selections
        const checkedCats = [...document.querySelectorAll('.ob-budget-cat:checked')].map(el => el.value);
        const defaultAmounts = { 'Food/Groceries': 600, 'Transport': 400, 'Utilities': 350, 'Entertainment': 200, 'Shopping': 300, 'Housing': 2000, 'Rent/Mortgage': 2000, 'Healthcare': 200, 'Insurance': 300, 'Childcare': 500, 'Education': 200, 'Property Tax': 300 };
        await State.updateSettings({ onboarded: true, last_wizard_step: 0 });
        await State.seedSampleData(SAMPLE_DATA);
        // Add budgets for selected categories not in sample data
        for (const cat of checkedCats) {
          const exists = State.getState().budgets.find(b => b.category === cat);
          if (!exists) {
            await State.addBudget({ id: uid(), category: cat, amount: defaultAmounts[cat] || 300, color: '#6366f1' });
          }
        }
        render();
        break;
      }

      case 'start-empty': {
        const checkedCats2 = [...document.querySelectorAll('.ob-budget-cat:checked')].map(el => el.value);
        const defaultAmounts2 = { 'Food/Groceries': 600, 'Transport': 400, 'Utilities': 350, 'Entertainment': 200, 'Shopping': 300, 'Housing': 2000, 'Rent/Mortgage': 2000, 'Healthcare': 200, 'Insurance': 300, 'Childcare': 500, 'Education': 200, 'Property Tax': 300 };
        await State.updateSettings({ onboarded: true, last_wizard_step: 0 });
        await State.loadAll();
        for (const cat of checkedCats2) {
          await State.addBudget({ id: uid(), category: cat, amount: defaultAmounts2[cat] || 300, color: '#6366f1' });
        }
        render();
        break;
      }

      case 'open-modal':
        editData = null;
        activeModal = btn.dataset.modal;
        render();
        break;

      case 'close-modal':
        activeModal = null;
        editData = null;
        render();
        break;

      // Edit actions — set editData then open modal
      case 'edit-tx': {
        const tx = State.getState().transactions.find(t => t.id === btn.dataset.id);
        if (tx) { editData = tx; activeModal = 'tx'; render(); }
        break;
      }
      case 'edit-budget': {
        const b = State.getState().budgets.find(x => x.id === btn.dataset.id);
        if (b) { editData = b; activeModal = 'budget'; render(); }
        break;
      }
      case 'edit-debt': {
        const d = State.getState().debts.find(x => x.id === btn.dataset.id);
        if (d) { editData = d; activeModal = 'debt'; render(); }
        break;
      }
      case 'edit-inv': {
        const i = State.getState().investments.find(x => x.id === btn.dataset.id);
        if (i) { editData = i; activeModal = 'inv'; render(); }
        break;
      }
      case 'edit-bill': {
        const b = State.getState().bills.find(x => x.id === btn.dataset.id);
        if (b) { editData = b; activeModal = 'bill'; render(); }
        break;
      }

      case 'edit-residence': {
        activeModal = 'residence';
        editData = State.getState().residence || {};
        render();
        break;
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
        break;
      }

      case 'save-modal':
        await handleSaveModal(btn.dataset.modalType);
        activeModal = null;
        editData = null;
        render();
        break;

      // Delete actions with confirmation
      case 'delete-tx':
        if (confirm('Delete this transaction?')) {
          await State.deleteTransaction(btn.dataset.id);
          showToast('Transaction deleted');
          render();
        }
        break;

      case 'delete-goal':
        if (confirm('Delete this savings goal?')) {
          await State.deleteGoal(btn.dataset.id);
          showToast('Goal deleted');
          render();
        }
        break;

      case 'delete-debt':
        if (confirm('Delete this debt?')) {
          await State.deleteDebt(btn.dataset.id);
          showToast('Debt deleted');
          render();
        }
        break;

      case 'delete-inv':
        if (confirm('Delete this investment?')) {
          await State.deleteInvestment(btn.dataset.id);
          showToast('Investment deleted');
          render();
        }
        break;

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
        break;
      }

      case 'delete-bill':
        if (confirm('Delete this reminder?')) {
          await State.deleteBill(btn.dataset.id);
          showToast('Reminder deleted');
          render();
        }
        break;

      case 'delete-budget':
        if (confirm('Delete this budget?')) {
          await State.deleteBudget(btn.dataset.id);
          showToast('Budget deleted');
          render();
        }
        break;

      case 'set-reg-tab':
        setRegTab(btn.dataset.tab);
        render();
        break;

      case 'delete-contribution':
        if (confirm('Delete this contribution?')) {
          await State.deleteContribution(btn.dataset.id);
          showToast('Contribution deleted');
          render();
        }
        break;

      case 'delete-gic':
        if (confirm('Delete this GIC?')) {
          await State.deleteGIC(btn.dataset.id);
          showToast('GIC deleted');
          render();
        }
        break;

      case 'delete-resp-beneficiary':
        if (confirm('Delete this beneficiary?')) {
          await State.deleteRESPBeneficiary(btn.dataset.id);
          showToast('Beneficiary deleted');
          render();
        }
        break;

      case 'nav-to-tax':
        navigate('tax-calc');
        break;

      case 'export-json':
        await exportJSON();
        showToast('Data exported as JSON');
        break;

      case 'export-csv':
        await exportCSV();
        showToast('Transactions exported as CSV');
        break;

      case 'import-csv': {
        const fileData = await importFile();
        if (fileData) {
          // Check if this is a holdings/portfolio import (not transactions)
          if (fileData.detectedBank?.key) {
            const { BANK_PRESETS } = await import('./utils/bank-presets.js');
            const preset = BANK_PRESETS[fileData.detectedBank.key];
            if (preset?.type === 'holdings') {
              // Direct holdings import — update investments
              try {
                const holdingsResult = await applyHoldingsImport(fileData.rows, preset.mapping, fileData.detectedBank);
                await State.loadAll();
                showToast(`Portfolio updated from ${fileData.detectedBank.name}: ${holdingsResult.updated} updated, ${holdingsResult.added} added, ${holdingsResult.skipped} skipped`);
                render();
              } catch (err) {
                showToast('Holdings import failed: ' + err.message, 'error');
              }
              break;
            }
          }

          // Standard transaction import
          const duplicates = await checkDuplicates(fileData.rows, fileData.mapping);
          importModalData = {
            ...fileData,
            duplicates,
            errors: [],
            useAI: false,
            aiLoading: false,
            aiCategories: null,
            processing: false,
          };
          render();
        }
        break;
      }

      case 'close-import-modal':
        importModalData = null;
        render();
        break;

      case 'confirm-import': {
        if (!importModalData || importModalData.processing) break;
        importModalData.processing = true;
        const modalRoot = document.getElementById('modal-root');
        if (modalRoot) modalRoot.innerHTML = renderImportModal(importModalData);

        const aiCats = importModalData.useAI ? importModalData.aiCategories : null;
        const result = await applyImport(
          importModalData.rows,
          importModalData.mapping,
          importModalData.duplicates,
          aiCats
        );

        // Save import history
        await saveImportHistory(
          importModalData.filePath,
          importModalData.fileType,
          importModalData.rows.length,
          result
        );

        // Reconcile: update debts, goals, contributions from imported data
        const reconciled = await reconcileAfterImport(
          result.transactions || [],
          importModalData.detectedBank
        );

        await State.loadAll();

        // Build toast message
        let msg = `Imported ${result.imported} transactions`;
        if (result.duplicateCount > 0) msg += `, ${result.duplicateCount} duplicates skipped`;
        if (result.errorCount > 0) msg += `, ${result.errorCount} errors`;
        const reconParts = [];
        if (reconciled.debtsUpdated > 0) reconParts.push(`${reconciled.debtsUpdated} debt balance(s) updated`);
        if (reconciled.goalsUpdated > 0) reconParts.push(`${reconciled.goalsUpdated} goal(s) updated`);
        if (reconParts.length > 0) msg += ` | ${reconParts.join(', ')}`;

        importModalData = null;
        showToast(msg);
        render();
        break;
      }

      case 'show-all-actions': {
        setShowAllActions(true);
        render();
        break;
      }

      case 'export-qif': {
        const qifStr = exportToQIF(State.getState().transactions);
        const result = await window.wealthflow.showSaveDialog({ defaultPath: 'wealthflow.qif', filters: [{ name: 'QIF', extensions: ['qif'] }] });
        if (!result.canceled && result.filePath) {
          await window.wealthflow.writeFile(result.filePath, qifStr);
          showToast('QIF exported', 'success');
        }
        break;
      }

      case 'export-pdf': {
        const pdfF = await State.computeFinancials();
        await exportPDF(State.getState(), pdfF);
        showToast('PDF report exported');
        break;
      }

      case 'detect-recurring': {
        const state = State.getState();
        const patterns = detectRecurringPayments(state.transactions, state.bills);
        recurringModalData = { patterns, selected: new Set() };
        render();
        break;
      }

      case 'toast-action': {
        const toastId = btn.dataset.toastId;
        if (toastId) handleToastAction(toastId);
        break;
      }

      case 'close-recurring-modal':
        recurringModalData = null;
        render();
        break;

      case 'confirm-recurring': {
        if (!recurringModalData || recurringModalData.selected.size === 0) break;
        const { patterns, selected } = recurringModalData;
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
        recurringModalData = null;
        showToast(`Created ${created} recurring reminder${created !== 1 ? 's' : ''}`);
        await State.loadAll();
        render();
        break;
      }

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
          await addXP(10);
          showToast('Payment recorded');
          render();
        }
        break;
      }

      case 'load-more-tx': {
        nextTxPage();
        const page = document.getElementById('page');
        if (page && getSection() === 'transactions') {
          page.innerHTML = renderTransactions(State.getState());
        }
        break;
      }

      // Transaction filter — category pills
      case 'filter-tx-cat': {
        setTxFilter('category', btn.dataset.cat);
        const page = document.getElementById('page');
        if (page && getSection() === 'transactions') {
          page.innerHTML = renderTransactions(State.getState());
        }
        break;
      }

      case 'deposit-goal': {
        const amt = prompt('Deposit amount ($):');
        if (amt && +amt > 0) {
          const state = State.getState();
          const g = state.goals.find(x => x.id === btn.dataset.id);
          if (g) {
            await State.updateGoal({ ...g, current: g.current + +amt });
            await addXP(15);
            showToast(`Deposited ${fmt(+amt)} to ${g.name}`);
            render();
          }
        }
        break;
      }

      case 'send-ai': {
        const inp = document.getElementById('ai-input');
        if (!inp || !inp.value.trim() || isAiStreaming()) return;
        const userText = inp.value.trim();
        addUserMsg(userText);
        startStreaming();
        render();

        // Build financial context for the AI
        const state = State.getState();
        const F = await State.computeFinancials();
        const financialData = {
          financials: F,
          settings: state.settings,
          budgets: state.budgets,
          debts: state.debts,
          investments: state.investments,
          goals: state.goals,
          contributionRoom: state.contributionRoom,
          advisorProfile: state.advisorProfile,
        };

        try {
          await window.wealthflow.aiChat(userText, financialData);
          // Stream handlers update the panel in real-time
          render();
        } catch (err) {
          handleStreamError(err.message || 'Failed to get AI response');
          render();
        }
        break;
      }

      case 'clear-ai-history': {
        clearAiHistory();
        await window.wealthflow.aiClearHistory();
        render();
        break;
      }

      case 'save-ai-key': {
        const keyInput = document.getElementById('ai-key-input');
        const key = keyInput?.value?.trim();
        if (!key) { showToast('Please enter an API key', 'error'); break; }
        await State.updateSettings({ ai_api_key: key });
        showToast('API key saved');
        render();
        break;
      }

      case 'reload-knowledge': {
        await window.wealthflow.reloadKnowledgeBase();
        showToast('Knowledge base reloaded');
        break;
      }

      case 'reset-all': {
        if (confirm('Are you sure? This will delete all your data.')) {
          await State.updateSettings({
            user_name: '', dark_mode: true, onboarded: false, level: 1, xp: 0, province: 'ON'
          });
          location.reload();
        }
        break;
      }

      case 'nav-to-advisor':
        navigate('advisor');
        break;

      // Wizard navigation
      case 'wizard-goto-step': {
        const step = parseInt(btn.dataset.step);
        if (!isNaN(step)) {
          setWizardStep(step);
          await State.updateSettings({ last_wizard_step: step });
          render();
        }
        break;
      }

      case 'wizard-next': {
        const next = getWizardStep() + 1;
        if (next < 8) {
          setWizardStep(next);
          await State.updateSettings({ last_wizard_step: next });
          render();
        }
        break;
      }

      case 'wizard-prev': {
        const prev = getWizardStep() - 1;
        if (prev >= 0) {
          setWizardStep(prev);
          await State.updateSettings({ last_wizard_step: prev });
          render();
        }
        break;
      }

      case 'wizard-skip': {
        const skipNext = getWizardStep() + 1;
        if (skipNext < 8) {
          setWizardStep(skipNext);
          await State.updateSettings({ last_wizard_step: skipNext });
          render();
        }
        break;
      }

      case 'wizard-save-step': {
        await saveCurrentWizardStep();
        const nextStep = getWizardStep() + 1;
        if (nextStep < 8) {
          setWizardStep(nextStep);
          await State.updateSettings({ last_wizard_step: nextStep });
        }
        showToast('Progress saved');
        render();
        break;
      }

      case 'wizard-toggle-goal': {
        const goalCode = btn.dataset.goal;
        const profile = State.getState().advisorProfile;
        if (!profile) break;
        const existing = profile.goals.find(g => g.goal_type === goalCode);
        if (existing) {
          await State.deleteAdvisorGoal(existing.id);
        } else {
          await State.upsertAdvisorGoal({ id: uid(), goal_type: goalCode, priority: profile.goals.length });
        }
        render();
        break;
      }

      case 'wizard-add-asset': {
        const assetType = prompt('Asset type (chequing, savings, hisa, gic, vehicle, other):');
        if (!assetType) break;
        const desc = prompt('Description (e.g. TD Chequing):');
        const bal = prompt('Current balance ($):');
        await State.addAdvisorAsset({
          id: uid(), asset_type: assetType.toLowerCase(),
          description: desc || '', balance: +(bal || 0),
        });
        showToast('Asset added');
        render();
        break;
      }

      case 'wizard-delete-asset':
        if (confirm('Remove this asset?')) {
          await State.deleteAdvisorAsset(btn.dataset.id);
          showToast('Asset removed');
          render();
        }
        break;

      case 'wizard-upload-doc': {
        const result = await window.wealthflow.showOpenDialog({
          properties: ['openFile'],
          filters: [
            { name: 'Documents', extensions: ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx', 'xls', 'xlsx'] },
            { name: 'All Files', extensions: ['*'] },
          ],
        });
        if (result.canceled || !result.filePaths.length) break;
        const srcPath = result.filePaths[0];
        const originalName = srcPath.split(/[\\/]/).pop();
        const ext = originalName.includes('.') ? '.' + originalName.split('.').pop() : '';
        const destFilename = uid() + ext;
        await State.copyDocumentFile(srcPath, destFilename);
        const docType = prompt(`Document type? (${DOCUMENT_TYPES.map(d => d.code).join(', ')}):`) || 'other';
        const notes = prompt('Notes (optional):') || '';
        // Get file size via a rough estimate (we don't have access to fs in renderer)
        await State.addAdvisorDocument({
          id: uid(), filename: destFilename, original_name: originalName,
          doc_type: docType, notes, file_size: 0,
        });
        showToast('Document uploaded');
        render();
        break;
      }

      case 'wizard-open-doc':
        await State.openDocumentFile(btn.dataset.filename);
        break;

      case 'wizard-delete-doc':
        if (confirm('Delete this document?')) {
          await State.deleteAdvisorDocument(btn.dataset.id);
          showToast('Document deleted');
          render();
        }
        break;

      case 'wizard-complete-profile': {
        await saveCurrentWizardStep();
        await State.updateSettings({ profile_completed: true });
        await addXP(100);
        showToast('Profile completed! +100 XP');
        navigate('dashboard');
        break;
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
        break;
      }

      case 'generate-monthly-report': {
        try {
          showToast('Generating monthly report...', 'info');
          const now = new Date();
          const month = String(now.getMonth() + 1).padStart(2, '0');
          const year = now.getFullYear();
          const reportText = await State.generateMonthlyReport(month, year);
          const report = { id: `report-${year}-${month}`, month, year: parseInt(year), report_text: reportText };
          await State.saveMonthlyReport(report);
          showToast('Monthly report generated!', 'success');
          render();
        } catch (err) {
          showToast('Report generation failed: ' + err.message, 'error');
        }
        break;
      }
    }
  });

  // AI input enter key
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.id === 'ai-input') {
      document.querySelector('[data-action="send-ai"]')?.click();
    }
  });

  // Debounced page re-render that preserves focus
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
      page.innerHTML = renderFn(State.getState());
      if (focusField) {
        const restored = page.querySelector(`[data-field="${focusField}"]`);
        if (restored) {
          restored.focus();
          if (cursorPos !== undefined && restored.setSelectionRange) {
            try { restored.setSelectionRange(cursorPos, cursorPos); } catch {}
          }
        }
      }
    }, delay);
  }

  // Delegated input listener for tax calc, planning, transaction search
  el.addEventListener('input', (e) => {
    // Tax calculator
    if (e.target.classList.contains('tax-input')) {
      const field = e.target.dataset.field;
      if (field) {
        updateTaxInput(field, e.target.value);
        debouncedPageRender('tax-calc', (s) => renderTaxCalculator(s));
      }
    }
    // Planning page
    if (e.target.classList.contains('plan-input')) {
      const field = e.target.dataset.field;
      if (field) {
        updatePlanInput(field, e.target.value);
        debouncedPageRender('planning', (s) => renderPlanning(s));
      }
    }
    // Wizard inputs
    if (e.target.classList.contains('wizard-input')) {
      const step = e.target.dataset.step;
      const fld = e.target.dataset.field;
      if (step && fld) {
        updateWizardDraft(step, fld, e.target.value);
      }
    }
    // Transaction search
    if (e.target.classList.contains('tx-search')) {
      setTxFilter('search', e.target.value);
      debouncedPageRender('transactions', (s) => renderTransactions(s), 150);
    }
  });

  // Select change (province, sort, settings)
  el.addEventListener('change', async (e) => {
    // Tax calculator province / selects / checkboxes
    if (e.target.classList.contains('tax-input') && (e.target.tagName === 'SELECT' || e.target.type === 'checkbox')) {
      const field = e.target.dataset.field;
      if (field) {
        const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        updateTaxInput(field, val);
        const page = document.getElementById('page');
        if (page && getSection() === 'tax-calc') {
          page.innerHTML = renderTaxCalculator(State.getState());
        }
      }
    }
    // Planning page selects (mortgage frequency)
    if (e.target.classList.contains('plan-input') && e.target.tagName === 'SELECT') {
      const field = e.target.dataset.field;
      if (field) {
        updatePlanInput(field, e.target.value);
        const page = document.getElementById('page');
        if (page && getSection() === 'planning') {
          page.innerHTML = renderPlanning(State.getState());
        }
      }
    }
    // Import AI toggle checkbox
    if (e.target.dataset.action === 'import-toggle-ai') {
      if (!importModalData) return;
      importModalData.useAI = e.target.checked;
      if (importModalData.useAI && !importModalData.aiCategories) {
        importModalData.aiLoading = true;
        const mr = document.getElementById('modal-root');
        if (mr) mr.innerHTML = renderImportModal(importModalData);
        aiCategorizeImport(importModalData.rows, importModalData.mapping).then(cats => {
          importModalData.aiCategories = cats;
          importModalData.aiLoading = false;
          const mr2 = document.getElementById('modal-root');
          if (mr2 && importModalData) mr2.innerHTML = renderImportModal(importModalData);
        }).catch(() => {
          importModalData.useAI = false;
          importModalData.aiLoading = false;
          showToast('AI categorization failed');
          const mr2 = document.getElementById('modal-root');
          if (mr2 && importModalData) mr2.innerHTML = renderImportModal(importModalData);
        });
      }
      return;
    }
    // Import column mapping select
    if (e.target.classList.contains('import-mapping-select')) {
      if (!importModalData) return;
      const colHeader = e.target.dataset.colHeader;
      const newRole = e.target.value;
      // Remove this header from any existing mapping
      for (const key of Object.keys(importModalData.mapping)) {
        if (importModalData.mapping[key] === colHeader) {
          importModalData.mapping[key] = null;
        }
      }
      // Assign new role
      if (newRole && newRole !== '') {
        importModalData.mapping[newRole] = colHeader;
      }
      // Re-check duplicates with new mapping
      checkDuplicates(importModalData.rows, importModalData.mapping).then(dupes => {
        importModalData.duplicates = dupes;
        const modalRoot = document.getElementById('modal-root');
        if (modalRoot && importModalData) modalRoot.innerHTML = renderImportModal(importModalData);
      });
      return;
    }
    // Recurring detection checkboxes
    if (e.target.dataset.action === 'recurring-select') {
      if (!recurringModalData) return;
      const id = e.target.dataset.id;
      if (e.target.checked) recurringModalData.selected.add(id);
      else recurringModalData.selected.delete(id);
      const mr = document.getElementById('modal-root');
      if (mr) mr.innerHTML = renderRecurringModal(recurringModalData);
      return;
    }
    if (e.target.dataset.action === 'recurring-select-all') {
      if (!recurringModalData) return;
      const newPatterns = recurringModalData.patterns.filter(p => !p.alreadyTracked);
      if (e.target.checked) {
        newPatterns.forEach(p => recurringModalData.selected.add(p.id));
      } else {
        recurringModalData.selected.clear();
      }
      const mr = document.getElementById('modal-root');
      if (mr) mr.innerHTML = renderRecurringModal(recurringModalData);
      return;
    }
    // Transaction sort
    if (e.target.classList.contains('tx-sort')) {
      setTxFilter('sort', e.target.value);
      const page = document.getElementById('page');
      if (page && getSection() === 'transactions') {
        page.innerHTML = renderTransactions(State.getState());
      }
    }
    // Wizard selects, checkboxes, and radios
    if (e.target.classList.contains('wizard-input')) {
      const step = e.target.dataset.step;
      const fld = e.target.dataset.field;
      if (step && fld) {
        const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        updateWizardDraft(step, fld, val);
        // Re-render risk step for live risk score
        if (step === 'risk' && getSection() === 'advisor') {
          const pg = document.getElementById('page');
          if (pg) pg.innerHTML = renderAdvisorWizard(State.getState(), State.getState().advisorProfile);
        }
      }
    }
    // Settings inputs
    if (e.target.classList.contains('settings-input')) {
      const field = e.target.dataset.field;
      if (field) {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        await State.updateSettings({ [field]: value });
        if (field === 'dark_mode') render();
      }
    }
  });
}

async function handleSaveModal(type) {
  switch (type) {
    case 'tx': {
      clearFieldErrors();
      const desc = document.getElementById('m-desc')?.value;
      const amt = document.getElementById('m-amt')?.value;
      const date = document.getElementById('m-date')?.value;
      const cat = document.getElementById('m-cat')?.value;
      const txType = document.getElementById('m-type')?.value;
      const descErr = validateRequired(desc, 'Description');
      const amtErr = validateAmount(amt, 'Amount');
      if (descErr) showFieldError('m-desc', descErr);
      if (amtErr) showFieldError('m-amt', amtErr);
      if (descErr || amtErr) return;
      const txData = {
        description: desc,
        amount: txType === 'income' ? Math.abs(+amt) : -Math.abs(+amt),
        category: txType === 'income' ? 'Income' : cat,
        date: date || new Date().toISOString().slice(0, 10),
        icon: 'receipt',
      };
      if (editData) {
        const oldCategory = editData.category;
        const newCategory = txData.category;
        await State.updateTransaction({ ...txData, id: editData.id });
        showToast('Transaction updated');
        // If category changed, offer to apply to all transactions from same payee
        if (oldCategory !== newCategory) {
          const desc = txData.description;
          const otherCount = (await State.countTransactionsByDescription(desc)) - 1;
          if (otherCount > 0) {
            showActionToast(
              `Apply "${newCategory}" to all ${otherCount} other transaction${otherCount !== 1 ? 's' : ''} from this payee?`,
              'Apply All',
              async () => {
                await State.updateCategoryByDescription(desc, newCategory);
                showToast(`Updated ${otherCount} transaction${otherCount !== 1 ? 's' : ''} to "${newCategory}"`);
                render();
              }
            );
          }
        }
      } else {
        await State.addTransaction({ ...txData, id: uid() });
        await addXP(10);
        showToast('Transaction added');
      }
      break;
    }
    case 'budget': {
      const bcat = document.getElementById('m-bcat')?.value;
      const amt = document.getElementById('m-amt')?.value;
      const color = document.getElementById('m-color')?.value;
      if (!amt) return;
      if (editData) {
        await State.updateBudget({ ...editData, amount: +amt, color });
        showToast('Budget updated');
      } else {
        await State.addBudget({ id: uid(), category: bcat, amount: +amt, color: color || '#6366f1' });
        showToast('Budget added');
      }
      break;
    }
    case 'goal': {
      clearFieldErrors();
      const name = document.getElementById('m-name')?.value;
      const target = document.getElementById('m-target')?.value;
      const cur = document.getElementById('m-cur')?.value;
      const dl = document.getElementById('m-dl')?.value;
      const nameErr = validateRequired(name, 'Goal name');
      const targetErr = validateAmount(target, 'Target amount');
      if (nameErr) showFieldError('m-name', nameErr);
      if (targetErr) showFieldError('m-target', targetErr);
      if (nameErr || targetErr) return;
      const colors = ['#10b981', '#6366f1', '#f59e0b', '#ec4899', '#8b5cf6'];
      if (editData) {
        await State.updateGoal({ ...editData, name, target: +target, current: +(cur || 0), deadline: dl || null });
        showToast('Goal updated');
      } else {
        await State.addGoal({
          id: uid(), name, target: +target, current: +(cur || 0),
          color: colors[Math.floor(Math.random() * colors.length)],
          deadline: dl || null,
        });
        await addXP(25);
        showToast('Goal added');
      }
      break;
    }
    case 'debt': {
      clearFieldErrors();
      const name = document.getElementById('m-name')?.value;
      const bal = document.getElementById('m-bal')?.value;
      const rate = document.getElementById('m-rate')?.value;
      const min = document.getElementById('m-min')?.value;
      const dtype = document.getElementById('m-dtype')?.value;
      const nameErr = validateRequired(name, 'Debt name');
      const balErr = validateAmount(bal, 'Balance');
      if (nameErr) showFieldError('m-name', nameErr);
      if (balErr) showFieldError('m-bal', balErr);
      if (nameErr || balErr) return;
      const debtData = {
        name, balance: +bal, rate: +(rate || 0),
        min_payment: +(min || 0), type: dtype || 'loan',
      };
      if (editData) {
        await State.updateDebt({ ...debtData, id: editData.id });
        showToast('Debt updated');
      } else {
        await State.addDebt({ ...debtData, id: uid() });
        showToast('Debt added');
      }
      break;
    }
    case 'inv': {
      const sym = document.getElementById('m-sym')?.value;
      const name = document.getElementById('m-name')?.value;
      const sh = document.getElementById('m-sh')?.value;
      const avg = document.getElementById('m-avg')?.value;
      const pr = document.getElementById('m-pr')?.value;
      const itype = document.getElementById('m-itype')?.value;
      const acct = document.getElementById('m-acct')?.value;
      const inst = document.getElementById('m-inst')?.value;
      if (!sym || !sh) return;
      const invData = {
        symbol: sym.toUpperCase(), name: name || '',
        shares: +sh, avg_cost: +(avg || 0), current_price: +(pr || 0),
        type: itype || 'stock', account_type: acct || 'non-registered',
        institution: inst || null,
      };
      if (editData) {
        await State.updateInvestment({ ...invData, id: editData.id });
        showToast('Investment updated');
      } else {
        await State.addInvestment({ ...invData, id: uid() });
        showToast('Investment added');
      }
      break;
    }
    case 'bill': {
      const title = document.getElementById('m-title')?.value;
      const amt = document.getElementById('m-amt')?.value;
      const date = document.getElementById('m-date')?.value;
      const btype = document.getElementById('m-btype')?.value;
      const bcat = document.getElementById('m-bcat')?.value;
      const freq = document.getElementById('m-freq')?.value;
      const autogen = document.getElementById('m-autogen')?.checked;
      if (!title) return;
      const billDate = date || new Date().toISOString().slice(0, 10);
      const billData = {
        title, amount: +(amt || 0),
        date: billDate, type: btype || 'bill',
        category: bcat || 'Other',
        frequency: freq || null,
        next_due_date: freq ? billDate : null,
        auto_generate: autogen ? 1 : 0,
      };
      if (editData) {
        await State.updateBill({ ...billData, id: editData.id });
        showToast('Reminder updated');
      } else {
        await State.addBill({ ...billData, id: uid() });
        showToast('Reminder added');
      }
      break;
    }
    case 'tfsa-contribution':
    case 'rrsp-contribution':
    case 'resp-contribution':
    case 'fhsa-contribution': {
      const amt = document.getElementById('m-amt')?.value;
      const date = document.getElementById('m-date')?.value;
      const desc = document.getElementById('m-desc')?.value;
      const inst = document.getElementById('m-inst')?.value;
      if (!amt || +amt <= 0) return;
      const accountType = type.replace('-contribution', '');
      await State.addContribution({
        id: uid(),
        account_type: accountType,
        amount: +amt,
        date: date || new Date().toISOString().slice(0, 10),
        description: desc || null,
        institution: inst || null,
      });
      await addXP(15);
      showToast('Contribution logged');
      break;
    }
    case 'contribution-room': {
      const acctType = document.getElementById('m-acct-type')?.value;
      const room = document.getElementById('m-room')?.value;
      const date = document.getElementById('m-date')?.value;
      const notes = document.getElementById('m-notes')?.value;
      if (!room || +room < 0) return;
      await State.upsertContributionRoom({
        account_type: acctType,
        known_room: +room,
        known_as_of_date: date || new Date().toISOString().slice(0, 10),
        notes: notes || null,
      });
      showToast('Contribution room updated');
      break;
    }
    case 'resp-beneficiary': {
      const name = document.getElementById('m-name')?.value;
      const birthYear = document.getElementById('m-birth-year')?.value;
      const totalContrib = document.getElementById('m-total-contrib')?.value;
      const totalCesg = document.getElementById('m-total-cesg')?.value;
      if (!name || !birthYear) return;
      await State.addRESPBeneficiary({
        id: uid(),
        name,
        birth_year: +birthYear,
        total_contributions: +(totalContrib || 0),
        total_cesg_received: +(totalCesg || 0),
      });
      showToast('Beneficiary added');
      break;
    }
    case 'gic': {
      const inst = document.getElementById('m-inst')?.value;
      const principal = document.getElementById('m-principal')?.value;
      const rate = document.getElementById('m-rate')?.value;
      const term = document.getElementById('m-term')?.value;
      const purchaseDate = document.getElementById('m-purchase-date')?.value;
      const maturityDate = document.getElementById('m-maturity-date')?.value;
      const acct = document.getElementById('m-acct')?.value;
      const cashable = document.getElementById('m-cashable')?.checked;
      if (!principal || !rate || !term || !maturityDate) return;
      await State.addGIC({
        id: uid(),
        institution: inst || '',
        principal: +principal,
        rate: +rate,
        term_months: +term,
        purchase_date: purchaseDate || new Date().toISOString().slice(0, 10),
        maturity_date: maturityDate,
        account_type: acct || 'non-registered',
        is_cashable: cashable ? 1 : 0,
      });
      showToast('GIC added');
      break;
    }
    case 'residence': {
      const resData = {
        address: document.getElementById('m-address')?.value || '',
        purchase_price: +(document.getElementById('m-purchase-price')?.value || 0),
        current_value: +(document.getElementById('m-current-value')?.value || 0),
        purchase_date: document.getElementById('m-purchase-date')?.value || null,
        mortgage_balance: +(document.getElementById('m-mortgage-balance')?.value || 0),
        mortgage_rate: +(document.getElementById('m-mortgage-rate')?.value || 0),
        mortgage_payment: +(document.getElementById('m-mortgage-payment')?.value || 0),
        mortgage_amortization_months: +(document.getElementById('m-mortgage-amort')?.value || 0),
        property_tax_annual: +(document.getElementById('m-property-tax')?.value || 0),
        heloc_balance: +(document.getElementById('m-heloc-balance')?.value || 0),
        heloc_limit: +(document.getElementById('m-heloc-limit')?.value || 0),
        heloc_rate: +(document.getElementById('m-heloc-rate')?.value || 0),
        pre_eligible: document.getElementById('m-pre-eligible')?.checked ? 1 : 0,
        notes: document.getElementById('m-notes')?.value || '',
      };
      await State.updateResidence(resData);
      showToast(editData?.address ? 'Residence updated' : 'Residence added');
      break;
    }
  }
}

function collectFormData(prefix) {
  const data = {};
  document.querySelectorAll(`.wizard-input[data-step="${prefix}"]`).forEach(el => {
    const fld = el.dataset.field;
    if (!fld) return;
    if (el.type === 'checkbox') data[fld] = el.checked;
    else if (el.type === 'radio') { if (el.checked) data[fld] = el.value; }
    else if (el.type === 'number') data[fld] = el.value ? +el.value : 0;
    else data[fld] = el.value;
  });
  return data;
}

async function saveCurrentWizardStep() {
  const step = getWizardStep();
  const profile = State.getState().advisorProfile;
  if (!profile) return;

  switch (step) {
    case 0: { // Personal
      const data = collectFormData('personal');
      if (data.dependents_ages && typeof data.dependents_ages === 'string') {
        data.dependents_ages = JSON.stringify(data.dependents_ages.split(',').map(s => s.trim()).filter(Boolean));
      }
      await State.updateAdvisorPersonal(data);
      break;
    }
    case 1: // Employment
      await State.updateAdvisorEmployment(collectFormData('employment'));
      break;
    case 2: { // Goals — save goal details from form
      const goalData = collectFormData('goals');
      for (const g of profile.goals) {
        const horizon = goalData[`goal_horizon_${g.id}`];
        const amount = goalData[`goal_amount_${g.id}`];
        const notes = goalData[`goal_notes_${g.id}`];
        if (horizon !== undefined || amount !== undefined || notes !== undefined) {
          await State.upsertAdvisorGoal({
            ...g,
            time_horizon: horizon || g.time_horizon,
            target_amount: amount ? +amount : g.target_amount,
            notes: notes !== undefined ? notes : g.notes,
          });
        }
      }
      break;
    }
    case 3: { // Risk
      const riskData = collectFormData('risk');
      const result = computeRiskScore(riskData);
      riskData.risk_score = result.label;
      riskData.risk_score_numeric = result.numeric;
      await State.updateAdvisorRisk(riskData);
      break;
    }
    case 4: { // Assets — registered fields
      const assetData = collectFormData('assets');
      await State.updateAdvisorRegistered(assetData);
      break;
    }
    case 5: // Insurance
      await State.updateAdvisorInsurance(collectFormData('insurance'));
      break;
    case 6: // Documents — nothing to save, documents are saved on upload
      break;
    case 7: // Review — nothing to save
      break;
  }
}

async function addXP(n) {
  const s = State.getState().settings;
  const newXP = s.xp + n;
  const newLevel = Math.floor(newXP / 500) + 1;
  await State.updateSettings({ xp: newXP, level: newLevel });
}

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

// Initialize
async function init() {
  // Global error handlers
  window.onerror = (msg, source, line, col, error) => {
    if (window.wealthflow?.log) window.wealthflow.log('error', `Uncaught error: ${msg}`, { source, line, col });
    showToast('An unexpected error occurred', 'error');
  };
  window.onunhandledrejection = (event) => {
    const msg = event.reason?.message || String(event.reason);
    if (window.wealthflow?.log) window.wealthflow.log('error', `Unhandled rejection: ${msg}`);
    showToast('An unexpected error occurred', 'error');
  };

  await State.loadAll();
  // Startup hooks
  try { await State.snapshotNetWorth(); } catch (e) { /* ignore */ }
  try { await State.processRecurringBills(); } catch (e) { /* ignore */ }

  // Auto-detect recurring payments and prompt for untracked ones
  try {
    const s = State.getState();
    const recurring = detectRecurringPayments(s.transactions, s.bills);
    if (recurring.length > 0) {
      const untracked = recurring.filter(r => !r.alreadyTracked);
      if (untracked.length > 0) {
        showToast(`Found ${untracked.length} recurring payment(s). Review in Bills.`, 'info');
      }
    }
  } catch (e) { /* recurring detection not critical */ }

  // Auto theme detection
  const state = State.getState();
  if (state.settings?.theme_mode === 'auto') {
    const sysTheme = await window.wealthflow.getSystemTheme();
    if (sysTheme === 'light') document.body.classList.add('light');
    else document.body.classList.remove('light');
  }

  // Set up AI streaming listeners
  setupStreamListeners();
  bindEvents();
  render();

  // Bill due notifications
  if (state.settings?.bill_notifications !== 0) {
    try {
      const dueBills = await window.wealthflow.getBillsDueSoon(state.settings?.bill_notify_days || 3);
      if (dueBills.length > 0) {
        const names = dueBills.map(b => b.title).join(', ');
        window.wealthflow.showNotification('Bills Due Soon', `${dueBills.length} bill(s) due: ${names}`);
      }
    } catch (e) { /* notifications not critical */ }
  }
}

init();
