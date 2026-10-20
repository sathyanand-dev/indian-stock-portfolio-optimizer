import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    setupFiles: ['tests/setup.js'],
    globalSetup: ['tests/globalSetup.js'],
    testTimeout: 30000,
    // Integration suites share one SQLite file and truncate tables between
    // tests, so files must not run concurrently.
    fileParallelism: false,
    poolOptions: { forks: { singleFork: true } },
    env: {
      NODE_ENV: 'test',
      SECRET_KEY: 'test-secret-key-123456',
      DATABASE_URL: 'file:./test.db',
      CORS_ORIGINS: 'http://localhost:5173',
      PORT: '8001',
      JWT_ALGORITHM: 'HS256',
      ACCESS_TOKEN_EXPIRE_MINUTES: '30',
      CACHE_DURATION_MINUTES: '15',
      RISK_FREE_RATE: '0.07',
      DEFAULT_MARKET_SUFFIX: '.NS',
      LOG_LEVEL: 'error',
    },
  },
});
