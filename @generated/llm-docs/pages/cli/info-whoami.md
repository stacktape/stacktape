# info:whoami

The `stacktape info:whoami` command shows the current user, organization, connected AWS accounts, and accessible projects for your configured API key. Use it to verify your authentication is set up correctly and confirm which organization and projects you can access.

## Usage

```bash
stacktape info:whoami
```

This command requires a valid API key. If you haven't logged in yet, run [`stacktape login`](/cli/login) first.

The output includes:

- **User** — your name, email, and user ID.
- **Organization** — the organization tied to your API key, including your role (Owner, Admin, Developer, or Viewer).
- **Connected AWS accounts** — each account's name, AWS account ID, and connection state.
- **Projects** — all projects you can access in the current organization.
- **Permissions** — when your API key is scoped to a specific project, the permissions granted to it.

## Examples

Verify your identity and check which organization you're operating in.

```bash
stacktape info:whoami
```

Get machine-readable JSON output (one JSON object per line) for scripting or CI pipelines.

```bash
stacktape info:whoami --outputFormat jsonl
```

Enable debug-level logging to troubleshoot API key issues.

```bash
stacktape info:whoami --logLevel debug
```

## Flags


## CLI Options: `stacktape info:whoami`

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

- [`login`](/cli/login) — configure your Stacktape API key.
- [`logout`](/cli/logout) — remove the API key from your system.
- [`org:list`](/cli/org-list) — list all organizations you can access.
- [`projects:list`](/cli/projects-list) — list all projects and their deployed stages in your organization.
