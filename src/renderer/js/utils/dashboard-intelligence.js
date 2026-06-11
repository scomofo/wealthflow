export function buildDashboardAISummary(state, financials, summaryGenerator) {
  if (!summaryGenerator) return null;
  return summaryGenerator(state?.nextBestActions || [], financials || {}, state?.summaryEmphasis);
}
