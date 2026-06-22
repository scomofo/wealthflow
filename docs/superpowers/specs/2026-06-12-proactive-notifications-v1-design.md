# Proactive Notifications V1 Design

## Goal

Add desktop-only proactive notifications that bring the user back to the single most important WealthFlow action without adding an in-app notification center.

WealthFlow already tells the user what to do when the dashboard is open. This phase closes the habit loop by notifying the user when there is a timely, high-value action worth returning for.

## Product Principle

Notifications must feel useful, rare, and explainable.

V1 should answer:

- Is there something important enough to interrupt the user?
- What is the one thing they should look at?
- Can we avoid repeating ourselves?

V1 should not become a feed, inbox, or reminder system.

## Scope

### In Scope

- Desktop notifications only.
- At most one proactive desktop notification per app startup.
- Rule-first candidate selection.
- Cooldown tracking in the existing personalization profile.
- Reuse existing Electron notification IPC.
- Respect the existing `bill_notifications` setting as the desktop notification master switch.
- Tests for candidate ranking, suppression, and integration behavior.

### Out of Scope

- In-app notification center.
- New notification database table.
- AI-generated notification copy.
- Scheduled background notifications while the app is closed.
- New settings UI.
- Push/mobile notifications.

## Current System Context

Existing pieces to reuse:

- `src/main/ipc-handlers.js` has `app:show-notification`.
- `src/main/preload.js` exposes `showNotification`.
- `src/renderer/js/app.js` currently sends a startup bills-due notification.
- `src/main/proactive-engine.js` stores cooldown-like nudge timestamps in `personalization_profile.nudge_shown`.
- `src/main/database.js` exposes:
  - `getSettings()`
  - `getPersonalizationProfile()`
  - `updatePersonalizationProfile(profile)`
  - `listNextBestActions(statusFilter)`
  - `listRecommendedActions()`
  - `getBillsDueSoon(days)`

The new feature should replace the current one-off bills-due startup notification with a broader desktop notification engine.

## Architecture

Create a main-process `DesktopNotificationEngine`:

```text
renderer startup
  -> preload notifications method
    -> IPC handler
      -> DesktopNotificationEngine.evaluate()
      -> Electron Notification
      -> personalization_profile cooldown update
```

The main process owns candidate selection because it already has direct access to the database, settings, and Electron notifications.

The renderer should only trigger the startup evaluation after normal app initialization. It should not know the ranking rules.

## Notification Candidates

The engine evaluates candidates in priority order and sends only the best eligible notification.

### 1. Urgent or High Next Best Action

Eligible when:

- `next_best_actions.status = open`
- action is not deleted
- priority is `urgent` or `high`, or score is at least `70`

Notification:

- Title: `WealthFlow: Action needed`
- Body: action title

Cooldown key:

- `nba:<action_key or id>`

Cooldown:

- 24 hours

### 2. Bills Due Soon

Eligible when:

- `getBillsDueSoon(settings.bill_notify_days || 3)` returns at least one bill
- existing desktop notification master switch is enabled

Notification:

- Title: `Bills due soon`
- Body: `<N> bill(s) due: <first three names>`

Cooldown key:

- `bills_due_soon`

Cooldown:

- 24 hours

### 3. Pending Saved Recommendation

Eligible when:

- `recommended_actions.status = pending`
- action is not deleted
- priority is `urgent` or `high`

Notification:

- Title: `WealthFlow: Saved action waiting`
- Body: action title

Cooldown key:

- `saved:<id>`

Cooldown:

- 72 hours

### 4. Month-End Review

Eligible when:

- Today is in the last five days of the month.

Notification:

- Title: `WealthFlow: Month-end review`
- Body: `Review your spending, goals, and next actions before the month closes.`

Cooldown key:

- `month_end_review:<YYYY-MM>`

Cooldown:

- 7 days

## Suppression Rules

The engine must suppress notification delivery when:

- `settings.bill_notifications === 0`
- Electron notifications are not supported
- No candidate is eligible
- The top candidate is inside its cooldown window

The engine should continue evaluating lower-ranked candidates if a higher-ranked candidate is suppressed by cooldown.

Only one notification may be shown per call.

## Cooldown Storage

Store cooldown timestamps in:

```js
personalization_profile.desktop_notifications_shown
```

Example:

```json
{
  "desktop_notifications_shown": {
    "nba:budget_overrun_food_2026_06": "2026-06-12T15:00:00.000Z",
    "bills_due_soon": "2026-06-12T15:00:00.000Z"
  }
}
```

This avoids a new migration and follows the existing profile-based suppression pattern used by proactive nudges.

## IPC and Preload

Add a new IPC handler:

```js
notifications:send-proactive-desktop
```

Add a preload method:

```js
sendProactiveDesktopNotification()
```

The method returns a result object:

```js
{
  sent: true,
  key: 'nba:budget_overrun_food_2026_06',
  title: 'WealthFlow: Action needed',
  body: 'Reduce Food spending by $160 this month',
  reason: 'next_best_action'
}
```

Suppressed result:

```js
{
  sent: false,
  reason: 'cooldown'
}
```

## Renderer Integration

Replace the existing startup bills-due notification block in `src/renderer/js/app.js` with:

```js
if (state.settings?.bill_notifications !== 0) {
  try {
    await window.wealthflow.sendProactiveDesktopNotification();
  } catch (e) {
    /* notifications not critical */
  }
}
```

The renderer should not call `getBillsDueSoon` directly for startup notifications after this change.

## Error Handling

- Notification failures are non-critical.
- IPC handler should return `{ sent: false, reason: 'unsupported' }` if Electron notifications are unavailable.
- Database/profile update failures should not crash startup.
- If cooldown recording fails after a notification is sent, return `sent: true` and include `cooldown_recorded: false`.

## Testing Strategy

Add `tests/desktop-notification-engine.test.js` covering:

- chooses urgent/high next best action before bills.
- skips completed, dismissed, snoozed, deleted, and low-priority actions.
- falls back to bills when higher candidates are not eligible.
- falls back to high-priority saved recommendation.
- emits month-end review in the last five days of the month.
- respects `bill_notifications === 0`.
- respects per-key cooldown and tries the next eligible candidate.
- records cooldown under `desktop_notifications_shown`.

Do not add separate IPC/preload tests in V1 unless the IPC handler contains logic beyond constructing the engine and returning its result. The required behavioral coverage is the main-process engine test suite.

## Acceptance Criteria

- App startup no longer sends only bill reminders.
- App startup can send one desktop notification for the most important eligible action.
- Notifications are desktop-only.
- Existing `bill_notifications` disables the new proactive desktop notifications.
- Cooldowns prevent repeated startup notifications.
- No new database table or migration is added.
- Full test suite passes.

## Success Definition

The user should feel:

> "WealthFlow only interrupts me when there is a real financial action worth taking."

Not:

> "This app keeps pinging me."
