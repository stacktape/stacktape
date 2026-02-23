---
docType: cli-ref
title: "CLI: mcp:add"
tags:
  - mcp:add
  - mcp
  - add
source: src/config/cli/commands.ts
priority: 3
---

# `stacktape mcp:add`

Installs Stacktape MCP server config into popular coding-agent clients on this machine.

Detects client config files (Claude Code, Codex, Cursor, VS Code/Copilot, OpenCode, Windsurf), then adds or updates a `stacktape` MCP server entry that runs `stacktape mcp`. Creates timestamped backups before modifying existing files.

## Usage

```bash
stacktape mcp:add
```
