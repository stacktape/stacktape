# Phase 5: Install UX, Discoverability, Validation

Make the MCP server easy to install and validate with real agent workflows.

## Install UX

### Option A: `stacktape mcp install`

Interactive command that:

1. Detects installed MCP clients (Claude Desktop, Cursor, OpenCode, etc.).
2. Offers to patch their config files to register Stacktape MCP server.
3. Shows what will be changed, asks for confirmation.
4. Writes config with backup.

### Option B: Manual config snippets

Provide copy-paste config for each client in docs.

Claude Desktop (`claude_desktop_config.json`):

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

Cursor (MCP settings):

```json
{
  "stacktape": {
    "command": "stacktape",
    "args": ["mcp"]
  }
}
```

OpenCode (`opencode.jsonc`):

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

### Recommendation

Ship Option B first (manual snippets in docs), add Option A later.

## Discoverability

### Tool description quality

Each tool description must explicitly state trigger conditions (see Phase 0). These are the primary discoverability
mechanism.

### Optional: `stacktape init` integration

During `stacktape init`, offer to configure MCP for detected clients. This captures users at the moment they're most
likely to benefit.

## Validation scenarios

Run these end-to-end with a real MCP client:

### Scenario 1: New project setup

1. Agent calls `stacktape_docs` to learn about config structure.
2. Agent writes `stacktape.ts` using config-ref type information.
3. Agent calls `stacktape_ops.preview_changes`.
4. Agent calls `stacktape_ops.deploy`.
5. Agent calls `stacktape_diagnose.info_stack` to verify outputs.

### Scenario 2: Debug broken deployment

1. Agent calls `stacktape_diagnose.info_operations` to see recent failures.
2. Agent calls `stacktape_diagnose.logs` to read error logs.
3. Agent calls `stacktape_docs` to understand fix.
4. Agent fixes config and calls `stacktape_ops.deploy`.

### Scenario 3: Dev mode iteration

1. Agent calls `stacktape_dev.start`.
2. Agent calls `stacktape_dev.status` to verify readiness.
3. Agent makes code changes.
4. Agent calls `stacktape_dev.rebuild`.
5. Agent calls `stacktape_dev.logs` to verify fix.
6. Agent calls `stacktape_dev.stop`.

### Scenario 4: Config authoring from types

1. Agent calls `stacktape_docs` with query about specific resource type.
2. Agent receives TypeScript definitions and examples.
3. Agent writes correct config using type information.

## Exit criteria

- Config snippets exist for at least 3 major MCP clients.
- All 4 validation scenarios pass end-to-end.
- Tool descriptions trigger correct tool selection in real agent sessions.
