import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['**/*.{test,spec}.ts'],
    exclude: ['node_modules', 'dist'],
    globalSetup: ['./src/tests/setup/globalSetup.ts'],
    coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
    }
  },
});
