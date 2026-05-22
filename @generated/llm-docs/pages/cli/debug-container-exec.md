# debug:container-exec

The `stacktape debug:container-exec` command executes a shell command inside a running container workload and returns the output as structured JSON. Use it to inspect file systems, check environment variables, run diagnostic scripts, or verify application state in deployed [web services](/resources/compute/web-service), [private services](/resources/compute/private-service), [worker services](/resources/compute/worker-service), and [multi-container workloads](/resources/compute/multi-container-workload) — without opening an interactive session.

## Usage

The command connects to a running ECS task using ECS Exec, runs your command, and returns structured JSON containing the result and exit code.

```bash
stacktape debug:container-exec --stage prod --region eu-west-1 --resourceName myService --command "ls -la /app"
```


## CLI Options: `stacktape debug:container-exec`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `--command (-cmd)` | yes | `string` | Command This argument has different meanings depending on the command:

With `stacktape help`, it specifies a command to show detailed help for.
With `stacktape container:session`, it specifies a command to run inside the container to start the interactive session. | - |
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
| `--container (-cnt)` | no | `string` | Container Name The name of the container as defined in your container compute resource configuration. | - |
| `--currentWorkingDirectory (-cwd)` | no | `string` | Current Working Directory The working directory for the operation. All file paths in your configuration will be resolved relative to this directory. By default, this is the directory containing the configuration file. | - |
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
| `--taskArn (-ta)` | no | `string` | Task ARN Specific ECS task ARN to connect to. | - |
| `--templateId (-ti)` | no | `string` | Template ID The ID of the template to download. You can find a list of available templates on the [Config Builder page](https://console.stacktape.com/templates). | - |


## Output format

The `debug:container-exec` command returns structured JSON containing the command result, the target container, and the exit code. This makes it suitable for scripting, CI pipelines, and AI agent workflows.

```json
{
  "resourceName": "myService",
  "containerName": "myService",
  "taskArn": "arn:aws:ecs:eu-west-1:123456789:task/cluster/abc123",
  "command": "ls -la /app",
  "output": "total 24\ndrwxr-xr-x 4 root root ...",
  "exitCode": 0
}
```


> **Info:** This command does not deploy, update, or delete Stacktape resources. However, the command you run inside the container can modify the container filesystem or application state. Treat it like any shell command run against a live system — read-only diagnostics are safest for production workloads.


## Examples

Check environment variables in a running service:

```bash
stacktape debug:container-exec --stage prod --region eu-west-1 --resourceName apiService --command "env"
```

Read a configuration file:

```bash
stacktape debug:container-exec --stage prod --region eu-west-1 --resourceName apiService --command "cat /app/config.json"
```

Target a specific task when multiple instances are running. You can pass the full ARN or just the task ID suffix:

```bash
stacktape debug:container-exec --stage prod --region eu-west-1 --resourceName apiService --taskArn abc123def --command "ps aux"
```

Execute a command in a specific container of a multi-container workload. If the task definition has exactly one container, Stacktape uses that container automatically. If there are multiple containers, pass `--container`:

```bash
stacktape debug:container-exec --stage prod --region eu-west-1 --resourceName myWorkload --container sidecar --command "curl localhost:8080/health"
```

Check disk usage:

```bash
stacktape debug:container-exec --stage prod --region eu-west-1 --resourceName apiService --command "df -h"
```

## When to use debug:container-exec vs container:session

Use `debug:container-exec` when you need to run a single command and capture its output programmatically — in CI scripts, from an AI agent, or when you want structured JSON results. The output is machine-parseable and the command exits immediately after execution.

Use [`container:session`](/cli/container-session) when you need an interactive shell session for hands-on debugging — exploring the file system, running multiple commands in sequence, or troubleshooting interactively.

## Common errors

**No running tasks.** If the resource has no running tasks, the command fails with `No running tasks found for this resource`. Wait for tasks to start or check the ECS service status in the Stacktape Console.

**Container selection required.** If the workload's task definition has more than one container and `--container` is omitted, Stacktape raises a container-selection error listing the available container names. Pass `--container <name>` to resolve.

**Task not found.** If you specify a `--taskArn` that doesn't match any running task, Stacktape fails and prints the available task IDs so you can retry with the correct one.

**Resource not found.** If `--resourceName` doesn't match a deployed container workload with an ECS service, the command fails. Verify the resource name matches your Stacktape configuration and that the stack is fully deployed (not a dev-mode-only stack).

## Related commands

- [`container:session`](/cli/container-session) — Open an interactive shell session inside a running container.
- [`debug:logs`](/cli/debug-logs) — Fetch and filter logs from a deployed resource.
- [`debug:metrics`](/cli/debug-metrics) — View CloudWatch metrics for a deployed resource.
