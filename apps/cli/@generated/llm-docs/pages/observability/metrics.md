# Metrics

Stacktape surfaces AWS CloudWatch metrics through the Stacktape Console and the [`stacktape metrics`](/cli/metrics) CLI command. The Console metrics grid can render charts for nine metric types — Lambda, ECS, RDS, API Gateway, DynamoDB, S3, CloudFront, Cognito, and Redis — when those metric entries are present for the stage. The CLI provides targeted metric queries for four resource types directly in your terminal. No instrumentation or SDK setup is required.

## Console metrics dashboard

The Stacktape Console metrics grid can render chart components for nine metric types: Lambda, ECS (container workloads), RDS (relational databases), API Gateway, DynamoDB, S3, Cognito (user auth pools), Redis, and CloudFront, when those metric entries are present for the stage. Changing the selected time range preset recalculates each chart's start time, end time, and aggregation period.

### Time range presets

The Console metrics toolbar provides selectable time range presets. The default preset is **7d**. Each preset determines the chart time window and the aggregation period used for datapoints.

### Filtering by resource

The Console metrics component can be rendered with a `showOnlyForResource` prop. When a parent view passes this prop, the grid renders only charts matching the selected resource name — for example, when viewing metrics from a specific resource's detail page.

## CLI: stacktape metrics

The [`stacktape metrics`](/cli/metrics) command fetches a single CloudWatch metric for a specific resource and renders it as a sparkline chart in your terminal. Use it for quick spot-checks without leaving your editor.

### Basic usage

The command validates that `--resourceName` (the resource name from your Stacktape config) and `--metric` (the CloudWatch metric name) are provided. The command runs against the target stack identified by `--stage` and `--region`.

```bash
stacktape metrics --stage prod --region eu-west-1 --resourceName api --metric Invocations
```

If the specified metric is not valid for the resource type, Stacktape raises an error whose guidance lists the available metrics.

### Supported resource types

The CLI currently supports four resource types. Each resource type has a fixed set of valid `--metric` values:

| Resource type | Deployed `resourceType` | Available `--metric` values |
|--------------|-------------|----------------------------|
| [Lambda function](/resources/compute/lambda-function) | `function` | `Invocations`, `Errors`, `Duration`, `Throttles`, `ConcurrentExecutions` |
| [Multi-container workload](/resources/compute/multi-container-workload) | `multi-container-workload` | `CPUUtilization`, `MemoryUtilization` |
| [Relational database](/resources/databases/relational-database) | `relational-database` | `CPUUtilization`, `DatabaseConnections`, `FreeStorageSpace`, `ReadLatency`, `WriteLatency` |
| [HTTP API Gateway](/resources/networking/http-api-gateway) | `http-api-gateway` | `Count`, `4XXError`, `5XXError`, `Latency`, `IntegrationLatency` |

The CLI resolves metrics based on the deployed resource's `resourceType`. Resources whose deployed `resourceType` is `multi-container-workload` use the ECS metrics listed above. For DynamoDB, S3, CloudFront, Cognito, and Redis metrics, use the Console dashboard; the `metrics` CLI does not support those resource types.

### Time range

By default, the CLI fetches the last 1 hour of data. Use `--startTime` to set the start of the time window and `--endTime` to set the end.

`--startTime` accepts either a relative duration or an absolute ISO 8601 timestamp. Relative durations use a number followed by a unit: `s` (seconds), `m` (minutes), `h` (hours), or `d` (days).

Fetch the last 30 minutes of CPU data for an ECS workload:

```bash
stacktape metrics --stage prod --region eu-west-1 --resourceName backend --metric CPUUtilization --startTime 30m
```

Fetch metrics from a specific absolute time window:

```bash
stacktape metrics --stage prod --region eu-west-1 --resourceName api --metric Errors --startTime "2025-05-16T08:00:00Z" --endTime "2025-05-16T12:00:00Z"
```

When `--endTime` is omitted, the command uses the current time.

### Aggregation and statistics

The `--period` flag controls the aggregation window in seconds. The default is **300** (5 minutes). Smaller periods produce more datapoints but require the data to exist at that granularity in CloudWatch.

The `--stat` flag selects the CloudWatch statistic and defaults to **Average**. The value is passed directly to the CloudWatch API, so any valid CloudWatch statistic string works — common choices include `Sum`, `Average`, `Maximum`, `Minimum`, and percentiles like `p99`.

Fetch maximum Lambda duration with 60-second granularity over the last hour:

```bash
stacktape metrics --stage prod --region eu-west-1 --resourceName api --metric Duration --stat Maximum --period 60 --startTime 1h
```


> **Tip:** Use `Sum` for count-based metrics (Invocations, Errors, Throttles) and `Average` or `Maximum` for utilization and latency metrics. `p99` is useful for latency when you care about tail performance rather than averages.


### Output formats

Outside agent mode, the command renders the metric as a terminal chart. When agent mode is enabled (via the `--agent` flag), the command writes structured JSON containing `resource`, `metric`, `period`, `stat`, `unit` (populated from the CloudWatch result label), and timestamped `datapoints`.

## Console vs CLI

The Console and CLI serve different workflows. Use the Console for broad monitoring across all supported metric categories in a stage. Use the CLI for targeted, scriptable queries on specific metrics.


## Feature Comparison

| Feature | Console dashboard | CLI metrics |
| --- | --- | --- |
| Interaction | Visual charts | Terminal sparkline or JSON |
| Scope | All supported metric categories at once | One resource, one metric per invocation |
| Resource categories | 9 (Lambda, ECS, RDS, API Gateway, DynamoDB, S3, CloudFront, Cognito, Redis) | 4 (Lambda, ECS, RDS, API Gateway) |
| Time range | Presets (default: 7d) | Custom (relative or absolute start/end) |
| Custom statistic | no | Any CloudWatch statistic (default: Average) |
| Scriptable output | no | JSON in agent mode |
| Best for | Daily monitoring, team visibility | Debugging, CI scripts, quick checks |


## Understanding key metrics

Different resource types expose different CloudWatch metrics. Knowing which metrics to watch — and what the values mean — helps you respond to issues before they affect users.

### Lambda function metrics

[Lambda functions](/resources/compute/lambda-function) expose five metrics through the CLI. `Invocations` and `Errors` tell you how much traffic your function handles and how often it fails. `Duration` tracks execution time in milliseconds — rising duration often signals a performance regression or a slow downstream dependency. `Throttles` counts invocations rejected due to concurrency limits, which indicates you need to request a higher reserved concurrency quota or optimize function duration. `ConcurrentExecutions` shows how many function instances run simultaneously.

Check for throttled invocations over the last 24 hours:

```bash
stacktape metrics --stage prod --region eu-west-1 --resourceName api --metric Throttles --stat Sum --startTime 24h
```

### Container workload metrics

Resources whose deployed `resourceType` is `multi-container-workload` run on AWS ECS and expose `CPUUtilization` and `MemoryUtilization` through the CLI. Both are percentages of the allocated resources. Sustained CPU above 80% suggests the workload needs more CPU or additional containers. Memory hitting 100% causes OOM kills and container restarts — check [logs](/observability/logs) for restart events if you suspect this.

### Database metrics

[Relational databases](/resources/databases/relational-database) expose five metrics through the CLI. `CPUUtilization` tracks database engine CPU usage. `DatabaseConnections` counts active connections — a sudden spike often indicates a connection leak in application code. `FreeStorageSpace` tracks remaining disk in bytes; running out halts writes. `ReadLatency` and `WriteLatency` (in seconds) track I/O performance — sustained increases suggest you need a larger instance class or need to optimize query patterns.

### API Gateway metrics

[HTTP API Gateway](/resources/networking/http-api-gateway) metrics track request volume and error rates at the gateway layer. `Count` is total requests. `5XXError` and `4XXError` count server-side and client-side errors respectively. `Latency` measures end-to-end request time including backend processing, while `IntegrationLatency` measures only the time calling the backend. If `Latency` is much higher than `IntegrationLatency`, compare gateway-level configuration, authorization, mapping, and client/network effects before focusing on backend execution.

## Using metrics with alarms

Metrics become actionable when paired with [alarms](/observability/alarms). An alarm watches a specific CloudWatch metric and triggers when it crosses a threshold — for example, notifying your team when Lambda error count exceeds 10 in a 5-minute window or when database CPU stays above 90% for 15 minutes. Configure [alert channels](/observability/alert-channels) (Slack, email, Discord, Teams, webhook) to receive notifications when alarms fire.

For cost-related metrics and optimization, see [Managing Costs](/managing-costs/overview).

## FAQ

### How much do CloudWatch metrics cost?

AWS CloudWatch includes basic monitoring metrics at no additional charge for most services. Detailed monitoring and custom metrics incur per-metric charges. For cost optimization guidance, see [Managing Costs](/managing-costs/overview).

### Why does the Console support more resource types than the CLI?

The Console metrics grid can render charts for nine metric types — Lambda, ECS, RDS, API Gateway, DynamoDB, S3, CloudFront, Cognito, and Redis — when those metric entries are present for the stage. The CLI [`metrics`](/cli/metrics) command currently supports four (Lambda, ECS, RDS, API Gateway). The Console is the better choice for daily monitoring across all supported metric categories. The CLI is designed for targeted, scriptable queries on the most common compute and database resources.

### What is the difference between Latency and IntegrationLatency for API Gateway?

`Latency` measures the total time from when API Gateway receives a request to when it returns a response. `IntegrationLatency` measures only the time spent calling the backend (your Lambda function or container). The difference is API Gateway overhead — routing, authorization, response mapping. If `Latency` is high but `IntegrationLatency` is low, investigate the gateway configuration. If both are high, focus on optimizing your backend code.

### How far back can I view metrics?

AWS CloudWatch retains metric data at varying resolutions: 1-minute datapoints for 15 days, 5-minute datapoints for 63 days, and 1-hour datapoints for 455 days (approximately 15 months). The Console uses time range presets (default: 7d). The CLI accepts relative durations (e.g. `--startTime 60d`) and absolute ISO 8601 timestamps, so you can query older data — CloudWatch determines which retained datapoints are available for the requested range.

### Can I create custom application metrics?

The `metrics` CLI supports only the predefined AWS service metrics listed in the table above (invocations, CPU, memory, latency, etc.). To publish custom application metrics, use the AWS CloudWatch SDK in your application code to call `PutMetricData`. The Console metrics grid renders the built-in metric entry types present for the stage. See [alarms](/observability/alarms) for alarm configuration details.

### When should I use metrics vs logs for debugging?

Metrics tell you *what* is happening — error rates are up, latency is increasing, memory is growing. [Logs](/observability/logs) tell you *why* — the stack trace, the failing request, the slow query. Start with metrics to identify which resource has a problem and what time window to investigate, then switch to [`stacktape logs`](/cli/logs) for the relevant resource and time window to find the root cause.
