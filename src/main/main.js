const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const { logger } = require('./logger');

let mainWindow;
let database;
let aiService;
let syncCoordinator;
let syncShuttingDown = false;

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
  const { createValidatedDatabase } = require('./validated-database');
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

  // All database calls reachable through IPC go through a validation proxy.
  // The original database instance remains owned here for lifecycle/close.
  registerIpcHandlers(createValidatedDatabase(database), aiService);
  createWindow();
  const syncEndpoint = process.env.WEALTHFLOW_SYNC_ENDPOINT;
  const syncPassphrase = process.env.WEALTHFLOW_SYNC_PASSPHRASE;
  if (syncEndpoint && syncPassphrase) {
    try {
      const { LocalSyncJournal } = require('./sync-journal');
      const { SyncDeviceRegistry } = require('./sync-devices');
      const { HttpsSyncTransport } = require('./sync-transport');
      const { SyncEngine } = require('./sync-engine');
      const { BackgroundSyncCoordinator } = require('./background-sync');
      const syncRoot = path.join(app.getPath('userData'), 'sync');
      const devices = new SyncDeviceRegistry({ rootDir: syncRoot, deviceName: process.env.WEALTHFLOW_DEVICE_NAME || 'This computer' });
      const local = devices.ensureLocal();
      const journal = new LocalSyncJournal({ rootDir: syncRoot, deviceId: local.id });
      const transport = new HttpsSyncTransport({ endpoint: syncEndpoint, authorization: process.env.WEALTHFLOW_SYNC_AUTH || null });
      const engine = new SyncEngine({ database, journal, transport, passphrase: syncPassphrase, deviceRegistry: devices });
      syncCoordinator = new BackgroundSyncCoordinator({
        syncOnce: () => engine.syncOnce(),
        onState: (state) => logger.info('Cloud sync state', { state: state.state, action: state.action, reason: state.reason }),
      });
      database.onCommittedSave(() => syncCoordinator?.markDirty());
      void syncCoordinator.start().catch((error) => logger.warn('Startup cloud sync failed', { error: error.message }));
      logger.info('Cloud sync configured', { endpointHost: new URL(syncEndpoint).host });
    } catch (error) {
      logger.error('Cloud sync configuration failed', { error: error.message });
    }
  }
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

app.on('before-quit', (event) => {
  if (!syncCoordinator || syncShuttingDown) return;
  event.preventDefault();
  syncShuttingDown = true;
  void syncCoordinator.stop()
    .catch((error) => logger.warn('Shutdown cloud sync failed', { error: error.message }))
    .finally(() => {
      syncCoordinator = null;
      app.quit();
    });
});
