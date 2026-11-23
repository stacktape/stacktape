import { fileURLToPath } from 'node:url';
import type { PlaywrightTestConfig } from '@playwright/test';

const port = 4391;
const baseURL = `http://127.0.0.1:${port}`;

// The specs drive the built site (`dist`) through Astro's static preview server; `test:e2e` builds it first.
// No Playwright runtime imports here: repository tooling loads several workspaces' configs together.
export default {
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  webServer: {
    command: `pnpm exec astro preview --port ${port} --host 127.0.0.1`,
    url: `${baseURL}/`,
    timeout: 60_000
  },
  use: {
    baseURL,
    browserName: 'chromium',
    viewport: { width: 1440, height: 900 },
    serviceWorkers: 'block',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'off'
  },
  workers: 2,
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  failOnFlakyTests: true,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  reporter: 'line',
  outputDir: fileURLToPath(
    new URL(`../../.stacktape/test-runs/docs/${Date.now()}-${process.pid}/artifacts`, import.meta.url)
  )
} satisfies PlaywrightTestConfig;
