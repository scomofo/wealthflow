// One-time import: Canada Life TFSA statement data
// Run with: node scripts/import-canada-life.js

const path = require('path');
const { app } = require('electron');

// We need electron for app.getPath, so run via electron
// Alternative: hardcode the path
const dbPath = path.join(
  process.env.APPDATA || path.join(require('os').homedir(), 'AppData', 'Roaming'),
  'wealthflow', 'wealthflow.db'
);

async function main() {
  const initSqlJs = require(path.join(__dirname, '../node_modules/sql.js'));
  const fs = require('fs');

  const wasmPath = path.join(__dirname, '../node_modules/sql.js/dist/sql-wasm.wasm');
  const wasmBinary = fs.readFileSync(wasmPath);
  const SQL = await initSqlJs({ wasmBinary });

  if (!fs.existsSync(dbPath)) {
    console.error('Database not found at:', dbPath);
    process.exit(1);
  }

  const buffer = fs.readFileSync(dbPath);
  const db = new SQL.Database(buffer);

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  // 1. Add BlackRock LifePath 2045 as investment in TFSA
  const symbol = 'BLK-LP2045';
  const name = 'BlackRock LifePath 2045';
  const shares = 31.880983;
  const currentPrice = 43.29;
  const currentValue = 1380.21;
  const avgCost = currentValue / shares; // approximate

  // Check if already exists
  const existing = db.exec(`SELECT id FROM investments WHERE symbol = '${symbol}' AND account_type = 'tfsa'`);
  if (existing.length > 0 && existing[0].values.length > 0) {
    const id = existing[0].values[0][0];
    db.run(`UPDATE investments SET shares = ?, current_price = ?, avg_cost = ?, name = ?, institution = ? WHERE id = ?`,
      [shares, currentPrice, avgCost, name, 'Canada Life', id]);
    console.log('Updated existing investment:', symbol);
  } else {
    const id = uid();
    db.run(
      `INSERT INTO investments (id, symbol, name, shares, avg_cost, current_price, type, account_type, institution, currency) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, symbol, name, shares, avgCost, currentPrice, 'mutual_fund', 'tfsa', 'Canada Life', 'CAD']
    );
    console.log('Added investment:', symbol, '=', currentValue);
  }

  // 2. Add TFSA contributions from the past year
  const contributions = [
    // Monthly: $75 employer + $75 member + $325 voluntary = $475/month
    { date: '2025-03-27', amount: 475, desc: 'Canada Life TFSA - Mar 2025' },
    { date: '2025-04-30', amount: 475, desc: 'Canada Life TFSA - Apr 2025' },
    { date: '2025-05-30', amount: 475, desc: 'Canada Life TFSA - May 2025' },
    { date: '2025-06-26', amount: 475, desc: 'Canada Life TFSA - Jun 2025' },
    { date: '2025-07-29', amount: 475, desc: 'Canada Life TFSA - Jul 2025' },
    { date: '2025-08-28', amount: 475, desc: 'Canada Life TFSA - Aug 2025' },
    { date: '2025-09-26', amount: 475, desc: 'Canada Life TFSA - Sep 2025' },
    { date: '2025-11-07', amount: 475, desc: 'Canada Life TFSA - Nov 2025' },
    { date: '2025-12-11', amount: 475, desc: 'Canada Life TFSA - Dec 2025' },
    { date: '2025-12-30', amount: 475, desc: 'Canada Life TFSA - Dec 2025 (2nd)' },
    { date: '2026-01-29', amount: 475, desc: 'Canada Life TFSA - Jan 2026' },
    { date: '2026-02-25', amount: 475, desc: 'Canada Life TFSA - Feb 2026' },
  ];

  // Check how many contributions already exist from Canada Life
  const existingContribs = db.exec(`SELECT COUNT(*) FROM contributions WHERE description LIKE '%Canada Life TFSA%'`);
  const existingCount = existingContribs[0]?.values[0]?.[0] || 0;

  if (existingCount === 0) {
    for (const c of contributions) {
      db.run(
        `INSERT INTO contributions (id, account_type, amount, date, description, institution) VALUES (?, ?, ?, ?, ?, ?)`,
        [uid(), 'tfsa', c.amount, c.date, c.desc, 'Canada Life']
      );
    }
    console.log(`Added ${contributions.length} TFSA contribution records`);
    console.log(`Total contributed: $${contributions.reduce((s, c) => s + c.amount, 0)} (employer $900 + member $4,800)`);
  } else {
    console.log(`Skipped contributions — ${existingCount} Canada Life records already exist`);
  }

  // 3. Add the withdrawal as a transaction
  const withdrawalExists = db.exec(`SELECT COUNT(*) FROM transactions WHERE description = 'Canada Life TFSA Withdrawal' AND date = '2025-12-19'`);
  if ((withdrawalExists[0]?.values[0]?.[0] || 0) === 0) {
    db.run(
      `INSERT INTO transactions (id, description, amount, category, date, icon) VALUES (?, ?, ?, ?, ?, ?)`,
      [uid(), 'Canada Life TFSA Withdrawal', 7280.27, 'Income', '2025-12-19', 'arrow-down-right']
    );
    console.log('Added TFSA withdrawal: $7,280.27 on Dec 19, 2025');
  }

  // Save
  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
  console.log('\nDatabase saved. Restart WealthFlow to see changes.');
  console.log('\nSummary:');
  console.log('  TFSA Investment: BlackRock LifePath 2045 — 31.88 units @ $43.29 = $1,380.21');
  console.log('  TFSA Contributions: $5,700 (12 months × $475)');
  console.log('  TFSA Withdrawal: $7,280.27 (Dec 2025)');
  console.log('  Institution: Canada Life');

  db.close();
}

main().catch(e => { console.error(e); process.exit(1); });
