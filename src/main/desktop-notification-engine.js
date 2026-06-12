const DAY_MS = 24 * 60 * 60 * 1000;
const PRIORITY_RANK = { urgent: 0, high: 1, medium: 2, low: 3 };

function createElectronNotifier() {
  const { Notification } = require('electron');

  return {
    isSupported: () => Notification.isSupported(),
    show: (title, body) => new Notification({ title, body }).show(),
  };
}

function toNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function cleanText(value, fallback) {
  if (typeof value !== 'string') return fallback;
  const text = value.trim();
  return text || fallback;
}

function priorityValue(priority) {
  const normalized = cleanText(priority, 'low').toLowerCase();
  return PRIORITY_RANK[normalized] ?? PRIORITY_RANK.low;
}

function isHighValueAction(action) {
  const priority = cleanText(action.priority, '').toLowerCase();
  return priority === 'urgent' || priority === 'high' || toNumber(action.score) >= 70;
}

function compareActionImportance(a, b) {
  const priorityDiff = priorityValue(a.priority) - priorityValue(b.priority);
  if (priorityDiff !== 0) return priorityDiff;
  return toNumber(b.score) - toNumber(a.score);
}

function localYearMonth(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
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
    const candidates = [
      ...this._nextBestActionCandidates(),
      ...this._billCandidates(settings),
      ...this._savedRecommendationCandidates(),
      ...this._monthEndCandidates(),
    ];
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
        error: error instanceof Error ? error.message : String(error),
      };
    }

    try {
      this._recordCooldown(candidate);
    } catch {
      return {
        sent: true,
        key: candidate.key,
        title: candidate.title,
        body: candidate.body,
        reason: candidate.reason,
        cooldown_recorded: false,
      };
    }

    return {
      sent: true,
      key: candidate.key,
      title: candidate.title,
      body: candidate.body,
      reason: candidate.reason,
      cooldown_recorded: true,
    };
  }

  _settings() {
    try {
      if (!this.database || typeof this.database.getSettings !== 'function') {
        return {};
      }
      return this.database.getSettings() || {};
    } catch {
      return {};
    }
  }

  _profile() {
    try {
      if (
        !this.database ||
        typeof this.database.getPersonalizationProfile !== 'function'
      ) {
        return {};
      }
      return this.database.getPersonalizationProfile() || {};
    } catch {
      return {};
    }
  }

  _list(methodName, ...args) {
    try {
      if (!this.database || typeof this.database[methodName] !== 'function') {
        return [];
      }
      const result = this.database[methodName](...args);
      return Array.isArray(result) ? result : [];
    } catch {
      return [];
    }
  }

  _notificationsSupported() {
    if (!this.notifier || typeof this.notifier.show !== 'function') {
      return false;
    }

    if (typeof this.notifier.isSupported !== 'function') {
      return true;
    }

    try {
      return Boolean(this.notifier.isSupported());
    } catch {
      return false;
    }
  }

  _nextBestActionCandidates() {
    return this._list('listNextBestActions', 'open')
      .filter((action) => {
        const status = cleanText(action.status, 'open').toLowerCase();
        return !action.deleted_at && status === 'open' && isHighValueAction(action);
      })
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

    if (bills.length === 0) {
      return [];
    }

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
      .filter((action) => {
        const status = cleanText(action.status, 'pending').toLowerCase();
        const priority = cleanText(action.priority, '').toLowerCase();
        return (
          !action.deleted_at &&
          status === 'pending' &&
          (priority === 'urgent' || priority === 'high')
        );
      })
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

    if (daysLeft >= 5) {
      return [];
    }

    return [
      {
        key: `month_end_review:${localYearMonth(now)}`,
        title: 'WealthFlow: Month-end review',
        body: 'Review your spending, goals, and next actions before the month closes.',
        reason: 'month_end_review',
        cooldownMs: 7 * DAY_MS,
      },
    ];
  }

  _insideCooldown(candidate, profile) {
    const shown = profile.desktop_notifications_shown || {};
    const timestamp = shown[candidate.key];

    if (!timestamp) {
      return false;
    }

    const shownTime = new Date(timestamp).getTime();
    if (!Number.isFinite(shownTime)) {
      return false;
    }

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

module.exports = { DesktopNotificationEngine, createElectronNotifier };
