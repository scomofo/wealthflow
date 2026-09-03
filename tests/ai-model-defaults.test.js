// Regression coverage for finding M2: DEFAULT_AI_MODEL and the settings
// page's model picker both still pointed at a superseded Claude model
// (claude-sonnet-4-5-20250929) and an invented one (claude-opus-4-6) that
// was never a real model ID. Since a superseded/nonexistent model ID is
// exactly the kind of thing that silently breaks the AI advisor with an API
// error, pin the known-current model IDs directly rather than just
// asserting "not the old one" (which a new stale ID would still pass).
const { DEFAULT_AI_MODEL } = require('../src/main/constants.js');
const { AI_MODELS } = require('../src/renderer/js/pages/settings-page.js');

const CURRENT_MODEL_IDS = new Set([
  'claude-opus-5',
  'claude-sonnet-5',
  'claude-haiku-4-5-20251001',
]);

describe('AI model identifiers are current', () => {
  test('DEFAULT_AI_MODEL is a currently-supported model', () => {
    expect(CURRENT_MODEL_IDS.has(DEFAULT_AI_MODEL)).toBe(true);
  });

  test('every model offered in Settings is currently-supported', () => {
    for (const m of AI_MODELS) {
      expect(CURRENT_MODEL_IDS.has(m.id)).toBe(true);
    }
  });

  test('the default model is offered as a choice in Settings', () => {
    expect(AI_MODELS.some(m => m.id === DEFAULT_AI_MODEL)).toBe(true);
  });
});
