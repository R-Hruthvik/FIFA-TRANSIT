module.exports = {
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^mongodb$': '<rootDir>/node_modules/mongodb/lib/index.js',
    '^mongodb/(.*)$': '<rootDir>/node_modules/mongodb/lib/$1.js',
    '^bson$': '<rootDir>/node_modules/bson/lib/bson.cjs',
  },
  transform: {
    '^.+\\.(ts|tsx)?$': 'ts-jest',
  },
  setupFilesAfterEnv: ['@testing-library/jest-dom'],
  testPathIgnorePatterns: ['<rootDir>/.claude/', '<rootDir>/node_modules/', '<rootDir>/playwright/'],
  transformIgnorePatterns: [
    'node_modules/(?!(bson)/)',
  ],
};
