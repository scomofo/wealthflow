// Money domain: transactions, budgets, bills, debts
let state, api;
export function initMoney(s, a) { state = s; api = a; }

// Transactions
export async function addTransaction(tx) {
  await api.addTransaction(tx);
  state.transactions.unshift(tx);
  state.counts.transactions++;
  return tx;
}
export async function updateTransaction(tx) {
  await api.updateTransaction(tx);
  const idx = state.transactions.findIndex(t => t.id === tx.id);
  if (idx >= 0) state.transactions[idx] = tx;
  return tx;
}
export async function deleteTransaction(id) {
  await api.deleteTransaction(id);
  const prev = state.transactions.length;
  state.transactions = state.transactions.filter(t => t.id !== id);
  if (state.transactions.length < prev) state.counts.transactions--;
}

// Budgets
export async function addBudget(b) {
  await api.addBudget(b);
  state.budgets.push(b);
  state.counts.budgets++;
  return b;
}
export async function updateBudget(b) {
  await api.updateBudget(b);
  const idx = state.budgets.findIndex(x => x.id === b.id);
  if (idx >= 0) state.budgets[idx] = b;
  return b;
}
export async function deleteBudget(id) {
  await api.deleteBudget(id);
  const prev = state.budgets.length;
  state.budgets = state.budgets.filter(b => b.id !== id);
  if (state.budgets.length < prev) state.counts.budgets--;
}

// Bills
export async function addBill(b) {
  await api.addBill(b);
  state.bills.push(b);
  return b;
}
export async function updateBill(b) {
  await api.updateBill(b);
  const idx = state.bills.findIndex(x => x.id === b.id);
  if (idx >= 0) state.bills[idx] = b;
  return b;
}
export async function deleteBill(id) {
  await api.deleteBill(id);
  state.bills = state.bills.filter(b => b.id !== id);
}

// Recurring log
export async function addRecurringLog(entry) {
  await api.addRecurringLog(entry);
  return entry;
}

// Recurring processing
export async function processRecurringBills() {
  const result = await api.processRecurringBills();
  if (result.length > 0) {
    const { loadAll } = await import('./core.js');
    await loadAll();
  }
  return result;
}

// Batch transactions
export async function addTransactionsBatch(txs) {
  await api.addTransactionsBatch(txs);
  // Reload transactions from DB to ensure cache is in sync
  state.transactions = await api.getTransactions();
  state.counts = await api.getCounts();
  return txs.length;
}
export async function findDuplicateTransactions(checks) {
  return api.findDuplicateTransactions(checks);
}

// Batch category update by payee
export async function updateCategoryByDescription(description, category) {
  const count = await api.updateCategoryByDescription(description, category);
  // Update local state cache
  for (const tx of state.transactions) {
    if (tx.description === description) tx.category = category;
  }
  return count;
}
export async function countTransactionsByDescription(description) {
  return api.countTransactionsByDescription(description);
}

// Debts
export async function addDebt(d) {
  await api.addDebt(d);
  state.debts.push(d);
  state.counts.debts++;
  return d;
}
export async function updateDebt(d) {
  await api.updateDebt(d);
  const idx = state.debts.findIndex(x => x.id === d.id);
  if (idx >= 0) state.debts[idx] = d;
  return d;
}
export async function deleteDebt(id) {
  await api.deleteDebt(id);
  const prev = state.debts.length;
  state.debts = state.debts.filter(d => d.id !== id);
  if (state.debts.length < prev) state.counts.debts--;
}
