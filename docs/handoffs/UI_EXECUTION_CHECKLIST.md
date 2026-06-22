# WealthFlow UI Execution Checklist — Step-by-Step Implementation

## Objective
Execute the UI upgrades in strict order with maximum ROI and minimal risk.

---

# PHASE 1 — Immediate Perceived Quality (30–60 mins)

## Step 1 — Card Elevation (5–10 min)
Add to main.css:
```css
.card {
  border: 1px solid rgba(255,255,255,0.06);
  background: #1a1d22;
  transition: all 0.2s ease;
}
.card:hover {
  transform: translateY(-1px);
  border-color: var(--accent);
}
```

## Step 2 — Button Feedback (5–10 min)
```css
.btn {
  transition: all 0.15s ease;
}
.btn:active {
  transform: scale(0.97);
}
```

## Step 3 — Priority Badge Cleanup (10 min)
Refine badge styles to softer tones (see PREMIUM_UI_UPGRADE.md)

---

# PHASE 2 — Interaction Upgrade (45–90 mins)

## Step 4 — Action Completion Feedback

In app.js (after complete action):
- add toast: "Nice — progress made"

Optional:
- add fade-out CSS animation before removal

## Step 5 — Improve Action Button Hierarchy

Ensure:
- primary = btn-primary
- secondary = btn-secondary
- tertiary = btn-ghost

---

# PHASE 3 — Visual System Upgrade (60–120 mins)

## Step 6 — Add Soft Color Layers

Add:
```css
--bg-elevated: #1a1d22;
--border-soft: rgba(255,255,255,0.06);
--accent-soft: rgba(212,168,67,0.12);
```

## Step 7 — Snapshot Bar Polish

- fix totalDebt usage
- add separators
- tighten spacing

---

# PHASE 4 — Behavioral UX (High Impact)

## Step 8 — Momentum Feedback

Add small UI element:
- "2 actions completed this week"

## Step 9 — Focus Mode (optional but powerful)

Create modal:
- isolate top action
- show steps

---

# PHASE 5 — Next Level (Product Feel)

## Step 10 — AI Summary Card

Add optional summary under hero:
- short, 2–3 bullet insights

## Step 11 — Auto-refresh Actions

On dashboard load:
- regenerate actions if stale

---

# Definition of Done

You should feel:
- smoother interactions
- cleaner UI
- stronger hierarchy
- more confidence using the app

---

# Final Note

Do NOT try to do everything at once.
Ship Phase 1 first — it delivers the biggest perceived upgrade.
