// Stand-in for a third-party MCP server in the real-task suite. It offers the recorded tool list (capture-catalogs.ts)
// with the original names, descriptions, schemas and server instructions, so agents search and choose among the same
// tools a developer would have installed. Calls are not forwarded anywhere: each one is appended to E2E_REPLAY_LOG and
// answered with the error the real server gives when it is not signed in to the user's account.
//
// Run: bun apps/cli/scripts/e2e-mcp/replay-mcp.ts <catalog name>

import { appendFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  fromJsonSchema,
  McpServer,
  SUPPORTED_PROTOCOL_VERSIONS,
  type JsonSchemaType,
  type Tool
} from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';

type Catalog = {
  name: string;
  serverInfo: { name: string; version: string; title?: string };
  instructions?: string;
  tools: Tool[];
};

const catalogName = process.argv[2];
if (!catalogName) throw new Error('Usage: replay-mcp.ts <catalog name>');
const catalog = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'catalogs', `${catalogName}.json`), 'utf-8')
) as Catalog;

const createServer = () => {
  const server = new McpServer(
    { name: catalog.serverInfo.name, version: catalog.serverInfo.version || '0.0.0' },
    {
      supportedProtocolVersions: ['2026-07-28', ...SUPPORTED_PROTOCOL_VERSIONS],
      capabilities: { tools: {} },
      ...(catalog.instructions ? { instructions: catalog.instructions } : {})
    }
  );
  for (const tool of catalog.tools) {
    server.registerTool(
      tool.name,
      {
        ...(tool.title ? { title: tool.title } : {}),
        description: tool.description ?? '',
        inputSchema: fromJsonSchema(tool.inputSchema as JsonSchemaType),
        ...(tool.annotations ? { annotations: tool.annotations } : {}),
        ...(tool._meta ? { _meta: tool._meta } : {})
      },
      async (args) => {
        if (process.env.E2E_REPLAY_LOG) {
          appendFileSync(
            process.env.E2E_REPLAY_LOG,
            `${JSON.stringify({ server: catalog.name, tool: tool.name, args, at: new Date().toISOString() })}\n`
          );
        }
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: `${catalog.serverInfo.name}: not authenticated. Sign in to ${catalog.name} for this MCP server and try again.`
            }
          ]
        };
      }
    );
  }
  return server;
};

const main = async () => {
  const server = serveStdio(createServer, { legacy: 'serve' });
  await new Promise<void>((resolveShutdown) => {
    process.stdin.once('end', resolveShutdown);
    process.stdin.once('close', resolveShutdown);
    process.once('SIGINT', resolveShutdown);
    process.once('SIGTERM', resolveShutdown);
  });
  await server.close();
};

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack || error.message : String(error)}\n`);
  process.exit(1);
});
