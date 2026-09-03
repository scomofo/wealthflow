function applyTimeDecay(count, lastUpdated) {
  if (!lastUpdated || !count) return count || 0;
  const ageDays = (Date.now() - new Date(lastUpdated).getTime()) / (1000 * 60 * 60 * 24);
  if (ageDays < 7) return count * 1.0;
  if (ageDays < 30) return count * 0.7;
  return count * 0.4;
}

class PersonalizationEngine {
  constructor(database) {
    this.database = database;
  }

  // Build profile from stored signals + current financial state
  buildProfile() {
    const raw = this.database.getPersonalizationProfile();
    const completions = raw.completions || {};
    const dismissals = raw.dismissals || {};
    const completionsUpdated = raw.completions_updated || {};
    const dismissalsUpdated = raw.dismissals_updated || {};
    const focusOpens = raw.focus_opens || 0;

    // Determine primary/secondary focus from completion patterns
    const categories = ['budget', 'debt', 'bills', 'investing', 'cashflow', 'planning'];
    const completionBias = {};
    const dismissBias = {};
    const decayedCompletions = {};

    for (const cat of categories) {
      // Decay from the last time *this category* was interacted with, not
      // raw.last_updated — that timestamp is bumped on every single
      // interaction regardless of category, so using it here would reset
      // every category's decay clock whenever the user does anything at
      // all, and a category untouched for months would never actually
      // decay as long as the user stayed active elsewhere in the app.
      const c = applyTimeDecay(completions[cat] || 0, completionsUpdated[cat] || raw.last_updated);
      const d = applyTimeDecay(dismissals[cat] || 0, dismissalsUpdated[cat] || raw.last_updated);
      decayedCompletions[cat] = c;
      completionBias[cat] = c >= 3 ? 1.15 : c >= 1 ? 1.05 : 1.0;
      dismissBias[cat] = d >= 5 ? 0.85 : d >= 3 ? 0.92 : 1.0;
    }

    // Find primary focus from decayed completions, consistent with the
    // bias/confidence calculations above — using the raw counts here (as a
    // prior version did) let a category the user hasn't touched in months
    // keep outranking one they're actively engaging with now.
    const sorted = categories.slice().sort((a, b) => decayedCompletions[b] - decayedCompletions[a]);
    const primaryFocus = decayedCompletions[sorted[0]] > 0 ? sorted[0] : null;
    const secondaryFocus = decayedCompletions[sorted[1]] > 0 ? sorted[1] : null;

    return {
      primaryFocus,
      secondaryFocus,
      completionBias,
      dismissBias,
      focusModeAffinity: focusOpens >= 3,
      confidence: Object.values(decayedCompletions).reduce((s, v) => s + v, 0) >= 5 ? 'high' : 'medium',
    };
  }

  // Record an interaction event
  recordInteraction(eventType, category) {
    const raw = this.database.getPersonalizationProfile();
    const now = new Date().toISOString();

    switch (eventType) {
      case 'complete':
        raw.completions = raw.completions || {};
        raw.completions[category] = (raw.completions[category] || 0) + 1;
        raw.completions_updated = raw.completions_updated || {};
        raw.completions_updated[category] = now;
        break;
      case 'dismiss':
        raw.dismissals = raw.dismissals || {};
        raw.dismissals[category] = (raw.dismissals[category] || 0) + 1;
        raw.dismissals_updated = raw.dismissals_updated || {};
        raw.dismissals_updated[category] = now;
        break;
      case 'snooze':
        raw.snoozes = raw.snoozes || {};
        raw.snoozes[category] = (raw.snoozes[category] || 0) + 1;
        break;
      case 'focus_open':
        raw.focus_opens = (raw.focus_opens || 0) + 1;
        break;
    }

    raw.last_updated = now;
    this.database.updatePersonalizationProfile(raw);
  }

  // Apply bounded score adjustments to NBA actions
  applyActionWeighting(actions, profile) {
    return actions.map(a => {
      // Urgent actions skip personalization entirely
      if ((a.priority || '').toLowerCase() === 'urgent') {
        return { ...a, personalizedDelta: 0 };
      }

      const cat = (a.category || '').toLowerCase();
      let delta = 0;

      // Completion boost: +5 to +10 for categories user acts on
      const cb = profile.completionBias[cat] || 1.0;
      if (cb > 1.0) delta += Math.round((cb - 1.0) * 50); // max +7.5

      // Dismiss penalty: cap at -3 (mild)
      const db = profile.dismissBias[cat] || 1.0;
      if (db < 1.0) delta += Math.max(-3, Math.round((db - 1.0) * 30));

      // Primary focus boost: +5
      if (profile.primaryFocus === cat) delta += 5;

      // Cap delta to prevent runaway (visibility floor: -5)
      delta = Math.max(-5, Math.min(10, delta));

      return { ...a, score: a.score + delta, personalizedDelta: delta };
    }).sort((a, b) => {
      const aUrgent = (a.priority || '').toLowerCase() === 'urgent';
      const bUrgent = (b.priority || '').toLowerCase() === 'urgent';

      if (aUrgent && !bUrgent) return -1;
      if (!aUrgent && bUrgent) return 1;
      return b.score - a.score;
    });
  }

  // Choose summary emphasis based on profile and financial state
  chooseSummaryEmphasis(profile, financials) {
    const f = financials || {};
    const totalDebt = f.totalDebt || 0;
    const highDebt = totalDebt > 10000;
    const materialDebt = totalDebt > 25000;
    const lowCashflow = (f.savingsRate || 0) < 10;
    const strongCashflow = (f.savingsRate || 0) > 25;

    if (materialDebt) return 'debt_reduction';
    if (highDebt && lowCashflow) return 'debt_reduction';
    if (strongCashflow) return 'savings_growth';
    if (lowCashflow) return 'cashflow_improvement';

    if (profile.primaryFocus === 'debt') return 'debt_reduction';
    if (profile.primaryFocus === 'investing') return 'savings_growth';
    if (profile.primaryFocus === 'budget') return 'spending_control';
    if (profile.primaryFocus === 'cashflow') return 'cashflow_improvement';
    return 'balanced';
  }
}

module.exports = { PersonalizationEngine };
