// Records the tool lists of MCP servers that developers commonly install next to Stacktape, so the real-task suite can
// replay them (replay-mcp.ts) and measure whether agents still find Stacktape's tools among them.
//
// Run: bun apps/cli/scripts/e2e-mcp/capture-catalogs.ts [name...]
// GitHub uses the token from `gh auth token`; the others need no account to list tools.

import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';

const CATALOG_DIR = join(dirname(fileURLToPath(import.meta.url)), 'catalogs');

type Source =
  | { kind: 'stdio'; command: string; args: string[]; env?: Record<string, string> }
  | { kind: 'http'; url: string; headers?: () => Record<string, string> };

const SOURCES: Record<string, Source> = {
  github: {
    kind: 'http',
    url: 'https://api.githubcopilot.com/mcp/',
    headers: () => ({ Authorization: `Bearer ${execFileSync('gh', ['auth', 'token'], { encoding: 'utf-8' }).trim()}` })
  },
  'aws-api': {
    kind: 'stdio',
    command: 'uvx',
    args: ['awslabs.aws-api-mcp-server@latest'],
    env: { AWS_REGION: 'us-east-1' }
  },
  'aws-cloudwatch': {
    kind: 'stdio',
    command: 'uvx',
    args: ['awslabs.cloudwatch-mcp-server@latest'],
    env: { AWS_REGION: 'us-east-1' }
  },
  'aws-knowledge': { kind: 'http', url: 'https://knowledge-mcp.global.api.aws' },
  context7: { kind: 'stdio', command: 'npx', args: ['-y', '@upstash/context7-mcp@latest'] },
  playwright: { kind: 'stdio', command: 'npx', args: ['-y', '@playwright/mcp@latest'] },
  sentry: {
    kind: 'stdio',
    command: 'npx',
    args: ['-y', '@sentry/mcp-server@latest'],
    env: { SENTRY_ACCESS_TOKEN: 'catalog-capture-placeholder' }
  }
};

const capture = async (name: string, source: Source) => {
  const client = new Client({ name: 'stacktape-catalog-capture', version: '1.0.0' }, { capabilities: {} });
  const transport =
    source.kind === 'stdio'
      ? new StdioClientTransport({
          command: source.command,
          args: source.args,
          env: { ...(process.env as Record<string, string>), ...source.env },
          stderr: 'ignore'
        })
      : new StreamableHTTPClientTransport(new URL(source.url), {
          requestInit: source.headers ? { headers: source.headers() } : undefined
        });
  try {
    await client.connect(transport, { timeout: 120_000 });
    const tools = [];
    let cursor: string | undefined;
    do {
      const page = await client.listTools(cursor ? { cursor } : {});
      tools.push(...page.tools);
      cursor = page.nextCursor;
    } while (cursor);
    const catalog = {
      name,
      capturedAt: new Date().toISOString().slice(0, 10),
      serverInfo: client.getServerVersion(),
      instructions: client.getInstructions(),
      tools
    };
    await writeFile(join(CATALOG_DIR, `${name}.json`), `${JSON.stringify(catalog, null, 2)}\n`);
    console.log(`${name}: ${tools.length} tools`);
  } finally {
    await client.close().catch(() => {});
  }
};

const main = async () => {
  await mkdir(CATALOG_DIR, { recursive: true });
  const requested = process.argv.slice(2);
  for (const [name, source] of Object.entries(SOURCES)) {
    if (requested.length > 0 && !requested.includes(name)) continue;
    try {
      await capture(name, source);
    } catch (error) {
      console.error(`${name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
