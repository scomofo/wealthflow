const crypto = require('crypto');

class ProactiveEngine {
  constructor(database) {
    this.database = database;
  }

  evaluate() {
    const nudges = [];
    const financials = this.database.computeFinancials();
    const budgets = this.database.listBudgets();
    const bills = this.database.listBills();
    const debts = this.database.listDebts();
    const contributionRoom = this.database.listContributionRoom();
    const settings = this.database.getSettings();
    const today = new Date().toISOString().slice(0, 10);
    const catSpending = financials.catSpending || {};

    // 1. Overspending nudge
    for (const b of budgets) {
      const spent = catSpending[b.category] || 0;
      if (b.amount > 0 && spent > b.amount * 1.15) {
        const over = Math.round(spent - b.amount);
        nudges.push({
          id: crypto.randomUUID(),
          type: 'risk',
          message: 'You\u2019re overspending in ' + b.category + ' \u2014 tightening by $' + over + ' could improve cash flow',
          priority: 'high',
          category: 'budget',
          expires_at: this._endOfMonth(),
        });
        break; // max one overspending nudge
      }
    }

    // 2. Bills due soon nudge
    const dueSoon = bills.filter(bl => {
      const due = bl.next_due_date || bl.date;
      if (!due) return false;
      const diff = (new Date(due + 'T00:00:00') - new Date(today + 'T00:00:00')) / 86400000;
      return diff >= 0 && diff <= 3;
    });
    if (dueSoon.length > 0) {
      nudges.push({
        id: crypto.randomUUID(),
        type: 'time',
        message: dueSoon.length + ' bill' + (dueSoon.length !== 1 ? 's' : '') + ' due in the next 3 days',
        priority: 'high',
        category: 'bills',
        expires_at: new Date(Date.now() + 4 * 86400000).toISOString().slice(0, 10),
      });
    }

    // 3. Opportunity: unused contribution room
    const totalRoom = contributionRoom.reduce((s, cr) => s + (cr.known_room || 0), 0);
    if (totalRoom > 5000 && (financials.savingsRate || 0) > 15) {
      nudges.push({
        id: crypto.randomUUID(),
        type: 'opportunity',
        message: 'You have $' + Math.round(totalRoom).toLocaleString('en-CA') + ' in unused registered account room \u2014 consider a contribution',
        priority: 'medium',
        category: 'investing',
        expires_at: this._endOfMonth(),
      });
    }

    // 4. Risk: debt increasing / high interest
    const highInterest = debts.filter(d => d.rate >= 15 && d.balance > 0);
    if (highInterest.length > 0) {
      const worst = highInterest.sort((a, b) => b.rate - a.rate)[0];
      nudges.push({
        id: crypto.randomUUID(),
        type: 'risk',
        message: worst.name + ' at ' + worst.rate + '% APR is costing you \u2014 prioritize payoff',
        priority: 'high',
        category: 'debt',
        expires_at: this._endOfMonth(),
      });
    }

    // 5. Behavior: inactivity (check personalization profile)
    const profile = this.database.getPersonalizationProfile();
    if (profile.last_updated) {
      const daysSince = (Date.now() - new Date(profile.last_updated).getTime()) / 86400000;
      if (daysSince > 7) {
        nudges.push({
          id: crypto.randomUUID(),
          type: 'behavior',
          message: 'You haven\u2019t taken action recently \u2014 review your top priorities',
          priority: 'low',
          category: 'planning',
          expires_at: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
        });
      }
    }

    // 6. End of month check-in (last 5 days of month)
    const now = new Date();
    const daysLeft = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate();
    if (daysLeft <= 5) {
      nudges.push({
        id: crypto.randomUUID(),
        type: 'time',
        message: daysLeft + ' day' + (daysLeft !== 1 ? 's' : '') + ' left this month \u2014 review your spending and goals',
        priority: 'medium',
        category: 'planning',
        expires_at: this._endOfMonth(),
      });
    }

    // Sort by priority and return max 2
    const order = { high: 0, medium: 1, low: 2 };
    nudges.sort((a, b) => (order[a.priority] || 2) - (order[b.priority] || 2));
    return nudges.slice(0, 2);
  }

  _endOfMonth() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  }
}

module.exports = { ProactiveEngine };
