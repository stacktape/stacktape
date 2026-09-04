import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdtemp, mkdir, readFile, realpath, rm } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
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
      const canonicalCwd = await realpath(cwd);
      const result = await runStacktapeCommandJsonl({
        command: fixturePath,
        cwd,
        args: { currentWorkingDirectory: 'app' }
      });

      expect(result.ok).toBe(true);
      expect(result.data).toMatchObject({
        cwd: canonicalCwd,
        currentWorkingDirectory: join(canonicalCwd, 'app')
      });
      expect(result.resolvedContext).toEqual({
        cwd: canonicalCwd,
        currentWorkingDirectory: join(canonicalCwd, 'app')
      });
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

  test('returns typed cancellation and reaps the subprocess tree', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'stacktape-mcp-runner-cancel-'));
    const pidFile = join(cwd, 'child.pid');
    try {
      const controller = new AbortController();
      const result = await runStacktapeCommandJsonl({
        command: fixturePath,
        cwd,
        args: { mode: 'hang', pidFile },
        signal: controller.signal,
        onProgress: () => controller.abort()
      });

      expect(result).toMatchObject({ ok: false, code: 'CANCELLED' });
      const childPid = Number(await readFile(pidFile, 'utf8'));
      expect(await waitForProcessExit(childPid)).toBe(true);
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
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
});
