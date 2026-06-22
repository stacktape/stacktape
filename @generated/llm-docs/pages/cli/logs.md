# logs

The `stacktape logs` command fetches logs from a deployed resource's CloudWatch log group. It operates in two modes: standard mode retrieves recent log events with optional start-time and pattern filtering, while Insights mode runs a CloudWatch Logs Insights query for aggregation and structured analysis. The command requires a Stacktape configuration file and a deployed stack.


> **Info:** This command requires a Stacktape configuration file (set via `--configPath` or auto-detected in the working directory). The configuration is used to resolve the deployed stack and locate the correct CloudWatch log group for the specified resource.


## Usage

Fetch the last hour of logs from a resource named `myApi`.

```bash
stacktape logs --stage prod --region eu-west-1 --resourceName myApi
```

Fetch logs from a container workload. Use `--container` to specify which container's log group to target.

```bash
stacktape logs --stage prod --region eu-west-1 --resourceName myService --container main
```

## Two modes

### Standard mode

Standard mode fetches recent log events from the resource's CloudWatch log group. By default it returns up to 100 events from the last hour. Narrow results with `--startTime`, `--filter`, and `--limit`.

```bash
stacktape logs --stage prod --region eu-west-1 --resourceName myApi --startTime "2h" --filter "ERROR" --limit 50
```

The command resolves log streams for the target log group, fetches matching events, and either formats them for terminal display or outputs JSON when `--raw` or `--agent` is set.

### Insights mode

Pass a `--query` flag to run a CloudWatch Logs Insights query instead. Insights mode lets you aggregate, sort, and transform log data using the [Logs Insights query language](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_QuerySyntax.html). When `--query` is provided, the command calls CloudWatch Logs Insights and prints the returned results.

```bash
stacktape logs --stage prod --region eu-west-1 --resourceName myApi --query "fields @timestamp, @message | filter @message like /ERROR/ | sort @timestamp desc | limit 20"
```

In Insights mode, non-agent output prints each result row with a highlighted timestamp and message. In agent mode, the output is a JSON object containing the log group name, the query string, and the results array.

## Important flags

### startTime

Controls how far back to fetch logs. Accepts two formats:

- **Relative shorthand** — a number followed by a unit: `1h` (1 hour), `30m` (30 minutes), `1d` (1 day), `5s` (5 seconds). This is subtracted from the current time.
- **Absolute date** — any string the JavaScript `Date` constructor accepts, such as `2026-05-28T14:00:00Z`.

When omitted, defaults to 1 hour ago.

```bash
stacktape logs --stage prod --region eu-west-1 --resourceName myApi --startTime "6h"
```

### filter

A CloudWatch Logs filter pattern applied server-side before events are returned. Supports simple text matching and structured JSON filter syntax. See the [AWS filter pattern documentation](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/FilterAndPatternSyntax.html) for the full syntax. This flag applies in standard mode only.

Match any log line containing the word "ERROR".

```bash
stacktape logs --stage prod --region eu-west-1 --resourceName myApi --filter "ERROR"
```

Match structured JSON logs where the `level` field equals `"error"`.

```bash
stacktape logs --stage prod --region eu-west-1 --resourceName myApi --filter "{ $.level = \"error\" }"
```

### query

A CloudWatch Logs Insights query string. When provided, the command switches to Insights mode. Insights queries support aggregation (`stats count(*)`), pattern matching (`parse`), and field extraction — useful for understanding error rates, latency distributions, or any structured analysis across large volumes of logs.

```bash
stacktape logs --stage prod --region eu-west-1 --resourceName myApi --query "stats count(*) by bin(5m) as period"
```

### limit

Maximum number of log events to return in standard mode. Defaults to 100. Increase for deeper debugging sessions; keep low for quick checks.

```bash
stacktape logs --stage prod --region eu-west-1 --resourceName myApi --limit 500
```

### container

Specifies which container's log group to target. This flag is optional in the CLI schema and is passed to the log group resolver. Use it when the deployed resource has more than one container (e.g., a [multi-container workload](/resources/compute/multi-container-workload)) and Stacktape needs a container name to identify the correct log group.

```bash
stacktape logs --stage prod --region eu-west-1 --resourceName myWorkload --container sidecar
```

### raw

Outputs logs as JSON instead of the default formatted view. In standard mode, the output is a JSON object with `logGroup` and `events` fields, where each event has `timestamp`, `message`, and `logStream`. Useful for piping into `jq` or other tools.

```bash
stacktape logs --stage prod --region eu-west-1 --resourceName myApi --raw
```

### agent

Optimizes CLI output for programmatic and LLM consumption. For `stacktape logs`, `--agent` makes the command print a JSON object instead of formatted terminal text. In standard mode, the output structure matches `--raw` — a JSON object with `logGroup` and `events`. In Insights mode, the output is a JSON object with `logGroup`, `query`, and `results`.

```bash
stacktape logs --stage prod --region eu-west-1 --resourceName myApi --agent
```

## Output format

In standard mode, the default output is formatted by the CLI for terminal display via an internal formatter. Pass `--raw` to get raw JSON output, or use `--agent` for machine-readable JSON optimized for programmatic consumption.

Both `--raw` and `--agent` produce a JSON object with this structure for standard log retrieval:

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

In Insights mode with `--agent`, the output includes the query and results:

```json
{
  "logGroup": "/aws/lambda/my-stack-myApi",
  "query": "fields @timestamp, @message | limit 10",
  "results": [
    { "@timestamp": "2026-05-29T10:15:30", "@message": "Processing request..." }
  ]
}
```


> **Tip:** If no log streams exist for the resource, the command prints an empty result. In agent mode, this is `{"logGroup": "...", "events": []}`.


## How log group resolution works

The command initializes the deployed stack and resolves the CloudWatch log group for the resource name you pass with `--resourceName`. The optional `--container` flag is forwarded to the resolver so it can target the intended container when the resource has multiple containers.

The resolver works with compute resources that write to CloudWatch Logs. For container resources with multiple containers, pass `--container` so the resolver can identify the correct log group.

## Examples

Fetch the last 30 minutes of logs.

```bash
stacktape logs --stage prod --region eu-west-1 --resourceName myApi --startTime "30m"
```

Fetch only error-level logs from the last day.

```bash
stacktape logs --stage prod --region eu-west-1 --resourceName myApi --startTime "1d" --filter "ERROR"
```

Run a Logs Insights query to count errors by 5-minute window.

```bash
stacktape logs --stage prod --region eu-west-1 --resourceName myApi --query "filter @message like /ERROR/ | stats count(*) by bin(5m)"
```

Get raw JSON output for piping into another tool.

```bash
stacktape logs --stage prod --region eu-west-1 --resourceName myApi --raw | jq '.events[] | select(.message | contains("timeout"))'
```

Fetch logs from a specific container in a multi-container workload.

```bash
stacktape logs --stage prod --region eu-west-1 --resourceName myWorkload --container worker --startTime "2h" --limit 200
```

Use agent mode for structured output in a CI script.

```bash
stacktape logs --stage prod --region eu-west-1 --resourceName myApi --agent --startTime "30m" --filter "ERROR"
```

## Flags reference

<CliCommandsApiReference command="logs" sortedArgs={[
  {
    "name": "region",
    "required": true,
    "alias": "r",
    "allowedTypes": [
      "string"
    ],
    "allowedValues": [
      "us-east-2",
      "us-east-1",
      "us-west-1",
      "us-west-2",
      "ap-east-1",
      "ap-south-1",
      "ap-northeast-3",
      "ap-northeast-2",
      "ap-southeast-1",
      "ap-southeast-2",
      "ap-northeast-1",
      "ca-central-1",
      "eu-central-1",
      "eu-west-1",
      "eu-west-2",
      "eu-west-3",
      "eu-north-1",
      "me-south-1",
      "sa-east-1",
      "af-south-1",
      "eu-south-1"
    ],
    "shortDescription": "<p> AWS Region</p>\n",
    "longDescription": "<p>The AWS region for the operation. For a list of available regions, see the <a href=\"https://docs.aws.amazon.com/general/latest/gr/rande.html\" style=\"font-weight: bold;\" target=\"_blank\" rel=\"noreferrer\" onclick=\"event.stopPropagation();\">AWS documentation</a>.</p>\n"
  },
  {
    "name": "resourceName",
    "required": true,
    "alias": "rn",
    "allowedTypes": [
      "string"
    ],
    "shortDescription": "<p> Resource Name</p>\n",
    "longDescription": "<p>The name of the resource as defined in your Stacktape configuration.</p>\n"
  },
  {
    "name": "stage",
    "required": true,
    "alias": "s",
    "allowedTypes": [
      "string"
    ],
    "shortDescription": "<p> Stage</p>\n",
    "longDescription": "<p>The stage for the operation (e.g., <code>production</code>, <code>staging</code>, <code>dev-john</code>). You can set a default stage using the <code>defaults:configure</code> command. The maximum length is 12 characters.</p>\n"
  },
  {
    "name": "agent",
    "required": false,
    "alias": "ag",
    "allowedTypes": [
      "boolean"
    ],
    "shortDescription": "<p> Agent Mode</p>\n",
    "longDescription": "<p>Optimizes CLI output for programmatic/LLM consumption. For <code>stacktape logs</code>, this outputs a pretty-printed JSON object instead of formatted terminal text. The <code>--agent</code> flag is a global CLI mode; its exact behavior varies by command.</p>\n"
  },
  {
    "name": "awsAccount",
    "required": false,
    "alias": "aa",
    "allowedTypes": [
      "string"
    ],
    "shortDescription": "<p> AWS Account</p>\n",
    "longDescription": "<p>The name of the AWS account to use for the operation. The account must first be connected in the <a href=\"https://console.stacktape.com/aws-accounts\" style=\"font-weight: bold;\" target=\"_blank\" rel=\"noreferrer\" onclick=\"event.stopPropagation();\">Stacktape console</a>.</p>\n"
  },
  {
    "name": "configPath",
    "required": false,
    "alias": "cp",
    "allowedTypes": [
      "string"
    ],
    "shortDescription": "<p> Config File Path</p>\n",
    "longDescription": "<p>The path to your Stacktape configuration file, relative to the current working directory.</p>\n"
  },
  {
    "name": "container",
    "required": false,
    "alias": "cnt",
    "allowedTypes": [
      "string"
    ],
    "shortDescription": "<p> Container Name</p>\n",
    "longDescription": "<p>The name of the container as defined in your container compute resource configuration.</p>\n"
  },
  {
    "name": "currentWorkingDirectory",
    "required": false,
    "alias": "cwd",
    "allowedTypes": [
      "string"
    ],
    "shortDescription": "<p> Current Working Directory</p>\n",
    "longDescription": "<p>The working directory for the operation. All file paths in your configuration will be resolved relative to this directory. By default, this is the directory containing the configuration file.</p>\n"
  },
  {
    "name": "filter",
    "required": false,
    "alias": "f",
    "allowedTypes": [
      "string"
    ],
    "shortDescription": "<p> Filter</p>\n",
    "longDescription": "<p>A pattern to filter the logs. Only logs matching the pattern will be printed. For more information on filter patterns, see the <a href=\"https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/FilterAndPatternSyntax.html\" style=\"font-weight: bold;\" target=\"_blank\" rel=\"noreferrer\" onclick=\"event.stopPropagation();\">AWS documentation</a>.</p>\n"
  },
  {
    "name": "help",
    "required": false,
    "alias": "h",
    "allowedTypes": [
      "string"
    ],
    "shortDescription": "<p> Show Help</p>\n",
    "longDescription": "<p>If provided, the command will not execute and will instead print help information.</p>\n"
  },
  {
    "name": "limit",
    "required": false,
    "alias": "lim",
    "allowedTypes": [
      "number"
    ],
    "shortDescription": "<p> Limit</p>\n",
    "longDescription": "<p>Maximum number of items to return.</p>\n"
  },
  {
    "name": "logLevel",
    "required": false,
    "alias": "ll",
    "allowedTypes": [
      "string"
    ],
    "allowedValues": [
      "info",
      "debug",
      "error"
    ],
    "shortDescription": "<p> Log Level</p>\n",
    "longDescription": "<p>The level of logs to print to the console.</p>\n<ul>\n<li><code>info</code>: Basic information about the operation.</li>\n<li><code>error</code>: Only errors.</li>\n<li><code>debug</code>: Detailed information for debugging.</li>\n</ul>\n"
  },
  {
    "name": "outputFormat",
    "required": false,
    "alias": "ofmt",
    "allowedTypes": [
      "string"
    ],
    "allowedValues": [
      "jsonl",
      "plain",
      "tty"
    ],
    "shortDescription": "<p> Output Format</p>\n",
    "longDescription": "<p>Controls the CLI output format:</p>\n<ul>\n<li><code>jsonl</code>: Machine-readable NDJSON (one JSON object per line). Disables interactive UI.</li>\n<li><code>plain</code>: Simple text output without colors or animations. Used automatically in CI or non-TTY environments.</li>\n<li><code>tty</code>: Full interactive terminal UI with colors, spinners, and animations. Used automatically when a TTY is detected.\nIf not specified, the format is auto-detected from the environment. --agent implies --outputFormat jsonl.</li>\n</ul>\n"
  },
  {
    "name": "profile",
    "required": false,
    "alias": "p",
    "allowedTypes": [
      "string"
    ],
    "shortDescription": "<p> AWS Profile</p>\n",
    "longDescription": "<p>The AWS profile to use for the command. You can manage profiles using the <code>aws-profile:*</code> commands and set a default profile with <code>defaults:configure</code>.</p>\n"
  },
  {
    "name": "projectName",
    "required": false,
    "alias": "prj",
    "allowedTypes": [
      "string"
    ],
    "shortDescription": "<p> Project Name</p>\n",
    "longDescription": "<p>The name of the Stacktape project for this operation.</p>\n"
  },
  {
    "name": "query",
    "required": false,
    "alias": "q",
    "allowedTypes": [
      "string"
    ],
    "shortDescription": "<p> Logs Query</p>\n",
    "longDescription": "<p>CloudWatch Logs Insights query string. Example: &quot;fields @timestamp, @message | filter @message like /ERROR/ | limit 50&quot;</p>\n"
  },
  {
    "name": "raw",
    "required": false,
    "alias": "rw",
    "allowedTypes": [
      "boolean"
    ],
    "shortDescription": "<p> Raw</p>\n",
    "longDescription": "<p>If <code>true</code>, prints logs in raw JSON format instead of pretty-printing them.</p>\n"
  },
  {
    "name": "startTime",
    "required": false,
    "alias": "st",
    "allowedTypes": [
      "number",
      "string"
    ],
    "shortDescription": "<p> Start Time</p>\n",
    "longDescription": "<p>The start time from which to print logs. This can be any format accepted by the JavaScript <code>Date</code> constructor.</p>\n"
  },
  {
    "name": "templateId",
    "required": false,
    "alias": "ti",
    "allowedTypes": [
      "string"
    ],
    "shortDescription": "<p> Template ID</p>\n",
    "longDescription": "<p>The ID of the template to download. You can find a list of available templates on the <a href=\"https://console.stacktape.com/templates\" style=\"font-weight: bold;\" target=\"_blank\" rel=\"noreferrer\" onclick=\"event.stopPropagation();\">Config Builder page</a>.</p>\n"
  }
]} />

## Related commands

- [`stacktape metrics`](/cli/metrics) — fetch CloudWatch metrics (invocations, CPU, memory, errors) for a deployed resource.
- [`stacktape alarms`](/cli/alarms) — view CloudWatch alarm states for resources in your stack.
- [`stacktape container:exec`](/cli/container-exec) — run a command inside a deployed container for live debugging.
- [`stacktape query:sql`](/cli/query-sql) — run read-only SQL queries against a deployed database from the command line.

## FAQ

### How do I filter logs for errors only?

Use `--filter "ERROR"` for simple text matching, or `--filter '{ $.level = "error" }'` for structured JSON logs. The filter runs server-side in CloudWatch, so only matching events are returned — faster and cheaper than fetching all logs and filtering locally. See the [AWS filter pattern syntax](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/FilterAndPatternSyntax.html) for the full query language. The `--filter` flag applies in standard mode only; for Insights mode, use filter clauses inside the `--query` string.

### What is the difference between --filter and --query?

The `--filter` flag applies a CloudWatch Logs filter pattern in standard mode — it returns individual log events that match the pattern. The `--query` flag runs a CloudWatch Logs Insights query, which supports aggregation, sorting, field extraction, and statistical analysis across your logs. Use `--filter` for quick searches like "show me lines containing ERROR". Use `--query` when you need to compute counts, percentiles, group results by time window, or extract fields from structured logs.

### How far back can I fetch logs?

The `--startTime` flag controls how far back the command looks — there is no hard limit in the CLI itself, only what CloudWatch has retained for the log group's retention period. When omitted, `--startTime` defaults to 1 hour ago. It accepts relative shorthand (`1h`, `30m`, `1d`, `5s`) or any string the JavaScript `Date` constructor parses, such as `2026-05-28T14:00:00Z`.

### Does stacktape logs live-tail?

The `stacktape logs` command fetches a snapshot of log events for a time window — it does not live-tail. You can approximate tailing by running the command repeatedly with a short `--startTime` (e.g., `--startTime "1m"`). For log viewing in the browser, see [Logs](/observability/logs).

### How much does CloudWatch Logs cost?

CloudWatch Logs pricing depends on ingestion, storage, retrieval, and query/analysis usage. Logs Insights queries (via `--query`) charge per GB of data scanned. For most development workloads, costs are minimal. High-throughput production services should consider setting log retention limits or using [log forwarding](/observability/log-forwarding) to cheaper storage. Check the [AWS CloudWatch pricing page](https://aws.amazon.com/cloudwatch/pricing/) for current rates.

### What is the difference between --raw and --agent?

In standard mode both produce the same JSON (`logGroup` and `events` fields), so either works for scripting and piping to `jq`. The gotcha is Insights mode: `--raw` is not honored there, so to get the full JSON object with `logGroup`, `query`, and `results` from a `--query` run you must use `--agent`.
