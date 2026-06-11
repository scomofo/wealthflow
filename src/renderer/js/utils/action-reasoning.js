export function buildActionBecause(action = {}, financials = {}) {
  const category = (action.category || '').toLowerCase();
  const title = action.title || '';

  if (category === 'budget') {
    const match = title.match(/Reduce\s+(.+?)\s+spending\s+by\s+\$?([\d,]+(?:\.\d+)?)/i);
    if (match) {
      return 'Because ' + match[1] + ' is over target, freeing up $' + match[2] + ' improves monthly flexibility.';
    }
    return 'Because spending pressure is lowering flexibility, this action improves the monthly plan.';
  }

  if (category === 'debt') {
    return 'Because high-interest debt is reducing future flexibility, this should stay near the top.';
  }

  if (category === 'bills') {
    return 'Because this is time-sensitive, handling it now avoids late fees and cash-flow surprises.';
  }

  if (category === 'investing') {
    return 'Because cash flow is available, using registered room can move surplus into tax-advantaged growth.';
  }

  if (category === 'cashflow') {
    const expenses = financials.expenses || 0;
    if (expenses > 0) {
      return 'Because monthly expenses are about $' + Math.round(expenses).toLocaleString('en-CA') + ', cash reserves reduce risk.';
    }
    return 'Because cash reserves reduce the chance of relying on debt when expenses surprise you.';
  }

  const fallback = action.rationale || action.description || action.impact_text || '';
  if (fallback) {
    return 'Because ' + fallback.charAt(0).toLowerCase() + fallback.slice(1);
  }

  return '';
}
