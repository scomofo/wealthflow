// Core state: state object, loadAll, getState, computeFinancials, buildFinancialData
// Re-exports all domain modules
import { initMoney } from './money.js';
import { initGrowth } from './growth.js';
import { initHome } from './home.js';
import { initPlan } from './plan.js';

const api = window.wealthflow;

const state = {
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
  nextBestActions: [],
  proactiveNudges: [],
  engagementProgress: null,
  lastCompletionFeedback: null,
  personalizationProfile: null,
  summaryEmphasis: null,
  lastIntelligenceRefresh: null,
  // USD->CAD rate used to convert USD-denominated investments into the
  // portfolio's CAD totals. Defaults to 1 (no-op) until refreshStockPrices()
  // fetches a real rate, rather than defaulting to some guessed constant
  // that would silently go stale.
  usdCadRate: 1,
};

// Initialise all domain modules with shared state and api
initMoney(state, api);
initGrowth(state, api);
initHome(state, api);
initPlan(state, api);

export async function loadAll() {
  const [settings, transactions, budgets, goals, debts, investments, bills, challenges, counts,
         contributionRoom, contributions, respBeneficiaries, gics, residence, recommendedActions,
         nextBestActions] = await Promise.all([
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
    api.getNextBestActions(),
  ]);
  Object.assign(state, {
    settings, transactions, budgets, goals, debts, investments, bills, challenges, counts,
    contributionRoom, contributions, respBeneficiaries, gics, residence, recommendedActions,
    nextBestActions,
  });
  return state;
}

export function getState() { return state; }

// Computed financials
export async function computeFinancials() {
  return api.computeFinancials();
}

export async function buildFinancialData() {
  const financials = await api.computeFinancials();
  if (!state.advisorProfile) {
    const { loadAdvisorProfile } = await import('./home.js');
    await loadAdvisorProfile();
  }
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

// Re-exports from domain modules
export * from './money.js';
export * from './growth.js';
export * from './home.js';
export * from './plan.js';
