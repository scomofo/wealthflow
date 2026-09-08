// Shared constants for WealthFlow main process
// Keep the default on an active, current smart model. Anthropic's 4.6+
// canonical model IDs are dateless pinned snapshots rather than evergreen
// aliases, so changing this value is an explicit product upgrade.
const DEFAULT_AI_MODEL = 'claude-sonnet-5';

module.exports = { DEFAULT_AI_MODEL };
