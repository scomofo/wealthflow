/**
 * Structured prompt templates for the three AI workflow types in WealthFlow.
 * Each function returns a prompt string instructing Claude to return valid JSON only.
 */

/**
 * Extract TFSA and RRSP contribution room from the contributionRoom array.
 */
function getContributionRoom(contributionRoom) {
  const tfsa = (contributionRoom || []).find(r => r.account_type === 'tfsa');
  const rrsp = (contributionRoom || []).find(r => r.account_type === 'rrsp');
  return {
    tfsa: tfsa ? (tfsa.known_room || 0) : 0,
    rrsp: rrsp ? (rrsp.known_room || 0) : 0,
  };
}

/**
 * Build the TFSA vs RRSP optimizer prompt.
 * @param {Object} financialData - { financials, budgets, debts, investments, goals, contributionRoom, advisorProfile, settings }
 * @returns {string}
 */
function buildTfsaRrspPrompt(financialData) {
  const { financials = {}, debts = [], goals = [], contributionRoom = [], advisorProfile = {}, settings = {} } = financialData;

  const province = settings.province || advisorProfile?.personal?.province || 'Unknown';
  const annualIncome = advisorProfile?.employment?.annual_gross_income || financials.income * 12 || 0;
  const monthlyExpenses = financials.expenses || 0;
  const savingsRate = financials.savingsRate || 0;
  const room = getContributionRoom(contributionRoom);

  const debtSummary = debts.length
    ? debts.map(d => `  - ${d.name}: balance $${(d.balance || 0).toLocaleString('en-CA')}, APR ${d.rate || d.apr || 0}%, min payment $${(d.min_payment || 0).toLocaleString('en-CA')}/mo`).join('\n')
    : '  None';

  const goalSummary = goals.length
    ? goals.map(g => `  - ${g.name}: target $${(g.target || 0).toLocaleString('en-CA')}, saved $${(g.current || 0).toLocaleString('en-CA')}`).join('\n')
    : '  None';

  return `You are a Canadian financial advisor specializing in registered accounts and tax optimization.

Your task is to analyze the user's financial situation and recommend whether their next contribution should go to their TFSA, RRSP, or a split between both.

USER FINANCIAL DATA:
- Province: ${province}
- Annual gross income: $${annualIncome.toLocaleString('en-CA')}
- Monthly expenses: $${monthlyExpenses.toLocaleString('en-CA')}
- Savings rate: ${savingsRate}%
- TFSA contribution room: $${room.tfsa.toLocaleString('en-CA')}
- RRSP contribution room: $${room.rrsp.toLocaleString('en-CA')}

Debts:
${debtSummary}

Financial goals:
${goalSummary}

INSTRUCTIONS:
- Do not fabricate missing financial details.
- If confidence is limited, state medium or low confidence.
- Return valid JSON only — no prose, no markdown fences, no explanation outside the JSON.

Return exactly this JSON structure:
{
  "workflow_type": "tfsa_rrsp_optimizer",
  "summary": "string — one or two sentence summary of your recommendation",
  "recommendation": {
    "primary_action": "string — the single most important action to take",
    "allocation": {
      "tfsa": "percentage or dollar amount to contribute to TFSA",
      "rrsp": "percentage or dollar amount to contribute to RRSP"
    }
  },
  "why": ["array of strings — key reasons supporting this recommendation"],
  "tradeoffs": ["array of strings — tradeoffs or risks of this approach"],
  "next_actions": [
    { "title": "string", "type": "string", "priority": "high|medium|low" }
  ],
  "confidence": "high|medium|low",
  "disclaimer": "string"
}`;
}

/**
 * Build the debt vs investing decision prompt.
 * @param {Object} financialData
 * @returns {string}
 */
function buildDebtVsInvestingPrompt(financialData) {
  const { financials = {}, debts = [], investments = [], goals = [], contributionRoom = [], advisorProfile = {}, settings = {} } = financialData;

  const province = settings.province || advisorProfile?.personal?.province || 'Unknown';
  const annualIncome = advisorProfile?.employment?.annual_gross_income || financials.income * 12 || 0;
  const monthlyIncome = financials.income || 0;
  const monthlyExpenses = financials.expenses || 0;
  const savingsRate = financials.savingsRate || 0;
  const room = getContributionRoom(contributionRoom);

  const debtSummary = debts.length
    ? debts.map(d => `  - ${d.name}: balance $${(d.balance || 0).toLocaleString('en-CA')}, APR ${d.rate || d.apr || 0}%, min payment $${(d.min_payment || 0).toLocaleString('en-CA')}/mo`).join('\n')
    : '  None';

  const investmentSummary = investments.length
    ? investments.map(i => `  - ${i.symbol || i.name || 'Unknown'}: ${i.shares || 0} shares @ $${(i.current_price || 0).toLocaleString('en-CA')}`).join('\n')
    : '  None';

  const goalSummary = goals.length
    ? goals.map(g => `  - ${g.name}: target $${(g.target || 0).toLocaleString('en-CA')}, saved $${(g.current || 0).toLocaleString('en-CA')}`).join('\n')
    : '  None';

  return `You are a Canadian financial advisor helping a client decide between accelerating debt paydown versus investing.

USER FINANCIAL DATA:
- Province: ${province}
- Annual gross income: $${annualIncome.toLocaleString('en-CA')}
- Monthly income: $${monthlyIncome.toLocaleString('en-CA')}
- Monthly expenses: $${monthlyExpenses.toLocaleString('en-CA')}
- Savings rate: ${savingsRate}%
- TFSA contribution room: $${room.tfsa.toLocaleString('en-CA')}
- RRSP contribution room: $${room.rrsp.toLocaleString('en-CA')}

Debts (with APR):
${debtSummary}

Current investments:
${investmentSummary}

Financial goals:
${goalSummary}

INSTRUCTIONS:
- Do not fabricate missing financial details.
- If confidence is limited, state medium or low confidence.
- Return valid JSON only — no prose, no markdown fences, no explanation outside the JSON.

Return exactly this JSON structure:
{
  "workflow_type": "debt_vs_investing",
  "summary": "string — one or two sentence summary of your recommendation",
  "recommendation": {
    "primary_action": "string — the single most important action to take",
    "priority_order": ["array of strings — ordered list: debts and accounts to prioritize, highest first"]
  },
  "why": ["array of strings — key reasons supporting this recommendation"],
  "tradeoffs": ["array of strings — tradeoffs or risks of this approach"],
  "next_actions": [
    { "title": "string", "type": "string", "priority": "high|medium|low" }
  ],
  "confidence": "high|medium|low",
  "disclaimer": "string"
}`;
}

/**
 * Build the monthly action planner prompt.
 * @param {Object} financialData
 * @returns {string}
 */
function buildMonthlyPlannerPrompt(financialData) {
  const { financials = {}, budgets = [], debts = [], goals = [], contributionRoom = [], advisorProfile = {}, settings = {} } = financialData;

  const province = settings.province || advisorProfile?.personal?.province || 'Unknown';
  const monthlyIncome = financials.income || 0;
  const monthlyExpenses = financials.expenses || 0;
  const savingsRate = financials.savingsRate || 0;
  const room = getContributionRoom(contributionRoom);

  // Build budget status with spending percentages
  const catSpending = financials.catSpending || {};
  const budgetStatus = budgets.length
    ? budgets.map(b => {
        const spent = catSpending[b.category] || 0;
        const pct = b.amount > 0 ? Math.round((spent / b.amount) * 100) : 0;
        return `  - ${b.category}: budgeted $${(b.amount || 0).toLocaleString('en-CA')}, spent $${spent.toLocaleString('en-CA')} (${pct}%)`;
      }).join('\n')
    : '  No budget data available';

  const debtSummary = debts.length
    ? debts.map(d => `  - ${d.name}: balance $${(d.balance || 0).toLocaleString('en-CA')}, APR ${d.rate || d.apr || 0}%`).join('\n')
    : '  None';

  const goalSummary = goals.length
    ? goals.map(g => `  - ${g.name}: target $${(g.target || 0).toLocaleString('en-CA')}, saved $${(g.current || 0).toLocaleString('en-CA')}`).join('\n')
    : '  None';

  return `You are a Canadian financial advisor creating a personalized monthly financial action plan.

Your task is to identify the top 3–5 highest-impact financial actions this person should take this month.

USER FINANCIAL DATA:
- Province: ${province}
- Monthly income: $${monthlyIncome.toLocaleString('en-CA')}
- Monthly expenses: $${monthlyExpenses.toLocaleString('en-CA')}
- Savings rate: ${savingsRate}%
- TFSA contribution room: $${room.tfsa.toLocaleString('en-CA')}
- RRSP contribution room: $${room.rrsp.toLocaleString('en-CA')}

Budget status (spending % of budget):
${budgetStatus}

Debts:
${debtSummary}

Financial goals:
${goalSummary}

INSTRUCTIONS:
- Do not fabricate missing financial details.
- If confidence is limited, state medium or low confidence.
- Focus on actionable, specific steps the user can take this month.
- Return valid JSON only — no prose, no markdown fences, no explanation outside the JSON.

Return exactly this JSON structure:
{
  "workflow_type": "monthly_action_planner",
  "summary": "string — one or two sentence overview of this month's financial priorities",
  "recommendation": {
    "primary_action": "string — the single most important action to take this month"
  },
  "top_actions": [
    {
      "title": "string — concise action title",
      "impact": "string — expected benefit or dollar impact",
      "effort": "low|medium|high",
      "priority": "high|medium|low"
    }
  ],
  "why": ["array of strings — key reasons these actions were chosen"],
  "confidence": "high|medium|low",
  "disclaimer": "string"
}`;
}

module.exports = { buildTfsaRrspPrompt, buildDebtVsInvestingPrompt, buildMonthlyPlannerPrompt };
