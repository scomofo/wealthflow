# Phase 1 CSS Patch

Paste the following into `src/renderer/styles/main.css`.

## 1. Replace the existing `.card` block with:

```css
.card {
  background: var(--card);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 6px;
  padding: 20px;
  margin-bottom: 14px;
  transition: all 0.2s ease;
}

.card:hover {
  transform: translateY(-1px);
  border-color: var(--accent);
}
```

## 2. Update the existing `.btn` block to include transition

```css
.btn {
  padding: 9px 18px;
  border-radius: 4px;
  font-size: 12px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: none;
  font-weight: 600;
  letter-spacing: .3px;
  text-transform: uppercase;
  transition: all 0.15s ease;
}
```

## 3. Add this directly below the `.btn` block

```css
.btn:active {
  transform: scale(0.97);
}
```

## 4. Add a unified priority badge system near the dashboard/action styles

```css
.priority-pill {
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .5px;
  text-transform: uppercase;
}

.priority-urgent {
  background: rgba(184,72,72,.12);
  color: var(--red);
}

.priority-high {
  background: rgba(192,138,64,.12);
  color: var(--orange);
}

.priority-medium {
  background: rgba(90,126,176,.10);
  color: var(--blue);
}

.priority-low {
  background: rgba(255,255,255,.05);
  color: var(--sub);
}
```

## Optional follow-up
After this patch is in, update action components to use `priority-pill priority-high|medium|low|urgent` instead of inline badge styles.
