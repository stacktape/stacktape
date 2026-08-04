### 1.1 MCP Server Function

The MCP server runs in a Lambda function with a
[Lambda URL](https://docs.stacktape.com/compute-resources/lambda-functions/#lambda-url) that has **response streaming
enabled**. This allows the server to stream Server-Sent Events (SSE) back to MCP clients in real time — critical for the
Streamable HTTP transport.

- **Memory** is set to 1024 MB for responsive tool execution.
- **Timeout** is set to 60 seconds to accommodate longer-running tool calls.
- **CORS** is fully open for easy client integration.

```yml
mcpServer:
  type: function
  properties:
    packaging:
      type: stacktape-lambda-buildpack
      properties:
        entryfilePath: ./src/index.ts
    memory: 1024
    timeout: 60
    url:
      enabled: true
      responseStreamEnabled: true
      cors:
        allowedOrigins:
          - "*"
        allowedMethods:
          - "*"
        allowedHeaders:
          - "*"
```

### 1.2 CDN (optional)

You can attach a [CDN](https://docs.stacktape.com/resources/cdns/) in front of the Lambda URL for caching, custom
domains, and edge TLS termination. Add a CDN resource to `stacktape.yml` and point its origin at the Lambda URL.

### 1.3 Registered MCP Tools

The starter includes example tools to demonstrate the MCP protocol:

- **get-current-time** — returns the current UTC timestamp.
- **calculate** — evaluates a mathematical expression.
- **server-info** — an MCP resource that exposes server metadata.

Add your own tools, resources, and prompts in `src/index.ts` using the `server.registerTool()` /
`server.registerResource()` / `server.registerPrompt()` API.
