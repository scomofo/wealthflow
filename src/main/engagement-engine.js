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
    const { state, count } = this.getMomentumState();
    if (state === 'strong') return 'You\u2019ve been consistent this week \u2014 ' + count + ' actions completed';
    if (state === 'building') return 'You\u2019re building momentum \u2014 ' + count + ' action' + (count !== 1 ? 's' : '') + ' completed this week';
    if (count === 0) return 'Take one small step to get back on track';
    return count + ' action completed this week \u2014 keep going';
  }

  getEnhancedToast(baseMessage) {
    const count = this.getWeeklyCompletionCount();
    // Only enhance every 3rd completion
    if (count > 0 && count % 3 === 0) {
      return 'Nice \u2014 that\u2019s ' + count + ' actions this week';
    }
    return baseMessage;
  }
}

module.exports = { EngagementEngine };
