# info:operations

The `info:operations` command lists recent recorded Stacktape operations with their status. Each entry shows success or failure status, timestamps, and error descriptions for failed operations. Use filters to narrow results by project, stage, or the current API-key user.

## Usage

```bash
stacktape info:operations
```

`info:operations` returns the 25 most recent operations across all projects and stages in your organization. You must be logged in with a valid API key — run [`stacktape login`](/cli/login) first if you haven't already.

## Filtering results

Filter by project name to see operations for a single project.

```bash
stacktape info:operations --projectName my-api
```

Filter by stage to see operations for a specific stage across all projects.

```bash
stacktape info:operations --stage production
```

Combine `--projectName` and `--stage` to narrow results to a single project and stage.

```bash
stacktape info:operations --projectName my-api --stage production
```

Show only operations triggered by your own API key.

```bash
stacktape info:operations --currentUserOnly
```

## Controlling output size

By default, `info:operations` returns the 25 most recent operations. Use `--limit` to change this.

```bash
stacktape info:operations --limit 50
```

## Machine-readable output

Use `--agent` or `--outputFormat jsonl` to get machine-readable output suitable for scripts or AI coding agents. See the flags reference below for details on each output format.

```bash
stacktape info:operations --agent
```

## Flags reference


## CLI Options: `stacktape info:operations`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `--agent (-ag)` | no | `boolean` | Agent Mode Optimizes CLI output for programmatic/LLM consumption: Uses strict JSONL/NDJSON output (one JSON object per line) Disables interactive terminal UI Automatically confirms operations (equivalent to --autoConfirmOperation) For dev command: also enables HTTP server for programmatic control. | - |
| `--currentUserOnly` | no | `boolean` | Current User Only If `true`, only returns records created by the user that owns the active API key. | - |
| `--limit (-lim)` | no | `number` | Limit Maximum number of items to return. | - |
| `--logLevel (-ll)` | no | `string` | Log Level The level of logs to print to the console. `info`: Basic information about the operation. `error`: Only errors. `debug`: Detailed information for debugging. | `info`, `debug`, `error` |
| `--outputFormat (-ofmt)` | no | `string` | Output Format Controls the CLI output format: `jsonl`: Machine-readable NDJSON (one JSON object per line). Disables interactive UI. `plain`: Simple text output without colors or animations. Used automatically in CI or non-TTY environments. `tty`: Full interactive terminal UI with colors, spinners, and animations. Used automatically when a TTY is detected. If not specified, the format is auto-detected from the environment. --agent implies --outputFormat jsonl. | `jsonl`, `plain`, `tty` |
| `--projectName (-prj)` | no | `string` | Project Name The name of the Stacktape project for this operation. | - |
| `--stage (-s)` | no | `string` | Stage The stage for the operation (e.g., `production`, `staging`, `dev-john`). You can set a default stage using the `defaults:configure` command. The maximum length is 12 characters. | - |


## Related commands

- [`info:stacks`](/cli/info-stacks) — list all deployed stacks in a region with their status and estimated spend.
- [`info:stack`](/cli/info-stack) — show detailed outputs and resources for a specific deployed stack.
- [`info:whoami`](/cli/info-whoami) — verify your API key and see which organization, AWS accounts, and projects you have access to.
