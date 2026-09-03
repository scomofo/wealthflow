// Canadian Financial Constants

export const CURRENCY = {
  code: 'CAD',
  locale: 'en-CA',
  symbol: '$',
};

// TFSA Annual Limits
export const TFSA_LIMITS = {
  2009: 5000, 2010: 5000, 2011: 5000, 2012: 5000,
  2013: 5500, 2014: 5500,
  2015: 10000,
  2016: 5500, 2017: 5500, 2018: 5500,
  2019: 6000, 2020: 6000, 2021: 6000,
  2022: 6000, 2023: 6500,
  2024: 7000, 2025: 7000, 2026: 7000,
};

export const TFSA_CUMULATIVE_2026 = 102000;

// RRSP Limits
export const RRSP = {
  MAX_2026: 33810,
  RATE: 0.18,
  OVERCONTRIBUTION_BUFFER: 2000,
};

// RESP
export const RESP = {
  LIFETIME_LIMIT: 50000,
  CESG_RATE: 0.20,
  CESG_MAX_ANNUAL: 500,
  CESG_LIFETIME_MAX: 7200,
  OPTIMAL_ANNUAL: 2500,
};

// FHSA - First Home Savings Account
export const FHSA = {
  ANNUAL_LIMIT: 8000,
  LIFETIME_LIMIT: 40000,
  CARRYFORWARD_MAX: 8000,
  START_YEAR: 2023,
};

// CPP/QPP Constants (2026)
// MAX_PENSIONABLE_EARNINGS, MAX_MONTHLY_BENEFIT_65 and AVG_MONTHLY_BENEFIT
// per CRA's 2026 CPP release. YAMPE/CPP2_RATE cover the second earnings
// ceiling introduced for the CPP enhancement (2024+); this app does not yet
// separately calculate CPP2 contributions, but the correct current figures
// are captured here for when it does. MAX_MONTHLY_BENEFIT_60/_70 are
// MAX_MONTHLY_BENEFIT_65 adjusted by the (unchanged) standard early/late
// rates below: 60 months x 0.6%/mo = 36% reduction, 60 months x 0.7%/mo =
// 42% increase.
export const CPP = {
  MAX_PENSIONABLE_EARNINGS: 74600,
  YAMPE: 85000, // second (CPP2) earnings ceiling
  CPP2_RATE: 0.04,
  BASIC_EXEMPTION: 3500,
  EMPLOYEE_RATE: 0.0595,
  MAX_MONTHLY_BENEFIT_65: 1507.65,
  MAX_MONTHLY_BENEFIT_60: 964.90, // 36% reduction
  MAX_MONTHLY_BENEFIT_70: 2140.86, // 42% increase
  AVG_MONTHLY_BENEFIT: 877.01,
  START_AGE_MIN: 60,
  START_AGE_MAX: 70,
  NORMAL_AGE: 65,
  EARLY_REDUCTION_PER_MONTH: 0.006, // 0.6% per month before 65
  LATE_INCREASE_PER_MONTH: 0.007, // 0.7% per month after 65
};

// OAS Constants (Jan-Mar 2026 quarterly amount; OAS is re-indexed quarterly
// so MAX_MONTHLY_BENEFIT drifts slightly through the year). Clawback
// thresholds are for 2026 net income (recovery tax applied July 2027-June
// 2028).
export const OAS = {
  MAX_MONTHLY_BENEFIT: 742.31,
  CLAWBACK_THRESHOLD: 95323,
  FULL_CLAWBACK_THRESHOLD: 154753,
  CLAWBACK_RATE: 0.15,
  ELIGIBLE_AGE: 65,
  DEFERRAL_INCREASE_PER_MONTH: 0.006, // 0.6% per month after 65
  MAX_DEFERRAL_AGE: 70,
  YEARS_REQUIRED_FULL: 40,
};

// Basic Personal Amount by Province (2026)
// FEDERAL/ON/AB/BC/SK/NS are confirmed 2026 figures. MB is unchanged from
// the prior value, which already matched 2026. QC/NB/PE/NL/NT/NU are not
// yet confirmed for 2026 and are carried over from an earlier year — treat
// those as approximate until verified. YT sets its own BPA equal to the
// federal amount by design, so it tracks FEDERAL here.
export const BASIC_PERSONAL_AMOUNT = {
  FEDERAL: 16452,
  ON: 12989,
  AB: 22769,
  BC: 13216,
  QC: 18056, // unverified for 2026
  SK: 20381,
  MB: 15780,
  NS: 11932,
  NB: 13044, // unverified for 2026
  PE: 13500, // unverified for 2026
  NL: 10818, // unverified for 2026
  YT: 16452,
  NT: 17373, // unverified for 2026
  NU: 18767, // unverified for 2026
};

// Federal Tax Brackets 2026 — lowest rate cut from 15% to 14% effective
// July 2025, in effect for the full 2026 tax year; thresholds indexed 2%.
export const FEDERAL_TAX_BRACKETS_2026 = [
  { min: 0, max: 58523, rate: 0.14 },
  { min: 58523, max: 117045, rate: 0.205 },
  { min: 117045, max: 181440, rate: 0.26 },
  { min: 181440, max: 258482, rate: 0.29 },
  { min: 258482, max: Infinity, rate: 0.33 },
];

// Provincial Tax Brackets 2026 (common provinces)
// ON/AB/BC/SK/MB are confirmed 2026 figures. Alberta added a new 8%
// bracket on the first $61,200 effective 2025, carried into 2026 with 2%
// indexation. NS's thresholds are unchanged from the prior value (Nova
// Scotia does not index its brackets annually) — only its basic personal
// amount changed for 2026, see BASIC_PERSONAL_AMOUNT above. QC/NB/PE/NL/NT/NU
// are not yet confirmed for 2026 and are carried over from an earlier
// year — treat those as approximate until verified.
export const PROVINCIAL_TAX_BRACKETS_2026 = {
  ON: [
    { min: 0, max: 53891, rate: 0.0505 },
    { min: 53891, max: 107785, rate: 0.0915 },
    { min: 107785, max: 150000, rate: 0.1116 },
    { min: 150000, max: 220000, rate: 0.1216 },
    { min: 220000, max: Infinity, rate: 0.1316 },
  ],
  AB: [
    { min: 0, max: 61200, rate: 0.08 },
    { min: 61200, max: 154259, rate: 0.10 },
    { min: 154259, max: 185111, rate: 0.12 },
    { min: 185111, max: 246813, rate: 0.13 },
    { min: 246813, max: 370220, rate: 0.14 },
    { min: 370220, max: Infinity, rate: 0.15 },
  ],
  BC: [
    { min: 0, max: 50363, rate: 0.056 },
    { min: 50363, max: 100728, rate: 0.077 },
    { min: 100728, max: 115648, rate: 0.105 },
    { min: 115648, max: 140430, rate: 0.1229 },
    { min: 140430, max: 190405, rate: 0.147 },
    { min: 190405, max: 265545, rate: 0.168 },
    { min: 265545, max: Infinity, rate: 0.205 },
  ],
  QC: [ // unverified for 2026
    { min: 0, max: 51780, rate: 0.14 },
    { min: 51780, max: 103545, rate: 0.19 },
    { min: 103545, max: 126000, rate: 0.24 },
    { min: 126000, max: Infinity, rate: 0.2575 },
  ],
  SK: [
    { min: 0, max: 54532, rate: 0.105 },
    { min: 54532, max: 155805, rate: 0.125 },
    { min: 155805, max: Infinity, rate: 0.145 },
  ],
  MB: [
    { min: 0, max: 47564, rate: 0.108 },
    { min: 47564, max: 101200, rate: 0.1275 },
    { min: 101200, max: Infinity, rate: 0.174 },
  ],
  NS: [
    { min: 0, max: 29590, rate: 0.0879 },
    { min: 29590, max: 59180, rate: 0.1495 },
    { min: 59180, max: 93000, rate: 0.1667 },
    { min: 93000, max: 150000, rate: 0.175 },
    { min: 150000, max: Infinity, rate: 0.21 },
  ],
  NB: [ // unverified for 2026
    { min: 0, max: 49958, rate: 0.094 },
    { min: 49958, max: 99916, rate: 0.14 },
    { min: 99916, max: 185064, rate: 0.16 },
    { min: 185064, max: Infinity, rate: 0.195 },
  ],
  PE: [ // unverified for 2026
    { min: 0, max: 32656, rate: 0.098 },
    { min: 32656, max: 64313, rate: 0.138 },
    { min: 64313, max: Infinity, rate: 0.167 },
  ],
  NL: [ // unverified for 2026
    { min: 0, max: 43198, rate: 0.087 },
    { min: 43198, max: 86395, rate: 0.145 },
    { min: 86395, max: 154244, rate: 0.158 },
    { min: 154244, max: 215943, rate: 0.178 },
    { min: 215943, max: 275870, rate: 0.198 },
    { min: 275870, max: 551739, rate: 0.208 },
    { min: 551739, max: 1103478, rate: 0.213 },
    { min: 1103478, max: Infinity, rate: 0.218 },
  ],
  // Yukon's bracket thresholds are set equal to the federal thresholds by
  // design (only its rates and top bracket differ), so these track
  // FEDERAL_TAX_BRACKETS_2026's thresholds above.
  YT: [
    { min: 0, max: 58523, rate: 0.064 },
    { min: 58523, max: 117045, rate: 0.09 },
    { min: 117045, max: 181440, rate: 0.109 },
    { min: 181440, max: 500000, rate: 0.128 },
    { min: 500000, max: Infinity, rate: 0.15 },
  ],
  NT: [ // unverified for 2026
    { min: 0, max: 50597, rate: 0.059 },
    { min: 50597, max: 101198, rate: 0.086 },
    { min: 101198, max: 164525, rate: 0.122 },
    { min: 164525, max: Infinity, rate: 0.1405 },
  ],
  NU: [ // unverified for 2026
    { min: 0, max: 53268, rate: 0.04 },
    { min: 53268, max: 106537, rate: 0.07 },
    { min: 106537, max: 173205, rate: 0.09 },
    { min: 173205, max: Infinity, rate: 0.115 },
  ],
};

export const PROVINCES = [
  { code: 'AB', name: 'Alberta' },
  { code: 'BC', name: 'British Columbia' },
  { code: 'MB', name: 'Manitoba' },
  { code: 'NB', name: 'New Brunswick' },
  { code: 'NL', name: 'Newfoundland and Labrador' },
  { code: 'NS', name: 'Nova Scotia' },
  { code: 'NT', name: 'Northwest Territories' },
  { code: 'NU', name: 'Nunavut' },
  { code: 'ON', name: 'Ontario' },
  { code: 'PE', name: 'Prince Edward Island' },
  { code: 'QC', name: 'Quebec' },
  { code: 'SK', name: 'Saskatchewan' },
  { code: 'YT', name: 'Yukon' },
];

// Big 5 Canadian Banks
export const CANADIAN_BANKS = [
  { code: 'TD', name: 'TD Canada Trust', color: '#34A853' },
  { code: 'RBC', name: 'Royal Bank of Canada', color: '#003DA5' },
  { code: 'BMO', name: 'Bank of Montreal', color: '#0075BE' },
  { code: 'BNS', name: 'Scotiabank', color: '#EC111A' },
  { code: 'CIBC', name: 'CIBC', color: '#8B0000' },
  { code: 'DES', name: 'Desjardins', color: '#00874E' },
  { code: 'NBC', name: 'National Bank of Canada', color: '#E31937' },
  { code: 'OTHER', name: 'Other', color: '#6b7280' },
];

// Canadian expense categories
export const CATEGORIES = [
  'Housing', 'Rent/Mortgage', 'Property Tax', 'Food/Groceries',
  'Transport', 'Utilities', 'Entertainment', 'Shopping',
  'Healthcare', 'Childcare', 'Education', 'Insurance',
  'GST/HST', 'Income', 'Investment Income', 'Government Benefits',
  'Transfer', 'Other',
];

export const CATEGORY_COLORS = {
  'Housing': '#6366f1',
  'Rent/Mortgage': '#6366f1',
  'Property Tax': '#818cf8',
  'Food/Groceries': '#10b981',
  'Transport': '#f59e0b',
  'Utilities': '#ec4899',
  'Entertainment': '#8b5cf6',
  'Shopping': '#14b8a6',
  'Healthcare': '#ef4444',
  'Childcare': '#f97316',
  'Education': '#3b82f6',
  'Insurance': '#6b7280',
  'GST/HST': '#a855f7',
  'Income': '#22c55e',
  'Investment Income': '#10b981',
  'Government Benefits': '#059669',
  'Transfer': '#94a3b8',
  'Other': '#6b7280',
};

// Investment types
export const INVESTMENT_TYPES = [
  { code: 'stock', name: 'Stock' },
  { code: 'etf', name: 'ETF' },
  { code: 'mutual_fund', name: 'Mutual Fund' },
  { code: 'gic', name: 'GIC' },
  { code: 'bond', name: 'Bond' },
  { code: 'reit', name: 'REIT' },
  { code: 'crypto', name: 'Cryptocurrency' },
];

// Account types
export const ACCOUNT_TYPES = [
  { code: 'non-registered', name: 'Non-Registered' },
  { code: 'tfsa', name: 'TFSA' },
  { code: 'rrsp', name: 'RRSP' },
  { code: 'resp', name: 'RESP' },
  { code: 'fhsa', name: 'FHSA' },
  { code: 'rrif', name: 'RRIF' },
  { code: 'lira', name: 'LIRA' },
];

// Canadian sample data
export const SAMPLE_DATA = {
  transactions: [
    { id: 't1', desc: 'Monthly Salary', amount: 7200, cat: 'Income', date: '2026-02-15', ic: 'trending-up' },
    { id: 't2', desc: 'Rent Payment', amount: -1950, cat: 'Rent/Mortgage', date: '2026-02-01', ic: 'home' },
    { id: 't3', desc: 'Loblaws Grocery', amount: -142.35, cat: 'Food/Groceries', date: '2026-02-20', ic: 'receipt' },
    { id: 't4', desc: 'Crave + Netflix', amount: -22.98, cat: 'Entertainment', date: '2026-02-14', ic: 'award' },
    { id: 't5', desc: 'Petro-Canada', amount: -68.40, cat: 'Transport', date: '2026-02-13', ic: 'activity' },
    { id: 't6', desc: 'Tim Hortons', amount: -5.25, cat: 'Food/Groceries', date: '2026-02-13', ic: 'receipt' },
    { id: 't7', desc: 'Freelance Invoice', amount: 1500, cat: 'Income', date: '2026-02-12', ic: 'trending-up' },
    { id: 't8', desc: 'Hydro One', amount: -138, cat: 'Utilities', date: '2026-02-10', ic: 'activity' },
    { id: 't9', desc: 'Swiss Chalet', amount: -52.80, cat: 'Food/Groceries', date: '2026-02-09', ic: 'receipt' },
    { id: 't10', desc: 'Bell Internet', amount: -89.99, cat: 'Utilities', date: '2026-02-08', ic: 'activity' },
  ],
  goals: [
    { id: 'g1', name: 'Emergency Fund', target: 25000, current: 18750, color: '#10b981', deadline: '2026-06-01' },
    { id: 'g2', name: 'Vacation Fund', target: 6000, current: 3800, color: '#6366f1', deadline: '2026-08-15' },
    { id: 'g3', name: 'Down Payment', target: 80000, current: 32400, color: '#f59e0b', deadline: '2028-06-01' },
  ],
  debts: [
    { id: 'd1', name: 'OSAP Student Loan', balance: 22500, rate: 3.95, min: 380, type: 'loan' },
    { id: 'd2', name: 'TD Visa', balance: 4200, rate: 19.99, min: 126, type: 'credit' },
    { id: 'd3', name: 'Car Loan (RBC)', balance: 15800, rate: 4.49, min: 440, type: 'loan' },
  ],
  investments: [
    { id: 'i1', sym: 'XEQT', name: 'iShares All-Equity ETF', shares: 45, avg: 26.80, price: 31.20, type: 'etf', account_type: 'tfsa' },
    { id: 'i2', sym: 'VFV', name: 'Vanguard S&P 500 (CAD)', shares: 30, avg: 98.50, price: 115.40, type: 'etf', account_type: 'rrsp' },
    { id: 'i3', sym: 'TD-GIC', name: 'TD 1-Year GIC', shares: 1, avg: 10000, price: 10425, type: 'gic', account_type: 'tfsa' },
    { id: 'i4', sym: 'RY', name: 'Royal Bank of Canada', shares: 20, avg: 132.50, price: 148.90, type: 'stock', account_type: 'non-registered' },
  ],
  budgets: [
    { id: 'b1', cat: 'Rent/Mortgage', amt: 2000, color: '#6366f1' },
    { id: 'b2', cat: 'Food/Groceries', amt: 600, color: '#10b981' },
    { id: 'b3', cat: 'Transport', amt: 400, color: '#f59e0b' },
    { id: 'b4', cat: 'Utilities', amt: 350, color: '#ec4899' },
    { id: 'b5', cat: 'Entertainment', amt: 200, color: '#8b5cf6' },
    { id: 'b6', cat: 'Shopping', amt: 300, color: '#14b8a6' },
  ],
  bills: [
    { id: 'br1', title: 'Rent', type: 'bill', amount: 1950, date: '2026-02-25' },
    { id: 'br2', title: 'TD Visa Minimum', type: 'bill', amount: 126, date: '2026-02-22' },
    { id: 'br3', title: 'Salary', type: 'income', amount: 7200, date: '2026-03-01' },
    { id: 'br4', title: 'Car Insurance (Intact)', type: 'bill', amount: 185, date: '2026-02-28' },
  ],
  challenges: [
    { id: 'c1', name: 'No-Spend Weekend', desc: 'Full weekend without spending', xp: 50, target: 2, progress: 0 },
    { id: 'c2', name: 'Skip Tim Hortons', desc: 'No coffee shop visits for 7 days', xp: 75, target: 7, progress: 0 },
    { id: 'c3', name: 'Savings Sprint', desc: 'Save extra $200 this month', xp: 100, target: 200, progress: 0 },
  ],
  communityPosts: [
    { id: 'p1', author: 'CanadianSaver88', avatar: '🍁', title: 'How I maxed my TFSA in 3 years', body: 'Started with automatic $583/month contributions...', likes: 234, comments: 45, time: '3h ago', tags: ['tfsa', 'strategy'] },
    { id: 'p2', author: 'SavvySaver', avatar: '💰', title: 'Best HISA rates in Canada for 2026', body: 'EQ Bank, Tangerine, and Wealthsimple compared...', likes: 189, comments: 32, time: '6h ago', tags: ['savings', 'hisa'] },
    { id: 'p3', author: 'InvestorJane', avatar: '📈', title: 'XEQT vs VEQT - which all-in-one ETF?', body: 'Both are great for Canadian investors. Here is my comparison...', likes: 312, comments: 67, time: '1d ago', tags: ['investing', 'etf'] },
  ],
  education: [
    { id: 'e1', title: 'Understanding TFSA Contribution Room', type: 'article', dur: '8 min', lvl: 'Beginner', r: 4.8 },
    { id: 'e2', title: 'RRSP vs TFSA: Which First?', type: 'video', dur: '15 min', lvl: 'Beginner', r: 4.9 },
    { id: 'e3', title: 'Canadian ETF Portfolio Building', type: 'article', dur: '12 min', lvl: 'Intermediate', r: 4.7 },
    { id: 'e4', title: 'Tax-Loss Harvesting in Canada', type: 'video', dur: '22 min', lvl: 'Advanced', r: 4.6 },
    { id: 'e5', title: 'Debt Snowball vs Avalanche', type: 'tool', dur: '5 min', lvl: 'Beginner', r: 4.8 },
    { id: 'e6', title: 'First Home Savings Account (FHSA)', type: 'article', dur: '10 min', lvl: 'Intermediate', r: 4.7 },
  ],
};
