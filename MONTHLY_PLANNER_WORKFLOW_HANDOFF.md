# WealthFlow Monthly Action Planner — Build Handoff

## Objective
Implement the third and most important structured AI workflow:

**Monthly Action Planner**

This workflow ties together everything built so far and becomes the core habit loop of WealthFlow.

---

## Product Goal
When a user opens the Dashboard, they should be able to click:

**Generate My Monthly Plan**

WealthFlow should:
1. analyze full financial state
2. detect issues + opportunities
3. prioritize highest-impact actions
4. return structured JSON
5. render action-focused UI
6. allow saving actions

This is the feature that drives repeat usage.

---

## User Story
As a user, I want WealthFlow to tell me the most important financial actions to take this month so I don’t have to figure it out myself.

---

## Required Output Contract

```json
{
  "workflow_type": "monthly_action_planner",
  "summary": "Here are your 3 highest-impact financial actions this month",
  "recommendation": {
    "primary_action": "Improve cash flow and reduce financial drag"
  },
  "top_actions": [
    {
      "title": "Reduce food spending by $200",
      "impact": "Improves monthly cash flow",
      "effort": "low",
      "priority": "high"
    }
  ],
  "why": [
    "Spending exceeds budget in key categories",
    "Debt interest is reducing net progress"
  ],
  "confidence": "medium",
  "disclaimer": "This is general educational guidance and not financial advice."
}
```

---

## Files to Modify

Reuse existing Phase 2 system:
- ai-workflows.js
- ai-workflow-prompts.js
- ai-workflow-schema.js
- ai-decision-card.js

Modify:
- dashboard.js
- state.js
- app.js

---

# Implementation Steps

## Step 1 — Extend Schema

Add:
- monthly_action_planner

Validation:
- must include top_actions array

Fallback:
- empty actions
- low confidence

---

## Step 2 — Prompt Builder

Add:
- buildMonthlyPlannerPrompt(financialContext)

Prompt should consider:
- overspending categories
- debt load
- savings rate
- unused contribution room
- bills
- goals progress

Key instruction:
- prioritize top 3 actions only
- focus on impact

---

## Step 3 — Workflow Service

Add case:
- monthly_action_planner

Reuse all existing parsing + validation logic

---

## Step 4 — Dashboard Integration

Add button:
**Generate My Monthly Plan**

On click:
- run workflow
- show loading
- render decision card

---

## Step 5 — UX

This should feel like:
- a monthly ritual
- not a tool

Add copy:
- "Your financial game plan for this month"

---

## Step 6 — Save Actions

Reuse existing save system

---

## Acceptance Criteria

- user can generate monthly plan
- sees top 3 actions
- can save actions
- UI never breaks on bad AI output

---

## Definition of Done

User opens WealthFlow once per month, runs this workflow, and takes action.

This becomes the core loop of the product.
