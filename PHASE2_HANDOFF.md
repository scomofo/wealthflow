# Phase 2 — Interaction Layer Handoff

## Objective
Make WealthFlow feel **alive, responsive, and rewarding**.

Phase 1 added visual quality.
Phase 2 adds **behavior + feedback**.

---

# 🎯 Core Goal

Move from:
> UI reacts

To:
> UI responds + reinforces behavior

---

# 🧱 Phase 2 Scope

## In scope
- action completion feedback
- subtle animations (fade/remove)
- toast messaging improvements
- button hierarchy enforcement
- momentum feedback

## Out of scope
- heavy animations
- performance-heavy transitions
- full motion system overhaul

---

# 1. Action Completion Feedback

## Files
- `src/renderer/js/app.js`

## Update existing handlers

### Replace generic toasts with:

#### Next Best Actions
```js
showToast('Nice — progress made', 'success');
```

#### Saved Actions
```js
showToast('Plan item completed', 'success');
```

#### Dismiss
```js
showToast('Action dismissed', 'info');
```

#### Snooze
```js
showToast('Action snoozed for 7 days', 'info');
```

## Principle
- short
- calm
- reinforcing
- not gamified

---

# 2. Fade-Out Animation (High Impact, Simple)

## Goal
Instead of:
- click → instant disappear

Do:
- click → fade → remove

## CSS
Add to `main.css`:

```css
.fade-out {
  opacity: 0;
  transform: translateY(-4px);
  transition: all 0.2s ease;
}
```

## JS Pattern
Before removing action from state:

```js
const el = document.querySelector(`[data-id="${id}"]`);
if (el) {
  el.classList.add('fade-out');
  setTimeout(() => {
    // remove from state + rerender
  }, 180);
}
```

## Rule
- keep under 200ms
- do NOT delay UX

---

# 3. Button Hierarchy Enforcement

## Ensure across all components

### Primary
- `btn-primary`
- used for: complete / confirm

### Secondary
- `btn-secondary`
- used for: dismiss

### Tertiary
- `btn-ghost`
- used for: snooze / low importance

## Goal
- visual clarity
- no competing CTAs

---

# 4. Momentum Feedback (High Value)

## Add lightweight signal to dashboard

## Option A (simple)
Add below snapshot bar:

```js
<div class="card" style="padding:12px 16px">
  <div style="font-size:12px;color:var(--sub)">
    You completed 2 actions this week
  </div>
</div>
```

## Option B (better)
Compute from actions:
- count actions completed in last 7 days

## Goal
- reinforce behavior
- increase return usage

---

# 5. Micro-Interaction Improvements

## Add subtle hover feedback on action rows

```css
.action-card:hover {
  background: rgba(255,255,255,0.02);
}
```

## Optional: icon feedback
- slight scale on icon hover

---

# 6. Keep Tone Consistent

## Good tone
- "Nice — progress made"
- "Action completed"
- "You’re on track"

## Avoid
- gamification language
- hype
- pressure

---

# 7. Acceptance Criteria

## UX
- actions feel responsive
- completion feels acknowledged
- UI feels smoother

## Technical
- no lag introduced
- no broken state updates
- animations do not block interaction

---

# 8. Build Order

1. update toast messages
2. add fade-out CSS
3. wire fade-out in action handlers
4. enforce button hierarchy
5. add momentum feedback

---

# 9. Definition of Done

The UI should feel:
- responsive
- slightly animated
- rewarding

User should feel:
- progress
- clarity
- control

---

# Product Reminder

WealthFlow is a command center.

Every interaction should reinforce:
> you're making progress
