// Regression coverage for the personalization-engine decay/confidence bugs
// described in the app review (finding L5):
//
//  1. buildProfile() decayed completions/dismissals per-category for bias
//     scoring, but decided primaryFocus/secondaryFocus and `confidence`
//     from the *raw*, undecayed counts — so a category the user hasn't
//     touched in months could still dominate primary focus and inflate
//     confidence even though its influence on scoring had already faded.
//  2. All categories decayed off a single shared `raw.last_updated`
//     timestamp that recordInteraction() bumps on *every* interaction
//     regardless of category — so as long as the user did anything at all
//     in the app, every category's decay clock kept resetting, and a
//     category genuinely untouched for months never actually decayed.
const { PersonalizationEngine } = require('../src/main/personalization-engine');

function makeEngine(raw = {}) {
  return new PersonalizationEngine({
    getPersonalizationProfile: () => raw,
    updatePersonalizationProfile: (next) => Object.assign(raw, next),
  });
}

function daysAgo(days) {
  return new Date(Date.now() - days * 86400000).toISOString();
}

describe('PersonalizationEngine decay', () => {
  test('a category untouched for 10 days keeps decaying even though another category was just used', () => {
    // 'investing' was completed 10 days ago (4 completions, should decay
    // to the 0.7x tier: 4 * 0.7 = 2.8, below the >=3 threshold for the
    // 1.15x bias). 'debt' is completed just now via recordInteraction().
    // Before this fix, every category shared one raw.last_updated
    // timestamp that recordInteraction() bumps on *every* call regardless
    // of category — so recording the 'debt' completion would reset
    // 'investing' back to "just updated" too (ageDays < 7, no decay,
    // 4 >= 3 -> 1.15x), even though investing itself hasn't been touched
    // in 10 days.
    const raw = {
      completions: { investing: 4 },
      completions_updated: { investing: daysAgo(10) },
      last_updated: daysAgo(10),
    };
    const engine = makeEngine(raw);
    engine.recordInteraction('complete', 'debt'); // bumps raw.last_updated to "now"

    const profile = engine.buildProfile();

    expect(profile.completionBias.investing).toBeCloseTo(1.05);
  });

  test('primary focus is chosen from decayed, not raw, completion counts', () => {
    // 'investing' has more raw completions (8) but is stale (90 days old,
    // decays to 8 * 0.4 = 3.2). 'debt' has fewer raw completions (4) but
    // is recent (decays to 4 * 1.0 = 4). Decayed, debt > investing, so
    // debt should be primary focus — the old code compared raw counts and
    // would have picked investing (8 > 4) regardless of staleness.
    const raw = {
      completions: { investing: 8, debt: 4 },
      completions_updated: { investing: daysAgo(90), debt: daysAgo(1) },
    };
    const engine = makeEngine(raw);
    const profile = engine.buildProfile();

    expect(profile.primaryFocus).toBe('debt');
  });

  test('confidence reflects decayed completions, not the raw sum', () => {
    // Raw completions sum to 6 (>= 5 -> 'high' under the old, undecayed
    // logic), but every category is 90+ days stale (0.4x), so the decayed
    // sum is 2.4 (< 5) and confidence should read 'medium'.
    const raw = {
      completions: { investing: 3, debt: 3 },
      completions_updated: { investing: daysAgo(90), debt: daysAgo(90) },
    };
    const engine = makeEngine(raw);
    const profile = engine.buildProfile();

    expect(profile.confidence).toBe('medium');
  });

  test('recordInteraction stamps a per-category timestamp used for that category\'s own decay', () => {
    const raw = {};
    const engine = makeEngine(raw);
    engine.recordInteraction('complete', 'budget');

    expect(raw.completions_updated.budget).toBeDefined();
    expect(new Date(raw.completions_updated.budget).getTime()).toBeCloseTo(Date.now(), -2);
  });
});
