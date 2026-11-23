# container exec

`stacktape container exec` runs one command inside a running container of a deployed [web service](/resources/compute/web-service), [private service](/resources/compute/private-service), [worker service](/resources/compute/worker-service) or [multi-container workload](/resources/compute/multi-container-workload), and prints its output as JSON. Use it to check a file, an environment variable or a process without opening a shell. It needs AWS credentials, connects through AWS ECS Exec and Session Manager (no SSH keys or open ports), and doesn't need a config file.

For an interactive shell, use [`container shell`](/cli/container-session).

## Usage

The resource name comes first, then the command in quotes:

```bash
stacktape container exec myService "ls -la /app" --stage prod --region eu-west-1
```

```json
{
  "resourceName": "myService",
  "containerName": "myService",
  "taskArn": "arn:aws:ecs:eu-west-1:123456789012:task/cluster/abc123",
  "command": "ls -la /app",
  "output": "total 24\ndrwxr-xr-x 1 root root 4096 ...",
  "exitCode": 0
}
```

`output` is what the command printed: its standard output, or its error output when it printed nothing else. `exitCode` is the exit code of the Session Manager session, not of your command. `0` means the session ran, so read `output` to see whether the command worked. A non-zero `exitCode` fails the CLI with `CONTAINER_EXEC_FAILED`. A command that runs longer than 60 seconds is stopped.

Outside a project directory, add `--project` or set a default project with [`defaults set`](/cli/defaults-configure).

Changes the command makes in the container, such as written files, are lost when the task is replaced, for example on the next deploy.

## Pick the task and the container

A service scaled to several tasks runs the command in the first running task of the service. One-off tasks, such as a running [release command](/deployment-and-lifecycle/release-commands), are never picked. Pick another task with `--task-arn`, the full ARN or only the task ID:

```bash
stacktape container exec apiService "ps aux" --stage prod --region eu-west-1 --task-arn abc123def
```

A workload with more than one container, such as a [multi-container workload](/resources/compute/multi-container-workload) with a sidecar, needs `--container`:

```bash
stacktape container exec myWorkload "cat /var/log/sidecar.log" --stage prod --region eu-west-1 --container sidecar
```

## Use it in a script

With `--agent`, the command prints NDJSON: one JSON object per line. The JSON above arrives as text in the `message` of a `log` line, and the last line is the command's `result`. To read `output`, select the log line and parse its message:

```bash
stacktape container exec apiService "cat /app/version.txt" --stage prod --region eu-west-1 --agent \
  | jq -r 'select(.type == "log") | .message | fromjson? | .output'
```

## Common errors

### Resource is not a deployed container workload

The name doesn't match a deployed web service, private service, worker service or multi-container workload in the stage. Check the name in your config and that the stage is deployed.

### Resource contains multiple containers

The task has more than one container, or none with the name you passed. The error lists their names; run again with `--container <name>`.

### No running task was found

The service has no running task, for example while a deployment is still starting it. Wait for a task to start, or check the service in the Console or the AWS ECS console.

### Resource does not have a deployed ECS service

The stage is a dev stack. Dev mode runs containers on your machine, so there is nothing to connect to in AWS. Run the command against a deployed stage.

### Task was not found

The `--task-arn` value doesn't match a running task. The error lists the task IDs you can use.

## Options


## CLI Options: `stacktape container exec`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `--command (positional 2)` | yes | `string` | Command — This argument has different meanings depending on the command: • With `stacktape help`, it specifies a command to show detailed help for. • With `stacktape container shell`, it specifies a command to run inside the container to start the interactive session. | - |
| `-r, --region` | yes | `string` | AWS Region — The AWS region for the operation. For a list of available regions, see the [AWS documentation](https://docs.aws.amazon.com/general/latest/gr/rande.html). Inside a project whose config declares `region`, the flag is optional and overrides the config. | `us-east-2`, `us-east-1`, `us-west-1`, `us-west-2`, `ap-east-1`, `ap-south-1`, `ap-northeast-3`, `ap-northeast-2`, `ap-southeast-1`, `ap-southeast-2`, `ap-northeast-1`, `ca-central-1`, `eu-central-1`, `eu-west-1`, `eu-west-2`, `eu-west-3`, `eu-north-1`, `me-south-1`, `sa-east-1`, `af-south-1`, `eu-south-1` |
| `--resource-name (positional 1)` | yes | `string` | Resource Name — The name of the resource as defined in your Stacktape configuration. | - |
| `-s, --stage` | yes | `string` | Stage — The stage for the operation (e.g., `production`, `staging`, `dev-john`). You can set a default stage using the `defaults set` command. Stage names use lowercase letters, numbers and dashes, with at least 2 characters. The project name, a dash and the stage form the CloudFormation stack name, which can have at most 128 characters. Stacktape shortens an AWS resource name that would be too long and adds a hash. | - |
| `--aws-account` | no | `string` | AWS Account — The name of the AWS account to use for the operation. The account must first be connected in the [Stacktape Console](https://console.stacktape.com/aws-accounts). Without it, the account is chosen by `--profile`, `AWS_PROFILE` or AWS credentials in environment variables, then by your saved default, then by your organization's only connected account. `--aws-account` takes precedence over all of them, but AWS credentials in environment variables must then belong to that account. | - |
| `-c, --config` | no | `string` | Config File Path — The path to your Stacktape configuration file, relative to the current working directory. Without it, Stacktape uses the one `stacktape.ts`, `stacktape.yml`, `stacktape.yaml` or `stacktape.js` in the working directory. When there are several, the command stops and asks you to choose one with this option. | - |
| `--container` | no | `string` | Container Name — The name of the container as defined in your container compute resource configuration. | - |
| `--cwd` | no | `string` | Current Working Directory — The working directory for the operation. All file paths in your configuration will be resolved relative to this directory. By default, this is the directory containing the configuration file. | - |
| `-h, --help` | no | `string` | Show Help — If provided, the command will not execute and will instead print help information. | - |
| `--log-level` | no | `string` | Log Level — The level of logs to print to the console. • `info`: Basic information about the operation. • `error`: Only errors. • `debug`: Detailed information for debugging. | `info`, `debug`, `error` |
| `-p, --profile` | no | `string` | AWS Profile — The AWS profile to use for the command. You can manage profiles using the `aws-profile:*` commands and set a default profile with `defaults set`. For commands that use a connected AWS account, `--profile` (or `AWS_PROFILE`) selects the connected account the profile belongs to, unless `--aws-account` is set. The command fails if that account is not connected. | - |
| `--project` | no | `string` | Project Name — The name of the Stacktape project for this operation. Commands that target a stack take it from `projectName` in the project's config when the flag is absent. | - |
| `--quiet` | no | `boolean` | Quiet — Hide progress, banners, success messages and hints. Command output, warnings and errors are still printed. | - |
| `--task-arn` | no | `string` | Task ARN — Specific ECS task ARN to connect to. | - |


## Related commands

- [`container shell`](/cli/container-session) opens an interactive shell in a running container.
- [`logs`](/cli/logs) shows what the container printed.
- [`metrics`](/cli/metrics) shows CloudWatch metrics of a deployed resource.
