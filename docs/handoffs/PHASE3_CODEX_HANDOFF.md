# WealthFlow Phase 3 Codex Handoff — Architecture Refactor

## Objective
Refactor WealthFlow from a growing monolith into a modular, scalable architecture that supports rapid feature development (especially AI workflows) without increasing fragility.

This phase is about **maintainability, clarity, and future velocity**.

---

## Core Principles

1. Separate concerns (UI, state, domain, data)
2. Reduce file size and responsibility scope
3. Introduce domain boundaries
4. Make IPC predictable and grouped
5. Enable safe iteration for future contributors and Codex

---

## High-Level Refactor Targets

### 1. Break up renderer "god file" (app.js)
### 2. Split database layer into domain repositories
### 3. Modularize IPC handlers
### 4. Improve state management boundaries
### 5. Introduce domain-oriented structure

---

# 1. Renderer Refactor (app.js)

## Problem
- app.js handles routing, modals, AI, imports, events, etc.
- Hard to reason about and extend

## Target Structure

```
src/renderer/js/
  controllers/
    app-controller.js
    navigation-controller.js
    modal-controller.js
    ai-controller.js
    import-controller.js
```

## Codex Tasks

### Task 1 — Create Controllers Folder
- Move orchestration logic out of app.js

### Task 2 — Navigation Controller
Responsibilities:
- route handling
- page switching

### Task 3 — Modal Controller
Responsibilities:
- open/close modals
- modal lifecycle

### Task 4 — AI Controller
Responsibilities:
- trigger workflows
- handle responses
- connect to decision card UI

### Task 5 — Import Controller
Responsibilities:
- file import flow
- duplicate detection
- batch insert handling

### Task 6 — Slim Down app.js
Keep only:
- app bootstrap
- controller initialization

---

# 2. Database Layer Refactor

## Problem
- database.js contains all domains
- tightly coupled logic

## Target Structure

```
src/main/repos/
  baseRepo.js
  transactionsRepo.js
  budgetsRepo.js
  investmentsRepo.js
  planningRepo.js
  advisorRepo.js
  reportsRepo.js
  actionsRepo.js
```

## Codex Tasks

### Task 1 — Extract Transactions
Move:
- add/update/delete transaction
- batch insert

### Task 2 — Extract Planning Domain
Move:
- goals
- contribution room
- registered accounts

### Task 3 — Extract Advisor Domain
Move:
- advisor profile
- documents
- assets

### Task 4 — Extract Reports
Move:
- monthly reports
- analytics queries

### Task 5 — Create Actions Repo
Handle:
- recommended_actions (Phase 2)

### Task 6 — Keep Core DB
Keep in database.js:
- connection
- migrations
- shared helpers

---

# 3. IPC Layer Refactor

## Problem
- large flat handler file

## Target Structure

```
src/main/ipc/
  transactions.js
  planning.js
  advisor.js
  ai.js
  system.js
```

## Codex Tasks

### Task 1 — Group Handlers
Split existing handlers by domain

### Task 2 — Standardize Naming
Use pattern:
- transactions:add
- planning:updateGoal
- advisor:updateProfile

### Task 3 — Central Register
In ipc-handlers.js:
- import each module
- register all handlers

---

# 4. State Layer Refactor

## Problem
- single global state object
- manual mutation

## Target Structure

```
src/renderer/js/state/
  transactionsStore.js
  planningStore.js
  advisorStore.js
  actionsStore.js
```

## Codex Tasks

### Task 1 — Split State by Domain
Each store owns:
- data
- CRUD operations

### Task 2 — Add Selectors
Example:
- getNetWorth()
- getMonthlySpending()

### Task 3 — Normalize Where Needed
- avoid duplicate data
- keep single source of truth

---

# 5. Domain Boundaries

Each domain should contain:
- data (DB)
- logic (calculations)
- API (IPC)

## Domains
- Transactions
- Planning
- Investments
- Advisor
- Reports
- Actions (AI)

---

# 6. Migration Strategy

## Important
Do NOT refactor everything at once.

### Sequence
1. Introduce new structure
2. Move one domain at a time
3. Keep old paths working
4. Remove old code only after validation

---

# 7. Testing Strategy

Add lightweight tests or checks for:
- transaction CRUD
- financial calculations
- AI workflow integration

---

# 8. Success Criteria

- app.js < 300 lines
- database.js only handles connection/migrations
- IPC grouped by domain
- clear file ownership
- no regression in features

---

# 9. Risks

- breaking IPC contracts
- state desync
- partial refactor confusion

Mitigation:
- refactor incrementally
- test after each domain extraction

---

# 10. Definition of Done

Phase 3 is complete when:
- codebase is modular
- domains are clearly separated
- adding new features does not require touching 5+ files
- AI workflows integrate cleanly without hacks

---

## Final Note

Phase 3 is what allows WealthFlow to scale from a strong solo-built app into a serious product platform.

Do this right, and every future feature (especially AI-driven ones) becomes dramatically easier to build.
