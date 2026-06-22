# Debug Commands Reference

Stacktape provides a suite of CLI commands for inspecting deployed stacks without leaving your terminal. This page documents `logs` and `metrics` in depth and covers the essentials of each remaining command with links to dedicated CLI reference pages. The `container:exec` command runs a one-shot command inside a running container and returns its output, while `container:session` and `bastion:session` open interactive shell sessions — treat all three with appropriate care in production stages, since they let you run arbitrary commands against live infrastructure.

## Command overview

| Command | Purpose |
|---------|---------|
| [`logs`](/cli/logs) | Fetch CloudWatch log events |
| [`metrics`](/cli/metrics) | Fetch CloudWatch metric data |
| [`alarms`](/cli/alarms) | Inspect CloudWatch alarms |
| [`query:sql`](/cli/query-sql) | Query SQL databases |
| [`query:dynamodb`](/cli/query-dynamodb) | Query DynamoDB tables |
| [`query:redis`](/cli/query-redis) | Inspect Redis clusters |
| [`query:opensearch`](/cli/query-opensearch) | Query OpenSearch domains |
| [`aws:call`](/cli/aws-call) | Run AWS SDK calls |
| [`container:exec`](/cli/container-exec) | Execute a command in a container |
| [`container:session`](/cli/container-session) | Interactive container shell |
| [`bastion:tunnel`](/cli/bastion-tunnel) | Port-forwarding through a bastion |
| [`bastion:session`](/cli/bastion-session) | SSM shell on a bastion instance |


> **Info:** This page covers `logs` and `metrics` in depth. For the other commands, use the linked CLI reference pages for their flags, operations, and requirements.


## Stack targeting

Debug commands target a deployed stack through the usual Stacktape stack-selection flags (`--projectName`, `--stage`, `--region`). `logs` and `metrics` require `--resourceName` to pick a specific resource; other resource-specific commands document their own required targeting flags on their CLI reference pages. The exact targeting flags supported by each command — and any defaults applied when a flag is omitted — are documented on each command's [CLI reference page](/cli/logs).

## Viewing logs

The [`stacktape logs`](/cli/logs) command fetches CloudWatch log events for a deployed resource. It requires `--resourceName`, resolves that resource's log group through Stacktape's log-group helper, and retrieves events from CloudWatch Logs.

### Basic usage

Fetch the last hour of logs for a resource:

```bash
stacktape logs --projectName myProject --stage prod --region eu-west-1 --resourceName api
```

### Time range

Use `--startTime` with relative notation (`1h`, `30m`, `1d`, `5s`) or an ISO timestamp. The default lookback window is 1 hour from the current time.

Fetch the last 30 minutes:

```bash
stacktape logs --resourceName api --startTime 30m
```

For standard log fetching, Stacktape passes `startTime` to CloudWatch Logs. `--endTime` is used as the reference point when parsing relative `--startTime`; Logs Insights queries pass both `startTime` and `endTime`.

### Filtering

Use `--filter` to pass a CloudWatch Logs filter pattern.

Filter for lines containing "ERROR":

```bash
stacktape logs --resourceName api --filter "ERROR"
```

Filter JSON structured logs by a field:

```bash
stacktape logs --resourceName api --filter '{ $.level = "error" }'
```

### CloudWatch Logs Insights queries

Use `--query` to run a full CloudWatch Logs Insights query against the resource's log group. Logs Insights supports aggregations, sorting, field extraction, and explicit time bounds via `--startTime` and `--endTime`.

```bash
stacktape logs --resourceName api --query "fields @timestamp, @message | filter @message like /ERROR/ | sort @timestamp desc | limit 20"
```

Fetch Logs Insights results between two absolute timestamps:

```bash
stacktape logs --resourceName api --query "fields @timestamp, @message | sort @timestamp desc" --startTime "2025-01-15T10:00:00Z" --endTime "2025-01-15T11:00:00Z"
```

### Output format

- `--raw` — outputs raw JSON instead of formatted terminal output
- `--limit` — maximum number of events to return (default: `100`)
- `--container` — for multi-container workloads, specify which container's logs to fetch

Without `--raw`, Stacktape passes the limited events to the formatted log printer.

### Agent mode

When invoked by an AI coding assistant (detected automatically), `logs` returns structured JSON. Standard log fetching returns `{ logGroup, events }`:

```json
{
  "logGroup": "/aws/lambda/myStack-api",
  "events": [
    {
      "timestamp": "2025-01-15T10:30:00.000Z",
      "message": "Processing request",
      "logStream": "2025/01/15/[$LATEST]abc123"
    }
  ]
}
```

Logs Insights queries (when using `--query`) return `{ logGroup, query, results }` instead.

This makes debug commands work as data sources for [AI coding assistant integrations](/using-with-ai/ai-coding-assistant-integrations) and the [Stacktape MCP server](/using-with-ai/mcp-server-setup).

## Viewing metrics

The [`stacktape metrics`](/cli/metrics) command fetches CloudWatch metric data for a specific resource and renders a chart in your terminal. It supports four resource types, each with a fixed set of available metrics.

### Supported resource types and metrics

| Resource type | CloudWatch namespace | Available metrics |
|--------------|---------------------|-------------------|
| `function` (Lambda) | `AWS/Lambda` | `Invocations`, `Errors`, `Duration`, `Throttles`, `ConcurrentExecutions` |
| `multi-container-workload` | `AWS/ECS` | `CPUUtilization`, `MemoryUtilization` |
| `relational-database` | `AWS/RDS` | `CPUUtilization`, `DatabaseConnections`, `FreeStorageSpace`, `ReadLatency`, `WriteLatency` |
| `http-api-gateway` | `AWS/ApiGateway` | `Count`, `4XXError`, `5XXError`, `Latency`, `IntegrationLatency` |

The metrics command checks the resource's type from the deployed stack. If the type isn't in this table, the command returns an error listing the supported types.

### Basic usage

View Lambda invocations over the last hour:

```bash
stacktape metrics --resourceName api --metric Invocations
```

### Customizing the query

- `--period` — aggregation interval in seconds (default: `300`, i.e. 5 minutes)
- `--stat` — CloudWatch aggregation statistic (default: `Average`). Standard CloudWatch statistics include `Average`, `Sum`, `Minimum`, `Maximum`, and `SampleCount`.
- `--startTime` — supports relative time (`1h`, `6h`, `1d`) or ISO timestamp (default: 1 hour ago)
- `--endTime` — end of the time window (default: now)

View database CPU over the last 24 hours with 1-hour granularity:

```bash
stacktape metrics --resourceName mainDb --metric CPUUtilization --startTime 1d --period 3600
```

### Terminal output

In interactive mode, Stacktape renders the returned datapoints as a formatted metrics chart. In agent mode, the command returns structured JSON with timestamps and values for programmatic consumption.

## Viewing alarms

The [`stacktape alarms`](/cli/alarms) command inspects CloudWatch alarm state for a deployed stack. See the [CLI reference](/cli/alarms) for the full flag list and behavior.

## Querying SQL databases

The [`stacktape query:sql`](/cli/query-sql) command runs SQL queries against a deployed [relational database](/resources/databases/relational-database) from the CLI. See the [CLI reference](/cli/query-sql) for supported query behavior and flags.

## Querying DynamoDB

The [`stacktape query:dynamodb`](/cli/query-dynamodb) command inspects [DynamoDB table](/resources/databases/dynamodb) contents and schema from the CLI. See the [CLI reference](/cli/query-dynamodb) for the full list of operations and flags.

## Querying Redis

The [`stacktape query:redis`](/cli/query-redis) command inspects keys and server info on a deployed [Redis cluster](/resources/databases/redis). See the [CLI reference](/cli/query-redis) for the full list of operations and flags.

## Querying OpenSearch

The [`stacktape query:opensearch`](/cli/query-opensearch) command queries deployed [OpenSearch domains](/resources/databases/opensearch) from the CLI. See the [CLI reference](/cli/query-opensearch) for the full list of operations and flags.

## Running AWS SDK commands

The [`stacktape aws:call`](/cli/aws-call) command runs AWS SDK v3 calls against your deployed stack as an escape hatch for resources without a dedicated debug command. See the [CLI reference](/cli/aws-call) for the full flag list and restrictions.

## Executing commands in containers

The [`stacktape container:exec`](/cli/container-exec) command runs a one-shot command inside a running container and returns the output. See the [CLI reference](/cli/container-exec) for the full flag list.


> **Warning:** `container:exec` and `container:session` execute arbitrary commands inside live containers. These are NOT read-only operations — use caution in production stages.


## Interactive container shell

The [`stacktape container:session`](/cli/container-session) command opens an interactive shell session inside a running container. See the [CLI reference](/cli/container-session) for the full flag list.

## Bastion tunneling

The [`stacktape bastion:tunnel`](/cli/bastion-tunnel) command opens a local port-forwarding tunnel through a [bastion host](/resources/security/bastion-host) to reach VPC-only resources. See the [CLI reference](/cli/bastion-tunnel) for the full flag list and target behavior.

## Bastion shell session

The [`stacktape bastion:session`](/cli/bastion-session) command opens an interactive SSM shell session on a [bastion host](/resources/security/bastion-host) EC2 instance. See the [CLI reference](/cli/bastion-session) for the full flag list.

## Credentials and permissions

`logs` loads your configured AWS credentials to call CloudWatch Logs APIs. `metrics` initializes stack services for a deployed stack and queries CloudWatch metrics. Other debug and session commands have their own credential and IAM requirements documented on their dedicated CLI reference pages.

## FAQ

### How do I view real-time logs as they arrive?

The `logs` command fetches historical log events from CloudWatch Logs. For near-real-time inspection of a deployed stack, re-run `logs` with a short `--startTime` window (e.g. `--startTime 1m`). For local development behavior, see the [dev mode overview](/local-development/dev-mode-overview).

### Can I use debug commands with dev mode stacks?

`logs` and `metrics` require a deployed stack as their target. If you are running `stacktape dev`, these commands can target the deployed AWS stack that dev mode created — specify the same `--projectName`, `--stage`, and `--region`. Other debug commands have their own deployment requirements documented on their CLI reference pages.

### How do I debug a VPC-only database without a bastion?

Options for debugging private resources depend on what you've deployed. The simplest path is to add a [bastion host](/resources/security/bastion-host) to your stack and use [`bastion:tunnel`](/cli/bastion-tunnel) to forward a local port to the database. If you use container shell access for private-resource debugging, see the [`container:session`](/cli/container-session) and [`container:exec`](/cli/container-exec) CLI reference pages for requirements.

### What's the difference between container:exec and container:session?

[`container:exec`](/cli/container-exec) runs a single command and returns its output — it's non-interactive and suitable for scripting or AI agent use. [`container:session`](/cli/container-session) opens a persistent interactive shell. Use `container:session` for exploratory debugging; use `container:exec` for automated checks.

### How do I know which metrics are available for my resource?

The `metrics` command supports a fixed set of metrics per resource type (listed in the metrics table above). If the metric name doesn't match the resource type's allowed list, the command returns an error with the valid options. For metrics not in that list, use [`aws:call`](/cli/aws-call) with the CloudWatch `GetMetricData` or `ListMetrics` commands.

### How much do debug commands cost?

Debug commands themselves are CLI operations with no direct charge. The underlying AWS API calls (such as CloudWatch GetLogEvents and GetMetricData) may incur standard AWS charges according to your account and region. CloudWatch Logs Insights queries (`--query` flag on `logs`) are charged by AWS based on the amount of data scanned.

### Can I pipe debug command output to other tools?

Pass `--raw` to `logs` to get structured JSON output instead of formatted terminal text — this is suitable for piping to `jq` or saving to a file. Both `logs` and `metrics` return structured JSON in agent mode. In interactive mode, output is formatted for terminal viewing and isn't designed for piping.
