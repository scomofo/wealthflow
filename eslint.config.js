const js = require('@eslint/js');

module.exports = [
  js.configs.recommended,
  {
    files: ['src/main/**/*.js', 'start.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        require: 'readonly',
        module: 'readonly',
        exports: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        URL: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
      'no-console': 'off',
    },
  },
  {
    // Vendored, minified third-party bundle — not our code to lint.
    ignores: ['src/renderer/js/lib/**'],
  },
  {
    files: ['src/renderer/**/*.js'],
    ignores: ['src/renderer/js/lib/**'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        // DOM / window
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        location: 'readonly',
        navigator: 'readonly',
        confirm: 'readonly',
        prompt: 'readonly',
        alert: 'readonly',
        getComputedStyle: 'readonly',
        // Timers / scheduling
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        queueMicrotask: 'readonly',
        // Web APIs used by parsers / importers
        TextDecoder: 'readonly',
        TextEncoder: 'readonly',
        DecompressionStream: 'readonly',
        CompressionStream: 'readonly',
        Blob: 'readonly',
        File: 'readonly',
        FileReader: 'readonly',
        FormData: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        fetch: 'readonly',
        atob: 'readonly',
        btoa: 'readonly',
        structuredClone: 'readonly',
        // Storage / events / observers
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        Event: 'readonly',
        CustomEvent: 'readonly',
        MutationObserver: 'readonly',
        ResizeObserver: 'readonly',
        IntersectionObserver: 'readonly',
        // Third-party globals
        Chart: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
      'no-console': 'off',
    },
  },
  {
    files: ['tests/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        require: 'readonly',
        module: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        jest: 'readonly',
        console: 'readonly',
        process: 'readonly',
      },
    },
  },
  {
    ignores: ['node_modules/', 'dist/', 'build/'],
  },
];
