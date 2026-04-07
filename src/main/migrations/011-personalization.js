module.exports = {
  version: 11,
  name: '011-personalization',
  up(db) {
    db.run("ALTER TABLE settings ADD COLUMN personalization_profile TEXT DEFAULT '{}'");
  },
};
