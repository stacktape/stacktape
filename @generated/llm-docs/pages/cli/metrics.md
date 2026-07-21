# metrics

The `stacktape metrics` command fetches CloudWatch metrics for a deployed resource and displays time-series data as a chart in your terminal. Use it to check invocation counts, error rates, CPU usage, database connections, or API latency without leaving your CLI or opening the AWS Console.

## Usage

```bash
stacktape metrics --stage prod --region eu-west-1 --resourceName myApi --metric Invocations
```

The command sends a CloudWatch `GetMetricData` query with the chosen statistic and period, then renders the returned datapoints as a terminal chart. With `--agent`, the command disables the interactive chart and prints machine-readable metric data containing `resource`, `metric`, `period`, `stat`, `unit`, and `datapoints`.

## Supported resource types and metrics

The `metrics` command supports four resource types. Each type exposes a fixed set of CloudWatch metrics. Passing a resource whose deployed type is not in this list produces an error listing the supported types.

| Resource type | Metrics |
|---|---|
| Lambda function (`function`) | `Invocations`, `Errors`, `Duration`, `Throttles`, `ConcurrentExecutions` |
| Multi-container workload (`multi-container-workload`) | `CPUUtilization`, `MemoryUtilization` |
| Relational database (`relational-database`) | `CPUUtilization`, `DatabaseConnections`, `FreeStorageSpace`, `ReadLatency`, `WriteLatency` |
| HTTP API Gateway (`http-api-gateway`) | `Count`, `4XXError`, `5XXError`, `Latency`, `IntegrationLatency` |

For a supported resource type, passing an invalid `--metric` value returns an error with a remediation line such as `Available metrics: ...` listing the valid metric names. For an unsupported resource type, the error lists the supported resource-type keys instead.

## Important flags

**`--metric`** (required) — the CloudWatch metric name to fetch. Must match one of the supported metrics for the target resource type (see table above). Examples: `Invocations`, `CPUUtilization`, `DatabaseConnections`.

**`--resourceName`** (required) — the name of the resource as defined in your Stacktape configuration. The command looks up the resource in the deployed stack to determine its type and the correct CloudWatch dimension.

**`--period`** — aggregation period in seconds. Defaults to `300` (5 minutes). Use shorter periods like `60` for higher-resolution data during active debugging, or longer periods like `3600` for broader trends.

**`--stat`** — the statistic to compute for each period. Defaults to `Average`. Supported values include `Sum`, `Average`, `Maximum`, `Minimum`, and percentiles like `p99`. Use `Sum` for count-based metrics like `Invocations` or `Errors`, `Average` or `Maximum` for utilization metrics, and `p99` for latency tail analysis.

**`--startTime`** — how far back to look. Accepts relative shorthand (`1h`, `30m`, `1d`, `30s`) or any value the JavaScript `Date` constructor accepts (e.g. `2025-01-15T10:00:00Z`). Defaults to 1 hour ago.

## Examples

Check the invocation count for a Lambda function over the last hour, aggregated in 5-minute windows.

```bash
stacktape metrics --stage prod --region eu-west-1 --resourceName myApi --metric Invocations --stat Sum
```

Check error count for the last 24 hours with 1-hour aggregation.

```bash
stacktape metrics --stage prod --region eu-west-1 --resourceName myApi --metric Errors --stat Sum --startTime 1d --period 3600
```

Check CPU utilization for a multi-container workload.

```bash
stacktape metrics --stage prod --region eu-west-1 --resourceName myBackend --metric CPUUtilization --stat Average
```

Check tail latency (p99) for an HTTP API Gateway over the last 30 minutes.

```bash
stacktape metrics --stage prod --region eu-west-1 --resourceName myGateway --metric Latency --stat p99 --startTime 30m
```

Check database connections on a relational database.

```bash
stacktape metrics --stage prod --region eu-west-1 --resourceName mainDatabase --metric DatabaseConnections --stat Maximum --startTime 6h
```

Get machine-readable output for use in scripts or AI agents.

```bash
stacktape metrics --stage prod --region eu-west-1 --resourceName myApi --metric Duration --agent
```


> **Info:** With `--agent`, the command prints metric data containing `resource`, `metric`, `period`, `stat`, `unit`, and an array of `datapoints` (each with `timestamp` and `value`). This is useful for piping into monitoring scripts or feeding to AI coding assistants.


## Flags reference


## CLI Options: `stacktape metrics`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `--metric (-met)` | yes | `string` | Metric Name CloudWatch metric name (e.g., Invocations, Errors, CPUUtilization). | - |
| `--region (-r)` | yes | `string` | AWS Region The AWS region for the operation. For a list of available regions, see the [AWS documentation](https://docs.aws.amazon.com/general/latest/gr/rande.html). | `us-east-2`, `us-east-1`, `us-west-1`, `us-west-2`, `ap-east-1`, `ap-south-1`, `ap-northeast-3`, `ap-northeast-2`, `ap-southeast-1`, `ap-southeast-2`, `ap-northeast-1`, `ca-central-1`, `eu-central-1`, `eu-west-1`, `eu-west-2`, `eu-west-3`, `eu-north-1`, `me-south-1`, `sa-east-1`, `af-south-1`, `eu-south-1` |
| `--resourceName (-rn)` | yes | `string` | Resource Name The name of the resource as defined in your Stacktape configuration. | - |
| `--stage (-s)` | yes | `string` | Stage The stage for the operation (e.g., `production`, `staging`, `dev-john`). You can set a default stage using the `defaults:configure` command. The maximum length is 12 characters. | - |
| `--agent (-ag)` | no | `boolean` | Agent Mode Optimizes CLI output for programmatic/LLM consumption: Uses strict JSONL/NDJSON output (one JSON object per line) Disables interactive terminal UI Automatically confirms operations (equivalent to --autoConfirmOperation) For dev command: also enables HTTP server for programmatic control. | - |
| `--awsAccount (-aa)` | no | `string` | AWS Account The name of the AWS account to use for the operation. The account must first be connected in the [Stacktape console](https://console.stacktape.com/aws-accounts). | - |
| `--help (-h)` | no | `string` | Show Help If provided, the command will not execute and will instead print help information. | - |
| `--logLevel (-ll)` | no | `string` | Log Level The level of logs to print to the console. `info`: Basic information about the operation. `error`: Only errors. `debug`: Detailed information for debugging. | `info`, `debug`, `error` |
| `--outputFormat (-ofmt)` | no | `string` | Output Format Controls the CLI output format: `jsonl`: Machine-readable NDJSON (one JSON object per line). Disables interactive UI. `plain`: Simple text output without colors or animations. Used automatically in CI or non-TTY environments. `tty`: Full interactive terminal UI with colors, spinners, and animations. Used automatically when a TTY is detected. If not specified, the format is auto-detected from the environment. --agent implies --outputFormat jsonl. | `jsonl`, `plain`, `tty` |
| `--period (-per)` | no | `number` | Metric Period Aggregation period in seconds (default: 300). | - |
| `--profile (-p)` | no | `string` | AWS Profile The AWS profile to use for the command. You can manage profiles using the `aws-profile:*` commands and set a default profile with `defaults:configure`. | - |
| `--projectName (-prj)` | no | `string` | Project Name The name of the Stacktape project for this operation. | - |
| `--startTime (-st)` | no | `number \| string` | Start Time The start time from which to print logs. This can be any format accepted by the JavaScript `Date` constructor. | - |
| `--stat (-st)` | no | `string` | Metric Statistic Statistic to retrieve: Sum, Average, Maximum, Minimum, p99 (default: Average). | - |


## Related commands

- [`stacktape logs`](/cli/logs) — fetch and filter log events from a deployed resource.
- [`stacktape alarms`](/cli/alarms) — view CloudWatch alarm states for stack resources.
- [`stacktape container:exec`](/cli/container-exec) — run a command inside a deployed container to inspect runtime state.

## FAQ

### What resource types support metrics?

The `stacktape metrics` command supports four deployed resource types: `function` (Lambda functions), `multi-container-workload`, `relational-database`, and `http-api-gateway`. If you pass a resource whose deployed type is not one of these, the command returns an error listing the supported type keys. Other Stacktape resource types such as [web services](/resources/compute/web-service), [private services](/resources/compute/private-service), and [worker services](/resources/compute/worker-service) are not currently listed in the command's metric configuration.

### What is the default time range and aggregation period?

By default, the command fetches the last 1 hour of data with a 300-second (5-minute) aggregation period. Use `--startTime` to look further back (e.g. `--startTime 1d` for 24 hours) and `--period` to change the granularity. Shorter periods give more data points but may return empty values for low-traffic resources.

### Which `--stat` should I use for a given metric?

The default is `Average`, but that is wrong for counts: use `--stat Sum` for count-based metrics like `Invocations`, `Errors`, and `Throttles`, otherwise totals get averaged into misleading per-period values. Keep `Average` (or `Maximum`) for utilization metrics like `CPUUtilization` and `MemoryUtilization`, and use `p99` for latency tail analysis on `Duration` or `Latency`.

### Can I fetch metrics for resources in a private VPC?

Yes. The `metrics` command queries AWS CloudWatch directly — it does not connect to the resource itself. No [bastion tunnel](/cli/bastion-tunnel) is needed for metric queries, regardless of VPC configuration.

### How do I see all available metrics for my resource?

For a supported resource type, pass an invalid `--metric` value and the error remediation includes a line listing the valid metrics (e.g. `Available metrics: Invocations, Errors, Duration, Throttles, ConcurrentExecutions`). For an unsupported resource type, the error lists the supported resource-type keys instead.

### When should I use metrics vs logs?

Use `stacktape metrics` to check aggregate trends — invocation counts, error rates, CPU utilization, latency percentiles. Use [`stacktape logs`](/cli/logs) to inspect individual request details, error stack traces, and application output. Metrics tell you *something is wrong*; logs tell you *what went wrong*.
