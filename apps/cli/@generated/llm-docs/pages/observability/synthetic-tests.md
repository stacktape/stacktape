# Synthetic tests

A synthetic test runs your script on a schedule with AWS CloudWatch Synthetics in your own account and alerts you when
a run fails. An [uptime check](/observability/uptime-checks) asks whether an endpoint answers; a synthetic test checks a
whole flow, such as sign-in, checkout or a sequence of API calls with assertions.

Write one for the few flows whose breakage costs you customers, typically sign-up, sign-in and payment. Each test adds
a monthly cost (see [Cost](#cost)). Synthetic tests watch a deployed stage continuously; they don't gate deploys and
they aren't load tests.

Synthetic tests run without the Stacktape Console. With it, the Console's **Synthetics** page shows each run with its
screenshots, and a failing test can open an [incident](/observability/incidents).

## Configuration

```yaml
resources:
  checkoutFlow:
    type: synthetic-test
    properties:
      test:
        type: browser
        properties:
          scriptPath: ./e2e/checkout.canary.ts
      scheduleRate: rate(15 minutes) # default rate(5 minutes)
      timeoutSeconds: 60 # default 60
      memory: 1024 # default 1024
      environment:
        - name: BASE_URL
          value: https://app.example.com
      notificationChannels:
        - type: console-channel
          properties:
            channelName: on-call-slack
```

`test.type` is `browser` (drives a real Chromium browser with [Playwright](https://playwright.dev)) or `api` (HTTP calls with per-step timing; no browser, so runs are faster and cheaper).

## Writing the script

TypeScript works out of the box — Stacktape bundles the script at deploy time. Imports of your own helper files are allowed; npm packages are not, except the ones the Synthetics runtime provides.

A browser test exports a `handler` and gets the browser from the runtime's `synthetics` helper:

```ts
import { synthetics } from '@aws/synthetics-playwright';
import { expect } from '@playwright/test';

export const handler = async () => {
  try {
    const browser = await synthetics.launch();
    const page = await synthetics.newPage(browser);
    await page.goto(process.env.BASE_URL, { timeout: 30000 });
    await page.getByRole('link', { name: 'Sign in' }).click();
    await page.screenshot({ path: '/tmp/signin.png' });
    expect(await page.title()).toContain('Sign in');
  } finally {
    await synthetics.close();
  }
};
```

A run fails when the handler throws (including failed `expect` assertions). Screenshots written to `/tmp` are stored with the run's results in your deployment bucket. `retentionDays` (default 31) controls how long the pass/fail run history is kept; the S3 artifacts themselves and the canary's logs are not auto-deleted by AWS.

An `api` test uses `executeHttpStep` so every step gets its own timing and success metrics:

```ts
const synthetics = require('Synthetics');

exports.handler = async () => {
  await synthetics.executeHttpStep('health', {
    hostname: 'api.example.com',
    method: 'GET',
    path: '/health',
    protocol: 'https:'
  });
};
```

## Failure alerts

Stacktape creates a CloudWatch alarm on the test's success rate. One failed run trips it; the next passing run resolves it. Between runs the alarm holds its last real state — a failing test on a sparse schedule stays failing until a run actually passes, and a new test's first passing run does not announce a recovery. With `notificationChannels` configured, both events are delivered like [alarm](/observability/alarms#notification-targets) notifications: inline channels from your account, and `console-channel` references by the Console, which lists them in Sent alerts. Only actual failing runs alarm; a canary that stops running entirely does not page (its state is visible on the Synthetics page).

## See the runs in the Console

Open **Observability → Synthetics** and click a test. The status says whether it is **Passing** or **Failing**, with a
link to its incident. **Runs** lists every run; turn on **Failures only** to find the broken ones. Open a run for its
screenshots, the steps before a failure, and its logs. **About this test** shows the schedule, the region and the
runtime.

## What leaves your AWS account

[What leaves your AWS account](/observability/overview#what-leaves-your-aws-account) compares every feature in one table.

Run results, screenshots and the canary's logs stay in your account. The Console's Synthetics page reads them from your account in your browser, with short-lived credentials, and Stacktape's servers do not store them.

When the test's alarm changes state, the stack sends the Console the alarm event: the test and alarm names, the project, stage and region, the new state and its time, the alarm's description, ARN and condition (comparison, statistic and unit), the stack name, the affected resource, a link to the alarm in the AWS console, and the names of its `console-channel` and `slack-app` channels. Inline channels (Slack, Microsoft Teams, Discord, email and webhooks) are delivered by the stack's service Lambda from your account, so their tokens, webhook URLs and secrets stay there.

## Cost

CloudWatch Synthetics charges per run: $0.0012 in US East (N. Virginia), with the first 100 runs a month in an account
free. Other regions can cost more.
A test on `rate(5 minutes)` runs about 8,900 times in a 31-day month, which is about $10.70 in run charges. Each run
also uses Lambda time, S3 storage for its results and screenshots, and CloudWatch Logs, which depend on the region,
how long the run takes and its memory. A browser test takes longer than an `api` test, so it costs more on top. A
slower schedule costs proportionally less: `rate(15 minutes)` is a third. See
[CloudWatch pricing](https://aws.amazon.com/cloudwatch/pricing/) for your region.

## Limits

- Schedules between `rate(1 minute)` and `rate(1 hour)`, or a six-field `cron(...)` expression. For cron schedules, AWS rejects a timeout longer than the gap between runs.
- Run timeout between 3 and 840 seconds, never above the schedule interval.
- The bundled script must stay under 250 KB, and all of a stack's bundled scripts together under 600 KB — they ship inside the CloudFormation template.
- Environment variable names must start with a letter, use only letters, digits and `_`, and avoid the reserved `AWS_`/Lambda runtime names; all variables together must stay under 4 KB.
- Memory between 960 and 3008 MB (multiples of 64).
- Synthetic tests are skipped in [dev mode](/local-development/dev-mode-overview).
- Renaming a synthetic test replaces its canary, and the run history starts over.
