// Export/Import orchestration for WealthFlow
import { uid } from '../helpers.js';
import { parseCSV, generateCSV, autoMapColumns } from './csv-parser.js';
import { parseOFX, isOFX } from './ofx-parser.js';
import { generateMonthlyReportHTML } from './pdf-report.js';
import { detectBank, listBankPresets, BANK_PRESETS, resolveBankMapping } from './bank-presets.js';
import { normalizeImportRow, MAX_IMPORT_BATCH } from './transaction-import.js';
import { resolveHoldingCostBasis } from './holdings-import.js';
import * as State from '../state/core.js';

const api = window.wealthflow;

// ─── Export Functions ────────────────────────────────────────

export async function exportJSON() {
  const result = await api.showSaveDialog({
    title: 'Export WealthFlow Backup',
    defaultPath: `wealthflow-backup-${new Date().toISOString().slice(0, 10)}.json`,
    filters: [{ name: 'JSON Files', extensions: ['json'] }],
  });
  if (result.canceled || !result.filePath) return false;

  const data = await State.exportAllData();
  await api.writeFile(result.filePath, JSON.stringify(data, null, 2));
  return true;
}

export async function exportCSV() {
  const result = await api.showSaveDialog({
    title: 'Export Transactions CSV',
    defaultPath: `wealthflow-transactions-${new Date().toISOString().slice(0, 10)}.csv`,
    filters: [{ name: 'CSV Files', extensions: ['csv'] }],
  });
  if (result.canceled || !result.filePath) return false;

  const state = State.getState();
  const headers = ['date', 'description', 'amount', 'category'];
  const csv = generateCSV(state.transactions, headers);
  await api.writeFile(result.filePath, csv);
  return true;
}

export async function exportPDF(state, F, monthStr) {
  const result = await api.showSaveDialog({
    title: 'Export Monthly Report PDF',
    defaultPath: `wealthflow-report-${monthStr || new Date().toISOString().slice(0, 7)}.pdf`,
    filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
  });
  if (result.canceled || !result.filePath) return false;

  const html = generateMonthlyReportHTML(state, F, monthStr);
  const pdfData = await api.generatePDF(html);
  await api.writeFile(result.filePath, pdfData);
  return true;
}

// ─── Import Functions ────────────────────────────────────────

export async function importFile() {
  const result = await api.showOpenDialog({
    title: 'Import Bank Statement',
    filters: [
      { name: 'All Supported', extensions: ['csv', 'ofx', 'qfx', 'xlsx'] },
      { name: 'CSV Files', extensions: ['csv'] },
      { name: 'Excel Files', extensions: ['xlsx'] },
      { name: 'OFX/QFX Files', extensions: ['ofx', 'qfx'] },
    ],
    properties: ['openFile'],
  });
  if (result.canceled || !result.filePaths || result.filePaths.length === 0) return null;

  const filePath = result.filePaths[0];
  const ext = filePath.split('.').pop().toLowerCase();

  let parsed;
  let fileType;

  if (ext === 'xlsx') {
    parsed = await api.parseXLSX(filePath);
    fileType = 'xlsx';
  } else if (ext === 'ofx' || ext === 'qfx') {
    const content = await api.readFile(filePath);
    parsed = isOFX(content) ? parseOFX(content) : parseCSV(content);
    fileType = ext === 'ofx' || ext === 'qfx' ? 'ofx' : 'csv';
  } else {
    const content = await api.readFile(filePath);
    if (isOFX(content)) {
      parsed = parseOFX(content);
      fileType = 'ofx';
    } else {
      parsed = parseCSV(content);
      fileType = 'csv';
    }
  }

  const { headers, rows } = parsed;
  if (headers.length === 0 || rows.length === 0) throw new Error('This file has no transaction rows to review.');

  const bankKey = fileType === 'csv' || fileType === 'xlsx' ? detectBank(headers) : null;
  const bank = bankKey ? BANK_PRESETS[bankKey] : null;
  const detectedBank = bankKey ? { key: bankKey, name: listBankPresets().find(p => p.key === bankKey).name } : null;
  const mapping = { ...autoMapColumns(headers), ...(bankKey ? resolveBankMapping(bankKey, headers) : {}) };
  const dateFormat = bank?.dateFormat === 'DD/MM/YYYY' ? 'DD/MM/YYYY' : 'MM/DD/YYYY';

  // Check if user has an AI API key
  const settings = State.getState().settings;
  const hasAiKey = !!(settings && settings.hasApiKey);

  return { headers, rows, mapping, filePath, fileType, hasAiKey, detectedBank, dateFormat };
}

// Check for duplicates against existing transactions
export async function checkDuplicates(rows, mapping, options = {}) {
  const validIndices = [];
  const checks = [];
  rows.forEach((row, index) => {
    const parsed = normalizeImportRow(row, mapping, options);
    if (parsed.error) return;
    validIndices.push(index);
    checks.push({ date: parsed.date, amount: parsed.amount, description: parsed.description });
  });
  const duplicates = rows.map(() => false);
  if (checks.length === 0) return duplicates;
  const matches = await State.findDuplicateTransactions(checks);
  validIndices.forEach((index, i) => { duplicates[index] = matches[i] === true; });
  return duplicates;
}

// AI-enhanced categorization for "Other" transactions
export async function aiCategorizeImport(rows, mapping, options = {}) {
  const descriptions = [];
  const indices = [];

  for (let i = 0; i < rows.length; i++) {
    const parsed = normalizeImportRow(rows[i], mapping, options);
    const explicitCategory = mapping.category ? String(rows[i][mapping.category] ?? '').trim() : '';
    if (!parsed.error && !explicitCategory && parsed.category === 'Other') {
      descriptions.push(parsed.description);
      indices.push(i);
    }
  }

  if (descriptions.length === 0) return {};

  // Batch in groups of 50 to stay within token limits
  const aiCategories = {};
  let failed = false;
  for (let batch = 0; batch < descriptions.length; batch += 50) {
    if (options.isCurrent && !options.isCurrent()) return {};
    const batchDescs = descriptions.slice(batch, batch + 50);
    const batchIndices = indices.slice(batch, batch + 50);
    try {
      const results = await State.aiCategorize(batchDescs);
      batchIndices.forEach((idx, j) => {
        if (results[j]) aiCategories[idx] = results[j];
      });
    } catch {
      failed = true;
    }
  }

  if (failed) throw new Error('AI categorization unavailable; use local categories.');

  return aiCategories;
}

// ─── Apply Import (batch insert with validation) ─────────────

export async function applyImport(rows, mapping, duplicates, aiCategories, options = {}) {
  const transactions = [];
  const errors = [];
  let duplicateCount = 0;

  rows.forEach((row, index) => {
    const parsed = normalizeImportRow(row, mapping, { ...options, aiCategory: aiCategories?.[index] });
    if (parsed.error) {
      errors.push({ row: index + 1, reason: parsed.error });
    } else if (duplicates?.[index]) {
      duplicateCount++;
    } else {
      transactions.push({
        id: uid(), date: parsed.date, description: parsed.description,
        amount: parsed.amount, category: parsed.category, icon: 'receipt',
      });
    }
  });

  if (transactions.length > MAX_IMPORT_BATCH) throw new Error('Import up to 10,000 transactions at a time. Split this file into smaller statements.');
  if (transactions.length > 0) await State.addTransactionsBatch(transactions);
  return {
    imported: transactions.length, skipped: errors.length, duplicateCount,
    errorCount: errors.length, errors, transactions,
  };
}

// Save import to history log
export async function saveImportHistory(filePath, fileType, totalRows, result) {
  const filename = filePath ? filePath.split(/[\\/]/).pop() : 'Unknown';
  await State.addImportHistory({
    id: uid(),
    filename,
    file_type: fileType,
    total_rows: totalRows,
    imported_count: result.imported,
    skipped_count: result.skipped,
    duplicate_count: result.duplicateCount,
    error_count: result.errorCount,
  });
}

// ─── Holdings Import (portfolio snapshots, not transactions) ─

export async function applyHoldingsImport(rows, mapping, bankPreset) {
  const state = State.getState();
  let updated = 0;
  let added = 0;
  let skipped = 0;
  const planned = [];

  // Validate and normalize the entire snapshot before writing anything. In
  // particular, never partially import a file then discover a USD basis cannot
  // be converted from the CAD-denominated Book Value column.
  for (const row of rows) {
    const symbol = String(row[mapping.symbol] || '').trim().replace(/"/g, '');
    const name = String(row[mapping.name] || '').trim().replace(/"/g, '');
    if (!symbol) { skipped++; continue; }

    const parseAmount = value => {
      const text = String(value ?? '').replace(/[,"$]/g, '').trim();
      if (!text) return 0;
      const number = Number(text);
      return Number.isFinite(number) ? number : NaN;
    };
    const quantity = parseAmount(row[mapping.quantity]);
    const price = parseAmount(row[mapping.price]);
    const currency = String(row[mapping.priceCurrency] || 'CAD').replace(/"/g, '').trim().toUpperCase();
    const bookValueCad = parseAmount(row[mapping.bookValue]);
    const marketValue = parseAmount(row[mapping.marketValue]);
    const marketValueCurrency = String(row[mapping.marketValueCurrency] || '').replace(/"/g, '').trim().toUpperCase();
    const explicitFx = mapping.exchangeRateToCad ? parseAmount(row[mapping.exchangeRateToCad]) : NaN;
    const accountType = String(row[mapping.accountType] || 'non-registered').replace(/"/g, '').trim().toLowerCase();
    const securityType = String(row[mapping.securityType] || '').replace(/"/g, '').trim();

    if (![quantity, price, bookValueCad].every(Number.isFinite) || quantity < 0 || price < 0 || bookValueCad < 0) {
      throw new Error(`Invalid quantity, market price or Book Value (CAD) for ${symbol}. No holdings were imported.`);
    }

    const acctMap = { rrsp: 'rrsp', tfsa: 'tfsa', resp: 'resp', fhsa: 'fhsa', crypto: 'non-registered', managed: 'rrsp', 'self-directed': 'non-registered' };
    const wfAccountType = acctMap[accountType] || 'non-registered';
    const typeMap = { EXCHANGE_TRADED_FUND: 'etf', STOCK: 'stock', MUTUAL_FUND: 'mutual_fund', BOND: 'bond', CRYPTOCURRENCY: 'crypto' };
    const wfType = typeMap[securityType] || 'stock';

    const existing = state.investments.find(i =>
      i.symbol.replace('.TO', '').toUpperCase() === symbol.replace('.TO', '').toUpperCase()
      && i.account_type === wfAccountType
    );
    if (quantity <= 0) { skipped++; continue; }

    const costBasis = resolveHoldingCostBasis({
      quantity,
      bookValueCad,
      currency,
      exchangeRateToCad: explicitFx,
      existingExchangeRateToCad: existing?.exchange_rate_to_cad,
      price,
      marketValue,
      marketValueCurrency,
    });
    if (costBasis.error) {
      throw new Error(`${symbol}: ${costBasis.error} No holdings were imported.`);
    }

    planned.push({
      symbol, name, quantity, price, currency, accountType: wfAccountType,
      securityType: wfType, existing, avgCost: costBasis.avgCost,
      exchangeRateToCad: costBasis.exchangeRateToCad,
    });
  }

  for (const holding of planned) {
    if (holding.existing) {
      await State.updateInvestment({
        ...holding.existing,
        shares: holding.quantity,
        current_price: holding.price,
        avg_cost: holding.avgCost > 0 ? holding.avgCost : holding.existing.avg_cost,
        currency: holding.currency,
        exchange_rate_to_cad: holding.exchangeRateToCad,
        name: holding.name || holding.existing.name,
      });
      updated++;
    } else {
      await State.addInvestment({
        id: uid(),
        symbol: holding.symbol,
        name: holding.name,
        shares: holding.quantity,
        avg_cost: holding.avgCost,
        current_price: holding.price,
        type: holding.securityType,
        account_type: holding.accountType,
        institution: bankPreset?.name || 'Wealthsimple',
        currency: holding.currency,
        exchange_rate_to_cad: holding.exchangeRateToCad,
      });
      added++;
    }
  }

  return { updated, added, skipped };
}

// ─── Post-Import Reconciliation ──────────────────────────────
// Activity alone does not identify an account balance, a goal deposit or a
// registered contribution. Those records require explicit user entries.
export async function reconcileAfterImport() {
  try {
    await State.snapshotNetWorth();
    return { snapshotUpdated: true };
  } catch {
    return { snapshotUpdated: false };
  }
}

// ─── Legacy compatibility ────────────────────────────────────

export async function importCSV() {
  return importFile();
}

export async function applyCSVImport(rows, mapping) {
  const result = await applyImport(rows, mapping, null, null);
  return result.imported;
}
