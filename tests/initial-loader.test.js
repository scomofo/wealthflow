// Regression coverage for finding M14: init() in app.js awaits
// State.loadAll() (16 parallel IPC calls) plus several more sequential
// awaited calls (snapshotNetWorth, processRecurringBills,
// refreshCommandCenterIntelligence) before calling render() for the first
// time — during that whole window, #app was completely empty, so first
// launch showed a blank background with nothing at all rather than any
// indication the app was starting up.
const fs = require('fs');
const path = require('path');

const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'index.html'), 'utf8');
const mainCss = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles', 'main.css'), 'utf8');
const appJs = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'js', 'app.js'), 'utf8');

describe('initial loading state', () => {
  test('index.html shows a loading indicator inside #app before any JS runs', () => {
    const appDivMatch = indexHtml.match(/<div id="app">([\s\S]*?)<\/div>\s*<script/);
    expect(appDivMatch).not.toBeNull();
    expect(appDivMatch[1]).toContain('initial-loader');
    expect(appDivMatch[1].trim().length).toBeGreaterThan(0);
  });

  test('the initial-loader styles are defined so the indicator actually renders visibly', () => {
    expect(mainCss).toMatch(/\.initial-loader\s*\{/);
    expect(mainCss).toMatch(/\.initial-loader-spinner\s*\{/);
  });

  test('render() replaces #app\'s entire innerHTML, so the static loader is guaranteed to be cleared on first render — not left behind under the real UI', () => {
    const renderFnStart = appJs.indexOf('async function render()');
    expect(renderFnStart).toBeGreaterThan(-1);
    const renderFnBody = appJs.slice(renderFnStart, renderFnStart + 1200);
    expect(renderFnBody).toMatch(/getElementById\(['"]app['"]\)/);
    expect(renderFnBody).toMatch(/el\.innerHTML\s*=/);
  });
});
