// Simple client-side router
let currentSection = 'dashboard';
let onNavigate = null;

export const NAV_ITEMS = [
  ['dashboard', 'Dashboard', 'home'],
  ['budget', 'AI Budget', 'lightbulb'],
  ['transactions', 'Transactions', 'receipt'],
  ['savings', 'Savings', 'target'],
  ['debts', 'Debts', 'credit-card'],
  ['investments', 'Investments', 'trending-up'],
  ['registered', 'Registered Accts', 'piggy-bank'],
  ['tax-calc', 'Tax Calculator', 'wallet'],
  ['tax-season', 'Tax Season', 'file-text'],
  ['analytics', 'Analytics', 'bar-chart-3'],
  ['planning', 'Planning', 'calculator'],
  ['advisor', 'Financial Profile', 'clipboard-list'],
  ['residence', 'My Home', 'home'],
  ['calendar', 'Calendar', 'calendar'],
  ['education', 'Learn', 'book-open'],
  ['community', 'Community', 'message-square'],
  ['achievements', 'Achievements', 'award'],
  ['settings', 'Settings', 'settings'],
];

export function getSection() { return currentSection; }

export function navigate(section) {
  currentSection = section;
  if (onNavigate) onNavigate(section);
}

export function setOnNavigate(fn) { onNavigate = fn; }

export function getCurrentLabel() {
  const item = NAV_ITEMS.find(n => n[0] === currentSection);
  return item ? item[1] : 'Dashboard';
}
