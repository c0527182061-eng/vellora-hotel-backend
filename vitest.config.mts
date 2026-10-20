import { defineConfig } from 'vitest/config';

// הבדיקות רצות מול מסד PostgreSQL אמיתי ונפרד (vellora_test) – לא מול מסד הפיתוח!
export default defineConfig({
  test: {
    environment: 'node',
    globalSetup: ['./tests/globalSetup.ts'],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/vellora_test',
      JWT_SECRET: 'test-only-secret-not-for-production-0123456789',
      JWT_EXPIRES_IN: '1h',
      CORS_ORIGINS: 'http://localhost:5173',
      STORAGE_PROVIDER: 'local',
      LOCAL_UPLOAD_DIR: '.test-uploads',
      PUBLIC_SERVER_URL: 'http://localhost:4000',
    },
  },
});
