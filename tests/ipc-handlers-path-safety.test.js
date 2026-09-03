// Regression coverage for isPathSafe's containment bug: it used
// resolved.startsWith(allowedDir), which also matches a sibling directory
// that merely shares the same string prefix — a resolved path under
// ".../Documents-evil/" passed the check for an allowed base of
// ".../Documents", because the string "Documents-evil" starts with
// "Documents". Also verifies advisor:copy-file and file:parse-xlsx (both
// previously unguarded) now call isPathSafe.
const path = require('path');

jest.mock('electron', () => ({
  ipcMain: { handle: jest.fn(), on: jest.fn() },
  BrowserWindow: {},
  dialog: {},
  app: {
    getPath: jest.fn((name) => {
      const roots = {
        userData: '/home/user/AppData/wealthflow',
        documents: '/home/user/Documents',
        downloads: '/home/user/Downloads',
        desktop: '/home/user/Desktop',
      };
      return roots[name];
    }),
  },
  shell: {},
}));

const { isPathSafe } = require('../src/main/ipc-handlers.js');

describe('isPathSafe', () => {
  test('allows a real file inside an allowed directory', () => {
    expect(isPathSafe('/home/user/Documents/statement.pdf')).toBe(true);
    expect(isPathSafe('/home/user/Documents/subfolder/statement.pdf')).toBe(true);
  });

  test('rejects a sibling directory that merely shares a string prefix', () => {
    // "Documents-evil" starts with "Documents" as a string, but is not
    // inside the Documents directory.
    expect(isPathSafe('/home/user/Documents-evil/secret.txt')).toBe(false);
  });

  test('rejects a path outside every allowed directory', () => {
    expect(isPathSafe('/etc/passwd')).toBe(false);
    expect(isPathSafe('/home/user/.ssh/id_rsa')).toBe(false);
  });

  test('rejects directory traversal back out of an allowed directory', () => {
    expect(isPathSafe(path.join('/home/user/Documents', '..', '..', 'etc', 'passwd'))).toBe(false);
  });

  test('allows the allowed directory itself', () => {
    expect(isPathSafe('/home/user/Documents')).toBe(true);
  });
});

describe('previously unguarded file-path IPC channels now call isPathSafe', () => {
  const fs = require('fs');

  test('advisor:copy-file guards its source path', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'main', 'ipc-handlers.js'), 'utf8');
    const handlerBody = source.slice(source.indexOf("safeHandle('advisor:copy-file'"));
    const nextHandlerStart = handlerBody.indexOf("safeHandle('advisor:delete-file'");
    expect(handlerBody.slice(0, nextHandlerStart)).toMatch(/isPathSafe\(srcPath\)/);
  });

  test('file:parse-xlsx guards its file path', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'main', 'ipc-handlers.js'), 'utf8');
    const handlerBody = source.slice(source.indexOf("safeHandle('file:parse-xlsx'"));
    expect(handlerBody.slice(0, 300)).toMatch(/isPathSafe\(filePath\)/);
  });
});
