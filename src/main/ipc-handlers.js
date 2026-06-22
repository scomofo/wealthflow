const { ipcMain, BrowserWindow, dialog, app, shell } = require('electron');
const fs = require('fs');
const path = require('path');
const { logger } = require('./logger');

const { DEFAULT_AI_MODEL } = require('./constants');

function safeHandle(channel, handler) {
  ipcMain.handle(channel, async (...args) => {
    try {
      return await handler(...args);
    } catch (err) {
      logger.error(`IPC error on ${channel}`, { error: err.message, stack: err.stack });
      throw err;
    }
  });
}

function isPathSafe(filePath) {
  const resolved = path.resolve(filePath);
  const appData = app.getPath('userData');
  const documents = app.getPath('documents');
  const downloads = app.getPath('downloads');
  const desktop = app.getPath('desktop');
  return resolved.startsWith(appData) || resolved.startsWith(documents) ||
         resolved.startsWith(downloads) || resolved.startsWith(desktop);
}

function registerIpcHandlers(database, aiService) {
  function validate(value, type, name) {
    if (value === undefined || value === null) throw new Error(`${name} is required`);
    if (type === 'string' && typeof value !== 'string') throw new Error(`${name} must be a string`);
    if (type === 'number' && typeof value !== 'number') throw new Error(`${name} must be a number`);
    if (type === 'object' && typeof value !== 'object') throw new Error(`${name} must be an object`);
    if (type === 'id' && (typeof value !== 'string' || value.length === 0)) throw new Error(`${name} must be a non-empty string`);
  }

  // Settings
  safeHandle('db:settings:get', () => database.getSettings());
  safeHandle('db:settings:update', (_, data) => {
    validate(data, 'object', 'settings');
    return database.updateSettings(data);
  });

  // Transactions
  safeHandle('db:transactions:list', () => database.listTransactions());
  safeHandle('db:transactions:add', (_, tx) => {
    validate(tx, 'object', 'transaction');
    validate(tx.id, 'id', 'transaction.id');
    validate(tx.description, 'string', 'transaction.description');
    if (typeof tx.amount !== 'number' || isNaN(tx.amount)) throw new Error('transaction.amount must be a valid number');
    return database.addTransaction(tx);
  });
  safeHandle('db:transactions:update', (_, tx) => database.updateTransaction(tx));
  safeHandle('db:transactions:delete', (_, id) => {
    validate(id, 'id', 'id');
    return database.deleteTransaction(id);
  });
  safeHandle('db:transactions:add-batch', (_, txs) => database.addTransactionsBatch(txs));
  safeHandle('db:transactions:update-category-by-desc', (_, desc, cat) => database.updateCategoryByDescription(desc, cat));
  safeHandle('db:transactions:count-by-desc', (_, desc) => database.countTransactionsByDescription(desc));
  safeHandle('db:transactions:find-duplicates', (_, checks) => database.findDuplicateTransactions(checks));

  // Budgets
  safeHandle('db:budgets:list', () => database.listBudgets());
  safeHandle('db:budgets:add', (_, b) => database.addBudget(b));
  safeHandle('db:budgets:update', (_, b) => database.updateBudget(b));
  safeHandle('db:budgets:delete', (_, id) => database.deleteBudget(id));

  // Goals
  safeHandle('db:goals:list', () => database.listGoals());
  safeHandle('db:goals:add', (_, g) => database.addGoal(g));
  safeHandle('db:goals:update', (_, g) => database.updateGoal(g));
  safeHandle('db:goals:delete', (_, id) => database.deleteGoal(id));

  // Debts
  safeHandle('db:debts:list', () => database.listDebts());
  safeHandle('db:debts:add', (_, d) => database.addDebt(d));
  safeHandle('db:debts:update', (_, d) => database.updateDebt(d));
  safeHandle('db:debts:delete', (_, id) => database.deleteDebt(id));

  // Investments
  safeHandle('db:investments:list', () => database.listInvestments());
  safeHandle('db:investments:add', (_, i) => database.addInvestment(i));
  safeHandle('db:investments:update', (_, i) => database.updateInvestment(i));
  safeHandle('db:investments:delete', (_, id) => database.deleteInvestment(id));

  // Bills
  safeHandle('db:bills:list', () => database.listBills());
  safeHandle('db:bills:add', (_, b) => database.addBill(b));
  safeHandle('db:bills:update', (_, b) => database.updateBill(b));
  safeHandle('db:bills:delete', (_, id) => database.deleteBill(id));

  // Challenges
  safeHandle('db:challenges:list', () => database.listChallenges());
  safeHandle('db:challenges:update', (_, c) => database.updateChallenge(c));

  // Community & Education
  safeHandle('db:community:list', () => database.listCommunityPosts());
  safeHandle('db:education:list', () => database.listEducation());
  safeHandle('db:education:update', (_, e) => database.updateEducation(e));

  // Contribution Room
  safeHandle('db:contribution-room:list', () => database.listContributionRoom());
  safeHandle('db:contribution-room:upsert', (_, cr) => database.upsertContributionRoom(cr));
  safeHandle('db:contribution-room:delete', (_, id) => database.deleteContributionRoom(id));

  // Contributions
  safeHandle('db:contributions:list', () => database.listContributions());
  safeHandle('db:contributions:add', (_, c) => database.addContribution(c));
  safeHandle('db:contributions:delete', (_, id) => database.deleteContribution(id));

  // RESP Beneficiaries
  safeHandle('db:resp-beneficiaries:list', () => database.listRESPBeneficiaries());
  safeHandle('db:resp-beneficiaries:add', (_, b) => database.addRESPBeneficiary(b));
  safeHandle('db:resp-beneficiaries:update', (_, b) => database.updateRESPBeneficiary(b));
  safeHandle('db:resp-beneficiaries:delete', (_, id) => database.deleteRESPBeneficiary(id));

  // GICs
  safeHandle('db:gics:list', () => database.listGICs());
  safeHandle('db:gics:add', (_, g) => database.addGIC(g));
  safeHandle('db:gics:delete', (_, id) => database.deleteGIC(id));

  // Computed financials
  safeHandle('db:compute-financials', () => database.computeFinancials());

  // Counts for achievements
  safeHandle('db:counts', () => database.getCounts());

  // Recurring log
  safeHandle('db:recurring-log:list', (_, billId) => database.listRecurringLog(billId));
  safeHandle('db:recurring-log:add', (_, entry) => database.addRecurringLog(entry));

  // Net worth history
  safeHandle('db:net-worth-history:list', () => database.listNetWorthHistory());
  safeHandle('db:net-worth-history:snapshot', () => database.snapshotNetWorth());

  // Analytics
  safeHandle('db:analytics:monthly-totals', (_, months) => database.getMonthlyTotals(months));

  // Recurring bill processing
  safeHandle('db:bills:process-recurring', () => database.processRecurringBills());

  // Export/Import
  safeHandle('db:export-all', () => database.exportAllData());

  // Import History
  safeHandle('db:import-history:list', () => database.listImportHistory());
  safeHandle('db:import-history:add', (_, entry) => database.addImportHistory(entry));

  // File dialogs
  safeHandle('dialog:save-file', async (event, options) => {
    return dialog.showSaveDialog(BrowserWindow.fromWebContents(event.sender), options);
  });
  safeHandle('dialog:open-file', async (event, options) => {
    return dialog.showOpenDialog(BrowserWindow.fromWebContents(event.sender), options);
  });

  // File system operations with retry for Windows file locks
  safeHandle('fs:write-file', async (_, filePath, content) => {
    if (!isPathSafe(filePath)) throw new Error('Access denied: path outside allowed directories');
    const doWrite = () => {
      if (Buffer.isBuffer(content) || content instanceof Uint8Array) {
        fs.writeFileSync(filePath, Buffer.from(content));
      } else {
        fs.writeFileSync(filePath, content, 'utf-8');
      }
    };
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        doWrite();
        return;
      } catch (err) {
        if ((err.code === 'EBUSY' || err.code === 'EPERM') && attempt < 2) {
          const delay = 200 * Math.pow(2, attempt);
          logger.warn(`File write retry ${attempt + 1}/3`, { path: filePath, code: err.code, delay });
          await new Promise(r => setTimeout(r, delay));
        } else {
          throw err;
        }
      }
    }
  });

  safeHandle('fs:read-file', async (_, filePath) => {
    if (!isPathSafe(filePath)) throw new Error('Access denied: path outside allowed directories');
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return fs.readFileSync(filePath, 'utf-8');
      } catch (err) {
        if ((err.code === 'EBUSY' || err.code === 'EPERM') && attempt < 2) {
          const delay = 200 * Math.pow(2, attempt);
          logger.warn(`File read retry ${attempt + 1}/3`, { path: filePath, code: err.code, delay });
          await new Promise(r => setTimeout(r, delay));
        } else {
          throw err;
        }
      }
    }
  });

  // PDF generation
  safeHandle('pdf:generate-report', async (event, htmlContent) => {
    const win = new BrowserWindow({
      show: false, width: 800, height: 1100,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      }
    });
    await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);
    const pdfData = await win.webContents.printToPDF({
      marginsType: 1,
      pageSize: 'Letter',
      printBackground: true,
    });
    win.close();
    return pdfData;
  });

  // Advisor Profile
  safeHandle('db:advisor:personal:get', () => database.getAdvisorPersonal());
  safeHandle('db:advisor:personal:update', (_, data) => database.updateAdvisorPersonal(data));
  safeHandle('db:advisor:employment:get', () => database.getAdvisorEmployment());
  safeHandle('db:advisor:employment:update', (_, data) => database.updateAdvisorEmployment(data));
  safeHandle('db:advisor:risk:get', () => database.getAdvisorRisk());
  safeHandle('db:advisor:risk:update', (_, data) => database.updateAdvisorRisk(data));
  safeHandle('db:advisor:registered:get', () => database.getAdvisorRegistered());
  safeHandle('db:advisor:registered:update', (_, data) => database.updateAdvisorRegistered(data));
  safeHandle('db:advisor:insurance:get', () => database.getAdvisorInsurance());
  safeHandle('db:advisor:insurance:update', (_, data) => database.updateAdvisorInsurance(data));
  safeHandle('db:advisor:goals:list', () => database.listAdvisorGoals());
  safeHandle('db:advisor:goals:upsert', (_, g) => database.upsertAdvisorGoal(g));
  safeHandle('db:advisor:goals:delete', (_, id) => database.deleteAdvisorGoal(id));
  safeHandle('db:advisor:assets:list', () => database.listAdvisorAssets());
  safeHandle('db:advisor:assets:add', (_, a) => database.addAdvisorAsset(a));
  safeHandle('db:advisor:assets:update', (_, a) => database.updateAdvisorAsset(a));
  safeHandle('db:advisor:assets:delete', (_, id) => database.deleteAdvisorAsset(id));
  safeHandle('db:advisor:documents:list', () => database.listAdvisorDocuments());
  safeHandle('db:advisor:documents:add', (_, doc) => database.addAdvisorDocument(doc));
  safeHandle('db:advisor:documents:delete', (_, id) => database.deleteAdvisorDocument(id));
  safeHandle('db:advisor:profile', () => database.getAdvisorProfile());

  // Advisor document file operations
  safeHandle('advisor:documents-path', () => {
    const docsDir = path.join(app.getPath('userData'), 'documents');
    if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });
    return docsDir;
  });
  safeHandle('advisor:copy-file', async (_, srcPath, destFilename) => {
    const stats = fs.statSync(srcPath);
    if (!stats.isFile()) throw new Error('Source must be a regular file');
    const docsDir = path.join(app.getPath('userData'), 'documents');
    if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });
    const safeName = path.basename(destFilename);
    const destPath = path.join(docsDir, safeName);
    fs.copyFileSync(srcPath, destPath);
    return destPath;
  });
  safeHandle('advisor:delete-file', async (_, filename) => {
    const safeName = path.basename(filename);
    const filePath = path.join(app.getPath('userData'), 'documents', safeName);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  });
  safeHandle('advisor:open-file', async (_, filename) => {
    const safeName = path.basename(filename);
    const filePath = path.join(app.getPath('userData'), 'documents', safeName);
    if (fs.existsSync(filePath)) return shell.openPath(filePath);
    return 'File not found';
  });

  // AI Advisor
  safeHandle('ai:chat', async (event, message, financialData) => {
    const settings = database.getSettings();
    const apiKey = settings.ai_api_key;
    const model = settings.ai_model || DEFAULT_AI_MODEL;
    if (!apiKey) throw new Error('No API key configured. Go to Settings to add your Claude API key.');
    return aiService.chat(apiKey, model, message, financialData, event.sender);
  });

  safeHandle('ai:categorize', async (_, descriptions) => {
    const settings = database.getSettings();
    const apiKey = settings.ai_api_key;
    const model = settings.ai_model || DEFAULT_AI_MODEL;
    if (!apiKey) throw new Error('No API key configured.');
    return aiService.categorizeTransactions(apiKey, model, descriptions);
  });

  safeHandle('ai:clear-history', () => {
    aiService.clearHistory();
    return true;
  });

  safeHandle('ai:reload-knowledge', () => {
    aiService.reloadKnowledgeBase();
    logger.info('Knowledge base reloaded via IPC');
    return true;
  });

  // Seed sample data
  safeHandle('db:seed-sample', (_, data) => database.seedSampleData(data));

  // Stock quotes
  safeHandle('stock:fetch-quote', async (_, symbol) => {
    const { StockService } = require('./stock-service');
    return StockService.instance.fetchQuote(symbol);
  });
  safeHandle('stock:fetch-batch', async (_, symbols) => {
    const { StockService } = require('./stock-service');
    return StockService.instance.fetchBatchQuotes(symbols);
  });

  // Community posts
  safeHandle('db:community:add', (_, post) => database.addCommunityPost(post));

  // Principal Residence
  safeHandle('db:residence:get', () => database.getPrincipalResidence());
  safeHandle('db:residence:update', (_, data) => {
    validate(data, 'object', 'residence');
    return database.updatePrincipalResidence(data);
  });

  // Monthly Reports
  safeHandle('db:monthly-reports:list', () => database.listMonthlyReports());
  safeHandle('db:monthly-reports:get', (_, month, year) => database.getMonthlyReport(month, year));
  safeHandle('db:monthly-reports:save', (_, report) => database.saveMonthlyReport(report));

  // Undo Log
  safeHandle('db:undo:add', (_, entry) => database.addUndoEntry(entry));
  safeHandle('db:undo:list', (_, limit) => database.getLastUndoEntries(limit || 10));
  safeHandle('db:undo:delete', (_, id) => database.deleteUndoEntry(id));
  safeHandle('db:undo:cleanup', () => database.clearOldUndoEntries());

  // Budget rollover
  safeHandle('db:budgets:get-carried', (_, budgetId) => database.getBudgetCarried(budgetId));
  safeHandle('db:budgets:update-carried', (_, budgetId, carried) => database.updateBudgetCarried(budgetId, carried));

  // AI Monthly Report
  safeHandle('ai:generate-monthly-report', async (event, financialData, month, year) => {
    const settings = database.getSettings();
    const apiKey = settings.ai_api_key;
    const model = settings.ai_model || DEFAULT_AI_MODEL;
    if (!apiKey) throw new Error('No API key configured. Go to Settings to add your Claude API key.');
    return aiService.generateMonthlyReport(apiKey, model, financialData, month, year);
  });

  // AI Workflows
  const { AiWorkflowService } = require('./ai-workflows');
  const aiWorkflowService = new AiWorkflowService();

  safeHandle('ai:run-workflow', async (_, workflowType, financialData) => {
    const settings = database.getSettings();
    const apiKey = settings.ai_api_key;
    const model = settings.ai_model || DEFAULT_AI_MODEL;
    if (!apiKey) throw new Error('No API key configured. Go to Settings to add your Claude API key.');
    return aiWorkflowService.runWorkflow(apiKey, model, workflowType, financialData);
  });

  // Recommended Actions
  safeHandle('db:recommended-actions:list', () => database.listRecommendedActions());
  safeHandle('db:recommended-actions:add', (_, action) => database.addRecommendedAction(action));
  safeHandle('db:recommended-actions:complete', (_, id) => database.completeRecommendedAction(id));
  safeHandle('db:recommended-actions:delete', (_, id) => database.deleteRecommendedAction(id));

  // Next Best Actions
  const { NextBestActionsEngine } = require('./next-best-actions-engine');
  const nbaEngine = new NextBestActionsEngine(database);

  safeHandle('actions:generate-next-best', async () => {
    return nbaEngine.generateActions();
  });
  safeHandle('actions:list-next-best', () => database.listNextBestActions('open'));
  safeHandle('actions:complete-next-best', (_, id) => database.completeNextBestAction(id));
  safeHandle('actions:dismiss-next-best', (_, id) => database.dismissNextBestAction(id));
  safeHandle('actions:snooze-next-best', (_, id, untilDate) => database.snoozeNextBestAction(id, untilDate));

  // Personalization
  const { PersonalizationEngine } = require('./personalization-engine');
  const personalizationEngine = new PersonalizationEngine(database);

  safeHandle('personalization:get-profile', () => personalizationEngine.buildProfile());
  safeHandle('personalization:record-interaction', (_, eventType, category) => {
    personalizationEngine.recordInteraction(eventType, category);
    return personalizationEngine.buildProfile();
  });
  safeHandle('personalization:apply-weighting', (_, actions) => {
    const profile = personalizationEngine.buildProfile();
    return personalizationEngine.applyActionWeighting(actions, profile);
  });
  safeHandle('personalization:summary-emphasis', () => {
    const profile = personalizationEngine.buildProfile();
    const financials = database.computeFinancials();
    return personalizationEngine.chooseSummaryEmphasis(profile, financials);
  });

  // Proactive nudges
  const { ProactiveEngine } = require('./proactive-engine');
  const proactiveEngine = new ProactiveEngine(database);

  safeHandle('proactive:evaluate', () => proactiveEngine.evaluate());

  // Proactive desktop notifications
  const {
    DesktopNotificationEngine,
    createElectronNotifier,
  } = require('./desktop-notification-engine');
  const desktopNotificationEngine = new DesktopNotificationEngine(
    database,
    createElectronNotifier()
  );

  safeHandle('notifications:send-proactive-desktop', () => {
    return desktopNotificationEngine.send();
  });

  // Engagement
  const { EngagementEngine } = require('./engagement-engine');
  const engagementEngine = new EngagementEngine(database);

  safeHandle('engagement:progress', () => engagementEngine.getProgressSummary());
  safeHandle('engagement:completion-feedback', (_, payload) => engagementEngine.getCompletionFeedback(payload || {}));
  safeHandle('engagement:enhanced-toast', (_, baseMessage) => engagementEngine.getEnhancedToast(baseMessage));

  // Currency exchange rate
  safeHandle('stock:fetch-exchange-rate', async (_, from, to) => {
    const { StockService } = require('./stock-service');
    return StockService.instance.fetchExchangeRate(from, to);
  });

  // System theme
  safeHandle('app:get-system-theme', () => {
    const { nativeTheme } = require('electron');
    return nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
  });

  // Desktop notifications
  safeHandle('app:show-notification', (_, title, body) => {
    const { Notification } = require('electron');
    if (Notification.isSupported()) {
      new Notification({ title, body }).show();
    }
  });

  // Bills due soon
  safeHandle('db:bills:due-soon', (_, days) => database.getBillsDueSoon(days || 3));

  // AI bulk re-categorize "Other" transactions
  safeHandle('ai:recategorize-others', async () => {
    const settings = database.getSettings();
    const apiKey = settings.ai_api_key;
    const model = settings.ai_model || DEFAULT_AI_MODEL;
    if (!apiKey) throw new Error('No API key configured.');

    const txs = database.getAll("SELECT id, description, amount FROM transactions WHERE category = 'Other' AND deleted_at IS NULL ORDER BY date DESC");
    if (txs.length === 0) return { categorized: 0, total: 0 };

    const Anthropic = require('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey });
    const batchSize = 40;
    let totalCategorized = 0;

    for (let i = 0; i < txs.length; i += batchSize) {
      const batch = txs.slice(i, i + batchSize);
      const prompt = batch.map((t, idx) => `${idx + 1}. ${t.description} (${t.amount >= 0 ? '+' : ''}${t.amount.toFixed(2)})`).join('\n');

      try {
        const response = await client.messages.create({
          model, max_tokens: 2048,
          messages: [{ role: 'user', content: `Categorize these Canadian bank transaction descriptions. Categories: Food/Groceries, Transport, Utilities, Entertainment, Shopping, Housing, Rent/Mortgage, Insurance, Healthcare, Childcare, Education, Income, Investment Income, Government Benefits, Transfer, Other.\n\nRules:\n- Credit card payments, inter-account transfers = Transfer\n- Payroll, salary = Income\n- CRA, GST credit, carbon rebate = Government Benefits\n- Dividends = Investment Income\n- Subscriptions = Entertainment\n- Gas, fuel = Transport\n- Restaurants, groceries = Food/Groceries\n- Telecom bills = Utilities\n\nReturn ONLY a JSON array of category strings. No explanation.\n\nDescriptions:\n${prompt}` }],
        });
        const match = response.content[0].text.match(/\[[\s\S]*?\]/);
        if (match) {
          const cats = JSON.parse(match[0]);
          if (Array.isArray(cats) && cats.length === batch.length) {
            for (let j = 0; j < batch.length; j++) {
              if (cats[j] && cats[j] !== 'Other') {
                database.run('UPDATE transactions SET category = ? WHERE id = ?', [cats[j], batch[j].id]);
                totalCategorized++;
              }
            }
          }
        }
      } catch (err) {
        logger.error('AI recategorize batch error', { error: err.message });
      }
      if (i + batchSize < txs.length) await new Promise(r => setTimeout(r, 1000));
    }

    database.save();
    return { categorized: totalCategorized, total: txs.length };
  });

  // XLSX parsing (needs Node.js zlib)
  safeHandle('file:parse-xlsx', async (_, filePath) => {
    const zlib = require('zlib');
    const buf = fs.readFileSync(filePath);

    // Find ZIP entries
    const entries = [];
    let pos = 0;
    while (pos < buf.length - 30) {
      if (buf[pos] === 0x50 && buf[pos + 1] === 0x4B && buf[pos + 2] === 0x03 && buf[pos + 3] === 0x04) {
        const nameLen = buf.readUInt16LE(pos + 26);
        const extraLen = buf.readUInt16LE(pos + 28);
        const compSize = buf.readUInt32LE(pos + 18);
        const method = buf.readUInt16LE(pos + 8);
        const name = buf.toString('utf8', pos + 30, pos + 30 + nameLen);
        const dataStart = pos + 30 + nameLen + extraLen;
        entries.push({ name, dataStart, compSize, method });
        pos = dataStart + Math.max(compSize, 1);
      } else { pos++; }
    }

    function inflate(entry) {
      const raw = buf.slice(entry.dataStart, entry.dataStart + entry.compSize);
      if (entry.method === 0) return raw.toString('utf8');
      return zlib.inflateRawSync(raw).toString('utf8');
    }

    // Shared strings
    let sharedStrings = [];
    const ssEntry = entries.find(e => e.name.includes('sharedStrings'));
    if (ssEntry) {
      const xml = inflate(ssEntry);
      sharedStrings = [...xml.matchAll(/<t[^>]*>([^<]*)<\/t>/g)].map(m => m[1]);
    }

    // First sheet
    const sheetEntry = entries.find(e => /sheet\d*\.xml$/i.test(e.name) || e.name.includes('sheet.xml'));
    if (!sheetEntry) return { headers: [], rows: [] };

    const xml = inflate(sheetEntry);
    const rowRegex = /<(?:x:)?row[^>]*>(.*?)<\/(?:x:)?row>/gs;
    const cellRegex = /<(?:x:)?c([^>]*)>([^]*?)<\/(?:x:)?c>/gs;
    const xmlRows = [...xml.matchAll(rowRegex)];
    if (xmlRows.length === 0) return { headers: [], rows: [] };

    const parsedRows = xmlRows.map(rowMatch => {
      const cells = [...rowMatch[1].matchAll(cellRegex)];
      const rowData = {};
      for (const cell of cells) {
        const attrs = cell[1];
        const inner = cell[2];
        const refMatch = attrs.match(/r="([A-Z]+)\d+"/);
        const col = refMatch ? refMatch[1] : '';
        let value = '';
        const isInline = inner.match(/<(?:x:)?is><(?:x:)?t>([^<]*)<\/(?:x:)?t><\/(?:x:)?is>/);
        const vMatch = inner.match(/<(?:x:)?v>([^<]*)<\/(?:x:)?v>/);
        if (isInline) value = isInline[1];
        else if (vMatch) {
          value = attrs.includes('t="s"') ? (sharedStrings[parseInt(vMatch[1])] || vMatch[1]) : vMatch[1];
        }
        // Clean datetime
        if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/.test(value)) value = value.slice(0, 10);
        rowData[col] = value;
      }
      return rowData;
    });

    const headerRow = parsedRows[0];
    const cols = Object.keys(headerRow).sort();
    const headers = cols.map(c => headerRow[c]);
    const rows = parsedRows.slice(1).map(r => {
      const obj = {};
      for (let i = 0; i < cols.length; i++) obj[headers[i]] = r[cols[i]] || '';
      return obj;
    });

    return { headers, rows };
  });

  // Window controls
  safeHandle('window:minimize', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.minimize();
  });
  safeHandle('window:maximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win?.isMaximized()) win.unmaximize(); else win?.maximize();
  });
  safeHandle('window:close', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.close();
  });
}

module.exports = { registerIpcHandlers };
