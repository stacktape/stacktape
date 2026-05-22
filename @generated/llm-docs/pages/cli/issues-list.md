# issues:list

The `issues:list` command retrieves detected runtime issues (errors) across your deployed functions and containers. It shows each issue's error message, type, function name, project, stage, occurrence count, status, and last occurrence timestamp. Use it to inspect error patterns and occurrence counts from the terminal.

## Usage

List all issues with default settings (returns up to 25 issues when no limit is provided):

```bash
stacktape issues:list
```

List open issues for a specific project and stage:

```bash
stacktape issues:list --projectName my-app --stage production --issueStatus OPEN
```

## Flags reference


## CLI Options: `stacktape issues:list`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `--agent (-ag)` | no | `boolean` | Agent Mode Optimizes CLI output for programmatic/LLM consumption:

Uses strict JSONL/NDJSON output (one JSON object per line)
Disables interactive terminal UI
Automatically confirms operations (equivalent to --autoConfirmOperation)
For dev command: also enables HTTP server for programmatic control. | - |
| `--issueStatus (-is)` | no | `string` | Issue Status Filter Filter issues by status (OPEN, RESOLVED, IGNORED). | `OPEN`, `RESOLVED`, `IGNORED` |
| `--limit (-lim)` | no | `number` | Limit Maximum number of items to return. | - |
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
| `--stage (-s)` | no | `string` | Stage The stage for the operation (e.g., `production`, `staging`, `dev-john`). You can set a default stage using the `defaults:configure` command. The maximum length is 12 characters. | - |


## Examples

Return up to 100 issues:

```bash
stacktape issues:list --limit 100
```

List only ignored issues:

```bash
stacktape issues:list --issueStatus IGNORED
```

Get JSON output for scripting or AI coding assistants. In agent mode, the command prints the returned issues as a pretty-printed JSON array instead of a table.

```bash
stacktape issues:list --agent --projectName my-app --stage production
```

## Output

In interactive mode, the command prints a table with the following columns:

| Column    | Description                                                        |
| --------- | ------------------------------------------------------------------ |
| ID        | Unique issue identifier (used with other issue commands)           |
| Status    | `OPEN`, `RESOLVED`, or `IGNORED`                                   |
| Error     | Truncated error message (up to 60 characters)                      |
| Type      | Error type or class name                                           |
| Function  | Name of the function or container that produced the error          |
| Project   | Project name                                                       |
| Stage     | Stage name                                                         |
| Count     | Total number of occurrences                                        |
| Last seen | Timestamp of the most recent occurrence                            |

When no limit is provided, the command requests 25 issues. Omit `--projectName`, `--stage`, or `--issueStatus` when you do not want to narrow by those fields.

## Related commands

- [`issues:resolve`](/cli/issues-resolve) — Mark an issue as resolved. The issue reopens automatically if the same error occurs again.
- [`issues:ignore`](/cli/issues-ignore) — Mark an issue as ignored. Ignored issues do not reopen on new occurrences and do not generate alerts.
- [`issues:reopen`](/cli/issues-reopen) — Reopen a resolved or ignored issue, setting its status back to OPEN.
- [`debug:logs`](/cli/debug-logs) — Fetch logs from a deployed resource to investigate root causes of issues.
