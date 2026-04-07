const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('wealthflow', {
  // Settings
  getSettings: () => ipcRenderer.invoke('db:settings:get'),
  updateSettings: (data) => ipcRenderer.invoke('db:settings:update', data),

  // Transactions
  getTransactions: () => ipcRenderer.invoke('db:transactions:list'),
  addTransaction: (tx) => ipcRenderer.invoke('db:transactions:add', tx),
  updateTransaction: (tx) => ipcRenderer.invoke('db:transactions:update', tx),
  deleteTransaction: (id) => ipcRenderer.invoke('db:transactions:delete', id),
  addTransactionsBatch: (txs) => ipcRenderer.invoke('db:transactions:add-batch', txs),
  findDuplicateTransactions: (checks) => ipcRenderer.invoke('db:transactions:find-duplicates', checks),
  updateCategoryByDescription: (desc, cat) => ipcRenderer.invoke('db:transactions:update-category-by-desc', desc, cat),
  countTransactionsByDescription: (desc) => ipcRenderer.invoke('db:transactions:count-by-desc', desc),

  // Budgets
  getBudgets: () => ipcRenderer.invoke('db:budgets:list'),
  addBudget: (b) => ipcRenderer.invoke('db:budgets:add', b),
  updateBudget: (b) => ipcRenderer.invoke('db:budgets:update', b),
  deleteBudget: (id) => ipcRenderer.invoke('db:budgets:delete', id),

  // Goals
  getGoals: () => ipcRenderer.invoke('db:goals:list'),
  addGoal: (g) => ipcRenderer.invoke('db:goals:add', g),
  updateGoal: (g) => ipcRenderer.invoke('db:goals:update', g),
  deleteGoal: (id) => ipcRenderer.invoke('db:goals:delete', id),

  // Debts
  getDebts: () => ipcRenderer.invoke('db:debts:list'),
  addDebt: (d) => ipcRenderer.invoke('db:debts:add', d),
  updateDebt: (d) => ipcRenderer.invoke('db:debts:update', d),
  deleteDebt: (id) => ipcRenderer.invoke('db:debts:delete', id),

  // Investments
  getInvestments: () => ipcRenderer.invoke('db:investments:list'),
  addInvestment: (i) => ipcRenderer.invoke('db:investments:add', i),
  updateInvestment: (i) => ipcRenderer.invoke('db:investments:update', i),
  deleteInvestment: (id) => ipcRenderer.invoke('db:investments:delete', id),

  // Bills
  getBills: () => ipcRenderer.invoke('db:bills:list'),
  addBill: (b) => ipcRenderer.invoke('db:bills:add', b),
  updateBill: (b) => ipcRenderer.invoke('db:bills:update', b),
  deleteBill: (id) => ipcRenderer.invoke('db:bills:delete', id),

  // Challenges
  getChallenges: () => ipcRenderer.invoke('db:challenges:list'),
  updateChallenge: (c) => ipcRenderer.invoke('db:challenges:update', c),

  // Community & Education
  getCommunityPosts: () => ipcRenderer.invoke('db:community:list'),
  getEducation: () => ipcRenderer.invoke('db:education:list'),
  updateEducation: (e) => ipcRenderer.invoke('db:education:update', e),

  // Contribution Room
  getContributionRoom: () => ipcRenderer.invoke('db:contribution-room:list'),
  upsertContributionRoom: (cr) => ipcRenderer.invoke('db:contribution-room:upsert', cr),
  deleteContributionRoom: (id) => ipcRenderer.invoke('db:contribution-room:delete', id),

  // Contributions
  getContributions: () => ipcRenderer.invoke('db:contributions:list'),
  addContribution: (c) => ipcRenderer.invoke('db:contributions:add', c),
  deleteContribution: (id) => ipcRenderer.invoke('db:contributions:delete', id),

  // RESP Beneficiaries
  getRESPBeneficiaries: () => ipcRenderer.invoke('db:resp-beneficiaries:list'),
  addRESPBeneficiary: (b) => ipcRenderer.invoke('db:resp-beneficiaries:add', b),
  updateRESPBeneficiary: (b) => ipcRenderer.invoke('db:resp-beneficiaries:update', b),
  deleteRESPBeneficiary: (id) => ipcRenderer.invoke('db:resp-beneficiaries:delete', id),

  // GICs
  getGICs: () => ipcRenderer.invoke('db:gics:list'),
  addGIC: (g) => ipcRenderer.invoke('db:gics:add', g),
  deleteGIC: (id) => ipcRenderer.invoke('db:gics:delete', id),

  // Computed
  computeFinancials: () => ipcRenderer.invoke('db:compute-financials'),
  getCounts: () => ipcRenderer.invoke('db:counts'),

  // Recurring log
  getRecurringLog: (billId) => ipcRenderer.invoke('db:recurring-log:list', billId),
  addRecurringLog: (entry) => ipcRenderer.invoke('db:recurring-log:add', entry),

  // Net worth history
  getNetWorthHistory: () => ipcRenderer.invoke('db:net-worth-history:list'),
  snapshotNetWorth: () => ipcRenderer.invoke('db:net-worth-history:snapshot'),

  // Analytics
  getMonthlyTotals: (months) => ipcRenderer.invoke('db:analytics:monthly-totals', months),

  // Recurring bill processing
  processRecurringBills: () => ipcRenderer.invoke('db:bills:process-recurring'),

  // Export/Import
  exportAllData: () => ipcRenderer.invoke('db:export-all'),

  // Import History
  getImportHistory: () => ipcRenderer.invoke('db:import-history:list'),
  addImportHistory: (entry) => ipcRenderer.invoke('db:import-history:add', entry),

  // File dialogs
  showSaveDialog: (opts) => ipcRenderer.invoke('dialog:save-file', opts),
  showOpenDialog: (opts) => ipcRenderer.invoke('dialog:open-file', opts),

  // File system
  writeFile: (path, content) => ipcRenderer.invoke('fs:write-file', path, content),
  readFile: (path) => ipcRenderer.invoke('fs:read-file', path),

  // PDF
  generatePDF: (html) => ipcRenderer.invoke('pdf:generate-report', html),

  // Advisor Profile
  getAdvisorPersonal: () => ipcRenderer.invoke('db:advisor:personal:get'),
  updateAdvisorPersonal: (data) => ipcRenderer.invoke('db:advisor:personal:update', data),
  getAdvisorEmployment: () => ipcRenderer.invoke('db:advisor:employment:get'),
  updateAdvisorEmployment: (data) => ipcRenderer.invoke('db:advisor:employment:update', data),
  getAdvisorRisk: () => ipcRenderer.invoke('db:advisor:risk:get'),
  updateAdvisorRisk: (data) => ipcRenderer.invoke('db:advisor:risk:update', data),
  getAdvisorRegistered: () => ipcRenderer.invoke('db:advisor:registered:get'),
  updateAdvisorRegistered: (data) => ipcRenderer.invoke('db:advisor:registered:update', data),
  getAdvisorInsurance: () => ipcRenderer.invoke('db:advisor:insurance:get'),
  updateAdvisorInsurance: (data) => ipcRenderer.invoke('db:advisor:insurance:update', data),
  getAdvisorGoals: () => ipcRenderer.invoke('db:advisor:goals:list'),
  upsertAdvisorGoal: (g) => ipcRenderer.invoke('db:advisor:goals:upsert', g),
  deleteAdvisorGoal: (id) => ipcRenderer.invoke('db:advisor:goals:delete', id),
  getAdvisorAssets: () => ipcRenderer.invoke('db:advisor:assets:list'),
  addAdvisorAsset: (a) => ipcRenderer.invoke('db:advisor:assets:add', a),
  updateAdvisorAsset: (a) => ipcRenderer.invoke('db:advisor:assets:update', a),
  deleteAdvisorAsset: (id) => ipcRenderer.invoke('db:advisor:assets:delete', id),
  getAdvisorDocuments: () => ipcRenderer.invoke('db:advisor:documents:list'),
  addAdvisorDocument: (doc) => ipcRenderer.invoke('db:advisor:documents:add', doc),
  deleteAdvisorDocument: (id) => ipcRenderer.invoke('db:advisor:documents:delete', id),
  getAdvisorProfile: () => ipcRenderer.invoke('db:advisor:profile'),
  getDocumentsPath: () => ipcRenderer.invoke('advisor:documents-path'),
  copyDocumentFile: (src, dest) => ipcRenderer.invoke('advisor:copy-file', src, dest),
  deleteDocumentFile: (filename) => ipcRenderer.invoke('advisor:delete-file', filename),
  openDocumentFile: (filename) => ipcRenderer.invoke('advisor:open-file', filename),

  // AI Advisor
  aiCategorize: (descriptions) => ipcRenderer.invoke('ai:categorize', descriptions),
  aiChat: (message, financialData) => ipcRenderer.invoke('ai:chat', message, financialData),
  aiClearHistory: () => ipcRenderer.invoke('ai:clear-history'),
  onAiStreamChunk: (callback) => {
    const handler = (_, chunk) => callback(chunk);
    ipcRenderer.on('ai:stream-chunk', handler);
    return () => ipcRenderer.removeListener('ai:stream-chunk', handler);
  },
  onAiStreamDone: (callback) => {
    const handler = (_, fullText) => callback(fullText);
    ipcRenderer.on('ai:stream-done', handler);
    return () => ipcRenderer.removeListener('ai:stream-done', handler);
  },
  onAiStreamError: (callback) => {
    const handler = (_, error) => callback(error);
    ipcRenderer.on('ai:stream-error', handler);
    return () => ipcRenderer.removeListener('ai:stream-error', handler);
  },

  // Seed
  seedSampleData: (data) => ipcRenderer.invoke('db:seed-sample', data),

  // Logging
  log: (level, message, data) => ipcRenderer.send('log:renderer', level, message, data),

  // Stock quotes
  fetchStockQuote: (symbol) => ipcRenderer.invoke('stock:fetch-quote', symbol),
  fetchBatchQuotes: (symbols) => ipcRenderer.invoke('stock:fetch-batch', symbols),

  // AI knowledge base
  reloadKnowledgeBase: () => ipcRenderer.invoke('ai:reload-knowledge'),

  // Community posts
  addCommunityPost: (post) => ipcRenderer.invoke('db:community:add', post),

  // AI stream retry
  onAiStreamRetry: (callback) => {
    const handler = (_, attempt) => callback(attempt);
    ipcRenderer.on('ai:stream-retry', handler);
    return () => ipcRenderer.removeListener('ai:stream-retry', handler);
  },

  // Principal Residence
  getPrincipalResidence: () => ipcRenderer.invoke('db:residence:get'),
  updatePrincipalResidence: (data) => ipcRenderer.invoke('db:residence:update', data),

  // Monthly Reports
  getMonthlyReports: () => ipcRenderer.invoke('db:monthly-reports:list'),
  getMonthlyReport: (month, year) => ipcRenderer.invoke('db:monthly-reports:get', month, year),
  saveMonthlyReport: (report) => ipcRenderer.invoke('db:monthly-reports:save', report),

  // Undo Log
  addUndoEntry: (entry) => ipcRenderer.invoke('db:undo:add', entry),
  getUndoEntries: (limit) => ipcRenderer.invoke('db:undo:list', limit),
  deleteUndoEntry: (id) => ipcRenderer.invoke('db:undo:delete', id),
  cleanupUndoEntries: () => ipcRenderer.invoke('db:undo:cleanup'),

  // Budget rollover
  getBudgetCarried: (budgetId) => ipcRenderer.invoke('db:budgets:get-carried', budgetId),
  updateBudgetCarried: (budgetId, carried) => ipcRenderer.invoke('db:budgets:update-carried', budgetId, carried),

  // AI Monthly Report
  generateMonthlyReport: (financialData, month, year) => ipcRenderer.invoke('ai:generate-monthly-report', financialData, month, year),

  // Currency exchange
  fetchExchangeRate: (from, to) => ipcRenderer.invoke('stock:fetch-exchange-rate', from, to),

  // System theme
  getSystemTheme: () => ipcRenderer.invoke('app:get-system-theme'),

  // Desktop notifications
  showNotification: (title, body) => ipcRenderer.invoke('app:show-notification', title, body),

  // Bills due soon
  getBillsDueSoon: (days) => ipcRenderer.invoke('db:bills:due-soon', days),

  // XLSX parsing
  parseXLSX: (filePath) => ipcRenderer.invoke('file:parse-xlsx', filePath),

  // AI bulk re-categorize
  aiRecategorizeOthers: () => ipcRenderer.invoke('ai:recategorize-others'),

  // AI Workflows
  runWorkflow: (type, financialData) => ipcRenderer.invoke('ai:run-workflow', type, financialData),

  // Recommended Actions
  getRecommendedActions: () => ipcRenderer.invoke('db:recommended-actions:list'),
  addRecommendedAction: (action) => ipcRenderer.invoke('db:recommended-actions:add', action),
  completeRecommendedAction: (id) => ipcRenderer.invoke('db:recommended-actions:complete', id),
  deleteRecommendedAction: (id) => ipcRenderer.invoke('db:recommended-actions:delete', id),

  // Next Best Actions
  generateNextBestActions: () => ipcRenderer.invoke('actions:generate-next-best'),
  getNextBestActions: () => ipcRenderer.invoke('actions:list-next-best'),
  completeNextBestAction: (id) => ipcRenderer.invoke('actions:complete-next-best', id),
  dismissNextBestAction: (id) => ipcRenderer.invoke('actions:dismiss-next-best', id),
  snoozeNextBestAction: (id, untilDate) => ipcRenderer.invoke('actions:snooze-next-best', id, untilDate),

  // Personalization
  getPersonalizationProfile: () => ipcRenderer.invoke('personalization:get-profile'),
  recordInteraction: (eventType, category) => ipcRenderer.invoke('personalization:record-interaction', eventType, category),
});
