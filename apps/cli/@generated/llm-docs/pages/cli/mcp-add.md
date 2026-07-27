# mcp:add

The `mcp:add` command installs the Stacktape MCP server configuration into coding-agent clients on your machine. It detects supported clients, adds or updates a `stacktape` MCP server entry pointing to `stacktape mcp`, and creates timestamped backups before modifying any existing configuration files. Neither `mcp:add` nor [`mcp`](/cli/mcp) require a Stacktape API key to run.

## Usage

```bash
stacktape mcp:add
```

In interactive mode, `mcp:add` presents a multi-select prompt listing all supported clients, marks detected ones, and preselects the default target set before asking for confirmation. With `--autoConfirmOperation`, the command skips prompts and installs to the default target set: detected clients, or all supported clients when none are detected. The `--agent` flag disables the interactive UI and uses the same default target selection as `--autoConfirmOperation`.

## Supported clients

The `mcp:add` command detects and configures the following coding-agent clients:

| Client | Config format | Config locations (checked in order) |
|--------|--------------|-------------------------------------|
| Claude Code | JSON | `.mcp.json` (project), `~/.claude.json` (user) |
| OpenAI Codex | TOML | `.codex/config.toml` (project), `~/.codex/config.toml` (user) |
| Cursor | JSON | `.cursor/mcp.json` (project), `~/.cursor/mcp.json` (user) |
| VS Code / Copilot | JSON | `.vscode/mcp.json` (project), platform-specific user path |
| OpenCode | JSON/JSONC | `opencode.jsonc` (project), `.opencode/config.json` (project), platform-specific user paths |
| Windsurf | JSON | `./.codeium/windsurf/mcp_config.json` (project), `~/.codeium/windsurf/mcp_config.json` (user) |

For each client, Stacktape checks the configured candidate paths in order and uses the first existing file. If no candidate file exists for a selected client, Stacktape creates that client's first configured path, which is project-local for all supported clients.


> **Info:** **OpenCode paths in detail:** On Windows, the user-level paths are `%APPDATA%/opencode/opencode.jsonc` and `%APPDATA%/opencode/config.json`. On macOS/Linux, the user-level paths include `~/.config/opencode/opencode.jsonc`, `~/.config/opencode/config.json`, and `~/.opencode/config.json`. Stacktape can read existing JSONC-style files, but it rewrites modified files as formatted JSON, so comments are not preserved in the output.


## Behavior details

**Local vs global command resolution** — When the selected config path is under the current working directory, `mcp:add` checks whether `stacktape` is listed as a dependency in `package.json` (including `devDependencies`, `optionalDependencies`, and `peerDependencies`). If so, it writes `node_modules/.bin/stacktape` as the command path so the MCP server uses the project-local Stacktape version. For user-level config files outside the project, it always uses the global `stacktape` command.

**Backups** — Before modifying an existing file, the command copies it to a timestamped backup (e.g., `.mcp.json.bak.2025-01-15T10-30-00-000Z`). New files are created without a backup.

**Idempotency** — If the `stacktape` entry already exists with identical configuration, the file is reported as `unchanged` and no backup is created.

**Invalid config files** — For JSON-based clients, if an existing config file contains invalid JSON or JSONC, `mcp:add` reports that client as `failed` and leaves the file unchanged.

## Examples

Install to all detected clients without interactive prompts:

```bash
stacktape mcp:add --autoConfirmOperation
```

Run in agent mode, which disables the interactive UI and auto-confirms the operation:

```bash
stacktape mcp:add --agent
```

## Flags reference


## CLI Options: `stacktape mcp:add`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `--agent (-ag)` | no | `boolean` | Agent Mode Optimizes CLI output for programmatic/LLM consumption: Uses strict JSONL/NDJSON output (one JSON object per line) Disables interactive terminal UI Automatically confirms operations (equivalent to --autoConfirmOperation) For dev command: also enables HTTP server for programmatic control. | - |
| `--autoConfirmOperation (-aco)` | no | `boolean` | Auto-Confirm Operation If `true`, automatically confirms prompts during `deploy` or `delete` operations, skipping the manual confirmation step. | - |
| `--logLevel (-ll)` | no | `string` | Log Level The level of logs to print to the console. `info`: Basic information about the operation. `error`: Only errors. `debug`: Detailed information for debugging. | `info`, `debug`, `error` |
| `--outputFormat (-ofmt)` | no | `string` | Output Format Controls the CLI output format: `jsonl`: Machine-readable NDJSON (one JSON object per line). Disables interactive UI. `plain`: Simple text output without colors or animations. Used automatically in CI or non-TTY environments. `tty`: Full interactive terminal UI with colors, spinners, and animations. Used automatically when a TTY is detected. If not specified, the format is auto-detected from the environment. --agent implies --outputFormat jsonl. | `jsonl`, `plain`, `tty` |


## Related commands

- [`mcp`](/cli/mcp) — Starts the MCP server process that `mcp:add` configures clients to invoke.
- [`login`](/cli/login) — Configure your Stacktape API key. Use [`login`](/cli/login) when MCP tools need authenticated Stacktape operations (deployments, secret management, etc.).
