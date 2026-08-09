import { afterEach, describe, expect, test } from 'bun:test';
import { resolve } from 'node:path';
import {
  Client,
  StreamableHTTPClientTransport,
  isInputRequiredResult,
  type InputRequiredResult
} from '@modelcontextprotocol/client';
import { createMcpHandler } from '@modelcontextprotocol/server';
import { createMcpServer } from './index';
import { runStacktapeCommandJsonl, type RunStacktapeResult } from './cli-jsonl-runner';

const openClients: Array<{ client: Client; closeHandler: () => Promise<void> }> = [];

const readEnvelope = (result: { structuredContent?: unknown }) =>
  result.structuredContent as { ok: boolean; code: string; data?: Record<string, unknown> };

const createTestClient = async ({
  runCli,
  autoFulfill = true
}: {
  runCli: (input: Parameters<typeof runStacktapeCommandJsonl>[0]) => RunStacktapeResult | Promise<RunStacktapeResult>;
  autoFulfill?: boolean;
}) => {
  const handler = createMcpHandler(
    () =>
      createMcpServer(
        async () => {
          throw new Error('Docs index should not be loaded in this test.');
        },
        { runCli: async (input) => runCli(input) }
      ),
    { legacy: 'reject' }
  );
  const transport = new StreamableHTTPClientTransport(new URL('http://stacktape-mcp.test/mcp'), {
    fetch: (input, init) => handler.fetch(new Request(input instanceof URL ? input.toString() : input, init))
  });
  const client = new Client(
    { name: 'stacktape-modern-test', version: '1.0.0' },
    {
      supportedProtocolVersions: ['2026-07-28'],
      versionNegotiation: { mode: { pin: '2026-07-28' } },
      capabilities: { elicitation: { form: {} } },
      inputRequired: { autoFulfill, maxRounds: 4 }
    }
  );
  await client.connect(transport);
  openClients.push({ client, closeHandler: () => handler.close() });
  return client;
};

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

afterEach(async () => {
  await Promise.all(
    openClients.splice(0).map(async ({ client, closeHandler }) => {
      await client.close().catch(() => {});
      await closeHandler().catch(() => {});
    })
  );
});

describe('modern-only Stacktape MCP server', () => {
  test('rejects a client that does not negotiate the 2026 protocol', async () => {
    const handler = createMcpHandler(
      () =>
        createMcpServer(async () => {
          throw new Error('Docs index should not be loaded in this test.');
        }),
      { legacy: 'reject' }
    );
    const transport = new StreamableHTTPClientTransport(new URL('http://stacktape-mcp.test/mcp'), {
      fetch: (input, init) => handler.fetch(new Request(input instanceof URL ? input.toString() : input, init))
    });
    const client = new Client({ name: 'stacktape-legacy-test', version: '1.0.0' }, { capabilities: {} });
    try {
      await expect(client.connect(transport)).rejects.toThrow();
    } finally {
      await client.close().catch(() => {});
      await handler.close().catch(() => {});
    }
  });

  test('discovers only the 2026 protocol and exposes deterministic structured tools', async () => {
    const client = await createTestClient({ runCli: ({ cwd }) => successfulRun(cwd || process.cwd()) });
    expect(client.getProtocolEra()).toBe('modern');
    expect(client.getNegotiatedProtocolVersion()).toBe('2026-07-28');
    expect(client.getDiscoverResult()?.supportedVersions).toEqual(['2026-07-28']);

    const listed = await client.listTools();
    expect(listed.tools.map((tool) => tool.name)).toEqual([
      'stacktape_docs',
      'stacktape_project',
      'stacktape_cli',
      'stacktape_dev'
    ]);
    expect(listed.tools.every((tool) => Boolean(tool.outputSchema))).toBe(true);
  });

  test('executes a destructive command only after an accepted MRTR confirmation', async () => {
    let executions = 0;
    const client = await createTestClient({
      runCli: ({ cwd }) => {
        executions += 1;
        return successfulRun(cwd || process.cwd());
      }
    });
    client.setRequestHandler('elicitation/create', async () => ({
      action: 'accept',
      content: { confirm: true }
    }));

    const result = await client.callTool({
      name: 'stacktape_cli',
      arguments: {
        action: 'run',
        command: 'delete',
        args: { stage: 'dev', region: 'us-east-1' },
        confirm: true
      }
    });

    expect(readEnvelope(result)).toMatchObject({ ok: true, code: 'OK' });
    expect(executions).toBe(1);
  });

  test('passes the explicit top-level project cwd to the CLI executor', async () => {
    let executedCwd: string | undefined;
    const client = await createTestClient({
      runCli: ({ cwd }) => {
        executedCwd = cwd;
        return successfulRun(cwd || process.cwd());
      }
    });
    const projectCwd = resolve(process.cwd(), 'project-a');

    expect(
      readEnvelope(
        await client.callTool({
          name: 'stacktape_cli',
          arguments: { action: 'run', command: 'info:whoami', cwd: projectCwd }
        })
      )
    ).toMatchObject({ ok: true, code: 'OK' });
    expect(executedCwd).toBe(projectCwd);
  });

  test('binds confirmation to exact arguments and consumes it before execution', async () => {
    let executions = 0;
    const client = await createTestClient({
      autoFulfill: false,
      runCli: ({ cwd }) => {
        executions += 1;
        return successfulRun(cwd || process.cwd());
      }
    });
    const originalArguments = {
      action: 'run',
      command: 'delete',
      cwd: process.cwd(),
      args: { stage: 'dev', region: 'us-east-1' },
      confirm: true
    };
    const first = await client.callTool(
      { name: 'stacktape_cli', arguments: originalArguments },
      { allowInputRequired: true }
    );
    expect(isInputRequiredResult(first)).toBe(true);
    const required = first as unknown as InputRequiredResult;
    const inputKey = Object.keys(required.inputRequests || {})[0];
    const acceptedResponse = {
      [inputKey]: { action: 'accept' as const, content: { confirm: true } }
    };

    const mismatched = await client.callTool({
      name: 'stacktape_cli',
      arguments: {
        ...originalArguments,
        args: { stage: 'production', region: 'us-east-1' }
      },
      requestState: required.requestState,
      inputResponses: acceptedResponse
    } as unknown as Parameters<Client['callTool']>[0]);
    expect(readEnvelope(mismatched)).toMatchObject({ ok: false, code: 'USER_CONFIRMATION_REQUIRED' });
    expect(executions).toBe(0);

    const fresh = await client.callTool(
      { name: 'stacktape_cli', arguments: originalArguments },
      { allowInputRequired: true }
    );
    expect(isInputRequiredResult(fresh)).toBe(true);
    const freshRequired = fresh as unknown as InputRequiredResult;
    const freshInputKey = Object.keys(freshRequired.inputRequests || {})[0];
    const retry = {
      name: 'stacktape_cli',
      arguments: originalArguments,
      requestState: freshRequired.requestState,
      inputResponses: {
        [freshInputKey]: { action: 'accept' as const, content: { confirm: true } }
      }
    };

    expect(readEnvelope(await client.callTool(retry as unknown as Parameters<Client['callTool']>[0]))).toMatchObject({
      ok: true,
      code: 'OK'
    });
    expect(executions).toBe(1);
    expect(readEnvelope(await client.callTool(retry as unknown as Parameters<Client['callTool']>[0]))).toMatchObject({
      ok: false,
      code: 'USER_CONFIRMATION_REQUIRED'
    });
    expect(executions).toBe(1);
  });
});
