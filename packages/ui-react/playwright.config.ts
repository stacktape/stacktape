import { fileURLToPath } from 'node:url';
import type { PlaywrightTestConfig } from '@playwright/test';

// Keep config loading free of Playwright runtime imports: repository tooling loads several workspaces together.
export default {
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  workers: 2,
  forbidOnly: Boolean(process.env.CI),
  failOnFlakyTests: true,
  retries: process.env.CI ? 1 : 0,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  reporter: 'line',
  outputDir: fileURLToPath(
    new URL(`../../.stacktape/test-runs/ui-react/${Date.now()}-${process.pid}/artifacts`, import.meta.url)
  ),
  use: {
    browserName: 'chromium',
    viewport: { width: 1280, height: 720 },
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off'
  }
} satisfies PlaywrightTestConfig;
