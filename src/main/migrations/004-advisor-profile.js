module.exports = {
  version: 4,
  up(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS advisor_personal (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        full_name TEXT DEFAULT '',
        date_of_birth TEXT DEFAULT '',
        marital_status TEXT DEFAULT '',
        dependents_count INTEGER DEFAULT 0,
        dependents_ages TEXT DEFAULT '[]',
        province TEXT DEFAULT '',
        citizenship_status TEXT DEFAULT '',
        email TEXT DEFAULT '',
        phone TEXT DEFAULT '',
        updated_at TEXT DEFAULT (datetime('now'))
      );
      INSERT OR IGNORE INTO advisor_personal (id) VALUES (1);

      CREATE TABLE IF NOT EXISTS advisor_employment (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        employment_status TEXT DEFAULT '',
        employer_name TEXT DEFAULT '',
        annual_gross_income REAL DEFAULT 0,
        income_rental REAL DEFAULT 0,
        income_pension REAL DEFAULT 0,
        income_investment REAL DEFAULT 0,
        income_government REAL DEFAULT 0,
        income_other REAL DEFAULT 0,
        expected_income_change TEXT DEFAULT '',
        updated_at TEXT DEFAULT (datetime('now'))
      );
      INSERT OR IGNORE INTO advisor_employment (id) VALUES (1);

      CREATE TABLE IF NOT EXISTS advisor_goals (
        id TEXT PRIMARY KEY,
        goal_type TEXT NOT NULL,
        priority INTEGER DEFAULT 0,
        time_horizon TEXT DEFAULT '',
        target_amount REAL DEFAULT 0,
        notes TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS advisor_risk (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        investment_experience TEXT DEFAULT '',
        portfolio_drop_reaction TEXT DEFAULT '',
        investment_time_horizon TEXT DEFAULT '',
        income_stability TEXT DEFAULT '',
        emergency_fund_months TEXT DEFAULT '',
        risk_score TEXT DEFAULT '',
        risk_score_numeric REAL DEFAULT 0,
        updated_at TEXT DEFAULT (datetime('now'))
      );
      INSERT OR IGNORE INTO advisor_risk (id) VALUES (1);

      CREATE TABLE IF NOT EXISTS advisor_assets (
        id TEXT PRIMARY KEY,
        asset_type TEXT NOT NULL,
        asset_subtype TEXT DEFAULT '',
        institution TEXT DEFAULT '',
        description TEXT DEFAULT '',
        balance REAL DEFAULT 0,
        notes TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS advisor_registered (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        tfsa_room REAL DEFAULT 0,
        rrsp_room REAL DEFAULT 0,
        resp_status TEXT DEFAULT '',
        fhsa_eligible INTEGER DEFAULT 0,
        property_status TEXT DEFAULT '',
        home_value REAL DEFAULT 0,
        mortgage_balance REAL DEFAULT 0,
        updated_at TEXT DEFAULT (datetime('now'))
      );
      INSERT OR IGNORE INTO advisor_registered (id) VALUES (1);

      CREATE TABLE IF NOT EXISTS advisor_insurance (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        life_insurance_type TEXT DEFAULT '',
        life_insurance_amount REAL DEFAULT 0,
        disability_insurance TEXT DEFAULT '',
        critical_illness INTEGER DEFAULT 0,
        home_insurance INTEGER DEFAULT 0,
        will_status TEXT DEFAULT '',
        power_of_attorney INTEGER DEFAULT 0,
        emergency_contact TEXT DEFAULT '',
        updated_at TEXT DEFAULT (datetime('now'))
      );
      INSERT OR IGNORE INTO advisor_insurance (id) VALUES (1);

      CREATE TABLE IF NOT EXISTS advisor_documents (
        id TEXT PRIMARY KEY,
        filename TEXT NOT NULL,
        original_name TEXT NOT NULL,
        doc_type TEXT DEFAULT '',
        notes TEXT DEFAULT '',
        upload_date TEXT DEFAULT (datetime('now')),
        file_size INTEGER DEFAULT 0
      );
    `);

    // Add profile tracking columns to settings
    try { db.run('ALTER TABLE settings ADD COLUMN profile_completed INTEGER DEFAULT 0'); } catch (_) { /* column may exist */ }
    try { db.run('ALTER TABLE settings ADD COLUMN last_wizard_step INTEGER DEFAULT 0'); } catch (_) { /* column may exist */ }
  }
};
