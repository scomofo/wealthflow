module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  transform: {
    'src[\\\\/]renderer[\\\\/].*\\.js$': './tests/esm-transform.js',
  },
};
