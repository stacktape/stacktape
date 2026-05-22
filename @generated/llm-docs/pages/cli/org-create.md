# org:create

The `org:create` command creates a new organization in your Stacktape account. Organizations are the top-level grouping for projects, stages, AWS accounts, and team members. After creation, the command returns a new API key scoped to the organization, which you can use to switch context.

## Usage

```bash
stacktape org:create
```

In interactive mode, Stacktape prompts you for the organization name. To skip the prompt, pass `--organizationName` directly.

```bash
stacktape org:create --organizationName my-team
```

When running in CI or from an AI coding agent, use `--agent` mode. In agent mode, `--organizationName` is required — the command exits with an error if it is missing.

```bash
stacktape org:create --agent --organizationName my-team
```


> **Info:** You must be logged in before running this command. Use [`stacktape login`](/cli/login) to configure your API key.


## What the command returns

On success, `org:create` outputs three pieces of information:

- **Organization name** — the name you provided.
- **Organization ID** — a unique identifier assigned by Stacktape.
- **Organization API key** — a new API key scoped to the created organization. Use this key with [`stacktape login`](/cli/login) to switch your CLI context to the new organization.

In `--agent` mode (or with `--outputFormat jsonl`), these values are returned as structured JSONL for programmatic consumption.

## Examples

Create an organization interactively — Stacktape prompts for the name:

```bash
stacktape org:create
```

Create an organization non-interactively by providing the name upfront:

```bash
stacktape org:create --organizationName production-team
```

Create an organization from a CI pipeline or AI agent, with machine-readable output:

```bash
stacktape org:create --agent --organizationName production-team
```

Increase log verbosity for troubleshooting:

```bash
stacktape org:create --organizationName production-team --logLevel debug
```

## Flags reference


## CLI Options: `stacktape org:create`

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
| `--organizationName (-onm)` | no | `string` | Organization Name The name of the Stacktape organization. | - |
| `--outputFormat (-ofmt)` | no | `string` | Output Format Controls the CLI output format:

`jsonl`: Machine-readable NDJSON (one JSON object per line). Disables interactive UI.
`plain`: Simple text output without colors or animations. Used automatically in CI or non-TTY environments.
`tty`: Full interactive terminal UI with colors, spinners, and animations. Used automatically when a TTY is detected.
If not specified, the format is auto-detected from the environment. --agent implies --outputFormat jsonl. | `jsonl`, `plain`, `tty` |


## Related commands

- [`org:list`](/cli/org-list) — list all organizations accessible with your current user.
- [`org:delete`](/cli/org-delete) — delete an organization (owner only, requires no other users or connected AWS accounts).
- [`login`](/cli/login) — configure your API key, including switching to the new organization's key.
- [`info:whoami`](/cli/info-whoami) — verify your current user, organization, and connected AWS accounts.
