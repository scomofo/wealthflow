// AI re-categorization script — runs inside Electron to access safeStorage
// Usage: npx electron scripts/ai-recategorize.js

const { app, BrowserWindow } = require('electron');

app.whenReady().then(async () => {
  // Create a hidden window so safeStorage works
  const win = new BrowserWindow({ show: false, width: 1, height: 1 });
  await new Promise(r => setTimeout(r, 500)); // Give safeStorage time to initialize
  const path = require('path');
  const { WealthFlowDatabase } = require(path.join(__dirname, '../src/main/database'));

  const database = new WealthFlowDatabase();
  await database.init();

  // getSettings() already resolves the real per-OS userData path (via
  // app.getPath('userData')) and decrypts the stored key through
  // safeStorage — no need to re-derive the db path or re-implement
  // decryption here. A prior version of this script hardcoded
  // process.env.APPDATA, which only exists on Windows and silently
  // pointed at the wrong (or no) database on macOS/Linux.
  const settings = database.getSettings();
  const apiKey = settings.ai_api_key;
  const model = settings.ai_model;

  if (!apiKey) {
    console.log('No API key configured.');
    database.close();
    win.close();
    app.quit();
    return;
  }

  console.log('API key found. Starting AI categorization...');

  const Anthropic = require(path.join(__dirname, '../node_modules/@anthropic-ai/sdk'));
  const client = new Anthropic.default({ apiKey });

  // Get Other transactions
  const txs = database.getAll("SELECT id, description, amount FROM transactions WHERE category = 'Other' AND deleted_at IS NULL ORDER BY date DESC");
  console.log('Found', txs.length, 'Other transactions to categorize');

  if (txs.length === 0) {
    database.close();
    app.quit();
    return;
  }

  const batchSize = 40;
  let totalCategorized = 0;
  const changes = {};

  for (let i = 0; i < txs.length; i += batchSize) {
    const batch = txs.slice(i, i + batchSize);

    const prompt = batch.map((t, idx) =>
      `${idx + 1}. ${t.description} (${t.amount >= 0 ? '+' : ''}${t.amount.toFixed(2)})`
    ).join('\n');

    console.log(`Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(txs.length / batchSize)} (${batch.length} txs)...`);

    try {
      const response = await client.messages.create({
        model,
        max_tokens: 2048,
        messages: [{
          role: 'user',
          content: `Categorize these Canadian bank transaction descriptions. Categories: Food/Groceries, Transport, Utilities, Entertainment, Shopping, Housing, Rent/Mortgage, Insurance, Healthcare, Childcare, Education, Income, Investment Income, Government Benefits, Transfer, Other.

Rules:
- Credit card payments, inter-account transfers, EFTs between own accounts = Transfer
- Payroll, salary, employer deposits = Income
- CRA, GST credit, child benefit, carbon tax rebate = Government Benefits
- Dividends, distributions = Investment Income
- Positive amounts that are clearly deposits/transfers between accounts = Transfer (not Income)
- Interest charges on margin/credit = Other
- Subscriptions (Netflix, Spotify, etc.) = Entertainment
- Gas stations, fuel = Transport
- Restaurants, fast food, groceries = Food/Groceries
- Telecom bills (Bell, Rogers, Telus) = Utilities

Return ONLY a JSON array of category strings, one per description, same order. No explanation.

Descriptions:
${prompt}`
        }],
      });

      const text = response.content[0].text;
      const match = text.match(/\[[\s\S]*?\]/);
      if (match) {
        const cats = JSON.parse(match[0]);
        if (Array.isArray(cats) && cats.length === batch.length) {
          for (let j = 0; j < batch.length; j++) {
            const newCat = cats[j];
            if (newCat && newCat !== 'Other') {
              database.run('UPDATE transactions SET category = ? WHERE id = ?', [newCat, batch[j].id]);
              changes[newCat] = (changes[newCat] || 0) + 1;
              totalCategorized++;
            }
          }
        }
      }
    } catch (err) {
      console.error('API error:', err.message);
    }

    if (i + batchSize < txs.length) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  console.log(`\nCategorized ${totalCategorized} of ${txs.length} transactions:`);
  for (const [cat, count] of Object.entries(changes).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${cat}: ${count}`);
  }

  // Final totals
  const cats = database.getAll(`SELECT category, COUNT(*) as cnt, SUM(amount) as total
    FROM transactions WHERE deleted_at IS NULL
    GROUP BY category ORDER BY total DESC`);
  console.log('\nFinal category breakdown:');
  for (const c of cats) {
    console.log(`  ${c.category}: ${c.cnt} txs, $${(c.total || 0).toFixed(2)}`);
  }

  database.close();
  win.close();
  console.log('\nDone.');
  app.quit();
});
