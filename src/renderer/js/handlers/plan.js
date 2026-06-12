// WealthFlow - Plan action handlers (reports, export/import, tax, planning)
// Extracted from app.js — pure refactor, no behavior changes
//
// SECURITY NOTE: This file uses .innerHTML with trusted render functions from the app's
// own component system. All user-provided text is escaped via the h() helper before
// being interpolated into HTML strings. This pattern is inherited from the original
// app.js code and is consistent throughout the codebase.

import { exportJSON, exportCSV, importFile, applyImport, applyHoldingsImport, checkDuplicates, aiCategorizeImport, saveImportHistory, exportPDF, reconcileAfterImport } from '../utils/export-import.js';
import { exportToQIF } from '../utils/qif-export.js';
import { renderImportModal } from '../components/import-modal.js';
import { runAffordabilityCheck } from '../pages/planning.js';

export async function handlePlanAction(action, btn, ctx) {
  const { State, render, showToast, appState } = ctx;

  switch (action) {
    case 'run-affordability-check': {
      const financials = await State.computeFinancials();
      const result = runAffordabilityCheck(State.getState(), financials);
      appState.activeWorkflowResult = result;
      showToast('Affordability checked', 'success');
      render();
      return true;
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
      return true;
    }

    case 'export-json':
      await exportJSON();
      showToast('Data exported as JSON');
      return true;

    case 'export-csv':
      await exportCSV();
      showToast('Transactions exported as CSV');
      return true;

    case 'export-qif': {
      const qifStr = exportToQIF(State.getState().transactions);
      const result = await window.wealthflow.showSaveDialog({ defaultPath: 'wealthflow.qif', filters: [{ name: 'QIF', extensions: ['qif'] }] });
      if (!result.canceled && result.filePath) {
        await window.wealthflow.writeFile(result.filePath, qifStr);
        showToast('QIF exported', 'success');
      }
      return true;
    }

    case 'export-pdf': {
      const pdfF = await State.computeFinancials();
      await exportPDF(State.getState(), pdfF);
      showToast('PDF report exported');
      return true;
    }

    case 'import-csv': {
      const fileData = await importFile();
      if (fileData) {
        // Check if this is a holdings/portfolio import (not transactions)
        if (fileData.detectedBank?.key) {
          const { BANK_PRESETS } = await import('../utils/bank-presets.js');
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
            return true;
          }
        }

        // Standard transaction import
        const duplicates = await checkDuplicates(fileData.rows, fileData.mapping);
        appState.importModalData = {
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
      return true;
    }

    case 'close-import-modal':
      appState.importModalData = null;
      render();
      return true;

    case 'confirm-import': {
      if (!appState.importModalData || appState.importModalData.processing) return true;
      appState.importModalData.processing = true;
      const modalRoot = document.getElementById('modal-root');
      if (modalRoot) {
        // Trusted render function — all content is escaped
        modalRoot.innerHTML = renderImportModal(appState.importModalData);
      }

      const aiCats = appState.importModalData.useAI ? appState.importModalData.aiCategories : null;
      const result = await applyImport(
        appState.importModalData.rows,
        appState.importModalData.mapping,
        appState.importModalData.duplicates,
        aiCats
      );

      // Save import history
      await saveImportHistory(
        appState.importModalData.filePath,
        appState.importModalData.fileType,
        appState.importModalData.rows.length,
        result
      );

      // Reconcile: update debts, goals, contributions from imported data
      const reconciled = await reconcileAfterImport(
        result.transactions || [],
        appState.importModalData.detectedBank
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

      appState.importModalData = null;
      showToast(msg);
      render();
      return true;
    }

    default: return false;
  }
}

export function handlePlanInput(e, ctx) {
  const { updateTaxInput, updatePlanInput, debouncedPageRender,
    renderTaxCalculator, renderPlanning,
  } = ctx;

  // Tax calculator
  if (e.target.classList.contains('tax-input')) {
    const field = e.target.dataset.field;
    if (field) {
      updateTaxInput(field, e.target.value);
      debouncedPageRender('tax-calc', (s) => renderTaxCalculator(s));
    }
    return true;
  }
  // Planning page
  if (e.target.classList.contains('plan-input')) {
    const field = e.target.dataset.field;
    if (field) {
      updatePlanInput(field, e.target.value);
      debouncedPageRender('planning', (s) => renderPlanning(s));
    }
    return true;
  }

  return false;
}

export async function handlePlanChange(e, ctx) {
  const { State, appState, getSection, showToast,
    updateTaxInput, updatePlanInput,
    renderTaxCalculator, renderPlanning,
  } = ctx;

  // Tax calculator province / selects / checkboxes
  if (e.target.classList.contains('tax-input') && (e.target.tagName === 'SELECT' || e.target.type === 'checkbox')) {
    const field = e.target.dataset.field;
    if (field) {
      const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
      updateTaxInput(field, val);
      const page = document.getElementById('page');
      if (page && getSection() === 'tax-calc') {
        // Trusted render function — all content is escaped
        page.innerHTML = renderTaxCalculator(State.getState());
      }
    }
    return true;
  }
  // Planning page selects (mortgage frequency)
  if (e.target.classList.contains('plan-input') && e.target.tagName === 'SELECT') {
    const field = e.target.dataset.field;
    if (field) {
      updatePlanInput(field, e.target.value);
      const page = document.getElementById('page');
      if (page && getSection() === 'planning') {
        // Trusted render function — all content is escaped
        page.innerHTML = renderPlanning(State.getState());
      }
    }
    return true;
  }
  // Import AI toggle checkbox
  if (e.target.dataset.action === 'import-toggle-ai') {
    if (!appState.importModalData) return false;
    appState.importModalData.useAI = e.target.checked;
    if (appState.importModalData.useAI && !appState.importModalData.aiCategories) {
      appState.importModalData.aiLoading = true;
      const mr = document.getElementById('modal-root');
      if (mr) {
        // Trusted render function — all content is escaped
        mr.innerHTML = renderImportModal(appState.importModalData);
      }
      aiCategorizeImport(appState.importModalData.rows, appState.importModalData.mapping).then(cats => {
        appState.importModalData.aiCategories = cats;
        appState.importModalData.aiLoading = false;
        const mr2 = document.getElementById('modal-root');
        if (mr2 && appState.importModalData) {
          // Trusted render function — all content is escaped
          mr2.innerHTML = renderImportModal(appState.importModalData);
        }
      }).catch(() => {
        appState.importModalData.useAI = false;
        appState.importModalData.aiLoading = false;
        showToast('AI categorization failed');
        const mr2 = document.getElementById('modal-root');
        if (mr2 && appState.importModalData) {
          // Trusted render function — all content is escaped
          mr2.innerHTML = renderImportModal(appState.importModalData);
        }
      });
    }
    return true;
  }
  // Import column mapping select
  if (e.target.classList.contains('import-mapping-select')) {
    if (!appState.importModalData) return false;
    const colHeader = e.target.dataset.colHeader;
    const newRole = e.target.value;
    // Remove this header from any existing mapping
    for (const key of Object.keys(appState.importModalData.mapping)) {
      if (appState.importModalData.mapping[key] === colHeader) {
        appState.importModalData.mapping[key] = null;
      }
    }
    // Assign new role
    if (newRole && newRole !== '') {
      appState.importModalData.mapping[newRole] = colHeader;
    }
    // Re-check duplicates with new mapping
    checkDuplicates(appState.importModalData.rows, appState.importModalData.mapping).then(dupes => {
      appState.importModalData.duplicates = dupes;
      const modalRoot = document.getElementById('modal-root');
      if (modalRoot && appState.importModalData) {
        // Trusted render function — all content is escaped
        modalRoot.innerHTML = renderImportModal(appState.importModalData);
      }
    });
    return true;
  }

  return false;
}
