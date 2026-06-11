const { PersonalizationEngine } = require('../src/main/personalization-engine');

function makeEngine(raw = {}) {
  return new PersonalizationEngine({
    getPersonalizationProfile: () => raw,
    updatePersonalizationProfile: (next) => Object.assign(raw, next),
  });
}

describe('PersonalizationEngine guardrails', () => {
  test('urgent actions keep their score and rank ahead of personalized preferences', () => {
    const engine = makeEngine({ completions: { investing: 8 }, dismissals: { debt: 8 }, last_updated: new Date().toISOString() });
    const profile = engine.buildProfile();
    const weighted = engine.applyActionWeighting([
      { id: 'urgent-debt', category: 'debt', priority: 'urgent', score: 88 },
      { id: 'investing', category: 'investing', priority: 'medium', score: 86 },
    ], profile);

    expect(weighted[0].id).toBe('urgent-debt');
    expect(weighted[0].score).toBe(88);
    expect(weighted[0].personalizedDelta).toBe(0);
  });

  test('high material debt wins summary emphasis even with strong cash flow', () => {
    const engine = makeEngine({ completions: { investing: 4 }, last_updated: new Date().toISOString() });
    const profile = engine.buildProfile();

    expect(engine.chooseSummaryEmphasis(profile, { totalDebt: 30000, savingsRate: 28 })).toBe('debt_reduction');
  });

  test('snooze records behavior without creating dismissal bias', () => {
    const raw = {};
    const engine = makeEngine(raw);

    engine.recordInteraction('snooze', 'budget');
    const profile = engine.buildProfile();

    expect(raw.snoozes.budget).toBe(1);
    expect(profile.dismissBias.budget).toBe(1);
  });
});
