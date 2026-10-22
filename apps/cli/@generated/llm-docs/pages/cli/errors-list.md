# error list

The `error list` command retrieves detected runtime issues (errors) across your deployed functions and containers. It shows each issue's error message, type, function name, project, stage, occurrence count, status, and last occurrence timestamp. Use it to inspect error patterns and occurrence counts from the terminal.

## Usage

List all issues with default settings (returns up to 25 issues when no limit is provided):

```bash
stacktape error list
```

List open issues for a specific project and stage:

```bash
stacktape error list --project my-app --stage production --status OPEN
```

## Flags reference


## CLI Options: `stacktape error list`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `-h, --help` | no | `string` | Show Help — If provided, the command will not execute and will instead print help information. | - |
| `--status` | no | `string` | Issue Status Filter — Filter tracked errors by status (OPEN, RESOLVED, IGNORED). | `OPEN`, `RESOLVED`, `IGNORED` |
| `--limit` | no | `number` | Limit — Maximum number of items to return. | - |
| `--log-level` | no | `string` | Log Level — The level of logs to print to the console. • `info`: Basic information about the operation. • `error`: Only errors. • `debug`: Detailed information for debugging. | `info`, `debug`, `error` |
| `--project` | no | `string` | Project Name — The name of the Stacktape project for this operation. Commands that target a stack take it from `projectName` in the project's config when the flag is absent. | - |
| `--quiet` | no | `boolean` | Quiet — Hide progress, banners, success messages and hints. Command output, warnings and errors are still printed. | - |
| `-s, --stage` | no | `string` | Stage — The stage for the operation (e.g., `production`, `staging`, `dev-john`). You can set a default stage using the `defaults set` command. The maximum length is 12 characters. | - |


## Examples

Return up to 100 issues:

```bash
stacktape error list --limit 100
```

List only ignored issues:

```bash
stacktape error list --status IGNORED
```

Get JSON output for scripting or AI coding assistants. In agent mode, the command prints the returned issues as a pretty-printed JSON array instead of a table.

```bash
stacktape error list --agent --project my-app --stage production
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

When no limit is provided, the command requests 25 issues. Omit `--project`, `--stage`, or `--status` when you do not want to narrow by those fields.

## Related commands

- [`error resolve`](/cli/errors-resolve) — Mark an issue as resolved. The issue reopens automatically if the same error occurs again.
- [`error ignore`](/cli/errors-ignore) — Mark an issue as ignored. Ignored issues do not reopen on new occurrences and do not generate alerts.
- [`error reopen`](/cli/errors-reopen) — Reopen a resolved or ignored issue, setting its status back to OPEN.
- [`logs`](/cli/logs) — Fetch logs from a deployed resource to investigate root causes of issues.
