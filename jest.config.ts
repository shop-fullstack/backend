import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  setupFiles: ['reflect-metadata'],
  collectCoverageFrom: ['**/*.service.ts', '**/*.controller.ts', '**/*.interceptor.ts', '**/*.filter.ts', '**/*.middleware.ts'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
};

export default config;
