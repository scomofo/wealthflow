const crypto = require('crypto');

function scoreToPriority(score) {
  if (score >= 85) return 'urgent';
  if (score >= 70) return 'high';
  if (score >= 50) return 'medium';
  return 'low';
}

function makeAction(fields) {
  const score = fields.score || 0;
  return {
    id: crypto.randomUUID(),
    source_type: 'rule',
    priority: scoreToPriority(score),
    related_entity_type: null,
    related_entity_id: null,
    ...fields,
  };
}

class NextBestActionsEngine {
  constructor(database) {
    this.database = database;
  }

  async generateActions() {
    const db = this.database;

    // 1. Gather financial state
    const budgets = db.listBudgets();
    const debts = db.listDebts();
    const bills = db.listBills();
    const goals = db.listGoals();
    const contributionRoom = db.listContributionRoom
      ? db.listContributionRoom()
      : db.getContributionRoom();
    const settings = db.getSettings();
    const financials = db.computeFinancials();

    // 2. Run all rules
    const candidates = [
      ...this._ruleBudgetOverrun(budgets, financials),
      ...this._ruleHighInterestDebt(debts),
      ...this._ruleBillsDueSoon(bills),
      ...this._ruleLowEmergencyFund(goals, financials, debts),
      ...this._ruleUnusedContributionRoom(contributionRoom, financials),
      ...this._ruleGoalOffTrack(goals),
      ...this._ruleMissingProfile(settings),
    ];

    // 3. Fetch existing actions (all statuses)
    const existing = db.listNextBestActions();

    // 4. Filter out candidates whose action_key was completed within 7 days
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentlyCompletedKeys = new Set(
      existing
        .filter(
          (a) =>
            (a.status === 'completed' || a.status === 'done') &&
            a.completed_at &&
            new Date(a.completed_at).getTime() > sevenDaysAgo
        )
        .map((a) => a.action_key)
    );

    const filtered = candidates.filter(
      (c) => !recentlyCompletedKeys.has(c.action_key)
    );

    // 5. Persist via upsert
    for (const action of filtered) {
      db.upsertNextBestAction(action);
    }

    // 6. Clear stale open actions
    const activeKeys = filtered.map((a) => a.action_key);
    db.clearStaleNextBestActions(activeKeys);

    // 7. Return sorted open actions with personalization weighting
    try {
      const { PersonalizationEngine } = require('./personalization-engine');
      const pe = new PersonalizationEngine(this.database);
      const profile = pe.buildProfile();
      const openActions = db.listNextBestActions('open');
      return pe.applyActionWeighting(openActions, profile);
    } catch (err) {
      return db.listNextBestActions('open');
    }
  }

  _ruleBudgetOverrun(budgets, financials) {
    const actions = [];
    const catSpending = financials.catSpending || {};
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');

    // Determine top 3 spending categories
    const spendingEntries = Object.entries(catSpending).sort(
      (a, b) => b[1] - a[1]
    );
    const top3 = new Set(spendingEntries.slice(0, 3).map((e) => e[0]));

    for (const budget of budgets) {
      const spending = catSpending[budget.category] || 0;
      const overage = spending - budget.amount;
      const threshold = Math.max(50, budget.amount * 0.1);

      if (spending > budget.amount && overage > threshold) {
        let score = 70;
        if (overage / budget.amount > 0.2) score += 10;
        if (top3.has(budget.category)) score += 10;

        const key = `budget_overrun_${budget.category
          .toLowerCase()
          .replace(/\s+/g, '_')}_${year}_${month}`;

        actions.push(
          makeAction({
            action_key: key,
            title: `Reduce ${budget.category} spending by $${overage.toLocaleString('en-CA')} this month`,
            description: `You are over budget in ${budget.category} based on current monthly spending.`,
            rationale:
              'Overspending in this category is reducing your monthly cash flow.',
            category: 'budget',
            score,
            related_entity_type: 'budget',
            related_entity_id: budget.id,
            impact_text: `Freeing up $${overage.toLocaleString('en-CA')}/mo improves monthly cash flow.`,
          })
        );
      }
    }
    return actions;
  }

  _ruleHighInterestDebt(debts) {
    const actions = [];
    for (const debt of debts) {
      const rate = debt.rate || 0;
      const balance = debt.balance || 0;
      if (rate >= 8 && balance > 0) {
        let score = 80;
        if (rate >= 15) score += 10;
        if (balance > 5000) score += 5;

        const key = `high_interest_debt_${debt.name
          .toLowerCase()
          .replace(/\s+/g, '_')}`;

        actions.push(
          makeAction({
            action_key: key,
            title: `Accelerate payoff on ${debt.name} (${rate}% APR)`,
            description: `${debt.name} has a high interest rate of ${rate}% with a balance of $${balance.toLocaleString('en-CA')}.`,
            rationale:
              'High-interest debt erodes your wealth faster than most investments grow.',
            category: 'debt',
            score,
            related_entity_type: 'debt',
            related_entity_id: debt.id,
            impact_text: `Paying off $${balance.toLocaleString('en-CA')} at ${rate}% saves significant interest.`,
          })
        );
      }
    }
    return actions;
  }

  _ruleBillsDueSoon(bills) {
    const actions = [];
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    for (const bill of bills) {
      if (!bill.next_due_date) continue;
      const dueDate = new Date(bill.next_due_date + 'T00:00:00');
      const diffMs = dueDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      const overdue = diffDays < 0;

      if (diffDays <= 3) {
        let score = 90;
        if (bill.amount > 500) score += 5;

        let titleSuffix;
        if (overdue) {
          titleSuffix = 'overdue';
        } else if (diffDays === 0) {
          titleSuffix = 'due today';
        } else {
          titleSuffix = `due in ${diffDays} day${diffDays !== 1 ? 's' : ''}`;
        }

        actions.push(
          makeAction({
            action_key: `bill_due_${bill.id}`,
            title: `${bill.title} is ${titleSuffix} ($${bill.amount.toLocaleString('en-CA')})`,
            description: `Your bill "${bill.title}" is ${titleSuffix}.`,
            rationale: 'Paying bills on time avoids late fees and protects your credit.',
            category: 'bills',
            score,
            related_entity_type: 'bill',
            related_entity_id: bill.id,
            impact_text: `Timely payment of $${bill.amount.toLocaleString('en-CA')} avoids penalties.`,
          })
        );
      }
    }
    return actions;
  }

  _ruleLowEmergencyFund(goals, financials, debts) {
    const totalGoalSavings = goals.reduce(
      (sum, g) => sum + (g.current_amount || 0),
      0
    );
    const monthlyExpenses = financials.expenses || 0;

    if (monthlyExpenses > 0 && totalGoalSavings < monthlyExpenses) {
      let score = 75;
      if (debts && debts.length > 0) score += 10;

      return [
        makeAction({
          action_key: 'low_emergency_fund',
          title: 'Build emergency fund to cover at least 1 month of expenses',
          description: `Your total goal savings ($${totalGoalSavings.toLocaleString('en-CA')}) are below 1 month of expenses ($${monthlyExpenses.toLocaleString('en-CA')}).`,
          rationale:
            'An emergency fund protects you from unexpected expenses and income disruption.',
          category: 'cashflow',
          score,
          impact_text: `Having $${monthlyExpenses.toLocaleString('en-CA')} in emergency savings provides essential financial security.`,
        }),
      ];
    }
    return [];
  }

  _ruleUnusedContributionRoom(contributionRoom, financials) {
    const actions = [];
    const income = financials.income || 0;
    const expenses = financials.expenses || 0;

    if (income <= expenses) return actions;

    for (const cr of contributionRoom) {
      const room = cr.known_room ?? cr.room ?? 0;
      if (room > 0) {
        let score = 60;
        if (room > 5000) score += 10;

        actions.push(
          makeAction({
            action_key: `contribution_room_${cr.account_type}`,
            title: `Review your ${cr.account_type} room and make a contribution ($${room.toLocaleString('en-CA')} available)`,
            description: `You have $${room.toLocaleString('en-CA')} of unused ${cr.account_type} contribution room.`,
            rationale:
              'Maximizing registered account contributions provides tax advantages.',
            category: 'investing',
            score,
            related_entity_type: 'contribution_room',
            impact_text: `Contributing to your ${cr.account_type} uses $${room.toLocaleString('en-CA')} in available room.`,
          })
        );
      }
    }
    return actions;
  }

  _ruleGoalOffTrack(goals) {
    const actions = [];
    const now = new Date();

    for (const goal of goals) {
      if (!goal.deadline) continue;

      const deadline = new Date(goal.deadline + 'T00:00:00');
      const monthsLeft =
        (deadline.getFullYear() - now.getFullYear()) * 12 +
        (deadline.getMonth() - now.getMonth());

      if (monthsLeft <= 0) continue;

      const remaining = (goal.target_amount || 0) - (goal.current_amount || 0);
      if (remaining <= 0) continue;

      const monthlyNeeded = remaining / monthsLeft;
      const monthlySavings = goal.monthly_contribution || 0;

      if (monthlyNeeded > monthlySavings * 0.5) {
        let score = 65;
        if (monthsLeft <= 6) score += 10;

        actions.push(
          makeAction({
            action_key: `goal_behind_${goal.id}`,
            title: `Increase savings for ${goal.name} to stay on target`,
            description: `You need ~$${Math.round(monthlyNeeded).toLocaleString('en-CA')}/mo to reach ${goal.name} by ${goal.deadline}, but are saving $${monthlySavings.toLocaleString('en-CA')}/mo.`,
            rationale:
              'Adjusting your savings rate now helps you reach your goal on time.',
            category: 'planning',
            score,
            related_entity_type: 'goal',
            related_entity_id: goal.id,
            impact_text: `Increasing contributions keeps your ${goal.name} goal on track.`,
          })
        );
      }
    }
    return actions;
  }

  _ruleMissingProfile(settings) {
    if (!settings || !settings.profile_completed) {
      return [
        makeAction({
          action_key: 'missing_profile',
          title: 'Complete your financial profile for better recommendations',
          description:
            'Your financial profile is incomplete. Completing it helps us give you personalized advice.',
          rationale:
            'A complete profile enables more accurate and relevant financial recommendations.',
          category: 'planning',
          score: 40,
          impact_text:
            'Better recommendations lead to improved financial outcomes.',
        }),
      ];
    }
    return [];
  }
}

module.exports = { NextBestActionsEngine };
