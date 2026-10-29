import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdtemp, mkdir, readFile, realpath, rm } from 'node:fs/promises';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { rememberEnvironmentApiKey } from '@application-services/global-state-manager/runner-credentials';
import { runStacktapeCommandJsonl } from './cli-jsonl-runner';

const fixturePath = resolve(dirname(import.meta.path), '__fixtures__', 'agent-cli.ts');
let previousCommand: string | undefined;

const processExists = (pid: number): boolean => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

const waitForProcessExit = async (pid: number): Promise<boolean> => {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (!processExists(pid)) return true;
    await new Promise((resolveWait) => setTimeout(resolveWait, 50));
  }
  return !processExists(pid);
};

beforeEach(() => {
  previousCommand = process.env.STACKTAPE_MCP_CLI_COMMAND;
  process.env.STACKTAPE_MCP_CLI_COMMAND = process.execPath;
});

afterEach(() => {
  if (previousCommand === undefined) delete process.env.STACKTAPE_MCP_CLI_COMMAND;
  else process.env.STACKTAPE_MCP_CLI_COMMAND = previousCommand;
});

describe('MCP Stacktape agent subprocess runner', () => {
  test('uses one absolute project context for the child process and CLI arguments', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'stacktape-mcp-runner-cwd-'));
    try {
      await mkdir(join(cwd, 'app'));
      const result = await runStacktapeCommandJsonl({
        command: fixturePath,
        cwd,
        args: { currentWorkingDirectory: 'app' }
      });

      expect(result.ok).toBe(true);
      // The child runs in, and is told about, exactly the context the runner reports.
      expect(result.data).toMatchObject(result.resolvedContext);
      // That context is the requested directory. Windows keeps the caller's 8.3 spelling (RUNNER~1) there, while
      // `realpath` expands it, so the directory is compared, not the string.
      expect(isAbsolute(result.resolvedContext.cwd)).toBe(true);
      expect(await realpath(result.resolvedContext.cwd)).toBe(await realpath(cwd));
      expect(result.resolvedContext.currentWorkingDirectory).toBe(join(result.resolvedContext.cwd, 'app'));
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  test('fails closed when the CLI omits or malforms its required final result', async () => {
    const missing = await runStacktapeCommandJsonl({
      command: fixturePath,
      args: { mode: 'missing-result' }
    });
    expect(missing).toMatchObject({ ok: false, code: 'AGENT_RESULT_MISSING' });

    const malformed = await runStacktapeCommandJsonl({
      command: fixturePath,
      args: { mode: 'malformed-result' }
    });
    expect(malformed).toMatchObject({ ok: false, code: 'AGENT_PROTOCOL_ERROR' });
  });

  test('returns typed timeout and reaps the subprocess tree', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'stacktape-mcp-runner-timeout-'));
    const pidFile = join(cwd, 'child.pid');
    try {
      const result = await runStacktapeCommandJsonl({
        command: fixturePath,
        cwd,
        args: { mode: 'hang', pidFile },
        timeoutMs: 250
      });

      expect(result).toMatchObject({ ok: false, code: 'TIMEOUT' });
      const childPid = Number(await readFile(pidFile, 'utf8'));
      expect(await waitForProcessExit(childPid)).toBe(true);
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  test('hands the CLI flags it parses back into the agent arguments, with the MCP invocation context', async () => {
    const parse = async (parseAs: string, args: Record<string, unknown>) => {
      const result = await runStacktapeCommandJsonl({
        command: fixturePath,
        args: { mode: 'parse', parseAs, ...args },
        clientName: 'cursor'
      });
      expect(result.ok).toBe(true);
      return result.data as { options: Record<string, unknown>; invocation: unknown };
    };

    const deploy = await parse('deploy', {
      stage: 'dev',
      fullDeploy: true,
      disableAutoRollback: false,
      dockerArgs: ['--build-arg', 'VERSION=1,2']
    });
    expect(deploy.options).toMatchObject({
      stage: 'dev',
      fullDeploy: true,
      dockerArgs: ['--build-arg', 'VERSION=1,2']
    });
    expect(deploy.options.disableAutoRollback).toBeUndefined();
    // The Console shows operations started this way as run by an AI agent through MCP.
    expect(deploy.invocation).toEqual({
      initiator: 'ai-agent',
      interface: 'mcp',
      client: 'cursor',
      tool: 'stacktape_cli'
    });

    const awsCall = await parse('aws:call', {
      service: 'dynamodb',
      command: 'Scan',
      input: { TableName: 'orders', Limit: 5 }
    });
    expect(JSON.parse(String(awsCall.options.input))).toEqual({ TableName: 'orders', Limit: 5 });

    expect((await parse('mcp:add', { codingAgents: ['cursor', 'vscode'] })).options.codingAgents).toEqual([
      'cursor',
      'vscode'
    ]);
  });

  test('passes a value that starts with a dash as the value, not as a flag', async () => {
    const run = async (parseAs: string, args: Record<string, unknown>) =>
      (await runStacktapeCommandJsonl({ command: fixturePath, args: { mode: 'parse', parseAs, ...args } })).data as {
        commands: string[];
        options: Record<string, unknown>;
      };

    const sql = await run('query:sql', { sql: '--comment\nSELECT 1', resourceName: 'db', stage: 'r2xx' });
    expect(sql.options).toMatchObject({ sql: '--comment\nSELECT 1', resourceName: 'db', stage: 'r2xx' });
    // A filter of `--help` used to turn the logs call into the help command.
    const logs = await run('logs', { filter: '--help', resourceName: 'app', stage: 'r2xx', limit: 5 });
    expect(logs.commands).toEqual(['logs']);
    expect(logs.options).toMatchObject({ filter: '--help', resourceName: 'app', limit: 5 });
  });

  test('fails a run whose CLI exits with an error after reporting success', async () => {
    const result = await runStacktapeCommandJsonl({ command: fixturePath, args: { mode: 'success-then-crash' } });
    expect(result).toMatchObject({ ok: false, code: 'CLI_EXIT_FAILED' });
    expect(result.message).toContain('code 9');
    expect(result.rawTail).toContain('fatal: flushing the operation record failed');
  });

  // A compiled `stacktape mcp` consumes STACKTAPE_API_KEY at startup like every command, so the CLI runs it starts
  // must get the key from the server rather than from the environment they inherit.
  test('passes a key the server took from its environment to the CLI it runs, and no other key', async () => {
    const readKey = async () =>
      (
        (await runStacktapeCommandJsonl({ command: fixturePath, args: { mode: 'credential' } })).data as {
          apiKey: string | null;
        }
      ).apiKey;
    const previousKey = process.env.STACKTAPE_API_KEY;
    delete process.env.STACKTAPE_API_KEY;
    try {
      rememberEnvironmentApiKey('mcp-runner-synthetic-key');
      expect(await readKey()).toBe('mcp-runner-synthetic-key');
      // A stored login: the child reads it itself.
      rememberEnvironmentApiKey(undefined);
      expect(await readKey()).toBeNull();
    } finally {
      rememberEnvironmentApiKey(undefined);
      if (previousKey !== undefined) process.env.STACKTAPE_API_KEY = previousKey;
    }
  });

  test('answers a working directory that does not exist with a validation result', async () => {
    const cwd = join(tmpdir(), `stacktape-mcp-runner-missing-${process.pid}`);
    const result = await runStacktapeCommandJsonl({ command: fixturePath, cwd });
    expect(result).toMatchObject({ ok: false, code: 'VALIDATION_ERROR', resolvedContext: { cwd } });
    expect(result.message).toContain(cwd);
  });
});
