const crypto = require('crypto');

class ProactiveEngine {
  constructor(database) {
    this.database = database;
  }

  _recentlyShown(type, profile, daysCooldown) {
    const shown = (profile.nudge_shown || {})[type];
    if (!shown) return false;
    const ageDays = (Date.now() - new Date(shown).getTime()) / 86400000;
    return ageDays < daysCooldown;
  }

  _recordNudgesShown(nudges) {
    const profile = this.database.getPersonalizationProfile();
    profile.nudge_shown = profile.nudge_shown || {};
    for (const n of nudges) {
      profile.nudge_shown[n.type + '_' + n.category] = new Date().toISOString();
    }
    this.database.updatePersonalizationProfile(profile);
  }

  _nudge(fields) {
    const message = fields.message || '';
    return {
      id: crypto.createHash('md5').update(message).digest('hex').slice(0, 16),
      related_action_category: fields.category,
      cta_label: 'Focus action',
      ...fields,
    };
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

    // Load profile for cooldown checks
    const profile = this.database.getPersonalizationProfile();

    // 1. Overspending nudge
    if (!this._recentlyShown('risk_budget', profile, 3)) {
      for (const b of budgets) {
        const spent = catSpending[b.category] || 0;
        if (b.amount > 0 && spent > b.amount * 1.15) {
          const over = Math.round(spent - b.amount);
          const pct = Math.round((spent / b.amount - 1) * 100);
          const message = 'You\u2019re already ' + pct + '% over your ' + b.category + ' budget \u2014 tightening now could improve cash flow by $' + over;
          nudges.push(this._nudge({
            type: 'risk',
            message,
            why_now: pct + '% over budget with the month still active',
            priority: 'high',
            category: 'budget',
            expires_at: this._endOfMonth(),
          }));
          break; // max one overspending nudge
        }
      }
    }

    // 2. Bills due soon nudge
    if (!this._recentlyShown('time_bills', profile, 1)) {
      const dueSoon = bills.filter(bl => {
        const due = bl.next_due_date || bl.date;
        if (!due) return false;
        const diff = (new Date(due + 'T00:00:00') - new Date(today + 'T00:00:00')) / 86400000;
        return diff >= 0 && diff <= 3;
      });
      if (dueSoon.length > 0) {
        const message = dueSoon.length + ' bill' + (dueSoon.length !== 1 ? 's' : '') + ' due in the next 3 days';
        nudges.push(this._nudge({
          type: 'time',
          message,
          why_now: 'Due within 3 days',
          priority: 'high',
          category: 'bills',
          expires_at: new Date(Date.now() + 4 * 86400000).toISOString().slice(0, 10),
        }));
      }
    }

    // 3. Opportunity: unused contribution room
    if (!this._recentlyShown('opportunity_investing', profile, 7)) {
      const totalRoom = contributionRoom.reduce((s, cr) => s + (cr.known_room || 0), 0);
      if (totalRoom > 5000 && (financials.savingsRate || 0) > 15) {
        const message = 'You have $' + Math.round(totalRoom).toLocaleString('en-CA') + ' in unused registered account room \u2014 consider a contribution';
        nudges.push(this._nudge({
          type: 'opportunity',
          message,
          why_now: 'Available room and positive cash flow detected',
          priority: 'medium',
          category: 'investing',
          expires_at: this._endOfMonth(),
        }));
      }
    }

    // 4. Risk: debt increasing / high interest
    if (!this._recentlyShown('risk_debt', profile, 7)) {
      const highInterest = debts.filter(d => d.rate >= 15 && d.balance > 0);
      if (highInterest.length > 0) {
        const worst = highInterest.sort((a, b) => b.rate - a.rate)[0];
        const message = worst.name + ' at ' + worst.rate + '% APR is costing you \u2014 prioritize payoff';
        nudges.push(this._nudge({
          type: 'risk',
          message,
          why_now: 'High APR debt is active',
          priority: 'high',
          category: 'debt',
          expires_at: this._endOfMonth(),
        }));
      }
    }

    // 5. Behavior: inactivity (check personalization profile)
    if (!this._recentlyShown('behavior_planning', profile, 7)) {
      if (profile.last_updated) {
        const daysSince = (Date.now() - new Date(profile.last_updated).getTime()) / 86400000;
        if (daysSince > 7) {
          const message = 'You haven\u2019t taken action recently \u2014 review your top priorities';
          nudges.push(this._nudge({
            type: 'behavior',
            message,
            why_now: 'No recent action completion signal',
            priority: 'low',
            category: 'planning',
            expires_at: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
          }));
        }
      }
    }

    // 6. End of month check-in (last 5 days of month)
    if (!this._recentlyShown('time_planning', profile, 3)) {
      const now = new Date();
      const daysLeft = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate();
      if (daysLeft <= 5) {
        const message = daysLeft + ' day' + (daysLeft !== 1 ? 's' : '') + ' left this month \u2014 review your spending and goals';
        nudges.push(this._nudge({
          type: 'time',
          message,
          why_now: 'Month-end decision window',
          priority: 'medium',
          category: 'planning',
          expires_at: this._endOfMonth(),
        }));
      }
    }

    // Sort by priority and return max 2
    const order = { high: 0, medium: 1, low: 2 };
    nudges.sort((a, b) => (order[a.priority] || 2) - (order[b.priority] || 2));
    const result = nudges.slice(0, 2);

    // Record shown timestamps
    try {
      this._recordNudgesShown(result);
    } catch (_) { /* non-critical */ }

    return result;
  }

  _endOfMonth() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  }
}

module.exports = { ProactiveEngine };
