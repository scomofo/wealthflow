# WealthFlow — Deep App Inspection & Review (2026-09-02)

Scope: the whole app at commit `a4c7ac1` — Electron main process, IPC boundary, sql.js data layer and migrations, the rule/intelligence engines, the AI layer, the renderer (pages, components, handlers, state, Canadian calculators, CSS), tests, CI, packaging and docs. Static review plus running the project's own checks. No code was changed.

## Verdict in one paragraph

The shell is well hardened (context isolation, no Node in the renderer, strict CSP, allow-listed preload, bound SQL params, encrypted API key) and the codebase is organised the way `CLAUDE.md` says it should be. The problems are in the product logic underneath: the number every rule, budget and AI prompt treats as "this month" is actually an all-time total, three features call a browser API Electron does not support, several engines read columns that do not exist, the finance database is rewritten non-atomically with no backup, and the AI chat breaks on the 11th message. Most of these are cheap to fix and none are architectural. The test suite is fast and green (219 tests) but mocks around the exact seams where the bugs live.

## Baseline

| Check | Result |
|---|---|
| `npm run lint` | clean, 0 warnings |
| `npm test` | 30 suites, 219 tests, all pass in ~1.2 s |
| `npm audit --omit=dev` | 0 vulnerabilities |
| `npm audit` (all) | high findings only in dev deps: electron 34.5.8, electron-builder 25 chain, babel, xmldom |
| Runtime | Electron 34.5.8 (out of Electron's 3-version support window), sql.js 1.14, @anthropic-ai/sdk 0.78, chart.js 4.5.1 |
| Surface | 137 IPC channels, 133 preload bindings, 15 routes, 13 migrations, ~20.5k lines (excl. vendored Chart.js) |

---

## Critical

### C1. "Monthly" financials are all-time totals
`computeFinancials()` (`src/main/database.js:418-439`) sums every non-deleted transaction with no date window. Every consumer treats the result as one month:
- Budget page compares monthly budget amounts against all-time category spend (`pages/budget.js:31`, `dashboard.js:33`).
- `_ruleBudgetOverrun` and `_ruleLowEmergencyFund` (`next-best-actions-engine.js:106-111, 219-221`), ProactiveEngine's 15%-over nudge (`proactive-engine.js:50-53`).
- AI prompts label it "Monthly income/expenses" and compute annual income as `income * 12` (`ai-workflow-prompts.js:27, 93, 163-165`).

After a few months of imports every budget is "over", the emergency-fund action never clears, and Claude is told a multiply-inflated annual income. Tests miss it because `database-financials.test.js` inserts one month and the engine tests mock `computeFinancials`.

### C2. `window.prompt()` is unsupported in Electron — three features are dead
Electron throws on `prompt()`. Deposit to goal (`handlers/growth.js:78`), Add Asset (`handlers/home.js:118-121`), and document upload (`home.js:153-154`) all surface as the generic "unexpected error" toast. Upload copies the file first (`home.js:152`) then throws, leaving an orphaned file with no DB record. Replace with the existing modal component.

### C3. Database persistence is non-atomic, unbacked, and not single-instance safe
`save()` (`database.js:51-55`) truncates and rewrites the whole sql.js export in place 100 ms after any write. A crash or power loss mid-write leaves a file `new SQL.Database(buffer)` cannot open; there is no temp+rename, no fsync, no `.bak`. The debounced timer calls `save()` with no try/catch (`:62-68`), so EBUSY/ENOSPC becomes an uncaught main-process exception. `main.js` never calls `app.requestSingleInstanceLock()`, so two instances both load the DB and the last writer silently wins. Fix: write to `.tmp`, fsync, rename; keep a rotating backup; wrap the timer; take the instance lock.

### C4. AI chat permanently breaks after ten exchanges
`chat()` pushes the user message then does `slice(-20)` (`ai-service.js:213-218`). On the 11th message the trimmed history starts with an assistant turn, which the Messages API rejects with a 400 (first message must be `user`). 400 is non-retryable, the user message is popped, and every following message hits the same path until the user clears history. Trim in user/assistant pairs, or drop a leading assistant turn.

### C5. Script injection into the PDF report window
`utils/pdf-report.js:80, 90, 105-107` interpolate transaction description/category raw; main loads that HTML into a `BrowserWindow` with no CSP and no `setWindowOpenHandler` (`ipc-handlers.js:204-213`). A `<script>` inside an imported CSV/OFX description executes (sandboxed, network-enabled) every time the user exports a PDF. Escape with `h()` and add a CSP meta to the generated document.

---

## High

### H1. Decrypted API key leaves the main process and lands in backup files
`getSettings()` decrypts at `database.js:209` and is returned verbatim over `db:settings:get`. `exportAllData()` (`database.js:663`) embeds it, so the JSON backup contains the plaintext key. `onboarding-stepper.js:131` writes it into an `<input value>`. Any renderer XSS (see H3) exfiltrates it. Strip it from export and return `hasApiKey` plus a masked suffix to the renderer.

### H2. Streaming retry duplicates output; the 60 s timeout never aborts
`_withRetry` re-runs the stream (`ai-service.js:221-247`) after chunks were already sent to the renderer, so the UI shows the answer twice. `Promise.race` rejects at 60 s but nothing aborts the stream, so chunks keep arriving after `ai:stream-error`; the timeout error has no `status`, so it is treated as retryable (up to three concurrent 60 s streams). The SDK already retries 429/5xx twice, giving nine attempts in total. Use `AbortController`, clear the timer, send a "reset" event before a retry, and drop the app-level retry.

### H3. Unescaped user/AI text in edit modals and several pages
`components/modal.js` does not import `h()`; description (`:27`), goal name (`:53`), debt name (`:65`), symbol/name (`:81-82`), bill title (`:109`), address (`:266`) and notes in a `<textarea>` (`:296`) are interpolated raw. Also `planning.js:320`, `bills.js:83-114`, `analytics.js:206`, `budget.js:6`, `registered-accounts.js:380`, `toast.js:439`, `app.js:116,130`. The strict CSP downgrades this from script execution to DOM/form corruption, but categories can be arbitrary AI-returned strings (`export-import.js:290`) and bank descriptions are attacker-influenced.

### H4. Rules read columns that do not exist, or match the wrong rows
- `_ruleGoalOffTrack` uses `target_amount`/`current_amount`/`monthly_contribution` (`next-best-actions-engine.js:286-290`); the table has `target`/`current` (`001-initial-schema.js:49-50`). The rule never fires; the test at `next-best-actions-engine.test.js:157-166` uses the same wrong names and passes against the bug.
- `upsertNextBestAction` matches any non-deleted row by `action_key` regardless of status (`database.js:882-889`), so a completed/dismissed action is updated in place and never resurfaces after the 7-day suppression lapses.
- `clearStaleNextBestActions` early-returns on an empty key set (`database.js:914`), so old open actions survive once the user has fixed everything.
- `next-best-actions-engine.js:35-37` falls back to `db.getContributionRoom()`, which does not exist.

### H5. One-off bills become permanent overdue urgent actions
Renderer sends `next_due_date: null` for non-recurring bills (`shared.js:620`), but `addBill` forces `next_due_date || date` (`database.js:376`). `_ruleBillsDueSoon` treats any negative diff as due (`:184`), so every past one-off bill yields a score-90 "overdue" action forever and feeds desktop notifications (`desktop-notification-engine.js:184-198`).

### H6. Notification and theme settings cannot be written
Migration 008 added `bill_notifications`, `bill_notify_days`, `theme_mode`, `dashboard_widgets`. `updateSettings` (`database.js:219`) never sets them and nothing in `src/` writes them, yet `app.js:353,363` and the notification engine read them. The notification master switch cannot actually be turned off.

### H7. Canadian tax constants labelled 2026 are 2024/2025 values, and the BPA is never applied
`canadian/constants.js`: federal thresholds (`:93-99`) are 2025's and the lowest rate is 0.15 (14% has applied since July 2025); federal BPA (`:76`) is 2025; CPP max benefit 1,364.60 (`:51`) and OAS 727.67 / 90,997 / 148,065 (`:64-66`) are 2024 figures; Alberta (`:110-116`) uses 2024 thresholds and lacks the 8% bracket on the first $60k introduced for 2025. TFSA 7,000 / 102,000 cumulative and RRSP 33,810 are correct. `BASIC_PERSONAL_AMOUNT` is exported but never used, so every federal estimate overstates tax by roughly the BPA credit. The AI system prompt says "use current 2025/2026 brackets" from a knowledge base that itself mixes 2024-2026 figures.

### H8. FHSA carry-forward double-counts
`calculateCurrentFHSARoom` (`calculators.js:92-100`) sets `unusedPriorYear = yearLimit`, which already includes the carry-forward, so room compounds: 8,000 known at end of 2023 shows 32,000 for 2025 and 40,000 for 2026 (cap is 8k/yr + max 8k carry-forward). `tests/calculators.test.js:89-100` re-implements the same logic instead of importing it.

### H9. Google Fonts and inline handlers are blocked by the app's own CSP
`index.html:6` `style-src 'self' 'unsafe-inline'` omits `fonts.googleapis.com`, so the stylesheet link at `:10` is blocked and Literata / Plus Jakarta Sans (`theme.css:23-24`) never load. `script-src 'self'` also kills the `onclick` on the error-screen Reload button (`app.js:117`). Bundle the fonts locally (better for an offline finance app) and make Reload a delegated handler.

### H10. Unrestricted file reads via two IPC channels
`advisor:copy-file` (`ipc-handlers.js:253`) accepts an arbitrary `srcPath` and `file:parse-xlsx` (`:475`) reads an arbitrary path, neither guarded by `isPathSafe`. `isPathSafe` itself (`:19-27`) uses `startsWith` without a trailing separator, so `Documents-evil` passes. Use `path.relative` and apply the guard to every path-taking channel.

### H11. Undecryptable key silently becomes the key, then gets persisted as plaintext
If `safeStorage` is unavailable or `decryptString` throws (keychain reset, another OS user, Linux without a keyring), `_decryptApiKey` returns the `enc:` blob as the key (`database.js:70-84`); the next `updateSettings` stores that blob unencrypted, permanently corrupting it. `_reEncryptNeeded` (`:81`) is written but never read.

### H12. Renderer UX regressions
- Transactions search loses focus while typing: re-render restores focus by `[data-field]` (`app.js:61-80`) but the search input has none (`pages/transactions.js:56`).
- Settings Dark Mode lags one render: `handlers/home.js:581-582` calls `updateSettings` un-awaited then renders from stale state.
- Global Ctrl+Z / Ctrl+N `preventDefault` even inside inputs (`app.js:253-264`), breaking native text undo in every form.

---

## Medium

- **M1. ~93 KB knowledge base re-sent on every AI call with no prompt caching.** Both `src/knowledge/*.txt` files are inlined into `system` together with the volatile financial context (`ai-service.js:108-128`). Roughly 25k tokens per turn; this is the dominant cost. Put the KB in its own cached system block (`cache_control`) and the financial context after the breakpoint.
- **M2. Stale model list.** Default `claude-sonnet-4-5-20250929` (`constants.js:2`), baked into the column default by migration 005 so existing rows never move, and a settings picker of Sonnet 4.5 / dated Haiku 4.5 / Opus 4.6 (`settings-page.js:7-9`). Current models are the Claude 5 family (`claude-opus-5`, `claude-sonnet-5`) plus `claude-haiku-4-5`. No `models.list()` check, so a retired ID surfaces as a raw 404.
- **M3. Prompt-injection surface.** Debt/goal/budget names, `user_name`, employer and bank descriptions are interpolated into prompts with no delimiters or length caps (`ai-workflow-prompts.js:33,37,100,104`; `ai-service.js:160-202,282`). Bound lengths, wrap fields in tags, state they are data.
- **M4. Workflow schema validation is advisory.** A failed `validateWorkflowResult` is logged and the object returned anyway (`ai-workflows.js:52-56`); `normalizeWorkflowResult` never checks enums, item shapes or string lengths; `stop_reason === 'max_tokens'` is never checked (2048 cap), so truncation becomes a generic parse-failure fallback.
- **M5. Two IPC paths return differently ranked actions.** `actions:generate-next-best` returns personalization-weighted, re-sorted actions; `actions:list-next-best` (used by `state/core.js:61`) returns raw DB order. Deltas are not persisted and `priority` is not recomputed after weighting, so an action can carry score 92 with label "high".
- **M6. IPC validation is inconsistent.** Only `transactions:add`, `settings:update` and `residence:update` validate input; roughly sixty other mutating channels pass raw renderer objects straight to SQL binding (not injection, but `undefined`/NaN/objects get stored).
- **M7. `ai:recategorize-others` duplicates the AI service** (`ipc-handlers.js:448-513`): its own Anthropic client, no retry/timeout, a 16-category list versus the 10 in `ai:categorize`, inline SQL in the IPC layer.
- **M8. `database.test.js` does not test `database.js`.** It defines its own `TestDB`, its own schema and re-implements the queries inline; it would pass if `WealthFlowDatabase` were deleted. The encryption round-trip and the migrate-from-older-version path have zero coverage (both real-DB tests mock `isEncryptionAvailable → false`).
- **M9. The Jest ESM transform is four regexes** (`tests/esm-transform.js`). It ignores `export *`, `export {…}`, `import * as`. Four renderer files (`app.js`, `state/core.js`, `import-modal.js`, `export-import.js`) do not survive it; tests pass only because those exact modules are `jest.mock`ed with factories. Use `babel-jest` or `--experimental-vm-modules`.
- **M10. Contribution-room rules ignore logged contributions.** `known_room` is used as-is (`next-best-actions-engine.js:249`, `proactive-engine.js:91`); the `contributions` table is never subtracted.
- **M11. Investments total ignores currency.** `pages/investments.js:14-15` adds USD holdings to CAD totals 1:1 while `:28` claims conversion.
- **M12. "Reset All Data" resets a few settings and reloads** (`handlers/home.js:30-37`); nothing is deleted despite the confirm text.
- **M13. Dashboard order contradicts `CLAUDE.md`.** `dashboard.js:66-99` renders month hero, AI summary, proactive banner, snapshot, progress strip, and Next Best Actions only as the sixth block; Saved Recommendations precede Insights. `components/dashboard-action-list.js` is never imported.
- **M14. First paint is blocked** behind 16 IPC loads, a net-worth snapshot, recurring-bill processing and a full intelligence refresh (`app.js:335-339`) with no loading state.
- **M15. `render()` is async and unserialised**; `initCharts` is not awaited inside the try/catch (`app.js:215`), so IPC failures become unhandled rejections and overlapping renders can build two Chart instances on one canvas.
- **M16. Import pipeline duplication and dead code.** Amount parsing copied four times; `bank-presets.js` `dateFormat`/`extraDescription`/`applyBankPreset` are never used by the real import path (TD/RBC "Description 2" is dropped); `utils/xlsx-parser.js` is unused and its inflate is wrong; the main-process XLSX parser (`ipc-handlers.js:475-560`) is a hand-rolled ZIP+regex reader with no size cap.
- **M17. Accessibility and contrast.** `--muted #3e3d38` on `--card` is about 1.6:1 and `--sub` about 4.0:1 (below AA) on 9-11 px text; hard-coded `rgba(255,255,255,…)` in `main.css:140,207,673` vanish in light mode. Inputs labelled with `<div>` rather than `<label for>`; icon-only buttons without `aria-label`; modals have no focus trap, initial focus or focus return; Escape ignores import/recurring modals.
- **M18. Hidden PDF window leaks on error** (`ipc-handlers.js:204-220`, no try/finally); `pdf-report.js` and `plan.js:237-274` dereference `appState.importModalData` in async continuations without null checks.
- **M19. Fake and noisy trend numbers.** `pages/debts.js:12` hardcodes a `-5.2%` debt trend; `analytics.js:175-178` pass 0 yielding "▲ 0%". XP bar uses `level * 100` while levels advance every 500 XP.

## Low

- `.claude/settings.local.json` is committed although `.gitignore` lists `.claude/`; it contains personal Windows paths. `git rm --cached` it.
- Dead IPC: `window:minimize/maximize/close` and `personalization:apply-weighting` have no preload binding or caller. `log:renderer` (`main.js:64-67`) accepts any `level` string; `'init'` would re-initialise the logger.
- `window-all-closed` closes the DB and AI service but does not quit on macOS; `activate` then recreates a window against a closed DB.
- `stock-service.js` ignores HTTP status codes (Yahoo 429/HTML becomes "Failed to parse JSON"); the unofficial Yahoo endpoint is a fragile basis for "real-time quotes".
- Date handling mixes SQLite `datetime('now')` (space separator) with JS ISO strings in comparisons (`engagement-engine.js:10,16`), and "today" is UTC in some places (`database.js:868,950`, `money.js:73`, `shared.js:480-665`) and local in others (`bills.js:12`, engine `:175`). Evening users in Canadian time zones get off-by-one days.
- Personalization: time decay uses one global `last_updated` for all categories; `confidence` can never be `'low'`. ProactiveEngine stamps the "shown" cooldown before anything is rendered.
- `_buildFinancialContext`: `d.balance.toLocaleString()` throws on null; `g.current / g.target` yields NaN/Infinity on zero target.
- `scripts/*` are unwired, hardcode Windows paths, `import-canada-life.js` contains personal statement data and the only string-built SQL in the repo; `debug-safestorage.js` prints part of the decrypted key. Move out of the shipped tree or delete.
- Missing indexes on `bills(next_due_date)` and `recommended_actions(deleted_at)`; `init()` writes the DB twice; every save serialises the whole DB.
- Fixed 1 s retry delay with no backoff/jitter in both AI retry helpers.
- Default province differs across files ('AB' in `shared.js:78`, 'ON' elsewhere). Wizard step count `8` hardcoded four times. `router.js` accepts any string and renders blank; no history/back.
- Unused exports and copy-paste: `WORKFLOW_LABELS`/`PRIORITY_COLORS` in three files; four private `statCard` helpers; `formatters.js` holds the tax math that `calculators.js` imports (misnamed).
- README drift: "8 DB migrations" (13), `state.js` (now `state/` with five modules), "2024/2025 brackets" vs `_2026` constants, "nothing sent to the cloud except AI" vs the Google Fonts preconnect.
- CI runs lint and test only; `electron-builder` is never exercised, no coverage report, no Windows runner although Windows is the only build target.

## What is good

- Shell hardening is right: `contextIsolation`, no `nodeIntegration`, default sandbox, strict CSP, no eval/remote scripts, Chart.js vendored, preload exposes a fixed allow-list rather than a generic `invoke` passthrough.
- Every query uses bound parameters; migrations are numbered, transactional and idempotent on rerun.
- API key encrypted at rest with `safeStorage`, legacy plaintext auto-upgraded; the logger redacts key-like fields; `safeHandle` logs and rethrows so failures reach the renderer.
- The AI layer degrades gracefully (fallback objects, JSON re-extraction, correct non-retryable set).
- `DesktopNotificationEngine` is the model module: injected notifier and clock, exhaustive boundary tests.
- Event delegation is done properly (one listener on `#app`, stream listeners cleaned before re-registering). Handler modules keep `app.js` genuinely thin; state modules mirror every IPC write into the local cache.
- The deterministic intelligence utilities (`affordability.js`, `next-actions.js`, `action-reasoning.js`, `onboarding.js`) are pure and tested against the real modules.
- Zero lint warnings, a CI gate, and a fast focused test suite are a good foundation to build real coverage on.

## Test coverage map

| Module | Tested | Notes |
|---|---|---|
| `database.js` | partial | settings/financials via real class; CRUD via a look-alike fake; encryption never run |
| `migrations/*` | partial | fresh-init only; no upgrade-from-older-version test |
| `next-best-actions-engine.js` | partial | mocked DB; goal test enshrines wrong columns |
| `personalization-engine.js` | partial | 3 guardrail tests |
| `engagement-engine.js` | yes | |
| `proactive-engine.js` | partial | 2 tests |
| `desktop-notification-engine.js` | yes | thorough |
| `ai-workflows.js` | no | retry/parse/validation untested |
| `ai-workflow-prompts.js` | partial | "contains json" assertions |
| `ai-workflow-schema.js` | yes | |
| `ai-service.js` | no | |
| `ipc-handlers.js` | no | source-text grep only |
| `logger.js`, `stock-service.js`, `scripts/*` | no | |
| Renderer utils (affordability, next-actions, onboarding, focus-steps, formatters, calculators) | yes | calculators test re-implements FHSA logic instead of importing |
| Renderer pages/components/handlers | mostly no | onboarding-stepper, progress-strip, ai-decision-card, focus-mode have tests |

## Recommended fix order

1. Add a date window to `computeFinancials` (current month by default, month parameter for reports) and re-run every consumer. (C1)
2. Replace the six `prompt()` calls with the modal component. (C2)
3. Atomic save (tmp + fsync + rename), rotating backup, try/catch on the timer, single-instance lock. (C3)
4. Fix chat history trimming; abort on timeout; drop app-level retry for streams. (C4, H2)
5. Escape everything in `modal.js` and `pdf-report.js`; add a CSP to the PDF document. (C5, H3)
6. Stop returning the decrypted key to the renderer; strip it from export. (H1, H11)
7. Fix goal-rule column names, upsert-by-status, stale clearing, one-off bill due dates, and write the migration-008 settings. (H4, H5, H6)
8. Refresh 2026 tax/CPP/OAS constants, apply the BPA, fix FHSA carry-forward, and make the calculator tests import the real functions. (H7, H8)
9. Bundle fonts locally and fix the CSP; guard `advisor:copy-file` and `file:parse-xlsx`. (H9, H10)
10. Prompt caching for the knowledge base and a current model list. (M1, M2)
11. Replace the regex ESM transform with babel-jest, then write real tests for `database.js`, `ai-service.js`, `ai-workflows.js`. (M8, M9)
12. Upgrade Electron to a supported major and add a Windows build job to CI.
