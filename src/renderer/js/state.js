// State management - bridges IPC to in-memory cache
const api = window.wealthflow;

let state = {
  settings: null,
  transactions: [],
  budgets: [],
  goals: [],
  debts: [],
  investments: [],
  bills: [],
  challenges: [],
  counts: {},
  contributionRoom: [],
  contributions: [],
  respBeneficiaries: [],
  gics: [],
  advisorProfile: null,
  residence: null,
  recommendedActions: [],
};

export async function loadAll() {
  const [settings, transactions, budgets, goals, debts, investments, bills, challenges, counts,
         contributionRoom, contributions, respBeneficiaries, gics, residence, recommendedActions] = await Promise.all([
    api.getSettings(),
    api.getTransactions(),
    api.getBudgets(),
    api.getGoals(),
    api.getDebts(),
    api.getInvestments(),
    api.getBills(),
    api.getChallenges(),
    api.getCounts(),
    api.getContributionRoom(),
    api.getContributions(),
    api.getRESPBeneficiaries(),
    api.getGICs(),
    api.getPrincipalResidence(),
    api.getRecommendedActions(),
  ]);
  Object.assign(state, {
    settings, transactions, budgets, goals, debts, investments, bills, challenges, counts,
    contributionRoom, contributions, respBeneficiaries, gics, residence, recommendedActions,
  });
  return state;
}

export function getState() { return state; }

// Settings
export async function updateSettings(data) {
  state.settings = await api.updateSettings(data);
  return state.settings;
}

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

// Goals
export async function addGoal(g) {
  await api.addGoal(g);
  state.goals.push(g);
  state.counts.goals++;
  return g;
}
export async function updateGoal(g) {
  await api.updateGoal(g);
  const idx = state.goals.findIndex(x => x.id === g.id);
  if (idx >= 0) state.goals[idx] = g;
  return g;
}
export async function deleteGoal(id) {
  await api.deleteGoal(id);
  const prev = state.goals.length;
  state.goals = state.goals.filter(g => g.id !== id);
  if (state.goals.length < prev) state.counts.goals--;
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

// Investments
export async function addInvestment(i) {
  await api.addInvestment(i);
  state.investments.push(i);
  state.counts.investments++;
  return i;
}
export async function updateInvestment(i) {
  await api.updateInvestment(i);
  const idx = state.investments.findIndex(x => x.id === i.id);
  if (idx >= 0) state.investments[idx] = i;
  return i;
}
export async function deleteInvestment(id) {
  await api.deleteInvestment(id);
  const prev = state.investments.length;
  state.investments = state.investments.filter(i => i.id !== id);
  if (state.investments.length < prev) state.counts.investments--;
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

// Challenges
export async function updateChallenge(c) {
  await api.updateChallenge(c);
  const idx = state.challenges.findIndex(x => x.id === c.id);
  if (idx >= 0) Object.assign(state.challenges[idx], c);
}

// Contribution Room
export async function upsertContributionRoom(cr) {
  await api.upsertContributionRoom(cr);
  state.contributionRoom = await api.getContributionRoom();
  return cr;
}
export async function deleteContributionRoom(id) {
  await api.deleteContributionRoom(id);
  state.contributionRoom = state.contributionRoom.filter(c => c.id !== id);
}

// Contributions
export async function addContribution(c) {
  await api.addContribution(c);
  state.contributions.unshift(c);
  return c;
}
export async function deleteContribution(id) {
  await api.deleteContribution(id);
  state.contributions = state.contributions.filter(c => c.id !== id);
}

// RESP Beneficiaries
export async function addRESPBeneficiary(b) {
  await api.addRESPBeneficiary(b);
  state.respBeneficiaries.push(b);
  return b;
}
export async function updateRESPBeneficiary(b) {
  await api.updateRESPBeneficiary(b);
  const idx = state.respBeneficiaries.findIndex(x => x.id === b.id);
  if (idx >= 0) state.respBeneficiaries[idx] = b;
  return b;
}
export async function deleteRESPBeneficiary(id) {
  await api.deleteRESPBeneficiary(id);
  state.respBeneficiaries = state.respBeneficiaries.filter(b => b.id !== id);
}

// GICs
export async function addGIC(g) {
  await api.addGIC(g);
  state.gics.push(g);
  return g;
}
export async function deleteGIC(id) {
  await api.deleteGIC(id);
  state.gics = state.gics.filter(g => g.id !== id);
}

// Recurring log
export async function addRecurringLog(entry) {
  await api.addRecurringLog(entry);
  return entry;
}

// Net worth
export async function snapshotNetWorth() { return api.snapshotNetWorth(); }
export async function getNetWorthHistory() { return api.getNetWorthHistory(); }

// Analytics
export async function getMonthlyTotals(months) { return api.getMonthlyTotals(months); }

// Recurring processing
export async function processRecurringBills() {
  const result = await api.processRecurringBills();
  if (result.length > 0) await loadAll();
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

// Import History
export async function addImportHistory(entry) {
  return api.addImportHistory(entry);
}
export async function getImportHistory() {
  return api.getImportHistory();
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

// AI Categorize
export async function aiCategorize(descriptions) {
  return api.aiCategorize(descriptions);
}

// Export/Import
export async function exportAllData() { return api.exportAllData(); }

// Seed
export async function seedSampleData(data) {
  await api.seedSampleData(data);
  return loadAll();
}

// Principal Residence — lazy loaded
export async function loadResidence() {
  state.residence = await api.getPrincipalResidence();
  return state.residence;
}

export async function updateResidence(data) {
  state.residence = await api.updatePrincipalResidence(data);
  return state.residence;
}

// Advisor Profile — lazy loaded
export async function loadAdvisorProfile() {
  state.advisorProfile = await api.getAdvisorProfile();
  return state.advisorProfile;
}

export async function updateAdvisorPersonal(data) {
  const result = await api.updateAdvisorPersonal(data);
  if (state.advisorProfile) state.advisorProfile.personal = result;
  return result;
}
export async function updateAdvisorEmployment(data) {
  const result = await api.updateAdvisorEmployment(data);
  if (state.advisorProfile) state.advisorProfile.employment = result;
  return result;
}
export async function updateAdvisorRisk(data) {
  const result = await api.updateAdvisorRisk(data);
  if (state.advisorProfile) state.advisorProfile.risk = result;
  return result;
}
export async function updateAdvisorRegistered(data) {
  const result = await api.updateAdvisorRegistered(data);
  if (state.advisorProfile) state.advisorProfile.registered = result;
  return result;
}
export async function updateAdvisorInsurance(data) {
  const result = await api.updateAdvisorInsurance(data);
  if (state.advisorProfile) state.advisorProfile.insurance = result;
  return result;
}

export async function upsertAdvisorGoal(g) {
  await api.upsertAdvisorGoal(g);
  if (state.advisorProfile) state.advisorProfile.goals = await api.getAdvisorGoals();
  return g;
}
export async function deleteAdvisorGoal(id) {
  await api.deleteAdvisorGoal(id);
  if (state.advisorProfile) state.advisorProfile.goals = state.advisorProfile.goals.filter(g => g.id !== id);
}

export async function addAdvisorAsset(a) {
  await api.addAdvisorAsset(a);
  if (state.advisorProfile) state.advisorProfile.assets.push(a);
  return a;
}
export async function updateAdvisorAsset(a) {
  await api.updateAdvisorAsset(a);
  if (state.advisorProfile) {
    const idx = state.advisorProfile.assets.findIndex(x => x.id === a.id);
    if (idx >= 0) state.advisorProfile.assets[idx] = a;
  }
  return a;
}
export async function deleteAdvisorAsset(id) {
  await api.deleteAdvisorAsset(id);
  if (state.advisorProfile) state.advisorProfile.assets = state.advisorProfile.assets.filter(a => a.id !== id);
}

export async function addAdvisorDocument(doc) {
  await api.addAdvisorDocument(doc);
  if (state.advisorProfile) state.advisorProfile.documents.unshift(doc);
  return doc;
}
export async function deleteAdvisorDocument(id) {
  const doc = state.advisorProfile?.documents.find(d => d.id === id);
  if (doc) await api.deleteDocumentFile(doc.filename);
  await api.deleteAdvisorDocument(id);
  if (state.advisorProfile) state.advisorProfile.documents = state.advisorProfile.documents.filter(d => d.id !== id);
}

export async function copyDocumentFile(src, dest) { return api.copyDocumentFile(src, dest); }
export async function openDocumentFile(filename) { return api.openDocumentFile(filename); }

// Stock price refresh
export async function refreshStockPrices() {
  if (state.investments.length === 0) return [];

  // Build query symbols: USD investments keep their symbol as-is,
  // CAD investments without a dot get .TO appended by the stock service.
  // For USD symbols, we need to prevent .TO by adding the exchange explicitly.
  const queryMap = []; // { symbol, querySymbol, inv }
  for (const inv of state.investments) {
    if (!inv.symbol) continue;
    const sym = inv.symbol;
    // Skip non-tradeable (mutual funds, GICs, crypto with custom symbols)
    if (sym.includes('-') || inv.type === 'gic' || inv.type === 'mutual_fund') continue;
    // If already has a dot (e.g., CVO.TO, ZUAG.F), use as-is
    if (sym.includes('.')) {
      queryMap.push({ symbol: sym, querySymbol: sym, inv });
    } else if (inv.currency === 'USD') {
      // US-listed — don't append .TO
      queryMap.push({ symbol: sym, querySymbol: sym, inv });
    } else {
      // Canadian — let stock service append .TO
      queryMap.push({ symbol: sym, querySymbol: sym, inv });
    }
  }

  if (queryMap.length === 0) return [];
  const symbols = queryMap.map(q => q.querySymbol);
  const quotes = await api.fetchBatchQuotes(symbols);

  for (const q of quotes) {
    if (q.error || !q.price) continue;
    const match = queryMap.find(m =>
      m.querySymbol.toUpperCase() === q.symbol?.toUpperCase() ||
      m.querySymbol.toUpperCase() + '.TO' === q.symbol?.toUpperCase()
    );
    if (match) {
      match.inv.current_price = q.price;
      await api.updateInvestment(match.inv);
    }
  }
  return quotes;
}

// Computed financials
export async function computeFinancials() {
  return api.computeFinancials();
}

// Monthly Reports
export async function generateMonthlyReport(month, year) {
  const financialData = await buildFinancialData();
  return api.generateMonthlyReport(financialData, month, year);
}

export async function saveMonthlyReport(report) {
  return api.saveMonthlyReport(report);
}

export async function getMonthlyReports() {
  return api.getMonthlyReports();
}

async function buildFinancialData() {
  const financials = await api.computeFinancials();
  if (!state.advisorProfile) await loadAdvisorProfile();
  return {
    financials,
    budgets: state.budgets,
    debts: state.debts,
    investments: state.investments,
    goals: state.goals,
    contributionRoom: state.contributionRoom,
    advisorProfile: state.advisorProfile,
    settings: state.settings,
  };
}

// AI Workflows
export async function runWorkflow(workflowType) {
  const financialData = await buildFinancialData();
  return api.runWorkflow(workflowType, financialData);
}

// Recommended Actions
export async function addRecommendedAction(action) {
  await api.addRecommendedAction(action);
  state.recommendedActions.unshift(action);
  return action;
}

export async function completeRecommendedAction(id) {
  await api.completeRecommendedAction(id);
  const idx = state.recommendedActions.findIndex(a => a.id === id);
  if (idx >= 0) {
    state.recommendedActions[idx].status = 'completed';
    state.recommendedActions[idx].completed_at = new Date().toISOString();
  }
}

export async function deleteRecommendedAction(id) {
  await api.deleteRecommendedAction(id);
  state.recommendedActions = state.recommendedActions.filter(a => a.id !== id);
}
