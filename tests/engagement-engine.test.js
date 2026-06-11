const { EngagementEngine } = require('../src/main/engagement-engine');

function makeDb({ recommended = 0, nextBest = 0 } = {}) {
  return {
    getAll(sql) {
      if (sql.includes('recommended_actions')) return [{ cnt: recommended }];
      if (sql.includes('next_best_actions')) return [{ cnt: nextBest }];
      return [{ cnt: 0 }];
    },
  };
}

describe('EngagementEngine', () => {
  test('builds low progress summary for one weekly action', () => {
    const engine = new EngagementEngine(makeDb({ recommended: 1, nextBest: 0 }));
    expect(engine.getProgressSummary()).toEqual({
      count: 1,
      state: 'low',
      message: '1 meaningful action completed this week',
      helperText: 'One more action will start building momentum.',
    });
  });

  test('builds momentum summary for multiple weekly actions', () => {
    const engine = new EngagementEngine(makeDb({ recommended: 1, nextBest: 2 }));
    expect(engine.getProgressSummary()).toEqual({
      count: 3,
      state: 'building',
      message: "You're building momentum - 3 meaningful actions completed this week",
      helperText: 'Keep the next action small and specific.',
    });
  });

  test('builds strong summary for five or more weekly actions', () => {
    const engine = new EngagementEngine(makeDb({ recommended: 2, nextBest: 3 }));
    expect(engine.getProgressSummary()).toEqual({
      count: 5,
      state: 'strong',
      message: "You've been consistent this week - 5 meaningful actions completed",
      helperText: 'The system is learning what helps you move fastest.',
    });
  });

  test('returns first-action completion feedback', () => {
    const engine = new EngagementEngine(makeDb({ recommended: 0, nextBest: 1 }));
    expect(engine.getCompletionFeedback({
      isFirstAction: true,
      actionTitle: 'Pay down high-interest debt',
    })).toEqual({
      message: "Nice - you've taken your first step. That already improves your financial position.",
      detail: 'Completed: Pay down high-interest debt',
      milestone: 'first_action',
      weeklyCount: 1,
    });
  });

  test('returns weekly milestone feedback on every third completion', () => {
    const engine = new EngagementEngine(makeDb({ recommended: 1, nextBest: 2 }));
    expect(engine.getCompletionFeedback({
      isFirstAction: false,
      actionTitle: 'Review grocery spending',
    })).toEqual({
      message: "Nice - that's 3 actions this week.",
      detail: 'Completed: Review grocery spending',
      milestone: 'weekly_multiple',
      weeklyCount: 3,
    });
  });
});
