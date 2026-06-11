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

// Next Best Actions
export async function generateNextBestActions() {
  const result = await api.generateNextBestActions();
  state.nextBestActions = result;
  return result;
}

export async function loadNextBestActions() {
  state.nextBestActions = await api.getNextBestActions();
  return state.nextBestActions;
}

export async function completeNextBestAction(id) {
  await api.completeNextBestAction(id);
  state.nextBestActions = state.nextBestActions.filter(a => a.id !== id);
}

export async function dismissNextBestAction(id) {
  await api.dismissNextBestAction(id);
  state.nextBestActions = state.nextBestActions.filter(a => a.id !== id);
}

export async function snoozeNextBestAction(id, untilDate) {
  await api.snoozeNextBestAction(id, untilDate);
  state.nextBestActions = state.nextBestActions.filter(a => a.id !== id);
}

// Personalization
export async function recordInteraction(eventType, category) {
  state.personalizationProfile = await api.recordInteraction(eventType, category);
  if (api.getSummaryEmphasis) state.summaryEmphasis = await api.getSummaryEmphasis();
  return state.personalizationProfile;
}

export async function loadPersonalizationContext() {
  if (api.getPersonalizationProfile) {
    state.personalizationProfile = await api.getPersonalizationProfile();
  }
  if (api.getSummaryEmphasis) {
    state.summaryEmphasis = await api.getSummaryEmphasis();
  }
  return {
    profile: state.personalizationProfile,
    summaryEmphasis: state.summaryEmphasis,
  };
}

// Proactive
export async function evaluateProactiveNudges() {
  state.proactiveNudges = await api.evaluateProactiveNudges();
  return state.proactiveNudges;
}

// Engagement
export async function refreshEngagementProgress() {
  state.engagementProgress = await api.getEngagementProgress();
  return state.engagementProgress;
}

export async function getEngagementProgress() {
  return refreshEngagementProgress();
}

export async function getCompletionFeedback(payload) {
  if (!api.getCompletionFeedback) return null;
  state.lastCompletionFeedback = await api.getCompletionFeedback(payload);
  return state.lastCompletionFeedback;
}

export async function getEnhancedToast(baseMessage) {
  return api.getEnhancedToast(baseMessage);
}
