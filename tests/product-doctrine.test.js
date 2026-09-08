/* global __dirname */

const fs = require('fs');
const path = require('path');

function readRepoFile(...parts) {
  return fs.readFileSync(path.join(__dirname, '..', ...parts), 'utf8');
}

describe('product doctrine guardrails', () => {
  test('dashboard keeps Next Best Actions ahead of supporting context', () => {
    const source = readRepoFile('src', 'renderer', 'js', 'pages', 'dashboard.js');

    const nextBest = source.indexOf('renderNextBestActionsPanel(');
    const snapshot = source.indexOf('renderFinancialSnapshotBar(');
    const summary = source.indexOf('renderAISummary(');
    const progress = source.indexOf('renderProgressStrip(');

    expect(nextBest).toBeGreaterThan(-1);
    expect(snapshot).toBeGreaterThan(nextBest);
    expect(summary).toBeGreaterThan(snapshot);
    expect(progress).toBeGreaterThan(summary);
  });

  test('dashboard reinforces progress without XP, levels, or collectible badges', () => {
    const source = readRepoFile('src', 'renderer', 'js', 'pages', 'dashboard.js');

    expect(source).not.toContain('BADGE_DEFS');
    expect(source).not.toContain('earnedBadges');
    expect(source).not.toContain('xpForNext');
    expect(source).not.toMatch(/\bXP\b/);
    expect(source).not.toMatch(/>Lv\s/);
  });

  test('CLAUDE.md records implemented roadmap items as current capabilities', () => {
    const source = readRepoFile('CLAUDE.md');

    expect(source).toContain('Personalization — bounded adaptation');
    expect(source).toContain('Guided Onboarding — fast path to useful decisions');
    expect(source).toContain('Can I Afford This? — deterministic affordability workflow');
    expect(source).toContain('Proactive Guidance');
    expect(source).toContain('Avoid:\n- XP,\n- levels,\n- collectible badges');
  });
});
