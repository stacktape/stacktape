import { afterEach, describe, expect, test } from 'bun:test';
import { Client, InMemoryTransport } from '@modelcontextprotocol/client';
import { createMcpServer, serveStacktapeMcp } from './index';
import type { RunStacktapeResult } from './cli-jsonl-runner';

// Drives the exact stdio serving path `stacktape mcp` uses, with each protocol era a real client can negotiate.
// Most clients (Codex, Cursor, VS Code, Windsurf, Claude Code without feature flags) still speak a 2025-era revision.

const openConnections: Array<() => Promise<void>> = [];

afterEach(async () => {
  await Promise.all(openConnections.splice(0).map((close) => close().catch(() => {})));
});

const successfulRun = (cwd: string): RunStacktapeResult => ({
  ok: true,
  code: 'OK',
  message: 'Executed by test runner.',
  data: { executed: true },
  events: [],
  logEvents: [],
  outputEvents: [],
  resolvedContext: { cwd }
});

const connect = async ({
  protocolVersion,
  capabilities,
  onRun = () => {}
}: {
  protocolVersion: string;
  capabilities: ConstructorParameters<typeof Client>[1] extends infer Options
    ? Options extends { capabilities?: infer C }
      ? C
      : never
    : never;
  onRun?: (command: string) => void;
}) => {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const handle = serveStacktapeMcp(
    () =>
      createMcpServer(
        async () => {
          throw new Error('Docs index should not be loaded in this test.');
        },
        {
          runCli: async ({ command, cwd }) => {
            onRun(command);
            return successfulRun(cwd || process.cwd());
          }
        }
      ),
    serverTransport
  );
  const client = new Client(
    { name: `stacktape-${protocolVersion}-test`, version: '1.0.0' },
    {
      supportedProtocolVersions: [protocolVersion],
      versionNegotiation: { mode: protocolVersion.startsWith('2025') ? 'legacy' : { pin: protocolVersion } },
      capabilities
    }
  );
  await client.connect(clientTransport);
  openConnections.push(async () => {
    await client.close();
    await handle.close();
  });
  return client;
};

const readEnvelope = (result: { structuredContent?: unknown }) =>
  result.structuredContent as { ok: boolean; code: string };

const deleteCall = {
  name: 'stacktape_cli',
  arguments: { action: 'run', command: 'delete', args: { stage: 'dev', region: 'us-east-1' }, confirm: true }
};

describe('stacktape mcp over stdio', () => {
  for (const protocolVersion of ['2025-11-25', '2025-06-18', '2025-03-26', '2026-07-28']) {
    test(`a ${protocolVersion} client connects on its own version and sees every tool`, async () => {
      const client = await connect({ protocolVersion, capabilities: {} });

      expect(client.getNegotiatedProtocolVersion()).toBe(protocolVersion);
      const listed = await client.listTools();
      expect(listed.tools.map((tool) => tool.name).sort()).toEqual([
        'stacktape_cli',
        'stacktape_dev',
        'stacktape_docs',
        'stacktape_incident',
        'stacktape_project'
      ]);
    });
  }

  test('a 2025-era client confirms a destructive command through its own elicitation form', async () => {
    const runs: string[] = [];
    const prompts: string[] = [];
    const client = await connect({
      protocolVersion: '2025-06-18',
      // 2025-06-18 has no form/url split: `elicitation: {}` means form elicitation.
      capabilities: { elicitation: {} },
      onRun: (command) => runs.push(command)
    });
    client.setRequestHandler('elicitation/create', async (request) => {
      prompts.push(String(request.params.message));
      return { action: 'accept', content: { confirm: true } };
    });

    expect(readEnvelope(await client.callTool(deleteCall))).toMatchObject({ ok: true, code: 'OK' });
    expect(prompts).toHaveLength(1);
    expect(prompts[0]).toContain('delete');
    // The person confirming sees which project the command runs in, not only the stage and region.
    expect(prompts[0]).toContain(`Project folder: ${process.cwd()}`);
    expect(runs).toEqual(['delete']);
  });

  test('a 2025-era client that declines the form does not run the command', async () => {
    const runs: string[] = [];
    const client = await connect({
      protocolVersion: '2025-11-25',
      capabilities: { elicitation: { form: {} } },
      onRun: (command) => runs.push(command)
    });
    client.setRequestHandler('elicitation/create', async () => ({ action: 'decline' }));

    expect(readEnvelope(await client.callTool(deleteCall))).toMatchObject({
      ok: false,
      code: 'USER_CONFIRMATION_DECLINED'
    });
    expect(runs).toEqual([]);
  });

  test('a 2025-era client without elicitation gets a refusal, never an unconfirmed run', async () => {
    const runs: string[] = [];
    const client = await connect({
      protocolVersion: '2025-11-25',
      capabilities: {},
      onRun: (command) => runs.push(command)
    });

    expect(readEnvelope(await client.callTool(deleteCall))).toMatchObject({
      ok: false,
      code: 'USER_CONFIRMATION_REQUIRED'
    });
    expect(runs).toEqual([]);
  });

  test('a 2025-era client with URL-only elicitation gets a refusal', async () => {
    const runs: string[] = [];
    const client = await connect({
      protocolVersion: '2025-11-25',
      capabilities: { elicitation: { url: {} } },
      onRun: (command) => runs.push(command)
    });

    expect(readEnvelope(await client.callTool(deleteCall))).toMatchObject({
      ok: false,
      code: 'USER_CONFIRMATION_REQUIRED'
    });
    expect(runs).toEqual([]);
  });
});
