# issues:ignore

The `issues:ignore` command permanently silences a runtime issue detected in your deployed functions or containers. Unlike resolving, an ignored issue will not reopen if the same error occurs again, and it will not generate any further alerts. Use this for known, non-actionable errors you don't want cluttering your issue list.

## Usage

```bash
stacktape issues:ignore --issueId <issue-id>
```

You can find issue IDs by running [`issues:list`](/cli/issues-list).

## Flags Reference


## CLI Options: `stacktape issues:ignore`

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


## Examples

Ignore a specific issue by its ID:

```bash
stacktape issues:ignore --issueId iss_abc123def456
```

Use agent mode for scripted or CI workflows where you need structured JSON output:

```bash
stacktape issues:ignore --issueId iss_abc123def456 --agent
```

## When to Ignore vs Resolve

Use `issues:ignore` for errors you've reviewed and determined are not actionable — for example, expected client-side 4xx errors, known third-party SDK warnings, or edge-case timeouts that don't affect users. Ignored issues stay silent permanently until you explicitly reopen them.

Use [`issues:resolve`](/cli/issues-resolve) when you've fixed the root cause. A resolved issue will automatically reopen if the same error recurs, keeping you informed of regressions.

## Related Commands

- [`issues:list`](/cli/issues-list) — list detected runtime issues with filtering by status, project, or stage
- [`issues:resolve`](/cli/issues-resolve) — mark an issue as resolved (will reopen on recurrence)
- [`issues:reopen`](/cli/issues-reopen) — reopen a previously resolved or ignored issue
