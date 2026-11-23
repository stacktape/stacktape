# metrics

`stacktape metrics` reads one CloudWatch metric of a deployed resource and draws it as a chart in your terminal. Use it to check invocations, errors, container and database CPU, connections or API latency without opening the AWS console. It needs AWS credentials for the account and works without a Stacktape account.

## Usage

```bash
stacktape metrics myApi Invocations --stage prod --region eu-west-1 --stat Sum
```

The first argument is the resource name from your config, the second the metric. By default you get the last hour in 5-minute periods, averaged. Use `--stat Sum` for counts such as `Invocations`, `Errors` and `Throttles`, because an average of a count is not a total. Keep `Average` or `Maximum` for utilization, and use `p99` for latency.

## Supported resources and metrics

| Resource | Metrics |
|---|---|
| [Lambda function](/resources/compute/lambda-function) | `Invocations`, `Errors`, `Duration`, `Throttles`, `ConcurrentExecutions` |
| [Relational database](/resources/databases/relational-database) | `CPUUtilization`, `DatabaseConnections`, `FreeStorageSpace`, `ReadLatency`, `WriteLatency` |
| [HTTP API Gateway](/resources/networking/http-api-gateway) | `Count`, `4xx`, `5xx`, `Latency`, `IntegrationLatency` |
| [Web service](/resources/compute/web-service), [private service](/resources/compute/private-service), [worker service](/resources/compute/worker-service), [multi-container workload](/resources/compute/multi-container-workload) | `CPUUtilization`, `MemoryUtilization` |

Container metrics are per ECS service, so they cover all running containers of the resource; `--stat Maximum` shows the busiest one. Another resource type or an unknown metric stops the command with a list of what it accepts.

## Examples

Errors in the last 24 hours, one point per hour:

```bash
stacktape metrics myApi Errors --stage prod --region eu-west-1 --stat Sum --since 1d --period 3600
```

Tail latency of an HTTP API in the last 30 minutes:

```bash
stacktape metrics myGateway Latency --stage prod --region eu-west-1 --stat p99 --since 30m
```

A fixed window, for example around an incident. `--since` takes a relative duration such as `30m` or a timestamp, `--until` a timestamp:

```bash
stacktape metrics mainDatabase DatabaseConnections --stage prod --region eu-west-1 --stat Maximum --since 2026-11-20T09:00:00Z --until 2026-11-20T11:00:00Z
```

## Reading the data in a script

With `--agent`, the command prints NDJSON: one JSON object per line. The metric data comes as JSON text in the `message` of a `log` line, with `resource`, `metric`, `period`, `stat`, `unit` and `datapoints` (each with `timestamp` and `value`). The last line is the command's `result`.

```bash
stacktape metrics myApi Duration --stage prod --region eu-west-1 --agent \
  | jq -c 'select(.type == "log") | .message | fromjson? | .datapoints'
```

## Options


## CLI Options: `stacktape metrics`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `--metric (positional 2)` | yes | `string` | Metric Name — CloudWatch metric name (e.g., Invocations, Errors, CPUUtilization). | - |
| `-r, --region` | yes | `string` | AWS Region — The AWS region for the operation. For a list of available regions, see the [AWS documentation](https://docs.aws.amazon.com/general/latest/gr/rande.html). Inside a project whose config declares `region`, the flag is optional and overrides the config. | `us-east-2`, `us-east-1`, `us-west-1`, `us-west-2`, `ap-east-1`, `ap-south-1`, `ap-northeast-3`, `ap-northeast-2`, `ap-southeast-1`, `ap-southeast-2`, `ap-northeast-1`, `ca-central-1`, `eu-central-1`, `eu-west-1`, `eu-west-2`, `eu-west-3`, `eu-north-1`, `me-south-1`, `sa-east-1`, `af-south-1`, `eu-south-1` |
| `--resource-name (positional 1)` | yes | `string` | Resource Name — The name of the resource as defined in your Stacktape configuration. | - |
| `-s, --stage` | yes | `string` | Stage — The stage for the operation (e.g., `production`, `staging`, `dev-john`). You can set a default stage using the `defaults set` command. Stage names use lowercase letters, numbers and dashes, with at least 2 characters. The project name, a dash and the stage form the CloudFormation stack name, which can have at most 128 characters. Stacktape shortens an AWS resource name that would be too long and adds a hash. | - |
| `--aws-account` | no | `string` | AWS Account — The name of the AWS account to use for the operation. The account must first be connected in the [Stacktape Console](https://console.stacktape.com/aws-accounts). Without it, the account is chosen by `--profile`, `AWS_PROFILE` or AWS credentials in environment variables, then by your saved default, then by your organization's only connected account. `--aws-account` takes precedence over all of them, but AWS credentials in environment variables must then belong to that account. | - |
| `--until` | no | `number \| string` | End Time — The query end time; accepts JavaScript `Date` inputs and defaults to now. Relative `--since` counts back from it. Metrics, logs and Logs Insights enforce it. When following logs, it bounds the initial backlog, and following then continues beyond it. | - |
| `-h, --help` | no | `string` | Show Help — If provided, the command will not execute and will instead print help information. | - |
| `--log-level` | no | `string` | Log Level — The level of logs to print to the console. • `info`: Basic information about the operation. • `error`: Only errors. • `debug`: Detailed information for debugging. | `info`, `debug`, `error` |
| `--period` | no | `number` | Metric Period — Aggregation period in seconds (default: 300). | - |
| `-p, --profile` | no | `string` | AWS Profile — The AWS profile to use for the command. You can manage profiles using the `aws-profile:*` commands and set a default profile with `defaults set`. For commands that use a connected AWS account, `--profile` (or `AWS_PROFILE`) selects the connected account the profile belongs to, unless `--aws-account` is set. The command fails if that account is not connected. | - |
| `--project` | no | `string` | Project Name — The name of the Stacktape project for this operation. Commands that target a stack take it from `projectName` in the project's config when the flag is absent. | - |
| `--quiet` | no | `boolean` | Quiet — Hide progress, banners, success messages and hints. Command output, warnings and errors are still printed. | - |
| `--since` | no | `number \| string` | Start Time — The query start time: a relative duration such as `30m`, an ISO timestamp or a supported numeric date value. Relative durations count back from `--until` (now by default). | - |
| `--stat` | no | `string` | Metric Statistic — Statistic to retrieve: Sum, Average, Maximum, Minimum, p99 (default: Average). | - |


## Related commands

- [`logs`](/cli/logs) shows the requests and errors behind a number.
- [`alarm list`](/cli/alarm-list) shows which CloudWatch alarms of the stack are firing.
- [`container exec`](/cli/container-exec) runs a command in a deployed container.
