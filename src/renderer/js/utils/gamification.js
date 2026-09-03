// Shared leveling constant for the dashboard's XP system. XP is a running
// total (never reset per level), so the total XP needed to reach the next
// level from zero is level * XP_PER_LEVEL — addXP() (handlers/shared.js)
// derives level from total XP with this same constant, and the dashboard's
// XP progress bar (pages/dashboard.js) uses it to compute progress within
// the current level. Keeping this in one place avoids the two derivations
// drifting apart, as they previously had (leveling used 500 XP/level while
// the progress bar assumed 100 XP/level).
export const XP_PER_LEVEL = 500;
