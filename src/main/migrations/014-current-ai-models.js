module.exports = {
  version: 14,
  up(db) {
    // Move users off the old product defaults while preserving any other
    // explicitly chosen/custom model ID. Haiku 4.5 remains the current
    // low-cost option, so it is intentionally not migrated here.
    db.run(
      `UPDATE settings
       SET ai_model = CASE
         WHEN ai_model = 'claude-sonnet-4-5-20250929' THEN 'claude-sonnet-5'
         WHEN ai_model = 'claude-opus-4-6' THEN 'claude-opus-5'
         ELSE ai_model
       END
       WHERE id = 1`
    );
  },
};
