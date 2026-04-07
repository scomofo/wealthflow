/**
 * next-actions.js
 * Pure utility that analyses app state + financials and returns
 * an array of prioritised "next best action" objects for the dashboard.
 *
 * Dual-mode: CommonJS (Jest / Node) via module.exports at the bottom;
 * ES module export via the `export function` declaration guarded by a
 * try/catch so CJS environments skip it gracefully.
 *
 * Action shape: { icon: string, text: string, priority: 'high'|'medium'|'low', link: string }
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtC(amount) {
  return '$' + Math.abs(amount).toLocaleString('en-CA', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

// ---------------------------------------------------------------------------
// Rule implementations
// ---------------------------------------------------------------------------

/**
 * Budget rules:
 *   >100% spent → high, text includes "over budget"
 *   >80%  spent → high
 */
function checkBudgets(state, financials, actions) {
  const { budgets } = state;
  const { catSpending } = financials;

  for (const budget of budgets) {
    const spent = catSpending[budget.category] || 0;
    const pct = budget.amount > 0 ? spent / budget.amount : 0;

    if (pct > 1) {
      actions.push({
        icon: '⚠️',
        text: `${budget.category} is over budget — spent ${fmtC(spent)} of ${fmtC(budget.amount)}`,
        priority: 'high',
        link: 'budget',
      });
    } else if (pct > 0.8) {
      actions.push({
        icon: '📊',
        text: `${budget.category} budget is ${Math.round(pct * 100)}% used (${fmtC(spent)} of ${fmtC(budget.amount)})`,
        priority: 'high',
        link: 'budget',
      });
    }
  }
}

/**
 * Debt rules:
 *   Any debt with rate >10% and balance >0 → high
 */
function checkDebts(state, _financials, actions) {
  for (const debt of state.debts) {
    if (debt.rate > 10 && debt.balance > 0) {
      actions.push({
        icon: '💳',
        text: `Pay down ${debt.name} — ${fmtC(debt.balance)} at ${debt.rate}% interest`,
        priority: 'high',
        link: 'debts',
      });
    }
  }
}

/**
 * Bill rules:
 *   Overdue (due date < today)          → high
 *   Due within 7 days (not yet overdue) → high
 */
function checkBills(state, _financials, actions) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sevenDaysOut = new Date(today.getTime() + 7 * 86400000);

  for (const bill of state.bills) {
    if (!bill.next_due_date) continue;
    const due = new Date(bill.next_due_date);
    due.setHours(0, 0, 0, 0);

    if (due < today) {
      actions.push({
        icon: '🔴',
        text: `${bill.title} is overdue — ${fmtC(bill.amount)} was due ${bill.next_due_date}`,
        priority: 'high',
        link: 'bills',
      });
    } else if (due <= sevenDaysOut) {
      actions.push({
        icon: '📅',
        text: `${bill.title} is due soon — ${fmtC(bill.amount)} due ${bill.next_due_date}`,
        priority: 'high',
        link: 'bills',
      });
    }
  }
}

/**
 * Registered accounts rule:
 *   TFSA/RRSP contribution room >$1000 → medium
 */
function checkContributionRoom(state, _financials, actions) {
  for (const room of state.contributionRoom) {
    if (room.known_room > 1000) {
      const label = (room.account_type || '').toUpperCase();
      actions.push({
        icon: '🏦',
        text: `You have ${fmtC(room.known_room)} of unused ${label} contribution room`,
        priority: 'medium',
        link: 'registered',
      });
    }
  }
}

/**
 * Goal pace rule:
 *   monthly savings needed > 50% of current monthly savings → medium
 *
 *   monthly savings = income * savingsRate / 100
 */
function checkGoals(state, financials, actions) {
  const { goals } = state;
  const { income, savingsRate } = financials;
  const monthlySavings = (income || 0) * ((savingsRate || 0) / 100);

  for (const goal of goals) {
    if (!goal.deadline) continue;
    const deadlineDate = new Date(goal.deadline);
    const now = new Date();
    const monthsLeft = Math.max(
      (deadlineDate.getFullYear() - now.getFullYear()) * 12 +
        (deadlineDate.getMonth() - now.getMonth()),
      0.5,
    );
    const remaining = (goal.target || 0) - (goal.current || 0);
    if (remaining <= 0) continue;

    const neededPerMonth = remaining / monthsLeft;

    if (neededPerMonth > monthlySavings * 0.5) {
      actions.push({
        icon: '🎯',
        text: `"${goal.name}" goal is behind pace — needs ${fmtC(neededPerMonth)}/mo, saving ${fmtC(monthlySavings)}/mo`,
        priority: 'medium',
        link: 'savings',
      });
    }
  }
}

/**
 * Emergency fund rule:
 *   net worth < 3 months of expenses → medium
 */
function checkEmergencyFund(state, financials, actions) {
  const { netWorth, expenses } = financials;
  if (typeof netWorth === 'number' && typeof expenses === 'number' && expenses > 0) {
    if (netWorth < expenses * 3) {
      actions.push({
        icon: '🛡️',
        text: `Emergency fund is low — net worth ${fmtC(netWorth)} is under 3 months of expenses (${fmtC(expenses * 3)})`,
        priority: 'medium',
        link: 'savings',
      });
    }
  }
}

/**
 * No budgets configured → low
 */
function checkNoBudgets(state, _financials, actions) {
  if (!state.budgets || state.budgets.length === 0) {
    actions.push({
      icon: '📝',
      text: 'Set up budgets to track your spending by category',
      priority: 'low',
      link: 'budget',
    });
  }
}

/**
 * Profile not completed → low
 */
function checkProfile(state, _financials, actions) {
  if (!state.settings || !state.settings.profile_completed) {
    actions.push({
      icon: '👤',
      text: 'Complete your financial profile for personalised advice',
      priority: 'low',
      link: 'advisor',
    });
  }
}

// ---------------------------------------------------------------------------
// Core function
// ---------------------------------------------------------------------------

export function computeNextActions(state, financials) {
  const actions = [];

  checkBudgets(state, financials, actions);
  checkDebts(state, financials, actions);
  checkBills(state, financials, actions);
  checkContributionRoom(state, financials, actions);
  checkGoals(state, financials, actions);
  checkEmergencyFund(state, financials, actions);
  checkNoBudgets(state, financials, actions);
  checkProfile(state, financials, actions);

  actions.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);

  return actions;
}

