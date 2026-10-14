# WealthFlow review and import reliability — October 14, 2026

Reviewed baseline: `master` at `7b58b97fd894e4d37a4a65969c97e832233e69dd`.
The recent Alberta tax-credit changes are merged; no open PR duplicated this work.
Baseline gates passed: 361 tests across 57 suites, plus lint.

## Review result

The highest-value improvement was statement-import integrity. The current
renderer could silently change unrelated financial records, and its preview,
duplicate check and insertion used different parsing rules. The review also
traced imported categories into dashboard and historical analytics queries.

| Finding | Previous behaviour | Implemented result |
| --- | --- | --- |
| Guessed balance changes | A bank-name match, or merely six expenses, could alter a credit-card balance; description keywords could advance goals or log a TFSA withdrawal as a contribution. | Imports add transactions and refresh derived information. Debt, goal and registered-contribution records require explicit entries. |
| Invalid dates and amounts | February 30 passed; `-50oops` became `-50`; accounting parentheses were lost. | One strict row normalizer validates calendar dates, finite money values, debit/credit conflicts, descriptions and explicit categories. |
| Preview disagreement | Rows could appear ready but fail later; preview ignored selected AI categories and additional bank descriptions. | Preview, duplicate lookup and saving use the same normalized row and date-order choice. Invalid rows have visible reasons, including rows beyond the first eight. |
| Transfer inconsistency | Positive transfers became income. Historical charts and category spending also counted transfers even though dashboard headline totals excluded them. | Preserve recognized/mapped transfers and exclude them consistently from financial aggregates. Benefits/dividends retain their categories. |
| Duplicate false positives | One stored purchase caused every identical purchase in the statement to be skipped. | Consume stored duplicate occurrences individually. Two same-day purchases remain two purchases, while repeated statements are skipped. |
| Async review races | Canceled AI checks dereferenced a cleared modal; older mapping checks could overwrite newer results. | Bind results to the active review and its validation revision. Block saving while checking; canceled AI work stops subsequent batches. |
| Misleading save failure | A successful insert followed by a failed history/cache read could leave the import apparently retryable. | Update the cache after the committed write. Separate insertion errors from secondary failures, close successful imports, and explain refresh/history problems without repeating the write. |
| CSV corruption | Physical-line splitting lost quoted newlines; surplus fields could truncate an unquoted thousands-formatted amount. | Parse quoted records, preserve multiline descriptions, reject malformed quoting/duplicate headers/surplus values, and retain short rows for validation. |

The desktop review also adds associated control labels, dialog semantics,
focus retention during mapping changes, focus return after dismissal, Escape
handling, and the existing modal focus trap. Saving disables cancellation and
editing. Files exceeding the main-process 10,000-transaction batch limit get
an explanation before insertion.

## Verified example

The SQLite integration fixture imports $2,000 salary, a $500 incoming internal
transfer, a $400 outgoing internal transfer, $200 benefits, $50 dividends and
$100 spending. Dashboard totals and historical analytics both report $2,250
income and $100 spending; category totals also sum to $100. Debt/goal balances
and contribution logs remain unchanged. Reimporting skips all six records.

## Validation

- `npm run lint`: passed.
- `npm test -- --runInBand`: **450 tests in 62 suites passed**, including 89 new regressions.
- `git diff --check`: passed.
- Four original import defects and four CSV parser defects were reproduced
  with failing tests before their implementations were corrected. An additional
  real-database check reproduced the historical transfer-total mismatch.
- Pure-module tests cover parsing, Canadian bank mappings, categories, AI
  request selection/cancellation, amount/date validation and batch limits.
- JSDOM tests execute the actual review renderer and Plan handlers, covering
  labels, escaping, focus, overlapping checks, cancellation, retries,
  duplicate-check failures and failures after a successful insertion. Shared
  dialog tests also check Tab containment when all saving controls are disabled.
- SQLite tests execute the real database, validation proxy, renderer batch
  cache and import functions, including occurrence matching, soft deletion,
  transactional rollback and persistence across close/reopen.

JSDOM is a development-only test dependency. Runtime financial/AI dependencies
are unchanged. No live AI provider was called during verification.

Electron could not launch here because its process-singleton socket was denied
by the execution environment. A separate Chromium download was unavailable.
The evidence above covers modules, DOM handlers and SQLite, rather than native
dialogs, visual layout or the packaged Windows application.

## Small Windows acceptance check

Use a disposable blank profile and a synthetic statement:

1. Open Import; review a transfer, an ordinary expense, a parenthesized amount,
   and an invalid calendar date. Check the preview and expandable error list.
2. Change numeric date order and a column mapping using the keyboard. Confirm
   focus, Tab containment, disabled saving during checks, and Escape dismissal.
3. Import, navigate to Transactions/Dashboard/Analytics, and repeat the import.
   Confirm repeat skipping, consistent transfer totals and unchanged debt,
   goal and contribution records.
4. Check dark and light themes at 1024×700 and 1400×900, including long filenames
   and horizontal preview/mapping scrolling.

## Focused follow-ups identified in current source

1. **Recurring calendar dates:** `database._calculateNextDue` and the separate
   Money handler mix date-only UTC parsing with local setters, and the renderer
   lacks the database's month-overflow clamp. Unify local calendar-day handling
   and test month ends, leap days and Edmonton evening boundaries.
2. **Holdings import cost basis:** `applyHoldingsImport` reads `Book Value (CAD)`
   into `avg_cost`, while investments treat that field as native currency. A
   USD holdings fixture should establish the correct conversion before this
   separate portfolio import workflow is enhanced.
3. **Startup privacy/UX:** `index.html` still loads Google Fonts at startup,
   and Budget labels a deterministic heuristic “AI Budget Analysis.” Local
   fonts/system fonts and accurate labels would make the privacy model and
   explanations clearer.

Duplicate matching still uses date, amount and normalized description; it is
not an account-aware bank transaction identity. Changing the mapping or
additional description can change a match against older imports. Existing
records are not automatically recategorized or repaired by this change.

Canada-only, Alberta-first scope and the merged tax-credit model are preserved.
