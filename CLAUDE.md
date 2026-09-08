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

WealthFlow is Canada-first.

Current code includes:
- 2026 federal tax brackets and BPA handling,
- province/territory tax tables,
- TFSA, RRSP, RESP, FHSA logic,
- CPP and OAS constants,
- Canadian bank import presets.

Some province/territory constants are explicitly marked unverified/approximate in source. Do not present those figures as confirmed until they are verified. Quebec requires special care because its tax/pension system is not equivalent to the other provincial calculations.

---

# Current Quality Priorities

Work in this order unless a production-critical defect supersedes it:

1. **Contracts and validation**
   - validate all mutating IPC boundaries,
   - make AI workflow validation fail closed,
   - reconcile contribution-room calculations with logged contributions.

2. **AI production hardening**
   - reduce repeated knowledge-base prompt cost,
   - keep supported model choices current,
   - strengthen prompt/data boundaries against instruction injection.

3. **Performance + accessibility quality gate**
   - show the shell before non-critical intelligence refreshes finish,
   - instrument startup/render timings,
   - serialize risky async renders,
   - establish keyboard/focus/ARIA expectations and tests.

4. **Canadian accuracy + privacy perimeter**
   - verify remaining 2026 jurisdiction data,
   - remove or isolate debug/personal-data scripts,
   - evaluate whole-database encryption / local lock options.

5. **External integrations only after the above**
   - open-banking feasibility,
   - CardVault/net-worth integration,
   - mobile/web research.

---

# Definition of Success

WealthFlow should feel like:
> **“This app understands my finances and tells me exactly what to do next.”**

Not:
> “This app shows me my numbers.”

And not:
> “This app gives me points for looking at my finances.”

Product quality comes from correct financial logic, clear prioritization, calm guidance, trustworthy AI boundaries, and fast execution.