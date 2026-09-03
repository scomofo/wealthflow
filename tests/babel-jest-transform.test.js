// Regression coverage for finding M9: the renderer-file Jest transform used
// to be a hand-rolled regex substitution (tests/esm-transform.js) rather
// than a real parser. It happened to handle every ESM pattern actually used
// in this codebase so far, but being purely textual (not AST-aware) it had
// real gaps that a genuine ESM syntax change could hit at any time:
//
//  - `export const a = 1, b = 2;` (multiple declarators in one statement)
//    only matched/exported the first bound name — `b` silently became a
//    module-local variable, inaccessible via require() in tests, with no
//    error to signal the gap.
//  - `export default ...` wasn't recognized at all (the regex only matched
//    `export\s+function`, and "default" sits between the two words) — a
//    file using it would be require()'d with literal `export default ...`
//    syntax still in place, throwing a SyntaxError.
//
// babel-jest uses a real parser, so both work correctly. This test proves
// it by writing small fixture files with exactly these patterns under
// src/renderer/js (the only path segment jest.config.js's transform regex
// matches) at test time, requiring them, and cleaning them up afterward —
// no permanent fixture files needed in the source tree.
const fs = require('fs');
const path = require('path');

const fixtureDir = path.join(__dirname, '..', 'src', 'renderer', 'js', '__esm_transform_fixtures__');

beforeAll(() => {
  fs.mkdirSync(fixtureDir, { recursive: true });
});

afterAll(() => {
  fs.rmSync(fixtureDir, { recursive: true, force: true });
});

test('a multi-declarator export const exports every bound name, not just the first', () => {
  const fixturePath = path.join(fixtureDir, 'multi-declarator.js');
  fs.writeFileSync(fixturePath, 'export const a = 1, b = 2;\n');

  const mod = require(fixturePath);

  expect(mod.a).toBe(1);
  expect(mod.b).toBe(2);
});

test('export default is transformed correctly, not left as invalid CommonJS syntax', () => {
  const fixturePath = path.join(fixtureDir, 'default-export.js');
  fs.writeFileSync(fixturePath, 'export default function greet() { return "hi"; }\n');

  const mod = require(fixturePath);

  expect(mod.default()).toBe('hi');
});
