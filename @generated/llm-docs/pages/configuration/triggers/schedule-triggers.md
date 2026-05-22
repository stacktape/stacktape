# Schedule Triggers

A schedule trigger invokes a Stacktape [Lambda function](/resources/compute/lambda-function) on a recurring time-based schedule — cron jobs, periodic data processing, cache warming, report generation, or any task that runs at fixed intervals. Underneath, Stacktape creates an AWS EventBridge rule that fires on your defined schedule and invokes the target function.

## When to use

- **Periodic background work** — database cleanup, report generation, cache invalidation, digest emails, data aggregation.
- **Polling external systems** — check an API, scrape a page, or sync data on a fixed interval.
- **Scheduled health checks** — ping endpoints or third-party services every few minutes.
- **Cost-efficient recurring compute** — a Lambda function triggered on a schedule costs nothing between invocations, unlike an always-on container running a cron daemon.

## When NOT to use

- **Real-time event processing** — if the trigger is an incoming message, file upload, or database change, use [SQS](/configuration/triggers/sqs-events), [S3](/configuration/triggers/s3-events), or [DynamoDB Streams](/configuration/triggers/dynamodb-streams) triggers instead.
- **Sub-minute granularity** — the minimum interval is one minute. For higher-frequency processing, use a stream-based trigger like [Kinesis](/configuration/triggers/kinesis-events) or a long-running container with an internal timer.
- **Complex multi-step orchestration** — if the job involves branching, retries, or parallel steps, consider a [state machine](/resources/orchestration/state-machine) triggered on a schedule via an [EventBridge event bus](/configuration/triggers/event-bus-events).

## Basic example

A schedule trigger is added to a Lambda function's `events` array using `ScheduleIntegration`. The `scheduleRate` property accepts either a rate expression or a cron expression.


Example (TypeScript):

```typescript
import {
  defineConfig,
  LambdaFunction,
  StacktapeLambdaBuildpackPackaging,
  ScheduleIntegration
} from 'stacktape';
export default defineConfig(() => {
  const dailyCleanup = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/cleanup.ts'
    }),
    memory: 512,
    timeout: 300,
    events: [
      new ScheduleIntegration({
        scheduleRate: 'rate(1 day)'
      })
    ]
  });

  return {
    resources: { dailyCleanup }
  };
});
```


The handler at `./src/cleanup.ts` runs once every 24 hours. `ScheduleIntegration` has no batching controls — each schedule rule invokes the target with the configured event payload independently.

[Batch jobs](/resources/compute/batch-job) also support schedule triggers — see the [batch job docs](/resources/compute/batch-job) for details on that configuration.

## Schedule formats

Schedule triggers support two expression formats: **rate** and **cron**. Both use the AWS EventBridge schedule syntax.

### Rate expressions

Rate expressions define a fixed interval. The syntax is `rate(value unit)` where `unit` is `minute`, `minutes`, `hour`, `hours`, `day`, or `days`. Use the singular form when the value is 1.

| Expression | Fires |
|---|---|
| `rate(1 minute)` | Every minute |
| `rate(5 minutes)` | Every 5 minutes |
| `rate(1 hour)` | Every hour |
| `rate(12 hours)` | Every 12 hours |
| `rate(1 day)` | Once per day |
| `rate(7 days)` | Once per week |

Rate expressions are the simplest option. The first invocation happens one interval after the EventBridge rule is created (i.e., after deployment). Use them when you need a fixed interval and don't need to control the exact wall-clock time.

### Cron expressions

Cron expressions give precise control over when the function fires. AWS EventBridge uses a **6-field format** — not the 5-field Unix format. All times are in **UTC**.

```
cron(minutes hours day-of-month month day-of-week year)
```

| Field | Values | Wildcards |
|---|---|---|
| Minutes | 0–59 | `, - * /` |
| Hours | 0–23 | `, - * /` |
| Day of month | 1–31 | `, - * ? / L W` |
| Month | 1–12 or JAN–DEC | `, - * /` |
| Day of week | 1–7 or SUN–SAT | `, - * ? L #` |
| Year | 1970–2199 | `, - * /` |

Use `?` in either the day-of-month or day-of-week field when you want to leave one unspecified. You cannot use `*` in both day fields simultaneously.

| Expression | Fires |
|---|---|
| `cron(0 9 * * ? *)` | Every day at 9:00 AM UTC |
| `cron(0 18 ? * MON-FRI *)` | Weekdays at 6:00 PM UTC |
| `cron(0 0 1 * ? *)` | First day of every month at midnight UTC |
| `cron(0/15 * * * ? *)` | Every 15 minutes |
| `cron(0 12 ? * 2#1 *)` | First Monday of every month at noon UTC |
| `cron(0 */2 * * ? *)` | Every 2 hours |


Example (TypeScript):

```typescript
import {
  defineConfig,
  LambdaFunction,
  StacktapeLambdaBuildpackPackaging,
  ScheduleIntegration
} from 'stacktape';
export default defineConfig(() => {
  const weekdayReport = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/report.ts'
    }),
    timeout: 900,
    events: [
      new ScheduleIntegration({
        scheduleRate: 'cron(0 18 ? * MON-FRI *)'
      })
    ]
  });

  return {
    resources: { weekdayReport }
  };
});
```


This function generates a report every weekday at 6:00 PM UTC. Use cron when the exact time matters — business-hour reporting, nightly batch processing, or monthly billing runs.


> **Tip:** **Rate vs cron:** Use `rate()` for simple intervals where wall-clock time doesn't matter (polling every 5 minutes, syncing every hour). Use `cron()` when you need specific times (3 AM daily cleanup, weekday-only reports, first-of-month billing).


### Invalid expressions

An invalid schedule expression causes the deployment to fail during CloudFormation stack creation. Common mistakes include using the 5-field Unix cron format (AWS requires 6 fields) and using `*` in both the day-of-month and day-of-week fields simultaneously (one must be `?`).

## Multiple schedules

A single Lambda function can have multiple schedule triggers. Each schedule creates an independent EventBridge rule. The function fires separately for each matched schedule.


Example (TypeScript):

```typescript
import {
  defineConfig,
  LambdaFunction,
  StacktapeLambdaBuildpackPackaging,
  ScheduleIntegration
} from 'stacktape';
export default defineConfig(() => {
  const syncJob = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/sync.ts'
    }),
    timeout: 300,
    events: [
      new ScheduleIntegration({
        scheduleRate: 'rate(5 minutes)',
        input: { mode: 'incremental' }
      }),
      new ScheduleIntegration({
        scheduleRate: 'cron(0 3 * * ? *)',
        input: { mode: 'full' }
      })
    ]
  });

  return {
    resources: { syncJob }
  };
});
```


This pattern is useful when the same function handles different modes — an incremental sync every 5 minutes and a full sync at 3:00 AM UTC daily. The `input` property passes a fixed JSON payload so the handler can distinguish which schedule triggered the invocation.

## Event payload customization

If you do not set `input`, `inputPath`, or `inputTransformer`, the schedule integration does not customize the payload — your function receives the standard AWS EventBridge scheduled event. You can customize what the function receives using one of three mutually exclusive options.


> **Warning:** You can only set one of `input`, `inputPath`, or `inputTransformer` per schedule trigger. Specifying more than one causes a deployment error.


### Fixed input

The `input` property replaces the entire event payload with a fixed value. Use this when your handler needs simple, static context — like distinguishing between multiple schedules or passing configuration values.


Example (TypeScript):

```typescript
import {
  defineConfig,
  LambdaFunction,
  StacktapeLambdaBuildpackPackaging,
  ScheduleIntegration
} from 'stacktape';
export default defineConfig(() => {
  const cleanup = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/cleanup.ts'
    }),
    events: [
      new ScheduleIntegration({
        scheduleRate: 'rate(1 hour)',
        input: { task: 'expire-sessions', ttlHours: 24 }
      })
    ]
  });

  return {
    resources: { cleanup }
  };
});
```


The handler receives `{ task: 'expire-sessions', ttlHours: 24 }` as the event — no EventBridge metadata is included. The `input` property accepts any JSON-serializable value that replaces the default event payload.

### Input path

The `inputPath` property uses a JSONPath expression to extract a specific portion of the EventBridge event and pass only that portion to the function. For schedule triggers this is rarely needed because the default event payload is small and predictable. It becomes more useful when reusing the same pattern across event types where the original event is richer — for schedule events, `input` or `inputTransformer` are almost always a better fit.


Example (TypeScript):

```typescript
import {
  defineConfig,
  LambdaFunction,
  StacktapeLambdaBuildpackPackaging,
  ScheduleIntegration
} from 'stacktape';
export default defineConfig(() => {
  const timeLogger = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/time-logger.ts'
    }),
    events: [
      new ScheduleIntegration({
        scheduleRate: 'rate(1 hour)',
        inputPath: '$.time'
      })
    ]
  });

  return {
    resources: { timeLogger }
  };
});
```


In this example, the function receives only the `time` field from the EventBridge event as its payload, rather than the full event object.

### Input transformer

The `inputTransformer` property lets you extract values from the event using `inputPathsMap` and construct a custom payload with `inputTemplate`. This is the most flexible option — use it when you need to reshape the event rather than replace it entirely.


Example (TypeScript):

```typescript
import {
  defineConfig,
  LambdaFunction,
  StacktapeLambdaBuildpackPackaging,
  ScheduleIntegration
} from 'stacktape';
export default defineConfig(() => {
  const processor = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/processor.ts'
    }),
    events: [
      new ScheduleIntegration({
        scheduleRate: 'rate(1 hour)',
        inputTransformer: {
          inputPathsMap: {
            eventTime: '$.time'
          },
          inputTemplate: {
            message: 'Scheduled run at <eventTime>',
            source: 'hourly-processor'
          }
        }
      })
    ]
  });

  return {
    resources: { processor }
  };
});
```


The `inputPathsMap` maps variable names to JSONPath expressions that extract values from the original EventBridge event. The `inputTemplate` defines the shape of the payload your function receives, using `<variableName>` placeholders for the extracted values. This gives you full control over the payload structure while still incorporating dynamic event data like the invocation timestamp.

## Handler example

The Lambda handler receives the event payload — either the default EventBridge scheduled event or your customized input. A typical handler for a schedule-triggered function:

```typescript
import type { ScheduledHandler } from 'aws-lambda';

export const handler: ScheduledHandler = async (event) => {
  console.info('Scheduled invocation', JSON.stringify(event));

  // Perform the periodic task
  const deleted = await deleteExpiredSessions();
  console.info(`Cleaned up ${deleted} expired sessions`);
};
```

When using a fixed `input`, the `event` parameter contains exactly the JSON value you specified. You can use the `ScheduledHandler` type from `aws-lambda` for type-safe handling of the default EventBridge event, or use `any` when passing custom input shapes.

## Monitoring scheduled functions

View logs from schedule-triggered functions using [`stacktape debug:logs`](/cli/debug-logs).

```bash
stacktape debug:logs --stage production --region eu-west-1 --resourceName dailyCleanup
```

You can also inspect deployed resources in the [Stacktape Console](/stacktape-console/console-overview).


> **Tip:** Set up [alarms](/observability/alarms) on your scheduled functions to catch failures early. A scheduled function that fails silently (no errors, but no useful work) is harder to notice than a broken API endpoint.


## API reference


## API Reference: `ScheduleIntegrationProps`
```typescript
import type { EventInputTransformer } from 'stacktape';

type ScheduleIntegrationProps = {
  /** The schedule rate or cron expression. */
  scheduleRate: string;
  /** A fixed JSON object to be passed as the event payload. */
  input?: unknown;
  /** A JSONPath expression to extract a portion of the event to pass to the target. */
  inputPath?: string;
  /** Customizes the event payload sent to the target. */
  inputTransformer?: EventInputTransformer;
};
```

| Property | Required | Type | Description | Default |
| --- | --- | --- | --- | --- |
| `scheduleRate` | yes | `string` | The schedule rate or cron expression. Examples: `rate(2 hours)`, `cron(0 10 * * ? *)` | - |
| `input` | no | `unknown` | A fixed JSON object to be passed as the event payload. If you need to customize the payload based on the event, use `inputTransformer` instead.
You can only use one of `input`, `inputPath`, or `inputTransformer`.

Example:

```yaml
input:
  source: 'my-scheduled-event'
``` | - |
| `inputPath` | no | `string` | A JSONPath expression to extract a portion of the event to pass to the target. This is useful for forwarding only a specific part of the event payload.
You can only use one of `input`, `inputPath`, or `inputTransformer`.

Example:
inputPath: &#39;$.detail&#39; | - |
| `inputTransformer` | no | `EventInputTransformer` | Customizes the event payload sent to the target. This allows you to extract values from the original event and use them to construct a new payload.
You can only use one of `input`, `inputPath`, or `inputTransformer`.

Example:
inputTransformer:
  inputPathsMap:
    eventTime: &#39;$.time&#39;
  inputTemplate:
    message: &#39;This event occurred at <eventTime>.&#39; | - |


## FAQ

### What is the minimum schedule interval?

The minimum interval for a rate expression is `rate(1 minute)`. Cron expressions also support per-minute granularity. There is no sub-minute scheduling — if you need higher frequency, use a stream-based trigger like [Kinesis](/configuration/triggers/kinesis-events) or run a long-lived container with an internal loop.

### Are schedule times in UTC or local time?

All cron expressions use UTC. AWS EventBridge does not support timezone-aware cron expressions. If you need to run at 9:00 AM Eastern, calculate the UTC offset and account for daylight saving time changes — or handle the timezone logic in your function code.

### What happens if my function is still running when the next schedule fires?

AWS Lambda invokes the function independently for each scheduled event. If the previous invocation hasn't finished, a new concurrent invocation starts in parallel. If concurrent execution is a problem (e.g., for a job that must not overlap), set the Lambda function's reserved concurrency to 1 so the second invocation gets throttled, or implement a distributed lock using DynamoDB.

### Does a schedule trigger cost anything when idle?

No. AWS EventBridge schedule rules are free — there is no charge for the rule itself. You pay only for Lambda invocations when the function runs. This makes schedule triggers significantly cheaper than running a container 24/7 with a cron daemon for the same periodic task.

### Can I use a schedule trigger with container workloads?

Schedule triggers (`ScheduleIntegration`) are available on [Lambda functions](/resources/compute/lambda-function) and [batch jobs](/resources/compute/batch-job). Container workloads like [web services](/resources/compute/web-service) or [worker services](/resources/compute/worker-service) do not support schedule triggers directly. To run a container on a schedule, use a batch job with a schedule trigger, or invoke a Lambda function on a schedule that starts the container task programmatically.

### How do I pass different payloads for different schedules on the same function?

Add multiple `ScheduleIntegration` entries to the function's `events` array, each with its own `scheduleRate` and `input` (or `inputTransformer`). The function receives the payload associated with whichever schedule fired. See the [Multiple schedules](#multiple-schedules) section.

### What is the difference between rate and cron expressions?

Rate expressions (`rate(5 minutes)`) define a fixed interval from the moment the EventBridge rule is created. They are simpler but you cannot control the exact wall-clock time. Cron expressions (`cron(0 9 * * ? *)`) fire at specific times and support complex patterns like "weekdays only" or "first Monday of the month." Use rate for simple intervals where timing doesn't matter; use cron when you need precise scheduling.

### What if my schedule expression is invalid?

An invalid schedule expression causes the CloudFormation stack creation to fail during deployment. Common mistakes include using the 5-field Unix cron format (AWS requires 6 fields) and using `*` in both the day-of-month and day-of-week fields simultaneously (one must be `?`).

### How much does a scheduled Lambda function cost on AWS?

AWS Lambda pricing is purely pay-per-use: you pay for the number of invocations and the duration of each invocation (billed per millisecond). A function running once per hour with 512 MB memory and a 2-second runtime costs fractions of a cent per day. EventBridge schedule rules themselves are free. This makes Lambda-based cron jobs dramatically cheaper than running an always-on EC2 instance or ECS container solely for periodic tasks.

### When should I use a schedule trigger vs a Step Functions state machine?

Use a schedule trigger for simple, single-step periodic tasks — cleanup, polling, report generation, health checks. If the job involves branching logic, parallel execution, retries with exponential backoff, or chaining multiple steps together, a [state machine](/resources/orchestration/state-machine) is the better fit. You can trigger a state machine on a schedule using an [EventBridge event bus integration](/configuration/triggers/event-bus-events).
