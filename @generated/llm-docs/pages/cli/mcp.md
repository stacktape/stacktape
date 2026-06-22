# mcp

The `stacktape mcp` command starts a local MCP (Model Context Protocol) server that exposes Stacktape tools and documentation to AI coding agents. The server communicates over stdio and is spawned automatically by MCP-compatible clients like Claude Code, Cursor, Windsurf, and VS Code Copilot.

## Usage

```bash
stacktape mcp
```

You typically do not run this command directly. Instead, configure your AI coding agent to spawn it as an MCP server. The [`mcp:add`](/cli/mcp-add) command automates this setup for supported clients.

<CliCommandsApiReference
  command="mcp"
  sortedArgs={[
    {
      name: 'logLevel',
      required: false,
      alias: 'll',
      allowedTypes: ['string'],
      allowedValues: ['info', 'debug', 'error'],
      shortDescription: '<p> Log Level</p>\n',
      longDescription:
        '<p>The level of logs to print to the console.</p>\n<ul>\n<li><code>info</code>: Basic information about the operation.</li>\n<li><code>error</code>: Only errors.</li>\n<li><code>debug</code>: Detailed information for debugging.</li>\n</ul>\n'
    }
  ]}
/>

## What the server provides

The MCP server exposes four focused tools that AI agents use to search docs, inspect projects, plan or run CLI commands, and control dev mode:

| Tool                | Purpose                                                                                        |
| ------------------- | ---------------------------------------------------------------------------------------------- |
| `stacktape_docs`    | Search docs (`action: "search"`) or fetch exact docs (`action: "get"`)                         |
| `stacktape_project` | Inspect the local workspace for Stacktape config files, package scripts, and inferred defaults |
| `stacktape_cli`     | List, describe, plan, or run Stacktape CLI commands with validation and safety gates           |
| `stacktape_dev`     | Plan, start, inspect, rebuild, and stop dev mode sessions                                      |

## How it works

When an MCP-compatible client starts the server, Stacktape builds a lexical search index from its generated documentation, then listens for tool calls over stdio using the MCP protocol. Infrastructure operations and diagnostics (`stacktape_cli`) execute Stacktape CLI commands with validation and safety gates. Documentation queries (`stacktape_docs`) search the local lexical index. Project scanning (`stacktape_project`) reads local config files and package scripts. Dev-mode follow-up operations like status checks, log reading, rebuilds, and stop (`stacktape_dev`) communicate with the dev agent API started by [`stacktape dev`](/cli/dev).

`stacktape mcp` itself does not require an API key. Operations that run Stacktape CLI commands requiring account access — such as deploy, delete, diagnostics, and starting dev mode — need credentials configured with [`stacktape login`](/cli/login).

## Client configuration

The fastest way to configure your AI coding agent is to run [`stacktape mcp:add`](/cli/mcp-add), which detects supported clients and adds the MCP server entry automatically.

To configure manually, add an entry like this to your client's MCP configuration:

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

[`stacktape mcp:add`](/cli/mcp-add) detects supported client config files (Claude Code, Codex, Cursor, VS Code/Copilot, OpenCode, and Windsurf) and adds or updates the `stacktape` server entry automatically, creating timestamped backups before modifying existing files. Prefer `mcp:add` over manual setup — it handles the correct file location for each client.

## Examples

Start the MCP server with debug-level logging for troubleshooting connection issues:

```bash
stacktape mcp --logLevel debug
```

## FAQ

### Which AI clients support MCP?

`stacktape mcp:add` can detect Claude Code, Codex, Cursor, VS Code/Copilot, OpenCode, and Windsurf configuration files. The `mcp` command communicates over stdio using the MCP protocol, so any client that supports MCP stdio transport can use it. Run [`stacktape mcp:add`](/cli/mcp-add) to auto-detect and configure supported clients on your machine.

### Do I need an API key to use the MCP server?

The `stacktape mcp` command itself does not require an API key, so docs search and project inspection work with no credentials. Operations that run CLI commands requiring account access — such as deploy, delete, diagnostics, and starting dev mode — need credentials configured with [`stacktape login`](/cli/login).

### Can the MCP server modify my infrastructure?

Yes. The `stacktape_cli` tool can run non-interactive CLI commands with `action: "run"`, such as `deploy`, `delete`, `rollback`, `secret:set`, and `logs`. Mutating commands require `confirm: true` before they run. Destructive commands also require direct user confirmation through MCP elicitation when the client supports it; otherwise they fail closed.

For deployment preparation, agents should use `stacktape_cli` with `action: "plan"` and `command: "deploy"` first. Planning is read-only and returns the recommended run arguments, matched package script, inferred config path, working directory, and confirmation requirement without starting a deployment.

### Do I need to start `stacktape mcp` myself?

No. The MCP-compatible client spawns the server automatically over stdio when it starts, and the process exits when the client disconnects — you do not manage its lifecycle. Run [`stacktape mcp:add`](/cli/mcp-add) once to add the server entry to your client config; you rarely run `stacktape mcp` by hand except with `--logLevel debug` to troubleshoot a connection.

## Related commands

- [`mcp:add`](/cli/mcp-add) — Automatically installs MCP server configuration into supported AI coding clients.
- [`dev`](/cli/dev) — Starts local development mode (can also be controlled through the MCP `stacktape_dev` tool).
- [`login`](/cli/login) — Configures the API key required for infrastructure operations through MCP.
