// Import Preview Modal for WealthFlow
import { icon } from '../icons.js';
import { h, fmt } from '../helpers.js';
import { autoCategorize } from '../utils/csv-parser.js';

const COLUMN_ROLES = [
  { value: '', label: '-- Skip --' },
  { value: 'date', label: 'Date' },
  { value: 'description', label: 'Description' },
  { value: 'amount', label: 'Amount' },
  { value: 'debit', label: 'Debit' },
  { value: 'credit', label: 'Credit' },
  { value: 'balance', label: 'Balance (skip)' },
  { value: 'category', label: 'Category' },
];

export function renderImportModal(data) {
  if (!data) return '';

  const { headers, rows, mapping, filePath, fileType, duplicates, errors, useAI, aiLoading, processing, detectedBank } = data;
  const filename = filePath ? filePath.split(/[\\/]/).pop() : 'Unknown file';

  // Build preview rows (first 8)
  const previewRows = rows.slice(0, 8);
  const mappedPreview = previewRows.map((row, i) => buildPreviewRow(row, mapping, i, duplicates));

  // Count importable rows
  const stats = computeStats(rows, mapping, duplicates, errors);

  return `<div class="modal-overlay" data-action="close-import-modal">
    <div class="import-modal" onclick="event.stopPropagation()">
      <div class="modal-head">
        <div class="modal-title">${icon('upload', 18)} Import Transactions</div>
        <button style="background:none;border:none;color:var(--sub);cursor:pointer" data-action="close-import-modal">${icon('x', 18)}</button>
      </div>

      <!-- File Info -->
      <div class="import-file-info">
        <span>${icon('file-text', 14)} ${h(filename)}</span>
        <span>${rows.length} rows</span>
        <span class="import-badge">${fileType.toUpperCase()}</span>
      </div>

      ${detectedBank ? `
      <!-- Detected Bank Banner -->
      <div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.2);border-radius:8px;margin-bottom:4px">
        <span style="color:var(--green)">${icon('check', 14)}</span>
        <span style="font-size:12px;font-weight:600;color:var(--green)">Detected: ${h(detectedBank.name)}. Columns auto-mapped.</span>
      </div>` : ''}

      <!-- Column Mapping -->
      <div class="import-section-title">Column Mapping</div>
      <div class="import-mapping-row">
        ${headers.map((hdr, i) => {
          const currentRole = getMappedRole(hdr, mapping);
          return `<div class="import-mapping-col">
            <div class="import-col-name" title="${h(hdr)}">${h(hdr.length > 12 ? hdr.slice(0, 12) + '...' : hdr)}</div>
            <select class="import-mapping-select" data-action="import-map-column" data-col-index="${i}" data-col-header="${h(hdr)}">
              ${COLUMN_ROLES.map(r => `<option value="${r.value}" ${r.value === currentRole ? 'selected' : ''}>${r.label}</option>`).join('')}
            </select>
          </div>`;
        }).join('')}
      </div>

      <!-- Preview Table -->
      <div class="import-section-title">Preview</div>
      <div class="import-table-wrap">
        <table class="import-table">
          <thead>
            <tr>
              <th style="width:28px"></th>
              <th>Date</th>
              <th>Description</th>
              <th style="text-align:right">Amount</th>
              <th>Category</th>
            </tr>
          </thead>
          <tbody>
            ${mappedPreview.map(p => `
              <tr class="${p.status === 'duplicate' ? 'import-row-dup' : p.status === 'error' ? 'import-row-err' : ''}">
                <td>${p.status === 'duplicate' ? '<span title="Duplicate" style="color:#f59e0b">!</span>' : p.status === 'error' ? '<span title="Error" style="color:var(--red, #ef4444)">x</span>' : '<span style="color:var(--green, #10b981)">&check;</span>'}</td>
                <td>${h(p.date || '—')}</td>
                <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${h(p.description)}">${h(p.description || '—')}</td>
                <td style="text-align:right;${p.amount > 0 ? 'color:var(--green, #10b981)' : ''}">${p.amount !== null ? fmt(p.amount) : '—'}</td>
                <td><span class="import-cat-pill">${h(p.category)}</span></td>
              </tr>
            `).join('')}
            ${rows.length > 8 ? `<tr><td colspan="5" style="text-align:center;color:var(--sub);font-size:12px">... and ${rows.length - 8} more rows</td></tr>` : ''}
          </tbody>
        </table>
      </div>

      <!-- Validation Summary -->
      <div class="import-summary">
        ${stats.importable > 0 ? `<div class="import-stat import-stat-ok">${icon('check', 14)} ${stats.importable} ready to import</div>` : ''}
        ${stats.duplicateCount > 0 ? `<div class="import-stat import-stat-warn">${icon('alert-triangle', 14)} ${stats.duplicateCount} duplicates (will skip)</div>` : ''}
        ${stats.errorCount > 0 ? `<div class="import-stat import-stat-err">${icon('x', 14)} ${stats.errorCount} invalid rows (will skip)</div>` : ''}
        ${!mapping.date ? '<div class="import-stat import-stat-err">No date column mapped</div>' : ''}
        ${!mapping.amount && !mapping.debit ? '<div class="import-stat import-stat-err">No amount/debit column mapped</div>' : ''}
      </div>

      <!-- Options -->
      <div class="import-options">
        <label class="import-option-label" title="${data.hasAiKey ? 'Use Claude AI to categorize transactions that can\'t be auto-detected' : 'Configure AI API key in Settings first'}">
          <input type="checkbox" ${useAI ? 'checked' : ''} ${!data.hasAiKey ? 'disabled' : ''} data-action="import-toggle-ai">
          ${icon('lightbulb', 14)} AI-enhanced categorization ${!data.hasAiKey ? '<span style="color:var(--sub);font-size:11px">(no API key)</span>' : ''}
          ${aiLoading ? '<span class="import-ai-spinner"></span>' : ''}
        </label>
      </div>

      <!-- Actions -->
      <div class="import-actions">
        <button class="btn btn-secondary" data-action="close-import-modal">Cancel</button>
        <button class="btn btn-primary" data-action="confirm-import" ${stats.importable === 0 || processing ? 'disabled' : ''} style="min-width:180px;justify-content:center">
          ${processing ? '<span class="import-ai-spinner"></span> Importing...' : `${icon('download', 15)} Import ${stats.importable} Transactions`}
        </button>
      </div>
    </div>
  </div>`;
}

function getMappedRole(header, mapping) {
  for (const [role, mappedHeader] of Object.entries(mapping)) {
    if (mappedHeader === header) return role;
  }
  return '';
}

function buildPreviewRow(row, mapping, index, duplicates) {
  const MONTH_ABBR = { jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12 };

  let dateVal = mapping.date ? row[mapping.date] : null;
  let descVal = mapping.description ? row[mapping.description] : '';
  let amount = null;

  if (mapping.amount) {
    amount = parseFloat(String(row[mapping.amount] || '').replace(/[,$]/g, '')) || 0;
  } else if (mapping.debit || mapping.credit) {
    const debit = parseFloat(String((mapping.debit ? row[mapping.debit] : '') || '').replace(/[,$]/g, '')) || 0;
    const credit = parseFloat(String((mapping.credit ? row[mapping.credit] : '') || '').replace(/[,$]/g, '')) || 0;
    amount = credit > 0 ? credit : (debit > 0 ? -debit : 0);
  }

  // Normalize date for display
  if (dateVal) {
    const s = String(dateVal).trim();
    const slash = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (slash) {
      const [, m, d, y] = slash;
      dateVal = `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
    }
  }

  const category = amount > 0 ? 'Income' : autoCategorize(descVal);
  const isDuplicate = duplicates && duplicates[index];
  const hasError = !dateVal || amount === 0 || amount === null;

  return {
    date: dateVal,
    description: descVal,
    amount,
    category,
    status: isDuplicate ? 'duplicate' : hasError ? 'error' : 'ok',
  };
}

function computeStats(rows, mapping, duplicates, errors) {
  let errorCount = 0;
  let duplicateCount = duplicates ? duplicates.filter(Boolean).length : 0;

  for (let i = 0; i < rows.length; i++) {
    if (duplicates && duplicates[i]) continue;

    const row = rows[i];
    const dateVal = mapping.date ? row[mapping.date] : null;
    let amount = 0;

    if (mapping.amount) {
      amount = parseFloat(String(row[mapping.amount] || '').replace(/[,$]/g, '')) || 0;
    } else if (mapping.debit || mapping.credit) {
      const debit = parseFloat(String((mapping.debit ? row[mapping.debit] : '') || '').replace(/[,$]/g, '')) || 0;
      const credit = parseFloat(String((mapping.credit ? row[mapping.credit] : '') || '').replace(/[,$]/g, '')) || 0;
      amount = credit > 0 ? credit : (debit > 0 ? -debit : 0);
    }

    if (!dateVal || amount === 0) errorCount++;
  }

  const importable = rows.length - duplicateCount - errorCount;
  return { importable: Math.max(0, importable), duplicateCount, errorCount };
}

// Re-export for use in import flow
export { computeStats };
