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
    expect(weighted[1].id).toBe('investing');
    expect(weighted[1].personalizedDelta).toBeGreaterThan(0);
  });

  test('summary emphasis respects financial guardrail ordering and behavior fallback', () => {
    const engine = makeEngine({ completions: { debt: 4 }, last_updated: new Date().toISOString() });
    const profile = engine.buildProfile();

    expect(engine.chooseSummaryEmphasis(profile, { totalDebt: 25000, savingsRate: 28 })).toBe('savings_growth');
    expect(engine.chooseSummaryEmphasis(profile, { totalDebt: 25001, savingsRate: 28 })).toBe('debt_reduction');
    expect(engine.chooseSummaryEmphasis(profile, { totalDebt: 10001, savingsRate: 9 })).toBe('debt_reduction');
    expect(engine.chooseSummaryEmphasis(profile, { totalDebt: 5000, savingsRate: 28 })).toBe('savings_growth');
    expect(engine.chooseSummaryEmphasis(profile, { totalDebt: 5000, savingsRate: 9 })).toBe('cashflow_improvement');
    expect(engine.chooseSummaryEmphasis(profile, { totalDebt: 5000, savingsRate: 15 })).toBe('debt_reduction');
  });

  test('snooze records behavior without creating dismissal bias', () => {
    const raw = {};
    const engine = makeEngine(raw);

    engine.recordInteraction('snooze', 'budget');
    engine.recordInteraction('snooze', 'budget');
    engine.recordInteraction('snooze', 'budget');
    engine.recordInteraction('snooze', 'budget');
    const profile = engine.buildProfile();

    expect(raw.snoozes.budget).toBe(4);
    expect(raw.dismissals).toBeUndefined();
    expect(profile.dismissBias.budget).toBe(1);
  });
});
