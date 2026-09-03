// Used only by Jest (via babel-jest) to transform renderer ESM source files
// into CommonJS for the test runner — the app itself ships the ESM as-is to
// the browser/Electron renderer, which loads it natively via <script
// type="module">.
module.exports = {
  presets: [['@babel/preset-env', { targets: { node: 'current' } }]],
};
