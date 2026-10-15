// WealthFlow - Plan action handlers (reports, export/import, tax, planning)
// Includes the transaction-import review and validation lifecycle.
//
// SECURITY NOTE: This file uses .innerHTML with trusted render functions from the app's
// own component system. All user-provided text is escaped via the h() helper before
// being interpolated into HTML strings. This pattern is inherited from the original
// app.js code and is consistent throughout the codebase.

import { exportJSON, exportCSV, importFile, importJSONBackup, applyImport, applyHoldingsImport, checkDuplicates, aiCategorizeImport, saveImportHistory, exportPDF, reconcileAfterImport } from '../utils/export-import.js';
import { exportToQIF } from '../utils/qif-export.js';
import { renderImportModal, computeStats } from '../components/import-modal.js';
import { BANK_PRESETS } from '../utils/bank-presets.js';
import { MAX_IMPORT_BATCH } from '../utils/transaction-import.js';
import { runAffordabilityCheck } from '../pages/planning.js';

function redrawImport(data, ctx) {
  if (ctx.appState.importModalData !== data) return;
  const root = document.getElementById('modal-root');
  if (!root) return;
  const focusId = document.activeElement?.id;
  const scrollTop = root.querySelector?.('.import-modal')?.scrollTop || 0;
  root.innerHTML = renderImportModal(data);
  const modal = root.querySelector?.('.import-modal');
  if (modal) modal.scrollTop = scrollTop;
  const control = focusId ? document.getElementById(focusId) : null;
  if (control && !control.disabled) control.focus();
  else if (modal && !modal.contains(document.activeElement)) modal.focus();
}

async function refreshImportValidation(data, ctx) {
  if (ctx.appState.importModalData !== data || data.processing) return;
  const revision = (data.validationRevision || 0) + 1;
  data.validationRevision = revision;
  const mapping = { ...data.mapping };
  const options = { dateFormat: data.dateFormat };
  const useAI = data.useAI;
  data.checkingDuplicates = true;
  data.aiLoading = useAI;
  data.validationError = null;
  data.importError = null;
  data.duplicates = null;
  data.aiCategories = null;
  redrawImport(data, ctx);

  const [duplicateResult, aiResult] = await Promise.allSettled([
    checkDuplicates(data.rows, mapping, options),
    useAI ? aiCategorizeImport(data.rows, mapping, { ...options,
      isCurrent: () => ctx.appState.importModalData === data && data.validationRevision === revision,
    }) : Promise.resolve(null),
  ]);
  // A canceled dialog, a new file or a newer mapping owns its own results.
  if (ctx.appState.importModalData !== data || data.validationRevision !== revision) return;
  data.checkingDuplicates = false;
  data.aiLoading = false;
  if (duplicateResult.status === 'fulfilled') data.duplicates = duplicateResult.value;
  else data.validationError = 'Could not check duplicates. ' + (duplicateResult.reason?.message || 'Please retry.');
  if (aiResult.status === 'fulfilled') data.aiCategories = aiResult.value;
  else {
    data.useAI = false;
    ctx.showToast('AI categorization unavailable. Using local categories.', 'info');
  }
  redrawImport(data, ctx);
}

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

    case 'import-json-backup': {
      if (!confirm('Restoring a backup replaces the financial data on this computer. Export a backup of the current computer first if you may need it. Continue?')) return true;
      try {
        const result = await importJSONBackup();
        if (!result) return true;
        showToast('Backup restored. Reloading WealthFlow…', 'success');
        location.reload();
      } catch (err) {
        showToast('Backup restore failed: ' + (err?.message || 'Please try again.'), 'error');
      }
      return true;
    }

    case 'import-csv': {
      let fileData;
      try { fileData = await importFile(); }
      catch (error) {
        showToast('Could not open statement. ' + (error?.message || 'Please try again.'), 'error');
        return true;
      }
      if (fileData) {
        // Check if this is a holdings/portfolio import (not transactions)
        if (fileData.detectedBank?.key) {
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
        const data = {
          ...fileData,
          duplicates: null,
          checkingDuplicates: true,
          errors: [],
          useAI: false,
          aiLoading: false,
          aiCategories: null,
          processing: false,
        };
        appState.importModalData = data;
        await render();
        await refreshImportValidation(data, ctx);
      }
      return true;
    }

    case 'close-import-modal':
      if (appState.importModalData?.processing) return true;
      appState.importModalData = null;
      await render();
      document.querySelector?.('[data-action="import-csv"]')?.focus();
      return true;

    case 'retry-import-validation':
      if (appState.importModalData) await refreshImportValidation(appState.importModalData, ctx);
      return true;

    case 'confirm-import': {
      const data = appState.importModalData;
      if (!data || data.processing || data.checkingDuplicates || data.aiLoading || data.validationError) return true;
      const options = { dateFormat: data.dateFormat };
      const { importable } = computeStats(data.rows, data.mapping, data.duplicates, options);
      if (!importable || importable > MAX_IMPORT_BATCH) return true;
      data.processing = true;
      data.importError = null;
      redrawImport(data, ctx);

      let result;
      try {
        // Recheck against the ledger immediately before the atomic batch write.
        const duplicates = await checkDuplicates(data.rows, data.mapping, options);
        result = await applyImport(data.rows, data.mapping, duplicates,
          data.useAI ? data.aiCategories : null, options);
      } catch (error) {
        data.processing = false;
        data.importError = 'Transactions were not saved. ' + (error?.message || 'Please retry.');
        redrawImport(data, ctx);
        return true;
      }

      // Transaction insertion has succeeded. Failures in secondary bookkeeping
      // must never turn a committed import into another insertion attempt.
      const warnings = [];
      try { await saveImportHistory(data.filePath, data.fileType, data.rows.length, result); }
      catch { warnings.push('Import history could not be saved.'); }
      await reconcileAfterImport();
      try { await State.loadAll(); }
      catch { warnings.push('Some views could not refresh; reload the app to refresh them.'); }
      try {
        const refresh = await State.refreshCommandCenterIntelligence('financial_data_changed');
        if (refresh?.errors?.length) warnings.push('Some recommendations could not refresh.');
      }
      catch { warnings.push('Recommendations could not refresh.'); }

      let message = `Imported ${result.imported} transactions`;
      if (result.duplicateCount) message += `, ${result.duplicateCount} duplicates skipped`;
      if (result.errorCount) message += `, ${result.errorCount} invalid rows skipped`;
      if (warnings.length) message += '. ' + warnings.join(' ');
      if (appState.importModalData === data) appState.importModalData = null;
      const modalRoot = document.getElementById('modal-root');
      if (modalRoot && !appState.importModalData) modalRoot.innerHTML = '';
      showToast(message, warnings.length ? 'info' : 'success');
      try { await render(); }
      catch { showToast('Transactions saved. Reload the app to refresh the view.', 'info'); }
      document.querySelector?.('[data-action="import-csv"]')?.focus();
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
    // Checkbox/select input events also precede change events. Let the
    // change handler use checked (not the checkbox's default value "on").
    if (e.target.type === 'checkbox' || e.target.tagName === 'SELECT') return true;
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
  const { State, appState, getSection,
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
        // Keep keyboard focus on the same control when conditional inputs
        // appear. Numeric input focus is handled by debouncedPageRender.
        const control = Array.from(page.querySelectorAll('.tax-input')).find(input => input.dataset.field === field);
        control?.focus();
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
  // Each import change invalidates both duplicate and AI results. Only the
  // latest revision may update the active review.
  const data = appState.importModalData;
  if (e.target.dataset.action === 'import-toggle-ai') {
    if (!data || data.processing) return true;
    data.useAI = e.target.checked && data.hasAiKey;
    await refreshImportValidation(data, ctx);
    return true;
  }
  if (e.target.dataset.action === 'import-date-format') {
    if (!data || data.processing) return true;
    if (!['MM/DD/YYYY', 'DD/MM/YYYY'].includes(e.target.value)) return true;
    data.dateFormat = e.target.value;
    await refreshImportValidation(data, ctx);
    return true;
  }
  if (e.target.classList.contains('import-mapping-select')) {
    if (!data || data.processing) return true;
    const header = e.target.dataset.colHeader;
    const role = e.target.value;
    for (const key of Object.keys(data.mapping)) {
      if (data.mapping[key] === header) data.mapping[key] = null;
    }
    if (role) {
      data.mapping[role] = header;
      if (role === 'amount') { data.mapping.debit = null; data.mapping.credit = null; }
      if (role === 'debit' || role === 'credit') data.mapping.amount = null;
    }
    await refreshImportValidation(data, ctx);
    return true;
  }

  return false;
}
