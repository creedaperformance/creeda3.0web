const tsJestTransformer = require.resolve('ts-jest')

/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src/lib/research/__tests__'],
  testMatch: ['**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^server-only$': '<rootDir>/src/lib/research/__tests__/mocks/server-only.ts',
  },
  transform: {
    '^.+\\.tsx?$': [
      tsJestTransformer,
      {
        tsconfig: {
          module: 'commonjs',
          target: 'es2020',
          esModuleInterop: true,
          baseUrl: '.',
          paths: {
            '@/*': ['src/*'],
          },
        },
      },
    ],
  },
  collectCoverageFrom: [
    'src/lib/research/**/*.ts',
    '!src/lib/research/**/*.d.ts',
    '!src/lib/research/**/index.ts',
  ],
  clearMocks: true,
}
