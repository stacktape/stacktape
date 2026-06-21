# Alarms

Stacktape alarms monitor CloudWatch metrics for your deployed resources and fire when a threshold is breached. You define alarms inline on individual resources in your config, or create organization-wide alarm rules in the [Stacktape Console](/stacktape-console/console-overview). When an alarm fires, it sends notifications to configured [alert channels](/observability/alert-channels) — Slack, MS Teams, email, Discord, or webhooks.

## When to use

Set up alarms when you need automated alerting on resource health — error rates, latency, CPU usage, storage pressure, or queue depth. Alarms are the primary way to get notified before a problem becomes an outage.

Common starting points:

- **Lambda error rate** — catch deployment regressions or upstream failures within minutes.
- **Database CPU and free storage** — prevent saturation before it causes connection timeouts.
- **API error rate** — detect HTTP 5xx spikes across your API gateway or load balancer.
- **SQS queue depth** — spot consumer backlog before messages start expiring.

For production stages, define at least one error-rate alarm per public-facing resource and one storage/CPU alarm per database. Use [global alarm rules](#global-alarm-rules) in the Console to enforce this across all projects without touching individual configs.

## When NOT to use

Alarms are not the right tool for every monitoring need:

- **Debugging a specific request** — use [logs](/observability/logs) and the [`stacktape debug:logs`](/cli/debug-logs) CLI command instead.
- **Trend analysis over weeks** — use [metrics](/observability/metrics) dashboards in the Console for visual exploration.
- **Tracking application-level errors** — [issues](/observability/issues) automatically group and deduplicate runtime errors from your code. Alarms operate on aggregate CloudWatch metrics, not individual error instances.
- **Cost alerting** — use [budgets](/managing-costs/budgets) to get notified when spend crosses a threshold.

## Supported resources

Stacktape supports inline alarms on five resource types. Each resource accepts a specific set of trigger types:

| Resource | Config property | Accepted alarm triggers |
|---|---|---|
| [Lambda function](/resources/compute/lambda-function) | `alarms` | `lambda-error-rate`, `lambda-duration` |
| [Relational database](/resources/databases/relational-database) | `alarms` | `database-cpu-utilization`, `database-connection-count`, `database-read-latency`, `database-write-latency`, `database-free-storage`, `database-free-memory` |
| [HTTP API Gateway](/resources/networking/http-api-gateway) | `alarms` | `http-api-gateway-error-rate`, `http-api-gateway-latency` |
| [Application Load Balancer](/resources/networking/application-load-balancer) | `alarms` | `application-load-balancer-error-rate`, `application-load-balancer-unhealthy-targets`, `application-load-balancer-custom` |
| [SQS queue](/resources/messaging/sqs-queue) | `alarms` | `sqs-queue-received-messages-count`, `sqs-queue-not-empty` |

Global alarm rules target these five resource types.

## Trigger types

### Lambda function triggers

| Trigger type | Threshold property | Unit | Default statistic | Default comparison |
|---|---|---|---|---|
| `lambda-error-rate` | `thresholdPercent` | % | n/a | `GreaterThanThreshold` |
| `lambda-duration` | `thresholdMilliseconds` | ms | `avg` | `GreaterThanThreshold` |

### Relational database triggers

| Trigger type | Threshold property | Unit | Default statistic | Default comparison |
|---|---|---|---|---|
| `database-cpu-utilization` | `thresholdPercent` | % | `avg` | `GreaterThanThreshold` |
| `database-connection-count` | `thresholdCount` | count | `avg` | `GreaterThanThreshold` |
| `database-read-latency` | `thresholdSeconds` | s | `avg` | `GreaterThanThreshold` |
| `database-write-latency` | `thresholdSeconds` | s | `avg` | `GreaterThanThreshold` |
| `database-free-storage` | `thresholdMB` | MB | `min` | `LessThanThreshold` |
| `database-free-memory` | `thresholdMB` | MB | `avg` | `LessThanThreshold` |


> **Info:** For threshold-based triggers that expose `comparisonOperator`, the default is `GreaterThanThreshold`, except `database-free-storage` and `database-free-memory`, which default to `LessThanThreshold` — the alarm fires when the metric drops *below* the threshold.


### HTTP API Gateway triggers

| Trigger type | Threshold property | Unit | Default statistic | Default comparison |
|---|---|---|---|---|
| `http-api-gateway-error-rate` | `thresholdPercent` | % | n/a | `GreaterThanThreshold` |
| `http-api-gateway-latency` | `thresholdMilliseconds` | ms | `avg` | `GreaterThanThreshold` |

### Application Load Balancer triggers

| Trigger type | Threshold property | Unit | Default statistic | Default comparison |
|---|---|---|---|---|
| `application-load-balancer-error-rate` | `thresholdPercent` | % | n/a | `GreaterThanThreshold` |
| `application-load-balancer-unhealthy-targets` | `thresholdPercent` | % | n/a | `GreaterThanThreshold` |
| `application-load-balancer-custom` | `threshold` (+ `metric`) | varies | `avg` | `GreaterThanThreshold` |

The `application-load-balancer-custom` trigger lets you alarm on additional ALB CloudWatch metrics beyond the built-in error-rate and unhealthy-targets triggers. See the API reference for supported properties.

The `application-load-balancer-unhealthy-targets` trigger also accepts an optional `onlyIncludeTargets` array to scope monitoring to specific container services behind the load balancer.

### SQS queue triggers

| Trigger type | Threshold property | Unit | Default statistic | Default comparison |
|---|---|---|---|---|
| `sqs-queue-received-messages-count` | `thresholdCount` | count | `avg` | `GreaterThanThreshold` |
| `sqs-queue-not-empty` | *(none)* | — | — | — |

The `sqs-queue-not-empty` trigger has no configurable threshold — it fires whenever the queue has any unprocessed messages (visible, in-flight, messages received, or messages sent).

### Customizing comparison and statistic

Most triggers accept two optional overrides:

- **`comparisonOperator`** — how the metric is compared to the threshold. Options: `GreaterThanThreshold`, `GreaterThanOrEqualToThreshold`, `LessThanThreshold`, `LessThanOrEqualToThreshold`. The default varies by trigger type (see tables above).
- **`statistic`** — how metric values within each evaluation period are aggregated. Options: `avg`, `min`, `max`, `sum`, `p90`, `p95`, `p99`. Available on triggers that aggregate over time (duration, latency, counts, utilization, storage, memory). Error-rate triggers compute the ratio directly and don't expose a statistic override.

## Defining alarms on resources

Stacktape alarms are defined inline on individual resources using the `alarms` property. Each alarm specifies a `trigger` (what to monitor and the threshold) and optionally an `evaluation` window and `notificationTargets`.

### Lambda function alarms

A [Lambda function](/resources/compute/lambda-function) accepts `lambda-error-rate` and `lambda-duration` triggers. The following example fires when more than 5% of invocations fail:


Example (TypeScript):

```typescript
import { defineConfig, LambdaFunction, StacktapeLambdaBuildpackPackaging } from 'stacktape';
export default defineConfig(() => {
  const api = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/api.ts'
    }),
    alarms: [
      {
        trigger: {
          type: 'lambda-error-rate',
          properties: {
            thresholdPercent: 5
          }
        }
      }
    ]
  });

  return { resources: { api } };
});
```


### Database alarms

A [relational database](/resources/databases/relational-database) supports six trigger types covering CPU, storage, memory, connections, and I/O latency. The following example combines a CPU alarm with a free-storage alarm and tunes the evaluation window to avoid firing on brief spikes:


Example (TypeScript):

```typescript
import { defineConfig, RelationalDatabase, RdsEnginePostgres } from 'stacktape';
export default defineConfig(() => {
  const mainDb = new RelationalDatabase({
    credentials: {
      masterUserPassword: '$Secret(db-password)'
    },
    engine: new RdsEnginePostgres({
      version: '16.6',
      primaryInstance: { instanceSize: 'db.t4g.micro' }
    }),
    alarms: [
      {
        trigger: {
          type: 'database-cpu-utilization',
          properties: { thresholdPercent: 80 }
        },
        evaluation: {
          period: 300,
          evaluationPeriods: 3,
          breachedPeriods: 2
        }
      },
      {
        trigger: {
          type: 'database-free-storage',
          properties: { thresholdMB: 1000 }
        }
      }
    ]
  });

  return { resources: { mainDb } };
});
```


In this example, the CPU alarm evaluates three 5-minute periods and only fires if at least two of them breach 80%. The free-storage alarm uses the defaults (one 60-second period, fires after a single breached period) — appropriate for storage pressure that you want to catch right away.

### Multiple alarms with notifications

This example shows a Lambda function with two alarms, each sending notifications to a Slack channel when triggered:


Example (TypeScript):

```typescript
import { defineConfig, LambdaFunction, StacktapeLambdaBuildpackPackaging } from 'stacktape';
export default defineConfig(() => {
  const api = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/api.ts'
    }),
    alarms: [
      {
        trigger: {
          type: 'lambda-error-rate',
          properties: { thresholdPercent: 5 }
        },
        description: 'API error rate exceeds 5%',
        evaluation: {
          period: 60,
          evaluationPeriods: 3,
          breachedPeriods: 2
        },
        notificationTargets: [
          {
            type: 'slack',
            properties: {
              conversationId: 'C01234ABCDE',
              accessToken: '$Secret(slack-bot-token)'
            }
          }
        ]
      },
      {
        trigger: {
          type: 'lambda-duration',
          properties: {
            thresholdMilliseconds: 5000,
            statistic: 'p95'
          }
        },
        description: 'P95 duration exceeds 5s'
      }
    ]
  });

  return { resources: { api } };
});
```


The `description` property adds context to notification messages. The `statistic: 'p95'` override on the duration alarm fires only when the 95th percentile exceeds the threshold, filtering out occasional slow invocations.

## Evaluation windows

Stacktape alarm evaluation windows control how CloudWatch evaluates the metric before firing the alarm. The `evaluation` property prevents short-lived spikes from triggering false alerts while still catching sustained problems.

Three settings control the evaluation:

| Property | Default | Description |
|---|---|---|
| `period` | `60` | Duration of one evaluation window in seconds. Must be a multiple of 60. |
| `evaluationPeriods` | `1` | How many recent periods to look at. |
| `breachedPeriods` | `1` | How many of those periods must breach the threshold to fire. Must be ≤ `evaluationPeriods`. |

**How it works:** At the end of each `period`, CloudWatch checks whether the metric breached the threshold during that period. If `breachedPeriods` out of the last `evaluationPeriods` periods are in breach, the alarm fires.

**Example:** With `period: 300`, `evaluationPeriods: 5`, `breachedPeriods: 3`, CloudWatch looks at the last 25 minutes (5 × 300s). If the threshold was breached in at least 3 of those 5 periods, the alarm fires. This pattern catches sustained issues while ignoring isolated spikes.


> **Tip:** For production error-rate alarms, start with `evaluationPeriods: 3` and `breachedPeriods: 2` at a 60-second period. This gives you a 3-minute detection window that filters out single-period noise while still alerting within minutes.

For database storage alarms, the defaults (`period: 60`, `evaluationPeriods: 1`, `breachedPeriods: 1`) are usually appropriate — you want to know immediately when storage is running low.


## Notification targets

Stacktape alarms can send notifications to one or more targets when they fire. Configure the `notificationTargets` array on each alarm to specify where alerts are delivered. Supported target types include MS Teams, Slack, email, Discord, and webhooks.

For the full setup guide on each integration type, see [alert channels](/observability/alert-channels).

### Alarm description

Use the optional `description` property on an alarm to include a custom message in notification messages and the AWS console. This is helpful when you have multiple alarms on the same resource — the description makes it clear what the alarm means without looking up the config.

### History tracking

The `includeInHistory` property controls whether alarm state changes should appear in monitoring history. It defaults to `true`. Set it to `false` on noisy development-stage alarms that would clutter the history view.

## Global alarm rules

Stacktape global alarm rules are organization-level alarm rules managed in the Stacktape Console, with optional project and stage filters. When filters are empty, the Console labels the scope as "All projects" or "All stages".


> Screenshot: Stacktape Console alarm rules page showing a table of alarm rules with columns for name, creation date, targeted projects, targeted stages, and trigger type Caption: The alarm rules page in the Console lets you create, view, and delete organization-wide alarms.


Global alarm rules target resource types from the `StpAlarmEnabledResource` set: Lambda functions, relational databases, HTTP API Gateways, Application Load Balancers, and SQS queues. Each rule specifies a trigger type and optional project/stage scope. Most trigger types also require threshold properties; the `sqs-queue-not-empty` trigger has no configurable threshold.

### Scoping rules to projects and stages

Each global alarm rule can be scoped to specific projects (via `forServices`) and stages (via `forStages`). When omitted, the rule applies to all projects and all stages in the organization.

Common scoping patterns:

- **Production only** — set `forStages` to `["production"]` to avoid alert noise from dev/staging stages.
- **Specific project** — set `forServices` to `["payment-api"]` for project-specific thresholds.
- **Everything** — leave both filters empty to create a baseline alarm for all deployments.

### How global and inline alarms interact

Inline alarms are defined per-resource in your config. Global alarm rules are scoped to matching projects (via `forServices`) and stages (via `forStages`), applying to resources within those filters. You can exclude specific global alarm rules from a resource using `disabledGlobalAlarms`.

### Disabling global alarms on specific resources

If a global alarm rule doesn't make sense for a particular resource, use `disabledGlobalAlarms` to opt out by alarm name. This property is available on alarm-enabled resource types ([Lambda functions](/resources/compute/lambda-function), [relational databases](/resources/databases/relational-database), [HTTP API Gateways](/resources/networking/http-api-gateway), [Application Load Balancers](/resources/networking/application-load-balancer), and [SQS queues](/resources/messaging/sqs-queue)) and accepts an array of global alarm names to exclude from the resource.

This is useful when a resource has unusual characteristics — for example, a scheduled Lambda that runs long by design and would constantly trip a duration alarm:


Example (TypeScript):

```typescript
import { defineConfig, LambdaFunction, StacktapeLambdaBuildpackPackaging } from 'stacktape';
export default defineConfig(() => {
  const dailyReport = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/daily-report.ts'
    }),
    timeout: 300,
    disabledGlobalAlarms: ['lambda-duration-high']
  });

  return { resources: { dailyReport } };
});
```


The `disabledGlobalAlarms` array takes the alarm names as configured in the Console.

## Viewing alarm states

### CLI

Use [`stacktape debug:alarms`](/cli/debug-alarms) to inspect alarms from the CLI. See the [CLI reference](/cli/debug-alarms) for flags and output details.

```bash
stacktape debug:alarms --stage production --region eu-west-1
```


> **Info:** `INSUFFICIENT_DATA` typically means the resource hasn't produced enough metric data yet — common right after deployment or for resources with low traffic. It does not indicate a configuration error.


### Console

The Console alarm rules page lists alarm rules by name, created date, targeted projects, targeted stages, and trigger type. The details modal shows alert-channel summary, trigger properties, and evaluation settings. The table includes delete controls for each rule. For real-time alarm state of a specific stage's resources, use the [`stacktape debug:alarms`](/cli/debug-alarms) CLI command.

## Alarms as event triggers

Stacktape alarm state changes can be used as event sources for [Lambda functions](/resources/compute/lambda-function), enabling automated remediation workflows. See [alarms as triggers](/configuration/triggers/alarms-as-triggers) for configuration details.

## API reference


## API Reference: `AlarmDefinition`

Source: `types/stacktape-config/alarms.d.ts`

```typescript
interface AlarmDefinition extends AlarmDefinitionBase {
  /**
   * #### A unique name for this alarm (e.g., `api-error-rate`, `db-cpu-high`).
   */
  name: string;
  /**
   * #### The metric and threshold that fires this alarm.
   *
   * ---
   *
   * `type` selects what to monitor (error rate, CPU, latency, etc.) and `properties` set the threshold.
   */
  trigger: AlarmTrigger;
  /**
   * #### Only activate this alarm for these services. If omitted, applies to all services.
   */
  forServices?: string[];
  /**
   * #### Only activate this alarm for these stages (e.g., `production`). If omitted, applies to all stages.
   */
  forStages?: string[];
}
```


## FAQ

### Which resources support inline alarms?

Stacktape supports inline alarms on [Lambda functions](/resources/compute/lambda-function), [relational databases](/resources/databases/relational-database), [HTTP API Gateways](/resources/networking/http-api-gateway), [Application Load Balancers](/resources/networking/application-load-balancer), and [SQS queues](/resources/messaging/sqs-queue). Global alarm rules target these same five resource types.

### How much do CloudWatch alarms cost?

AWS CloudWatch charges per alarm-metric per month. Stacktape alarms use standard resolution (periods must be multiples of 60 seconds). For most stacks, alarm costs are a small fraction of overall compute and database spend. See [managing costs](/managing-costs/overview) for broader cost guidance.

### Can I set different alarm thresholds for production vs development?

Yes. Global alarm rules in the Console can be scoped to specific stages using `forStages`. Create a strict rule targeting `["production"]` with a low error threshold, and a relaxed rule (or no rule) for development stages. Alternatively, use [stage-based configuration](/configuration/stages-and-environments) in your TypeScript config to conditionally set different alarm thresholds per stage.

### What happens when an alarm fires?

When the threshold is breached for the required number of evaluation periods, the alarm transitions to `ALARM` state. Notifications are sent to all configured `notificationTargets` (Slack, email, Discord, MS Teams, webhook). The `includeInHistory` property defaults to `true` and controls whether alarm state changes appear in monitoring history.

### How do I avoid false alarms from short traffic spikes?

Tune the `evaluation` property. Increase `evaluationPeriods` (how many periods to look at) and set `breachedPeriods` to require multiple periods in breach before firing. For example, `evaluationPeriods: 5` with `breachedPeriods: 3` means the threshold must be breached in at least 3 of the last 5 periods. Increasing `period` from 60 to 300 seconds also smooths out short spikes by aggregating metric data over a wider window.

### What is the difference between inline alarms and global alarm rules?

Inline alarms are defined in your `stacktape.ts` config on individual resources and deploy as part of that stack. Global alarm rules are created in the Console at the organization level and scoped to matching projects and stages via `forServices` and `forStages` filters. Both produce CloudWatch alarms and use the same notification target configuration. Individual resources can opt out of specific global rules using `disabledGlobalAlarms`.

### Can I alarm on custom CloudWatch metrics from my application?

The `application-load-balancer-custom` trigger type lets you alarm on any supported ALB CloudWatch metric by specifying the metric name and a threshold. For other resource types, Stacktape provides a fixed set of trigger types covering the most critical metrics. Custom application-level metrics emitted via the CloudWatch SDK are not directly supported as alarm triggers in the Stacktape config.

### How do I test that my alarms work?

Deploy a stage with alarms configured and use [`stacktape debug:alarms`](/cli/debug-alarms) to verify the alarms were created. To trigger a test alarm, temporarily set a threshold that your current traffic would breach (e.g. `thresholdPercent: 0` on an error-rate alarm) and wait for the evaluation period to elapse. Check your notification target (Slack, email, etc.) for the alert, then restore the real threshold.

### When should I use alarms vs issues?

[Alarms](/observability/alarms) monitor aggregate CloudWatch metrics (error rates, CPU, latency) and fire based on thresholds you define. [Issues](/observability/issues) automatically detect, group, and deduplicate individual runtime errors from your application code. Use alarms for infrastructure-level health monitoring and issues for application-level error tracking. Most production stacks benefit from both — alarms catch broad degradation while issues catch specific bugs.

### What does the `application-load-balancer-custom` trigger support?

The `application-load-balancer-custom` trigger lets you alarm on additional ALB CloudWatch metrics beyond the built-in error-rate and unhealthy-targets triggers. See the [API reference](#api-reference) for supported properties, and refer to the [AWS ALB CloudWatch metrics documentation](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-cloudwatch-metrics.html) for metric descriptions.
