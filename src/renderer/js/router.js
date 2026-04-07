// Grouped navigation router
let currentSection = 'dashboard';
let onNavigate = null;

export const NAV_GROUPS = [
  {
    id: 'home',
    label: 'Home',
    icon: 'home',
    items: [
      ['dashboard', 'Dashboard', 'home'],
      ['advisor', 'Financial Profile', 'clipboard-list'],
      ['residence', 'My Home', 'home'],
    ],
  },
  {
    id: 'money',
    label: 'Money',
    icon: 'wallet',
    items: [
      ['transactions', 'Transactions', 'receipt'],
      ['budget', 'Budget', 'lightbulb'],
      ['bills', 'Bills', 'calendar'],
      ['debts', 'Debts', 'credit-card'],
    ],
  },
  {
    id: 'growth',
    label: 'Growth',
    icon: 'trending-up',
    items: [
      ['investments', 'Investments', 'trending-up'],
      ['registered', 'Registered Accts', 'piggy-bank'],
      ['savings', 'Savings Goals', 'target'],
    ],
  },
  {
    id: 'plan',
    label: 'Plan',
    icon: 'calculator',
    items: [
      ['tax-calc', 'Tax Calculator', 'wallet'],
      ['tax-season', 'Tax Season', 'file-text'],
      ['planning', 'Planning', 'calculator'],
      ['analytics', 'Analytics', 'bar-chart-3'],
    ],
  },
];

export const ALL_ROUTES = [
  ...NAV_GROUPS.flatMap(g => g.items),
  ['settings', 'Settings', 'settings'],
];

export function getSection() { return currentSection; }

export function navigate(section) {
  currentSection = section;
  if (onNavigate) onNavigate(section);
}

export function setOnNavigate(fn) { onNavigate = fn; }

export function getCurrentLabel() {
  const item = ALL_ROUTES.find(n => n[0] === currentSection);
  return item ? item[1] : 'Dashboard';
}

export function getGroupForSection(section) {
  for (const g of NAV_GROUPS) {
    if (g.items.some(item => item[0] === section)) return g.id;
  }
  return null;
}
