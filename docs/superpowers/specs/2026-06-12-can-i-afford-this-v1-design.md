# Can I Afford This V1 Design Spec

**Goal:** Add a deterministic affordability decision workflow that answers a user's near-term purchase question with a clear verdict, rationale, tradeoffs, and saveable next action.

**Scope:** Planning page workflow, local deterministic analysis, decision-card-compatible result, and saveable recommended actions. No bank syncing, no credit score modeling, no new database tables, and no required AI call.

---

## 1. Product Intent

WealthFlow should help users make a real money decision, not only inspect metrics. "Can I afford this?" is the next signature decision-engine moment after Guided Onboarding and the Command Center because it starts from a user question and returns a direct action.

The workflow should answer:

- Can I safely make this purchase or commitment?
- What makes it safe or risky?
- What should I do first?
- What action can I save to my plan?

No visual companion was used for this design. The feature fits the existing Planning page, calculator-card style, and decision-card renderer. The design question is primarily product behavior and calculation boundaries, not a new visual system.

---

## 2. Current State

Relevant existing pieces:

- `src/renderer/js/pages/planning.js` owns local planning calculator inputs through the module-level `planInputs` object.
- `src/renderer/js/handlers/plan.js` handles Planning page input/change events.
- `src/renderer/js/handlers/shared.js` handles workflow result display and save actions.
- `src/renderer/js/components/ai-decision-card.js` renders structured decision results and save buttons.
- `src/renderer/js/state/core.js` exposes current app state and `computeFinancials()`.
- `recommended_actions` already stores saved workflow actions.

The existing AI workflow system is useful but not the right V1 dependency for affordability. Affordability should work instantly, offline, and predictably from known financial state. AI can refine language later.

---

## 3. Approach

Use a **deterministic local workflow** that returns an object compatible with `renderDecisionCard(result)`.

Why this approach:

- It supports the product principle "rule-first, AI-second."
- It avoids blocking a practical decision on an API key.
- It reuses the current save-action system.
- It keeps the implementation small and testable.

Rejected alternatives:

| Approach | Reason Not V1 |
|----------|---------------|
| Pure AI workflow | Requires API key, has less predictable verdicts, and duplicates deterministic math |
| Full new wizard page | Too much UI surface for one decision workflow |
| Database-backed affordability history | Useful later, but V1 only needs result + saveable action |

---

## 4. User Experience

Add a compact "Can I afford this?" card near the top of the Planning page, above the existing calculators.

Inputs:

| Field | Type | Behavior |
|-------|------|----------|
| Purchase name | Text | Optional, defaults to `this purchase` |
| Amount | Number | Required for a verdict; non-negative |
| Frequency | Select | `one_time` or `monthly` |
| Category | Select | Uses existing spending categories where practical |
| Timing | Select | `now`, `this_month`, `next_month` |

Primary action:

- Button label: `Check affordability`
- Action: `run-affordability-check`

Result:

- Render through the existing decision card pattern.
- Label as `Can I Afford This?`.
- Show a verdict in the summary and primary recommendation.
- Include why, tradeoffs, and one to three saveable actions.

No modal is required for V1. The result should render inside the Planning page card so the user can adjust inputs and re-run quickly.

---

## 5. Verdict Model

The workflow returns one of four verdicts:

| Verdict | Meaning |
|---------|---------|
| `yes` | Purchase appears affordable without creating immediate cashflow or buffer risk |
| `yes_adjust` | Purchase may be affordable if the user reduces spending, delays, or saves first |
| `not_yet` | Purchase should wait until a target buffer or cashflow threshold improves |
| `no` | Purchase creates high risk based on current cashflow, debt pressure, or savings buffer |

User-facing summary copy:

| Verdict | Summary |
|---------|---------|
| `yes` | `Yes - this looks affordable.` |
| `yes_adjust` | `Yes, but adjust your plan first.` |
| `not_yet` | `Not yet - wait until your buffer improves.` |
| `no` | `No - this creates too much risk right now.` |

Use normal hyphens in copy for ASCII consistency.

---

## 6. Deterministic Inputs

The engine receives:

```js
{
  purchase: {
    name,
    amount,
    frequency,
    category,
    timing,
  },
  financials,
  state,
}
```

Required financial signals:

- Monthly income
- Monthly expenses
- Savings buffer / total saved
- Total debt
- Existing budgets
- Goals

Use `computeFinancials()` as the primary source for financial totals. Use current `state.budgets`, `state.goals`, and `state.debts` for supporting rationale.

---

## 7. Rule Logic

Normalize values:

- Negative, missing, or non-finite amount returns an invalid-input result.
- `frequency = monthly` means the amount affects recurring monthly obligations.
- `frequency = one_time` means the amount affects savings buffer.

Derived metrics:

| Metric | Formula |
|--------|---------|
| Monthly surplus | `income - expenses` |
| Savings buffer months | `totalSaved / max(expenses, 1)` |
| Purchase as buffer percentage | `amount / max(totalSaved, 1)` |
| Recurring pressure | `amount / max(monthlySurplus, 1)` |
| Debt pressure | `totalDebt > income * 3` when income is known |

One-time verdict rules:

| Condition | Verdict |
|-----------|---------|
| Amount invalid or zero | invalid result, no saveable action |
| Total saved is 0 and amount > 0 | `no` |
| Amount leaves buffer below one month of expenses | `no` |
| Amount leaves buffer below three months of expenses | `not_yet` |
| Amount uses more than 30% of current buffer | `yes_adjust` |
| Otherwise | `yes` |

Monthly verdict rules:

| Condition | Verdict |
|-----------|---------|
| Amount invalid or zero | invalid result, no saveable action |
| Monthly surplus <= 0 | `no` |
| Amount is greater than monthly surplus | `no` |
| Amount uses more than 50% of monthly surplus | `not_yet` |
| Amount uses more than 25% of monthly surplus | `yes_adjust` |
| Debt pressure is true and amount uses more than 15% of surplus | `yes_adjust` |
| Otherwise | `yes` |

Timing adjustment:

- `now` uses rules as-is.
- `this_month` may soften `not_yet` to `yes_adjust` only when the risk is buffer percentage, not when the result is `no`.
- `next_month` may add a tradeoff suggesting a one-month delay, but must not upgrade `no`.

---

## 8. Result Shape

Return a decision-card-compatible object:

```js
{
  workflow_type: 'affordability_check',
  summary: 'Yes, but adjust your plan first.',
  recommendation: {
    primary_action: 'Delay the purchase until you set aside $400.'
  },
  why: [
    'This would use about 35% of your current cash buffer.',
    'Your estimated monthly surplus is $800.'
  ],
  tradeoffs: [
    'Buying now may slow emergency fund progress.'
  ],
  next_actions: [
    {
      title: 'Set aside $400 before buying this item',
      type: 'affordability',
      priority: 'medium',
      impact: 'Protects your cash buffer'
    }
  ],
  confidence: 'medium',
  disclaimer: 'This is general educational guidance, not financial advice.',
  _deterministic: true
}
```

Add `affordability_check: 'Can I Afford This?'` to the decision-card workflow labels.

---

## 9. Invalid And Edge Behavior

- Missing amount shows a calm inline result asking the user to enter an amount.
- A zero amount is treated as invalid because there is no decision to evaluate.
- Missing income uses `0`, which makes monthly commitments conservative.
- Missing expenses uses `0`, but one-time buffer rules still rely on `totalSaved`.
- Missing savings buffer makes one-time purchases conservative.
- Unknown frequency defaults to `one_time`.
- Unknown timing defaults to `now`.
- Unknown category is allowed and displayed as `General`.
- The workflow never claims certainty or gives regulated financial advice.

---

## 10. UI Placement

Planning page order:

1. Page subtitle
2. Existing `Debt vs Investing` workflow button
3. New `Can I afford this?` card
4. Existing calculators

The card should use existing Planning page density:

- Compact field grid
- Existing `.input-field` and `.plan-input` patterns where useful
- Existing `btn` styling
- Result below the button inside the same card

Do not add:

- A sidebar route
- A dashboard hero section
- A separate modal-only experience
- Nested cards inside the affordability card

---

## 11. Saveable Actions

The result's `next_actions` should use the existing decision-card save buttons.

Suggested actions:

| Verdict | Action |
|---------|--------|
| `yes` | `Buy this only if planned bills are covered` |
| `yes_adjust` | `Set aside a buffer before buying` |
| `not_yet` | `Wait until your cash buffer reaches the target` |
| `no` | `Do not buy this until cashflow improves` |

When the user saves an action, existing `save-workflow-action` behavior should persist it to `recommended_actions` with `workflow_type = affordability_check`.

---

## 12. Testing Strategy

Add focused tests for:

- Affordability engine one-time `yes`, `yes_adjust`, `not_yet`, `no`, and invalid results.
- Affordability engine monthly `yes`, `yes_adjust`, `not_yet`, `no`, and invalid results.
- Invalid/negative amount normalization.
- Planning page renders inputs and result area.
- Plan handler runs affordability check and stores a decision-card-compatible result.
- Decision card label displays `Can I Afford This?`.
- Save action compatibility for `workflow_type = affordability_check`.

Verification commands:

```powershell
npm test -- tests/affordability-engine.test.js tests/planning-affordability.test.js tests/ai-decision-card.test.js tests/plan-handler-affordability.test.js
npm test
npx eslint src/renderer/js/pages/planning.js src/renderer/js/handlers/plan.js src/renderer/js/utils/affordability.js src/renderer/js/components/ai-decision-card.js
```

---

## 13. Expected Files

Expected new files:

- `src/renderer/js/utils/affordability.js`
- `tests/affordability-engine.test.js`
- `tests/planning-affordability.test.js`
- `tests/plan-handler-affordability.test.js`

Expected modified files:

- `src/renderer/js/pages/planning.js`
- `src/renderer/js/handlers/plan.js`
- `src/renderer/js/components/ai-decision-card.js`
- Existing tests as needed for decision-card labels or save-action compatibility

No expected changes:

- No database migrations
- No main-process AI workflow schema changes
- No `recommended_actions` schema changes
- No navigation/router changes
- No dashboard layout changes

---

## 14. Success Criteria

This phase is complete when:

- A user can enter a purchase or monthly commitment on the Planning page.
- The app returns a deterministic affordability verdict.
- The result explains why, names tradeoffs, and gives a next action.
- The next action can be saved through the existing recommendation system.
- Existing AI workflows still behave the same.
- Full Jest passes.
