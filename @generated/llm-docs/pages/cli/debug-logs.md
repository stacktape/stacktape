# debug:logs

`stacktape debug:logs` fetches and analyzes logs from a deployed Stacktape resource. It supports both simple log tailing with filter patterns and advanced analytics via CloudWatch Logs Insights queries. Use it for quick debugging, incident investigation, and scripting log retrieval in CI/CD pipelines.

## Usage

The command requires a deployed stack (identified by `--stage` and `--region`) and the `--resourceName` of the resource whose logs you want to inspect.

Fetch the last hour of logs from a resource:

```bash
stacktape debug:logs --stage prod --region eu-west-1 --resourceName myApi
```

## How it works

The command initializes the target deployed stack and resolves the CloudWatch log group for the specified resource. It then operates in one of two modes depending on whether you pass `--query`.

**Standard mode** (default) retrieves recent log events from the resource's log group. You can narrow results with `--startTime`, `--filter`, and `--limit`. The command fetches log streams ordered by last event time and returns matching events up to the configured limit.

**Insights mode** activates when you pass `--query`. The command runs a full [CloudWatch Logs Insights](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/AnalyzingLogData.html) query against the log group. This gives you SQL-like filtering, aggregation, and field extraction across all log streams simultaneously — useful for debugging patterns across many invocations or computing statistics like error rates and percentile latencies.

In standard mode without `--raw`, the command prints formatted log output. In Insights mode, each result row is printed with a yellow-colorized timestamp followed by the message. When `--raw` is set or in agent mode, output is JSON.

## Important flags

### --startTime

Controls how far back to fetch logs. Defaults to 1 hour. Accepts two formats:

Relative time — a number followed by a unit (`h` for hours, `m` for minutes, `d` for days, `s` for seconds):

```bash
stacktape debug:logs --stage prod --region eu-west-1 --resourceName myApi --startTime "2h"
```

Absolute time — any string the JavaScript `Date` constructor accepts:

```bash
stacktape debug:logs --stage prod --region eu-west-1 --resourceName myApi --startTime "2025-03-15T10:00:00Z"
```

### --filter

Applies a CloudWatch Logs [filter pattern](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/FilterAndPatternSyntax.html) in standard mode. Only log events matching the pattern are returned. Use plain text for simple substring matching or CloudWatch's structured syntax for JSON logs.

Filter for error messages:

```bash
stacktape debug:logs --stage prod --region eu-west-1 --resourceName myApi --filter "ERROR"
```

Filter JSON structured logs by field value:

```bash
stacktape debug:logs --stage prod --region eu-west-1 --resourceName myApi --filter "{ $.level = \"error\" }"
```

### --query

Switches from standard mode to Insights mode. The value is a [CloudWatch Logs Insights query string](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_QuerySyntax.html). When `--query` is set, the command runs the Logs Insights query and does not use `--filter`; include any filtering or aggregation directly in the query string.

Find the 20 slowest Lambda invocations in the last 6 hours:

```bash
stacktape debug:logs --stage prod --region eu-west-1 --resourceName myApi --startTime "6h" --query "fields @timestamp, @duration, @message | sort @duration desc | limit 20"
```

Count errors per hour over the last day:

```bash
stacktape debug:logs --stage prod --region eu-west-1 --resourceName myApi --startTime "1d" --query "filter @message like /ERROR/ | stats count(*) as errorCount by bin(1h)"
```

### --limit

Caps the number of log events returned in standard mode. Defaults to 100. Set a higher value when you need to scan more history within the time window.

```bash
stacktape debug:logs --stage prod --region eu-west-1 --resourceName myApi --limit 500
```

### --raw

Outputs log data as JSON instead of formatted output. In standard mode, `--raw` returns a JSON object with `logGroup` and `events`; each event has `timestamp`, `message`, and `logStream` fields. Useful for piping into `jq` or other tools.

```bash
stacktape debug:logs --stage prod --region eu-west-1 --resourceName myApi --raw
```

### --agent

Enables agent mode, which outputs strict JSON optimized for programmatic or LLM consumption. In standard mode, the output shape matches `--raw`. In Insights mode, the JSON includes `logGroup`, `query`, and `results` fields where each result is a row from the Insights query. Agent mode also disables interactive terminal UI.

```bash
stacktape debug:logs --stage prod --region eu-west-1 --resourceName myApi --agent
```

## Examples

### Tail recent errors from a Lambda function

```bash
stacktape debug:logs --stage prod --region eu-west-1 --resourceName myApi --filter "ERROR" --startTime "30m"
```

### Investigate a specific time window

```bash
stacktape debug:logs --stage prod --region eu-west-1 --resourceName myApi --startTime "2025-03-15T08:00:00Z"
```

### Find cold starts with Insights

```bash
stacktape debug:logs --stage prod --region eu-west-1 --resourceName myApi --startTime "1d" --query "filter @type = \"REPORT\" | fields @duration, @initDuration | filter ispresent(@initDuration) | sort @initDuration desc | limit 50"
```

### Get raw JSON output for scripting

```bash
stacktape debug:logs --stage staging --region us-east-1 --resourceName orderProcessor --raw --limit 200
```

### Aggregate error counts by hour

```bash
stacktape debug:logs --stage prod --region eu-west-1 --resourceName myApi --startTime "7d" --query "filter @message like /ERROR/ | stats count(*) as errors by bin(1h) | sort errors desc"
```

### Find high-memory Lambda invocations

```bash
stacktape debug:logs --stage prod --region eu-west-1 --resourceName myApi --startTime "1d" --query "filter @type = \"REPORT\" | parse @message /Max Memory Used: (?<memUsed>\d+) MB/ | sort memUsed desc | limit 20"
```

## Flags reference


## CLI Options: `stacktape debug:logs`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `--region (-r)` | yes | `string` | AWS Region The AWS region for the operation. For a list of available regions, see the [AWS documentation](https://docs.aws.amazon.com/general/latest/gr/rande.html). | `us-east-2`, `us-east-1`, `us-west-1`, `us-west-2`, `ap-east-1`, `ap-south-1`, `ap-northeast-3`, `ap-northeast-2`, `ap-southeast-1`, `ap-southeast-2`, `ap-northeast-1`, `ca-central-1`, `eu-central-1`, `eu-west-1`, `eu-west-2`, `eu-west-3`, `eu-north-1`, `me-south-1`, `sa-east-1`, `af-south-1`, `eu-south-1` |
| `--resourceName (-rn)` | yes | `string` | Resource Name The name of the resource as defined in your Stacktape configuration. | - |
| `--stage (-s)` | yes | `string` | Stage The stage for the operation (e.g., `production`, `staging`, `dev-john`). You can set a default stage using the `defaults:configure` command. The maximum length is 12 characters. | - |
| `--agent (-ag)` | no | `boolean` | Agent Mode Optimizes CLI output for programmatic/LLM consumption:

Uses strict JSONL/NDJSON output (one JSON object per line)
Disables interactive terminal UI
Automatically confirms operations (equivalent to --autoConfirmOperation)
For dev command: also enables HTTP server for programmatic control. | - |
| `--awsAccount (-aa)` | no | `string` | AWS Account The name of the AWS account to use for the operation. The account must first be connected in the [Stacktape console](https://console.stacktape.com/aws-accounts). | - |
| `--configPath (-cp)` | no | `string` | Config File Path The path to your Stacktape configuration file, relative to the current working directory. | - |
| `--currentWorkingDirectory (-cwd)` | no | `string` | Current Working Directory The working directory for the operation. All file paths in your configuration will be resolved relative to this directory. By default, this is the directory containing the configuration file. | - |
| `--filter (-f)` | no | `string` | Filter A pattern to filter the logs. Only logs matching the pattern will be printed. For more information on filter patterns, see the [AWS documentation](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/FilterAndPatternSyntax.html). | - |
| `--help (-h)` | no | `string` | Show Help If provided, the command will not execute and will instead print help information. | - |
| `--limit (-lim)` | no | `number` | Limit Maximum number of items to return. | - |
| `--logLevel (-ll)` | no | `string` | Log Level The level of logs to print to the console.

`info`: Basic information about the operation.
`error`: Only errors.
`debug`: Detailed information for debugging. | `info`, `debug`, `error` |
| `--outputFormat (-ofmt)` | no | `string` | Output Format Controls the CLI output format:

`jsonl`: Machine-readable NDJSON (one JSON object per line). Disables interactive UI.
`plain`: Simple text output without colors or animations. Used automatically in CI or non-TTY environments.
`tty`: Full interactive terminal UI with colors, spinners, and animations. Used automatically when a TTY is detected.
If not specified, the format is auto-detected from the environment. --agent implies --outputFormat jsonl. | `jsonl`, `plain`, `tty` |
| `--profile (-p)` | no | `string` | AWS Profile The AWS profile to use for the command. You can manage profiles using the `aws-profile:*` commands and set a default profile with `defaults:configure`. | - |
| `--projectName (-prj)` | no | `string` | Project Name The name of the Stacktape project for this operation. | - |
| `--query (-q)` | no | `string` | Logs Query CloudWatch Logs Insights query string. Example: &quot;fields @timestamp, @message | filter @message like /ERROR/ | limit 50&quot; | - |
| `--raw (-rw)` | no | `boolean` | Raw If `true`, prints logs in raw JSON format instead of pretty-printing them. | - |
| `--startTime (-st)` | no | `number | string` | Start Time The start time from which to print logs. This can be any format accepted by the JavaScript `Date` constructor. | - |
| `--templateId (-ti)` | no | `string` | Template ID The ID of the template to download. You can find a list of available templates on the [Config Builder page](https://console.stacktape.com/templates). | - |


## Related commands

- [`debug:metrics`](/cli/debug-metrics) — fetch CloudWatch metrics (invocations, CPU, memory, errors) for a deployed resource.
- [`debug:alarms`](/cli/debug-alarms) — view CloudWatch alarm states across your stack.
- [`debug:container-exec`](/cli/debug-container-exec) — execute a command inside a running container for live debugging.
- [`issues:list`](/cli/issues-list) — list detected runtime issues (errors) across your deployed functions and containers.

## FAQ

### What is the difference between --filter and --query?

`--filter` applies a CloudWatch Logs filter pattern in standard mode — it works like a substring or structured-field match against individual log events as they stream from log streams. `--query` switches to CloudWatch Logs Insights mode, which lets you write SQL-like queries with aggregation, sorting, field extraction, and statistical functions across all log streams simultaneously. Use `--filter` for simple searches; use `--query` when you need analytics, counting, or sorting across many log events.

### How far back can I fetch logs?

CloudWatch can only return logs that still exist in the resource's log group. The `--startTime` flag controls how far back to look within retained logs — it defaults to 1 hour. You can set it to days or weeks with relative syntax like `--startTime "7d"`. The actual log availability depends on the retention policy configured for the CloudWatch log group.

### Can I pipe log output to other tools?

Yes. Use `--raw` to get JSON output suitable for piping to `jq`, `grep`, or other tools. In standard mode, the JSON object contains a `logGroup` field and an `events` array where each event has `timestamp`, `message`, and `logStream` fields. In Insights mode with `--agent`, the JSON includes `logGroup`, `query`, and `results` fields.

### How much does CloudWatch Logs cost?

AWS CloudWatch Logs charges for ingestion (~$0.50/GB ingested) and storage (~$0.03/GB/month retained). Logs Insights queries have an additional charge per GB of data scanned (~$0.005/GB). The `debug:logs` command itself adds no cost beyond the underlying AWS CloudWatch API calls. See [AWS CloudWatch pricing](https://aws.amazon.com/cloudwatch/pricing/) for current rates by region.

### When should I use Insights mode vs standard mode?

Standard mode is best for quick checks: "show me recent errors", "what happened in the last 30 minutes". It returns individual log lines and is fast for small time windows. Insights mode is better for investigation across large time ranges: "count errors per hour over the last week", "find the 95th percentile duration", "which endpoints are slowest". Insights queries scan all log streams in parallel and support aggregation functions that standard mode cannot.

### Can I view logs in the Stacktape Console instead of the CLI?

Yes. Logs can also be viewed in the [Stacktape Console](/stacktape-console/console-overview). The CLI command is better suited for quick terminal checks, scripting, CI/CD pipelines, and piping output to other tools where a browser is not available.

### What does the --agent flag do differently from --raw?

Both produce JSON output. `--raw` outputs a JSON object in standard mode only. `--agent` additionally optimizes output for programmatic and LLM consumption across both standard and Insights modes, disables interactive terminal UI, and implies JSONL/NDJSON formatting. Use `--agent` when integrating with AI coding assistants or automation tools; use `--raw` for simple scripting with `jq`.

### What CloudWatch Logs Insights query syntax is supported?

The `--query` flag accepts the full [CloudWatch Logs Insights query syntax](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_QuerySyntax.html). This includes `fields`, `filter`, `stats`, `sort`, `limit`, `parse`, and `display` commands. You can use functions like `count()`, `avg()`, `sum()`, `min()`, `max()`, `pct()` for percentiles, `ispresent()` for field existence checks, and `bin()` for time bucketing.
