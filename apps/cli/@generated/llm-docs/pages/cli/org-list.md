# org:list

The `org:list` command displays all organizations accessible with your current Stacktape API key. Use it to see which organizations you belong to, your role in each, and which one is currently active for CLI operations.

## Usage

```bash
stacktape org:list
```

When organizations are found, the command prints a table with the following columns. If you have no organizations, it prints "No organizations found for this user."

| Column | Description |
|--------|-------------|
| Organization | The organization name |
| Role | Your organization role, such as Owner, Admin, Developer, or Viewer. Unrecognized roles are displayed as returned by Stacktape |
| Connected AWS | Number of AWS accounts connected to the organization |
| Current | Whether this organization is the active one for your API key |
| ID | The organization's unique identifier |

No flags are required. The command uses the API key configured via [`stacktape login`](/cli/login) to authenticate and fetch your organization list.

## Output formats

When Stacktape detects an interactive terminal (TTY), `org:list` renders a table. In CI or other non-TTY contexts, the output format is auto-detected. Use `--outputFormat jsonl` or `--agent` for machine-readable output.

Machine-readable JSONL output:

```bash
stacktape org:list --outputFormat jsonl
```

Agent mode (JSONL output with no interactive UI):

```bash
stacktape org:list --agent
```

## Flags reference


## CLI Options: `stacktape org:list`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `--agent (-ag)` | no | `boolean` | Agent Mode Optimizes CLI output for programmatic/LLM consumption: Uses strict JSONL/NDJSON output (one JSON object per line) Disables interactive terminal UI Automatically confirms operations (equivalent to --autoConfirmOperation) For dev command: also enables HTTP server for programmatic control. | - |
| `--logLevel (-ll)` | no | `string` | Log Level The level of logs to print to the console. `info`: Basic information about the operation. `error`: Only errors. `debug`: Detailed information for debugging. | `info`, `debug`, `error` |
| `--outputFormat (-ofmt)` | no | `string` | Output Format Controls the CLI output format: `jsonl`: Machine-readable NDJSON (one JSON object per line). Disables interactive UI. `plain`: Simple text output without colors or animations. Used automatically in CI or non-TTY environments. `tty`: Full interactive terminal UI with colors, spinners, and animations. Used automatically when a TTY is detected. If not specified, the format is auto-detected from the environment. --agent implies --outputFormat jsonl. | `jsonl`, `plain`, `tty` |


## Examples

List all organizations with debug-level logging:

```bash
stacktape org:list --logLevel debug
```

Pipe organization data into another tool:

```bash
stacktape org:list --outputFormat jsonl
```

## Related commands

- [`org:create`](/cli/org-create) — create a new organization
- [`org:delete`](/cli/org-delete) — delete organization access (owner-only, requires no other users or connected AWS accounts)
- [`info:whoami`](/cli/info-whoami) — verify your current user, organization, and connected accounts
- [`login`](/cli/login) — configure your Stacktape API key
