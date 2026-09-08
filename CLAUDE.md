# WealthFlow — Product & Engineering Source of Truth

## Purpose

This file is the current source of truth for WealthFlow's product direction and implementation priorities.

Historical handoffs under `docs/handoffs/` describe how individual phases were built, but they are not authoritative for current behavior. When docs disagree, prefer:

1. current code and tests,
2. this file,
3. current review/status docs,
4. archived handoffs.

---

# Product Philosophy

WealthFlow is not primarily:
- a finance tracker,
- a spreadsheet,
- a reporting dashboard.

WealthFlow is:
> **a financial decision engine + command center**

Core principle:
> **Tell the user what matters, why it matters, and what to do next.**

The product should feel calm, intelligent, trustworthy, and non-judgmental.

---

# Current Product System

## 1. Next Best Actions — always-on decision engine

The deterministic Next Best Actions engine:
- analyzes current financial state,
- generates actionable recommendations,
- ranks by importance,
- persists completion/dismiss/snooze state,
- applies bounded personalization,
- protects urgent actions from personalization suppression.

Key principle:
> **rule-first, AI-second**

Next Best Actions are the primary decision surface of the dashboard.

## 2. Structured AI Workflows — deeper decisions

Implemented structured workflows include:
- TFSA vs RRSP,
- Debt vs Investing,
- Monthly Planner.

Each workflow:
- uses a structured prompt,
- expects structured JSON,
- validates/normalizes output,
- renders through reusable decision UI,
- can produce saveable actions.

AI enhances deterministic product logic; it does not replace it.

## 3. AI Summary — narrative context

The dashboard AI Summary explains the current financial picture in short form and connects financial state to recommended actions.

It should answer quickly:
- what matters now,
- why it matters,
- what the user should focus on.

## 4. Personalization — bounded adaptation

The personalization engine is implemented and uses interaction history to adjust relevance while preserving safety and visibility:
- recent behavior weighs more than old behavior,
- completion can modestly increase relevance,
- dismiss is a mild negative signal,
- snooze is not treated as dislike,
- urgent actions bypass personalization,
- score adjustments are bounded,
- financial state can override behavioral preference in summary emphasis.

Personalization must never hide material financial risk.

## 5. Guided Onboarding — fast path to useful decisions

Guided onboarding is implemented and captures enough context to produce useful recommendations without requiring a complete financial profile.

It includes:
- province,
- optional income/expenses/debt/savings estimates,
- primary financial focus,
- budget category setup,
- sample-data or fresh-start choice,
- immediate prioritized next steps.

Onboarding should deliver value quickly and allow refinement later.

## 6. Can I Afford This? — deterministic affordability workflow

The affordability workflow is implemented as a deterministic planning tool. It should remain transparent about the inputs and assumptions behind its recommendation.

## 7. Proactive Guidance

Proactive guidance is implemented through:
- dashboard nudges,
- proactive desktop notifications,
- urgency/relevance ranking,
- cooldown and deduplication behavior.

The system should surface the right insight at the right time without becoming noisy.

---

# Dashboard = Command Center

The dashboard hierarchy is intentional:

1. **Next Best Actions** — dominant decision surface
2. **Financial Snapshot** — current status
3. **AI Summary / proactive context** — interpretation and why-now context
4. **Progress feedback** — lightweight reinforcement
5. **Saved / generated actions** — execution queue
6. **Insights and spending detail** — supporting context
7. **Utilities / quick links** — lowest emphasis

Goal:
> the user understands what to do in under five seconds.

Do not allow secondary cards, analytics, or decorative engagement elements to compete with Next Best Actions.

---

# Behavioral UX

## Reinforce meaningful action, do not gamify it

Progress feedback should reflect real financial actions.

Allowed:
- “You completed 2 meaningful actions this week”
- momentum language,
- subtle completion feedback,
- Focus Mode reinforcement.

Avoid:
- XP,
- levels,
- collectible badges,
- flashy streak counters,
- artificial reward loops,
- hype or pressure.

The user should feel progress because their financial situation is improving, not because a game mechanic increased.

---

# UX Principles

## Action first
Everything should answer:
- what matters,
- why,
- what to do.

## Reduce cognitive load
- fewer competing sections,
- strong visual hierarchy,
- concise copy,
- progressive disclosure.

## Tone
- calm,
- intelligent,
- direct,
- non-judgmental.

## Avoid
- clutter,
- alarmist treatment for non-urgent items,
- dense equal-weight card grids,
- unnecessary motion,
- financial claims that exceed the confidence of the underlying data.

---

# Engineering Guardrails

## Data and safety
- Treat financial data correctness as product correctness.
- Validate inputs at renderer/main-process boundaries.
- Keep secrets in the main process; never expose plaintext API keys to the renderer or exports.
- Keep file access allow-listed and path-contained.
- Prefer deterministic rules for financial recommendations where possible.
- Fail safely when AI output is malformed or incomplete.

## Persistence
- Database writes must remain crash-safe and recoverable.
- Do not weaken atomic save, backup, or single-instance protections.

## Testing
- `npm run lint` and `npm test` are required gates.
- Bug fixes should add regression coverage against the real implementation when practical.
- Do not replace real implementation tests with parallel reimplementations of the same logic.

## Scope discipline
- Do not overbuild before validating.
- Prefer surgical changes over broad refactors.
- Extract repeated patterns, not one-off abstractions.

---

# Canadian Financial Coverage

WealthFlow is **Canada-only and Alberta-first**. The authoritative product scope is:
- Canadian federal personal-finance and tax rules, and
- Alberta personal-finance and provincial tax rules.

Assume Alberta when no province is explicitly supplied. Alberta + federal calculations must be kept current and verified before work is spent expanding other jurisdictions.

Current code also contains province/territory tables for portability and historical product breadth. Treat those as secondary convenience coverage, not a roadmap commitment. Do not add U.S. account/tax-law support (401(k), IRA, U.S. filing rules, etc.) unless the product scope is explicitly changed.

First-class Canadian coverage includes:
- 2026 federal + Alberta tax brackets and BPA handling,
- TFSA, RRSP, RESP and FHSA rules,
- CPP and OAS constants,
- Canadian bank import presets,
- Alberta-specific guidance where provincial law or programs matter.

For high-stakes tax/legal guidance, prefer CRA and Alberta government primary sources. Other provincial calculations may remain available, but they must not displace Alberta correctness work.

---

# Current Quality Priorities

The September consolidation gates are implemented: source-of-truth cleanup, boundary validation, fail-closed workflow contracts, contribution-room reconciliation, AI prompt/model hardening, startup/accessibility work, privacy cleanup, real data reset, action-ranking consistency, and mixed-currency portfolio valuation.

From here, prioritize depth over breadth:

1. **Alberta + federal financial-law accuracy**
   - keep current-year Alberta and Canadian federal rules verified against primary sources,
   - ensure AI knowledge follows current-year values before historical values,
   - add regression tests whenever a law/rate/limit changes.

2. **Financial calculation correctness**
   - keep registered-account room, debt, cash-flow, tax, retirement and CAD portfolio calculations internally consistent,
   - surface assumptions and uncertainty rather than presenting estimates as filing-grade results.

3. **Privacy and local-data protection**
   - minimize personal data sent to AI,
   - preserve crash-safe persistence and true reset semantics,
   - evaluate an optional local app/database lock only if it can be added without weakening recoverability.

4. **Trustworthy command-center UX**
   - preserve Next Best Actions as the dominant decision surface,
   - keep accessibility/performance regression gates green,
   - improve explanations and execution support before adding more surface area.

5. **Canadian integrations only when they strengthen the core**
   - Canadian open-banking/import automation may be explored when the local financial model is stable,
   - unrelated ecosystem expansion, mobile/web ports, and non-Canadian jurisdiction support are not current priorities.

Jurisdiction expansion outside Canada is out of scope.

---

# Definition of Success

WealthFlow should feel like:
> **“This app understands my finances and tells me exactly what to do next.”**

Not:
> “This app shows me my numbers.”

And not:
> “This app gives me points for looking at my finances.”

Product quality comes from correct financial logic, clear prioritization, calm guidance, trustworthy AI boundaries, and fast execution.