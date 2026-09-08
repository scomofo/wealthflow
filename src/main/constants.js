// Shared constants for WealthFlow main process
// Anthropic 4.6+ canonical IDs are pinned dateless snapshots. Keep this list
// deliberate rather than treating model names as evergreen aliases.
const DEFAULT_AI_MODEL = 'claude-sonnet-5';

const LEGACY_AI_MODEL_UPGRADES = Object.freeze({
  'claude-sonnet-4-5-20250929': 'claude-sonnet-5',
  'claude-opus-4-6': 'claude-opus-5',
});

function resolveAiModel(model) {
  const selected = model || DEFAULT_AI_MODEL;
  return LEGACY_AI_MODEL_UPGRADES[selected] || selected;
}

module.exports = {
  DEFAULT_AI_MODEL,
  LEGACY_AI_MODEL_UPGRADES,
  resolveAiModel,
};
