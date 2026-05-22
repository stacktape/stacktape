# debug:metrics

`stacktape debug:metrics` fetches AWS CloudWatch metrics for supported deployed resources — Lambda functions (`function`), ECS services (`multi-container-workload`), RDS databases (`relational-database`), and HTTP API Gateways (`http-api-gateway`). Use it to check invocation counts, error rates, CPU usage, and latency directly from the terminal without opening the AWS Console.

## Usage

```bash
stacktape debug:metrics --stage prod --region eu-west-1 --resourceName myApi --metric Invocations
```

The command queries CloudWatch for the specified metric and renders a chart in your terminal. You must provide both the resource name (`--resourceName`) and the exact CloudWatch metric name (`--metric`). If you pass a metric that doesn't match the resource type, the command returns an error listing the available metrics for that resource.

### Supported resource types and metrics

The `debug:metrics` command supports four Stacktape resource types. Each type exposes a fixed set of CloudWatch metrics you can query.

| Stacktape resource type | AWS service | Available metrics |
|---|---|---|
| `function` | AWS Lambda | `Invocations`, `Errors`, `Duration`, `Throttles`, `ConcurrentExecutions` |
| `multi-container-workload` | Amazon ECS | `CPUUtilization`, `MemoryUtilization` |
| `relational-database` | Amazon RDS | `CPUUtilization`, `DatabaseConnections`, `FreeStorageSpace`, `ReadLatency`, `WriteLatency` |
| `http-api-gateway` | Amazon API Gateway | `Count`, `4XXError`, `5XXError`, `Latency`, `IntegrationLatency` |

Other resource types (buckets, DynamoDB tables, Redis clusters, etc.) are not supported by this command. Use the AWS CloudWatch Console directly for those.

### Output modes

By default, `debug:metrics` renders an interactive chart in the terminal when a TTY is detected. Two flags change the output behavior:

- **`--agent`** — disables the interactive chart and prints machine-readable metric data for programmatic or LLM consumption. The `--agent` flag implies `--outputFormat jsonl`. The machine-readable payload includes `resource`, `metric`, `period`, `stat`, `unit`, and chronologically sorted `datapoints` with `timestamp` and `value` fields.
- **`--outputFormat`** — controls the format explicitly. Accepted values: `tty` (interactive chart, auto-detected on TTY), `plain` (no colors or animations, used in CI or non-TTY environments), or `jsonl` (machine-readable NDJSON, one JSON object per line).

### Key flags

**`--startTime`** — how far back to query. Accepts relative durations like `1h`, `30m`, `1d`, `60s`, or an absolute date string parseable by JavaScript's `Date` constructor. Defaults to 1 hour ago.

**`--period`** — aggregation period in seconds. Each datapoint in the result covers one period. Defaults to `300` (5 minutes). Use smaller values like `60` for finer granularity over short time ranges.

**`--stat`** — the CloudWatch statistic passed for the metric query. Defaults to `Average`. Common values include `Sum`, `Maximum`, `Minimum`, and percentile statistics such as `p99` where CloudWatch supports them.

## Flags reference


## CLI Options: `stacktape debug:metrics`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `--metric (-met)` | yes | `string` | Metric Name CloudWatch metric name (e.g., Invocations, Errors, CPUUtilization). | - |
| `--region (-r)` | yes | `string` | AWS Region The AWS region for the operation. For a list of available regions, see the [AWS documentation](https://docs.aws.amazon.com/general/latest/gr/rande.html). | `us-east-2`, `us-east-1`, `us-west-1`, `us-west-2`, `ap-east-1`, `ap-south-1`, `ap-northeast-3`, `ap-northeast-2`, `ap-southeast-1`, `ap-southeast-2`, `ap-northeast-1`, `ca-central-1`, `eu-central-1`, `eu-west-1`, `eu-west-2`, `eu-west-3`, `eu-north-1`, `me-south-1`, `sa-east-1`, `af-south-1`, `eu-south-1` |
| `--resourceName (-rn)` | yes | `string` | Resource Name The name of the resource as defined in your Stacktape configuration. | - |
| `--stage (-s)` | yes | `string` | Stage The stage for the operation (e.g., `production`, `staging`, `dev-john`). You can set a default stage using the `defaults:configure` command. The maximum length is 12 characters. | - |
| `--agent (-ag)` | no | `boolean` | Agent Mode Optimizes CLI output for programmatic/LLM consumption:

Uses strict JSONL/NDJSON output (one JSON object per line)
Disables interactive terminal UI
Automatically confirms operations (equivalent to --autoConfirmOperation)
For dev command: also enables HTTP server for programmatic control. | - |
| `--awsAccount (-aa)` | no | `string` | AWS Account The name of the AWS account to use for the operation. The account must first be connected in the [Stacktape console](https://console.stacktape.com/aws-accounts). | - |
| `--help (-h)` | no | `string` | Show Help If provided, the command will not execute and will instead print help information. | - |
| `--logLevel (-ll)` | no | `string` | Log Level The level of logs to print to the console.

`info`: Basic information about the operation.
`error`: Only errors.
`debug`: Detailed information for debugging. | `info`, `debug`, `error` |
| `--outputFormat (-ofmt)` | no | `string` | Output Format Controls the CLI output format:

`jsonl`: Machine-readable NDJSON (one JSON object per line). Disables interactive UI.
`plain`: Simple text output without colors or animations. Used automatically in CI or non-TTY environments.
`tty`: Full interactive terminal UI with colors, spinners, and animations. Used automatically when a TTY is detected.
If not specified, the format is auto-detected from the environment. --agent implies --outputFormat jsonl. | `jsonl`, `plain`, `tty` |
| `--period (-per)` | no | `number` | Metric Period Aggregation period in seconds (default: 300). | - |
| `--profile (-p)` | no | `string` | AWS Profile The AWS profile to use for the command. You can manage profiles using the `aws-profile:*` commands and set a default profile with `defaults:configure`. | - |
| `--projectName (-prj)` | no | `string` | Project Name The name of the Stacktape project for this operation. | - |
| `--startTime (-st)` | no | `number | string` | Start Time The start time from which to print logs. This can be any format accepted by the JavaScript `Date` constructor. | - |
| `--stat (-st)` | no | `string` | Metric Statistic Statistic to retrieve: Sum, Average, Maximum, Minimum, p99 (default: Average). | - |


## Examples

Fetch Lambda error count over the last hour with 1-minute granularity:

```bash
stacktape debug:metrics --stage prod --region eu-west-1 --resourceName myApi --metric Errors --period 60 --stat Sum
```

Check database CPU over the last 24 hours:

```bash
stacktape debug:metrics --stage prod --region eu-west-1 --resourceName mainDatabase --metric CPUUtilization --startTime 1d
```

Get p99 latency for an HTTP API Gateway over the last 6 hours:

```bash
stacktape debug:metrics --stage prod --region eu-west-1 --resourceName gateway --metric Latency --startTime 6h --stat p99
```

Get machine-readable output for programmatic consumption:

```bash
stacktape debug:metrics --stage prod --region eu-west-1 --resourceName myApi --metric Invocations --agent
```

Check ECS memory utilization with a custom aggregation period:

```bash
stacktape debug:metrics --stage prod --region eu-west-1 --resourceName backend --metric MemoryUtilization --period 60 --startTime 2h
```

Use an absolute start time instead of a relative duration:

```bash
stacktape debug:metrics --stage prod --region eu-west-1 --resourceName myApi --metric Duration --startTime "2025-01-15T08:00:00Z"
```

## Related commands

- [`debug:logs`](/cli/debug-logs) — fetch and filter log events from a deployed resource
- [`debug:alarms`](/cli/debug-alarms) — view CloudWatch alarm states for stack resources
- [`info:stack`](/cli/info-stack) — display stack outputs, endpoints, and resource list

## FAQ

### What resource types does debug:metrics support?

The `debug:metrics` command supports four Stacktape resource types: `function` (Lambda), `multi-container-workload` (ECS), `relational-database` (RDS), and `http-api-gateway` (API Gateway). If you pass a resource of a different type, the command returns an error listing the supported types.

### Can I query custom CloudWatch metrics?

No. The command only supports the predefined metrics listed in the [supported metrics table](#supported-resource-types-and-metrics) for each resource type. If you need custom metrics or metrics for unsupported resource types, use the AWS CloudWatch Console or the [`debug:aws-sdk`](/cli/debug-aws-sdk) command to call CloudWatch directly.

### What is the default time range and aggregation period?

By default, `debug:metrics` queries the last 1 hour of data with a 300-second (5-minute) aggregation period. This gives you 12 datapoints. Use `--startTime` to extend the range (e.g. `--startTime 1d` for 24 hours) and `--period` to change granularity (e.g. `--period 60` for 1-minute resolution).

### How does relative time parsing work for --startTime?

The `--startTime` flag accepts shorthand relative durations: `h` for hours, `m` for minutes, `d` for days, and `s` for seconds. For example, `1h` means "1 hour ago", `30m` means "30 minutes ago", and `2d` means "2 days ago". You can also pass any string parseable by JavaScript's `Date` constructor for absolute timestamps.

### How do I use debug:metrics with AI coding agents?

Pass the `--agent` flag to disable the interactive chart and get machine-readable JSONL output instead. The output includes the resource name, metric name, period, statistic, unit, and a chronologically sorted array of datapoints. This makes it straightforward for coding assistants and scripts to parse the results.

### What statistics can I use with --stat?

The `--stat` flag sets the CloudWatch statistic for the metric query and defaults to `Average`. Common values include `Sum`, `Maximum`, `Minimum`, and percentile statistics such as `p99`. The value is passed directly to CloudWatch, so any statistic that CloudWatch supports for the given metric is accepted.

### How much does querying CloudWatch metrics cost?

AWS CloudWatch charges per `GetMetricData` API call. The first 1 million API requests per month are included in the AWS Free Tier. Beyond that, pricing is per 1,000 metric data points returned. For typical debugging use — querying one metric a few times a day — the cost is negligible. See the [AWS CloudWatch pricing page](https://aws.amazon.com/cloudwatch/pricing/) for current rates.

### What is the difference between debug:metrics and debug:alarms?

[`debug:metrics`](/cli/debug-metrics) fetches raw metric data (invocation counts, CPU percentages, latency values) and displays them as a chart or JSON. [`debug:alarms`](/cli/debug-alarms) shows the current state of CloudWatch alarms (OK, ALARM, INSUFFICIENT_DATA) configured for your stack. Use `debug:metrics` to investigate trends; use `debug:alarms` to check whether any threshold has been breached.

### Can I view metrics in the Stacktape Console instead of the CLI?

Yes. The Stacktape Console provides a graphical metrics view for deployed resources. The CLI command is most useful for quick checks, scripting, and AI agent integrations where you want metrics data without leaving the terminal. See [Metrics](/observability/metrics) for the full observability overview.
