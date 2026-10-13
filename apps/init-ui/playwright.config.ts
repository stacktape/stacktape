import { fileURLToPath } from 'node:url';
import type { PlaywrightTestConfig } from '@playwright/test';

const runDirectory = `../../.stacktape/test-runs/init-ui/${Date.now()}-${process.pid}/artifacts`;

// Each spec starts its own scripted wizard (`e2e/fixtures.ts`) against the built bundle, so specs run in parallel.
// No Playwright runtime imports here: repository tooling loads several workspaces' configs together.
export default {
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  outputDir: fileURLToPath(new URL(runDirectory, import.meta.url)),
  reporter: 'line',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  workers: 2,
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  failOnFlakyTests: true,
  forbidOnly: Boolean(process.env.CI),
  use: {
    browserName: 'chromium',
    viewport: { width: 1280, height: 720 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    serviceWorkers: 'block',
    video: 'off'
  }
} satisfies PlaywrightTestConfig;
