# issues:resolve

The `issues:resolve` command marks a runtime issue as resolved. Stacktape marks the issue as resolved, and if the same error occurs again in your deployed functions or containers, Stacktape reopens it automatically — acting as a regression detector. Resolve an issue after deploying a fix to keep your issues list focused on unresolved problems. If you want new occurrences to stay ignored and stop generating alerts, use [`issues:ignore`](/cli/issues-ignore) instead.

## Usage

```bash
stacktape issues:resolve --issueId iss_abc123def456
```

You need the issue ID. Use [`issues:list`](/cli/issues-list) to list detected runtime issues before resolving one.

## Flags reference

The only required flag is `--issueId`. Use [`issues:list`](/cli/issues-list) to find the ID of the issue you want to resolve.


## CLI Options: `stacktape issues:resolve`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `--issueId (-iid)` | yes | `string` | Issue ID The ID of the issue to act on. | - |
| `--agent (-ag)` | no | `boolean` | Agent Mode Optimizes CLI output for programmatic/LLM consumption: Uses strict JSONL/NDJSON output (one JSON object per line) Disables interactive terminal UI Automatically confirms operations (equivalent to --autoConfirmOperation) For dev command: also enables HTTP server for programmatic control. | - |
| `--logLevel (-ll)` | no | `string` | Log Level The level of logs to print to the console. `info`: Basic information about the operation. `error`: Only errors. `debug`: Detailed information for debugging. | `info`, `debug`, `error` |
| `--outputFormat (-ofmt)` | no | `string` | Output Format Controls the CLI output format: `jsonl`: Machine-readable NDJSON (one JSON object per line). Disables interactive UI. `plain`: Simple text output without colors or animations. Used automatically in CI or non-TTY environments. `tty`: Full interactive terminal UI with colors, spinners, and animations. Used automatically when a TTY is detected. If not specified, the format is auto-detected from the environment. --agent implies --outputFormat jsonl. | `jsonl`, `plain`, `tty` |


## Examples

Resolve an issue in agent mode for use in scripts or AI coding assistants:

```bash
stacktape issues:resolve --issueId iss_abc123def456 --agent
```

## Related commands

- [`issues:list`](/cli/issues-list) — list all detected runtime issues with their status and occurrence count
- [`issues:ignore`](/cli/issues-ignore) — mark an issue as ignored so new occurrences do not reopen it or generate alerts
- [`issues:reopen`](/cli/issues-reopen) — reopen a resolved or ignored issue, setting its status back to open
