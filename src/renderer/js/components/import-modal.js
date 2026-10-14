// Import review uses the exact normalization contract used by insertion.
import { icon } from '../icons.js';
import { h, fmt } from '../helpers.js';
import { normalizeImportRow, MAX_IMPORT_BATCH } from '../utils/transaction-import.js';

const COLUMN_ROLES = [
  { value: '', label: '-- Skip --' },
  { value: 'date', label: 'Date' },
  { value: 'description', label: 'Description' },
  { value: 'extraDescription', label: 'Additional description' },
  { value: 'amount', label: 'Amount' },
  { value: 'debit', label: 'Debit' },
  { value: 'credit', label: 'Credit' },
  { value: 'category', label: 'Category' },
];

function previewRow(row, mapping, index, duplicates, options) {
  const parsed = normalizeImportRow(row, mapping, { ...options, aiCategory: options.aiCategories?.[index] });
  return { ...parsed, row: index + 1, status: parsed.error ? 'error' : duplicates?.[index] ? 'duplicate' : 'ready' };
}

export function computeStats(rows, mapping, duplicates, options = {}) {
  let importable = 0, duplicateCount = 0, errorCount = 0;
  rows.forEach((row, index) => {
    const parsed = previewRow(row, mapping, index, duplicates, options);
    if (parsed.status === 'error') errorCount++;
    else if (parsed.status === 'duplicate') duplicateCount++;
    else importable++;
  });
  return { importable, duplicateCount, errorCount };
}

export function renderImportModal(data) {
  if (!data) return '';
  const { headers, rows, mapping, filePath, fileType, duplicates, useAI, aiLoading, processing,
    detectedBank, checkingDuplicates, validationError, importError } = data;
  const options = { dateFormat: data.dateFormat, aiCategories: useAI ? data.aiCategories : null };
  const parsedRows = rows.map((row, index) => previewRow(row, mapping, index, duplicates, options));
  const stats = computeStats(rows, mapping, duplicates, options);
  const invalidRows = parsedRows.filter(row => row.error);
  const busy = checkingDuplicates || aiLoading;
  const tooMany = stats.importable > MAX_IMPORT_BATCH;
  const disabled = processing ? 'disabled' : '';
  const filename = filePath ? filePath.split(/[\\/]/).pop() : 'Unknown file';

  return `<div class="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="import-modal-title" data-action="close-import-modal">
    <div class="import-modal" tabindex="-1" aria-busy="${processing || busy ? 'true' : 'false'}">
      <div class="modal-head">
        <div>
          <div class="modal-title" id="import-modal-title">${icon('upload', 18)} Review your transactions</div>
          <div class="import-help">Check the dates, amounts and categories before saving.</div>
        </div>
        <button class="edit-btn" aria-label="Close import review" data-action="close-import-modal" ${disabled}>${icon('x', 18)}</button>
      </div>
      <div class="import-file-info">
        <span>${icon('file-text', 14)} ${h(filename)}</span>
        <span>${rows.length} rows</span>
        <span class="import-badge">${h(String(fileType || 'csv').toUpperCase())}</span>
      </div>
      ${detectedBank ? `<div class="import-bank-info">${icon('check', 14)} ${h(detectedBank.name)} columns detected. Check the mapping below.</div>` : ''}

      <div class="import-section-title">Column mapping</div>
      <div class="import-mapping-row">
        ${headers.map((header, index) => {
          const currentRole = Object.keys(mapping).find(role => mapping[role] === header) || '';
          return `<div class="import-mapping-col">
            <label class="import-col-name" for="import-column-${index}" title="${h(header)}">${h(header)}</label>
            <select id="import-column-${index}" class="import-mapping-select" data-col-header="${h(header)}" ${disabled}>
              ${COLUMN_ROLES.map(role => `<option value="${role.value}" ${role.value === currentRole ? 'selected' : ''}>${role.label}</option>`).join('')}
            </select>
          </div>`;
        }).join('')}
      </div>
      <div class="import-date-format">
        <label for="import-date-format">Numeric date order</label>
        <select id="import-date-format" class="import-mapping-select" data-action="import-date-format" ${disabled}>
          <option value="MM/DD/YYYY" ${data.dateFormat !== 'DD/MM/YYYY' ? 'selected' : ''}>Month / day / year (10/14/2026)</option>
          <option value="DD/MM/YYYY" ${data.dateFormat === 'DD/MM/YYYY' ? 'selected' : ''}>Day / month / year (14/10/2026)</option>
        </select>
        <div class="import-help">Year-first dates such as 2026-10-14 keep their order.</div>
      </div>

      <div class="import-section-title">Preview · first ${Math.min(rows.length, 8)} rows</div>
      <div class="import-table-wrap">
        <table class="import-table" aria-label="Transaction import preview">
          <thead><tr><th scope="col">Row</th><th scope="col">Date</th><th scope="col">Description</th><th scope="col">Amount</th><th scope="col">Category</th><th scope="col">Status</th></tr></thead>
          <tbody>
            ${parsedRows.slice(0, 8).map(row => `<tr class="${row.status === 'duplicate' ? 'import-row-dup' : row.status === 'error' ? 'import-row-err' : ''}">
              <td>${row.row}</td>
              <td>${h(row.date || '—')}</td>
              <td class="import-description" title="${h(row.description)}">${h(row.description || '—')}</td>
              <td class="import-amount">${row.amount !== null ? fmt(row.amount) : '—'}</td>
              <td><span class="import-cat-pill">${h(row.category)}</span></td>
              <td class="import-row-status">${row.error ? h(row.error) : row.status === 'duplicate' ? 'Duplicate · skip' : busy ? 'Checking…' : validationError ? 'Check failed' : 'Ready'}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <div class="import-summary" role="status" aria-live="polite">
        ${busy ? `<div class="import-stat"><span class="import-ai-spinner"></span> Checking transactions…</div>` : ''}
        ${!busy && !validationError ? `<div class="import-stat import-stat-ok">${icon('check', 14)} ${stats.importable} ${tooMany ? 'valid rows' : 'ready to import'}</div>` : ''}
        ${stats.duplicateCount ? `<div class="import-stat import-stat-warn">${stats.duplicateCount} duplicates · will skip</div>` : ''}
        ${stats.errorCount ? `<div class="import-stat import-stat-err">${stats.errorCount} invalid rows · will skip</div>` : ''}
        ${tooMany ? '<div class="import-stat import-stat-err">Import up to 10,000 transactions at a time. Split this file into smaller statements.</div>' : ''}
        ${!mapping.date ? '<div class="import-stat import-stat-err">Map a date column</div>' : ''}
        ${!mapping.amount && !mapping.debit && !mapping.credit ? '<div class="import-stat import-stat-err">Map an amount, debit or credit column</div>' : ''}
      </div>
      ${invalidRows.length ? `<details class="import-issues"><summary>Review ${invalidRows.length} invalid rows</summary><ul>
        ${invalidRows.slice(0, 50).map(row => `<li>Row ${row.row}: ${h(row.error)}</li>`).join('')}
        ${invalidRows.length > 50 ? `<li>${invalidRows.length - 50} more invalid rows. Correct the source file before importing.</li>` : ''}
      </ul></details>` : ''}
      ${validationError ? `<div class="import-error" role="alert">${h(validationError)} <button class="btn btn-secondary" data-action="retry-import-validation">Retry check</button></div>` : ''}
      ${importError ? `<div class="import-error" role="alert">${h(importError)}</div>` : ''}
      <div class="import-options">
        <label class="import-option-label">
          <input id="import-ai" type="checkbox" ${useAI ? 'checked' : ''} ${!data.hasAiKey || processing ? 'disabled' : ''} data-action="import-toggle-ai">
          ${icon('lightbulb', 14)} AI categorization ${!data.hasAiKey ? '<span class="import-help">(add an API key in Settings)</span>' : ''}
        </label>
        <div class="import-help">Transactions update spending automatically. Manage debt balances, savings goals and registered contributions in their own pages.</div>
      </div>
      <div class="import-actions">
        <button class="btn btn-secondary" data-action="close-import-modal" ${disabled}>Cancel</button>
        <button class="btn btn-primary" data-action="confirm-import" ${stats.importable === 0 || tooMany || busy || processing || validationError ? 'disabled' : ''}>
          ${processing ? '<span class="import-ai-spinner"></span> Saving…' : `${icon('download', 15)} Import ${stats.importable} transactions`}
        </button>
      </div>
    </div>
  </div>`;
}
