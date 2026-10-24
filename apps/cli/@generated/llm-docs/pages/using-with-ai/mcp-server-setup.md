# MCP Server Setup


> **Warning:** Preview — in active development. The Stacktape MCP server is under active development. Some operations may not work end-to-end in all environments, and behavior may change as the server stabilizes.


The Stacktape MCP server gives AI coding assistants structured access to Stacktape documentation, CLI commands, project inspection, and dev mode control. Instead of copying CLI output back and forth, your assistant calls Stacktape tools directly and receives typed JSON responses it can reason about.

## Quick start

```bash
stacktape mcp add
```

[`mcp add`](/cli/mcp-add) finds the coding agents on your machine and asks which ones to connect, with the installed ones preselected. For each agent you pick, it adds the Stacktape MCP server for your user, then starts the server once to check that it works. Start a new session (or reload the window) in your agent and ask: “Use Stacktape to show what this project deploys.”

A working integration exposes `stacktape_incident`, `stacktape_docs`, `stacktape_project`, `stacktape_cli`, and `stacktape_dev`. For an incident, the assistant starts with `stacktape_incident` and reads logs, metrics and other diagnostics through `stacktape_cli` directly. Mutating commands are planned with `action: "plan"` and run only after you approve them.

To undo the setup, run [`stacktape mcp remove`](/cli/mcp-remove).

## When to use

Use the MCP server when your AI coding assistant supports the [Model Context Protocol](https://modelcontextprotocol.io). The structured tool interface is better than raw CLI output for several workflows:

- **Deploying or deleting stacks** — the assistant plans the command, validates arguments against CLI metadata, and executes with safety gates, all through tool calls.
- **Debugging** — query [logs](/cli/logs), [metrics](/cli/metrics), [alarms](/cli/alarms), [database contents](/cli/query-sql), or [DynamoDB items](/cli/query-dynamodb) during a conversation. The assistant gets structured JSON instead of parsing terminal output.
- **Configuration help** — the assistant searches Stacktape's bundled documentation index for resource types, config syntax, and deployment patterns without opening a browser.
- **Dev mode** — start, monitor, rebuild, and stop [dev mode](/local-development/dev-mode-overview) sessions from within your AI conversation.

## When NOT to use

Skip the MCP server if your AI client does not support the Model Context Protocol — use the [Stacktape CLI](/cli/deploy) directly or the [Stacktape Console](/stacktape-console/console-overview) instead. For long-running deployments, prefer the CLI when you want to watch the command directly in your own terminal. MCP command responses are consolidated and may be truncated. The MCP server runs CLI commands as subprocesses and returns a consolidated response; if an optional caller-specified timeout is exceeded, the subprocess is terminated and an error is returned.

## Supported agents

`mcp add` sets up these agents. Every agent starts `stacktape mcp` itself, as a local process on your machine.

| Agent | How `mcp add` adds the server |
|-------|-------------------------------|
| Claude Code | `claude mcp add --scope user` |
| Codex (CLI, IDE extension and app) | `codex mcp add`; edits `~/.codex/config.toml` when the `codex` command is missing |
| Cursor | Edits `~/.cursor/mcp.json` |
| VS Code (GitHub Copilot) | Edits the user `mcp.json` of your default profile |
| GitHub Copilot CLI | Edits `~/.copilot/mcp-config.json` |
| Windsurf (Devin Desktop) | Edits the existing `mcp_config.json`, or creates `~/.codeium/windsurf/mcp_config.json` |
| OpenCode | Edits `~/.config/opencode/opencode.jsonc` or `opencode.json` |

An agent counts as installed when its command is on your PATH, or its app or settings folder exists. In a named VS Code profile, add the server from that profile with **MCP: Open User Configuration** (see [Manual setup](#manual-setup)). Any other MCP client that can start a local stdio server works too; see [Other MCP clients](#other-mcp-clients).


> **Info:** The server speaks the current MCP revision (`2026-07-28`) and the earlier 2025 revisions (`2025-11-25`, `2025-06-18`, `2025-03-26`), so it works with agents that have not moved to the new protocol yet. The confirmation form for destructive commands works in both: on older revisions it arrives as a standard elicitation request.


## What `mcp add` changes

- **User level only.** Entries go into your own agent configuration, never into the project, so nothing reaches your repository or your teammates. Claude Code and Codex are changed through their own `mcp add` commands; Claude Code's `~/.claude.json` is never edited directly.
- **Edits in place.** In JSON and JSONC files, `mcp add` changes only the `stacktape` entry. Your comments, other servers and formatting stay as they are, and the previous file is kept next to it as `<file>.bak.<timestamp>`. A file it cannot parse is left untouched and reported.
- **The command it writes.** When `stacktape` is on your PATH, the entry runs `stacktape mcp`, so upgrades keep working. When you installed Stacktape with the install script, the entry uses the binary's full path (`~/.stacktape/bin/stacktape`), because agents started from the Dock or Start menu often do not see your shell's PATH. Otherwise it writes the running binary's full path and tells you to run `mcp add` again if that file moves.
- **A check at the end.** `mcp add` starts the configured command, completes an MCP handshake and lists the tools. It reports a failure with the server's own error output.

Running `mcp add` again is safe: entries that already match are reported as already set up and left untouched. If a project contains its own Stacktape entry (for example a committed `.mcp.json` from an older Stacktape), that agent uses the project entry inside that project, and `mcp add` tells you where it is.

### Non-interactive setup

```bash
# Name the agents and skip the question
stacktape mcp add --coding-agents claude-code,cursor

# Set up every installed agent (CI images, dotfiles, scripts)
stacktape mcp add --yes
```

With `--yes` or `--agent`, `mcp add` sets up every installed agent. When it finds none, it changes nothing and exits with an error that shows how to name the agents.

## Manual setup

To configure an agent by hand, point it at the `stacktape` command with the single argument `mcp`. Optionally set `STACKTAPE_MCP_CLIENT_NAME` to the agent's name, as `mcp add` does; Stacktape uses it to label operations started from that agent.


### Tab: Claude Code


```bash
claude mcp add --scope user stacktape -- stacktape mcp
```

Use `--scope project` instead to write a `.mcp.json` that your team commits and shares.


### Tab: Codex


```bash
codex mcp add stacktape -- stacktape mcp
```

This writes the entry to `~/.codex/config.toml`, which the Codex CLI, IDE extension and app share:

```toml
[mcp_servers.stacktape]
command = "stacktape"
args = ["mcp"]
```


### Tab: Cursor


[Add to Cursor](cursor://anysphere.cursor-deeplink/mcp/install?name=stacktape&config=eyJjb21tYW5kIjoic3RhY2t0YXBlIiwiYXJncyI6WyJtY3AiXX0=), or add this to `~/.cursor/mcp.json` (all projects) or `.cursor/mcp.json` (one project):

```json
{
  "mcpServers": {
    "stacktape": {
      "type": "stdio",
      "command": "stacktape",
      "args": ["mcp"]
    }
  }
}
```


### Tab: VS Code


[Add to VS Code](vscode:mcp/install?%7B%22name%22%3A%22stacktape%22%2C%22type%22%3A%22stdio%22%2C%22command%22%3A%22stacktape%22%2C%22args%22%3A%5B%22mcp%22%5D%7D), or run **MCP: Open User Configuration** and add the server. VS Code uses the `servers` key:

```json
{
  "servers": {
    "stacktape": {
      "type": "stdio",
      "command": "stacktape",
      "args": ["mcp"]
    }
  }
}
```


### Tab: Copilot CLI


```bash
copilot mcp add stacktape -- stacktape mcp
```


### Tab: Windsurf


Add to `mcp_config.json` (open it from the MCP settings in Cascade):

```json
{
  "mcpServers": {
    "stacktape": {
      "command": "stacktape",
      "args": ["mcp"]
    }
  }
}
```


### Tab: OpenCode


Add to `~/.config/opencode/opencode.json` (all projects) or `opencode.json` in the project:

```json
{
  "mcp": {
    "stacktape": {
      "type": "local",
      "command": ["stacktape", "mcp"],
      "enabled": true
    }
  }
}
```


> **Tip:** If your project has `stacktape` as an npm dependency and you want the server pinned to that version, use `node_modules/.bin/stacktape` as the command in a project-level config.


### Other MCP clients

Any client that starts a local stdio server works: the command is `stacktape` and the arguments are `["mcp"]`. To call the tools from scripts or the command line, [mcporter](https://github.com/openclaw/mcporter) can register it with `mcporter config add stacktape --command stacktape --arg mcp`.

### Moving from the hosted MCP server

Stacktape 3 also offered a hosted MCP server, added to agents as a URL. Stacktape 4 replaces it with `stacktape mcp`, which runs locally with your own CLI login. Remove the old URL entry from your agent and run `stacktape mcp add`.

## Available tools

The MCP server exposes five tools. Each tool uses an `action` parameter to group related operations, keeping the tool surface small while giving assistants access to incidents, docs, project inspection, CLI commands, and dev mode control.

| Tool | Actions | Purpose |
|------|---------|---------|
| `stacktape_incident` | `show`, `list` | Fetch an incident's full context in one call, or find incidents by project, stage and status |
| `stacktape_docs` | `search`, `get` | Search or fetch Stacktape documentation by query, route, resource type, definition name, property name, or heading path |
| `stacktape_project` | `scan`, `orient` | Inspect the local workspace for Stacktape config files, package scripts, dependencies, and suggested CLI defaults |
| `stacktape_cli` | `list`, `describe`, `plan`, `run` | Discover CLI commands, validate arguments, build execution plans, and execute non-interactive commands through safety-classified gates |
| `stacktape_dev` | `plan`, `start`, `status`, `logs`, `rebuild`, `rebuild_all`, `query`, `tables`, `reset_db`, `seed`, `env`, `aws`, `stop` | Plan and control [dev mode](/local-development/dev-mode-overview) sessions, and inspect and reset their local databases |

Every completed tool call returns a `stacktape.mcp.tool-result.v1` JSON envelope as structured content and as an identical text block. The envelope includes `ok`, `code`, and `message`, with operation-specific fields under `data`. This lets clients consume typed results while keeping the response readable in clients that primarily render text content.

Tool arguments accept common snake_case and kebab-case forms (`project_name`, `config_path`, `start_time`, `end_time`, `secret_name`, etc.) and normalize them to camelCase automatically. Your AI assistant does not need to know the exact casing convention.

### Incident tool

`stacktape_incident` is where an assistant starts an [incident](/observability/incidents) investigation. `action: "show"`
with an `incidentId` returns the incident handoff as markdown, the same document
[`incident show`](/cli/incidents-show) prints. It contains the incident's signals with their evidence, release and
configuration changes, the timeline, earlier related incidents, the AI assessment, the reports of any hosted AI runs
and read-only next steps.
`action: "list"` finds incidents by `projectName`, `stage` and `status` (`ACTIVE` by default, `ALL` for resolved history
as well) and returns at most `limit` of them (default 25).

The tool runs those CLI commands with your local Stacktape login, so the Console applies your organization and project
access. It is read-only. The assistant then reads logs, metrics, alarms and stack state with `stacktape_cli`.

### Docs tool

`stacktape_docs` searches a documentation index bundled with the Stacktape CLI — no network access required. Use `action: "search"` with a `query` to find configuration syntax, resource types, deployment patterns, or troubleshooting guidance. Use `action: "get"` with a `route`, `definitionName`, `propertyName`, `sourcePath`, or `headingPath` to fetch an exact section.

Search supports three modes: `answer` (default) returns a synthesized answer with references, `reference` returns matched references without content, and `snippet` returns code-focused excerpts.

Key selectors and limits:

| Parameter | Actions | Type | Description |
|-----------|---------|------|-------------|
| `query` | `search` | string | Search query (required for `search`). |
| `mode` | `search` | `answer` \| `reference` \| `snippet` | Response mode. Default: `answer`. |
| `maxItems` | `search` | number | Max search results. Default: 3. |
| `docKind` | both | `docs-page` \| `config-reference` | Filter to a specific docs artifact kind. |
| `resourceType` | both | string | Filter or select by resource type, e.g. `function`. |
| `route` | `get` | string | Exact docs route, e.g. `/config-reference/function`. |
| `definitionName` | `get` | string | Exact TypeScript definition name from config reference. |
| `propertyName` | `get` | string | Exact config property name to extract. |
| `sourcePath` | `get` | string | Exact source path from a previous docs reference. |
| `headingPath` | `get` | string[] | Exact heading path array from a previous docs reference. |
| `maxChars` | `get` | number | Max content characters. Default: 16,000. |
| `includeFullPage` | `get` | boolean | Set `true` to fetch all content for a long route. |

For long route-only `get` requests, when more than 20 docs-page sections match and `includeFullPage` is not set, the server returns available heading paths instead of the full route content — the assistant passes one back to get the specific section.

### Project tool

`stacktape_project` with `action: "scan"` discovers Stacktape config candidates (`.ts`, `.js`, `.yml`, `.json`), parses `package.json` scripts that invoke Stacktape commands, detects lockfiles, and returns suggested defaults for `configPath` and `currentWorkingDirectory`. This is the first tool an assistant should call when entering an unfamiliar Stacktape project.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `cwd` | string | Server process cwd | Absolute path to the Stacktape project root. Pass this whenever the assistant knows it. |
| `maxFiles` | number | 8 (`orient`: 12) | Maximum ranked files to return per category. |
| `includeDetails` | boolean | `false` | When `true`, includes full package script commands and unabridged candidate metadata. |

The `orient` action returns the same scan data with stronger next-action guidance for the assistant.

### CLI tool

`stacktape_cli` covers the non-interactive CLI surface: [deployments](/cli/deploy), [deletions](/cli/delete), [previewing changes](/cli/diff), [rollbacks](/cli/rollback), diagnostics ([`logs`](/cli/logs), [`metrics`](/cli/metrics), [`alarm list`](/cli/alarms), [`query sql`](/cli/query-sql), [`query dynamodb`](/cli/query-dynamodb), [`query redis`](/cli/query-redis), [`query opensearch`](/cli/query-opensearch), [`aws call`](/cli/aws-call)), incidents (`incidents`, `incident show`, `incident watch`), [secrets](/configuration/secrets) (`secret set`, `secret get`, `secret delete`), parameters (`param get`), stack info (`status`, `stack list`), and deployment scripts (`script run`).

The actions:

1. **`action: "list"`** — discover available commands, optionally filtered by `category` or `safety` level.
2. **`action: "describe"`** — get full metadata for a specific command (allowed arguments, safety class, confirmation policy). For `aws call`, it also lists the accepted AWS SDK operations per service.
3. **`action: "plan"`** — build a read-only execution plan for a mutating command. Pass `cwd` with the absolute path to the Stacktape project root when the assistant has it — `plan` uses it to scan config files and `package.json` scripts. The action infers defaults, validates arguments against CLI metadata, and returns a suggested `action: "run"` payload with a shell command preview. No credentials are required for planning.
4. **`action: "run"`** — execute a command as a CLI subprocess. Read-only, diagnostic and local commands run directly with validated arguments. Mutating commands require `confirm: true`. Destructive commands require direct user confirmation through the client's confirmation form (see [Safety model](#safety-model)).

Common parameters accepted by `plan` and `run`:

| Parameter | Type | Description |
|-----------|------|-------------|
| `command` | string | CLI command name, e.g. `deploy`, `logs`, `secret get` |
| `cwd` | string | Absolute path to the Stacktape project root for project scanning |
| `args` | object | CLI arguments as a camelCase key-value object |
| `stage` | string | Target Stacktape stage |
| `region` | string | Target AWS region |
| `projectName` | string | Stacktape project name |
| `awsAccount` | string | Connected Stacktape AWS account name |
| `configPath` | string | Stacktape config path relative to `currentWorkingDirectory` |
| `currentWorkingDirectory` | string | Working directory for resolving config and app files |
| `resourceName` | string | Resource name for diagnostics commands |
| `scriptName` | string | Deployment script name for `script run` |
| `secretName` | string | Secret name for secret commands |
| `secretValue` | string | Secret value for `secret set` (masked in tool output) |
| `secretFile` | string | Path to a file containing the secret value |
| `fullDeploy` | boolean | Deploy every change through CloudFormation instead of updating changed code directly |
| `confirm` | boolean | Required for mutating commands. Destructive commands also require direct user confirmation through the client's confirmation form; this flag alone cannot authorize them. |
| `timeoutMs` | number | Command timeout in milliseconds for `run` |

The `list` action also accepts `category` (e.g. `deployment`, `diagnostics`, `secrets`) and `safety` (e.g. `readOnly`, `mutating`, `destructive`) to filter results.


> **Warning:** Plan mutating commands with `action: "plan"` before `action: "run"`. Commands marked as `sensitiveOutput` in CLI metadata have their output masked before being returned. The MCP planning guidance specifically warns assistants not to display `secret get` or private `param get` values in chat — run those in your own terminal to avoid exposing values in the conversation transcript.


### Dev tool

`stacktape_dev` manages [dev mode](/local-development/dev-mode-overview) lifecycle without requiring a terminal. The dev mode agent listens on a loopback HTTP port (default `7331`) for control commands. The tool reads the agent's session token from the token file the agent reports at start and sends it with each request; the token never appears in tool output.

- **`plan`** scans the project and returns suggested start arguments without starting anything. Its `data.stacktapeDevStart.arguments` is a complete `start` call, with the project directory in `args.cwd`. `plan` defaults `stage` to `dev` and infers `projectName`, `region`, `awsAccount`, `currentWorkingDirectory`, and `configPath` from deploy scripts and project scan when available. A dev-mode plan is only complete when `stage`, `region`, and `configPath` are resolved; otherwise the tool returns `MISSING_ARGS` with next steps. Since `stage` defaults to `dev`, the most common missing arguments are `region` and `configPath`.
- **`start`** launches dev mode as a subprocess. Pass `projectName`, `stage`, `region`, `configPath`, and optionally `awsAccount`, `agentPort`, `currentWorkingDirectory`, `resources`, `skipResources`, `watch`, `remoteResources`, or `freshDb`. It returns `data.session.devSessionId` at once and sends a progress notification for each startup step: the dev network, the dev box, the dev stack deployment with resource counts, and each workload and database. It waits up to `waitSeconds` (default 50) for the start to finish. A first start that creates the dev network and the dev stack takes several minutes; `start` then returns `DEV_STARTING` with the latest progress while the start continues, so an MCP client's per-call timeout does not end it.
- **`status`** returns the current state of the running session. While the session starts, it waits up to `waitSeconds` (default 50) for the start to finish, then returns the ready status, the start's error, or `DEV_STARTING` with the latest progress. A start that fails in the background keeps its error, code and hints for the next call about that session.
- **`logs`** returns the newest structured log entries (`limit`, default 100). Pass the returned `nextCursor` as `cursor` to read only lines written since, `level` (`info`, `warn`, `error`) for a minimum level (without `since` or `cursor`, only the current session's lines), `since` (an ISO time or a duration such as `10m`) and `workload` to filter. Entries with `source: "dev"` are dev mode's own lifecycle: rebuilds, file changes, dev stack updates and dev box state.
- **`rebuild`** triggers a rebuild of a single workload (pass `workload` name). **`rebuild_all`** triggers a rebuild of every workload.
- **`tables`** lists what the local databases hold: tables for PostgreSQL and MySQL, keys for Redis, the key schema for DynamoDB and indices for OpenSearch. Without `resource` it covers every local database.
- **`query`** runs `sql` on PostgreSQL or MySQL, a Redis `command` such as `GET session:1`, or a DynamoDB query (`pk`, optional `sk` and `index`) or scan (`filter`). `resource` names the database and can be omitted when only one runs. A statement that deletes or changes data in bulk (`DROP`, `TRUNCATE`, `FLUSHALL`, `UPDATE` or `DELETE` without `WHERE`) returns `DESTRUCTIVE_OPERATION` until it is repeated with `confirm: true`.
- **`reset_db`** gives the assistant a known database state in about a second, without restarting dev mode. With `confirm: true` it deletes every row of the PostgreSQL and MySQL tables, every Redis key and every DynamoDB item of `resource`, or of every local database when `resource` is omitted. Tables, indexes and migration history tables such as `_prisma_migrations` stay, so the application needs no new migration. PostgreSQL identity columns and MySQL `AUTO_INCREMENT` counters start again at 1. `keepTables` names more tables to keep. OpenSearch is not supported; start dev mode with `freshDb` to delete its data.
- **`seed`** runs a `local-script` from the config's `scripts` section (`script`, default `seed`) with the local database connections and returns its output. See [Reset and seed local databases](/using-with-ai/agent-mode-in-dev#reset-and-seed-local-databases) for the script.
- **`env`** returns the environment of a `workload` with secret values masked. **`aws`** calls a reviewed read-only AWS SDK operation (`service`, `command`, `input`, optional `region`) with the dev agent's credentials, as [`/aws/sdk`](/using-with-ai/agent-mode-in-dev#aws-sdk-access) does.
- **`stop`** terminates the active session.

The database actions reach only databases that dev mode runs on your machine. A database connected to its deployed instance with `remoteResources`, or any other deployed resource, returns `NOT_LOCAL_RESOURCE` or `NOT_FOUND`, and `seed` refuses scripts that connect to one, assume a deployed workload's role or run through a bastion.

`args` is typed in the tool's input schema, with a description of every argument, so an assistant does not have to guess names such as `freshDb` or `awsAccount`.

Multiple dev sessions can be active for different projects or ports. Pass the `devSessionId` returned by `start` as `args.devSessionId` to `stop`; it never guesses which session you intended. The other actions may omit the handle when exactly one session is active; `cwd` narrows that to one project directory. With multiple sessions, omission returns `AMBIGUOUS_DEV_SESSION`; an unknown or unreachable handle returns `NOT_FOUND`.

Sessions survive a restart of the MCP server. Every agent reports its `devSessionId` and project directory, and the tool finds running agents through their token files, so a new MCP server process answers `status`, `logs` and `stop` for sessions an earlier one started.

## Safety model

The MCP server classifies every CLI command into a safety level and enforces per-level gates:

| Safety level | Behavior | Examples |
|-------------|----------|---------|
| `readOnly` | Executes without confirmation | `diff`, `status`, `stack list`, `logs`, `metrics`, `alarm list`, `incident show` |
| `diagnostic` | Executes without confirmation | `query sql`, `query dynamodb`, `query redis`, `query opensearch`, `aws call` |
| `local` | Executes without confirmation | `synth`, `validate`, `package` |
| `mutating` | Requires `confirm: true` in the `run` call | [`deploy`](/cli/deploy), [`secret set`](/cli/secret-set), [`rollback`](/cli/rollback) |
| `destructive` | Requires direct user confirmation for the exact command and target; agent-supplied `confirm: true` alone is not sufficient | [`delete`](/cli/delete), [`secret delete`](/cli/secret-delete) |
| `interactive` | Rejected by the MCP server — must be run in the user's own terminal | [`login`](/cli/login), [`dev`](/cli/dev) (use `stacktape_dev` instead), `bastion shell` |

For destructive commands, the MCP server asks the user directly through their AI client's confirmation form: an input-required round trip on the `2026-07-28` revision, a standard elicitation request on the 2025 revisions. The confirmation is short-lived, bound to the exact command, arguments, and project directory, and can be used only once. A declined, expired, replayed, or target-mismatched confirmation does not execute the command. If the client does not support confirmation forms, the command fails closed and the assistant is told to ask the user to run the command in their own terminal.


> **Warning:** Diagnostic commands run without a confirmation prompt because the MCP server accepts only read operations for them: read-only SQL statements (`SELECT`, `WITH`, `VALUES`, `SHOW`, `DESCRIBE`, `EXPLAIN`), the read operations of the Redis, DynamoDB and OpenSearch query commands, and [reviewed read-only AWS SDK operations](/cli/aws-call#safety-model) for `aws call`. Anything else is refused. The data they return can still be sensitive, so think about what you let an assistant read from production.


Commands marked as `sensitiveOutput` in CLI metadata have their output masked before being returned. The MCP planning guidance specifically warns assistants not to display `secret get` or private `param get` values in chat. The MCP server also redacts known credential patterns (Stacktape API keys, GitHub tokens, Slack tokens, database connection strings with passwords) from all tool responses.

## Authentication

The MCP server reuses the local Stacktape CLI authentication state. It is not a separate identity provider, and planning does not require Stacktape credentials. Commands that run the underlying CLI may also require whatever AWS access that CLI command normally requires. The `stacktape_cli` planning action rejects raw Stacktape credential CLI arguments (such as `apiKey` or `STACKTAPE_API_KEY`), and the MCP instructions tell assistants not to collect API keys in chat.

- **Docs search, project scanning, CLI listing, description, and planning** work without any authentication.
- **`stacktape_cli` with `action: "run"` and `stacktape_dev`** execute the underlying Stacktape CLI flow and may require the same project, stage, region, AWS account, and profile setup as the CLI command. If execution fails with an authentication error, the MCP guidance tells the assistant to ask you to run [`stacktape login`](/cli/login) in your own terminal.

For CI environments, the MCP server's safety guidance tells assistants to ask users to configure a dedicated `STACKTAPE_API_KEY` secret outside the conversation instead of pasting credentials into chat.

## How it works

The MCP server starts when your AI client launches the `stacktape mcp` command as a child process using stdio transport. The startup sequence is:

1. The client spawns `stacktape mcp` as a child process.
2. The client and server agree on a protocol revision (`2026-07-28` or one of the 2025 revisions), and the client lists the five tools.
3. The bundled documentation search index initializes asynchronously. If indexing fails, operational tools remain available and `stacktape_docs` reports the indexing error.
4. The assistant sends MCP tool calls over stdin; the server executes them and returns structured JSON over stdout.

For CLI execution, the MCP server validates the command against CLI metadata, applies safety policy, spawns a Stacktape CLI subprocess, and forwards progress notifications while retaining a bounded event history for the final consolidated response. Cancelling the MCP call terminates the subprocess tree and returns `CANCELLED`; timeouts return `TIMEOUT`. A missing, malformed, or duplicate final CLI agent result fails closed instead of guessing whether the command succeeded. Tool responses are capped at 30,000 characters. Large `rawTail` output is shortened by keeping the beginning and end. Other large payloads are compacted by dropping or shrinking bulky fields (such as truncating answer text, limiting reference and snippet counts, and shortening data content). If compaction is still insufficient, the server returns `RESPONSE_TOO_LARGE`.

For docs queries, search runs against a local index. No network calls are made.

## Verifying the setup

`mcp add` already starts the server and lists its tools. To check that the agent itself connects:

- **Claude Code:** `claude mcp get stacktape` shows `Status: ✔ Connected`.
- **Codex:** `codex mcp list` lists `stacktape` as enabled.
- **OpenCode:** `opencode mcp list` shows `✓ stacktape connected`.
- **Cursor, VS Code and Windsurf:** the MCP section of the settings shows `stacktape` with its five tools.

Then ask a question that needs the docs, for example “How do I deploy a Lambda function with Stacktape?”. The assistant should call `stacktape_docs`.

## Upgrading

The MCP server ships inside the Stacktape CLI. After [`stacktape upgrade`](/cli/upgrade) or an npm update, the next session your agent starts uses the new server. No separate MCP update is needed.

Run [`stacktape mcp add`](/cli/mcp-add) again to add another agent, or after moving the CLI when `mcp add` wrote its full path.

## Troubleshooting

### The agent shows no Stacktape tools

Run `stacktape mcp add` again: its final check starts the server with the exact configured command and prints the error if that fails. If the check passes but the agent still shows nothing, restart the agent. Agents started from the Dock or Start menu may not see your shell's PATH; install Stacktape with the install script, or put the full path to `stacktape` in the agent's config.

### A config file cannot be parsed

`mcp add` leaves a file it cannot parse untouched and names it. Fix the syntax error, or restore the most recent `.bak.<timestamp>` copy, and run `mcp add` again.

### Operations require authentication

Docs search, project scanning, and CLI metadata actions (`list`, `describe`, `plan`) work without authentication. `stacktape_cli` with `action: "run"` and `stacktape_dev` execute the underlying Stacktape CLI flow. If execution fails with an authentication error, run [`stacktape login`](/cli/login) in your terminal. Some commands also require a configured [AWS profile](/cli/aws-profile-create).

### An agent is not listed as installed

`mcp add` looks for the agent's command on your PATH and for its app and settings folders. Pick the agent in the list anyway, or name it with `--coding-agents`, and `mcp add` writes its configuration.

### Dev session not found

If `stacktape_dev` returns `NOT_FOUND` for `status`, `logs`, `rebuild`, `rebuild_all`, a database action or `stop`, and its message does not name a database or script, no dev agent of yours is running, or the session's local agent port is no longer responding. Call `start` to create a new session.

### Concurrent deployment conflicts

The MCP server spawns separate CLI subprocesses for each operation, so it does not interfere with other Stacktape commands you run in a terminal. However, running concurrent deployments to the same stack from both MCP and a terminal causes AWS CloudFormation conflicts. Avoid overlapping deploys to the same project and stage.

## FAQ

### Which AI assistants work with the Stacktape MCP server?

[`stacktape mcp add`](/cli/mcp-add) sets up Claude Code, Codex, Cursor, VS Code with GitHub Copilot, GitHub Copilot CLI, Windsurf and OpenCode. Any other MCP client that can start a local stdio server also works: point it at `stacktape mcp`.

### Does the MCP server store or transmit my credentials?

The MCP server runs locally and reuses the local Stacktape CLI authentication state. Commands executed through `stacktape_cli` and `stacktape_dev` follow the underlying CLI's normal authentication and AWS access behavior. The `stacktape_cli` planning action rejects raw Stacktape credential CLI arguments, and the MCP instructions tell assistants not to collect API keys in chat. Commands flagged `sensitiveOutput` (such as `secret get` and private `param get`) have their output masked, and the server also redacts known credential patterns (API keys, tokens, database connection strings with passwords) from all responses before returning them to the AI client. Even so, sensitive values are best retrieved by running the command in your own terminal rather than through an AI conversation.

### What works without an AWS account or login?

Docs search, project scanning, and CLI metadata operations (`list`, `describe`, `plan`) work with no AWS account or Stacktape login — planning never requires credentials, so an assistant can explore commands and build execution plans offline. Only `stacktape_cli` with `action: "run"` and `stacktape_dev` execute the underlying CLI flow; if that fails with an authentication error, the guidance tells the assistant to ask you to run [`stacktape login`](/cli/login) in your own terminal. Some commands also require a configured [AWS profile](/cli/aws-profile-create).

### Is the MCP server safe for production workflows?

The MCP server is in preview. Docs, project scanning, CLI listing, description, and planning are read-only. The server classifies every CLI command into a safety level: `readOnly`, `diagnostic`, `local`, `mutating`, `destructive`, or `interactive`. Mutating commands require `confirm: true`, destructive commands require direct user confirmation for the exact command and target when the client supports confirmation forms, and interactive commands are rejected. Diagnostic commands like [`query sql`](/cli/query-sql) run without confirmation because the server accepts only read operations for them. Treat MCP-initiated deployments with the same care as manual CLI deployments.

### What happens if a deployment times out through MCP?

CLI commands run as subprocesses. The caller can specify a `timeoutMs` value; if exceeded, the MCP server terminates the subprocess and returns an error. The dev mode `start` action uses a 12-minute timeout for initial setup. For long-running deployments, run them directly via the [CLI](/cli/deploy) where you get real-time streaming output.

### What is the difference between plan and run in stacktape_cli?

`action: "plan"` creates a read-only execution plan: it scans the project, reads `package.json` scripts for defaults, validates arguments, and returns the recommended `action: "run"` payload — without executing anything or requiring credentials. `action: "run"` executes the command. Read-only and diagnostic commands can run directly. Mutating commands are planned first, then run with the planned payload after the user approves.

### Why was my tool response truncated or rejected as too large?

Tool responses are capped at 30,000 characters. The server first shortens large `rawTail` output by keeping the beginning and end, then compacts other large payloads (truncating answer text, limiting reference and snippet counts, shortening data content). If compaction is still not enough, it returns `RESPONSE_TOO_LARGE`. For long-running deployments with heavy output, run them directly via the [CLI](/cli/deploy) where you get full streaming output instead.
