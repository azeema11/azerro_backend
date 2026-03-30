import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['**/*.{test,spec}.ts'],
    exclude: ['node_modules', 'dist'],
    globalSetup: ['./src/tests/setup/global_setup.ts'],
    env: {
      JWT_SECRET: 'test-secret'
    },
    coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
    }
  },
});
