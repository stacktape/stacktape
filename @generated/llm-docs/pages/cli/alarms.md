# alarms

The `stacktape alarms` command displays the current state of CloudWatch alarms for a deployed stack. Use it to check which alarms are firing, which are healthy, and when each alarm last changed state — without opening the AWS Console.

## Usage

```bash
stacktape alarms --stage prod --region eu-west-1
```

This queries CloudWatch alarms whose names start with the stack name and prints the matching alarms. Each alarm is mapped to its name, matched Stacktape resource (when identified), current state, metric, threshold, comparison operator, and last state change time. Alarms in the `ALARM` state also include the reason they triggered.

## Filtering

### Filter by resource

Use `--resourceName` to narrow results to alarms belonging to a single Stacktape resource. The resource name must match the key used in your Stacktape configuration.

```bash
stacktape alarms --stage prod --region eu-west-1 --resourceName myApi
```

### Filter by state

Use `--state` to show only alarms in a specific state. Accepted values are `OK`, `ALARM`, and `INSUFFICIENT_DATA`.

Show only alarms that are currently firing:

```bash
stacktape alarms --stage prod --region eu-west-1 --state ALARM
```

Show only healthy alarms:

```bash
stacktape alarms --stage prod --region eu-west-1 --state OK
```

You can combine both filters to check whether a specific resource has any firing alarms:

```bash
stacktape alarms --stage prod --region eu-west-1 --resourceName myApi --state ALARM
```

## Agent mode

Pass `--agent` for machine-readable output. For the `alarms` command, agent mode emits a JSON object with an `alarms` array. Each entry contains the alarm's `name`, matched `resource` (if any), `state`, `metric`, `threshold`, `comparison`, `lastUpdated`, and (for alarms in the `ALARM` state) `reason`.

```bash
stacktape alarms --stage prod --region eu-west-1 --agent
```

## Flags reference


## CLI Options: `stacktape alarms`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `--region (-r)` | yes | `string` | AWS Region The AWS region for the operation. For a list of available regions, see the [AWS documentation](https://docs.aws.amazon.com/general/latest/gr/rande.html). | `us-east-2`, `us-east-1`, `us-west-1`, `us-west-2`, `ap-east-1`, `ap-south-1`, `ap-northeast-3`, `ap-northeast-2`, `ap-southeast-1`, `ap-southeast-2`, `ap-northeast-1`, `ca-central-1`, `eu-central-1`, `eu-west-1`, `eu-west-2`, `eu-west-3`, `eu-north-1`, `me-south-1`, `sa-east-1`, `af-south-1`, `eu-south-1` |
| `--stage (-s)` | yes | `string` | Stage The stage for the operation (e.g., `production`, `staging`, `dev-john`). You can set a default stage using the `defaults:configure` command. The maximum length is 12 characters. | - |
| `--agent (-ag)` | no | `boolean` | Agent Mode Optimizes CLI output for programmatic/LLM consumption: Uses strict JSONL/NDJSON output (one JSON object per line) Disables interactive terminal UI Automatically confirms operations (equivalent to --autoConfirmOperation) For dev command: also enables HTTP server for programmatic control. | - |
| `--awsAccount (-aa)` | no | `string` | AWS Account The name of the AWS account to use for the operation. The account must first be connected in the [Stacktape console](https://console.stacktape.com/aws-accounts). | - |
| `--help (-h)` | no | `string` | Show Help If provided, the command will not execute and will instead print help information. | - |
| `--logLevel (-ll)` | no | `string` | Log Level The level of logs to print to the console. `info`: Basic information about the operation. `error`: Only errors. `debug`: Detailed information for debugging. | `info`, `debug`, `error` |
| `--outputFormat (-ofmt)` | no | `string` | Output Format Controls the CLI output format: `jsonl`: Machine-readable NDJSON (one JSON object per line). Disables interactive UI. `plain`: Simple text output without colors or animations. Used automatically in CI or non-TTY environments. `tty`: Full interactive terminal UI with colors, spinners, and animations. Used automatically when a TTY is detected. If not specified, the format is auto-detected from the environment. --agent implies --outputFormat jsonl. | `jsonl`, `plain`, `tty` |
| `--profile (-p)` | no | `string` | AWS Profile The AWS profile to use for the command. You can manage profiles using the `aws-profile:*` commands and set a default profile with `defaults:configure`. | - |
| `--projectName (-prj)` | no | `string` | Project Name The name of the Stacktape project for this operation. | - |
| `--resourceName (-rn)` | no | `string` | Resource Name The name of the resource as defined in your Stacktape configuration. | - |
| `--state (-sta)` | no | `string` | Alarm State Filter Filter alarms by state: OK, ALARM, or INSUFFICIENT_DATA. | - |


## Related commands

- [`stacktape logs`](/cli/logs) — fetch and search logs from a deployed resource.
- [`stacktape metrics`](/cli/metrics) — fetch CloudWatch metrics for a deployed resource.
- [`stacktape issues:list`](/cli/issues-list) — list detected runtime issues (errors) across your deployed functions and containers.

## FAQ

### What alarms does this command show?

The `alarms` command queries all CloudWatch alarms whose name starts with the stack name. In practice, this targets alarms associated with the Stacktape stack. It does not show alarms created outside of Stacktape unless they happen to share the stack name prefix. For details on configuring alarm rules, see [Alarms](/observability/alarms).

### What do the alarm states mean?

CloudWatch alarms have three states. `OK` means the metric is within the configured threshold. `ALARM` means the metric has breached the threshold for the required number of evaluation periods. `INSUFFICIENT_DATA` means there is not enough data to evaluate the alarm — this is common for newly created alarms or resources with no recent traffic.

### How do I check from a script whether any alarms are firing?

Combine `--state ALARM` with `--agent`. The `--state` filter limits results to firing alarms, and `--agent` emits a JSON object with an `alarms` array instead of interactive output — so an empty array means nothing is firing. This makes it straightforward to gate a deployment in CI on whether a production stage has any active alarms.

### How is this different from `stacktape metrics`?

The [`metrics`](/cli/metrics) command fetches CloudWatch metrics for a deployed resource, with support for metrics like Lambda Invocations, ECS CPUUtilization, RDS DatabaseConnections, and API Gateway 5XXError. The `alarms` command shows the evaluated state of alarm rules — whether configured thresholds have been breached. Use `metrics` to investigate trends; use `alarms` to check whether anything is currently broken.
