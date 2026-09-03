// Regression coverage for finding M17 (contrast, label association,
// aria-labels). Covers three sub-issues:
//   1. --muted was #3e3d38 on dark / #b0aa9e on light, giving ~1.6-2.2:1
//      contrast against the app's card/background colors — far below the
//      4.5:1 WCAG AA minimum for normal text, even though it's used as the
//      actual color of caption/helper text throughout the app.
//   2. Several form fields rendered their caption as a plain
//      <div class="input-label"> next to an <input>/<select> that already
//      had a matching id, instead of a <label for="..."> — no programmatic
//      association for screen reader users tabbing into the field.
//   3. Several icon-only buttons (delete/edit/etc.) had neither a `title`
//      nor an `aria-label`, so a screen reader announces only "button".

const fs = require('fs');
const path = require('path');

function read(relPath) {
  return fs.readFileSync(path.join(__dirname, '..', relPath), 'utf8');
}

// --- 1. --muted contrast -----------------------------------------------

function relativeLuminance(hex) {
  const clean = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map(i => parseInt(clean.slice(i, i + 2), 16) / 255);
  const f = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const [R, G, B] = [r, g, b].map(f);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

function contrastRatio(hex1, hex2) {
  const l1 = relativeLuminance(hex1);
  const l2 = relativeLuminance(hex2);
  const [lighter, darker] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (lighter + 0.05) / (darker + 0.05);
}

function extractVar(css, varName) {
  const match = css.match(new RegExp(`${varName}:\\s*(#[0-9a-fA-F]{6})`));
  if (!match) throw new Error(`${varName} not found`);
  return match[1];
}

describe('--muted color contrast (theme.css)', () => {
  const css = read('src/renderer/styles/theme.css');
  const rootBlock = css.slice(css.indexOf(':root'), css.indexOf('.light'));
  const lightBlock = css.slice(css.indexOf('.light'));

  test('dark theme --muted meets 4.5:1 against --bg and --card', () => {
    const muted = extractVar(rootBlock, '--muted');
    const bg = extractVar(rootBlock, '--bg');
    const card = extractVar(rootBlock, '--card');
    expect(contrastRatio(muted, bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(muted, card)).toBeGreaterThanOrEqual(4.5);
  });

  test('light theme --muted meets 4.5:1 against --bg and --card', () => {
    const muted = extractVar(lightBlock, '--muted');
    const bg = extractVar(lightBlock, '--bg');
    const card = extractVar(lightBlock, '--card');
    expect(contrastRatio(muted, bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(muted, card)).toBeGreaterThanOrEqual(4.5);
  });
});

// --- 2. label/input association -----------------------------------------

describe('form fields use <label for="..."> instead of an unassociated <div>', () => {
  test('onboarding-stepper.js pairs each id-bearing field with a matching label', () => {
    const src = read('src/renderer/js/components/onboarding-stepper.js');
    for (const id of ['ob-name', 'ob-province', 'ob-income', 'ob-expenses', 'ob-debt', 'ob-savings', 'ob-api-key']) {
      expect(src).toMatch(new RegExp(`<label class="input-label" for="${id}">`));
      expect(src).toMatch(new RegExp(`id="${id}"`));
    }
  });

  test('advisor-wizard.js shared field()/selectField() helpers emit id + label for=', () => {
    const src = read('src/renderer/js/pages/advisor-wizard.js');
    expect(src).toMatch(/function field\(label, id, value, type = 'text', extra = ''\) \{\s*const domId = `wiz-\$\{STEPS\[currentStep\]\.key\}-\$\{id\}`;/);
    expect(src).toMatch(/<label class="input-label" for="\$\{domId\}">\$\{label\}<\/label>/);
    expect(src).toMatch(/function selectField\(label, id, options\) \{\s*const domId = `wiz-\$\{STEPS\[currentStep\]\.key\}-\$\{id\}`;/);
  });

  test('tax-calculator.js pairs each id-bearing field with a matching label', () => {
    const src = read('src/renderer/js/pages/tax-calculator.js');
    for (const id of ['tax-province', 'tax-employment', 'tax-other', 'tax-rrsp', 'tax-eligible-div', 'tax-noneligible-div', 'tax-pension', 'tax-spouse']) {
      expect(src).toMatch(new RegExp(`<label class="input-label" for="${id}">`));
    }
  });

  test('settings-page.js pairs each id-bearing field with a matching label', () => {
    const src = read('src/renderer/js/pages/settings-page.js');
    for (const id of ['settings-user-name', 'settings-province', 'ai-key-input', 'settings-ai-model']) {
      expect(src).toMatch(new RegExp(`<label class="input-label" for="${id}">`));
    }
  });
});

// --- 3. icon-only buttons have an accessible name -------------------------

describe('icon-only action buttons carry an aria-label', () => {
  const cases = [
    ['src/renderer/js/pages/investments.js', ['edit-inv', 'delete-inv']],
    ['src/renderer/js/pages/debts.js', ['edit-debt', 'delete-debt']],
    ['src/renderer/js/pages/budget.js', ['edit-budget', 'delete-budget']],
    ['src/renderer/js/pages/savings.js', ['delete-goal']],
    ['src/renderer/js/pages/bills.js', ['delete-bill']],
    ['src/renderer/js/pages/registered-accounts.js', ['delete-resp-beneficiary', 'delete-gic', 'delete-contribution']],
    ['src/renderer/js/pages/advisor-wizard.js', ['wizard-delete-asset']],
    ['src/renderer/js/components/dashboard-action-list.js', ['complete-action', 'delete-action']],
    ['src/renderer/js/components/onboarding-stepper.js', ['ob-prev']],
    ['src/renderer/js/components/recurring-modal.js', ['close-recurring-modal']],
    ['src/renderer/js/components/import-modal.js', ['close-import-modal']],
  ];

  test.each(cases)('%s: %j has aria-label on its data-action button(s)', (file, actions) => {
    const src = read(file);
    for (const action of actions) {
      // Match the specific <button ... data-action="..."> tag (not e.g. an
      // outer .modal-overlay div sharing the same data-action) and assert it
      // also carries an aria-label attribute within the same tag.
      const tagMatch = src.match(new RegExp(`<button[^>]*data-action="${action}"[^>]*>`));
      expect(tagMatch).not.toBeNull();
      expect(tagMatch[0]).toMatch(/aria-label="[^"]+"/);
    }
  });
});
