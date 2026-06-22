# container:exec

The `container:exec` command runs a one-off command inside a deployed container workload and returns the output as structured JSON. Use it to inspect files, check environment variables, run health checks, or execute diagnostic commands against [web services](/resources/compute/web-service), [private services](/resources/compute/private-service), [worker services](/resources/compute/worker-service), or [multi-container workloads](/resources/compute/multi-container-workload) without opening an interactive shell.

## When to use

Use `container:exec` when you need a quick, non-interactive answer from a running container — checking a config file, listing directory contents, printing environment variables, or verifying a process is running. The structured JSON output makes it suitable for scripting and automation.

For an interactive shell session (debugging, exploring, running multiple commands), use [`container:session`](/cli/container-session) instead. For viewing application logs, use [`stacktape logs`](/cli/logs).

## Usage

The command requires four flags: `--stage`, `--region`, `--resourceName`, and `--command`.

```bash
stacktape container:exec --stage prod --region eu-west-1 --resourceName myService --command "ls -la /app"
```

The `container:exec` command does not require a Stacktape configuration file. It resolves the target stack from the `--stage`, `--region`, and `--projectName` (or `--awsAccount`) flags. You can run it from any directory, even outside a configured project. If you have not configured a default project with [`defaults:configure`](/cli/defaults-configure), include `--projectName` to identify the stack.

The command prints a JSON object with the execution result:

```json
{
  "resourceName": "myService",
  "containerName": "myService",
  "taskArn": "arn:aws:ecs:eu-west-1:123456789:task/cluster/abc123",
  "command": "ls -la /app",
  "output": "total 24\ndrwxr-xr-x 1 root root 4096 ...",
  "exitCode": 0
}
```

The `output` field contains the command output returned by Stacktape's ECS Exec helper. The `exitCode` field reflects the command's exit code — `0` for success, non-zero for failure.

## Important flags

**`--command`** (required, alias: `--cmd`) — The shell command to execute inside the container. Wrap multi-word commands in quotes.

**`--resourceName`** (required, alias: `--rn`) — The name of the container workload resource as defined in your Stacktape configuration.

**`--container`** (alias: `--cnt`) — Specifies which container to run the command in. When the task definition has one container, Stacktape uses that container when `--container` is omitted. For resources with multiple containers (e.g., a [multi-container workload](/resources/compute/multi-container-workload) with sidecars), omitting this flag or specifying a name not in the task definition causes the command to fail with an error listing the available container names.

**`--taskArn`** (alias: `--ta`) — Target a specific ECS task when multiple instances are running (e.g., a scaled-out service). Accepts either a full ARN or just the task ID suffix. Defaults to the first running task if omitted.

**`--agent`** (alias: `--ag`) — A global CLI flag that optimizes output for programmatic and AI-agent consumption. Switches output to strict JSONL format and disables the interactive terminal UI.

## Command reference

<CliCommandsApiReference command="container:exec" sortedArgs={[
  {
    "name": "command",
    "required": true,
    "alias": "cmd",
    "allowedTypes": [
      "string"
    ],
    "shortDescription": "<p> Command</p>\n",
    "longDescription": "<p>This argument has different meanings depending on the command:</p>\n<ul>\n<li>With <code>stacktape help</code>, it specifies a command to show detailed help for.</li>\n<li>With <code>stacktape container:session</code>, it specifies a command to run inside the container to start the interactive session.</li>\n</ul>\n"
  },
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
    "name": "taskArn",
    "required": false,
    "alias": "ta",
    "allowedTypes": [
      "string"
    ],
    "shortDescription": "<p> Task ARN</p>\n",
    "longDescription": "<p>Specific ECS task ARN to connect to.</p>\n"
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

## Examples

### Inspect a configuration file

```bash
stacktape container:exec --stage prod --region eu-west-1 --resourceName apiService --command "cat /app/config.json"
```

### Check environment variables

```bash
stacktape container:exec --stage prod --region eu-west-1 --resourceName apiService --command "env"
```

### Target a specific task in a scaled-out service

When a service has multiple running tasks (scaled beyond one instance), use `--taskArn` to target a specific one. You can use the short task ID instead of the full ARN.

```bash
stacktape container:exec --stage prod --region eu-west-1 --resourceName apiService --taskArn abc123def --command "ps aux"
```

### Target a specific container in a multi-container workload

For [multi-container workloads](/resources/compute/multi-container-workload) with multiple containers, specify which container to execute in.

```bash
stacktape container:exec --stage prod --region eu-west-1 --resourceName myWorkload --container sidecar --command "cat /var/log/sidecar.log"
```

### Use in scripts or CI pipelines

The JSON output can be parsed with `jq` or similar tools. Use `--agent` for machine-readable output in scripts.

```bash
stacktape container:exec --stage prod --region eu-west-1 --resourceName apiService --command "cat /app/version.txt" --agent | jq -r '.output'
```

## Common errors

### Resource is not a container workload

The `--resourceName` you specified doesn't match any deployed ECS-based container workload. Verify the resource name matches your Stacktape configuration and that the stage has been deployed. Only [web services](/resources/compute/web-service), [private services](/resources/compute/private-service), [worker services](/resources/compute/worker-service), and [multi-container workloads](/resources/compute/multi-container-workload) are supported.

### Multiple containers require the `--container` flag

The target resource has multiple containers in its task definition. The error lists the available container names. Re-run the command with `--container <name>` to select one.

### No running tasks found

The ECS service has no running tasks. Wait for tasks to start or check the ECS service status. This can happen if the service has not finished deploying, or if the resource is a dev stack without running containers.

### Task not found

The `--taskArn` you specified doesn't match any running task. The error lists the available task IDs you can use instead.

## Related commands

| Command | Purpose |
|---------|---------|
| [`container:session`](/cli/container-session) | Start an interactive shell session inside a running container |
| [`logs`](/cli/logs) | Fetch and filter logs from a deployed resource |
| [`metrics`](/cli/metrics) | View CloudWatch metrics for a deployed resource |
| [`bastion:tunnel`](/cli/bastion-tunnel) | Create a secure tunnel to a VPC resource through a bastion host |

## FAQ

### What is the difference between `container:exec` and `container:session`?

`container:exec` runs a single command non-interactively and returns the output as structured JSON — ideal for scripting, CI pipelines, and AI agent workflows. [`container:session`](/cli/container-session) opens an interactive shell session where you can type multiple commands in real time. Use `container:exec` when you know exactly what you need; use `container:session` when you need to explore or debug interactively.

### Which resource types work with `container:exec`?

Any ECS-based container workload works: [web services](/resources/compute/web-service), [private services](/resources/compute/private-service), [worker services](/resources/compute/worker-service), and [multi-container workloads](/resources/compute/multi-container-workload). Lambda functions and other non-container resources are not supported — the command validates the target is an ECS-based resource before proceeding.

### Does `container:exec` modify the running container?

The command can execute any shell command, including ones that write files or change state inside the container. However, ECS tasks run on ephemeral compute (AWS Fargate or EC2 instances managed by ECS). Any filesystem changes are lost when the task restarts or is replaced during a deployment. Do not rely on `container:exec` for persistent configuration changes.

### How does `container:exec` connect to the container?

Stacktape runs the command using AWS ECS Exec through the SSM session-manager-plugin. In AWS, ECS Exec uses Systems Manager Session Manager rather than SSH — no SSH keys or open ports are required.
