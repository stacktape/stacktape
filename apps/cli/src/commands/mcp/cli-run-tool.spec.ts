import { afterEach, describe, expect, test } from 'bun:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Client, InMemoryTransport } from '@modelcontextprotocol/client';
import type { RunStacktapeResult } from './cli-jsonl-runner';
import { createMcpServer, serveStacktapeMcp } from './index';

// stacktape_cli action=run the way agents call it in practice: arguments at the top level as often as in `args`,
// no project name, and read commands whose data arrives as a JSON log line.

const cleanups: Array<() => Promise<void>> = [];

afterEach(async () => {
  await Promise.all(cleanups.splice(0).map((cleanup) => cleanup().catch(() => {})));
});

const connect = async (runResult: (cwd: string) => Partial<RunStacktapeResult> = () => ({})) => {
  const runs: Array<{ command: string; args?: Record<string, unknown> }> = [];
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const handle = serveStacktapeMcp(
    () =>
      createMcpServer(
        async () => {
          throw new Error('Docs index should not be loaded in this test.');
        },
        {
          runCli: async ({ command, args, cwd }) => {
            runs.push({ command, args });
            return {
              ok: true,
              code: 'OK',
              message: `${command} completed`,
              events: [],
              logEvents: [],
              outputEvents: [],
              resolvedContext: { cwd: cwd || process.cwd() },
              ...runResult(cwd || process.cwd())
            };
          }
        }
      ),
    serverTransport
  );
  const client = new Client(
    { name: 'stacktape-cli-run-test', version: '1.0.0' },
    { supportedProtocolVersions: ['2025-11-25'], versionNegotiation: { mode: 'legacy' }, capabilities: {} }
  );
  await client.connect(clientTransport);
  cleanups.push(async () => {
    await client.close();
    await handle.close();
  });
  const call = async (args: Record<string, unknown>) =>
    (await client.callTool({ name: 'stacktape_cli', arguments: args })).structuredContent as {
      ok: boolean;
      code: string;
      data?: Record<string, any>;
    };
  return { call, runs };
};

const projectWithDeployScript = async () => {
  const project = await mkdtemp(join(tmpdir(), 'stacktape-mcp-run-args-'));
  cleanups.push(() => rm(project, { recursive: true, force: true }));
  await writeFile(join(project, 'stacktape.ts'), 'export default {};\n');
  await writeFile(
    join(project, 'package.json'),
    JSON.stringify({
      name: 'shop-api',
      scripts: { deploy: 'stacktape deploy --projectName shop-api --stage production --region eu-west-1' }
    })
  );
  return project;
};

describe('stacktape_cli action=run', () => {
  test('returns the data that read commands print as a JSON log line', async () => {
    const logs = { logGroup: '/aws/lambda/shop-api-production-ordersApi', events: [{ message: 'TypeError' }] };
    const { call } = await connect(() => ({
      data: { result: null },
      rawTail: [
        JSON.stringify({ type: 'log', level: 'info', source: 'cli', message: JSON.stringify(logs, null, 2) }),
        JSON.stringify({ type: 'result', ok: true, code: 'OK', message: 'logs completed', data: { result: null } })
      ].join('\n')
    }));

    const output = await call({
      action: 'run',
      command: 'logs',
      args: { projectName: 'shop-api', stage: 'production', region: 'eu-west-1', resourceName: 'ordersApi' }
    });

    expect(output.ok).toBe(true);
    expect(output.data?.cli).toEqual({ result: logs });
  });

  test('never recovers the printed payload of a command with sensitive output', async () => {
    const { call } = await connect(() => ({
      data: { result: null },
      rawTail: JSON.stringify({
        type: 'log',
        level: 'info',
        message: JSON.stringify({ name: 'stripe', plainText: 'correct-horse-battery-staple' })
      })
    }));

    const output = await call({
      action: 'run',
      command: 'secret:get',
      args: { region: 'eu-west-1', secretName: 'stripe' }
    });

    expect(JSON.stringify(output)).not.toContain('correct-horse-battery-staple');
  });

  test('keeps the newest log events when the whole result is too large for one response', async () => {
    const events = Array.from({ length: 400 }, (_, index) => ({
      timestamp: new Date(Date.UTC(2026, 9, 21, 20, 0, index)).toISOString(),
      message: `event ${index} ${'x'.repeat(200)}`
    }));
    const { call } = await connect(() => ({
      data: { result: null },
      rawTail: JSON.stringify({ type: 'log', level: 'info', message: JSON.stringify({ logGroup: 'orders', events }) })
    }));

    const output = await call({
      action: 'run',
      command: 'logs',
      args: { projectName: 'shop-api', stage: 'production', region: 'eu-west-1', resourceName: 'ordersApi' }
    });

    const result = output.data?.cli?.result;
    expect(output).toMatchObject({ ok: true, truncated: true });
    expect(result.omittedItems.events).toBeGreaterThan(0);
    expect(result.events.length + result.omittedItems.events).toBe(400);
    expect(result.events.at(-1).message).toStartWith('event 399 ');
  });

  test('accepts stage, region and resource at the top level as well as in args', async () => {
    const { call, runs } = await connect();

    const output = await call({
      action: 'run',
      command: 'logs',
      projectName: 'shop-api',
      stage: 'production',
      region: 'eu-west-1',
      resourceName: 'ordersApi',
      args: { stage: 'staging' }
    });

    expect(output.ok).toBe(true);
    expect(runs[0]?.args).toMatchObject({
      projectName: 'shop-api',
      stage: 'staging',
      region: 'eu-west-1',
      resourceName: 'ordersApi'
    });
  });

  test("takes the project name and region from the project's Stacktape script, never the stage", async () => {
    const project = await projectWithDeployScript();
    const { call, runs } = await connect();

    const output = await call({
      action: 'run',
      command: 'logs',
      cwd: project,
      args: { stage: 'staging', resourceName: 'ordersApi' }
    });
    expect(output.ok).toBe(true);
    expect(runs[0]?.args).toMatchObject({ projectName: 'shop-api', region: 'eu-west-1', stage: 'staging' });

    const withoutStage = await call({
      action: 'run',
      command: 'logs',
      cwd: project,
      args: { resourceName: 'ordersApi' }
    });
    expect(withoutStage).toMatchObject({ ok: false, code: 'VALIDATION_ERROR' });
    expect(runs).toHaveLength(1);
  });

  test('keeps output-mode arguments out of describe and rejects them on run', async () => {
    const { call, runs } = await connect();

    const description = await call({ action: 'describe', command: 'logs' });
    expect(description.data?.allowedArgs).not.toContain('agent');
    expect(Object.keys(description.data?.args ?? {})).not.toContain('outputFormat');

    const output = await call({
      action: 'run',
      command: 'logs',
      args: {
        projectName: 'shop-api',
        stage: 'production',
        region: 'eu-west-1',
        resourceName: 'ordersApi',
        agent: true
      }
    });
    expect(output).toMatchObject({ ok: false, code: 'VALIDATION_ERROR' });
    expect(runs).toHaveLength(0);
  });
});
