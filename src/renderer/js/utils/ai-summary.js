export function generateAISummary(actions, financials, emphasis) {
  const top = (actions || []).slice(0, 2);
  if (top.length === 0) {
    return {
      headline: 'You are on track this month — no urgent financial actions needed.',
      bullets: [],
      confidence: 'low',
    };
  }

  // Build headline from top actions
  const emphasisPrefix = {
    debt_reduction: 'your biggest gains come from reducing interest drag',
    savings_growth: 'your strongest opportunity is growing your savings',
    spending_control: 'restoring spending control will improve flexibility',
    cashflow_improvement: 'improving cash flow is your top priority',
  };

  let headline;
  if (emphasis && emphasisPrefix[emphasis] && top.length > 0) {
    headline = 'This month, ' + emphasisPrefix[emphasis] + '.';
  } else {
    const themes = top.map(a => summarizeAction(a));
    headline = themes.length === 1
      ? 'This month, your top priority is ' + themes[0].toLowerCase() + '.'
      : 'This month, your biggest gains come from ' + themes[0].toLowerCase() + ' and ' + themes[1].toLowerCase() + '.';
  }

  // Build bullets from action details
  const bullets = top.map(a => {
    if (a.impact_text) return a.impact_text;
    return a.rationale || a.description || a.title;
  }).filter(Boolean);

  const confidence = top.length >= 2 && top[0].score >= 70 ? 'high' : 'medium';

  return { headline, bullets, confidence };
}

function summarizeAction(action) {
  const cat = (action.category || '').toLowerCase();
  const title = action.title || '';

  // Try to create a shorter thematic summary
  if (cat === 'budget') return 'tightening spending in overrun categories';
  if (cat === 'debt') return 'prioritizing debt repayment';
  if (cat === 'bills') return 'staying current on upcoming bills';
  if (cat === 'investing') return 'making use of available contribution room';
  if (cat === 'cashflow') return 'building your emergency fund';
  if (cat === 'planning') return 'completing your financial profile';
  return title.toLowerCase();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { generateAISummary };
}
