import { EventEmitter } from 'node:events';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { describe, expect, it } from 'bun:test';
import { deployArgs, deployCommandLine, inspectDeployTarget, readResourceUrl, startDeploy } from './run-deploy';
import {
  INIT_TARGET_CHECK_ENV,
  INIT_TARGET_EXPECTATION_ENV,
  INIT_TARGET_SCHEMA_VERSION,
  type DeployTargetExpectation
} from './stack-expectation';

const request = {
  repositoryRoot: '/repo',
  configPath: 'stacktape.yml',
  stage: 'dev',
  region: 'eu-west-1',
  projectName: 'orders'
};

const CONFIG_SHA256 = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

/** A child process that emits what we tell it to, then exits. */
const fakeChild = (stdout: string[], stderr: string[] = [], exitCode = 0) => {
  const child = new EventEmitter() as EventEmitter & { stdout: Readable; stderr: Readable; kill: () => void };
  child.stdout = Readable.from(stdout);
  child.stderr = Readable.from(stderr);
  child.kill = () => {};
  // Both streams are consumed before the process is said to have closed, which is the order Node
  // uses and the order the parser depends on.
  setTimeout(() => child.emit('close', exitCode), 10);
  return child;
};

describe('the deploy command line', () => {
  it('names everything the deploy needs, and asks for the machine-readable stream', () => {
    expect(deployArgs(request)).toEqual([
      'deploy',
      '--configPath',
      join('/repo', 'stacktape.yml'),
      // The working directory travels as a flag rather than as the spawn cwd, because in
      // development the wrapper that builds the CLI must keep its own.
      '--currentWorkingDirectory',
      '/repo',
      '--stage',
      'dev',
      '--region',
      'eu-west-1',
      '--projectName',
      'orders',
      '--agent'
    ]);
  });

  it('shows the user the same command without our own machine-readable flag', () => {
    // What is displayed has to be what a person would type; `--agent` would give them JSONL.
    expect(deployCommandLine(request)).toBe(
      'stacktape deploy --configPath stacktape.yml --stage dev --region eu-west-1 --projectName orders'
    );
  });

  it('carries an explicit connected-account selection into child and copyable commands', () => {
    const selected = { ...request, awsAccount: 'production-account' };
    const args = deployArgs(selected);
    expect(args.slice(args.indexOf('--awsAccount'), args.indexOf('--awsAccount') + 2)).toEqual([
      '--awsAccount',
      'production-account'
    ]);
    expect(deployCommandLine(selected)).toEndWith('--awsAccount production-account');
  });
});

describe('reading what the deploy says', () => {
  it('parses the event stream and keeps unparseable output as log lines', async () => {
    const events: unknown[] = [];
    const lines: string[] = [];

    const handle = startDeploy({
      request,
      onEvent: (event) => events.push(event),
      onLine: (line) => lines.push(line),
      spawnChild: (() =>
        fakeChild(
          [
            `${JSON.stringify({ type: 'event', phase: 'DEPLOY', eventType: 'UPDATE_STACK', status: 'started', message: 'Creating' })}\n`,
            // Split across chunks mid-line: a stream does not respect line boundaries, and a parser
            // that assumes it does drops or corrupts whichever event happens to straddle a read.
            `${JSON.stringify({ type: 'result', ok: true, code: 'OK', message: 'Deployed' }).slice(0, 20)}`,
            `${JSON.stringify({ type: 'result', ok: true, code: 'OK', message: 'Deployed' }).slice(20)}\n`,
            'not json at all\n'
          ],
          ['a warning on stderr\n']
        )) as never
    });

    expect(await handle.finished).toBe(0);
    expect(events).toEqual([
      { type: 'event', phase: 'DEPLOY', eventType: 'UPDATE_STACK', status: 'started', message: 'Creating' },
      { type: 'result', ok: true, code: 'OK', message: 'Deployed' }
    ]);
    expect(lines).toEqual(['not json at all', 'a warning on stderr']);
  });

  it('reports a child that could not start rather than hanging', async () => {
    const lines: string[] = [];
    const child = new EventEmitter() as EventEmitter & { stdout: null; stderr: null; kill: () => void };
    child.stdout = null;
    child.stderr = null;
    child.kill = () => {};
    setTimeout(() => child.emit('error', new Error('spawn stacktape ENOENT')), 5);

    const handle = startDeploy({
      request,
      onEvent: () => {},
      onLine: (line) => lines.push(line),
      spawnChild: (() => child) as never
    });

    expect(await handle.finished).toBe(1);
    expect(lines[0]).toContain('ENOENT');
  });

  it('transports the exact expectation and disables target-check mode in the deploy child', async () => {
    const expectation: DeployTargetExpectation = {
      schemaVersion: INIT_TARGET_SCHEMA_VERSION,
      expected: 'update',
      accountId: '123456789012',
      stackName: 'orders-dev',
      projectName: 'orders',
      stage: 'dev',
      region: 'eu-west-1',
      configSha256: CONFIG_SHA256,
      stackId: 'arn:aws:cloudformation:eu-west-1:123456789012:stack/orders-dev/one'
    };
    let environment: NodeJS.ProcessEnv | undefined;
    const handle = startDeploy({
      request: { ...request, targetExpectation: expectation },
      onEvent: () => {},
      onLine: () => {},
      spawnChild: ((_: string, __: string[], options: { env?: NodeJS.ProcessEnv }) => {
        environment = options.env;
        return fakeChild([]);
      }) as never
    });

    expect(await handle.finished).toBe(0);
    expect(environment?.[INIT_TARGET_CHECK_ENV]).toBe('');
    expect(environment?.[INIT_TARGET_EXPECTATION_ENV]).toBe(JSON.stringify(expectation));
  });
});

describe('reading a deployed resource URL', () => {
  it('accepts only the typed HTTPS result from param:get', async () => {
    let childArgs: string[] = [];
    const url = await readResourceUrl({
      request: {
        projectName: 'orders',
        stage: 'dev',
        region: 'eu-west-1',
        resourceName: 'api',
        awsAccount: 'production-account'
      },
      spawnChild: ((_: string, args: string[]) => {
        childArgs = args;
        return fakeChild([
          'untrusted build output: https://attacker.example\n',
          `${JSON.stringify({
            type: 'result',
            ok: true,
            code: 'OK',
            message: 'param:get completed',
            data: { result: 'https://api.example.com' }
          })}\n`
        ]);
      }) as never
    });

    expect(url).toBe('https://api.example.com/');
    expect(childArgs.slice(childArgs.indexOf('--awsAccount'), childArgs.indexOf('--awsAccount') + 2)).toEqual([
      '--awsAccount',
      'production-account'
    ]);
  });

  it('rejects a non-HTTPS typed value', async () => {
    const url = await readResourceUrl({
      request: { projectName: 'orders', stage: 'dev', region: 'eu-west-1', resourceName: 'api' },
      spawnChild: (() =>
        fakeChild([
          `${JSON.stringify({ type: 'result', ok: true, data: { result: 'http://localhost:3000' } })}\n`
        ])) as never
    });

    expect(url).toBeUndefined();
  });

  it('rejects multiple terminal URL results rather than choosing one', async () => {
    const url = await readResourceUrl({
      request: { projectName: 'orders', stage: 'dev', region: 'eu-west-1', resourceName: 'api' },
      spawnChild: (() =>
        fakeChild([
          `${JSON.stringify({ type: 'result', ok: true, data: { result: 'https://api.example.com' } })}\n`,
          `${JSON.stringify({ type: 'result', ok: true, data: { result: 'https://other.example.com' } })}\n`
        ])) as never
    });

    expect(url).toBeUndefined();
  });

  it('stops a lookup that never finishes', async () => {
    const child = new EventEmitter() as EventEmitter & { stdout: Readable; stderr: null };
    child.stdout = new Readable({ read() {} });
    child.stderr = null;
    let terminated = false;

    const url = await readResourceUrl({
      request: { projectName: 'orders', stage: 'dev', region: 'eu-west-1', resourceName: 'api' },
      spawnChild: (() => child) as never,
      timeoutMs: 5,
      terminate: () => {
        terminated = true;
      }
    });

    expect(url).toBeUndefined();
    expect(terminated).toBe(true);
  });
});

describe('checking the deploy target with deploy credentials', () => {
  it('accepts only the typed target result and ignores untrusted output', async () => {
    const target = {
      schemaVersion: INIT_TARGET_SCHEMA_VERSION,
      accountId: '123456789012',
      stackName: 'orders-dev',
      projectName: 'orders',
      stage: 'dev',
      region: 'eu-west-1',
      configSha256: CONFIG_SHA256,
      status: 'absent'
    } as const;
    const observed = await inspectDeployTarget({
      request,
      spawnChild: (() =>
        fakeChild([
          `${JSON.stringify({ status: 'updateable', stackId: 'attacker-controlled' })}\n`,
          `${JSON.stringify({ type: 'result', ok: true, data: { result: target } })}\n`
        ])) as never
    });

    expect(observed).toEqual(target);
  });

  it('enables only target-check mode and clears any inherited expectation', async () => {
    const target = {
      schemaVersion: INIT_TARGET_SCHEMA_VERSION,
      accountId: '123456789012',
      stackName: 'orders-dev',
      projectName: 'orders',
      stage: 'dev',
      region: 'eu-west-1',
      configSha256: CONFIG_SHA256,
      status: 'absent'
    } as const;
    let environment: NodeJS.ProcessEnv | undefined;
    const observed = await inspectDeployTarget({
      request,
      spawnChild: ((_: string, __: string[], options: { env?: NodeJS.ProcessEnv }) => {
        environment = options.env;
        return fakeChild([`${JSON.stringify({ type: 'result', ok: true, data: { result: target } })}\n`]);
      }) as never
    });

    expect(observed).toEqual(target);
    expect(environment?.[INIT_TARGET_CHECK_ENV]).toBe('1');
    expect(environment?.[INIT_TARGET_EXPECTATION_ENV]).toBe('');
  });

  it('fails closed when the target child fails or never returns a typed result', async () => {
    expect(
      await inspectDeployTarget({
        request,
        spawnChild: (() => fakeChild(['plain output\n'], [], 1)) as never
      })
    ).toBeUndefined();
    expect(
      await inspectDeployTarget({
        request,
        spawnChild: (() =>
          fakeChild([
            `${JSON.stringify({
              type: 'result',
              ok: true,
              data: {
                result: {
                  schemaVersion: INIT_TARGET_SCHEMA_VERSION,
                  accountId: '123456789012',
                  stackName: 'another-dev',
                  projectName: 'another',
                  stage: 'dev',
                  region: 'eu-west-1',
                  configSha256: CONFIG_SHA256,
                  status: 'absent'
                }
              }
            })}\n`
          ])) as never
      })
    ).toBeUndefined();
  });

  it('rejects multiple target results and terminates an aborted check', async () => {
    const target = {
      schemaVersion: INIT_TARGET_SCHEMA_VERSION,
      accountId: '123456789012',
      stackName: 'orders-dev',
      projectName: 'orders',
      stage: 'dev',
      region: 'eu-west-1',
      configSha256: CONFIG_SHA256,
      status: 'absent'
    } as const;
    expect(
      await inspectDeployTarget({
        request,
        spawnChild: (() =>
          fakeChild([
            `${JSON.stringify({ type: 'result', ok: true, data: { result: target } })}\n`,
            `${JSON.stringify({ type: 'result', ok: true, data: { result: target } })}\n`
          ])) as never
      })
    ).toBeUndefined();

    const child = new EventEmitter() as EventEmitter & { stdout: Readable; stderr: null };
    child.stdout = new Readable({ read() {} });
    child.stderr = null;
    const controller = new AbortController();
    let terminated = false;
    const pending = inspectDeployTarget({
      request,
      spawnChild: (() => child) as never,
      signal: controller.signal,
      terminate: () => {
        terminated = true;
      }
    });
    controller.abort();

    expect(await pending).toBeUndefined();
    expect(terminated).toBe(true);
  });
});
