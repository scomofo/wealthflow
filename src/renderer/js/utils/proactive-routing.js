const FALLBACK_ROUTES = {
  budget: 'budget',
  debt: 'debts',
  bills: 'bills',
  investing: 'registered',
  cashflow: 'savings',
  planning: 'dashboard',
};

function normalizeCategory(value) {
  return String(value || '').toLowerCase();
}

export function findRelatedActionForNudge(nudge = {}, actions = []) {
  if (!nudge || !Array.isArray(actions)) return null;

  if (nudge.related_action_id) {
    const byId = actions.find(a => a && a.id === nudge.related_action_id);
    if (byId) return byId;
  }

  const category = normalizeCategory(nudge.related_action_category || nudge.category);
  if (!category) return null;

  return actions.find(a => normalizeCategory(a.category) === category) || null;
}

export function getNudgeFallbackRoute(category) {
  return FALLBACK_ROUTES[normalizeCategory(category)] || 'dashboard';
}
