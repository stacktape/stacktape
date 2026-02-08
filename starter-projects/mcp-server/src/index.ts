import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { z } from 'zod';

const createServer = () => {
  const server = new McpServer({
    name: 'my-mcp-server',
    version: '1.0.0'
  });

  // Example tool: get current time
  server.registerTool(
    'get-current-time',
    {
      title: 'Get Current Time',
      description: 'Returns the current UTC time',
      inputSchema: {}
    },
    async () => ({
      content: [{ type: 'text', text: new Date().toISOString() }]
    })
  );

  // Example tool: calculate
  server.registerTool(
    'calculate',
    {
      title: 'Calculate',
      description: 'Evaluate a mathematical expression',
      inputSchema: {
        expression: z.string().describe('Mathematical expression to evaluate, e.g. "2 + 2"')
      }
    },
    async ({ expression }) => {
      try {
        const result = Function(`"use strict"; return (${expression})`)();
        return { content: [{ type: 'text', text: String(result) }] };
      } catch {
        return { content: [{ type: 'text', text: `Error evaluating: ${expression}` }], isError: true };
      }
    }
  );

  // Example resource: server info
  server.registerResource('server-info', 'info://server', {}, async (uri) => ({
    contents: [
      {
        uri: uri.href,
        text: JSON.stringify({ name: 'my-mcp-server', version: '1.0.0', runtime: 'AWS Lambda' })
      }
    ]
  }));

  return server;
};

// Lambda URL handler with response streaming
export const handler = awslambda.streamifyResponse(async (event: any, responseStream: any) => {
  const method = event.requestContext?.http?.method || 'GET';
  const path = event.rawPath || '/';

  // Health check
  if (path === '/' && method === 'GET') {
    responseStream.setContentType('application/json');
    responseStream.write(JSON.stringify({ status: 'ok', name: 'my-mcp-server', version: '1.0.0' }));
    responseStream.end();
    return;
  }

  // Only handle /mcp path
  if (!path.startsWith('/mcp')) {
    responseStream.setContentType('application/json');
    responseStream.write(JSON.stringify({ error: 'Not found. MCP endpoint is at /mcp' }));
    responseStream.end();
    return;
  }

  // Create a fresh server + transport per request (Lambda is stateless)
  const server = createServer();
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  await server.connect(transport);

  // Build a web-standard Request from the Lambda URL event
  const headers = new Headers(event.headers || {});
  const url = `https://${headers.get('host') || 'localhost'}${path}`;
  const request = new Request(url, {
    method,
    headers,
    body: method !== 'GET' && method !== 'HEAD' ? event.body : undefined
  });

  const response = await transport.handleRequest(request);

  if (!response) {
    responseStream.setContentType('application/json');
    responseStream.write(JSON.stringify({ error: 'No response from MCP transport' }));
    responseStream.end();
    await server.close();
    return;
  }

  // Forward response headers
  const contentType = response.headers.get('content-type') || 'application/json';
  responseStream.setContentType(contentType);

  // Stream the response body
  if (response.body) {
    const reader = response.body.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        responseStream.write(value);
      }
    } finally {
      reader.releaseLock();
    }
  }

  responseStream.end();
  await server.close();
});
