# org:create

The `org:create` command creates a new organization in your Stacktape account and returns a new API key scoped to it. Organizations are the account boundary Stacktape uses for projects, connected AWS accounts, and user access. Use `org:create` when you need a separate organization and API key for a team or workspace.

## Usage

Run `org:create` to create a new organization and receive an API key scoped to it.

```bash
stacktape org:create
```

In interactive mode, Stacktape prompts you for the organization name. To skip the prompt, pass `--organizationName` directly.

```bash
stacktape org:create --organizationName my-team
```

For programmatic or AI-agent usage, pass `--agent` to disable interactive prompts. In agent mode, `--organizationName` is required — the command exits with an error if it is missing.

```bash
stacktape org:create --agent --organizationName my-team
```


> **Info:** You must be logged in before running this command. Use [`stacktape login`](/cli/login) to configure your API key.


### What the command returns

On success, `org:create` outputs three pieces of information:

- **Organization name** — the name you provided.
- **Organization ID** — a unique identifier assigned by Stacktape.
- **Organization API key** — a new API key scoped to the created organization. Use this key with [`stacktape login`](/cli/login) to switch your CLI context to the new organization.

In agent mode, Stacktape does not prompt for the organization name, so `--organizationName` is required. Use `--outputFormat jsonl` if you need machine-readable NDJSON output.

## Flags reference

All flags accepted by `org:create` are listed below. None are required in interactive mode.


## CLI Options: `stacktape org:create`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `--agent (-ag)` | no | `boolean` | Agent Mode Optimizes CLI output for programmatic/LLM consumption: Uses strict JSONL/NDJSON output (one JSON object per line) Disables interactive terminal UI Automatically confirms operations (equivalent to --autoConfirmOperation) For dev command: also enables HTTP server for programmatic control. | - |
| `--logLevel (-ll)` | no | `string` | Log Level The level of logs to print to the console. `info`: Basic information about the operation. `error`: Only errors. `debug`: Detailed information for debugging. | `info`, `debug`, `error` |
| `--organizationName (-onm)` | no | `string` | Organization Name The name of the Stacktape organization. | - |
| `--outputFormat (-ofmt)` | no | `string` | Output Format Controls the CLI output format: `jsonl`: Machine-readable NDJSON (one JSON object per line). Disables interactive UI. `plain`: Simple text output without colors or animations. Used automatically in CI or non-TTY environments. `tty`: Full interactive terminal UI with colors, spinners, and animations. Used automatically when a TTY is detected. If not specified, the format is auto-detected from the environment. --agent implies --outputFormat jsonl. | `jsonl`, `plain`, `tty` |


## Examples

Increase log verbosity for troubleshooting:

```bash
stacktape org:create --organizationName production-team --logLevel debug
```

## Related commands

Commands commonly used alongside `org:create`:

- [`org:list`](/cli/org-list) — list all organizations accessible with your current user.
- [`org:delete`](/cli/org-delete) — delete organization access for your user.
- [`login`](/cli/login) — configure your API key, including switching to the new organization's key.
