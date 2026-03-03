import { defineConfig } from '@playwright/test';

/**
 * Playwright config for testing local dev mode workloads.
 *
 * Expects the dev mode to already be running:
 *   bun dev dev --projectName dev-mode --region eu-west-1 --stage manual10 \
 *     --cp .\_test-stacks\local-dev-mode\stacktape.ts --resources all --agent
 *
 * Proxy port for stage "manual10" is 1377 (1355 + hash("manual10") % 100).
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  retries: 1,
  use: {
    baseURL: 'http://nextjsfrontend.manual10.localhost:1377',
    headless: true,
    viewport: { width: 1280, height: 720 },
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
    trace: 'on-first-retry'
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }]
});
