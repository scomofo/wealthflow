// Regression coverage for two related CSP bugs:
// - index.html's CSP allowed the Google Fonts stylesheet in font-src, but
//   the browser enforces a stylesheet <link> under style-src, not
//   font-src — so the app's own CSP silently blocked the fonts it
//   declared, and every page always rendered in the fallback typeface.
// - script-src 'self' (correctly) blocks inline onclick="..." handlers,
//   which index.html and two modal components still had, making the
//   error-screen Reload button do nothing and leaving two now-redundant,
//   already-dead event.stopPropagation() attributes in modal markup.
const fs = require('fs');
const path = require('path');

function readRepoFile(...parts) {
  return fs.readFileSync(path.join(__dirname, '..', ...parts), 'utf8');
}

describe('startup uses local fonts and a restrictive CSP', () => {
  const html = readRepoFile('src', 'renderer', 'index.html');
  const cspMatch = html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)">/);

  test('index.html has a CSP meta tag', () => {
    expect(cspMatch).not.toBeNull();
  });

  test('no Google Fonts requests or third-party font origins remain at startup', () => {
    expect(html).not.toMatch(/fonts\\.googleapis\\.com|fonts\\.gstatic\\.com|fonts\\.googleapis\\.com\/css/);
    expect(html).not.toMatch(/<link rel="preconnect" href="https?:/);
    const csp = cspMatch[1];
    expect(csp.match(/style-src ([^;]+)/)[1]).not.toContain('https://');
    expect(csp.match(/font-src ([^;"]+)/)[1]).toBe("'self'");
  });

  test('theme font stacks have high-quality system fallbacks', () => {
    const theme = readRepoFile('src', 'renderer', 'styles', 'theme.css');
    expect(theme).toMatch(/--font-display:.*Georgia.*serif/);
    expect(theme).toMatch(/--font-body:.*system-ui/);
    expect(theme).not.toMatch(/Literata|Plus Jakarta Sans/);
  });
});

describe('no inline event handler attributes remain (blocked by script-src \'self\')', () => {
  const rendererFiles = [
    'src/renderer/index.html',
    'src/renderer/js/app.js',
    'src/renderer/js/components/import-modal.js',
    'src/renderer/js/components/recurring-modal.js',
  ];

  test.each(rendererFiles)('%s has no onclick="..." (or similar) attribute', (relPath) => {
    const source = readRepoFile(...relPath.split('/'));
    expect(source).not.toMatch(/\bonclick\s*=/);
  });
});

describe('the error-screen Reload button works under CSP', () => {
  test('app.js wires it through data-action instead of inline onclick', () => {
    const appSource = readRepoFile('src', 'renderer', 'js', 'app.js');
    expect(appSource).toContain('data-action="reload-app"');
  });

  test('handlers/shared.js handles the reload-app action', () => {
    const sharedSource = readRepoFile('src', 'renderer', 'js', 'handlers', 'shared.js');
    expect(sharedSource).toMatch(/case 'reload-app':[\s\S]{0,80}location\.reload\(\)/);
  });
});
