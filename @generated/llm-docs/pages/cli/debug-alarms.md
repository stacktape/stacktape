# debug:alarms

The `debug:alarms` command displays the current state of all CloudWatch alarms associated with a deployed stack. Use it to quickly identify which alarms are firing, which are healthy, and which lack sufficient data — without opening the AWS Console. The command is read-only and does not modify any resources.

## Usage

```bash
stacktape debug:alarms --stage production --region eu-west-1
```

Stacktape queries CloudWatch for all alarms prefixed with the stack name and displays a table showing each alarm's state, associated resource, monitored metric, threshold, comparison operator, last state change, and reason (for alarms in `ALARM` state).

Use `--resourceName` to narrow results to a single resource. Use `--state` to filter by CloudWatch alarm state values such as `OK`, `ALARM`, or `INSUFFICIENT_DATA`.

In agent mode (`--agent`), the command prints a JSON object containing an `alarms` array instead of the interactive table. This is useful for programmatic consumption by scripts or AI coding agents.


## CLI Options: `stacktape debug:alarms`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `--region (-r)` | yes | `string` | AWS Region The AWS region for the operation. For a list of available regions, see the [AWS documentation](https://docs.aws.amazon.com/general/latest/gr/rande.html). | `us-east-2`, `us-east-1`, `us-west-1`, `us-west-2`, `ap-east-1`, `ap-south-1`, `ap-northeast-3`, `ap-northeast-2`, `ap-southeast-1`, `ap-southeast-2`, `ap-northeast-1`, `ca-central-1`, `eu-central-1`, `eu-west-1`, `eu-west-2`, `eu-west-3`, `eu-north-1`, `me-south-1`, `sa-east-1`, `af-south-1`, `eu-south-1` |
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
| `--profile (-p)` | no | `string` | AWS Profile The AWS profile to use for the command. You can manage profiles using the `aws-profile:*` commands and set a default profile with `defaults:configure`. | - |
| `--projectName (-prj)` | no | `string` | Project Name The name of the Stacktape project for this operation. | - |
| `--resourceName (-rn)` | no | `string` | Resource Name The name of the resource as defined in your Stacktape configuration. | - |
| `--state (-sta)` | no | `string` | Alarm State Filter Filter alarms by state: OK, ALARM, or INSUFFICIENT_DATA. | - |


## Examples

List all alarms for a staging stack:

```bash
stacktape debug:alarms --stage staging --region us-east-1
```

Show only alarms that are currently firing:

```bash
stacktape debug:alarms --stage production --region eu-west-1 --state ALARM
```

Check alarms for a specific Lambda function:

```bash
stacktape debug:alarms --stage production --region eu-west-1 --resourceName paymentHandler
```

Combine filters to check if a specific resource has active alarms:

```bash
stacktape debug:alarms --stage production --region eu-west-1 --resourceName paymentHandler --state ALARM
```

Get JSON output for use in scripts or AI agents:

```bash
stacktape debug:alarms --stage production --region eu-west-1 --agent
```

## Related commands

- [`debug:logs`](/cli/debug-logs) — fetch and filter log events from a deployed resource
- [`debug:metrics`](/cli/debug-metrics) — fetch CloudWatch metric data points for a resource
- [`info:stack`](/cli/info-stack) — display stack outputs, endpoints, and resource inventory
