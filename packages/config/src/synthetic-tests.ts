import type { NotificationChannel } from './notification-channels';
import type { EnvironmentVar, ResourceOverrides } from './shared';

export interface SyntheticTest {
  type: 'synthetic-test';
  properties: SyntheticTestProps;
  overrides?: ResourceOverrides;
}

export interface SyntheticTestProps {
  /**
   * #### What the test does: drive a real browser, or call APIs directly.
   *
   * ---
   *
   * A synthetic test runs your script on a schedule from AWS CloudWatch Synthetics in your own
   * account, and alerts you when a run fails. Use it to continuously verify flows a simple uptime
   * check cannot: sign-in, checkout, a multi-step API sequence with assertions.
   *
   * - `browser` — the script drives a real Chromium browser with
   *   [Playwright](https://playwright.dev). Screenshots taken during the run are stored with each
   *   run's results.
   * - `api` — the script makes HTTP calls with per-step timing and assertions; no browser starts,
   *   so runs are faster and cheaper.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   checkoutFlow:
   *     type: synthetic-test
   *     properties:
   *       # stp-focus
   *       test:
   *         type: browser
   *         properties:
   *           scriptPath: ./e2e/checkout.canary.ts
   *       # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { SyntheticTest, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const checkoutFlow = new SyntheticTest({
   *     // stp-focus
   *     test: { type: 'browser', properties: { scriptPath: './e2e/checkout.canary.ts' } }
   *     // stp-end-focus
   *   });
   *   return { resources: { checkoutFlow } };
   * });
   * ```
   */
  test: SyntheticTestDefinition;
  /**
   * #### How often the test runs.
   *
   * ---
   *
   * Accepts `rate(n minutes)` (between `rate(1 minute)` and `rate(1 hour)`) or a
   * `cron(...)` expression.
   *
   * Cost scales with frequency: CloudWatch Synthetics charges ~$0.0012 per run, so a browser test
   * at `rate(5 minutes)` costs about $11/month in run charges plus a few dollars of Lambda and
   * storage — budget roughly $15–20/month. An `api` test runs shorter and lands closer to
   * $11–13/month. Slower schedules cost proportionally less.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   checkoutFlow:
   *     type: synthetic-test
   *     properties:
   *       test:
   *         type: browser
   *         properties:
   *           scriptPath: ./e2e/checkout.canary.ts
   *       # stp-focus
   *       scheduleRate: rate(15 minutes)
   *       # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { SyntheticTest, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const checkoutFlow = new SyntheticTest({
   *     test: { type: 'browser', properties: { scriptPath: './e2e/checkout.canary.ts' } },
   *     // stp-focus
   *     scheduleRate: 'rate(15 minutes)'
   *     // stp-end-focus
   *   });
   *   return { resources: { checkoutFlow } };
   * });
   * ```
   *
   * @default rate(5 minutes)
   */
  scheduleRate?: string;
  /**
   * #### How long one run may take before it counts as failed, in seconds.
   *
   * ---
   *
   * Between 3 and 840 seconds, and never more than the schedule interval.
   *
   * @default 60
   */
  timeoutSeconds?: number;
  /**
   * #### Memory available to the test run, in MB.
   *
   * ---
   *
   * Between 960 and 3008, in multiples of 64. Browser tests are memory-hungry; raise this if runs
   * die without a script error.
   *
   * @default 1024
   */
  memory?: number;
  /**
   * #### Environment variables available to the test script.
   *
   * ---
   *
   * Available via `process.env` in the script. Values are limited to 4 KB in total and are not
   * encrypted — put secrets in [Stacktape secrets](https://docs.stacktape.com/resources/secrets/)
   * and reference them with `$Secret()` instead of pasting them here.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   checkoutFlow:
   *     type: synthetic-test
   *     properties:
   *       test:
   *         type: browser
   *         properties:
   *           scriptPath: ./e2e/checkout.canary.ts
   *       # stp-focus
   *       environment:
   *         - name: BASE_URL
   *           value: https://app.example.com
   *         - name: TEST_USER_PASSWORD
   *           value: $Secret('synthetic-test-user.password')
   *       # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { SyntheticTest, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const checkoutFlow = new SyntheticTest({
   *     test: { type: 'browser', properties: { scriptPath: './e2e/checkout.canary.ts' } },
   *     // stp-focus
   *     environment: [
   *       { name: 'BASE_URL', value: 'https://app.example.com' },
   *       { name: 'TEST_USER_PASSWORD', value: "$Secret('synthetic-test-user.password')" }
   *     ]
   *     // stp-end-focus
   *   });
   *   return { resources: { checkoutFlow } };
   * });
   * ```
   */
  environment?: EnvironmentVar[];
  /**
   * #### How long run results (pass/fail history and reports) are kept, in days.
   *
   * ---
   *
   * Between 1 and 455. Applies to both successful and failed runs.
   *
   * This controls the CloudWatch Synthetics run history. Artifacts the runs produce — screenshots
   * and HAR files stored in the stack's deployment bucket, and the canary's CloudWatch logs — are
   * not deleted automatically by AWS; clean them up manually if storage cost matters.
   *
   * @default 31
   */
  retentionDays?: number;
  /**
   * #### Where to send an alert when the test starts failing (and when it recovers).
   *
   * ---
   *
   * Accepts the same channels as alarms and uptime checks: inline `slack`, `ms-teams`, `discord`,
   * `email` or `webhook` definitions, or `console-channel` references to channels managed in the
   * Stacktape Console. Without a channel, failures are still visible in the Console.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   checkoutFlow:
   *     type: synthetic-test
   *     properties:
   *       test:
   *         type: browser
   *         properties:
   *           scriptPath: ./e2e/checkout.canary.ts
   *       # stp-focus
   *       notificationChannels:
   *         - type: console-channel
   *           properties:
   *             channelName: on-call-slack
   *       # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { SyntheticTest, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const checkoutFlow = new SyntheticTest({
   *     test: { type: 'browser', properties: { scriptPath: './e2e/checkout.canary.ts' } },
   *     // stp-focus
   *     notificationChannels: [{ type: 'console-channel', properties: { channelName: 'on-call-slack' } }]
   *     // stp-end-focus
   *   });
   *   return { resources: { checkoutFlow } };
   * });
   * ```
   */
  notificationChannels?: NotificationChannel[];
}

export type SyntheticTestDefinition = SyntheticBrowserTest | SyntheticApiTest;

export interface SyntheticBrowserTest {
  type: 'browser';
  properties: SyntheticBrowserTestProps;
}

export interface SyntheticBrowserTestProps {
  /**
   * #### Path to the test script, relative to the config file (or the --currentWorkingDirectory when set).
   *
   * ---
   *
   * The script drives a real browser with [Playwright](https://playwright.dev) and runs on the
   * AWS-managed Playwright runtime. TypeScript works out of the box — Stacktape bundles the script
   * at deploy time (imports of your own helper files are allowed; npm packages are not, except the
   * ones the runtime provides).
   *
   * Export a `handler` function; get the browser from the runtime's `synthetics` helper:
   *
   * ```ts
   * import { synthetics } from '@aws/synthetics-playwright';
   * import { expect } from '@playwright/test';
   *
   * export const handler = async () => {
   *   try {
   *     const browser = await synthetics.launch();
   *     const page = await synthetics.newPage(browser);
   *     await page.goto(process.env.BASE_URL, { timeout: 30000 });
   *     await page.screenshot({ path: '/tmp/home.png' });
   *     expect(await page.title()).toContain('Example');
   *   } finally {
   *     await synthetics.close();
   *   }
   * };
   * ```
   *
   * A run fails when the handler throws (including failed `expect` assertions). Screenshots written
   * to `/tmp` are stored with the run's results.
   */
  scriptPath: string;
}

export interface SyntheticApiTest {
  type: 'api';
  properties: SyntheticApiTestProps;
}

export interface SyntheticApiTestProps {
  /**
   * #### Path to the test script, relative to the config file (or the --currentWorkingDirectory when set).
   *
   * ---
   *
   * The script makes HTTP calls with per-step timing; no browser starts. TypeScript works out of
   * the box — Stacktape bundles the script at deploy time.
   *
   * Export a `handler` function; use `executeHttpStep` from the runtime's `synthetics` helper so
   * each step gets its own timing and success metrics:
   *
   * ```ts
   * const synthetics = require('Synthetics');
   *
   * exports.handler = async () => {
   *   await synthetics.executeHttpStep('health', {
   *     hostname: 'api.example.com',
   *     method: 'GET',
   *     path: '/health',
   *     protocol: 'https:'
   *   });
   *   await synthetics.executeHttpStep('create-order', {
   *     hostname: 'api.example.com',
   *     method: 'POST',
   *     path: '/orders',
   *     protocol: 'https:',
   *     headers: { 'Content-Type': 'application/json' }
   *   });
   * };
   * ```
   *
   * A run fails when the handler throws or a step's response is not a success.
   */
  scriptPath: string;
}
