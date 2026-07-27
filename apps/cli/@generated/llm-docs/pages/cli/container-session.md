# container:session

The `container:session` command starts an interactive session inside a running container in your deployed stack. The session is established using ECS Exec and an SSM (Systems Manager) connection, giving you direct terminal access to debug, inspect files, or troubleshoot issues in a running container.

## Usage

Open a session by specifying the target stage, region, and resource name.

```bash
stacktape container:session --stage production --region eu-west-1 --resourceName myService
```

This opens an interactive session inside the container running in the specified resource. The target workload must be a deployed workload with an ECS task definition. Stacktape looks for running ECS tasks before opening the session. When multiple tasks are running, Stacktape prompts you to choose one.


> **Info:** This command does not require a Stacktape configuration file. It connects directly to the deployed stack using the `--stage`, `--region`, and `--resourceName` flags. Use optional stack arguments such as `--projectName`, `--awsAccount`, or `--profile` when your local defaults are not enough to identify the target stack or AWS credentials.


## Important flags

The two most commonly used optional flags are `--command` and `--container`. Both affect which process and which container you connect to.

**`--command`** specifies the command that starts the interactive session inside the container. Use it to select a specific shell (like `bash`). To run a one-shot command and capture its output non-interactively, use [`container:exec`](/cli/container-exec) instead.

Start a bash session:

```bash
stacktape container:session --stage production --region eu-west-1 --resourceName myService --command /bin/bash
```

**`--container`** selects a specific container in multi-container workloads. If the target workload has more than one container definition, specify the container name with `--container`. Stacktape raises an error and includes the available container names when multiple containers exist and `--container` is omitted, or when the specified name does not match any container in the workload.

```bash
stacktape container:session --stage production --region eu-west-1 --resourceName myWorkload --container nginx
```

## Multiple running instances

When the target resource has multiple running tasks (for example, a scaled-out web service), the CLI prompts you to choose which instance to connect to. Each option shows the task ID and its start time so you can identify the right one.

## Arguments reference


## CLI Options: `stacktape container:session`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `--region (-r)` | yes | `string` | AWS Region The AWS region for the operation. For a list of available regions, see the [AWS documentation](https://docs.aws.amazon.com/general/latest/gr/rande.html). | `us-east-2`, `us-east-1`, `us-west-1`, `us-west-2`, `ap-east-1`, `ap-south-1`, `ap-northeast-3`, `ap-northeast-2`, `ap-southeast-1`, `ap-southeast-2`, `ap-northeast-1`, `ca-central-1`, `eu-central-1`, `eu-west-1`, `eu-west-2`, `eu-west-3`, `eu-north-1`, `me-south-1`, `sa-east-1`, `af-south-1`, `eu-south-1` |
| `--resourceName (-rn)` | yes | `string` | Resource Name The name of the resource as defined in your Stacktape configuration. | - |
| `--stage (-s)` | yes | `string` | Stage The stage for the operation (e.g., `production`, `staging`, `dev-john`). You can set a default stage using the `defaults:configure` command. The maximum length is 12 characters. | - |
| `--agent (-ag)` | no | `boolean` | Agent Mode Optimizes CLI output for programmatic/LLM consumption: Uses strict JSONL/NDJSON output (one JSON object per line) Disables interactive terminal UI Automatically confirms operations (equivalent to --autoConfirmOperation) For dev command: also enables HTTP server for programmatic control. | - |
| `--awsAccount (-aa)` | no | `string` | AWS Account The name of the AWS account to use for the operation. The account must first be connected in the [Stacktape console](https://console.stacktape.com/aws-accounts). | - |
| `--command (-cmd)` | no | `string` | Command This argument has different meanings depending on the command: With `stacktape help`, it specifies a command to show detailed help for. With `stacktape container:session`, it specifies a command to run inside the container to start the interactive session. | - |
| `--configPath (-cp)` | no | `string` | Config File Path The path to your Stacktape configuration file, relative to the current working directory. | - |
| `--container (-cnt)` | no | `string` | Container Name The name of the container as defined in your container compute resource configuration. | - |
| `--currentWorkingDirectory (-cwd)` | no | `string` | Current Working Directory The working directory for the operation. All file paths in your configuration will be resolved relative to this directory. By default, this is the directory containing the configuration file. | - |
| `--help (-h)` | no | `string` | Show Help If provided, the command will not execute and will instead print help information. | - |
| `--logLevel (-ll)` | no | `string` | Log Level The level of logs to print to the console. `info`: Basic information about the operation. `error`: Only errors. `debug`: Detailed information for debugging. | `info`, `debug`, `error` |
| `--outputFormat (-ofmt)` | no | `string` | Output Format Controls the CLI output format: `jsonl`: Machine-readable NDJSON (one JSON object per line). Disables interactive UI. `plain`: Simple text output without colors or animations. Used automatically in CI or non-TTY environments. `tty`: Full interactive terminal UI with colors, spinners, and animations. Used automatically when a TTY is detected. If not specified, the format is auto-detected from the environment. --agent implies --outputFormat jsonl. | `jsonl`, `plain`, `tty` |
| `--profile (-p)` | no | `string` | AWS Profile The AWS profile to use for the command. You can manage profiles using the `aws-profile:*` commands and set a default profile with `defaults:configure`. | - |
| `--projectName (-prj)` | no | `string` | Project Name The name of the Stacktape project for this operation. | - |
| `--templateId (-ti)` | no | `string` | Template ID The ID of the template to download. You can find a list of available templates on the [Config Builder page](https://console.stacktape.com/templates). | - |


## Common errors

- **Resource cannot be resolved** — Stacktape throws an error when `--resourceName` does not match a deployed workload with an ECS task definition. Check that the resource name matches a deployed workload in the target stage and AWS region.
- **Multiple containers without `--container` flag** — The target workload has more than one container. The error message lists the available container names. Re-run the command with `--container` set to one of those names.

## Examples

The following examples show common `container:session` usage patterns across different workload types and configurations.

Inspect the filesystem of a running web service:

```bash
stacktape container:session --stage dev --region us-east-1 --resourceName apiServer
```

Connect to a specific container in a multi-container workload:

```bash
stacktape container:session --stage production --region eu-west-1 --resourceName myWorkload --container sidecar
```

Open a bash session:

```bash
stacktape container:session --stage staging --region us-west-2 --resourceName backend --command /bin/bash
```

## Related commands

- [`container:exec`](/cli/container-exec) — run a single command inside a container and return the output (non-interactive). Use this when you need to capture command output programmatically rather than open a live shell.
- [`bastion:session`](/cli/bastion-session) — start an interactive session on a [bastion host](/resources/security/bastion-host), useful for accessing private VPC resources.
- [`logs`](/cli/logs) — fetch and filter logs from deployed resources without opening a shell session.
