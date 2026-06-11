export function generateAISummary(actions, financials = {}, emphasis) {
  const top = (actions || []).slice(0, 2);
  const f = financials || {};

  if (top.length === 0) {
    if ((f.savingsRate || 0) < 10) {
      return {
        headline: 'Cash flow is tight right now, so the next useful step is finding one manageable adjustment.',
        bullets: [
          'Savings rate is below 10%, so small spending changes matter more this month.',
          'Refresh actions after adding recent transactions for more precise guidance.',
        ],
        nextFocus: 'Add or import recent transactions, then refresh Next Best Actions.',
        confidence: 'medium',
      };
    }
    return {
      headline: 'You are on track this month - no urgent financial actions need attention.',
      bullets: ['Keep reviewing new transactions so recommendations stay current.'],
      nextFocus: 'Refresh actions after your next transaction import.',
      confidence: 'low',
    };
  }

  const categories = new Set(top.map(a => (a.category || '').toLowerCase()));
  const headline = buildHeadline(top, categories, emphasis, f);
  const bullets = top.map(a => buildActionBullet(a)).filter(Boolean);
  const nextFocus = 'Start with the highest-scoring action: ' + (top[0].title || 'your top recommendation') + '.';
  const confidence = top.length >= 2 && (top[0].score || 0) >= 70 ? 'high' : 'medium';

  return { headline, bullets, nextFocus, confidence };
}

function buildHeadline(top, categories, emphasis, financials) {
  if (categories.has('budget') && categories.has('debt')) {
    return 'This month, the clearest move is freeing up cash flow and using it to reduce interest drag.';
  }
  if (emphasis === 'debt_reduction') {
    return 'This month, reducing interest drag should come before lower-impact optimizations.';
  }
  if (emphasis === 'savings_growth') {
    return 'This month, your strongest opportunity is turning available cash flow into savings growth.';
  }
  if (emphasis === 'cashflow_improvement' || (financials.savingsRate || 0) < 10) {
    return 'This month, improving cash flow is the priority.';
  }
  if (emphasis === 'spending_control') {
    return 'This month, restoring spending control will improve financial flexibility.';
  }
  const themes = top.map(a => summarizeAction(a));
  return themes.length === 1
    ? 'This month, your top priority is ' + themes[0].toLowerCase() + '.'
    : 'This month, your biggest gains come from ' + themes[0].toLowerCase() + ' and ' + themes[1].toLowerCase() + '.';
}

function buildActionBullet(action) {
  const title = action.title || 'This action';
  const category = (action.category || '').toLowerCase();

  if (category === 'budget') {
    const match = title.match(/Reduce\s+(.+?)\s+spending\s+by\s+\$?([\d,]+)/i);
    if (match) return 'Reducing ' + match[1] + ' spending by $' + match[2] + ' this month creates room in the monthly plan.';
  }
  if (category === 'debt') {
    const match = title.match(/Accelerate payoff on (.+?) \(/i);
    if (match) return 'Accelerating ' + match[1] + ' payoff addresses high-interest debt before it compounds further.';
  }
  if (category === 'bills') return 'Handling upcoming bills protects cash flow and avoids avoidable fees.';
  if (category === 'investing') return 'Using registered contribution room turns surplus cash flow into tax-advantaged progress.';
  if (category === 'cashflow') return 'Building cash reserves lowers the risk of relying on debt when expenses surprise you.';

  return action.impact_text || action.rationale || action.description || title;
}

function summarizeAction(action) {
  const cat = (action.category || '').toLowerCase();
  const title = action.title || '';

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
