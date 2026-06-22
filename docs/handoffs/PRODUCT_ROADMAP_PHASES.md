# WealthFlow Product Improvement Roadmap

## Phase 1 — Sharpen the Product (Immediate)

### Goal
Turn WealthFlow into a decision-first financial operating system.

### Priorities

#### 1. Define Core Promise
- WealthFlow = "Your monthly financial command center"
- Focus on decisions, not tracking

#### 2. Simplify Navigation
- Home
- Money
- Growth
- Plan

#### 3. Build "Next Best Actions"
- Detect overspending
- Identify contribution opportunities
- Highlight debt inefficiencies
- Surface recurring issues

#### 4. Reframe Advisor Wizard
- Rename to "Financial Profile"
- Position as personalization engine

#### 5. Monthly Review Flow
- Import data
- Analyze changes
- Generate report
- Output action plan

---

## Phase 2 — Productize AI (Codex Handoff Ready)

### Goal
Convert AI from chat → structured financial decision engine

### Core Features

#### 1. Decision Workflows
- TFSA vs RRSP optimizer
- Debt vs investing allocator
- Monthly action planner

#### 2. Recommendation Cards
Each AI output should return:
- Recommendation
- Why
- Tradeoffs
- Action

#### 3. Saveable Actions
- Save recommendations into plan
- Track completion

### Codex Tasks
- Build AI workflow service layer
- Add structured prompt templates
- Create UI components for decision cards

---

## Phase 3 — Architecture Refactor (Codex Handoff Ready)

### Goal
Make system scalable and maintainable

### Refactors

#### 1. Split app.js
- Router controller
- Modal controller
- AI controller
- Import controller

#### 2. Split database.js
- transactionsRepo
- budgetingRepo
- planningRepo
- advisorRepo

#### 3. Modular IPC
- transactions.*
- planning.*
- advisor.*

#### 4. State Layer Improvements
- Domain-specific stores
- Computed selectors

---

## Priority Order
1. Phase 1 (must happen first)
2. Phase 2 (unlocks differentiation)
3. Phase 3 (enables scale)

---

## Success Metrics
- Daily active usage
- Monthly review completion rate
- Actions completed per user
- Retention after 30 days

---

This roadmap focuses on making WealthFlow a decision engine, not just a tracker.
