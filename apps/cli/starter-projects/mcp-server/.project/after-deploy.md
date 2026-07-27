- The **MCP server URL** is printed to the terminal after deploy. Connect any MCP-compatible client by pointing it at
  the URL with `/mcp` path appended.

- **Claude Desktop** — add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "my-mcp-server": {
      "type": "streamableHttp",
      "url": "<MCP_SERVER_URL>/mcp"
    }
  }
}
```

- **Cursor** — add to MCP settings with the URL `<MCP_SERVER_URL>/mcp`.

- **Quick test with curl:**

```bash
curl -X POST <MCP_SERVER_URL>/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}'
```
