# issues:reopen

The `issues:reopen` command sets a previously resolved or ignored issue back to OPEN status. It is most useful for ignored issues, which do not auto-reopen on new occurrences — manual reopening is required to restore them to active tracking. You can also reopen a resolved issue before waiting for the next automatic reopen on error recurrence, or when a teammate resolved an issue prematurely. Once reopened, the issue appears in [`issues:list`](/cli/issues-list) with OPEN status.

## Usage

The `issues:reopen` command takes one required flag, `--issueId`, to identify the issue to reopen. It requires a valid Stacktape API key (configured via [`stacktape login`](/cli/login)).

```bash
stacktape issues:reopen --issueId iss_abc123def456
```

On success, the command calls the Stacktape API and prints `Issue <issueId> reopened.`

## Examples

Reopen an issue by its ID:

```bash
stacktape issues:reopen --issueId iss_abc123def456
```

Reopen using the short alias:

```bash
stacktape issues:reopen -iid iss_abc123def456
```

Reopen in agent mode for programmatic consumption:

```bash
stacktape issues:reopen --issueId iss_abc123def456 --agent
```

## Arguments reference

The table below lists all accepted flags for `issues:reopen`.


## CLI Options: `stacktape issues:reopen`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `--issueId (-iid)` | yes | `string` | Issue ID The ID of the issue to act on. | - |
| `--agent (-ag)` | no | `boolean` | Agent Mode Optimizes CLI output for programmatic/LLM consumption: Uses strict JSONL/NDJSON output (one JSON object per line) Disables interactive terminal UI Automatically confirms operations (equivalent to --autoConfirmOperation) For dev command: also enables HTTP server for programmatic control. | - |
| `--logLevel (-ll)` | no | `string` | Log Level The level of logs to print to the console. `info`: Basic information about the operation. `error`: Only errors. `debug`: Detailed information for debugging. | `info`, `debug`, `error` |
| `--outputFormat (-ofmt)` | no | `string` | Output Format Controls the CLI output format: `jsonl`: Machine-readable NDJSON (one JSON object per line). Disables interactive UI. `plain`: Simple text output without colors or animations. Used automatically in CI or non-TTY environments. `tty`: Full interactive terminal UI with colors, spinners, and animations. Used automatically when a TTY is detected. If not specified, the format is auto-detected from the environment. --agent implies --outputFormat jsonl. | `jsonl`, `plain`, `tty` |


## Related commands

The issue lifecycle commands — list, resolve, ignore, and reopen — let you triage runtime issues from the CLI.

- [`issues:list`](/cli/issues-list) — List detected runtime issues with their error message, type, function name, project/stage, occurrence count, and status.
- [`issues:resolve`](/cli/issues-resolve) — Mark an issue as resolved. It will reopen automatically if the same error occurs again.
- [`issues:ignore`](/cli/issues-ignore) — Mark an issue as ignored. Ignored issues do not reopen on new occurrences.
