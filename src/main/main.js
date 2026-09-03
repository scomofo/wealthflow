const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const { logger } = require('./logger');

let mainWindow;
let database;
let aiService;

// Two instances writing to the same sql.js-backed wealthflow.db would silently
// clobber each other (last save wins), so only one instance may run at a time.
const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#0b0c11',
      symbolColor: '#76757a',
      height: 36,
    },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    backgroundColor: '#08090d',
    show: true,
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  // app.quit() above does not synchronously prevent whenReady() from
  // resolving, so this guard is what actually stops a second instance
  // from initializing its own database/window before it exits.
  if (!gotSingleInstanceLock) return;

  logger.init('info');
  logger.info('WealthFlow starting');

  const { WealthFlowDatabase } = require('./database');
  const { registerIpcHandlers } = require('./ipc-handlers');
  const { AiService } = require('./ai-service');

  try {
    database = new WealthFlowDatabase();
    await database.init();
    logger.info('Database initialized');
  } catch (err) {
    logger.error('Database initialization failed', { error: err.message, stack: err.stack });
    dialog.showErrorBox(
      'WealthFlow - Database Error',
      `Failed to initialize the database:\n\n${err.message}\n\nThe application will now close.`
    );
    app.quit();
    return;
  }

  aiService = new AiService();
  aiService.init();
  logger.info('AI service initialized');

  // Renderer logging IPC
  const RENDERER_LOG_LEVELS = new Set(['debug', 'info', 'warn', 'error']);
  ipcMain.on('log:renderer', (_, level, message, data, source) => {
    const prefix = source ? `[renderer:${source}]` : '[renderer]';
    // logger[level] would also match non-level methods like init() —
    // a renderer sending level: 'init' would re-run Logger's
    // initialization (mkdir + a log line) as a side effect of a plain
    // log call. Restrict to the four real log levels.
    const fn = RENDERER_LOG_LEVELS.has(level) ? logger[level] : logger.info;
    fn.call(logger, `${prefix} ${message}`, data);
  });

  registerIpcHandlers(database, aiService);
  createWindow();
  logger.info('Application ready');

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  // On macOS the app conventionally stays running (dock icon, no windows)
  // until the user explicitly quits — closing the database/AI service here
  // unconditionally would leave 'activate' recreating a window against an
  // already-closed database. Actual teardown happens once in
  // 'before-quit', which fires on every platform right before the process
  // really exits.
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (aiService) aiService.destroy();
  if (database) database.close();
  logger.info('WealthFlow shutting down');
});
