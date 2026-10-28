import { afterEach, describe, expect, test } from 'bun:test';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
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
      rawTail?: string;
      nextActions?: string[];
    };
  return { call, runs, client };
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

  // r2gg: a failed deploy's message named the failure, and the result also carried 3 KB of output with the template.
  test('keeps the output of a failure the CLI explained in a log file instead of the result', async () => {
    const template = 'Resources:\n  ReportJobDefinition:\n    Type: AWS::Batch::JobDefinition';
    const { call } = await connect(() => ({
      ok: false,
      code: 'STACK_ERROR',
      message: 'Resource ReportJobDefinition (part of report): Property [Vcpus] expected type: Integer, found: Float',
      cliReportedResult: true,
      rawTail: template
    }));

    const output = await call({
      action: 'run',
      command: 'deploy',
      args: { projectName: 'shop-api', stage: 'production', region: 'eu-west-1' },
      confirm: true
    });

    expect(output.ok).toBe(false);
    expect(output.rawTail).toBeUndefined();
    const outputLog = (output.data as { outputLog?: string }).outputLog!;
    expect(output.nextActions?.join(' ')).toContain(outputLog);
    expect(await readFile(outputLog, 'utf8')).toBe(`${template}\n`);
    // Only the user may read the log: a private directory per user and a private file in it.
    if (process.platform !== 'win32') {
      expect((await stat(outputLog)).mode & 0o777).toBe(0o600);
      expect((await stat(dirname(outputLog))).mode & 0o777).toBe(0o700);
      expect(basename(dirname(outputLog))).toBe(`stacktape-mcp-${process.getuid?.()}`);
    }
    await rm(outputLog, { force: true });
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

    for (const [command, args] of [
      ['secret:get', { region: 'eu-west-1', secretName: 'stripe' }],
      ['param:get', { region: 'eu-west-1', stage: 'production', resourceName: 'database', paramName: 'password' }]
    ] as const) {
      const output = await call({ action: 'run', command, args });
      expect(output.ok, command).toBe(true);
      expect(JSON.stringify(output), command).not.toContain('correct-horse-battery-staple');
    }
  });

  test('summarizes a compiled template instead of returning it', async () => {
    const template = {
      Description: 'shop-api production',
      Resources: {
        UploadsBucket: { Type: 'AWS::S3::Bucket', Properties: { BucketName: 'shop-api-production-uploads-8f3a' } },
        OrdersApiRole: { Type: 'AWS::IAM::Role', Properties: { RoleName: 'shop-api-production-orders' } }
      },
      Outputs: { UploadsBucketName: { Value: { Ref: 'UploadsBucket' } } }
    };
    const { call } = await connect(() => ({ data: { result: template } }));

    const output = await call({
      action: 'run',
      command: 'synth',
      args: { projectName: 'shop-api', stage: 'production', region: 'eu-west-1' }
    });

    expect(output.ok).toBe(true);
    expect(output.data?.cli.summary).toEqual({
      compiled: true,
      description: 'shop-api production',
      resourceCount: 2,
      outputCount: 1
    });
    expect(JSON.stringify(output)).not.toContain('shop-api-production-uploads-8f3a');
  });

  test('plans a secret command without printing the secret in its shell command', async () => {
    const { call, runs } = await connect();

    const output = await call({
      action: 'plan',
      command: 'secret:set',
      args: { region: 'eu-west-1', secretName: 'stripe', secretValue: 'correct-horse-battery-staple' }
    });

    expect(output.ok).toBe(true);
    expect(output.data?.shellCommand).toStartWith(
      'stacktape secret set --region eu-west-1 --secret-name stripe --value '
    );
    expect(JSON.stringify(output)).not.toContain('correct-horse-battery-staple');
    expect(runs).toHaveLength(0);
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

  // Review of #364: `follow` keeps logs running until stopped, so the call would hang until the runner's timeout.
  test('keeps follow out of logs and refuses it with the dev tool as the way to watch logs', async () => {
    const { call, runs } = await connect();

    const description = await call({ action: 'describe', command: 'logs' });
    expect(description.data?.allowedArgs).not.toContain('follow');
    expect(Object.keys(description.data?.args ?? {})).not.toContain('follow');

    const output = await call({
      action: 'run',
      command: 'logs',
      args: {
        projectName: 'shop-api',
        stage: 'production',
        region: 'eu-west-1',
        resourceName: 'ordersApi',
        follow: true
      }
    });
    expect(output).toMatchObject({
      ok: false,
      code: 'VALIDATION_ERROR',
      message: expect.stringContaining('stacktape_dev tool with action "logs"'),
      data: { refusedArg: 'follow' }
    });
    expect(runs).toHaveLength(0);
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

describe('project settings declared in stacktape.ts', () => {
  /** A project whose config declares its target and whose code would leave a marker if anything imported it. */
  const projectWithSettings = async (settings = "{ projectName: 'shop', region: 'eu-central-1' }") => {
    const project = await mkdtemp(join(tmpdir(), 'stacktape-mcp-settings-'));
    cleanups.push(() => rm(project, { recursive: true, force: true }));
    const marker = join(project, 'config-ran.marker');
    await writeFile(
      join(project, 'stacktape.ts'),
      `import { writeFileSync } from 'node:fs';
import { Bucket, defineConfig } from 'stacktape';
writeFileSync(${JSON.stringify(marker)}, 'project code ran');
export default defineConfig(${settings}, () => ({ resources: { uploads: new Bucket({}) } }));
`
    );
    // A stale script names another target; the config's declaration wins over this guess.
    await writeFile(
      join(project, 'package.json'),
      JSON.stringify({
        name: 'shop',
        scripts: { deploy: 'stacktape deploy --projectName old-shop --stage production --region us-east-1' }
      })
    );
    return { project, marker };
  };

  test('run leaves the declared target to the CLI instead of demanding or guessing it', async () => {
    const { project, marker } = await projectWithSettings();
    const { call, runs } = await connect();

    const output = await call({
      action: 'run',
      command: 'logs',
      cwd: project,
      stage: 'production',
      resourceName: 'api'
    });

    expect(output.ok).toBe(true);
    expect(runs).toEqual([{ command: 'logs', args: { stage: 'production', resourceName: 'api' } }]);
    expect(existsSync(marker)).toBe(false);
  });

  test('plan reports the declared target and drops the package script guess, without running project code', async () => {
    const { project, marker } = await projectWithSettings();
    const { call } = await connect();

    const output = await call({ action: 'plan', command: 'deploy', cwd: project, stage: 'production' });

    expect(output.ok).toBe(true);
    expect(output.data?.args.projectName).toBeUndefined();
    expect(output.data?.args.region).toBeUndefined();
    expect(output.data?.resolvedContext.projectSettings).toEqual({
      configPath: join(project, 'stacktape.ts'),
      projectName: 'shop',
      region: 'eu-central-1'
    });
    expect(output.data?.matchedPackageScript.droppedParsedArgs).toEqual(
      expect.arrayContaining(['projectName', 'region'])
    );
    expect(existsSync(marker)).toBe(false);
  });

  test('plan explains settings it cannot read statically', async () => {
    const { project } = await projectWithSettings("{ projectName: 'shop', region: process.env.REGION }");
    const { call } = await connect();

    const output = await call({ action: 'plan', command: 'deploy', cwd: project, stage: 'production' });

    expect(output.ok).toBe(false);
    expect(output.code).toBe('VALIDATION_ERROR');
    expect(output.data?.errorCode).toBe('CONFIG_PROJECT_SETTINGS_INVALID');
  });

  test('the dev planner needs no region when the config declares one', async () => {
    const { project, marker } = await projectWithSettings();
    const { client } = await connect();

    const output = (
      await client.callTool({ name: 'stacktape_dev', arguments: { action: 'plan', args: { cwd: project } } })
    ).structuredContent as { ok: boolean; data?: Record<string, any> };

    expect(output.ok).toBe(true);
    expect(output.data?.args.region).toBeUndefined();
    expect(output.data?.resolvedContext.projectSettings.region).toBe('eu-central-1');
    expect(existsSync(marker)).toBe(false);
  });
});
