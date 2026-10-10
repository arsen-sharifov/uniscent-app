import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'jsdom',
          include: ['tests/unit/**/*.test.{ts,tsx}'],
          setupFiles: ['./tests/unit/setup.ts'],
          mockReset: true,
        },
      },
      {
        extends: true,
        test: {
          name: 'integration',
          environment: 'node',
          include: ['tests/integration/**/*.test.ts'],
          globalSetup: ['./tests/integration/globalSetup.ts'],
        },
      },
    ],
    coverage: {
      include: ['src/**'],
      exclude: ['src/**/index.ts', 'src/lib/interfaces/**'],
      reporter: ['text-summary', 'html', 'lcov', 'json-summary'],
      thresholds: {
        statements: 84,
        branches: 77,
        functions: 81,
        lines: 85,
      },
    },
  },
});
