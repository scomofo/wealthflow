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
};

// Initialise all domain modules with shared state and api
initMoney(state, api);
initGrowth(state, api);
initHome(state, api);
initPlan(state, api);

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
