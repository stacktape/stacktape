# alarm list

`stacktape alarm list` shows the CloudWatch alarms of a deployed stage and their current state, so you can see what is firing without opening the AWS console. It lists the alarms whose names start with the stack name, such as the [alarms](/observability/alarms) your config defines. It needs AWS credentials and works without a Stacktape account.

## Usage

```bash
stacktape alarm list --stage prod --region eu-west-1
```

For each alarm you get its name, the Stacktape resource it belongs to, its state, the metric, threshold and comparison, and when the state last changed. A firing alarm also shows why.

| State | Meaning |
|---|---|
| `OK` | The metric is within the threshold. |
| `ALARM` | The metric crossed the threshold for the required number of periods. |
| `INSUFFICIENT_DATA` | Not enough data yet, common for a new alarm or a resource without traffic. |

## Filter by resource or state

Firing alarms of one resource:

```bash
stacktape alarm list --stage prod --region eu-west-1 --resource-name myApi --state ALARM
```

`--resource-name` takes the resource name from your config. `--state` takes `OK`, `ALARM` or `INSUFFICIENT_DATA`.

## Check from a script

With `--agent`, the command prints NDJSON: one JSON object per line. The list arrives as JSON text in the `message` of a `log` line, as `{ "alarms": [...] }`, and each alarm has `name`, `resource`, `state`, `metric`, `threshold`, `comparison`, `lastUpdated` and, when firing, `reason`. This prints how many alarms are firing:

```bash
stacktape alarm list --stage prod --region eu-west-1 --state ALARM --agent \
  | jq 'select(.type == "log") | .message | fromjson? | .alarms | length'
```

Legacy alarm rules that were created in the Console, not in your config, move into the config with [`alarm export`](/cli/alarm-export).

## Options


## CLI Options: `stacktape alarm list`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `-r, --region` | yes | `string` | AWS Region — The AWS region for the operation. For a list of available regions, see the [AWS documentation](https://docs.aws.amazon.com/general/latest/gr/rande.html). Inside a project whose config declares `region`, the flag is optional and overrides the config. | `us-east-2`, `us-east-1`, `us-west-1`, `us-west-2`, `ap-east-1`, `ap-south-1`, `ap-northeast-3`, `ap-northeast-2`, `ap-southeast-1`, `ap-southeast-2`, `ap-northeast-1`, `ca-central-1`, `eu-central-1`, `eu-west-1`, `eu-west-2`, `eu-west-3`, `eu-north-1`, `me-south-1`, `sa-east-1`, `af-south-1`, `eu-south-1` |
| `-s, --stage` | yes | `string` | Stage — The stage for the operation (e.g., `production`, `staging`, `dev-john`). You can set a default stage using the `defaults set` command. Stage names use lowercase letters, numbers and dashes, with at least 2 characters. The project name, a dash and the stage form the CloudFormation stack name, which can have at most 128 characters. Stacktape shortens an AWS resource name that would be too long and adds a hash. | - |
| `--aws-account` | no | `string` | AWS Account — The name of the AWS account to use for the operation. The account must first be connected in the [Stacktape Console](https://console.stacktape.com/aws-accounts). Without it, the account is chosen by `--profile`, `AWS_PROFILE` or AWS credentials in environment variables, then by your saved default, then by your organization's only connected account. `--aws-account` takes precedence over all of them, but AWS credentials in environment variables must then belong to that account. | - |
| `-h, --help` | no | `string` | Show Help — If provided, the command will not execute and will instead print help information. | - |
| `--log-level` | no | `string` | Log Level — The level of logs to print to the console. • `info`: Basic information about the operation. • `error`: Only errors. • `debug`: Detailed information for debugging. | `info`, `debug`, `error` |
| `-p, --profile` | no | `string` | AWS Profile — The AWS profile to use for the command. You can manage profiles using the `aws-profile:*` commands and set a default profile with `defaults set`. For commands that use a connected AWS account, `--profile` (or `AWS_PROFILE`) selects the connected account the profile belongs to, unless `--aws-account` is set. The command fails if that account is not connected. | - |
| `--project` | no | `string` | Project Name — The name of the Stacktape project for this operation. Commands that target a stack take it from `projectName` in the project's config when the flag is absent. | - |
| `--quiet` | no | `boolean` | Quiet — Hide progress, banners, success messages and hints. Command output, warnings and errors are still printed. | - |
| `--resource-name` | no | `string` | Resource Name — The name of the resource as defined in your Stacktape configuration. | - |
| `--state` | no | `string` | Alarm State Filter — Filter alarms by state: OK, ALARM, or INSUFFICIENT_DATA. | - |


## Related commands

- [`metrics`](/cli/metrics) shows the metric behind an alarm over time.
- [`logs`](/cli/logs) shows the requests and errors behind it.
- [`alarm export`](/cli/alarm-export) moves legacy Console alarm rules into your config.
