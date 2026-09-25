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
      'stacktape_incident',
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

  test('keeps read-only SQL frictionless and rejects writes without requesting MRTR confirmation', async () => {
    let executions = 0;
    let confirmations = 0;
    const client = await createTestClient({
      runCli: ({ cwd }) => {
        executions += 1;
        return successfulRun(cwd || process.cwd());
      }
    });
    client.setRequestHandler('elicitation/create', async () => {
      confirmations += 1;
      return { action: 'accept', content: { confirm: true } };
    });
    const target = { stage: 'dev', region: 'us-east-1', resourceName: 'database' };

    expect(
      readEnvelope(
        await client.callTool({
          name: 'stacktape_cli',
          arguments: { action: 'run', command: 'query:sql', args: { ...target, sql: 'SELECT 1' } }
        })
      )
    ).toMatchObject({ ok: true, code: 'OK' });
    expect(confirmations).toBe(0);

    expect(
      readEnvelope(
        await client.callTool({
          name: 'stacktape_cli',
          arguments: {
            action: 'run',
            command: 'query:sql',
            args: { ...target, sql: 'DELETE FROM customers' },
            confirm: true
          }
        })
      )
    ).toMatchObject({
      ok: false,
      code: 'VALIDATION_ERROR',
      data: { supportedReadOnlyStatements: ['SELECT', 'WITH', 'VALUES', 'SHOW', 'DESCRIBE', 'EXPLAIN'] }
    });
    expect(confirmations).toBe(0);
    expect(executions).toBe(1);
  });

  test('runs diagnostic AWS reads directly, rejects unreviewed operations, and keeps mutations gated', async () => {
    const executed: string[] = [];
    const client = await createTestClient({
      runCli: ({ command, cwd }) => {
        executed.push(command);
        return successfulRun(cwd || process.cwd());
      }
    });
    const awsCall = (operation: { service: string; command: string }) =>
      client.callTool({
        name: 'stacktape_cli',
        arguments: {
          action: 'run',
          command: 'aws:call',
          args: { stage: 'production', region: 'eu-west-1', ...operation }
        }
      });

    expect(readEnvelope(await awsCall({ service: 'logs', command: 'FilterLogEvents' }))).toMatchObject({
      ok: true,
      code: 'OK'
    });
    expect(readEnvelope(await awsCall({ service: 'secretsmanager', command: 'GetSecretValue' }))).toMatchObject({
      ok: false,
      code: 'VALIDATION_ERROR',
      data: { acceptedOperations: expect.arrayContaining(['DescribeSecret', 'ListSecrets']) }
    });
    expect(
      readEnvelope(
        await client.callTool({
          name: 'stacktape_cli',
          arguments: { action: 'run', command: 'deploy', args: { stage: 'production', region: 'eu-west-1' } }
        })
      )
    ).toMatchObject({ ok: false, code: 'CONFIRMATION_REQUIRED' });
    expect(executed).toEqual(['aws:call']);
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

// The CLI's final agent record carries a command's own return value under `data.result`.
const cliResult = (result: unknown, cwd: string): RunStacktapeResult => ({
  ...successfulRun(cwd),
  message: 'incidents:show completed',
  data: { result }
});

describe('stacktape_incident', () => {
  test('returns one incident handoff from the CLI, through the same command a person would run', async () => {
    const calls: Array<{ command: string; args?: Record<string, unknown> }> = [];
    const handoff = '# Incident: Uptime check "home" is down\n\n## For the investigating agent\nDiagnose first.';
    const client = await createTestClient({
      runCli: ({ command, args, cwd }) => {
        calls.push({ command, args });
        return cliResult({ markdown: handoff }, cwd || process.cwd());
      }
    });

    const result = readEnvelope(
      await client.callTool({ name: 'stacktape_incident', arguments: { action: 'show', incidentId: 'inc_123' } })
    );

    expect(calls).toEqual([{ command: 'incidents:show', args: { incidentId: 'inc_123' } }]);
    expect(result).toMatchObject({ ok: true, data: { incidentId: 'inc_123', format: 'markdown', content: handoff } });
  });

  test('lists incidents with the filters mapped to the CLI arguments', async () => {
    const calls: Array<{ command: string; args?: Record<string, unknown> }> = [];
    const incident = {
      id: 'inc_123',
      status: 'RESOLVED',
      severity: 'ERROR',
      title: 'Uptime check "home" is down',
      project: 'shop',
      stage: 'production',
      region: 'eu-west-1',
      isProduction: true,
      openedAt: '2026-09-20T10:00:00.000Z',
      acknowledgedAt: null,
      resolvedAt: '2026-09-20T10:20:00.000Z',
      resolveReason: 'RECOVERED',
      deploymentVersion: 'v000042',
      gitCommit: 'abc123',
      signals: [{ kind: 'UPTIME_DOWN', state: 'RECOVERED', title: 'Uptime check "home" is down' }]
    };
    const client = await createTestClient({
      runCli: ({ command, args, cwd }) => {
        calls.push({ command, args });
        return cliResult([incident], cwd || process.cwd());
      }
    });

    const result = readEnvelope(
      await client.callTool({
        name: 'stacktape_incident',
        arguments: { action: 'list', projectName: 'shop', stage: 'production', status: 'ALL', limit: 5 }
      })
    );

    expect(calls).toEqual([
      { command: 'incidents', args: { projectName: 'shop', stage: 'production', incidentStatus: 'ALL', limit: 5 } }
    ]);
    expect(result).toMatchObject({
      ok: true,
      data: {
        incidents: [
          {
            id: 'inc_123',
            status: 'RESOLVED',
            title: 'Uptime check "home" is down',
            signals: { total: 1, active: 0, kinds: ['UPTIME_DOWN'] }
          }
        ]
      }
    });
  });

  test('keeps a full page of incidents with many long signals inside one bounded response', async () => {
    const kinds = [
      'ERROR_GROUP',
      'ALARM_FIRING',
      'UPTIME_DOWN',
      'PROBER_SILENT',
      'SYNTHETIC_FAILING',
      'STACK_UNHEALTHY',
      'CERT_EXPIRING'
    ];
    const signalTitle = (index: number) => `Error: ${'x'.repeat(180)} ${index}`;
    const incidents = Array.from({ length: 100 }, (_, incidentIndex) => ({
      id: `inc_${String(incidentIndex).padStart(22, '0')}`,
      status: 'OPEN',
      severity: 'ERROR',
      title: `Error: TypeError: Cannot read properties of undefined (reading "items") in handler ${incidentIndex}`,
      project: 'shop',
      stage: 'production',
      region: 'eu-west-1',
      isProduction: true,
      openedAt: '2026-09-24T10:00:00.000Z',
      acknowledgedAt: null,
      resolvedAt: null,
      resolveReason: null,
      deploymentVersion: 'v000042',
      gitCommit: 'abc123',
      signals: Array.from({ length: 12 }, (_, index) => ({
        kind: kinds[index % kinds.length],
        state: index % 3 ? 'ACTIVE' : 'RECOVERED',
        title: signalTitle(index)
      }))
    }));
    const client = await createTestClient({ runCli: ({ cwd }) => cliResult(incidents, cwd || process.cwd()) });

    const result = await client.callTool({ name: 'stacktape_incident', arguments: { action: 'list', limit: 100 } });
    const envelope = readEnvelope(result);
    const listed = envelope.data?.incidents as Array<Record<string, unknown>>;

    expect(envelope).toMatchObject({ ok: true, code: 'OK' });
    expect((result.content as Array<{ text: string }>)[0].text.length).toBeLessThan(30_000);
    expect(listed.length).toBeGreaterThan(0);
    expect(envelope.data?.omitted ?? 0).toBe(100 - listed.length);
    expect(listed[0]).toMatchObject({
      id: incidents[0].id,
      signals: { total: 12, active: 8, kinds: kinds.slice(0, 5) }
    });
    expect(JSON.stringify(listed)).not.toContain(signalTitle(0));
  });

  test('reports a failed lookup without context and does not run the CLI without an incident ID', async () => {
    let executions = 0;
    const client = await createTestClient({
      runCli: ({ cwd }) => {
        executions += 1;
        return {
          ...successfulRun(cwd || process.cwd()),
          ok: false,
          code: 'NOT_FOUND',
          message: 'Incident not found.',
          data: undefined
        };
      }
    });

    expect(
      readEnvelope(await client.callTool({ name: 'stacktape_incident', arguments: { action: 'show' } }))
    ).toMatchObject({ ok: false, code: 'VALIDATION_ERROR' });
    expect(executions).toBe(0);

    const failed = readEnvelope(
      await client.callTool({ name: 'stacktape_incident', arguments: { action: 'show', incidentId: 'inc_other' } })
    );
    expect(failed).toMatchObject({ ok: false, code: 'NOT_FOUND', message: 'Incident not found.' });
    expect(failed.data?.content).toBeUndefined();
    expect(executions).toBe(1);
  });
});
