// Advisor Wizard Constants & Helpers

export const MARITAL_STATUSES = [
  { code: 'single', name: 'Single' },
  { code: 'married', name: 'Married' },
  { code: 'common-law', name: 'Common-Law' },
  { code: 'separated', name: 'Separated' },
  { code: 'divorced', name: 'Divorced' },
  { code: 'widowed', name: 'Widowed' },
];

export const CITIZENSHIP_STATUSES = [
  { code: 'citizen', name: 'Canadian Citizen' },
  { code: 'pr', name: 'Permanent Resident' },
  { code: 'work-permit', name: 'Work Permit' },
  { code: 'student-visa', name: 'Student Visa' },
  { code: 'other', name: 'Other' },
];

export const EMPLOYMENT_STATUSES = [
  { code: 'full-time', name: 'Full-Time Employed' },
  { code: 'part-time', name: 'Part-Time Employed' },
  { code: 'self-employed', name: 'Self-Employed' },
  { code: 'contract', name: 'Contract/Freelance' },
  { code: 'retired', name: 'Retired' },
  { code: 'student', name: 'Student' },
  { code: 'unemployed', name: 'Unemployed' },
];

export const INCOME_CHANGE_OPTIONS = [
  { code: 'stable', name: 'Expected to remain stable' },
  { code: 'increase', name: 'Expected to increase' },
  { code: 'decrease', name: 'Expected to decrease' },
  { code: 'uncertain', name: 'Uncertain / Variable' },
];

export const GOAL_TYPES = [
  { code: 'retirement', name: 'Retirement', icon: 'sun' },
  { code: 'home-purchase', name: 'Home Purchase / FHSA', icon: 'home' },
  { code: 'resp-education', name: 'Children\'s Education (RESP)', icon: 'book-open' },
  { code: 'debt-freedom', name: 'Debt Freedom', icon: 'check-circle' },
  { code: 'emergency-fund', name: 'Emergency Fund', icon: 'shield' },
  { code: 'travel', name: 'Travel / Vacation', icon: 'maple-leaf' },
  { code: 'major-purchase', name: 'Major Purchase', icon: 'wallet' },
  { code: 'other', name: 'Other Goal', icon: 'target' },
];

export const TIME_HORIZONS = [
  { code: '0-2', name: '0-2 years' },
  { code: '3-5', name: '3-5 years' },
  { code: '5-10', name: '5-10 years' },
  { code: '10-20', name: '10-20 years' },
  { code: '20+', name: '20+ years' },
];

export const EXPERIENCE_LEVELS = [
  { code: 'none', name: 'No experience', score: 1 },
  { code: 'beginner', name: 'Beginner (< 2 years)', score: 2 },
  { code: 'intermediate', name: 'Intermediate (2-5 years)', score: 3 },
  { code: 'experienced', name: 'Experienced (5-10 years)', score: 4 },
  { code: 'expert', name: 'Expert (10+ years)', score: 5 },
];

export const DROP_REACTIONS = [
  { code: 'sell-all', name: 'Sell everything immediately', score: 1 },
  { code: 'sell-some', name: 'Sell some to reduce risk', score: 2 },
  { code: 'hold', name: 'Hold and wait for recovery', score: 3 },
  { code: 'buy-more', name: 'Buy more at lower prices', score: 4 },
];

export const INCOME_STABILITY_OPTIONS = [
  { code: 'very-stable', name: 'Very stable (government, tenured)', score: 4 },
  { code: 'stable', name: 'Stable (established employer)', score: 3 },
  { code: 'variable', name: 'Variable (commission, freelance)', score: 2 },
  { code: 'unstable', name: 'Unstable / uncertain', score: 1 },
];

export const EMERGENCY_FUND_OPTIONS = [
  { code: '0', name: 'No emergency fund', score: 1 },
  { code: '1-3', name: '1-3 months of expenses', score: 2 },
  { code: '3-6', name: '3-6 months of expenses', score: 3 },
  { code: '6+', name: '6+ months of expenses', score: 4 },
];

export const DOCUMENT_TYPES = [
  { code: 'noa', name: 'CRA Notice of Assessment' },
  { code: 't4', name: 'T4 / Employment Income' },
  { code: 'investment-statement', name: 'Investment Statement' },
  { code: 'loan-document', name: 'Loan / Mortgage Document' },
  { code: 'insurance-policy', name: 'Insurance Policy' },
  { code: 'tax-return', name: 'Tax Return' },
  { code: 'will', name: 'Will / Estate Document' },
  { code: 'other', name: 'Other' },
];

export const ASSET_TYPES = [
  { code: 'chequing', name: 'Chequing Account' },
  { code: 'savings', name: 'Savings Account' },
  { code: 'hisa', name: 'High-Interest Savings' },
  { code: 'gic', name: 'GIC' },
  { code: 'vehicle', name: 'Vehicle' },
  { code: 'other', name: 'Other Asset' },
];

export const PROPERTY_STATUSES = [
  { code: 'owner', name: 'Homeowner' },
  { code: 'renter', name: 'Renter' },
  { code: 'living-with-family', name: 'Living with family' },
  { code: 'other', name: 'Other' },
];

export const WILL_STATUSES = [
  { code: 'current', name: 'Current / Up to date' },
  { code: 'outdated', name: 'Exists but outdated' },
  { code: 'none', name: 'No will' },
];

export const DISABILITY_OPTIONS = [
  { code: 'employer', name: 'Through employer' },
  { code: 'private', name: 'Private policy' },
  { code: 'both', name: 'Both employer and private' },
  { code: 'none', name: 'None' },
];

export const LIFE_INSURANCE_TYPES = [
  { code: 'term', name: 'Term Life' },
  { code: 'whole', name: 'Whole Life' },
  { code: 'universal', name: 'Universal Life' },
  { code: 'group', name: 'Group (employer)' },
  { code: 'none', name: 'None' },
];

export const RESP_STATUSES = [
  { code: 'active', name: 'Active - contributing' },
  { code: 'inactive', name: 'Have one, not contributing' },
  { code: 'none', name: 'No RESP' },
  { code: 'na', name: 'Not applicable' },
];

// Risk Score Computation
// Weighted algorithm: experience (20%), reaction (30%), horizon (20%), stability (15%), emergency (15%)
export function computeRiskScore(answers) {
  const weights = {
    investment_experience: 0.20,
    portfolio_drop_reaction: 0.30,
    investment_time_horizon: 0.20,
    income_stability: 0.15,
    emergency_fund_months: 0.15,
  };

  const horizonScores = { '0-2': 1, '3-5': 2, '5-10': 3, '10-20': 4, '20+': 5 };

  const getScore = (list, code) => {
    const item = list.find(x => x.code === code);
    return item ? item.score : 0;
  };

  const scores = {
    investment_experience: getScore(EXPERIENCE_LEVELS, answers.investment_experience),
    portfolio_drop_reaction: getScore(DROP_REACTIONS, answers.portfolio_drop_reaction),
    investment_time_horizon: horizonScores[answers.investment_time_horizon] || 0,
    income_stability: getScore(INCOME_STABILITY_OPTIONS, answers.income_stability),
    emergency_fund_months: getScore(EMERGENCY_FUND_OPTIONS, answers.emergency_fund_months),
  };

  let total = 0;
  let maxPossible = 0;
  for (const [key, weight] of Object.entries(weights)) {
    if (scores[key] > 0) {
      total += scores[key] * weight;
      maxPossible += (key === 'investment_time_horizon' ? 5 : (key === 'portfolio_drop_reaction' ? 4 : 5)) * weight;
    }
  }

  if (maxPossible === 0) return { label: '', numeric: 0, color: 'var(--sub)' };

  const normalized = (total / maxPossible) * 100;

  if (normalized <= 30) return { label: 'Conservative', numeric: Math.round(normalized), color: '#3b82f6' };
  if (normalized <= 55) return { label: 'Moderate', numeric: Math.round(normalized), color: '#10b981' };
  if (normalized <= 80) return { label: 'Aggressive', numeric: Math.round(normalized), color: '#f59e0b' };
  return { label: 'Very Aggressive', numeric: Math.round(normalized), color: '#ef4444' };
}

// Asset Allocation Models by risk profile
export const ALLOCATION_MODELS = {
  Conservative: { equity: 30, fixed: 50, cash: 20, description: 'Focus on capital preservation with steady income' },
  Moderate: { equity: 60, fixed: 30, cash: 10, description: 'Balanced growth with moderate risk' },
  Aggressive: { equity: 80, fixed: 15, cash: 5, description: 'Growth-focused with higher volatility tolerance' },
  'Very Aggressive': { equity: 95, fixed: 5, cash: 0, description: 'Maximum growth, suitable for long time horizons' },
};
