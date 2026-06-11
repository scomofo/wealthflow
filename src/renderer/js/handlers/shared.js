// WealthFlow - Shared action handlers
// Extracted from app.js: toggle-side, toggle-theme, toggle-ai, toggle-group, expand-group,
// open-modal, close-modal, save-modal, send-ai, clear-ai-history, toast-action,
// run-workflow, save-workflow-action, save-all-workflow-actions, dismiss-workflow,
// complete-action, delete-action, show-all-actions, ob-next, ob-prev, start-sample, start-empty
// Also: handleSaveModal(), addXP()

import { setExpandedGroup } from '../components/sidebar.js';
import { renderImportModal } from '../components/import-modal.js';
import { renderDecisionCard } from '../components/ai-decision-card.js';
import {
  buildCompletionToast,
  getNextActionAfterCompletion,
} from '../utils/action-momentum.js';
import { findRelatedActionForNudge, getNudgeFallbackRoute } from '../utils/proactive-routing.js';

export async function handleSharedAction(action, btn, ctx) {
  const { State, render, showToast, showActionToast, uid, appState, navigate, getSection,
    addUserMsg, clearAiHistory, startStreaming, endStreaming, handleStreamError, isAiStreaming,
    renderModal, renderToasts, renderTransactions, renderTaxCalculator, renderPlanning,
    renderAdvisorWizard, renderRecurringModal, SAMPLE_DATA, CATEGORIES,
    clearFieldErrors, validateRequired, validateAmount, showFieldError, fmt, h,
    handleToastAction, computeRiskScore, DOCUMENT_TYPES, PROVINCES,
    setTxFilter, nextTxPage, setRegTab, setLastPriceRefresh, updateTaxInput, initTaxInputs,
    updatePlanInput, initWizard, setWizardStep, getWizardStep, updateWizardDraft, getWizardDraft,
  } = ctx;

  switch (action) {
    case 'toggle-side':
      appState.sideOpen = !appState.sideOpen;
      render();
      return true;

    case 'toggle-group': {
      const groupId = btn.dataset.group;
      const currentEl = document.querySelector('.nav-group.expanded .nav-group-header');
      const currentExpanded = currentEl?.dataset.group;
      setExpandedGroup(currentExpanded === groupId ? null : groupId);
      render();
      return true;
    }
    case 'expand-group': {
      appState.sideOpen = true;
      setExpandedGroup(btn.dataset.group);
      render();
      return true;
    }

    case 'toggle-theme': {
      const s = State.getState().settings;
      await State.updateSettings({ dark_mode: !s.dark_mode });
      render();
      return true;
    }

    case 'toggle-ai':
      appState.showAI = !appState.showAI;
      render();
      return true;

    case 'ob-next': {
      const s = State.getState().settings || {};
      const obStep = s.last_wizard_step || 0;
      const updates = {};
      if (obStep === 1) {
        // Quick Financial Setup — save all fields from single screen
        const name = document.getElementById('ob-name')?.value?.trim();
        updates.user_name = name || s.user_name || 'User';
        updates.province = document.getElementById('ob-province')?.value || 'AB';
        const income = document.getElementById('ob-income')?.value;
        if (income && +income > 0) updates.monthly_income = +income;
        const expenses = document.getElementById('ob-expenses')?.value;
        if (expenses && +expenses > 0) updates.monthly_expenses = +expenses;
        const debt = document.getElementById('ob-debt')?.value;
        if (debt && +debt > 0) updates.total_debt = +debt;
        const savings = document.getElementById('ob-savings')?.value;
        if (savings && +savings >= 0) updates.savings_buffer = +savings;
        const key = document.getElementById('ob-api-key')?.value?.trim();
        if (key) updates.ai_api_key = key;
      }
      // Step 2 (budget categories) is saved by start-sample / start-empty
      updates.last_wizard_step = obStep + 1;
      await State.updateSettings(updates);
      render();
      return true;
    }

    case 'ob-prev': {
      const s2 = State.getState().settings || {};
      const prev = Math.max(0, (s2.last_wizard_step || 0) - 1);
      await State.updateSettings({ last_wizard_step: prev });
      render();
      return true;
    }

    case 'ob-complete': {
      await State.updateSettings({ onboarded: true });
      render();
      return true;
    }

    case 'start-sample': {
      const checkedCats = [...document.querySelectorAll('.ob-budget-cat:checked')].map(el => el.value);
      const defaultAmounts = { 'Food/Groceries': 600, 'Transport': 400, 'Utilities': 350, 'Entertainment': 200, 'Shopping': 300, 'Housing': 2000, 'Rent/Mortgage': 2000, 'Healthcare': 200, 'Insurance': 300, 'Childcare': 500, 'Education': 200, 'Property Tax': 300 };
      // Don't set onboarded yet — advance to step 4 (instant value screen)
      await State.updateSettings({ last_wizard_step: 4 });
      await State.seedSampleData(SAMPLE_DATA);
      for (const cat of checkedCats) {
        const exists = State.getState().budgets.find(b => b.category === cat);
        if (!exists) {
          await State.addBudget({ id: uid(), category: cat, amount: defaultAmounts[cat] || 300, color: '#6366f1' });
        }
      }
      try { await State.generateNextBestActions(); } catch (_) { /* non-blocking */ }
      render();
      return true;
    }

    case 'start-empty': {
      const checkedCats2 = [...document.querySelectorAll('.ob-budget-cat:checked')].map(el => el.value);
      const defaultAmounts2 = { 'Food/Groceries': 600, 'Transport': 400, 'Utilities': 350, 'Entertainment': 200, 'Shopping': 300, 'Housing': 2000, 'Rent/Mortgage': 2000, 'Healthcare': 200, 'Insurance': 300, 'Childcare': 500, 'Education': 200, 'Property Tax': 300 };
      // Don't set onboarded yet — advance to step 4 (instant value screen)
      await State.updateSettings({ last_wizard_step: 4 });
      await State.loadAll();
      for (const cat of checkedCats2) {
        await State.addBudget({ id: uid(), category: cat, amount: defaultAmounts2[cat] || 300, color: '#6366f1' });
      }
      try { await State.generateNextBestActions(); } catch (_) { /* non-blocking */ }
      render();
      return true;
    }

    case 'open-modal':
      appState.editData = null;
      appState.activeModal = btn.dataset.modal;
      render();
      return true;

    case 'close-modal':
      appState.activeModal = null;
      appState.editData = null;
      render();
      return true;

    case 'save-modal':
      await handleSaveModal(btn.dataset.modalType, ctx);
      appState.activeModal = null;
      appState.editData = null;
      render();
      return true;

    case 'send-ai': {
      const inp = document.getElementById('ai-input');
      if (!inp || !inp.value.trim() || isAiStreaming()) return true;
      const userText = inp.value.trim();
      addUserMsg(userText);
      startStreaming();
      render();

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
        render();
      } catch (err) {
        handleStreamError(err.message || 'Failed to get AI response');
        render();
      }
      return true;
    }

    case 'clear-ai-history': {
      clearAiHistory();
      await window.wealthflow.aiClearHistory();
      render();
      return true;
    }

    case 'toast-action': {
      const toastId = btn.dataset.toastId;
      if (toastId) handleToastAction(toastId);
      return true;
    }

    case 'run-workflow': {
      const workflowType = btn.dataset.workflow;
      appState.workflowLoading = true;
      appState.activeWorkflowResult = null;
      render();
      try {
        appState.activeWorkflowResult = await State.runWorkflow(workflowType);
      } catch (err) {
        showToast('Workflow failed: ' + err.message, 'error');
      }
      appState.workflowLoading = false;
      if (getSection() !== 'dashboard' && appState.activeWorkflowResult) {
        appState.activeModal = '_custom';
        appState.editData = {
          title: 'AI Recommendation',
          body: renderDecisionCard(appState.activeWorkflowResult),
        };
      }
      render();
      return true;
    }

    case 'save-workflow-action': {
      const wfAction = {
        id: uid(),
        workflow_type: btn.dataset.workflow,
        title: btn.dataset.title,
        action_type: btn.dataset.type || null,
        priority: btn.dataset.priority || 'medium',
        impact_text: btn.dataset.impact || null,
        status: 'pending',
      };
      await State.addRecommendedAction(wfAction);
      showToast('Action saved');
      render();
      return true;
    }

    case 'save-all-workflow-actions': {
      if (!appState.activeWorkflowResult) return true;
      const actions = appState.activeWorkflowResult.next_actions || appState.activeWorkflowResult.top_actions || [];
      for (const a of actions) {
        await State.addRecommendedAction({
          id: uid(),
          workflow_type: appState.activeWorkflowResult.workflow_type,
          title: a.title,
          action_type: a.type || null,
          priority: a.priority || 'medium',
          impact_text: a.impact || null,
          status: 'pending',
        });
      }
      showToast('Saved ' + actions.length + ' action' + (actions.length !== 1 ? 's' : ''));
      render();
      return true;
    }

    case 'dismiss-workflow': {
      appState.activeWorkflowResult = null;
      render();
      return true;
    }

    case 'complete-action': {
      const card = btn.closest('.action-card, .card');
      if (card) card.classList.add('fade-out');
      await State.completeRecommendedAction(btn.dataset.id);
      try { await State.refreshEngagementProgress(); } catch (_) { /* non-critical */ }
      showToast('Plan item completed', 'success');
      setTimeout(() => render(), 180);
      return true;
    }

    case 'delete-action': {
      const card = btn.closest('.action-card, .card');
      if (card) card.classList.add('fade-out');
      await State.deleteRecommendedAction(btn.dataset.id);
      showToast('Action removed', 'info');
      setTimeout(() => render(), 180);
      return true;
    }

    case 'generate-next-best-actions': {
      ctx.showToast('Refreshing actions...', 'info');
      try {
        await ctx.State.generateNextBestActions();
        ctx.render();
      } catch (err) {
        ctx.showToast('Failed to refresh: ' + err.message, 'error');
      }
      return true;
    }
    case 'complete-next-best-action': {
      const card = btn.closest('.action-card');
      if (card) card.classList.add('fade-out');
      const nba = (ctx.State.getState().nextBestActions || []).find(a => a.id === btn.dataset.id);
      const wasFocusMode = ctx.appState.activeModal === '_custom';
      const settings = ctx.State.getState().settings || {};
      const isFirstAction = !settings.first_action_completed;

      await ctx.State.completeNextBestAction(btn.dataset.id);
      if (nba) await ctx.State.recordInteraction('complete', nba.category || 'other');
      if (isFirstAction) await ctx.State.updateSettings({ first_action_completed: true });
      await ctx.State.refreshEngagementProgress();

      const feedback = await ctx.State.getCompletionFeedback({
        isFirstAction,
        actionTitle: nba?.title || '',
      });
      const nextAction = getNextActionAfterCompletion(ctx.State.getState().nextBestActions || [], btn.dataset.id);

      if (wasFocusMode && nba) {
        const { renderFocusMode } = await import('../components/focus-mode.js');
        const financials = await ctx.State.computeFinancials();
        ctx.appState.activeModal = '_custom';
        ctx.appState.editData = {
          title: 'Focus Mode',
          body: renderFocusMode(nba, ctx.State.getState().personalizationProfile || {}, {
            financials,
            completionFeedback: feedback,
            nextAction,
          }),
        };
        ctx.render();
        return true;
      }

      const toast = buildCompletionToast(feedback);
      ctx.showToast(toast.message, toast.type);
      ctx.appState.activeModal = null;
      ctx.appState.editData = null;
      setTimeout(() => ctx.render(), 250);
      return true;
    }
    case 'dismiss-next-best-action': {
      const card = btn.closest('.action-card');
      if (card) card.classList.add('fade-out');
      const nbaD = (ctx.State.getState().nextBestActions || []).find(a => a.id === btn.dataset.id);
      await ctx.State.dismissNextBestAction(btn.dataset.id);
      if (nbaD) await ctx.State.recordInteraction('dismiss', nbaD.category || 'other');
      try { await ctx.State.refreshEngagementProgress(); } catch (_) { /* non-critical */ }
      ctx.showToast('Action dismissed', 'info');
      ctx.appState.activeModal = null;
      ctx.appState.editData = null;
      setTimeout(() => ctx.render(), 250);
      return true;
    }
    case 'snooze-next-best-action': {
      const card = btn.closest('.action-card');
      if (card) card.classList.add('fade-out');
      const nbaS = (ctx.State.getState().nextBestActions || []).find(a => a.id === btn.dataset.id);
      const until = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
      await ctx.State.snoozeNextBestAction(btn.dataset.id, until);
      if (nbaS) await ctx.State.recordInteraction('snooze', nbaS.category || 'other');
      try { await ctx.State.refreshEngagementProgress(); } catch (_) { /* non-critical */ }
      ctx.showToast('Action snoozed for 7 days', 'info');
      ctx.appState.activeModal = null;
      ctx.appState.editData = null;
      setTimeout(() => ctx.render(), 250);
      return true;
    }

    case 'open-related-nudge-action': {
      const nudgeId = btn.dataset.nudgeId;
      const category = btn.dataset.category;
      const state = ctx.State.getState();
      const nudges = state.proactiveNudges || [];
      const nudge = nudges.find(n => n.id === nudgeId) || { related_action_category: category };
      const related = findRelatedActionForNudge(nudge, state.nextBestActions || []);

      if (related) {
        const profile = await ctx.State.recordInteraction('focus_open', related.category || 'other');
        const { renderFocusMode } = await import('../components/focus-mode.js');
        ctx.appState.activeModal = '_custom';
        ctx.appState.editData = {
          title: 'Focus Mode',
          body: renderFocusMode(related, profile || state.personalizationProfile || {}, {
            financials: await ctx.State.computeFinancials(),
          }),
        };
        ctx.render();
        return true;
      }

      navigate(getNudgeFallbackRoute(category));
      return true;
    }

    case 'open-focus-mode': {
      const actionId = btn.dataset.id;
      const nbaActions = ctx.State.getState().nextBestActions || [];
      const action = nbaActions.find(a => a.id === actionId);
      if (action) {
        const profile = await ctx.State.recordInteraction('focus_open', action.category || 'other');
        const { renderFocusMode } = await import('../components/focus-mode.js');
        const financials = await ctx.State.computeFinancials();
        ctx.appState.activeModal = '_custom';
        ctx.appState.editData = {
          title: 'Focus Mode',
          body: renderFocusMode(action, profile || ctx.State.getState().personalizationProfile || {}, { financials }),
        };
        ctx.render();
      }
      return true;
    }
    case 'close-focus-mode': {
      ctx.appState.activeModal = null;
      ctx.appState.editData = null;
      ctx.render();
      return true;
    }

    default: return false;
  }
}

export async function handleSaveModal(type, ctx) {
  const { State, showToast, showActionToast, uid, appState, render, fmt,
    clearFieldErrors, validateRequired, validateAmount, showFieldError,
    computeRiskScore,
  } = ctx;
  const editData = appState.editData;

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
        await addXP(10, ctx);
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
        await addXP(25, ctx);
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
      await addXP(15, ctx);
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

export async function addXP(n, ctx) {
  const { State } = ctx;
  const s = State.getState().settings;
  const newXP = s.xp + n;
  const newLevel = Math.floor(newXP / 500) + 1;
  await State.updateSettings({ xp: newXP, level: newLevel });
}
