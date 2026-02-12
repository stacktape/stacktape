---
docType: cli-ref
title: "CLI: mcp"
tags:
  - mcp
source: src/config/cli/commands.ts
priority: 3
---

# `stacktape mcp`

Starts a local MCP (Model Context Protocol) server that provides Stacktape tools and documentation to AI coding agents.

The server communicates over stdio using the MCP protocol. It is spawned by MCP-compatible clients (Claude Code, Cursor, etc.) and provides tools for searching Stacktape docs, managing deployments, and debugging infrastructure.

## Usage

```bash
stacktape mcp
```
