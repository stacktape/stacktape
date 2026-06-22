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

<CliCommandsApiReference command="alarms" sortedArgs={[
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
    "longDescription": "<p>Optimizes CLI output for programmatic/LLM consumption:</p>\n<ul>\n<li>Uses strict JSONL/NDJSON output (one JSON object per line)</li>\n<li>Disables interactive terminal UI</li>\n<li>Automatically confirms operations (equivalent to --autoConfirmOperation)\nFor dev command: also enables HTTP server for programmatic control.</li>\n</ul>\n"
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
    "name": "resourceName",
    "required": false,
    "alias": "rn",
    "allowedTypes": [
      "string"
    ],
    "shortDescription": "<p> Resource Name</p>\n",
    "longDescription": "<p>The name of the resource as defined in your Stacktape configuration.</p>\n"
  },
  {
    "name": "state",
    "required": false,
    "alias": "sta",
    "allowedTypes": [
      "string"
    ],
    "shortDescription": "<p> Alarm State Filter</p>\n",
    "longDescription": "<p>Filter alarms by state: OK, ALARM, or INSUFFICIENT_DATA.</p>\n"
  }
]} />

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
