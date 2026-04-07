// WealthFlow - Home/wizard action handlers (settings, advisor wizard)
// Extracted from app.js — pure refactor, no behavior changes
// Security note: all innerHTML assignments use trusted render functions that sanitize via h() helper

import { computeRiskScore, DOCUMENT_TYPES } from '../canadian/advisor-constants.js';
import { addXP } from './shared.js';

export async function handleHomeAction(action, btn, ctx) {
  const { State, render, showToast, uid, appState, navigate,
    setWizardStep, getWizardStep, updateWizardDraft, getWizardDraft,
  } = ctx;

  switch (action) {
    case 'save-ai-key': {
      const keyInput = document.getElementById('ai-key-input');
      const key = keyInput?.value?.trim();
      if (!key) { showToast('Please enter an API key', 'error'); return true; }
      await State.updateSettings({ ai_api_key: key });
      showToast('API key saved');
      render();
      return true;
    }

    case 'reload-knowledge': {
      await window.wealthflow.reloadKnowledgeBase();
      showToast('Knowledge base reloaded');
      return true;
    }

    case 'reset-all': {
      if (confirm('Are you sure? This will delete all your data.')) {
        await State.updateSettings({
          user_name: '', dark_mode: true, onboarded: false, level: 1, xp: 0, province: 'ON'
        });
        location.reload();
      }
      return true;
    }

    case 'nav-to-advisor':
      navigate('advisor');
      return true;

    case 'edit-residence': {
      appState.activeModal = 'residence';
      appState.editData = State.getState().residence || {};
      render();
      return true;
    }

    case 'wizard-goto-step': {
      const step = parseInt(btn.dataset.step);
      if (!isNaN(step)) {
        setWizardStep(step);
        await State.updateSettings({ last_wizard_step: step });
        render();
      }
      return true;
    }

    case 'wizard-next': {
      const next = getWizardStep() + 1;
      if (next < 8) {
        setWizardStep(next);
        await State.updateSettings({ last_wizard_step: next });
        render();
      }
      return true;
    }

    case 'wizard-prev': {
      const prev = getWizardStep() - 1;
      if (prev >= 0) {
        setWizardStep(prev);
        await State.updateSettings({ last_wizard_step: prev });
        render();
      }
      return true;
    }

    case 'wizard-skip': {
      const skipNext = getWizardStep() + 1;
      if (skipNext < 8) {
        setWizardStep(skipNext);
        await State.updateSettings({ last_wizard_step: skipNext });
        render();
      }
      return true;
    }

    case 'wizard-save-step': {
      await saveCurrentWizardStep(ctx);
      const nextStep = getWizardStep() + 1;
      if (nextStep < 8) {
        setWizardStep(nextStep);
        await State.updateSettings({ last_wizard_step: nextStep });
      }
      showToast('Progress saved');
      render();
      return true;
    }

    case 'wizard-toggle-goal': {
      const goalCode = btn.dataset.goal;
      const profile = State.getState().advisorProfile;
      if (!profile) return true;
      const existing = profile.goals.find(g => g.goal_type === goalCode);
      if (existing) {
        await State.deleteAdvisorGoal(existing.id);
      } else {
        await State.upsertAdvisorGoal({ id: uid(), goal_type: goalCode, priority: profile.goals.length });
      }
      render();
      return true;
    }

    case 'wizard-add-asset': {
      const assetType = prompt('Asset type (chequing, savings, hisa, gic, vehicle, other):');
      if (!assetType) return true;
      const desc = prompt('Description (e.g. TD Chequing):');
      const bal = prompt('Current balance ($):');
      await State.addAdvisorAsset({
        id: uid(), asset_type: assetType.toLowerCase(),
        description: desc || '', balance: +(bal || 0),
      });
      showToast('Asset added');
      render();
      return true;
    }

    case 'wizard-delete-asset':
      if (confirm('Remove this asset?')) {
        await State.deleteAdvisorAsset(btn.dataset.id);
        showToast('Asset removed');
        render();
      }
      return true;

    case 'wizard-upload-doc': {
      const result = await window.wealthflow.showOpenDialog({
        properties: ['openFile'],
        filters: [
          { name: 'Documents', extensions: ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx', 'xls', 'xlsx'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      });
      if (result.canceled || !result.filePaths.length) return true;
      const srcPath = result.filePaths[0];
      const originalName = srcPath.split(/[\\/]/).pop();
      const ext = originalName.includes('.') ? '.' + originalName.split('.').pop() : '';
      const destFilename = uid() + ext;
      await State.copyDocumentFile(srcPath, destFilename);
      const docType = prompt(`Document type? (${DOCUMENT_TYPES.map(d => d.code).join(', ')}):`) || 'other';
      const notes = prompt('Notes (optional):') || '';
      await State.addAdvisorDocument({
        id: uid(), filename: destFilename, original_name: originalName,
        doc_type: docType, notes, file_size: 0,
      });
      showToast('Document uploaded');
      render();
      return true;
    }

    case 'wizard-open-doc':
      await State.openDocumentFile(btn.dataset.filename);
      return true;

    case 'wizard-delete-doc':
      if (confirm('Delete this document?')) {
        await State.deleteAdvisorDocument(btn.dataset.id);
        showToast('Document deleted');
        render();
      }
      return true;

    case 'wizard-complete-profile': {
      await saveCurrentWizardStep(ctx);
      await State.updateSettings({ profile_completed: true });
      await addXP(100, ctx);
      showToast('Profile completed! +100 XP');
      navigate('dashboard');
      return true;
    }

    default: return false;
  }
}

export function handleHomeInput(e, ctx) {
  const { updateWizardDraft } = ctx;

  // Wizard inputs
  if (e.target.classList.contains('wizard-input')) {
    const step = e.target.dataset.step;
    const fld = e.target.dataset.field;
    if (step && fld) {
      updateWizardDraft(step, fld, e.target.value);
    }
    return true;
  }

  return false;
}

export function handleHomeChange(e, ctx) {
  const { State, render, getSection, updateWizardDraft,
    renderAdvisorWizard,
  } = ctx;

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
        // Safe: renderAdvisorWizard returns sanitized component HTML
        if (pg) pg.innerHTML = renderAdvisorWizard(State.getState(), State.getState().advisorProfile);
      }
    }
    return true;
  }

  // Settings inputs
  if (e.target.classList.contains('settings-input')) {
    const field = e.target.dataset.field;
    if (field) {
      const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
      State.updateSettings({ [field]: value });
      if (field === 'dark_mode') render();
    }
    return true;
  }

  return false;
}

export function collectFormData(prefix) {
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

export async function saveCurrentWizardStep(ctx) {
  const { State, getWizardStep } = ctx;
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
