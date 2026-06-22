// Export/Import orchestration for WealthFlow
import { uid } from '../helpers.js';
import { parseCSV, generateCSV, autoMapColumns, autoCategorize } from './csv-parser.js';
import { parseOFX, isOFX } from './ofx-parser.js';
import { generateMonthlyReportHTML } from './pdf-report.js';
import { detectBank, listBankPresets } from './bank-presets.js';
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
  if (headers.length === 0 || rows.length === 0) return null;

  // Try to auto-detect bank from CSV headers
  let detectedBank = null;
  let mapping;
  if (fileType === 'csv') {
    const bankKey = detectBank(headers);
    if (bankKey) {
      const bankInfo = listBankPresets().find(p => p.key === bankKey);
      detectedBank = { key: bankKey, name: bankInfo ? bankInfo.name : bankKey };
      // Override mapping with bank preset's known column mapping
      const { BANK_PRESETS } = await import('./bank-presets.js');
      const presetDef = BANK_PRESETS[bankKey];
      if (presetDef && presetDef.mapping) {
        const pm = presetDef.mapping;
        // Resolve each field to actual header name
        const resolve = (field) => {
          if (!field) return null;
          if (Array.isArray(field)) {
            for (const candidate of field) {
              const found = headers.find(hdr => hdr.toLowerCase().trim() === candidate.toLowerCase().trim());
              if (found) return found;
            }
            return null;
          }
          return headers.find(hdr => hdr.toLowerCase().trim() === field.toLowerCase().trim()) || null;
        };
        mapping = {};
        if (pm.date) mapping.date = resolve(pm.date);
        if (pm.description) mapping.description = resolve(pm.description);
        if (pm.amount) mapping.amount = resolve(pm.amount);
        if (pm.debit) mapping.debit = resolve(pm.debit);
        if (pm.credit) mapping.credit = resolve(pm.credit);
      }
    } else {
      mapping = autoMapColumns(headers);
    }
  } else {
    mapping = autoMapColumns(headers);
  }

  // Check if user has an AI API key
  const settings = State.getState().settings;
  const hasAiKey = !!(settings && settings.ai_api_key);

  return { headers, rows, mapping, filePath, fileType, hasAiKey, detectedBank };
}

// Check for duplicates against existing transactions
export async function checkDuplicates(rows, mapping) {
  const checks = [];
  for (const row of rows) {
    const dateVal = mapping.date ? row[mapping.date] : null;
    const descVal = mapping.description ? row[mapping.description] : '';
    let amount = 0;

    if (mapping.amount) {
      amount = parseFloat(String(row[mapping.amount] || '').replace(/[,$]/g, '')) || 0;
    } else if (mapping.debit || mapping.credit) {
      const debit = parseFloat(String((mapping.debit ? row[mapping.debit] : '') || '').replace(/[,$]/g, '')) || 0;
      const credit = parseFloat(String((mapping.credit ? row[mapping.credit] : '') || '').replace(/[,$]/g, '')) || 0;
      amount = credit > 0 ? credit : (debit > 0 ? -debit : 0);
    }

    const date = normalizeDate(dateVal);
    checks.push({ date: date || '', amount, description: descVal });
  }

  return State.findDuplicateTransactions(checks);
}

// AI-enhanced categorization for "Other" transactions
export async function aiCategorizeImport(rows, mapping) {
  const descriptions = [];
  const indices = [];

  for (let i = 0; i < rows.length; i++) {
    const descVal = mapping.description ? rows[i][mapping.description] : '';
    if (descVal && autoCategorize(descVal) === 'Other') {
      descriptions.push(descVal);
      indices.push(i);
    }
  }

  if (descriptions.length === 0) return {};

  // Batch in groups of 50 to stay within token limits
  const aiCategories = {};
  for (let batch = 0; batch < descriptions.length; batch += 50) {
    const batchDescs = descriptions.slice(batch, batch + 50);
    const batchIndices = indices.slice(batch, batch + 50);
    try {
      const results = await State.aiCategorize(batchDescs);
      batchIndices.forEach((idx, j) => {
        if (results[j]) aiCategories[idx] = results[j];
      });
    } catch {
      // AI categorization failed silently — fall back to keyword matching
    }
  }

  return aiCategories;
}

// ─── Date Normalization ────────────────────────────────────────

const MONTH_ABBR = { jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12 };

function normalizeDate(raw) {
  if (!raw) return null;
  const s = String(raw).trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (/^\d{4}\/\d{2}\/\d{2}$/.test(s)) return s.replace(/\//g, '-');

  const slash = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slash) {
    const [, m, d, y] = slash;
    return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
  }

  const dash = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dash) {
    const [, m, d, y] = dash;
    return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
  }

  const monDash = s.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
  if (monDash) {
    const [, d, mon, y] = monDash;
    const m = MONTH_ABBR[mon.toLowerCase()];
    if (m) return `${y}-${String(m).padStart(2,'0')}-${d.padStart(2,'0')}`;
  }

  const longMon = s.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/);
  if (longMon) {
    const [, mon, d, y] = longMon;
    const m = MONTH_ABBR[mon.toLowerCase().slice(0,3)];
    if (m) return `${y}-${String(m).padStart(2,'0')}-${d.padStart(2,'0')}`;
  }

  if (/^\d{8}$/.test(s)) {
    return `${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}`;
  }

  const parsed = new Date(s);
  if (!isNaN(parsed)) return parsed.toISOString().slice(0, 10);

  return null;
}

// ─── Apply Import (batch insert with validation) ─────────────

export async function applyImport(rows, mapping, duplicates, aiCategories) {
  const transactions = [];
  const errors = [];
  let skipped = 0;
  let duplicateCount = 0;

  for (let i = 0; i < rows.length; i++) {
    if (duplicates && duplicates[i]) {
      duplicateCount++;
      continue;
    }

    const row = rows[i];
    const dateVal = mapping.date ? row[mapping.date] : null;
    const descVal = mapping.description ? row[mapping.description] : '';
    let amountVal = 0;

    if (mapping.amount) {
      amountVal = parseFloat(String(row[mapping.amount] || '').replace(/[,$]/g, '')) || 0;
    } else if (mapping.debit || mapping.credit) {
      const debit = parseFloat(String((mapping.debit ? row[mapping.debit] : '') || '').replace(/[,$]/g, '')) || 0;
      const credit = parseFloat(String((mapping.credit ? row[mapping.credit] : '') || '').replace(/[,$]/g, '')) || 0;
      amountVal = credit > 0 ? credit : (debit > 0 ? -debit : 0);
    }

    if (!dateVal || amountVal === 0) {
      errors.push({ row: i + 1, reason: !dateVal ? 'Missing date' : 'Zero amount' });
      skipped++;
      continue;
    }

    const date = normalizeDate(dateVal);
    if (!date) {
      errors.push({ row: i + 1, reason: `Invalid date: ${dateVal}` });
      skipped++;
      continue;
    }

    let category;
    if (amountVal > 0) {
      category = 'Income';
    } else if (aiCategories && aiCategories[i]) {
      category = aiCategories[i];
    } else {
      category = autoCategorize(descVal);
    }

    transactions.push({
      id: uid(),
      description: descVal,
      amount: amountVal,
      category,
      date,
      icon: 'receipt',
    });
  }

  if (transactions.length > 0) {
    await State.addTransactionsBatch(transactions);
  }

  return {
    imported: transactions.length,
    skipped,
    duplicateCount,
    errorCount: errors.length,
    errors,
    transactions,
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

  for (const row of rows) {
    const symbol = (row[mapping.symbol] || '').trim().replace(/"/g, '');
    const name = (row[mapping.name] || '').trim().replace(/"/g, '');
    if (!symbol || symbol.length < 1) { skipped++; continue; }

    const quantity = parseFloat((row[mapping.quantity] || '0').replace(/[,"]/g, '')) || 0;
    const price = parseFloat((row[mapping.price] || '0').replace(/[,"]/g, '')) || 0;
    const currency = (row[mapping.priceCurrency] || 'CAD').replace(/"/g, '').trim();
    const bookValue = parseFloat((row[mapping.bookValue] || '0').replace(/[,"]/g, '')) || 0;
    const accountType = (row[mapping.accountType] || 'non-registered').replace(/"/g, '').trim().toLowerCase();
    const securityType = (row[mapping.securityType] || '').replace(/"/g, '').trim();

    // Map account type to WealthFlow types
    const acctMap = { 'rrsp': 'rrsp', 'tfsa': 'tfsa', 'resp': 'resp', 'fhsa': 'fhsa', 'crypto': 'non-registered', 'managed': 'rrsp', 'self-directed': 'non-registered' };
    const wfAccountType = acctMap[accountType] || 'non-registered';

    // Map security type
    const typeMap = { 'EXCHANGE_TRADED_FUND': 'etf', 'STOCK': 'stock', 'MUTUAL_FUND': 'mutual_fund', 'BOND': 'bond', 'CRYPTOCURRENCY': 'crypto' };
    const wfType = typeMap[securityType] || 'stock';

    // Calculate avg cost from book value
    const avgCost = quantity > 0 ? bookValue / quantity : 0;

    // Check if we already track this symbol in this account type
    const existing = state.investments.find(
      i => i.symbol.replace('.TO', '').toUpperCase() === symbol.replace('.TO', '').toUpperCase()
        && i.account_type === wfAccountType
    );

    if (existing) {
      // Update existing holding
      await State.updateInvestment({
        ...existing,
        shares: quantity,
        current_price: currency === 'CAD' ? price : price, // price in its native currency
        avg_cost: avgCost > 0 ? avgCost : existing.avg_cost,
        currency,
        name: name || existing.name,
      });
      updated++;
    } else if (quantity > 0) {
      // Add new holding
      await State.addInvestment({
        id: uid(),
        symbol,
        name,
        shares: quantity,
        avg_cost: avgCost,
        current_price: price,
        type: wfType,
        account_type: wfAccountType,
        institution: bankPreset?.name || 'Wealthsimple',
        currency,
      });
      added++;
    } else {
      skipped++;
    }
  }

  return { updated, added, skipped };
}

// ─── Post-Import Reconciliation ──────────────────────────────
// Updates debts, budgets, and other data based on imported transactions

export async function reconcileAfterImport(importedTransactions, detectedBank) {
  const state = State.getState();
  const updates = { debtsUpdated: 0, budgetsUpdated: 0, goalsUpdated: 0 };

  // --- 1. Update debt balances from credit card / loan payments ---
  // If we imported a credit card statement, the sum of transactions IS the current activity.
  // Look for debts that match the bank/source and update balance.
  if (state.debts.length > 0 && importedTransactions.length > 0) {
    // Calculate net balance from imported transactions (expenses are negative)
    const importedExpenses = importedTransactions.filter(t => t.amount < 0);
    const importedPayments = importedTransactions.filter(t => t.amount > 0);
    const totalNewCharges = importedExpenses.reduce((s, t) => s + Math.abs(t.amount), 0);
    const totalPayments = importedPayments.reduce((s, t) => s + t.amount, 0);

    // Try to match debts by name similarity to bank or transaction descriptions
    for (const debt of state.debts) {
      const debtName = debt.name.toLowerCase();
      const bankName = detectedBank?.name?.toLowerCase() || '';

      // Match if debt name contains bank name, or bank name contains debt name,
      // or debt type is 'credit' and the bank matches a credit card issuer
      const isMatch = (
        (bankName && (debtName.includes(bankName) || bankName.includes(debtName))) ||
        (debt.type === 'credit' && bankName && debtName.split(/\s+/).some(w => bankName.includes(w))) ||
        (debt.type === 'credit' && importedExpenses.length > 5) // If many expenses, likely a CC statement
      );

      if (isMatch && totalNewCharges > 0) {
        // For credit cards: new balance = old balance + new charges - payments made
        const newBalance = Math.max(0, debt.balance + totalNewCharges - totalPayments);
        await State.updateDebt({ ...debt, balance: newBalance });
        updates.debtsUpdated++;
        break; // Only update one matching debt per import
      }
    }
  }

  // --- 2. Recalculate budget spending from latest transactions ---
  // Budgets are computed from transactions, so no direct update needed.
  // But we can trigger a net worth snapshot since data changed.
  try { await State.snapshotNetWorth(); } catch { /* best-effort: snapshot is non-critical */ }

  // --- 3. Check if any imported payments match savings goals ---
  // Look for transactions with descriptions matching goal names
  if (state.goals.length > 0) {
    for (const tx of importedTransactions) {
      if (tx.amount <= 0) continue; // Only deposits
      const desc = tx.description.toLowerCase();
      for (const goal of state.goals) {
        const goalName = goal.name.toLowerCase();
        if (desc.includes(goalName) || goalName.split(/\s+/).some(w => w.length > 3 && desc.includes(w))) {
          const newCurrent = goal.current + tx.amount;
          if (newCurrent !== goal.current) {
            await State.updateGoal({ ...goal, current: Math.min(newCurrent, goal.target) });
            updates.goalsUpdated++;
          }
          break;
        }
      }
    }
  }

  // --- 4. Update contribution tracking for registered account deposits ---
  // Look for transactions that might be TFSA/RRSP/FHSA contributions
  const regKeywords = {
    tfsa: ['tfsa', 'tax free', 'tax-free'],
    rrsp: ['rrsp', 'retirement savings'],
    fhsa: ['fhsa', 'first home'],
    resp: ['resp', 'education savings'],
  };
  for (const tx of importedTransactions) {
    if (tx.amount <= 0) continue;
    const desc = tx.description.toLowerCase();
    for (const [acctType, keywords] of Object.entries(regKeywords)) {
      if (keywords.some(k => desc.includes(k))) {
        await State.addContribution({
          id: uid(),
          account_type: acctType,
          amount: tx.amount,
          date: tx.date,
          description: tx.description,
          institution: detectedBank?.name || null,
        });
        break;
      }
    }
  }

  return updates;
}

// ─── Legacy compatibility ────────────────────────────────────

export async function importCSV() {
  return importFile();
}

export async function applyCSVImport(rows, mapping) {
  const result = await applyImport(rows, mapping, null, null);
  return result.imported;
}
