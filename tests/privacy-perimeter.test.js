const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

describe('repository privacy perimeter', () => {
  test('does not retain one-off scripts that expose or embed personal financial data', () => {
    for (const relative of [
      'scripts/debug-safestorage.js',
      'scripts/import-canada-life.js',
      'scripts/ai-recategorize.js',
    ]) {
      expect(fs.existsSync(path.join(root, relative))).toBe(false);
    }
  });

  test('ignores macOS metadata and local database files', () => {
    const gitignore = fs.readFileSync(path.join(root, '.gitignore'), 'utf8');
    expect(gitignore).toContain('.DS_Store');
    expect(gitignore).toContain('*.db');
    expect(gitignore).toContain('.env');
  });
});
