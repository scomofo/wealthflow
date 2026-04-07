# WealthFlow — Product & UI Memory (Claude.md)

## Purpose
This file acts as the **single source of truth** for how WealthFlow is being built.

It captures:
- product philosophy
- architecture decisions
- workflow system
- dashboard strategy
- UI system + polish roadmap

---

# 🧠 Product Philosophy

WealthFlow is not:
- a finance tracker
- a spreadsheet
- a reporting tool

WealthFlow is:
> **a financial decision engine + command center**

Core principle:
> “Tell the user what to do, not just what happened.”

---

# 🧱 Core System Architecture

## 1. AI Workflows (Deep Decisions)

Structured, deterministic AI flows:
- TFSA vs RRSP
- Debt vs Investing
- Monthly Planner

Each workflow:
- uses structured prompts
- returns strict JSON
- is validated + normalized
- renders via reusable UI
- produces saveable actions

---

## 2. Next Best Actions System (Always-On Intelligence)

Rule-based engine that:
- analyzes financial state
- generates actions
- ranks by priority
- persists state

Key principle:
> rule-first, AI-second

---

## 3. Dashboard = Command Center

Hierarchy:
1. Next Best Actions (hero)
2. Snapshot bar
3. Insights
4. Saved actions
5. Secondary content

Goal:
> user understands what to do in under 5 seconds

---

# 🎯 UX Philosophy

## Action-first design
Everything should answer:
- what matters
- what to do

## Reduce cognitive load
- fewer sections
- stronger hierarchy

## Progressive disclosure
- summary first
- detail on demand

---

# 🎨 UI System Principles

## Visual hierarchy
1. Actions (dominant)
2. Status
3. Context
4. Supporting data

## Tone
- calm
- intelligent
- non-judgmental

## Avoid
- clutter
- alarmist colors
- overly dense layouts

---

# 🚀 UI Execution Roadmap

## PHASE 1 — Perceived Quality (DONE FIRST)

### Goals
- add depth
- improve tactility
- clean visual noise

### Changes

#### Card Elevation
```css
.card {
  border: 1px solid rgba(255,255,255,0.06);
  transition: all 0.2s ease;
}
.card:hover {
  transform: translateY(-1px);
  border-color: var(--accent);
}
```

#### Button Feedback
```css
.btn:active {
  transform: scale(0.97);
}
```

#### Priority System
```css
.priority-pill { ... }
.priority-high { ... }
.priority-medium { ... }
.priority-low { ... }
```

---

## PHASE 2 — Interaction Layer

### Goals
- improve feedback
- reinforce action-taking

### Changes
- action completion toast
- optional fade-out animation
- proper button hierarchy

---

## PHASE 3 — Visual System

### Goals
- add depth
- improve readability

### Changes
- soft color layers
- snapshot bar refinement

---

## PHASE 4 — Behavioral UX

### Goals
- increase engagement
- build habit loop

### Changes
- momentum feedback ("2 actions completed")
- focus mode (single action view)

---

## PHASE 5 — Product Intelligence

### Goals
- increase perceived intelligence

### Changes
- AI summary card
- auto-refresh actions

---

# 💡 Key Product Loops

## Monthly Loop
- user opens app
- runs planner
- saves actions
- executes

## Daily Loop
- opens dashboard
- sees next best actions
- completes 1 action

---

# ⚠️ Guardrails

## Do NOT:
- overbuild before validating
- add too many UI elements
- rely fully on AI

## DO:
- keep things deterministic first
- prioritize clarity over completeness
- ship in phases

---

# 🧭 Definition of Success

WealthFlow should feel like:
> “This app understands my finances and tells me exactly what to do.”

Not:
> “This app shows me my numbers.”

---

# 🔥 Future Direction

After current roadmap:
- personalization engine
- onboarding upgrade
- "Can I afford this?" workflows
- proactive notifications

---

# Final Note

Small details matter.

At this stage:
> polish + behavior design = product quality
