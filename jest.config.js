/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/tests/**/*.test.[jt]s?(x)'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '<rootDir>/tests/utils/'
  ],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.{js,ts}',
    '!src/index.ts',
    '!src/scripts/**/*',
    '!**/*.d.ts',
    '!**/node_modules/**'
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testTimeout: 30000, // 30 seconds timeout for tests since we're calling OpenAI API
  moduleDirectories: ['node_modules', '<rootDir>']
}; 