# project:create

The `project:create` command creates a new project in the current Stacktape organization. Use it before deploying stages under a new project name, or in automation when you need to create the project non-interactively. You must be logged in with a valid API key before running this command.

## Usage

```bash
stacktape project:create
```

In interactive mode, you are prompted for the project name. Project names must use lowercase letters, numbers, and dashes only. To skip the prompt, pass the name directly.

```bash
stacktape project:create --projectName my-api
```

In agent mode (`--agent`), you must provide `--projectName` explicitly. You can also pass an optional `--region` when creating the project.

## CLI reference


## CLI Options: `stacktape project:create`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `--agent (-ag)` | no | `boolean` | Agent Mode Optimizes CLI output for programmatic/LLM consumption: Uses strict JSONL/NDJSON output (one JSON object per line) Disables interactive terminal UI Automatically confirms operations (equivalent to --autoConfirmOperation) For dev command: also enables HTTP server for programmatic control. | - |
| `--logLevel (-ll)` | no | `string` | Log Level The level of logs to print to the console. `info`: Basic information about the operation. `error`: Only errors. `debug`: Detailed information for debugging. | `info`, `debug`, `error` |
| `--outputFormat (-ofmt)` | no | `string` | Output Format Controls the CLI output format: `jsonl`: Machine-readable NDJSON (one JSON object per line). Disables interactive UI. `plain`: Simple text output without colors or animations. Used automatically in CI or non-TTY environments. `tty`: Full interactive terminal UI with colors, spinners, and animations. Used automatically when a TTY is detected. If not specified, the format is auto-detected from the environment. --agent implies --outputFormat jsonl. | `jsonl`, `plain`, `tty` |
| `--projectName (-prj)` | no | `string` | Project Name The name of the Stacktape project for this operation. | - |
| `--region (-r)` | no | `string` | AWS Region The AWS region for the operation. For a list of available regions, see the [AWS documentation](https://docs.aws.amazon.com/general/latest/gr/rande.html). | `us-east-2`, `us-east-1`, `us-west-1`, `us-west-2`, `ap-east-1`, `ap-south-1`, `ap-northeast-3`, `ap-northeast-2`, `ap-southeast-1`, `ap-southeast-2`, `ap-northeast-1`, `ca-central-1`, `eu-central-1`, `eu-west-1`, `eu-west-2`, `eu-west-3`, `eu-north-1`, `me-south-1`, `sa-east-1`, `af-south-1`, `eu-south-1` |


## Examples

Create a project interactively (you will be prompted for the name):

```bash
stacktape project:create
```

Create a project non-interactively:

```bash
stacktape project:create --projectName payments-service
```

Create a project with a region and machine-readable output:

```bash
stacktape project:create --projectName payments-service --region eu-west-1 --agent
```

## Related commands

- [`project:list`](/cli/project-list) — List all projects in your organization with their stages and costs.
- [`org:create`](/cli/org-create) — Create a new organization (projects live inside organizations).
- [`deploy`](/cli/deploy) — Deploy a stage to a project.
