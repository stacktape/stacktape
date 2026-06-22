# Using Stacktape with AI


> **Warning:** Preview — in active development. The Stacktape MCP server is under active development. Available tools, safety behavior, and integration details may change between releases.


Stacktape includes built-in support for AI coding assistants through an MCP server for deploying, inspecting, and debugging stacks from your editor; an agent mode that exposes an HTTP API for iterative local development; and an [`mcp:add`](/cli/mcp-add) command for registering the MCP server with supported editors. AI coding assistants can also use Stacktape docs and project context to help draft or edit `stacktape.ts` configuration files.

## The AI-assisted development workflow

An AI coding assistant working with Stacktape follows a build-test-deploy loop. The assistant writes your infrastructure config, starts a local dev environment, implements application code, reads logs to fix errors, and deploys when everything works. What makes this effective is the **feedback loop** — the AI observes what's happening and iterates until the stack works correctly.


## Flow
1. **Generate config**: AI writes stacktape.ts from your requirements or existing codebase
2. **Start dev mode**: Agent mode launches local workloads with an HTTP API
3. **Write application code**: AI implements handlers, services, and business logic
4. **Test and iterate**: AI reads logs, queries databases, triggers rebuilds, and fixes errors
5. **Deploy**: AI deploys the working stack to AWS via the MCP server


The assistant writes or edits the config in step 1 using Stacktape docs for reference. Agent mode powers steps 2–4. The MCP server orchestrates step 5 and provides documentation context throughout.

## MCP server

The Stacktape MCP server gives AI coding assistants direct access to Stacktape operations through the [Model Context Protocol](https://modelcontextprotocol.io). Instead of asking the assistant to run raw shell commands itself, the MCP server plans and runs Stacktape CLI operations through structured tools with validation, safety gates, and credential handling. The server runs locally via stdio transport and reuses your existing Stacktape CLI authentication.

The server exposes four tools:

| Tool | Purpose | Typical use |
|---|---|---|
| `stacktape_docs` | Search and fetch Stacktape documentation | Config syntax, resource types, deployment patterns, troubleshooting |
| `stacktape_project` | Inspect a local Stacktape project | Discover config files, parse package.json scripts, infer CLI defaults |
| `stacktape_cli` | List, describe, plan, and run CLI commands | Deploy, preview changes, read logs, query databases, manage secrets |
| `stacktape_dev` | Control dev mode lifecycle | Start, stop, check status, read logs, rebuild workloads |

### How assistants use the MCP server

An AI assistant interacting with the MCP server follows a plan-then-execute pattern. Before executing a Stacktape CLI command, the assistant calls `stacktape_cli` with `action=plan`, which scans your project, resolves config files, validates arguments, and returns validated command arguments with a run payload. The tool also supports `action=list` and `action=describe` for command discovery — the assistant uses these to find available commands and inspect their arguments before planning. The assistant then calls `action=run` with the planned payload, adding `confirm: true` for mutating commands only after receiving explicit user approval in the same conversation. Non-mutating commands (read-only, diagnostic, and local) run without user confirmation. Destructive commands go further — the assistant cannot supply confirmation on its own; the MCP server requires direct user confirmation through form elicitation before execution. This flow prevents the assistant from running commands with wrong arguments or against the wrong stage.

The `stacktape_docs` tool gives the assistant access to the full Stacktape documentation index. When you ask "how do I add a DynamoDB table?" or "what's the syntax for connecting resources?", the assistant searches the docs and returns grounded answers with code examples — rather than guessing from training data.

The `stacktape_dev` tool controls dev mode lifecycle without requiring an interactive terminal. The assistant can start agent mode, read logs, trigger workload rebuilds, and stop the session — all through structured JSON rather than terminal output parsing.

### Safety model

The MCP server categorizes every CLI command by safety level and enforces appropriate gates:

| Safety level | Behavior | Examples |
|---|---|---|
| `readOnly` | Runs without confirmation | `info:stack`, `info:stacks`, `metrics` |
| `diagnostic` | Runs without confirmation | `logs`, `query:sql`, `query:redis` |
| `local` | Runs without confirmation | `synth`, `package` |
| `mutating` | Requires explicit user approval (`confirm: true`) | `deploy`, `secret:set`, `domain:add` |
| `destructive` | Requires direct user confirmation through MCP form elicitation | `delete`, `secret:delete` |
| `interactive` | Rejected — must use user's terminal or `stacktape_dev` | `dev`, `init` |

Read-only and diagnostic commands are safe for the assistant to run freely — they inspect state without changing it. Mutating commands require the user to explicitly approve execution in the current conversation. Destructive commands go further: the assistant cannot supply confirmation on its own. Instead, the MCP server uses form elicitation to present a confirmation dialog directly to the user, and the operation only proceeds if the user confirms through that dialog. If the MCP client does not support elicitation, destructive commands are refused entirely and the user is told to run them in their own terminal.

Interactive commands like [`stacktape dev`](/cli/dev) and [`stacktape init`](/cli/init) require a terminal UI and are rejected by `stacktape_cli`. Dev mode lifecycle is handled through the dedicated `stacktape_dev` tool instead.

### Credential handling

The MCP server rejects raw Stacktape credential arguments passed through the AI assistant, masks sensitive output (secrets, passwords, API keys, connection strings) before returning results, and instructs assistants not to read credential files or ask for API keys in chat. The MCP server reuses the Stacktape CLI authentication state. If execution fails with an auth error, the server directs the user to run [`stacktape login`](/cli/login) in their own terminal. For CI, configure a dedicated `STACKTAPE_API_KEY` secret outside the conversation rather than passing credentials through chat or MCP arguments.

For full setup instructions, see the [MCP server setup guide](/using-with-ai/mcp-server-setup).

## Agent mode

Agent mode is a variant of Stacktape's [dev mode](/local-development/dev-mode-overview) designed for programmatic control by AI coding assistants. It starts a long-lived local process via `stacktape dev --agent` and exposes an HTTP API on a configurable port (default 7331). While standard dev mode uses an interactive terminal UI, agent mode returns structured JSON responses. When the MCP `stacktape_dev` tool plans agent mode, it defaults the stage to `dev` and can infer `configPath` from the project scan, but the final start arguments must include `stage`, `region`, and `configPath`.

Agent mode controls Stacktape dev mode through HTTP endpoints for status, logs, rebuilds, stop, and local database inspection. It provides structured JSON endpoints for:

- **Status checks** — workload health, ports, and readiness phase (`starting`, `ready`, `rebuilding`, `stopping`, `stopped`)
- **Log reading** — log text with cursor-based pagination for incremental reads
- **Workload rebuilds** — trigger rebuilds of specific workloads or all workloads after code changes
- **Database queries** — execute SQL, Redis commands, and DynamoDB operations against locally emulated PostgreSQL, MySQL, Redis, and DynamoDB databases

The `stacktape_dev` MCP tool controls the session lifecycle: plan, start, status, logs, rebuild a specific workload, rebuild all workloads, and stop. Agent mode also exposes HTTP endpoints for querying local PostgreSQL, MySQL, Redis, and DynamoDB databases — see [Agent mode in dev](/using-with-ai/agent-mode-in-dev) for the endpoint reference. For querying deployed (remote) databases in production or staging stacks, use [`stacktape query:sql`](/cli/query-sql), [`stacktape query:redis`](/cli/query-redis), [`stacktape query:dynamodb`](/cli/query-dynamodb), or [`stacktape query:opensearch`](/cli/query-opensearch) through the MCP server's `stacktape_cli` tool.

## When to use agent mode

Use agent mode when an AI assistant needs to iterate on your application — writing code, testing it, reading errors, and fixing issues in a loop. The HTTP endpoints for logs, status, and database queries let the assistant self-correct without human intervention.

## When NOT to use agent mode

If you're developing interactively (not through an AI assistant), standard [dev mode](/local-development/dev-mode-overview) with its terminal UI is a better fit. Dev mode provides the same local development capabilities with a human-friendly interface.

For the full HTTP API reference and usage, see [Agent mode in dev](/using-with-ai/agent-mode-in-dev).

## AI config generation

An AI coding assistant can use Stacktape documentation and project context to help draft or edit a `stacktape.ts` configuration file based on your requirements. The [`stacktape init`](/cli/init) command is an interactive setup command that must be run in the user's own terminal — it is classified as `interactive` and rejected by the MCP server's `stacktape_cli` tool.

For details on generating config from an existing codebase, see [Config generation from repository](/using-with-ai/config-generation-from-repository).

## Coding assistant setup

The [`stacktape mcp:add`](/cli/mcp-add) command automates MCP server registration for supported editors. Availability and the supported client list depend on the installed Stacktape CLI version. See the [MCP server setup guide](/using-with-ai/mcp-server-setup) for current client-specific registration steps.

```bash
stacktape mcp:add
```

The [`stacktape mcp`](/cli/mcp) command starts a local stdio MCP server that any MCP-compatible client can connect to.

For per-assistant setup walkthroughs, see [AI coding assistant integrations](/using-with-ai/ai-coding-assistant-integrations).

## Choosing the right approach


## Feature Comparison

| Feature | MCP server | Agent mode | Config generation | mcp:add |
| --- | --- | --- | --- | --- |
| What it does | Structured Stacktape operations from your editor | HTTP API for iterative local development | Generate stacktape.ts from your codebase | Register MCP server in your editor |
| When to use | Ongoing development with AI | AI-driven build-test-fix loops | Starting a new Stacktape project | One-time setup per editor |
| Can deploy to AWS | yes | no | no | no |
| Reads logs | Deployed stacks | Local dev | no | no |
| Queries databases | Deployed databases | Local databases | no | no |


**For most teams**, run `stacktape mcp:add` once to set up your editor, then use the MCP server for day-to-day work. The MCP server handles documentation lookup, CLI execution, and dev mode control through a single integration. Agent mode is useful when the AI assistant needs to run a sustained development loop — starting dev mode, writing code, reading logs, and iterating until the application works.

## FAQ

### Which AI coding assistants work with Stacktape?

Stacktape works with any MCP-compatible coding assistant. Run [`stacktape mcp:add`](/cli/mcp-add) to register the MCP server with supported editors — the current client list depends on the installed CLI version. For an assistant that isn't on that list, start the server with [`stacktape mcp`](/cli/mcp) on stdio and point the assistant at the command `stacktape` with argument `mcp`. See [AI coding assistant integrations](/using-with-ai/ai-coding-assistant-integrations) for per-assistant setup walkthroughs.

### Can an AI assistant deploy to production through the MCP server?

Yes, with safety gates — though the MCP server is still in preview and under active development. Mutating commands that change AWS resources require explicit user approval (`confirm: true`) and run through `stacktape_cli` only after planning. Destructive operations like [`stacktape delete`](/cli/delete) go further: they require direct user confirmation through MCP form elicitation that the AI assistant cannot supply on its own, and if the client doesn't support elicitation they are refused entirely. Sensitive outputs like secret values and connection strings are automatically masked in MCP responses.

### How does agent mode differ from standard dev mode?

Standard [dev mode](/local-development/dev-mode-overview) runs an interactive terminal UI designed for human developers. Agent mode starts a long-lived local process (`stacktape dev --agent`) with an HTTP API designed for programmatic access by AI assistants. Both modes run workloads locally and support rebuilds after code changes. Agent mode adds structured JSON endpoints for status, logs, rebuilds, and database queries that AI assistants can consume without parsing terminal output. See [Agent mode in dev](/using-with-ai/agent-mode-in-dev) for the full API reference.

### Does the MCP server require separate authentication?

No. The MCP server reuses the Stacktape CLI authentication state. If execution fails with an auth error, run [`stacktape login`](/cli/login) in your own terminal. For CI, configure a dedicated `STACKTAPE_API_KEY` secret outside the conversation rather than passing credentials through chat. The MCP server rejects raw credential arguments passed through the AI assistant and instructs assistants not to ask for API keys in chat.

### What databases can AI assistants query through agent mode?

Agent mode exposes HTTP endpoints for querying locally emulated PostgreSQL, MySQL, Redis, and DynamoDB databases. See the [agent mode guide](/using-with-ai/agent-mode-in-dev) for the endpoint reference. For querying deployed (remote) databases, use [`stacktape query:sql`](/cli/query-sql), [`stacktape query:redis`](/cli/query-redis), [`stacktape query:dynamodb`](/cli/query-dynamodb), or [`stacktape query:opensearch`](/cli/query-opensearch) through the MCP server's `stacktape_cli` tool.

### MCP server vs running Stacktape CLI in a terminal — what's the difference?

The MCP server adds structured safety gates, argument validation, project scanning, sensitive-value masking, and documentation context on top of the same CLI operations. When an AI assistant uses the MCP server, it gets validated argument schemas, automatic config file discovery, safety-appropriate confirmation flows, and masked output — none of which are available when the assistant runs raw shell commands. The MCP server also prevents the assistant from running interactive commands or accepting raw credential arguments.
