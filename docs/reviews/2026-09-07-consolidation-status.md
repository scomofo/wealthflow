# WealthFlow Consolidation Status — 2026-09-07

## Purpose

This document follows up the deep inspection from 2026-09-02 and records what changed after PR #10. It is intentionally short and current; the original inspection remains useful historical evidence for the pre-fix state.

## September 2 critical/high findings

PR #10 addressed the critical and high-severity findings from the September 2 review, including:

- current-month financial aggregation instead of all-time totals,
- replacement of unsupported renderer `prompt()` flows,
- crash-safe database persistence, backup recovery, and single-instance protection,
- AI chat history trimming and stream timeout/retry behavior,
- PDF and renderer escaping gaps,
- API-key exposure in renderer/export paths,
- Next Best Actions rule/schema bugs,
- one-off bill due-date behavior,
- settings persistence for notifications/theme fields,
- 2026 tax/CPP/OAS constants and BPA application,
- FHSA carry-forward correction,
- CSP/font/inline-handler issues,
- path containment and unrestricted file IPC gaps,
- renderer search/theme/keyboard regressions.

The original `2026-09-02-app-inspection-review.md` should therefore be read as a snapshot of commit `a4c7ac1`, not as the current unresolved bug list.

## Consolidation pass decisions

### Product doctrine

WealthFlow remains a decision-first financial command center. Next Best Actions are the dominant dashboard decision surface.

The product intentionally uses **progress reinforcement without game mechanics**. XP, levels, and collectible badges are not part of the desired dashboard experience. Weekly progress/momentum messaging remains appropriate because it reflects meaningful completed financial actions.

### Documentation authority

Current authority order:

1. code + tests,
2. `CLAUDE.md`,
3. current review/status documents,
4. archived files under `docs/handoffs/`.

### Dashboard hierarchy

The consolidation pass restores:

1. monthly command-center header,
2. Next Best Actions,
3. financial snapshot,
4. AI/proactive context,
5. lightweight progress reinforcement,
6. saved/generated actions,
7. insight/spending context,
8. utility links.

## Consolidation implementation status

The ordered consolidation pass is now implemented on PR #11:

1. **Source of truth** — `CLAUDE.md`/README reflect the current product, Next Best Actions lead the dashboard, and active XP/level/badge UI was removed.
2. **Contracts and validation** — mutating database calls are validated, structured AI workflows fail closed, and contribution-room recommendations reconcile logged contributions.
3. **AI production hardening** — untrusted financial/import data is framed and escaped, stable knowledge context uses Anthropic prompt caching, model aliases are migrated centrally, and bulk categorization reuses the same guarded AI service.
4. **Performance and accessibility** — useful UI paints before non-critical intelligence work, async render races are guarded, startup/render timings are logged, and keyboard/focus/ARIA baseline tests are in place.
5. **Canadian accuracy and privacy** — the product is explicitly Canada-only and Alberta-first, fresh profiles default to Alberta, current federal/Alberta tax data is first-class, personal/debug scripts were removed, reset now actually erases financial/profile/document data and recovery backups, and USD holdings are converted to CAD before portfolio/net-worth calculations.

## Current focus after consolidation

Depth now takes priority over breadth:

1. keep Alberta + Canadian federal financial-law knowledge current against CRA/Alberta primary sources,
2. continue correctness tests around registered accounts, taxes, retirement, debt and CAD valuation,
3. minimize AI-bound personal data and consider optional local locking/encryption only if recoverability remains strong,
4. preserve the command-center hierarchy, performance and accessibility gates,
5. defer non-Canadian finance support and broad platform/integration expansion.
