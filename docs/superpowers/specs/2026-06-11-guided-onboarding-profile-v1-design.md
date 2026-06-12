# Guided Onboarding Profile V1 Design Spec

**Goal:** Make first-run setup feel like WealthFlow learns the user's starting point and immediately gives a credible first command-center plan.

**Scope:** Improve the existing five-step onboarding flow with a primary financial focus, profile confidence, clearer instant-value messaging, and deterministic fallback actions. No full wizard rewrite, no AI dependency, and no major dashboard redesign.

---

## 1. Product Intent

WealthFlow should feel like a financial decision engine from the first launch. The onboarding flow should not ask for data just to fill a profile. It should use a small amount of user-provided context to explain what matters first and what the user should do next.

This phase keeps the product philosophy rule-first and action-first:

- Ask only for information that improves starter actions.
- Show the user why WealthFlow selected the first actions.
- Make the final onboarding step feel like the dashboard is already thinking.
- Preserve the existing command-center refresh path after sample or fresh setup.

No visual companion was used for this design because this phase follows the existing onboarding layout and UI system. The decision point was product behavior and scope, not a new visual direction.

---

## 2. Current State

The current onboarding component is `src/renderer/js/components/onboarding-stepper.js`.

Existing steps:

| Step | Label | Current Purpose |
|------|-------|-----------------|
| 0 | Start | Product positioning and privacy trust points |
| 1 | Setup | Name, province, rough financial estimates, optional API key |
| 2 | Budget | Initial budget category selection |
| 3 | Data | Start with sample data or start fresh |
| 4 | Next Steps | Shows generated or fallback onboarding actions |

The current persistence path is in `src/renderer/js/handlers/shared.js`:

- `ob-next` saves setup fields from step 1.
- `start-sample` advances to step 4, seeds data, creates chosen budgets, and calls `State.refreshCommandCenterIntelligence('onboarding_completed')`.
- `start-empty` advances to step 4, creates chosen budgets, and calls `State.refreshCommandCenterIntelligence('onboarding_completed')`.
- `ob-complete` marks `settings.onboarded = true`.

The current fallback action selector is `src/renderer/js/utils/onboarding.js`. It returns the first open Next Best Actions when they exist, otherwise it returns three generic fallback actions.

---

## 3. User Experience

### 3a. Step 1: Financial Starting Point

Keep step 1 as one screen, but make it feel more directed.

Fields:

| Field | Storage | Behavior |
|-------|---------|----------|
| Name | `settings.user_name` | Empty input falls back to existing name or `User` |
| Province | `settings.province` | Defaults to `AB` when no stored value exists |
| Monthly income | `settings.monthly_income` | Saves a non-negative value when the user types one |
| Monthly expenses | `settings.monthly_expenses` | Saves a non-negative value when the user types one |
| Total debt | `settings.total_debt` | Saves a non-negative value when the user types one; explicit `0` is valid |
| Savings / cash buffer | `settings.savings_buffer` | Saves a non-negative value when the user types one; explicit `0` is valid |
| Primary focus | `settings.onboarding_focus` | Required for high confidence, but the user can continue without it |
| Claude API key | `settings.ai_api_key` | Remains optional and unchanged in purpose |

Primary focus choices:

| Value | Label |
|-------|-------|
| `improve_cashflow` | Improve monthly cashflow |
| `reduce_debt` | Reduce debt |
| `build_savings` | Build a cash buffer |
| `invest_more` | Invest more |
| `plan_month` | Plan this month |

The focus control should use compact selectable buttons or radio-style chips that fit the current card. It should not add a separate onboarding step.

### 3b. Step 4: Instant Value

Step 4 should become the first command-center moment.

It shows:

- A profile confidence pill: `High`, `Medium`, or `Starter`.
- A short "Why these actions" line based on available inputs.
- The top action highlighted as "Focus on this first."
- Two supporting action cards beneath the top action.
- The existing "Go to Dashboard" completion button.

Example explanation strings:

| Confidence | Explanation |
|------------|-------------|
| High | `Based on your cashflow, buffer, and focus area.` |
| Medium | `Based on your starting estimates and focus area.` |
| Starter | `Based on a starter profile. Add more details any time for sharper actions.` |

The final screen should still fit in the existing onboarding card without adding a dashboard preview, modal, or extra navigation.

---

## 4. Data Model

Add one migration after `012-onboarding-settings` to extend the existing `settings` table:

| Column | Type | Default | Purpose |
|--------|------|---------|---------|
| `onboarding_focus` | `TEXT` | `NULL` | Stores the user's selected first priority |
| `onboarding_confidence` | `TEXT` | `'starter'` | Stores the confidence tier shown on step 4 |
| `onboarding_completed_at` | `TEXT` | `NULL` | Stores an ISO timestamp when onboarding is completed |

`getSettings()` should include these values in both the no-row default object and the normal settings result.

`updateSettings(data)` should persist these values while preserving current behavior for existing settings fields.

Allowed `onboarding_confidence` values:

- `high`
- `medium`
- `starter`

Allowed `onboarding_focus` values:

- `improve_cashflow`
- `reduce_debt`
- `build_savings`
- `invest_more`
- `plan_month`
- `null`

---

## 5. Deterministic Behavior

### 5a. Confidence Calculation

Confidence is computed when the user leaves step 1.

Use input presence from the current DOM before numeric values are normalized:

| Tier | Rule |
|------|------|
| `high` | Focus is selected, monthly income is present, monthly expenses are present, and either debt or savings buffer is present |
| `medium` | Focus is selected with at least one financial estimate, or monthly income and monthly expenses are both present |
| `starter` | Anything less complete |

Zero counts as present when the user typed `0`. Blank inputs do not count as present and do not overwrite existing financial estimates.

### 5b. Focus-Based Fallback Actions

When open Next Best Actions exist, keep using them first.

When no open Next Best Actions exist, choose fallback actions by `settings.onboarding_focus`:

| Focus | First Fallback Action |
|-------|-----------------------|
| `improve_cashflow` | `Check your top spending categories this week` |
| `reduce_debt` | `List debts by interest rate before making extra payments` |
| `build_savings` | `Set a first cash-buffer target` |
| `invest_more` | `Review TFSA, RRSP, or FHSA room before investing more` |
| `plan_month` | `Review this month's income, bills, and planned spending` |
| No focus | `Track your top 3 spending categories this week` |

The second and third fallback actions stay conservative and deterministic:

- `Complete your Financial Profile for sharper advice`
- `Review your largest recurring expense`

### 5c. Refresh Path

`start-sample` and `start-empty` continue calling:

```js
State.refreshCommandCenterIntelligence('onboarding_completed')
```

This refresh remains non-blocking. If it fails, onboarding still advances to step 4 and the fallback action selector still provides useful cards.

### 5d. Completion

`ob-complete` updates:

```js
{
  onboarded: true,
  onboarding_completed_at: new Date().toISOString(),
}
```

It does not mark `profile_completed` true. A starter onboarding profile and the deeper Financial Profile remain separate concepts.

---

## 6. UI Details

Use existing onboarding card patterns and current CSS variables.

Add only the UI needed for the new behavior:

- A compact focus selector in step 1.
- A confidence pill in step 4.
- A short explanation line in step 4.
- Focus-aware fallback action copy.

Button hierarchy remains:

- Primary button for the next expected action.
- Ghost button for back.
- Small ghost button for skip.

Avoid adding:

- A new onboarding step.
- A large hero redesign.
- A nested card inside the onboarding card.
- Any alarmist color treatment for low confidence.
- Any in-app teaching text about shortcuts or implementation behavior.

---

## 7. Error And Edge Behavior

- Empty numeric inputs do not overwrite stored estimates.
- Invalid negative numeric inputs are ignored by the save handler.
- Explicit `0` is valid for debt and savings buffer.
- Explicit `0` is valid for income and expenses when typed, although confidence remains lower if the rest of the profile is sparse.
- Unknown `onboarding_focus` values are treated as no focus.
- Unknown `onboarding_confidence` values render as `Starter`.
- Missing settings render the starter fallback actions.
- A failed command-center refresh does not block onboarding.

---

## 8. Testing Strategy

Add focused tests around the behavior that can regress:

- Database settings test for the three new settings columns.
- Database update test proving explicit zero onboarding numbers can be stored when submitted.
- Onboarding utility tests for focus-based fallback action selection.
- Onboarding utility tests for confidence labels and explanations.
- Shared handler test proving step 1 persists `onboarding_focus` and `onboarding_confidence`.
- Existing shared handler tests for `start-sample` and `start-empty` command-center refresh remain passing.

Run verification:

```powershell
npm test -- tests/database-settings.test.js tests/onboarding-utils.test.js tests/shared-action-refresh.test.js
npm test
```

If the repo lint still reports unrelated pre-existing warnings or vendor-file parse failures, report that separately and keep feature verification grounded in Jest plus touched-file lint when possible.

---

## 9. Implementation Boundaries

Expected files to modify:

- `src/main/database.js`
- `src/main/migrations/013-guided-onboarding-profile.js`
- `src/renderer/js/components/onboarding-stepper.js`
- `src/renderer/js/handlers/shared.js`
- `src/renderer/js/utils/onboarding.js`
- `tests/database-settings.test.js`
- `tests/onboarding-utils.test.js`
- `tests/shared-action-refresh.test.js`

No expected changes:

- No new main-process tables.
- No AI prompt changes.
- No Next Best Actions engine scoring changes.
- No dashboard layout rewrite.
- No full Financial Profile wizard rewrite.
- No import/export format changes.

---

## 10. Success Criteria

This phase is complete when:

- A first-time user can select a financial focus during onboarding.
- Step 4 explains why the first actions were chosen.
- Step 4 shows a confidence tier without shaming or overexplaining.
- Fallback actions adapt to the user's selected focus.
- Sample and fresh onboarding still refresh the command center.
- Onboarding completion stores a timestamp.
- Existing full Jest coverage remains passing.
