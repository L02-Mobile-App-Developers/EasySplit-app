module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['./jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!react-native|@react-native|expo|@expo|@react-navigation)'
  ],
  collectCoverage: true,
  coverageReporters: ['text', 'lcov'],
};