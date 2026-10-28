# logs

The `stacktape logs` command fetches logs from a deployed resource's CloudWatch log group. It operates in two modes: standard mode retrieves recent log events with optional start-time and pattern filtering, while Insights mode runs a CloudWatch Logs Insights query for aggregation and structured analysis. The command requires a Stacktape configuration file and a deployed stack.

If the resource uses `logging.logClass: infrequent-access`, the ordinary command automatically runs a bounded Logs Insights snapshot and preserves the usual formatted or JSON event shape. CloudWatch does not support live tail or filter-pattern reads for this class, so the command exits after the snapshot. Use `--query` instead of `--filter` when you need to narrow an Infrequent Access group.


> **Info:** This command requires a Stacktape configuration file (set via `--config` or auto-detected in the working directory). The configuration is used to resolve the deployed stack and locate the correct CloudWatch log group for the specified resource.


## Usage

Fetch the last hour of logs from a resource named `myApi`.

```bash
stacktape logs myApi --stage prod --region eu-west-1
```

Fetch logs from a container workload. Use `--container` to specify which container's log group to target.

```bash
stacktape logs myService --stage prod --region eu-west-1 --container main
```

## Two modes

### Standard mode

Standard mode fetches recent log events from the resource's CloudWatch log group. By default it returns up to 100 events from the last hour. Narrow results with `--since`, `--filter`, and `--limit`.

```bash
stacktape logs myApi --stage prod --region eu-west-1 --since "2h" --filter "ERROR" --limit 50
```

The command resolves log streams for the target log group, fetches matching events, and either formats them for terminal display or outputs JSON when `--raw` or `--agent` is set.

In an interactive terminal, the command shows the same newest events (up to `--limit`, 100 by default) and then follows the log group, printing new events that match `--filter` as they arrive until you press Ctrl+C. It sends at most two CloudWatch Logs requests per second, so following a busy production log group stays within the account's request quota. When the output is piped or redirected, or with `--raw` or `--agent`, the command prints the events once and exits. `--follow=false` does the same in a terminal.

`--follow` keeps following without a terminal, for example in a coding agent's shell or in CI. Each log line is written as plain text as soon as it arrives. The command ends on Ctrl+C or `SIGTERM`, and when the reading end of its output closes, as with `| head -20`: it notices on the next line it writes. `--follow` cannot be combined with `--raw`.

```bash
stacktape logs myApi --stage dev --region eu-west-1 --follow --filter "ERROR" > api-errors.log &
```

### Insights mode

Pass a `--query` flag to run a CloudWatch Logs Insights query instead. Insights mode lets you aggregate, sort, and transform log data using the [Logs Insights query language](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_QuerySyntax.html). When `--query` is provided, the command calls CloudWatch Logs Insights and prints the returned results.

```bash
stacktape logs myApi --stage prod --region eu-west-1 --query "fields @timestamp, @message | filter @message like /ERROR/ | sort @timestamp desc | limit 20"
```

In Insights mode, non-agent output prints each result row with a highlighted timestamp and message. In agent mode, that JSON payload is text in a `type: "log"` record's `message` within the CLI NDJSON stream; the final `result` record is separate.

## Important flags

### startTime

Controls how far back to fetch logs. Accepts two formats:

- **Relative shorthand** — a number followed by a unit: `1h` (1 hour), `30m` (30 minutes), `1d` (1 day), `5s` (5 seconds). This counts back from `--until`, or now when it is omitted.
- **Absolute date** — any string the JavaScript `Date` constructor accepts, such as `2026-05-28T14:00:00Z`.

When omitted, defaults to 1 hour ago.

```bash
stacktape logs myApi --stage prod --region eu-west-1 --since "6h"
```

### filter

A CloudWatch Logs filter pattern applied server-side before events are returned. Supports simple text matching and structured JSON filter syntax. See the [AWS filter pattern documentation](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/FilterAndPatternSyntax.html) for the full syntax. This flag applies in standard mode only.

Match any log line containing the word "ERROR".

```bash
stacktape logs myApi --stage prod --region eu-west-1 --filter "ERROR"
```

Match structured JSON logs where the `level` field equals `"error"`.

```bash
stacktape logs myApi --stage prod --region eu-west-1 --filter "{ $.level = \"error\" }"
```

### query

A CloudWatch Logs Insights query string. When provided, the command switches to Insights mode. Insights queries support aggregation (`stats count(*)`), pattern matching (`parse`), and field extraction — useful for understanding error rates, latency distributions, or any structured analysis across large volumes of logs.

```bash
stacktape logs myApi --stage prod --region eu-west-1 --query "stats count(*) by bin(5m) as period"
```

### limit

Maximum number of log events to return in standard mode. Defaults to 100. Increase for deeper debugging sessions; keep low for quick checks.

```bash
stacktape logs myApi --stage prod --region eu-west-1 --limit 500
```

### container

Specifies which container's log group to target. This flag is optional in the CLI schema and is passed to the log group resolver. Use it when the deployed resource has more than one container (e.g., a [multi-container workload](/resources/compute/multi-container-workload)) and Stacktape needs a container name to identify the correct log group.

```bash
stacktape logs myWorkload --stage prod --region eu-west-1 --container sidecar
```

### raw

Outputs logs as JSON instead of the default formatted view. In standard mode, the output is a JSON object with `logGroup` and `events` fields, where each event has `timestamp`, `message`, and `logStream`. Useful for piping into `jq` or other tools.

```bash
stacktape logs myApi --stage prod --region eu-west-1 --raw
```

### agent

`--agent` uses the CLI NDJSON protocol. The log payload is JSON text inside a `type: "log"` record's `message`; the final `type: "result"` record is separate and has `result: null`. Standard-mode payloads contain `logGroup` and `events`; Insights payloads contain `logGroup`, `query` and `results`. Parse both the protocol and the message payload, or use MCP `stacktape_cli`, which extracts it. Do not parse all stdout as one log object.

```bash
stacktape logs myApi --stage prod --region eu-west-1 --agent
```

`--until` bounds Insights queries and the initial follow backlog, and anchors a relative `--since`. The ordinary one-shot fetch currently does not enforce it as an upper bound, and following continues beyond that time.

## Output format

In standard mode, the default output is formatted by the CLI for terminal display via an internal formatter. Pass `--raw` to get raw JSON output, or use `--agent` for machine-readable JSON optimized for programmatic consumption.

`--raw` prints this JSON object for standard retrieval. With `--agent`, this is the payload encoded as text in a log record's `message`:

```json
{
  "logGroup": "/aws/lambda/my-stack-myApi",
  "events": [
    {
      "timestamp": "2026-05-29T10:15:30.000Z",
      "message": "Processing request...",
      "logStream": "2026/05/29/[$LATEST]abc123"
    }
  ]
}
```

In Insights mode with `--agent`, the log record's JSON message payload includes the query and results:

```json
{
  "logGroup": "/aws/lambda/my-stack-myApi",
  "query": "fields @timestamp, @message | limit 10",
  "results": [
    { "@timestamp": "2026-05-29T10:15:30", "@message": "Processing request..." }
  ]
}
```


> **Tip:** If no log streams exist for the resource, the command prints an empty result. In agent mode, a log record's `message` contains `{"logGroup": "...", "events": []}`; the final result remains separate.


## How log group resolution works

The command initializes the deployed stack and resolves the CloudWatch log group for the resource name you pass as the first argument. The optional `--container` flag is forwarded to the resolver so it can target the intended container when the resource has multiple containers.

The resolver works with compute resources that write to CloudWatch Logs. For container resources with multiple containers, pass `--container` so the resolver can identify the correct log group.

## Examples

Fetch the last 30 minutes of logs.

```bash
stacktape logs myApi --stage prod --region eu-west-1 --since "30m"
```

Fetch only error-level logs from the last day.

```bash
stacktape logs myApi --stage prod --region eu-west-1 --since "1d" --filter "ERROR"
```

Run a Logs Insights query to count errors by 5-minute window.

```bash
stacktape logs myApi --stage prod --region eu-west-1 --query "filter @message like /ERROR/ | stats count(*) by bin(5m)"
```

Get raw JSON output for piping into another tool.

```bash
stacktape logs myApi --stage prod --region eu-west-1 --raw | jq '.events[] | select(.message | contains("timeout"))'
```

Fetch logs from a specific container in a multi-container workload.

```bash
stacktape logs myWorkload --stage prod --region eu-west-1 --container worker --since "2h" --limit 200
```

Use agent mode for structured output in a CI script.

```bash
stacktape logs myApi --stage prod --region eu-west-1 --agent --since "30m" --filter "ERROR"
```

## Flags reference


## CLI Options: `stacktape logs`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `-r, --region` | yes | `string` | AWS Region — The AWS region for the operation. For a list of available regions, see the [AWS documentation](https://docs.aws.amazon.com/general/latest/gr/rande.html). Inside a project whose config declares `region`, the flag is optional and overrides the config. | `us-east-2`, `us-east-1`, `us-west-1`, `us-west-2`, `ap-east-1`, `ap-south-1`, `ap-northeast-3`, `ap-northeast-2`, `ap-southeast-1`, `ap-southeast-2`, `ap-northeast-1`, `ca-central-1`, `eu-central-1`, `eu-west-1`, `eu-west-2`, `eu-west-3`, `eu-north-1`, `me-south-1`, `sa-east-1`, `af-south-1`, `eu-south-1` |
| `--resource-name (positional 1)` | yes | `string` | Resource Name — The name of the resource as defined in your Stacktape configuration. | - |
| `-s, --stage` | yes | `string` | Stage — The stage for the operation (e.g., `production`, `staging`, `dev-john`). You can set a default stage using the `defaults set` command. The maximum length is 12 characters. | - |
| `--aws-account` | no | `string` | AWS Account — The name of the AWS account to use for the operation. The account must first be connected in the [Stacktape Console](https://console.stacktape.com/aws-accounts). Without it, the account is chosen by `--profile`, `AWS_PROFILE` or AWS credentials in environment variables, then by your saved default, then by your organization's only connected account. `--aws-account` takes precedence over all of them, but AWS credentials in environment variables must then belong to that account. | - |
| `-c, --config` | no | `string` | Config File Path — The path to your Stacktape configuration file, relative to the current working directory. | - |
| `--container` | no | `string` | Container Name — The name of the container as defined in your container compute resource configuration. | - |
| `--cwd` | no | `string` | Current Working Directory — The working directory for the operation. All file paths in your configuration will be resolved relative to this directory. By default, this is the directory containing the configuration file. | - |
| `--until` | no | `number \| string` | End Time — The query end time; accepts JavaScript `Date` inputs and defaults to now. Relative `--since` counts back from it. Metrics and Logs Insights enforce it. For logs, it bounds the initial follow backlog, but following continues beyond it; the ordinary one-shot log fetch currently does not enforce this upper bound. | - |
| `--filter` | no | `string` | Filter — A pattern to filter the logs. Only logs matching the pattern will be printed. For more information on filter patterns, see the [AWS documentation](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/FilterAndPatternSyntax.html). | - |
| `--follow` | no | `boolean` | Follow — If `true`, keeps printing new log lines as they arrive until the command is stopped. In a terminal, `logs` follows by default; `--follow=false` prints once and exits. Piped, redirected, in CI or for an agent, `logs` prints once unless `--follow` is set. Following without a terminal prints plain lines, one at a time, and ends on Ctrl+C, `SIGTERM`, or when the reading end of the output closes. | - |
| `-h, --help` | no | `string` | Show Help — If provided, the command will not execute and will instead print help information. | - |
| `--limit` | no | `number` | Limit — Maximum number of items to return. | - |
| `--log-level` | no | `string` | Log Level — The level of logs to print to the console. • `info`: Basic information about the operation. • `error`: Only errors. • `debug`: Detailed information for debugging. | `info`, `debug`, `error` |
| `-p, --profile` | no | `string` | AWS Profile — The AWS profile to use for the command. You can manage profiles using the `aws-profile:*` commands and set a default profile with `defaults set`. For commands that use a connected AWS account, `--profile` (or `AWS_PROFILE`) selects the connected account the profile belongs to, unless `--aws-account` is set. The command fails if that account is not connected. | - |
| `--project` | no | `string` | Project Name — The name of the Stacktape project for this operation. Commands that target a stack take it from `projectName` in the project's config when the flag is absent. | - |
| `--query` | no | `string` | Logs Query — CloudWatch Logs Insights query string. Example: "fields @timestamp, @message \| filter @message like /ERROR/ \| limit 50" | - |
| `--quiet` | no | `boolean` | Quiet — Hide progress, banners, success messages and hints. Command output, warnings and errors are still printed. | - |
| `--raw` | no | `boolean` | Raw — If `true`, prints logs in raw JSON format instead of pretty-printing them. | - |
| `--since` | no | `number \| string` | Start Time — The query start time: a relative duration such as `30m`, an ISO timestamp or a supported numeric date value. Relative durations count back from `--until` (now by default). | - |


## Related commands

- [`stacktape metrics`](/cli/metrics) — fetch CloudWatch metrics (invocations, CPU, memory, errors) for a deployed resource.
- [`stacktape alarm list`](/cli/alarms) — view CloudWatch alarm states for resources in your stack.
- [`stacktape container exec`](/cli/container-exec) — run a command inside a deployed container for live debugging.
- [`stacktape query sql`](/cli/query-sql) — run read-only SQL queries against a deployed database from the command line.

## FAQ

### How do I filter logs for errors only?

Use `--filter "ERROR"` for simple text matching, or `--filter '{ $.level = "error" }'` for structured JSON logs. The filter runs server-side in CloudWatch, so only matching events are returned — faster and cheaper than fetching all logs and filtering locally. See the [AWS filter pattern syntax](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/FilterAndPatternSyntax.html) for the full query language. The `--filter` flag applies in standard mode only; for Insights mode, use filter clauses inside the `--query` string.

### What is the difference between --filter and --query?

The `--filter` flag applies a CloudWatch Logs filter pattern in standard mode — it returns individual log events that match the pattern. The `--query` flag runs a CloudWatch Logs Insights query, which supports aggregation, sorting, field extraction, and statistical analysis across your logs. Use `--filter` for quick searches like "show me lines containing ERROR". Use `--query` when you need to compute counts, percentiles, group results by time window, or extract fields from structured logs.

### How far back can I fetch logs?

The `--since` flag controls how far back the command looks — there is no hard limit in the CLI itself, only what CloudWatch has retained for the log group's retention period. When omitted, `--since` defaults to 1 hour ago. It accepts relative shorthand (`1h`, `30m`, `1d`, `5s`) or any string the JavaScript `Date` constructor parses, such as `2026-05-28T14:00:00Z`.

### Does stacktape logs live-tail?

Yes. In a terminal, `stacktape logs` shows the newest events and then prints new ones as they arrive until you press Ctrl+C. Without a terminal it prints the events once, unless you pass `--follow`. For log viewing in the browser, see [Logs](/observability/logs).

### How much does CloudWatch Logs cost?

CloudWatch Logs pricing depends on ingestion, storage, retrieval, and query/analysis usage. Logs Insights queries (via `--query`) charge per GB of data scanned. For most development workloads, costs are minimal. High-throughput production services should consider setting log retention limits or using [log forwarding](/observability/log-forwarding) to cheaper storage. Check the [AWS CloudWatch pricing page](https://aws.amazon.com/cloudwatch/pricing/) for current rates.

### What is the difference between --raw and --agent?

`--raw` prints the standard `logGroup`/`events` payload as JSON. `--agent` wraps that payload as JSON text inside a log record's `message` in the CLI NDJSON protocol, followed by a separate result record. Parse both layers, or use MCP `stacktape_cli`. In Insights mode, `--raw` is not honored; use `--agent` to receive the `logGroup`, `query` and `results` payload inside that protocol.
