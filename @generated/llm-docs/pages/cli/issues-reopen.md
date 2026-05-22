# issues:reopen

The `issues:reopen` command sets a previously resolved or ignored issue back to OPEN status. Use it when a fix didn't hold, when you want to resume alerting on an ignored issue, or when a resolved issue needs renewed attention from your team.

## Usage

```bash
stacktape issues:reopen --issueId iss_abc123def456
```

The command requires a valid Stacktape API key (configured via [`stacktape login`](/cli/login)). It calls the Stacktape API to update the issue status and prints a confirmation message on success.

## When to use

Reopen an issue when:

- A previously resolved error reappears and you want to track it actively again.
- You ignored an issue during a known incident, and now want to restore normal alerting.
- A teammate resolved an issue prematurely and you need it visible in the open issues list.

Once reopened, the issue appears in [`issues:list`](/cli/issues-list) with OPEN status and resumes generating alerts through your configured [alert channels](/observability/alert-channels).

## Important flags

The only required flag is `--issueId` (alias `-iid`), which identifies the issue to reopen. You can find issue IDs by running [`stacktape issues:list`](/cli/issues-list).

For scripting and CI environments, use `--agent` to get structured JSONL output instead of the interactive terminal UI.

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


## CLI Options: `stacktape issues:reopen`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `--issueId (-iid)` | yes | `string` | Issue ID The ID of the issue to act on. | - |
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

- [`issues:list`](/cli/issues-list) — List all detected runtime issues with their status, occurrence count, and affected resources.
- [`issues:resolve`](/cli/issues-resolve) — Mark an issue as resolved. It will reopen automatically if the same error occurs again.
- [`issues:ignore`](/cli/issues-ignore) — Mark an issue as ignored. Ignored issues do not reopen on new occurrences and do not generate alerts.
