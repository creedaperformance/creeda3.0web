const tsJestTransformer = require.resolve('ts-jest')

/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: [
    '<rootDir>/src/lib/research/__tests__',
    '<rootDir>/src/lib/diagnostics/__tests__',
    '<rootDir>/packages/engine/src/__tests__',
  ],
  testMatch: ['**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@creeda/engine$': '<rootDir>/packages/engine/src/index.ts',
    '^@creeda/engine/(.*)$': '<rootDir>/packages/engine/src/$1',
    '^@creeda/schemas$': '<rootDir>/packages/schemas/src/index.ts',
    '^@creeda/schemas/(.*)$': '<rootDir>/packages/schemas/src/$1',
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
            '@creeda/engine': ['packages/engine/src/index.ts'],
            '@creeda/engine/*': ['packages/engine/src/*'],
            '@creeda/schemas': ['packages/schemas/src/index.ts'],
            '@creeda/schemas/*': ['packages/schemas/src/*'],
          },
        },
      },
    ],
  },
  collectCoverageFrom: [
    'src/lib/research/**/*.ts',
    'packages/engine/src/**/*.ts',
    '!src/lib/research/**/*.d.ts',
    '!src/lib/research/**/index.ts',
    '!packages/engine/src/**/__tests__/*.ts',
    '!packages/engine/src/index.ts',
  ],
  clearMocks: true,
}
