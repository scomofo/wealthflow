const { logger } = require('./logger');

class PersonalizationEngine {
  constructor(database) {
    this.database = database;
  }

  // Build profile from stored signals + current financial state
  buildProfile() {
    const raw = this.database.getPersonalizationProfile();
    const completions = raw.completions || {};
    const dismissals = raw.dismissals || {};
    const focusOpens = raw.focus_opens || 0;

    // Determine primary/secondary focus from completion patterns
    const categories = ['budget', 'debt', 'bills', 'investing', 'cashflow', 'planning'];
    const completionBias = {};
    const dismissBias = {};

    for (const cat of categories) {
      const c = completions[cat] || 0;
      const d = dismissals[cat] || 0;
      completionBias[cat] = c >= 3 ? 1.15 : c >= 1 ? 1.05 : 1.0;
      dismissBias[cat] = d >= 5 ? 0.85 : d >= 3 ? 0.92 : 1.0;
    }

    // Find primary focus (most completions)
    const sorted = categories.slice().sort((a, b) => (completions[b] || 0) - (completions[a] || 0));
    const primaryFocus = (completions[sorted[0]] || 0) > 0 ? sorted[0] : null;
    const secondaryFocus = (completions[sorted[1]] || 0) > 0 ? sorted[1] : null;

    return {
      primaryFocus,
      secondaryFocus,
      completionBias,
      dismissBias,
      focusModeAffinity: focusOpens >= 3,
      confidence: Object.values(completions).reduce((s, v) => s + v, 0) >= 5 ? 'high' : 'medium',
    };
  }

  // Record an interaction event
  recordInteraction(eventType, category) {
    const raw = this.database.getPersonalizationProfile();

    switch (eventType) {
      case 'complete':
        raw.completions = raw.completions || {};
        raw.completions[category] = (raw.completions[category] || 0) + 1;
        break;
      case 'dismiss':
        raw.dismissals = raw.dismissals || {};
        raw.dismissals[category] = (raw.dismissals[category] || 0) + 1;
        break;
      case 'snooze':
        raw.snoozes = raw.snoozes || {};
        raw.snoozes[category] = (raw.snoozes[category] || 0) + 1;
        break;
      case 'focus_open':
        raw.focus_opens = (raw.focus_opens || 0) + 1;
        break;
    }

    raw.last_updated = new Date().toISOString();
    this.database.updatePersonalizationProfile(raw);
  }

  // Apply bounded score adjustments to NBA actions
  applyActionWeighting(actions, profile) {
    return actions.map(a => {
      const cat = (a.category || '').toLowerCase();
      let delta = 0;

      // Completion boost: +5 to +10 for categories user acts on
      const cb = profile.completionBias[cat] || 1.0;
      if (cb > 1.0) delta += Math.round((cb - 1.0) * 50); // max +7.5

      // Dismiss penalty: -5 for categories user ignores
      const db = profile.dismissBias[cat] || 1.0;
      if (db < 1.0) delta += Math.round((db - 1.0) * 50); // max -7.5

      // Primary focus boost: +5
      if (profile.primaryFocus === cat) delta += 5;

      // Cap delta to prevent runaway
      delta = Math.max(-10, Math.min(10, delta));

      return { ...a, score: a.score + delta, personalizedDelta: delta };
    }).sort((a, b) => b.score - a.score);
  }

  // Choose summary emphasis based on profile
  chooseSummaryEmphasis(profile) {
    if (profile.primaryFocus === 'debt') return 'debt_reduction';
    if (profile.primaryFocus === 'investing') return 'savings_growth';
    if (profile.primaryFocus === 'budget') return 'spending_control';
    if (profile.primaryFocus === 'cashflow') return 'cashflow_improvement';
    return 'balanced';
  }
}

module.exports = { PersonalizationEngine };
