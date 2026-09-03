// Regression coverage for finding M18 (resource leak): the pdf:generate-report
// IPC handler created a hidden BrowserWindow to render the report and print
// it to PDF, but only called win.close() on the success path — if
// win.loadURL() or win.webContents.printToPDF() rejected (renderer crash,
// oversized data: URL, printing subsystem failure), the window (and its
// hidden renderer process) was never closed and leaked for the life of the
// app. The fix wraps the body in try/finally so the window is always closed.

jest.mock('electron', () => ({
  ipcMain: { handle: jest.fn(), on: jest.fn() },
  BrowserWindow: jest.fn(),
  dialog: {},
  app: { getPath: jest.fn(() => '/tmp/wealthflow-test') },
  shell: {},
  Notification: { isSupported: jest.fn(() => false) },
  nativeTheme: { shouldUseDarkColors: false },
}));

function makeStubDatabase() {
  return { getSettings: jest.fn(() => ({})) };
}

function makeFakeWindow({ loadURLImpl, printToPDFImpl } = {}) {
  const win = {
    loadURL: jest.fn(loadURLImpl || (() => Promise.resolve())),
    webContents: { printToPDF: jest.fn(printToPDFImpl || (() => Promise.resolve(Buffer.from('pdf')))) },
    close: jest.fn(),
    isDestroyed: jest.fn(() => false),
  };
  return win;
}

const { ipcMain, BrowserWindow } = require('electron');
const { registerIpcHandlers } = require('../src/main/ipc-handlers.js');

describe('pdf:generate-report window cleanup', () => {
  let handler;

  beforeEach(() => {
    jest.clearAllMocks();
    registerIpcHandlers(makeStubDatabase(), {});
    const call = ipcMain.handle.mock.calls.find(([channel]) => channel === 'pdf:generate-report');
    handler = call[1];
  });

  test('closes the window on the success path', async () => {
    const win = makeFakeWindow();
    BrowserWindow.mockReturnValue(win);

    const result = await handler({}, '<h1>Report</h1>');

    expect(result).toEqual(Buffer.from('pdf'));
    expect(win.close).toHaveBeenCalledTimes(1);
  });

  test('closes the window when loadURL rejects', async () => {
    const win = makeFakeWindow({ loadURLImpl: () => Promise.reject(new Error('renderer crashed')) });
    BrowserWindow.mockReturnValue(win);

    await expect(handler({}, '<h1>Report</h1>')).rejects.toThrow('renderer crashed');
    expect(win.close).toHaveBeenCalledTimes(1);
  });

  test('closes the window when printToPDF rejects', async () => {
    const win = makeFakeWindow({ printToPDFImpl: () => Promise.reject(new Error('printing subsystem failure')) });
    BrowserWindow.mockReturnValue(win);

    await expect(handler({}, '<h1>Report</h1>')).rejects.toThrow('printing subsystem failure');
    expect(win.close).toHaveBeenCalledTimes(1);
  });

  test('does not call close() again if the window was already destroyed', async () => {
    const win = makeFakeWindow({ printToPDFImpl: () => Promise.reject(new Error('crashed')) });
    win.isDestroyed.mockReturnValue(true);
    BrowserWindow.mockReturnValue(win);

    await expect(handler({}, '<h1>Report</h1>')).rejects.toThrow('crashed');
    expect(win.close).not.toHaveBeenCalled();
  });
});
