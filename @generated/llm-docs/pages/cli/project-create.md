# project:create

The `project:create` command registers a new project in your current Stacktape organization. Projects group related stages (deployments) and provide cost tracking, access control, and GitOps configuration in the Stacktape Console. You must be logged in with a valid API key before running this command.

## Usage

```bash
stacktape project:create
```

In interactive mode, you are prompted for the project name. To skip the prompt, pass the name directly.

```bash
stacktape project:create --projectName my-api
```

## Important flags

**`--projectName`** — The name for the new project. Must use only lowercase letters, numbers, and dashes (e.g. `my-backend-api`). In agent mode (`--agent`), this flag is required.

**`--region`** — An optional AWS region to associate with the project. This does not restrict where stages can be deployed, but sets a default region context for the project in the Console.

**`--agent`** — Enables agent/programmatic mode. Disables interactive prompts and outputs strict JSONL. When using `--agent`, you must provide `--projectName` explicitly.

## Naming rules

Project names must be lowercase alphanumeric with dashes only (regex: `^[a-z0-9-]+$`). Names like `my-app`, `backend-v2`, or `analytics` are valid. Names containing uppercase letters, underscores, spaces, or special characters are rejected.

## Examples

Create a project interactively (you will be prompted for the name):

```bash
stacktape project:create
```

Create a project non-interactively:

```bash
stacktape project:create --projectName payments-service
```

Create a project with a default region and machine-readable output:

```bash
stacktape project:create --projectName payments-service --region eu-west-1 --agent
```

## CLI reference


## CLI Options: `stacktape project:create`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `--agent (-ag)` | no | `boolean` | Agent Mode Optimizes CLI output for programmatic/LLM consumption:

Uses strict JSONL/NDJSON output (one JSON object per line)
Disables interactive terminal UI
Automatically confirms operations (equivalent to --autoConfirmOperation)
For dev command: also enables HTTP server for programmatic control. | - |
| `--logLevel (-ll)` | no | `string` | Log Level The level of logs to print to the console.

`info`: Basic information about the operation.
`error`: Only errors.
`debug`: Detailed information for debugging. | `info`, `debug`, `error` |
| `--outputFormat (-ofmt)` | no | `string` | Output Format Controls the CLI output format:

`jsonl`: Machine-readable NDJSON (one JSON object per line). Disables interactive UI.
`plain`: Simple text output without colors or animations. Used automatically in CI or non-TTY environments.
`tty`: Full interactive terminal UI with colors, spinners, and animations. Used automatically when a TTY is detected.
If not specified, the format is auto-detected from the environment. --agent implies --outputFormat jsonl. | `jsonl`, `plain`, `tty` |
| `--projectName (-prj)` | no | `string` | Project Name The name of the Stacktape project for this operation. | - |
| `--region (-r)` | no | `string` | AWS Region The AWS region for the operation. For a list of available regions, see the [AWS documentation](https://docs.aws.amazon.com/general/latest/gr/rande.html). | `us-east-2`, `us-east-1`, `us-west-1`, `us-west-2`, `ap-east-1`, `ap-south-1`, `ap-northeast-3`, `ap-northeast-2`, `ap-southeast-1`, `ap-southeast-2`, `ap-northeast-1`, `ca-central-1`, `eu-central-1`, `eu-west-1`, `eu-west-2`, `eu-west-3`, `eu-north-1`, `me-south-1`, `sa-east-1`, `af-south-1`, `eu-south-1` |


## Related commands

- [`projects:list`](/cli/projects-list) — List all projects in your organization with their stages and costs.
- [`org:create`](/cli/org-create) — Create a new organization (projects live inside organizations).
- [`deploy`](/cli/deploy) — Deploy a stage to a project.
- [`info:whoami`](/cli/info-whoami) — Verify your current user, organization, and accessible projects.
