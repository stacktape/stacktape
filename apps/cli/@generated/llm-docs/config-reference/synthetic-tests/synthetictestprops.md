# SyntheticTestProps API Reference

## TypeScript definition

```typescript
import type { ConsoleChannelIntegration, DiscordIntegration, EmailIntegration, EnvironmentVar, MsTeamsIntegration, SlackIntegration, SyntheticApiTest, SyntheticBrowserTest, WebhookIntegration } from 'stacktape';

type SyntheticTestProps = {
  /** What the test does: drive a real browser, or call APIs directly. */
  test: SyntheticTestTest;
  /** Environment variables available to the test script. */
  environment?: Array<EnvironmentVar>;
  /** Memory available to the test run, in MB. */
  memory?: number;
  /** Where to send an alert when the test starts failing (and when it recovers). */
  notificationChannels?: Array<SyntheticTestNotificationChannels>;
  /** How long run results (pass/fail history and reports) are kept, in days. */
  retentionDays?: number;
  /** How often the test runs. */
  scheduleRate?: string;
  /** How long one run may take before it counts as failed, in seconds. */
  timeoutSeconds?: number;
};

/** Union choices used by the properties above. */
type SyntheticTestTest =
  | SyntheticBrowserTest
  | SyntheticApiTest;

type SyntheticTestNotificationChannels =
  | SlackIntegration
  | MsTeamsIntegration
  | EmailIntegration
  | DiscordIntegration
  | WebhookIntegration
  | ConsoleChannelIntegration;
```

## Property: `test`

- Required: yes
- Type: `browser | api`

What the test does: drive a real browser, or call APIs directly.

A synthetic test runs your script on a schedule from AWS CloudWatch Synthetics in your own
account, and alerts you when a run fails. Use it to continuously verify flows a simple uptime
check cannot: sign-in, checkout, a multi-step API sequence with assertions.

`browser` — the script drives a real Chromium browser with
[Playwright](https://playwright.dev). Screenshots taken during the run are stored with each
run's results.
`api` — the script makes HTTP calls with per-step timing and assertions; no browser starts,
so runs are faster and cheaper.

Choices:
- `browser` (`SyntheticBrowserTest`). Properties: `scriptPath: string`.
- `api` (`SyntheticApiTest`). Properties: `scriptPath: string`.

### Example 1 (yaml)

```yaml
resources:
  checkoutFlow:
    type: synthetic-test
    properties:
      test:
        type: browser
        properties:
          scriptPath: ./e2e/checkout.canary.ts
```

### Example 2 (typescript)

```typescript
import { SyntheticTest, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const checkoutFlow = new SyntheticTest({
    test: { type: 'browser', properties: { scriptPath: './e2e/checkout.canary.ts' } }
  });
  return { resources: { checkoutFlow } };
});
```

## Property: `environment`

- Required: no
- Type: `Array<EnvironmentVar>`

Environment variables available to the test script.

Available via `process.env` in the script. Values are limited to 4 KB in total and are not
encrypted — put secrets in [Stacktape secrets](https://docs.stacktape.com/resources/secrets/)
and reference them with `$Secret()` instead of pasting them here.

### Example 1 (yaml)

```yaml
resources:
  checkoutFlow:
    type: synthetic-test
    properties:
      test:
        type: browser
        properties:
          scriptPath: ./e2e/checkout.canary.ts
      environment:
        - name: BASE_URL
          value: https://app.example.com
        - name: TEST_USER_PASSWORD
          value: $Secret('synthetic-test-user.password')
```

### Example 2 (typescript)

```typescript
import { SyntheticTest, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const checkoutFlow = new SyntheticTest({
    test: { type: 'browser', properties: { scriptPath: './e2e/checkout.canary.ts' } },
    environment: [
      { name: 'BASE_URL', value: 'https://app.example.com' },
      { name: 'TEST_USER_PASSWORD', value: "$Secret('synthetic-test-user.password')" }
    ]
  });
  return { resources: { checkoutFlow } };
});
```

## Property: `memory`

- Required: no
- Type: `number`
- Default: `1024`

Memory available to the test run, in MB.

Between 960 and 3008, in multiples of 64. Browser tests are memory-hungry; raise this if runs
die without a script error.

## Property: `notificationChannels`

- Required: no
- Type: `Array<slack | ms-teams | email | discord | webhook | console-channel>`

Where to send an alert when the test starts failing (and when it recovers).

Accepts the same channels as alarms and uptime checks: inline `slack`, `ms-teams`, `discord`,
`email` or `webhook` definitions, or `console-channel` references to channels managed in the
Stacktape Console. Without a channel, failures are still visible in the Console.

Choices:
- `slack` (`SlackIntegration`). Properties: `conversationId: string`, `accessToken: string`.
- `ms-teams` (`MsTeamsIntegration`). Properties: `webhookUrl: string`.
- `email` (`EmailIntegration`). Properties: `sender: string`, `recipient: string`.
- `discord` (`DiscordIntegration`). Properties: `webhookUrl: string`.
- `webhook` (`WebhookIntegration`). Properties: `url: string`, `secret?: string`, `headers?: unknown`.
- `console-channel` (`ConsoleChannelIntegration`). Properties: `channelName: string`.

### Example 1 (yaml)

```yaml
resources:
  checkoutFlow:
    type: synthetic-test
    properties:
      test:
        type: browser
        properties:
          scriptPath: ./e2e/checkout.canary.ts
      notificationChannels:
        - type: console-channel
          properties:
            channelName: on-call-slack
```

### Example 2 (typescript)

```typescript
import { SyntheticTest, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const checkoutFlow = new SyntheticTest({
    test: { type: 'browser', properties: { scriptPath: './e2e/checkout.canary.ts' } },
    notificationChannels: [{ type: 'console-channel', properties: { channelName: 'on-call-slack' } }]
  });
  return { resources: { checkoutFlow } };
});
```

## Property: `retentionDays`

- Required: no
- Type: `number`
- Default: `31`

How long run results (pass/fail history and reports) are kept, in days.

Between 1 and 455. Applies to both successful and failed runs.

This controls the CloudWatch Synthetics run history. Artifacts the runs produce — screenshots
and HAR files stored in the stack's deployment bucket, and the canary's CloudWatch logs — are
not deleted automatically by AWS; clean them up manually if storage cost matters.

## Property: `scheduleRate`

- Required: no
- Type: `string`
- Default: `rate(5 minutes)`

How often the test runs.

Accepts `rate(n minutes)` (between `rate(1 minute)` and `rate(1 hour)`) or a
`cron(...)` expression.

Cost scales with frequency: CloudWatch Synthetics charges ~$0.0012 per run, so a browser test
at `rate(5 minutes)` costs about $11/month in run charges plus a few dollars of Lambda and
storage — budget roughly $15–20/month. An `api` test runs shorter and lands closer to
$11–13/month. Slower schedules cost proportionally less.

### Example 1 (yaml)

```yaml
resources:
  checkoutFlow:
    type: synthetic-test
    properties:
      test:
        type: browser
        properties:
          scriptPath: ./e2e/checkout.canary.ts
      scheduleRate: rate(15 minutes)
```

### Example 2 (typescript)

```typescript
import { SyntheticTest, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const checkoutFlow = new SyntheticTest({
    test: { type: 'browser', properties: { scriptPath: './e2e/checkout.canary.ts' } },
    scheduleRate: 'rate(15 minutes)'
  });
  return { resources: { checkoutFlow } };
});
```

## Property: `timeoutSeconds`

- Required: no
- Type: `number`
- Default: `60`

How long one run may take before it counts as failed, in seconds.

Between 3 and 840 seconds, and never more than the schedule interval.
