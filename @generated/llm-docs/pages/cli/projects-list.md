# projects:list

The `projects:list` command shows every project in your current organization along with its deployed stages, deployment status, and monthly costs. Use it to get a quick overview of what's running across your AWS account — which stages are healthy, which are mid-deploy or errored, and how much each project costs.

## Usage

```bash
stacktape projects:list
```

The command requires no flags. It reads your current API key to determine the organization and fetches all projects with their stages.

## Output

The output is a summary table with the following columns:

| Column | Description |
|---|---|
| **Project** | Project name |
| **Stages** | Total stage count (deployed + undeployed), with deployed count shown separately |
| **In Progress** | Number of stages with a deployment currently running |
| **Errored** | Number of stages in an error state |
| **This Month** | Aggregated cost across all stages for the current month |
| **Prev Month** | Aggregated cost across all stages for the previous month |

Projects are sorted by most recently updated stage first, then alphabetically by name. Costs are displayed in the currency configured for your account (defaults to USD). After the summary table, each project's stages are listed with additional detail.

## Examples

List all projects in your organization:

```bash
stacktape projects:list
```

Use JSON output for scripting or piping to other tools:

```bash
stacktape projects:list --outputFormat jsonl
```

Increase log verbosity to debug connection or API key issues:

```bash
stacktape projects:list --logLevel debug
```


> **Info:** You must be logged in with a valid API key before running this command. Use [`stacktape login`](/cli/login) to configure your API key.


## Flags reference


## CLI Options: `stacktape projects:list`

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


## Related commands

- [`project:create`](/cli/project-create) — create a new project in your organization.
- [`info:stacks`](/cli/info-stacks) — list all CloudFormation stacks deployed in a specific region.
- [`info:stack`](/cli/info-stack) — get detailed information about a single deployed stack.
- [`info:whoami`](/cli/info-whoami) — verify your current user, organization, and accessible projects.
- [`org:list`](/cli/org-list) — list all organizations your user can access.
