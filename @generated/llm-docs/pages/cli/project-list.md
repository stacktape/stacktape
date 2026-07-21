# project:list

The `project:list` command lists all projects in your current organization along with their deployed stages, deployment status, and monthly costs. Use it to review projects in your organization, see deployed and undeployed stage counts, spot in-progress or errored stages, and compare current and previous month costs.

## Usage

```bash
stacktape project:list
```

The command requires no arguments. You must be [logged in](/cli/login) to Stacktape, and the output reflects the organization your CLI session is scoped to. Run [`info:whoami`](/cli/info-whoami) to verify which organization you're authenticated against.

## Output

The `project:list` command prints a summary table followed by per-project detail. The summary table includes these columns:

| Column | Description |
|---|---|
| **Project** | The project name. |
| **Stages** | Total stage count with deployed count in parentheses — e.g. `3 (2 deployed)`. |
| **In Progress** | Number of stages with a deployment currently running. |
| **Errored** | Number of stages in an error state. |
| **This Month** | Aggregated cost across all stages for the current month. |
| **Prev Month** | Aggregated cost across all stages for the previous month. |

Projects are sorted by most recent stage activity first, then alphabetically by name. Costs use the currency code returned with stage cost data; when no current-month currency code is present, the command falls back to USD.

## CI and agent usage

In CI pipelines or when consumed by AI coding agents, pass `--agent` to get machine-readable JSONL output instead of the interactive table. The `--outputFormat` flag provides finer control over formatting.

List projects as JSONL for scripting:

```bash
stacktape project:list --agent
```

Use plain text output (no colors or animations):

```bash
stacktape project:list --outputFormat plain
```

## Flags reference


## CLI Options: `stacktape project:list`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `--agent (-ag)` | no | `boolean` | Agent Mode Optimizes CLI output for programmatic/LLM consumption: Uses strict JSONL/NDJSON output (one JSON object per line) Disables interactive terminal UI Automatically confirms operations (equivalent to --autoConfirmOperation) For dev command: also enables HTTP server for programmatic control. | - |
| `--logLevel (-ll)` | no | `string` | Log Level The level of logs to print to the console. `info`: Basic information about the operation. `error`: Only errors. `debug`: Detailed information for debugging. | `info`, `debug`, `error` |
| `--outputFormat (-ofmt)` | no | `string` | Output Format Controls the CLI output format: `jsonl`: Machine-readable NDJSON (one JSON object per line). Disables interactive UI. `plain`: Simple text output without colors or animations. Used automatically in CI or non-TTY environments. `tty`: Full interactive terminal UI with colors, spinners, and animations. Used automatically when a TTY is detected. If not specified, the format is auto-detected from the environment. --agent implies --outputFormat jsonl. | `jsonl`, `plain`, `tty` |


## Examples

Check all projects and their cost at a glance:

```bash
stacktape project:list
```

Pipe JSONL output into `jq` for scripting:

```bash
stacktape project:list --agent | jq .
```

Suppress info-level CLI log messages, showing only errors from the CLI framework itself:

```bash
stacktape project:list --logLevel error
```

## Related commands

- [`project:create`](/cli/project-create) — create a new project in the current organization.
- [`org:list`](/cli/org-list) — list organizations accessible with your current user.
- [`info:whoami`](/cli/info-whoami) — verify which user and organization your CLI session is scoped to.
