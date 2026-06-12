const {
  DesktopNotificationEngine,
} = require('../src/main/desktop-notification-engine');

const BASE_NOW = new Date('2026-06-12T15:00:00.000Z');

function makeNotifier(overrides = {}) {
  const supported = overrides.supported !== undefined ? overrides.supported : true;

  return {
    isSupported: jest.fn(() => supported),
    show: jest.fn((title, body) => {
      if (overrides.show) {
        return overrides.show(title, body);
      }
      return undefined;
    }),
  };
}

function makeDb(overrides = {}) {
  let profile = overrides.profile || { desktop_notifications_shown: {} };

  const db = {
    get profile() {
      return profile;
    },
    getSettings: jest.fn(
      () => overrides.settings || { bill_notifications: 1, bill_notify_days: 3 }
    ),
    listNextBestActions: jest.fn(() => overrides.nextBestActions || []),
    getBillsDueSoon: jest.fn(() => overrides.bills || []),
    listRecommendedActions: jest.fn(() => overrides.savedActions || []),
    getPersonalizationProfile: jest.fn(() => profile),
    updatePersonalizationProfile: jest.fn((nextProfile) => {
      if (overrides.updatePersonalizationProfile) {
        return overrides.updatePersonalizationProfile(nextProfile);
      }
      profile = nextProfile;
      return profile;
    }),
  };

  return db;
}

function send(overrides = {}) {
  const db = makeDb(overrides);
  const notifier = makeNotifier(overrides.notifier);
  const engine = new DesktopNotificationEngine(db, notifier, {
    now: () => overrides.now || BASE_NOW,
  });

  const result = engine.send();

  return { result, db, notifier };
}

describe('DesktopNotificationEngine', () => {
  test('sends urgent/high next best action before bills', () => {
    const { result, db, notifier } = send({
      nextBestActions: [
        {
          status: 'open',
          priority: 'high',
          score: 82,
          title: 'Reduce Food spending by $160 this month',
          action_key: 'budget_overrun_food_2026_06',
        },
      ],
      bills: [{ title: 'Hydro' }],
    });

    expect(result).toEqual({
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
      db.profile.desktop_notifications_shown['nba:budget_overrun_food_2026_06']
    ).toBe('2026-06-12T15:00:00.000Z');
  });

  test('skips inactive and low-value next best actions before falling back to bills', () => {
    const { result } = send({
      nextBestActions: [
        { status: 'done', priority: 'urgent', score: 100, title: 'Done action' },
        {
          status: 'dismissed',
          priority: 'urgent',
          score: 100,
          title: 'Dismissed action',
        },
        {
          status: 'snoozed',
          priority: 'urgent',
          score: 100,
          title: 'Snoozed action',
        },
        {
          status: 'open',
          priority: 'urgent',
          score: 100,
          title: 'Deleted action',
          deleted_at: '2026-06-12T14:00:00.000Z',
        },
        {
          status: 'open',
          priority: 'medium',
          score: 49,
          title: 'Low value action',
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
  });

  test('sends high-priority saved recommendation when no stronger candidate exists', () => {
    const { result } = send({
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
  });

  test('sends month-end review in last five days of month', () => {
    const { result } = send({
      now: new Date('2026-06-27T15:00:00.000Z'),
    });

    expect(result).toMatchObject({
      sent: true,
      key: 'month_end_review:2026-06',
      title: 'WealthFlow: Month-end review',
      body: 'Review your spending, goals, and next actions before the month closes.',
      reason: 'month_end_review',
    });
  });

  test('respects desktop notification master switch', () => {
    const { result, db, notifier } = send({
      settings: { bill_notifications: 0 },
      nextBestActions: [
        {
          status: 'open',
          priority: 'urgent',
          title: 'Take urgent action',
          action_key: 'urgent_action',
        },
      ],
    });

    expect(result).toEqual({ sent: false, reason: 'disabled' });
    expect(notifier.show).not.toHaveBeenCalled();
    expect(db.listNextBestActions).not.toHaveBeenCalled();
  });

  test('does not send when desktop notifications unsupported', () => {
    const { result, notifier } = send({
      notifier: { supported: false },
      nextBestActions: [
        {
          status: 'open',
          priority: 'urgent',
          title: 'Take urgent action',
          action_key: 'urgent_action',
        },
      ],
    });

    expect(result).toEqual({ sent: false, reason: 'unsupported' });
    expect(notifier.show).not.toHaveBeenCalled();
  });

  test('skips cooled-down candidate and sends next eligible candidate', () => {
    const { result } = send({
      profile: {
        desktop_notifications_shown: {
          'nba:urgent_action': '2026-06-12T14:30:00.000Z',
        },
      },
      nextBestActions: [
        {
          status: 'open',
          priority: 'urgent',
          title: 'Take urgent action',
          action_key: 'urgent_action',
        },
      ],
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
      reason: 'saved_recommendation',
    });
  });

  test('returns cooldown when every candidate is inside cooldown', () => {
    const { result } = send({
      profile: {
        desktop_notifications_shown: {
          'nba:urgent_action': '2026-06-12T14:30:00.000Z',
        },
      },
      nextBestActions: [
        {
          status: 'open',
          priority: 'urgent',
          title: 'Take urgent action',
          action_key: 'urgent_action',
        },
      ],
    });

    expect(result).toEqual({ sent: false, reason: 'cooldown' });
  });

  test('returns sent when cooldown recording fails after notification delivery', () => {
    const { result, notifier } = send({
      nextBestActions: [
        {
          status: 'open',
          priority: 'urgent',
          title: 'Take urgent action',
          action_key: 'urgent_action',
        },
      ],
      updatePersonalizationProfile: () => {
        throw new Error('write failed');
      },
    });

    expect(result).toEqual({
      sent: true,
      key: 'nba:urgent_action',
      title: 'WealthFlow: Action needed',
      body: 'Take urgent action',
      reason: 'next_best_action',
      cooldown_recorded: false,
    });
    expect(notifier.show).toHaveBeenCalledWith(
      'WealthFlow: Action needed',
      'Take urgent action'
    );
  });

  test('returns none when there are no eligible candidates', () => {
    const { result } = send();

    expect(result).toEqual({ sent: false, reason: 'none' });
  });
});
