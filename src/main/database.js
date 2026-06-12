const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

const { DEFAULT_AI_MODEL } = require('./constants');

class WealthFlowDatabase {
  constructor() {
    this.db = null;
    this.dbPath = null;
  }

  async init() {
    // Locate WASM file
    const wasmPaths = [
      path.join(__dirname, '../../node_modules/sql.js/dist/sql-wasm.wasm'),
      path.join(process.resourcesPath, 'sql-wasm.wasm'),
    ];
    let wasmBinary;
    for (const p of wasmPaths) {
      if (fs.existsSync(p)) {
        wasmBinary = fs.readFileSync(p);
        break;
      }
    }

    let SQL;
    try {
      SQL = await initSqlJs(wasmBinary ? { wasmBinary } : undefined);
    } catch (err) {
      throw new Error(`Failed to load SQL.js WASM engine: ${err.message}`, { cause: err });
    }

    this.dbPath = path.join(app.getPath('userData'), 'wealthflow.db');
    try {
      if (fs.existsSync(this.dbPath)) {
        const buffer = fs.readFileSync(this.dbPath);
        this.db = new SQL.Database(buffer);
      } else {
        this.db = new SQL.Database();
      }
    } catch (err) {
      throw new Error(`Failed to open database at ${this.dbPath}: ${err.message}`, { cause: err });
    }

    this.runMigrations();
    this.save();
  }

  save() {
    if (!this.db || !this.dbPath) return;
    const data = this.db.export();
    fs.writeFileSync(this.dbPath, Buffer.from(data));
  }

  run(sql, params = []) {
    this.db.run(sql, params);
    this._deferSave();
  }

  _deferSave() {
    if (this._saveTimer) return;
    this._saveTimer = setTimeout(() => {
      this._saveTimer = null;
      this.save();
    }, 100);
  }

  _decryptApiKey(encrypted) {
    if (!encrypted) return '';
    try {
      const { safeStorage } = require('electron');
      if (safeStorage.isEncryptionAvailable() && encrypted.startsWith('enc:')) {
        const buffer = Buffer.from(encrypted.slice(4), 'base64');
        return safeStorage.decryptString(buffer);
      }
    } catch { /* fallback to plaintext */ }
    // Legacy plaintext key - flag for re-encryption on next save
    if (!encrypted.startsWith('enc:')) {
      this._reEncryptNeeded = encrypted;
    }
    return encrypted;
  }

  _encryptApiKey(plaintext) {
    if (!plaintext) return '';
    try {
      const { safeStorage } = require('electron');
      if (safeStorage.isEncryptionAvailable()) {
        const encrypted = safeStorage.encryptString(plaintext);
        return 'enc:' + encrypted.toString('base64');
      }
    } catch { /* fallback to plaintext */ }
    return plaintext;
  }

  getOne(sql, params = []) {
    const stmt = this.db.prepare(sql);
    stmt.bind(params);
    let result = null;
    if (stmt.step()) {
      const cols = stmt.getColumnNames();
      const vals = stmt.get();
      result = {};
      cols.forEach((c, i) => { result[c] = vals[i]; });
    }
    stmt.free();
    return result;
  }

  getAll(sql, params = []) {
    const stmt = this.db.prepare(sql);
    stmt.bind(params);
    const results = [];
    const cols = stmt.getColumnNames();
    while (stmt.step()) {
      const vals = stmt.get();
      const row = {};
      cols.forEach((c, i) => { row[c] = vals[i]; });
      results.push(row);
    }
    stmt.free();
    return results;
  }

  getScalar(sql, params = []) {
    const stmt = this.db.prepare(sql);
    stmt.bind(params);
    let result = null;
    if (stmt.step()) result = stmt.get()[0];
    stmt.free();
    return result;
  }

  runMigrations() {
    this.db.run(`CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY,
      applied_at TEXT DEFAULT (datetime('now'))
    )`);

    const currentVersion = this.getScalar('SELECT COALESCE(MAX(version), 0) FROM schema_version') || 0;

    const migrations = [
      require('./migrations/001-initial-schema'),
      require('./migrations/002-phase2-schema'),
      require('./migrations/003-phase3-schema'),
      require('./migrations/004-advisor-profile'),
      require('./migrations/005-ai-settings'),
      require('./migrations/006-import-history'),
      require('./migrations/007-improvements'),
      require('./migrations/008-new-features'),
      require('./migrations/009-recommended-actions'),
      require('./migrations/010-next-best-actions'),
      require('./migrations/011-personalization'),
      require('./migrations/012-onboarding-settings'),
      require('./migrations/013-guided-onboarding-profile'),
    ];

    for (const migration of migrations) {
      if (migration.version > currentVersion) {
        this.db.run('BEGIN TRANSACTION');
        try {
          migration.up(this.db);
          this.db.run('INSERT INTO schema_version (version) VALUES (?)', [migration.version]);
          this.db.run('COMMIT');
        } catch (e) {
          this.db.run('ROLLBACK');
          throw new Error(`Migration ${migration.version} failed: ${e.message}`, { cause: e });
        }
      }
    }
    this.save();
  }

  // Settings
  getSettings() {
    const row = this.getOne('SELECT * FROM settings WHERE id = 1');
    if (!row) {
      return {
        id: 1,
        user_name: '',
        dark_mode: true,
        onboarded: false,
        level: 1,
        xp: 0,
        province: 'ON',
        profile_completed: false,
        last_wizard_step: 0,
        ai_api_key: '',
        ai_model: DEFAULT_AI_MODEL,
        monthly_income: 0,
        monthly_expenses: 0,
        total_debt: 0,
        savings_buffer: 0,
        first_action_completed: false,
        onboarding_focus: null,
        onboarding_confidence: 'starter',
        onboarding_completed_at: null,
      };
    }
    const settings = {
      ...row,
      dark_mode: !!row.dark_mode,
      onboarded: !!row.onboarded,
      profile_completed: !!row.profile_completed,
      first_action_completed: !!row.first_action_completed,
    };
    settings.ai_api_key = this._decryptApiKey(settings.ai_api_key);
    settings.onboarding_focus = settings.onboarding_focus || null;
    settings.onboarding_confidence = settings.onboarding_confidence || 'starter';
    settings.onboarding_completed_at = settings.onboarding_completed_at || null;
    return settings;
  }

  updateSettings(data) {
    const current = this.getSettings();
    this.run(
      `UPDATE settings SET user_name = ?, dark_mode = ?, onboarded = ?, level = ?, xp = ?, province = ?, profile_completed = ?, last_wizard_step = ?, ai_api_key = ?, ai_model = ?, monthly_income = ?, monthly_expenses = ?, total_debt = ?, savings_buffer = ?, first_action_completed = ?, onboarding_focus = ?, onboarding_confidence = ?, onboarding_completed_at = ?, updated_at = datetime('now') WHERE id = 1`,
      [
        data.user_name ?? current.user_name,
        (data.dark_mode !== undefined ? (data.dark_mode ? 1 : 0) : (current.dark_mode ? 1 : 0)),
        (data.onboarded !== undefined ? (data.onboarded ? 1 : 0) : (current.onboarded ? 1 : 0)),
        data.level ?? current.level,
        data.xp ?? current.xp,
        data.province ?? current.province,
        (data.profile_completed !== undefined ? (data.profile_completed ? 1 : 0) : (current.profile_completed ? 1 : 0)),
        data.last_wizard_step ?? current.last_wizard_step ?? 0,
        this._encryptApiKey(data.ai_api_key ?? current.ai_api_key ?? ''),
        data.ai_model ?? current.ai_model ?? DEFAULT_AI_MODEL,
        data.monthly_income ?? current.monthly_income ?? 0,
        data.monthly_expenses ?? current.monthly_expenses ?? 0,
        data.total_debt ?? current.total_debt ?? 0,
        data.savings_buffer ?? current.savings_buffer ?? 0,
        (data.first_action_completed !== undefined ? (data.first_action_completed ? 1 : 0) : (current.first_action_completed ? 1 : 0)),
        data.onboarding_focus !== undefined ? data.onboarding_focus : current.onboarding_focus,
        data.onboarding_confidence ?? current.onboarding_confidence ?? 'starter',
        data.onboarding_completed_at !== undefined ? data.onboarding_completed_at : current.onboarding_completed_at,
      ]
    );
    return this.getSettings();
  }

  // Transactions
  listTransactions() {
    return this.getAll('SELECT * FROM transactions WHERE deleted_at IS NULL ORDER BY date DESC, created_at DESC');
  }
  addTransaction(tx) {
    this.run(
      'INSERT INTO transactions (id, description, amount, category, date, icon, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [tx.id, tx.description, tx.amount, tx.category, tx.date, tx.icon || 'receipt', tx.notes || null]
    );
    return tx;
  }
  updateTransaction(tx) {
    this.run('UPDATE transactions SET description=?, amount=?, category=?, date=?, icon=? WHERE id=?',
      [tx.description, tx.amount, tx.category, tx.date, tx.icon || 'receipt', tx.id]);
    return tx;
  }
  deleteTransaction(id) { this.run("UPDATE transactions SET deleted_at = datetime('now') WHERE id = ?", [id]); }

  updateCategoryByDescription(description, category) {
    const count = this.getScalar(
      'SELECT COUNT(*) FROM transactions WHERE description = ? AND category != ?',
      [description, category]
    ) || 0;
    if (count > 0) {
      this.run('UPDATE transactions SET category = ? WHERE description = ?', [category, description]);
    }
    return count;
  }

  countTransactionsByDescription(description) {
    return this.getScalar('SELECT COUNT(*) FROM transactions WHERE description = ?', [description]) || 0;
  }

  addTransactionsBatch(txs) {
    this.db.run('BEGIN TRANSACTION');
    try {
      for (const tx of txs) {
        this.db.run(
          'INSERT INTO transactions (id, description, amount, category, date, icon, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [tx.id, tx.description, tx.amount, tx.category, tx.date, tx.icon || 'receipt', tx.notes || null]
        );
      }
      this.db.run('COMMIT');
    } catch (e) {
      this.db.run('ROLLBACK');
      throw e;
    }
    this.save();
    return txs.length;
  }

  findDuplicateTransactions(checks) {
    if (checks.length === 0) return [];
    const dates = checks.map(c => c.date).filter(Boolean);
    if (dates.length === 0) return checks.map(() => false);
    const minDate = dates.reduce((a, b) => a < b ? a : b);
    const maxDate = dates.reduce((a, b) => a > b ? a : b);
    const existing = this.getAll(
      'SELECT date, amount, description FROM transactions WHERE date >= ? AND date <= ? AND deleted_at IS NULL',
      [minDate, maxDate]
    );
    const existingSet = new Set(
      existing.map(t => `${t.date}|${t.amount}|${t.description}`)
    );
    return checks.map(c => existingSet.has(`${c.date}|${c.amount}|${c.description}`));
  }

  // Budgets
  listBudgets() { return this.getAll('SELECT * FROM budgets WHERE deleted_at IS NULL ORDER BY category'); }
  addBudget(b) {
    this.run('INSERT INTO budgets (id, category, amount, color) VALUES (?, ?, ?, ?)',
      [b.id, b.category, b.amount, b.color || '#6366f1']);
    return b;
  }
  updateBudget(b) {
    this.run('UPDATE budgets SET category = ?, amount = ?, color = ? WHERE id = ?',
      [b.category, b.amount, b.color, b.id]);
    return b;
  }
  deleteBudget(id) { this.run("UPDATE budgets SET deleted_at = datetime('now') WHERE id = ?", [id]); }

  // Goals
  listGoals() { return this.getAll('SELECT * FROM goals WHERE deleted_at IS NULL ORDER BY created_at'); }
  addGoal(g) {
    this.run('INSERT INTO goals (id, name, target, current, color, deadline) VALUES (?, ?, ?, ?, ?, ?)',
      [g.id, g.name, g.target, g.current || 0, g.color || '#10b981', g.deadline || null]);
    return g;
  }
  updateGoal(g) {
    this.run('UPDATE goals SET name = ?, target = ?, current = ?, color = ?, deadline = ? WHERE id = ?',
      [g.name, g.target, g.current, g.color, g.deadline, g.id]);
    return g;
  }
  deleteGoal(id) { this.run("UPDATE goals SET deleted_at = datetime('now') WHERE id = ?", [id]); }

  // Debts
  listDebts() { return this.getAll('SELECT * FROM debts WHERE deleted_at IS NULL ORDER BY rate DESC'); }
  addDebt(d) {
    this.run('INSERT INTO debts (id, name, balance, rate, min_payment, type) VALUES (?, ?, ?, ?, ?, ?)',
      [d.id, d.name, d.balance, d.rate || 0, d.min_payment || 0, d.type || 'loan']);
    return d;
  }
  updateDebt(d) {
    this.run('UPDATE debts SET name=?, balance=?, rate=?, min_payment=?, type=? WHERE id=?',
      [d.name, d.balance, d.rate, d.min_payment, d.type, d.id]);
    return d;
  }
  deleteDebt(id) { this.run("UPDATE debts SET deleted_at = datetime('now') WHERE id = ?", [id]); }

  // Investments
  listInvestments() { return this.getAll('SELECT * FROM investments WHERE deleted_at IS NULL ORDER BY symbol'); }
  addInvestment(i) {
    this.run(
      'INSERT INTO investments (id, symbol, name, shares, avg_cost, current_price, type, account_type, institution) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [i.id, i.symbol, i.name || '', i.shares || 0, i.avg_cost || 0, i.current_price || 0,
       i.type || 'stock', i.account_type || 'non-registered', i.institution || null]
    );
    return i;
  }
  updateInvestment(i) {
    this.run('UPDATE investments SET symbol=?, name=?, shares=?, avg_cost=?, current_price=?, type=?, account_type=?, institution=? WHERE id=?',
      [i.symbol, i.name, i.shares, i.avg_cost, i.current_price, i.type, i.account_type, i.institution, i.id]);
    return i;
  }
  deleteInvestment(id) { this.run("UPDATE investments SET deleted_at = datetime('now') WHERE id = ?", [id]); }

  // Bills
  listBills() { return this.getAll('SELECT * FROM bills WHERE deleted_at IS NULL ORDER BY date'); }
  addBill(b) {
    this.run(
      'INSERT INTO bills (id, title, type, amount, date, recurring, frequency, category, next_due_date, auto_generate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [b.id, b.title, b.type || 'bill', b.amount || 0, b.date, b.recurring || null,
       b.frequency || null, b.category || 'Other', b.next_due_date || b.date, b.auto_generate || 0]
    );
    return b;
  }
  updateBill(b) {
    this.run(
      'UPDATE bills SET title=?, type=?, amount=?, date=?, recurring=?, frequency=?, category=?, last_paid_date=?, next_due_date=?, auto_generate=? WHERE id=?',
      [b.title, b.type, b.amount, b.date, b.recurring, b.frequency, b.category,
       b.last_paid_date, b.next_due_date, b.auto_generate, b.id]
    );
    return b;
  }
  deleteBill(id) { this.run("UPDATE bills SET deleted_at = datetime('now') WHERE id = ?", [id]); }

  // Challenges
  listChallenges() { return this.getAll('SELECT * FROM challenges ORDER BY created_at'); }
  updateChallenge(c) {
    this.run('UPDATE challenges SET progress = ? WHERE id = ?', [c.progress, c.id]);
    return c;
  }

  // Community
  listCommunityPosts() { return this.getAll('SELECT * FROM community_posts ORDER BY created_at DESC'); }
  addCommunityPost(post) {
    this.run(
      'INSERT INTO community_posts (id, author, avatar, title, body, likes, comments, time_label, tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [post.id, post.author, post.avatar || '', post.title, post.body, 0, 0, 'just now', JSON.stringify(post.tags || [])]
    );
    return post;
  }

  // Education
  listEducation() { return this.getAll('SELECT * FROM education ORDER BY created_at'); }
  updateEducation(e) {
    this.run('UPDATE education SET completed = ? WHERE id = ?', [e.completed ? 1 : 0, e.id]);
    return e;
  }

  // Computed financials
  computeFinancials() {
    const settings = this.getSettings();
    // Exclude transfers from income/expense totals — they're not real income or spending
    const txStats = this.getOne(
      "SELECT " +
      "COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) as income, " +
      "COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END), 0) as expenses, " +
      "COUNT(*) as total_count " +
      "FROM transactions " +
      "WHERE deleted_at IS NULL AND category != 'Transfer'"
    );
    const hasTransactions = (txStats?.total_count || 0) > 0;
    const income = hasTransactions ? txStats.income : (settings.monthly_income || 0);
    const expenses = hasTransactions ? txStats.expenses : (settings.monthly_expenses || 0);
    const savingsRate = income > 0 ? ((income - expenses) / income * 100) : 0;
    const debtStats = this.getOne('SELECT COALESCE(SUM(balance), 0) as total, COUNT(*) as total_count FROM debts WHERE deleted_at IS NULL');
    const totalDebt = (debtStats?.total_count || 0) > 0 ? debtStats.total : (settings.total_debt || 0);
    const totalInv = this.getScalar('SELECT COALESCE(SUM(shares * current_price), 0) FROM investments WHERE deleted_at IS NULL') || 0;
    const goalStats = this.getOne('SELECT COALESCE(SUM(current), 0) as total, COUNT(*) as total_count FROM goals WHERE deleted_at IS NULL');
    const totalSaved = (goalStats?.total_count || 0) > 0 ? goalStats.total : (settings.savings_buffer || 0);
    const catRows = this.getAll(
      'SELECT category, SUM(ABS(amount)) as total FROM transactions WHERE amount < 0 AND deleted_at IS NULL GROUP BY category ORDER BY total DESC'
    );
    const catSpending = {};
    for (const row of catRows) catSpending[row.category] = row.total;
    return { income, expenses, savingsRate, totalDebt, totalInv, totalSaved, netWorth: totalInv + totalSaved - totalDebt, catSpending };
  }

  // Counts for achievements
  getCounts() {
    return {
      transactions: this.getScalar('SELECT COUNT(*) FROM transactions WHERE deleted_at IS NULL') || 0,
      budgets: this.getScalar('SELECT COUNT(*) FROM budgets WHERE deleted_at IS NULL') || 0,
      goals: this.getScalar('SELECT COUNT(*) FROM goals WHERE deleted_at IS NULL') || 0,
      debts: this.getScalar('SELECT COUNT(*) FROM debts WHERE deleted_at IS NULL') || 0,
      investments: this.getScalar('SELECT COUNT(*) FROM investments WHERE deleted_at IS NULL') || 0,
    };
  }

  // Seed sample data
  seedSampleData(data) {
    for (const tx of (data.transactions || [])) {
      this.db.run(
        'INSERT OR IGNORE INTO transactions (id, description, amount, category, date, icon) VALUES (?, ?, ?, ?, ?, ?)',
        [tx.id, tx.desc, tx.amount, tx.cat, tx.date, tx.ic || 'receipt']
      );
    }
    for (const g of (data.goals || [])) {
      this.db.run(
        'INSERT OR IGNORE INTO goals (id, name, target, current, color, deadline) VALUES (?, ?, ?, ?, ?, ?)',
        [g.id, g.name, g.target, g.current, g.color, g.deadline || null]
      );
    }
    for (const d of (data.debts || [])) {
      this.db.run(
        'INSERT OR IGNORE INTO debts (id, name, balance, rate, min_payment, type) VALUES (?, ?, ?, ?, ?, ?)',
        [d.id, d.name, d.balance, d.rate, d.min, d.type]
      );
    }
    for (const i of (data.investments || [])) {
      this.db.run(
        'INSERT OR IGNORE INTO investments (id, symbol, name, shares, avg_cost, current_price, type, account_type, institution) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [i.id, i.sym, i.name, i.shares, i.avg, i.price, i.type || 'stock', i.account_type || 'non-registered', i.institution || null]
      );
    }
    for (const b of (data.budgets || [])) {
      this.db.run(
        'INSERT OR IGNORE INTO budgets (id, category, amount, color) VALUES (?, ?, ?, ?)',
        [b.id, b.cat, b.amt, b.color]
      );
    }
    for (const b of (data.bills || [])) {
      this.db.run(
        'INSERT OR IGNORE INTO bills (id, title, type, amount, date) VALUES (?, ?, ?, ?, ?)',
        [b.id, b.title, b.type, b.amount, b.date]
      );
    }
    for (const ch of (data.challenges || [])) {
      this.db.run(
        'INSERT OR IGNORE INTO challenges (id, name, description, xp, target, progress) VALUES (?, ?, ?, ?, ?, ?)',
        [ch.id, ch.name, ch.desc, ch.xp, ch.target, ch.progress]
      );
    }
    for (const cp of (data.communityPosts || [])) {
      this.db.run(
        'INSERT OR IGNORE INTO community_posts (id, author, avatar, title, body, likes, comments, time_label, tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [cp.id, cp.author, cp.avatar, cp.title, cp.body, cp.likes, cp.comments, cp.time, JSON.stringify(cp.tags)]
      );
    }
    for (const e of (data.education || [])) {
      this.db.run(
        'INSERT OR IGNORE INTO education (id, title, type, duration, level, rating, completed) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [e.id, e.title, e.type, e.dur, e.lvl, e.r, 0]
      );
    }
    this.save();
  }

  // Contribution Room
  listContributionRoom() { return this.getAll('SELECT * FROM contribution_room ORDER BY account_type'); }
  upsertContributionRoom(cr) {
    this.run(
      `INSERT OR REPLACE INTO contribution_room (id, account_type, known_room, known_as_of_date, notes, updated_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      [cr.id || cr.account_type, cr.account_type, cr.known_room, cr.known_as_of_date, cr.notes || null]
    );
    return cr;
  }
  deleteContributionRoom(id) { this.run('DELETE FROM contribution_room WHERE id = ?', [id]); }

  // Contributions
  listContributions() { return this.getAll('SELECT * FROM contributions ORDER BY date DESC'); }
  addContribution(c) {
    this.run(
      'INSERT INTO contributions (id, account_type, amount, date, description, institution) VALUES (?, ?, ?, ?, ?, ?)',
      [c.id, c.account_type, c.amount, c.date, c.description || null, c.institution || null]
    );
    return c;
  }
  deleteContribution(id) { this.run('DELETE FROM contributions WHERE id = ?', [id]); }

  // RESP Beneficiaries
  listRESPBeneficiaries() { return this.getAll('SELECT * FROM resp_beneficiaries ORDER BY created_at'); }
  addRESPBeneficiary(b) {
    this.run(
      'INSERT INTO resp_beneficiaries (id, name, birth_year, total_contributions, total_cesg_received, notes) VALUES (?, ?, ?, ?, ?, ?)',
      [b.id, b.name, b.birth_year, b.total_contributions || 0, b.total_cesg_received || 0, b.notes || null]
    );
    return b;
  }
  updateRESPBeneficiary(b) {
    this.run(
      'UPDATE resp_beneficiaries SET name = ?, birth_year = ?, total_contributions = ?, total_cesg_received = ?, notes = ? WHERE id = ?',
      [b.name, b.birth_year, b.total_contributions, b.total_cesg_received, b.notes || null, b.id]
    );
    return b;
  }
  deleteRESPBeneficiary(id) { this.run('DELETE FROM resp_beneficiaries WHERE id = ?', [id]); }

  // GICs
  listGICs() { return this.getAll('SELECT * FROM gics ORDER BY maturity_date'); }
  addGIC(g) {
    this.run(
      'INSERT INTO gics (id, institution, principal, rate, term_months, purchase_date, maturity_date, account_type, is_cashable, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [g.id, g.institution, g.principal, g.rate, g.term_months, g.purchase_date, g.maturity_date,
       g.account_type || 'non-registered', g.is_cashable || 0, g.notes || null]
    );
    return g;
  }
  deleteGIC(id) { this.run('DELETE FROM gics WHERE id = ?', [id]); }

  // Recurring log
  listRecurringLog(billId) {
    return billId
      ? this.getAll('SELECT * FROM recurring_log WHERE bill_id = ? ORDER BY paid_date DESC', [billId])
      : this.getAll('SELECT * FROM recurring_log ORDER BY paid_date DESC');
  }
  addRecurringLog(entry) {
    this.run(
      'INSERT INTO recurring_log (id, bill_id, paid_date, amount, period_start, period_end, transaction_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [entry.id, entry.bill_id, entry.paid_date, entry.amount,
       entry.period_start, entry.period_end, entry.transaction_id || null]
    );
    return entry;
  }

  // Net worth history
  listNetWorthHistory() { return this.getAll('SELECT * FROM net_worth_history ORDER BY date ASC'); }
  snapshotNetWorth() {
    const today = new Date().toISOString().slice(0, 10);
    const existing = this.getOne('SELECT * FROM net_worth_history WHERE date = ?', [today]);
    if (existing) return existing;
    const totalInv = this.getScalar('SELECT COALESCE(SUM(shares * current_price), 0) FROM investments') || 0;
    const totalSaved = this.getScalar('SELECT COALESCE(SUM(current), 0) FROM goals') || 0;
    const totalDebt = this.getScalar('SELECT COALESCE(SUM(balance), 0) FROM debts') || 0;
    const netWorth = totalInv + totalSaved - totalDebt;
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    this.run(
      'INSERT INTO net_worth_history (id, date, total_investments, total_savings, total_debt, net_worth) VALUES (?, ?, ?, ?, ?, ?)',
      [id, today, totalInv, totalSaved, totalDebt, netWorth]
    );
    return { id, date: today, total_investments: totalInv, total_savings: totalSaved, total_debt: totalDebt, net_worth: netWorth };
  }

  // Analytics
  getMonthlyTotals(months = 6) {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - months);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    return this.getAll(`
      SELECT strftime('%Y-%m', date) as month,
             SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as income,
             SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) as expenses
      FROM transactions WHERE date >= ? AND deleted_at IS NULL
      GROUP BY strftime('%Y-%m', date) ORDER BY month ASC
    `, [cutoffStr]);
  }

  // Process recurring bills
  processRecurringBills() {
    const today = new Date().toISOString().slice(0, 10);
    const overdue = this.getAll(
      'SELECT * FROM bills WHERE frequency IS NOT NULL AND auto_generate = 1 AND next_due_date <= ? AND deleted_at IS NULL', [today]
    );
    const generated = [];
    for (const bill of overdue) {
      const txId = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
      this.db.run(
        'INSERT INTO transactions (id, description, amount, category, date, icon) VALUES (?, ?, ?, ?, ?, ?)',
        [txId, bill.title, bill.type === 'income' ? bill.amount : -bill.amount,
         bill.category || 'Other', today, 'clock']
      );
      const logId = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
      this.db.run(
        'INSERT INTO recurring_log (id, bill_id, paid_date, amount, period_start, period_end, transaction_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [logId, bill.id, today, bill.amount, bill.next_due_date, bill.next_due_date, txId]
      );
      const nextDue = this._calculateNextDue(bill.next_due_date, bill.frequency);
      this.db.run('UPDATE bills SET next_due_date = ?, last_paid_date = ? WHERE id = ?',
        [nextDue, today, bill.id]);
      generated.push({ bill: bill.title, txId });
    }
    if (generated.length > 0) this.save();
    return generated;
  }

  _calculateNextDue(fromDate, frequency) {
    const d = new Date(fromDate);
    const origDay = d.getDate();
    switch (frequency) {
      case 'weekly': d.setDate(d.getDate() + 7); break;
      case 'biweekly': d.setDate(d.getDate() + 14); break;
      case 'monthly':
        d.setMonth(d.getMonth() + 1);
        if (d.getDate() !== origDay) d.setDate(0); // fix month overflow
        break;
      case 'quarterly':
        d.setMonth(d.getMonth() + 3);
        if (d.getDate() !== origDay) d.setDate(0);
        break;
      case 'annual': d.setFullYear(d.getFullYear() + 1); break;
    }
    return d.toISOString().slice(0, 10);
  }

  // Export all data
  exportAllData() {
    return {
      settings: this.getSettings(),
      transactions: this.listTransactions(),
      budgets: this.listBudgets(),
      goals: this.listGoals(),
      debts: this.listDebts(),
      investments: this.listInvestments(),
      bills: this.listBills(),
      contributions: this.listContributions(),
      contributionRoom: this.listContributionRoom(),
      respBeneficiaries: this.listRESPBeneficiaries(),
      gics: this.listGICs(),
      challenges: this.listChallenges(),
      netWorthHistory: this.listNetWorthHistory(),
      exportDate: new Date().toISOString(),
      version: '1.0.0',
    };
  }

  // Advisor Profile — Singleton tables
  getAdvisorPersonal() { return this.getOne('SELECT * FROM advisor_personal WHERE id = 1'); }
  updateAdvisorPersonal(data) {
    this.run(
      `UPDATE advisor_personal SET full_name=?, date_of_birth=?, marital_status=?, dependents_count=?, dependents_ages=?, province=?, citizenship_status=?, email=?, phone=?, updated_at=datetime('now') WHERE id=1`,
      [data.full_name || '', data.date_of_birth || '', data.marital_status || '', data.dependents_count || 0,
       data.dependents_ages || '[]', data.province || '', data.citizenship_status || '', data.email || '', data.phone || '']
    );
    return this.getAdvisorPersonal();
  }

  getAdvisorEmployment() { return this.getOne('SELECT * FROM advisor_employment WHERE id = 1'); }
  updateAdvisorEmployment(data) {
    this.run(
      `UPDATE advisor_employment SET employment_status=?, employer_name=?, annual_gross_income=?, income_rental=?, income_pension=?, income_investment=?, income_government=?, income_other=?, expected_income_change=?, updated_at=datetime('now') WHERE id=1`,
      [data.employment_status || '', data.employer_name || '', data.annual_gross_income || 0,
       data.income_rental || 0, data.income_pension || 0, data.income_investment || 0,
       data.income_government || 0, data.income_other || 0, data.expected_income_change || '']
    );
    return this.getAdvisorEmployment();
  }

  getAdvisorRisk() { return this.getOne('SELECT * FROM advisor_risk WHERE id = 1'); }
  updateAdvisorRisk(data) {
    this.run(
      `UPDATE advisor_risk SET investment_experience=?, portfolio_drop_reaction=?, investment_time_horizon=?, income_stability=?, emergency_fund_months=?, risk_score=?, risk_score_numeric=?, updated_at=datetime('now') WHERE id=1`,
      [data.investment_experience || '', data.portfolio_drop_reaction || '', data.investment_time_horizon || '',
       data.income_stability || '', data.emergency_fund_months || '', data.risk_score || '', data.risk_score_numeric || 0]
    );
    return this.getAdvisorRisk();
  }

  getAdvisorRegistered() { return this.getOne('SELECT * FROM advisor_registered WHERE id = 1'); }
  updateAdvisorRegistered(data) {
    this.run(
      `UPDATE advisor_registered SET tfsa_room=?, rrsp_room=?, resp_status=?, fhsa_eligible=?, property_status=?, home_value=?, mortgage_balance=?, updated_at=datetime('now') WHERE id=1`,
      [data.tfsa_room || 0, data.rrsp_room || 0, data.resp_status || '', data.fhsa_eligible ? 1 : 0,
       data.property_status || '', data.home_value || 0, data.mortgage_balance || 0]
    );
    return this.getAdvisorRegistered();
  }

  getAdvisorInsurance() { return this.getOne('SELECT * FROM advisor_insurance WHERE id = 1'); }
  updateAdvisorInsurance(data) {
    this.run(
      `UPDATE advisor_insurance SET life_insurance_type=?, life_insurance_amount=?, disability_insurance=?, critical_illness=?, home_insurance=?, will_status=?, power_of_attorney=?, emergency_contact=?, updated_at=datetime('now') WHERE id=1`,
      [data.life_insurance_type || '', data.life_insurance_amount || 0, data.disability_insurance || '',
       data.critical_illness ? 1 : 0, data.home_insurance ? 1 : 0, data.will_status || '',
       data.power_of_attorney ? 1 : 0, data.emergency_contact || '']
    );
    return this.getAdvisorInsurance();
  }

  // Advisor Profile — Multi-row tables
  listAdvisorGoals() { return this.getAll('SELECT * FROM advisor_goals ORDER BY priority, created_at'); }
  upsertAdvisorGoal(g) {
    this.run(
      `INSERT OR REPLACE INTO advisor_goals (id, goal_type, priority, time_horizon, target_amount, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, COALESCE((SELECT created_at FROM advisor_goals WHERE id = ?), datetime('now')))`,
      [g.id, g.goal_type, g.priority || 0, g.time_horizon || '', g.target_amount || 0, g.notes || '', g.id]
    );
    return g;
  }
  deleteAdvisorGoal(id) { this.run('DELETE FROM advisor_goals WHERE id = ?', [id]); }

  listAdvisorAssets() { return this.getAll('SELECT * FROM advisor_assets ORDER BY created_at'); }
  addAdvisorAsset(a) {
    this.run(
      'INSERT INTO advisor_assets (id, asset_type, asset_subtype, institution, description, balance, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [a.id, a.asset_type, a.asset_subtype || '', a.institution || '', a.description || '', a.balance || 0, a.notes || '']
    );
    return a;
  }
  updateAdvisorAsset(a) {
    this.run(
      'UPDATE advisor_assets SET asset_type=?, asset_subtype=?, institution=?, description=?, balance=?, notes=? WHERE id=?',
      [a.asset_type, a.asset_subtype || '', a.institution || '', a.description || '', a.balance || 0, a.notes || '', a.id]
    );
    return a;
  }
  deleteAdvisorAsset(id) { this.run('DELETE FROM advisor_assets WHERE id = ?', [id]); }

  listAdvisorDocuments() { return this.getAll('SELECT * FROM advisor_documents ORDER BY upload_date DESC'); }
  addAdvisorDocument(doc) {
    this.run(
      'INSERT INTO advisor_documents (id, filename, original_name, doc_type, notes, file_size) VALUES (?, ?, ?, ?, ?, ?)',
      [doc.id, doc.filename, doc.original_name, doc.doc_type || '', doc.notes || '', doc.file_size || 0]
    );
    return doc;
  }
  deleteAdvisorDocument(id) { this.run('DELETE FROM advisor_documents WHERE id = ?', [id]); }

  // Full advisor profile aggregate
  getAdvisorProfile() {
    return {
      personal: this.getAdvisorPersonal(),
      employment: this.getAdvisorEmployment(),
      goals: this.listAdvisorGoals(),
      risk: this.getAdvisorRisk(),
      assets: this.listAdvisorAssets(),
      registered: this.getAdvisorRegistered(),
      insurance: this.getAdvisorInsurance(),
      documents: this.listAdvisorDocuments(),
    };
  }

  // Import History
  listImportHistory() { return this.getAll('SELECT * FROM import_history ORDER BY import_date DESC LIMIT 50'); }
  addImportHistory(entry) {
    this.run(
      'INSERT INTO import_history (id, filename, file_type, total_rows, imported_count, skipped_count, duplicate_count, error_count, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [entry.id, entry.filename, entry.file_type, entry.total_rows || 0, entry.imported_count || 0,
       entry.skipped_count || 0, entry.duplicate_count || 0, entry.error_count || 0, entry.notes || null]
    );
    return entry;
  }

  // Principal Residence
  getPrincipalResidence() {
    return this.getOne('SELECT * FROM principal_residence WHERE id = 1');
  }
  updatePrincipalResidence(data) {
    const current = this.getPrincipalResidence() || {};
    this.run(
      `UPDATE principal_residence SET purchase_price=?, current_value=?, purchase_date=?, address=?,
       mortgage_balance=?, mortgage_rate=?, mortgage_payment=?, mortgage_amortization_months=?,
       property_tax_annual=?, pre_eligible=?, heloc_balance=?, heloc_limit=?, heloc_rate=?,
       notes=?, updated_at=datetime('now') WHERE id=1`,
      [
        data.purchase_price ?? current.purchase_price ?? 0,
        data.current_value ?? current.current_value ?? 0,
        data.purchase_date ?? current.purchase_date,
        data.address ?? current.address ?? '',
        data.mortgage_balance ?? current.mortgage_balance ?? 0,
        data.mortgage_rate ?? current.mortgage_rate ?? 0,
        data.mortgage_payment ?? current.mortgage_payment ?? 0,
        data.mortgage_amortization_months ?? current.mortgage_amortization_months ?? 300,
        data.property_tax_annual ?? current.property_tax_annual ?? 0,
        data.pre_eligible !== undefined ? (data.pre_eligible ? 1 : 0) : (current.pre_eligible ?? 1),
        data.heloc_balance ?? current.heloc_balance ?? 0,
        data.heloc_limit ?? current.heloc_limit ?? 0,
        data.heloc_rate ?? current.heloc_rate ?? 0,
        data.notes ?? current.notes,
      ]
    );
    return this.getPrincipalResidence();
  }

  // Monthly Reports
  listMonthlyReports() { return this.getAll('SELECT * FROM monthly_reports ORDER BY year DESC, month DESC'); }
  getMonthlyReport(month, year) {
    return this.getOne('SELECT * FROM monthly_reports WHERE month = ? AND year = ?', [month, year]);
  }
  saveMonthlyReport(report) {
    this.run(
      `INSERT OR REPLACE INTO monthly_reports (id, month, year, report_text, generated_at, spending_vs_last, budget_adherence, net_worth_change)
       VALUES (?, ?, ?, ?, datetime('now'), ?, ?, ?)`,
      [report.id, report.month, report.year, report.report_text,
       report.spending_vs_last ?? null, report.budget_adherence ?? null, report.net_worth_change ?? null]
    );
    return report;
  }

  // Recommended Actions
  listRecommendedActions() {
    return this.getAll("SELECT * FROM recommended_actions WHERE deleted_at IS NULL ORDER BY created_at DESC");
  }

  addRecommendedAction(a) {
    this.run(
      'INSERT INTO recommended_actions (id, workflow_type, title, action_type, priority, status, impact_text, source_payload) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [a.id, a.workflow_type, a.title, a.action_type || null, a.priority || 'medium', a.status || 'pending', a.impact_text || null, a.source_payload || null]
    );
    return a;
  }

  completeRecommendedAction(id) {
    this.run("UPDATE recommended_actions SET status = 'completed', completed_at = datetime('now') WHERE id = ?", [id]);
  }

  deleteRecommendedAction(id) {
    this.run("UPDATE recommended_actions SET deleted_at = datetime('now') WHERE id = ?", [id]);
  }

  // Next Best Actions
  listNextBestActions(statusFilter) {
    if (statusFilter) {
      if (statusFilter === 'open') {
        const today = new Date().toISOString().slice(0, 10);
        this.run(
          "UPDATE next_best_actions SET status = 'open', snoozed_until = NULL WHERE status = 'snoozed' AND snoozed_until IS NOT NULL AND snoozed_until <= ? AND deleted_at IS NULL",
          [today]
        );
      }
      return this.getAll("SELECT * FROM next_best_actions WHERE status = ? AND deleted_at IS NULL ORDER BY score DESC", [statusFilter]);
    }
    return this.getAll("SELECT * FROM next_best_actions WHERE deleted_at IS NULL ORDER BY score DESC");
  }

  upsertNextBestAction(a) {
    const existing = this.getOne("SELECT id FROM next_best_actions WHERE action_key = ? AND deleted_at IS NULL", [a.action_key]);
    if (existing) {
      this.run(
        "UPDATE next_best_actions SET title=?, description=?, rationale=?, category=?, priority=?, score=?, source_payload=?, related_entity_type=?, related_entity_id=?, impact_text=?, generated_at=datetime('now') WHERE id=?",
        [a.title, a.description || null, a.rationale || null, a.category || null, a.priority, a.score, a.source_payload || null, a.related_entity_type || null, a.related_entity_id || null, a.impact_text || null, existing.id]
      );
      return { ...a, id: existing.id };
    }
    this.run(
      'INSERT INTO next_best_actions (id, action_key, title, description, rationale, category, priority, score, status, source_type, source_payload, related_entity_type, related_entity_id, impact_text) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [a.id, a.action_key, a.title, a.description || null, a.rationale || null, a.category || null, a.priority, a.score, 'open', a.source_type || 'rule', a.source_payload || null, a.related_entity_type || null, a.related_entity_id || null, a.impact_text || null]
    );
    return a;
  }

  completeNextBestAction(id) {
    this.run("UPDATE next_best_actions SET status = 'done', completed_at = datetime('now') WHERE id = ?", [id]);
  }

  dismissNextBestAction(id) {
    this.run("UPDATE next_best_actions SET status = 'dismissed', dismissed_at = datetime('now') WHERE id = ?", [id]);
  }

  snoozeNextBestAction(id, untilDate) {
    this.run("UPDATE next_best_actions SET status = 'snoozed', snoozed_until = ? WHERE id = ?", [untilDate, id]);
  }

  deleteNextBestAction(id) {
    this.run("UPDATE next_best_actions SET deleted_at = datetime('now') WHERE id = ?", [id]);
  }

  clearStaleNextBestActions(activeKeys) {
    if (!activeKeys || activeKeys.length === 0) return;
    const placeholders = activeKeys.map(() => '?').join(',');
    this.run(
      "UPDATE next_best_actions SET deleted_at = datetime('now') WHERE status = 'open' AND action_key NOT IN (" + placeholders + ") AND deleted_at IS NULL",
      activeKeys
    );
  }

  // Undo Log
  addUndoEntry(entry) {
    this.run(
      'INSERT INTO undo_log (action_type, entity_type, entity_id, old_data, new_data) VALUES (?, ?, ?, ?, ?)',
      [entry.action_type, entry.entity_type, entry.entity_id,
       entry.old_data ? JSON.stringify(entry.old_data) : null,
       entry.new_data ? JSON.stringify(entry.new_data) : null]
    );
  }
  getLastUndoEntries(limit = 10) {
    return this.getAll('SELECT * FROM undo_log ORDER BY id DESC LIMIT ?', [limit]);
  }
  deleteUndoEntry(id) { this.run('DELETE FROM undo_log WHERE id = ?', [id]); }
  clearOldUndoEntries() {
    this.run(`DELETE FROM undo_log WHERE id NOT IN (SELECT id FROM undo_log ORDER BY id DESC LIMIT 50)`);
  }

  // Budget rollover
  getBudgetCarried(budgetId) {
    const b = this.getOne('SELECT carried_amount FROM budgets WHERE id = ?', [budgetId]);
    return b ? b.carried_amount : 0;
  }
  updateBudgetCarried(budgetId, carried) {
    this.run('UPDATE budgets SET carried_amount = ? WHERE id = ?', [carried, budgetId]);
  }

  // Bills due soon
  getBillsDueSoon(days = 3) {
    const today = new Date().toISOString().slice(0, 10);
    const futureDate = new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
    return this.getAll(
      'SELECT * FROM bills WHERE deleted_at IS NULL AND next_due_date >= ? AND next_due_date <= ? ORDER BY next_due_date',
      [today, futureDate]
    );
  }

  // Personalization
  getPersonalizationProfile() {
    const row = this.getOne('SELECT personalization_profile FROM settings WHERE id = 1');
    try {
      return JSON.parse((row && row.personalization_profile) || '{}');
    } catch { return {}; }
  }

  updatePersonalizationProfile(profile) {
    this.run("UPDATE settings SET personalization_profile = ? WHERE id = 1", [JSON.stringify(profile)]);
  }

  close() {
    if (this._saveTimer) {
      clearTimeout(this._saveTimer);
      this._saveTimer = null;
    }
    if (this.db) {
      this.save();
      this.db.close();
    }
  }
}

module.exports = { WealthFlowDatabase };
