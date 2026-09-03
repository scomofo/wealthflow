// Regression coverage for two renderer UX bugs found in review:
// - the transactions search input had no data-field attribute, so
//   debouncedPageRender's focus-restoration (which re-queries
//   [data-field="..."] after re-rendering the page) couldn't find it and
//   silently gave up, dropping focus out of the field on every keystroke
//   pause.
// - Ctrl+Z/Ctrl+N are also native text-editing shortcuts (undo, new
//   window); the app's global keydown handler intercepted them
//   unconditionally, so pressing Ctrl+Z while editing a text field
//   discarded the field's own undo and ran the app's "undo last
//   completed action" instead.
//
// jest.config.js runs with testEnvironment: 'node' (no DOM), so these are
// source-text checks rather than a live keydown simulation — consistent
// with how this repo already tests other renderer wiring
// (startup-desktop-notifications.test.js).
const fs = require('fs');
const path = require('path');

function readRepoFile(...parts) {
  return fs.readFileSync(path.join(__dirname, '..', ...parts), 'utf8');
}

describe('transactions search input keeps focus across re-renders', () => {
  test('the search input carries a data-field attribute debouncedPageRender can restore', () => {
    const source = readRepoFile('src', 'renderer', 'js', 'pages', 'transactions.js');
    const inputMatch = source.match(/<input class="input-field search-input tx-search"[^>]*>/);
    expect(inputMatch).not.toBeNull();
    expect(inputMatch[0]).toMatch(/data-field="search"/);
  });
});

describe('Ctrl+Z / Ctrl+N do not hijack native text-field editing', () => {
  const appSource = readRepoFile('src', 'renderer', 'js', 'app.js');

  test('Ctrl+N is gated on focus not being in a text field', () => {
    const match = appSource.match(/if \(e\.ctrlKey && e\.key === 'n'[^)]*\)\s*\{/);
    expect(match).not.toBeNull();
    expect(match[0]).toMatch(/!inTextField/);
  });

  test('Ctrl+Z is gated on focus not being in a text field', () => {
    const match = appSource.match(/if \(e\.ctrlKey && e\.key === 'z'[^)]*\)\s*\{/);
    expect(match).not.toBeNull();
    expect(match[0]).toMatch(/!inTextField/);
  });

  test('inTextField is derived from the currently focused element', () => {
    expect(appSource).toMatch(/inTextField\s*=\s*document\.activeElement\??\.tagName\s*===\s*'INPUT'\s*\|\|\s*document\.activeElement\??\.tagName\s*===\s*'TEXTAREA'/);
  });
});
