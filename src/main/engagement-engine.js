class EngagementEngine {
  constructor(database) {
    this.database = database;
  }

  getWeeklyCompletionCount() {
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    // Count completed recommended actions
    const recommended = this.database.getAll
      ? this.database.getAll("SELECT COUNT(*) as cnt FROM recommended_actions WHERE status = 'completed' AND completed_at > ? AND deleted_at IS NULL", [sevenDaysAgo])
      : [];
    const recCount = (recommended[0] && recommended[0].cnt) || 0;

    // Count completed next best actions
    const nba = this.database.getAll
      ? this.database.getAll("SELECT COUNT(*) as cnt FROM next_best_actions WHERE status = 'done' AND completed_at > ? AND deleted_at IS NULL", [sevenDaysAgo])
      : [];
    const nbaCount = (nba[0] && nba[0].cnt) || 0;

    return recCount + nbaCount;
  }

  getMomentumState() {
    const count = this.getWeeklyCompletionCount();
    if (count >= 5) return { state: 'strong', count };
    if (count >= 2) return { state: 'building', count };
    return { state: 'low', count };
  }

  getProgressMessage() {
    return this.getProgressSummary().message;
  }

  getProgressSummary() {
    const { state, count } = this.getMomentumState();
    if (state === 'strong') {
      return {
        count,
        state,
        message: "You've been consistent this week - " + count + ' meaningful actions completed',
        helperText: 'The system is learning what helps you move fastest.',
      };
    }
    if (state === 'building') {
      return {
        count,
        state,
        message: "You're building momentum - " + count + ' meaningful actions completed this week',
        helperText: 'Keep the next action small and specific.',
      };
    }
    if (count === 0) {
      return {
        count,
        state,
        message: 'Take one small step to get back on track',
        helperText: 'Your highest-impact action is waiting below.',
      };
    }
    return {
      count,
      state,
      message: count + ' meaningful action completed this week',
      helperText: 'One more action will start building momentum.',
    };
  }

  getCompletionFeedback({ isFirstAction = false, actionTitle = '' } = {}) {
    const weeklyCount = this.getWeeklyCompletionCount();
    const detail = actionTitle ? 'Completed: ' + actionTitle : 'Completed one meaningful action';

    if (isFirstAction) {
      return {
        message: "Nice - you've taken your first step. That already improves your financial position.",
        detail,
        milestone: 'first_action',
        weeklyCount,
      };
    }

    if (weeklyCount > 0 && weeklyCount % 3 === 0) {
      return {
        message: "Nice - that's " + weeklyCount + ' actions this week.',
        detail,
        milestone: 'weekly_multiple',
        weeklyCount,
      };
    }

    return {
      message: 'Nice - progress made.',
      detail,
      milestone: null,
      weeklyCount,
    };
  }

  getEnhancedToast(baseMessage) {
    const feedback = this.getCompletionFeedback({ actionTitle: '' });
    return feedback.message || baseMessage;
  }
}

module.exports = { EngagementEngine };
