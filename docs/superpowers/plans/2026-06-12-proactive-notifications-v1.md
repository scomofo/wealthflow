# Proactive Notifications V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build desktop-only proactive notifications that send at most one timely WealthFlow action notification on app startup.

**Architecture:** Add a main-process `DesktopNotificationEngine` that ranks existing Next Best Actions, bill reminders, saved recommendations, and month-end review prompts. The engine sends through an injected Electron notifier, records cooldowns in `personalization_profile.desktop_notifications_shown`, and is triggered by a thin IPC/preload method from renderer startup.

**Tech Stack:** Electron main process, CommonJS, renderer ES modules, Jest, ESLint.

---

## File Structure

- Create: `src/main/desktop-notification-engine.js`
  - Owns candidate selection, cooldown checks, notification delivery, and cooldown recording.
  - Exports `DesktopNotificationEngine` and `createElectronNotifier`.
- Create: `tests/desktop-notification-engine.test.js`
  - Unit tests for ranking, suppression, cooldown fallback, and cooldown recording.
- Modify: `src/main/ipc-handlers.js`
  - Registers `notifications:send-proactive-desktop` using the engine.
- Modify: `src/main/preload.js`
  - Exposes `sendProactiveDesktopNotification()`.
- Modify: `src/renderer/js/app.js`
  - Replaces the existing bills-only startup notification with the proactive desktop notification call.
- Create: `tests/startup-desktop-notifications.test.js`
  - Static integration tests for the thin renderer/preload/IPC glue.

---

### Task 1: Desktop Notification Engine

**Files:**
- Create: `src/main/desktop-notification-engine.js`
- Test: `tests/desktop-notification-engine.test.js`

- [ ] **Step 1: Write the failing engine test**

Create `tests/desktop-notification-engine.test.js`:

```js
const {
  DesktopNotificationEngine,
} = require('../src/main/desktop-notification-engine');

const BASE_NOW = new Date('2026-06-12T15:00:00.000Z');

function makeNotifier(overrides = {}) {
  const supported = overrides.supported !== false;
  return {
    isSupported: jest.fn(() => supported),
    show: jest.fn((title, body) => {
      if (overrides.throwOnShow) {
        throw new Error('notification failed');
      }
      return { title, body };
    }),
  };
}

function makeDb(overrides = {}) {
  const profile = overrides.profile || {};
  return {
    _profile: profile,
    getSettings: jest.fn(
      () => overrides.settings ?? { bill_notifications: 1, bill_notify_days: 3 }
    ),
    listNextBestActions: jest.fn(() => overrides.nextBestActions || []),
    getBillsDueSoon: jest.fn(() => overrides.bills || []),
    listRecommendedActions: jest.fn(() => overrides.savedActions || []),
    getPersonalizationProfile: jest.fn(() => profile),
    updatePersonalizationProfile: jest.fn((nextProfile) => {
      Object.keys(profile).forEach((key) => delete profile[key]);
      Object.assign(profile, nextProfile);
    }),
  };
}

function send(overrides = {}) {
  const db = makeDb(overrides);
  const notifier = makeNotifier(overrides);
  const engine = new DesktopNotificationEngine(db, notifier, {
    now: () => overrides.now || BASE_NOW,
  });

  return {
    result: engine.send(),
    db,
    notifier,
  };
}

describe('DesktopNotificationEngine', () => {
  test('sends urgent next best action before bills', () => {
    const { result, db, notifier } = send({
      nextBestActions: [
        {
          id: 'nba-1',
          action_key: 'budget_overrun_food_2026_06',
          status: 'open',
          priority: 'high',
          score: 82,
          title: 'Reduce Food spending by $160 this month',
        },
      ],
      bills: [{ title: 'Hydro' }],
    });

    expect(result).toMatchObject({
      sent: true,
      key: 'nba:budget_overrun_food_2026_06',
      title: 'WealthFlow: Action needed',
      body: 'Reduce Food spending by $160 this month',
      reason: 'next_best_action',
      cooldown_recorded: true,
    });
    expect(notifier.show).toHaveBeenCalledWith(
      'WealthFlow: Action needed',
      'Reduce Food spending by $160 this month'
    );
    expect(
      db._profile.desktop_notifications_shown['nba:budget_overrun_food_2026_06']
    ).toBe('2026-06-12T15:00:00.000Z');
  });

  test('skips inactive and low-value next best actions before falling back to bills', () => {
    const { result, notifier } = send({
      nextBestActions: [
        {
          id: 'done',
          action_key: 'done_action',
          status: 'done',
          priority: 'urgent',
          score: 95,
          title: 'Already done',
        },
        {
          id: 'dismissed',
          action_key: 'dismissed_action',
          status: 'dismissed',
          priority: 'urgent',
          score: 95,
          title: 'Dismissed action',
        },
        {
          id: 'snoozed',
          action_key: 'snoozed_action',
          status: 'snoozed',
          priority: 'urgent',
          score: 95,
          title: 'Snoozed action',
        },
        {
          id: 'deleted',
          action_key: 'deleted_action',
          status: 'open',
          deleted_at: '2026-06-12T10:00:00.000Z',
          priority: 'urgent',
          score: 95,
          title: 'Deleted action',
        },
        {
          id: 'low',
          action_key: 'low_action',
          status: 'open',
          priority: 'low',
          score: 49,
          title: 'Low priority action',
        },
      ],
      bills: [{ title: 'Rent' }],
    });

    expect(result).toMatchObject({
      sent: true,
      key: 'bills_due_soon',
      title: 'Bills due soon',
      body: '1 bill(s) due: Rent',
      reason: 'bills_due_soon',
    });
    expect(notifier.show).toHaveBeenCalledWith(
      'Bills due soon',
      '1 bill(s) due: Rent'
    );
  });

  test('sends high-priority saved recommendation when no stronger candidate exists', () => {
    const { result, notifier } = send({
      savedActions: [
        {
          id: 'saved-1',
          status: 'pending',
          priority: 'high',
          title: 'Review your TFSA contribution plan',
        },
      ],
    });

    expect(result).toMatchObject({
      sent: true,
      key: 'saved:saved-1',
      title: 'WealthFlow: Saved action waiting',
      body: 'Review your TFSA contribution plan',
      reason: 'saved_recommendation',
    });
    expect(notifier.show).toHaveBeenCalledWith(
      'WealthFlow: Saved action waiting',
      'Review your TFSA contribution plan'
    );
  });

  test('sends month-end review in the last five days of the month', () => {
    const { result, notifier } = send({
      now: new Date('2026-06-27T15:00:00.000Z'),
    });

    expect(result).toMatchObject({
      sent: true,
      key: 'month_end_review:2026-06',
      title: 'WealthFlow: Month-end review',
      body: 'Review your spending, goals, and next actions before the month closes.',
      reason: 'month_end_review',
    });
    expect(notifier.show).toHaveBeenCalledWith(
      'WealthFlow: Month-end review',
      'Review your spending, goals, and next actions before the month closes.'
    );
  });

  test('respects desktop notification master switch', () => {
    const { result, db, notifier } = send({
      settings: { bill_notifications: 0, bill_notify_days: 3 },
      nextBestActions: [
        {
          id: 'nba-1',
          action_key: 'urgent_action',
          status: 'open',
          priority: 'urgent',
          score: 95,
          title: 'Urgent action',
        },
      ],
    });

    expect(result).toEqual({ sent: false, reason: 'disabled' });
    expect(notifier.show).not.toHaveBeenCalled();
    expect(db.listNextBestActions).not.toHaveBeenCalled();
  });

  test('does not send when desktop notifications are unsupported', () => {
    const { result, notifier } = send({
      supported: false,
      nextBestActions: [
        {
          id: 'nba-1',
          action_key: 'urgent_action',
          status: 'open',
          priority: 'urgent',
          score: 95,
          title: 'Urgent action',
        },
      ],
    });

    expect(result).toEqual({ sent: false, reason: 'unsupported' });
    expect(notifier.show).not.toHaveBeenCalled();
  });

  test('skips cooled-down candidate and sends next eligible candidate', () => {
    const { result, notifier } = send({
      profile: {
        desktop_notifications_shown: {
          'nba:urgent_action': '2026-06-12T14:30:00.000Z',
        },
      },
      nextBestActions: [
        {
          id: 'nba-1',
          action_key: 'urgent_action',
          status: 'open',
          priority: 'urgent',
          score: 95,
          title: 'Urgent action',
        },
      ],
      savedActions: [
        {
          id: 'saved-1',
          status: 'pending',
          priority: 'high',
          title: 'Review saved action',
        },
      ],
    });

    expect(result).toMatchObject({
      sent: true,
      key: 'saved:saved-1',
      reason: 'saved_recommendation',
    });
    expect(notifier.show).toHaveBeenCalledWith(
      'WealthFlow: Saved action waiting',
      'Review saved action'
    );
  });

  test('returns cooldown when every candidate is inside cooldown', () => {
    const { result, notifier } = send({
      profile: {
        desktop_notifications_shown: {
          'nba:urgent_action': '2026-06-12T14:30:00.000Z',
        },
      },
      nextBestActions: [
        {
          id: 'nba-1',
          action_key: 'urgent_action',
          status: 'open',
          priority: 'urgent',
          score: 95,
          title: 'Urgent action',
        },
      ],
    });

    expect(result).toEqual({ sent: false, reason: 'cooldown' });
    expect(notifier.show).not.toHaveBeenCalled();
  });

  test('returns sent when cooldown recording fails after notification delivery', () => {
    const db = makeDb({
      nextBestActions: [
        {
          id: 'nba-1',
          action_key: 'urgent_action',
          status: 'open',
          priority: 'urgent',
          score: 95,
          title: 'Urgent action',
        },
      ],
    });
    const notifier = makeNotifier();
    db.updatePersonalizationProfile.mockImplementation(() => {
      throw new Error('profile write failed');
    });
    const engine = new DesktopNotificationEngine(db, notifier, {
      now: () => BASE_NOW,
    });

    const result = engine.send();

    expect(result).toMatchObject({
      sent: true,
      key: 'nba:urgent_action',
      reason: 'next_best_action',
      cooldown_recorded: false,
    });
    expect(notifier.show).toHaveBeenCalledWith(
      'WealthFlow: Action needed',
      'Urgent action'
    );
  });

  test('returns none when there are no eligible candidates', () => {
    const { result, notifier } = send();

    expect(result).toEqual({ sent: false, reason: 'none' });
    expect(notifier.show).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the engine test to verify it fails**

Run:

```powershell
npm test -- tests/desktop-notification-engine.test.js
```

Expected: FAIL with `Cannot find module '../src/main/desktop-notification-engine'`.

- [ ] **Step 3: Create the desktop notification engine**

Create `src/main/desktop-notification-engine.js`:

```js
const DAY_MS = 24 * 60 * 60 * 1000;

const PRIORITY_RANK = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

function createElectronNotifier() {
  const { Notification } = require('electron');
  return {
    isSupported: () => Notification.isSupported(),
    show: (title, body) => new Notification({ title, body }).show(),
  };
}

function toNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function cleanText(value, fallback) {
  const text = String(value || '').trim();
  return text || fallback;
}

function priorityValue(priority) {
  return PRIORITY_RANK[priority] ?? PRIORITY_RANK.low;
}

function isHighValueAction(action) {
  return (
    action.priority === 'urgent' ||
    action.priority === 'high' ||
    toNumber(action.score) >= 70
  );
}

function compareActionImportance(a, b) {
  const priorityDiff = priorityValue(a.priority) - priorityValue(b.priority);
  if (priorityDiff !== 0) return priorityDiff;
  return toNumber(b.score) - toNumber(a.score);
}

class DesktopNotificationEngine {
  constructor(database, notifier = createElectronNotifier(), options = {}) {
    this.database = database;
    this.notifier = notifier;
    this.now = options.now || (() => new Date());
  }

  send() {
    const settings = this._settings();
    if (settings.bill_notifications === 0) {
      return { sent: false, reason: 'disabled' };
    }

    if (!this._notificationsSupported()) {
      return { sent: false, reason: 'unsupported' };
    }

    const profile = this._profile();
    const candidates = this._candidates(settings);
    let sawCooldown = false;

    for (const candidate of candidates) {
      if (this._insideCooldown(candidate, profile)) {
        sawCooldown = true;
        continue;
      }
      return this._sendCandidate(candidate);
    }

    return { sent: false, reason: sawCooldown ? 'cooldown' : 'none' };
  }

  _sendCandidate(candidate) {
    try {
      this.notifier.show(candidate.title, candidate.body);
    } catch (error) {
      return {
        sent: false,
        reason: 'notification_failed',
        error: error?.message || String(error),
      };
    }

    let cooldownRecorded = true;
    try {
      this._recordCooldown(candidate);
    } catch (_) {
      cooldownRecorded = false;
    }

    return {
      sent: true,
      key: candidate.key,
      title: candidate.title,
      body: candidate.body,
      reason: candidate.reason,
      cooldown_recorded: cooldownRecorded,
    };
  }

  _settings() {
    try {
      return this.database.getSettings?.() || {};
    } catch (_) {
      return {};
    }
  }

  _profile() {
    try {
      return this.database.getPersonalizationProfile?.() || {};
    } catch (_) {
      return {};
    }
  }

  _notificationsSupported() {
    if (!this.notifier || typeof this.notifier.show !== 'function') {
      return false;
    }
    if (typeof this.notifier.isSupported !== 'function') {
      return true;
    }
    return this.notifier.isSupported();
  }

  _list(methodName, ...args) {
    try {
      const value = this.database[methodName]?.(...args);
      return Array.isArray(value) ? value : [];
    } catch (_) {
      return [];
    }
  }

  _candidates(settings) {
    return [
      ...this._nextBestActionCandidates(),
      ...this._billCandidates(settings),
      ...this._savedRecommendationCandidates(),
      ...this._monthEndCandidates(),
    ];
  }

  _nextBestActionCandidates() {
    return this._list('listNextBestActions', 'open')
      .filter((action) => !action.deleted_at)
      .filter((action) => (action.status || 'open') === 'open')
      .filter(isHighValueAction)
      .sort(compareActionImportance)
      .map((action) => ({
        key: `nba:${action.action_key || action.id}`,
        title: 'WealthFlow: Action needed',
        body: cleanText(action.title, 'Review your top financial action.'),
        reason: 'next_best_action',
        cooldownMs: DAY_MS,
      }));
  }

  _billCandidates(settings) {
    const days = settings.bill_notify_days || 3;
    const bills = this._list('getBillsDueSoon', days);
    if (bills.length === 0) return [];

    const names = bills
      .slice(0, 3)
      .map((bill) => cleanText(bill.title || bill.name, 'Untitled bill'))
      .join(', ');

    return [
      {
        key: 'bills_due_soon',
        title: 'Bills due soon',
        body: `${bills.length} bill(s) due: ${names}`,
        reason: 'bills_due_soon',
        cooldownMs: DAY_MS,
      },
    ];
  }

  _savedRecommendationCandidates() {
    return this._list('listRecommendedActions')
      .filter((action) => !action.deleted_at)
      .filter((action) => (action.status || 'pending') === 'pending')
      .filter(
        (action) => action.priority === 'urgent' || action.priority === 'high'
      )
      .sort(compareActionImportance)
      .map((action) => ({
        key: `saved:${action.id}`,
        title: 'WealthFlow: Saved action waiting',
        body: cleanText(action.title, 'Review your saved recommendation.'),
        reason: 'saved_recommendation',
        cooldownMs: 3 * DAY_MS,
      }));
  }

  _monthEndCandidates() {
    const now = this.now();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const daysLeft = endOfMonth.getDate() - now.getDate();
    if (daysLeft > 5) return [];

    return [
      {
        key: `month_end_review:${now.toISOString().slice(0, 7)}`,
        title: 'WealthFlow: Month-end review',
        body: 'Review your spending, goals, and next actions before the month closes.',
        reason: 'month_end_review',
        cooldownMs: 7 * DAY_MS,
      },
    ];
  }

  _insideCooldown(candidate, profile) {
    const shown = profile.desktop_notifications_shown || {};
    const shownAt = shown[candidate.key];
    if (!shownAt) return false;

    const shownTime = new Date(shownAt).getTime();
    if (!Number.isFinite(shownTime)) return false;

    return this.now().getTime() - shownTime < candidate.cooldownMs;
  }

  _recordCooldown(candidate) {
    const profile = this._profile();
    const nextProfile = {
      ...profile,
      desktop_notifications_shown: {
        ...(profile.desktop_notifications_shown || {}),
        [candidate.key]: this.now().toISOString(),
      },
    };

    this.database.updatePersonalizationProfile(nextProfile);
  }
}

module.exports = {
  DesktopNotificationEngine,
  createElectronNotifier,
};
```

- [ ] **Step 4: Run the engine test to verify it passes**

Run:

```powershell
npm test -- tests/desktop-notification-engine.test.js
```

Expected: PASS with 10 tests.

- [ ] **Step 5: Lint the engine and test**

Run:

```powershell
npx eslint src/main/desktop-notification-engine.js tests/desktop-notification-engine.test.js
```

Expected: 0 errors.

- [ ] **Step 6: Commit the engine**

Run:

```powershell
git add src/main/desktop-notification-engine.js tests/desktop-notification-engine.test.js
git commit -m "Add proactive desktop notification engine"
```

---

### Task 2: Startup Integration

**Files:**
- Modify: `src/main/ipc-handlers.js`
- Modify: `src/main/preload.js`
- Modify: `src/renderer/js/app.js`
- Test: `tests/startup-desktop-notifications.test.js`

- [ ] **Step 1: Write the failing startup integration test**

Create `tests/startup-desktop-notifications.test.js`:

```js
const fs = require('fs');
const path = require('path');

function readRepoFile(...parts) {
  return fs.readFileSync(path.join(__dirname, '..', ...parts), 'utf8');
}

describe('startup proactive desktop notifications wiring', () => {
  test('renderer startup calls proactive desktop notification API instead of bills-only notification', () => {
    const appSource = readRepoFile('src', 'renderer', 'js', 'app.js');

    expect(appSource).toContain('sendProactiveDesktopNotification');
    expect(appSource).not.toContain(
      'getBillsDueSoon(state.settings?.bill_notify_days || 3)'
    );
    expect(appSource).not.toContain("showNotification('Bills Due Soon'");
  });

  test('preload exposes proactive desktop notification IPC method', () => {
    const preloadSource = readRepoFile('src', 'main', 'preload.js');

    expect(preloadSource).toContain('sendProactiveDesktopNotification');
    expect(preloadSource).toContain(
      "ipcRenderer.invoke('notifications:send-proactive-desktop')"
    );
  });

  test('main IPC registers proactive desktop notification handler', () => {
    const ipcSource = readRepoFile('src', 'main', 'ipc-handlers.js');

    expect(ipcSource).toContain("require('./desktop-notification-engine')");
    expect(ipcSource).toContain(
      "safeHandle('notifications:send-proactive-desktop'"
    );
  });
});
```

- [ ] **Step 2: Run the startup integration test to verify it fails**

Run:

```powershell
npm test -- tests/startup-desktop-notifications.test.js
```

Expected: FAIL because `sendProactiveDesktopNotification` and `notifications:send-proactive-desktop` are not wired yet.

- [ ] **Step 3: Wire preload method**

In `src/main/preload.js`, replace the desktop notification block:

```js
  // Desktop notifications
  showNotification: (title, body) => ipcRenderer.invoke('app:show-notification', title, body),
```

with:

```js
  // Desktop notifications
  showNotification: (title, body) => ipcRenderer.invoke('app:show-notification', title, body),
  sendProactiveDesktopNotification: () => ipcRenderer.invoke('notifications:send-proactive-desktop'),
```

- [ ] **Step 4: Wire IPC handler**

In `src/main/ipc-handlers.js`, after the proactive nudges block:

```js
  // Proactive nudges
  const { ProactiveEngine } = require('./proactive-engine');
  const proactiveEngine = new ProactiveEngine(database);

  safeHandle('proactive:evaluate', () => proactiveEngine.evaluate());
```

add:

```js
  // Proactive desktop notifications
  const {
    DesktopNotificationEngine,
    createElectronNotifier,
  } = require('./desktop-notification-engine');
  const desktopNotificationEngine = new DesktopNotificationEngine(
    database,
    createElectronNotifier()
  );

  safeHandle('notifications:send-proactive-desktop', () => {
    return desktopNotificationEngine.send();
  });
```

Keep the existing `app:show-notification` handler for legacy callers.

- [ ] **Step 5: Replace renderer startup notification block**

In `src/renderer/js/app.js`, replace:

```js
  if (state.settings?.bill_notifications !== 0) {
    try {
      const dueBills = await window.wealthflow.getBillsDueSoon(state.settings?.bill_notify_days || 3);
      if (dueBills.length > 0) {
        const names = dueBills.map(b => b.title).join(', ');
        window.wealthflow.showNotification('Bills Due Soon', `${dueBills.length} bill(s) due: ${names}`);
      }
    } catch (e) { /* notifications not critical */ }
  }
```

with:

```js
  if (state.settings?.bill_notifications !== 0) {
    try {
      await window.wealthflow.sendProactiveDesktopNotification();
    } catch (e) { /* notifications not critical */ }
  }
```

- [ ] **Step 6: Run startup integration test to verify it passes**

Run:

```powershell
npm test -- tests/startup-desktop-notifications.test.js
```

Expected: PASS with 3 tests.

- [ ] **Step 7: Run engine and startup tests together**

Run:

```powershell
npm test -- tests/desktop-notification-engine.test.js tests/startup-desktop-notifications.test.js
```

Expected: PASS with 13 tests.

- [ ] **Step 8: Lint touched integration files**

Run:

```powershell
npx eslint src/main/desktop-notification-engine.js src/main/ipc-handlers.js src/main/preload.js src/renderer/js/app.js tests/desktop-notification-engine.test.js tests/startup-desktop-notifications.test.js
```

Expected: 0 errors. Existing `src/renderer/js/app.js` `no-unused-vars` warnings may remain; do not broaden this task into unrelated app cleanup.

- [ ] **Step 9: Commit startup integration**

Run:

```powershell
git add src/main/ipc-handlers.js src/main/preload.js src/renderer/js/app.js tests/startup-desktop-notifications.test.js
git commit -m "Wire proactive desktop notifications on startup"
```

---

### Task 3: Final Verification

**Files:**
- Verify: all files changed by Tasks 1 and 2.

- [ ] **Step 1: Run focused notification tests**

Run:

```powershell
npm test -- tests/desktop-notification-engine.test.js tests/startup-desktop-notifications.test.js
```

Expected: PASS with 13 tests.

- [ ] **Step 2: Run proactive and intelligence regression tests**

Run:

```powershell
npm test -- tests/proactive-engine-intelligence.test.js tests/intelligence-refresh.test.js tests/next-best-actions-engine.test.js
```

Expected: PASS.

- [ ] **Step 3: Run full test suite**

Run:

```powershell
npm test
```

Expected: PASS for all suites.

- [ ] **Step 4: Run whitespace check**

Run:

```powershell
git diff --check
```

Expected: no output and exit code 0.

- [ ] **Step 5: Confirm no database migration was added**

Run:

```powershell
$changedMigrations = git diff --name-only master..HEAD | Select-String -Pattern '^src/main/migrations/'
if ($changedMigrations) {
  $changedMigrations
  exit 1
}
exit 0
```

Expected: exit code 0. If this command exits 1, inspect the migration diff and remove it unless an approved design revision changed the V1 scope.

- [ ] **Step 6: Check final branch status**

Run:

```powershell
git status --short --branch
```

Expected: branch `codex/proactive-notifications-v1`, clean except the existing untracked `AGENTS.md`.

- [ ] **Step 7: Prepare completion summary**

Report:

- Desktop-only proactive notification behavior implemented.
- Cooldowns stored in `personalization_profile.desktop_notifications_shown`.
- Existing `bill_notifications` setting remains the master switch.
- Verification command results.
- Branch and remaining untracked `AGENTS.md` state.
