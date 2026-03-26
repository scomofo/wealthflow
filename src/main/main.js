const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const { logger } = require('./logger');

let mainWindow;
let database;
let aiService;

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
  ipcMain.on('log:renderer', (_, level, message, data, source) => {
    const prefix = source ? `[renderer:${source}]` : '[renderer]';
    logger[level] ? logger[level](`${prefix} ${message}`, data) : logger.info(`${prefix} ${message}`, data);
  });

  registerIpcHandlers(database, aiService);
  createWindow();
  logger.info('Application ready');

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (aiService) aiService.destroy();
  if (database) database.close();
  logger.info('WealthFlow shutting down');
  if (process.platform !== 'darwin') app.quit();
});
