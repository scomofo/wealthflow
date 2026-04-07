// Plan domain: monthly reports, recommended actions, workflows, export/import, AI categorize
let state, api;
export function initPlan(s, a) { state = s; api = a; }

// Net worth
export async function snapshotNetWorth() { return api.snapshotNetWorth(); }
export async function getNetWorthHistory() { return api.getNetWorthHistory(); }

// Analytics
export async function getMonthlyTotals(months) { return api.getMonthlyTotals(months); }

// Monthly Reports
export async function generateMonthlyReport(month, year) {
  const { buildFinancialData } = await import('./core.js');
  const financialData = await buildFinancialData();
  return api.generateMonthlyReport(financialData, month, year);
}

export async function saveMonthlyReport(report) {
  return api.saveMonthlyReport(report);
}

export async function getMonthlyReports() {
  return api.getMonthlyReports();
}

// AI Workflows
export async function runWorkflow(workflowType) {
  const { buildFinancialData } = await import('./core.js');
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

// Export/Import
export async function exportAllData() { return api.exportAllData(); }

// Seed
export async function seedSampleData(data) {
  await api.seedSampleData(data);
  const { loadAll } = await import('./core.js');
  return loadAll();
}

// Import History
export async function addImportHistory(entry) {
  return api.addImportHistory(entry);
}
export async function getImportHistory() {
  return api.getImportHistory();
}

// AI Categorize
export async function aiCategorize(descriptions) {
  return api.aiCategorize(descriptions);
}
