import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { countProcessGroupMembers, runBoundedProcess } from './bounded-process';

let root: string;

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'stacktape-bounded-process-'));
});

afterAll(async () => {
  await rm(root, { recursive: true, force: true });
});

/**
 * Runs `body` in a separate Bun process that uses `runBoundedProcess`, and returns how long that whole process took.
 * The separate process is itself bounded by `Bun.spawnSync`, so a harness kept alive by a timer fails the test instead
 * of hanging it.
 */
const timeHarnessProcess = async (name: string, body: string) => {
  const script = join(root, `${name}.ts`);
  await writeFile(
    script,
    `import { runBoundedProcess } from ${JSON.stringify(join(import.meta.dir, 'bounded-process.ts'))};\n${body}\n`
  );
  const startedAt = performance.now();
  const harness = Bun.spawnSync({ cmd: [process.execPath, script], stdout: 'pipe', stderr: 'pipe', timeout: 30_000 });
  return {
    exitCode: harness.exitCode,
    stdout: harness.stdout.toString(),
    stderr: harness.stderr.toString(),
    ms: performance.now() - startedAt
  };
};

const env = { PATH: '/usr/bin:/bin' };

describe('runBoundedProcess', () => {
  test('reports exit code, output and resource use', async () => {
    const result = await runBoundedProcess({
      cmd: ['sh', '-c', 'echo out; echo err >&2; exit 7'],
      cwd: '/',
      env,
      timeoutMs: 10_000
    });
    expect(result).toMatchObject({
      exitCode: 7,
      signal: null,
      timedOut: false,
      abandoned: false,
      drainTimedOut: false,
      leftoverProcesses: 0,
      stdout: 'out\n',
      stderr: 'err\n'
    });
    expect(result.maxRssBytes).toBeGreaterThan(0);
    expect(result.exitRealtimeMs).toBeGreaterThanOrEqual(result.spawnRealtimeMs);
    expect(result.realtimeStepped).toBe(false);
  });

  test('kills the whole process group at the timeout and keeps the output it got', async () => {
    const startedAt = performance.now();
    const result = await runBoundedProcess({
      cmd: ['sh', '-c', 'sleep 60 & echo "child $!"; echo started; wait'],
      cwd: '/',
      env,
      timeoutMs: 500
    });
    expect(performance.now() - startedAt).toBeLessThan(10_000);
    expect(result.timedOut).toBe(true);
    expect(result.signal).toBe('SIGTERM');
    expect(result.stdout).toContain('started');
    const childPid = Number(result.stdout.match(/child (\d+)/)?.[1]);
    // The background sleep was in the group, so it got the signal too.
    expect(() => process.kill(childPid, 0)).toThrow();
  });

  test('escalates to SIGKILL when the command ignores SIGTERM', async () => {
    const result = await runBoundedProcess({
      cmd: ['sh', '-c', "trap '' TERM; echo ready; while true; do sleep 0.1; done"],
      cwd: '/',
      env,
      timeoutMs: 300
    });
    expect(result.timedOut).toBe(true);
    expect(result.signal).toBe('SIGKILL');
    expect(result.stdout).toContain('ready');
  });

  test('kills and counts processes left in the group after the command exits', async () => {
    const result = await runBoundedProcess({
      cmd: ['sh', '-c', 'sleep 60 > /dev/null 2>&1 & echo "child $!"'],
      cwd: '/',
      env,
      timeoutMs: 10_000
    });
    expect(result.exitCode).toBe(0);
    expect(result.leftoverProcesses).toBe(1);
    const childPid = Number(result.stdout.match(/child (\d+)/)?.[1]);
    await Bun.sleep(100);
    expect(() => process.kill(childPid, 0)).toThrow();
  });

  test('stops reading output a process outside the group keeps open', async () => {
    // setsid puts the sleeper in its own session, beyond the group kill, still holding stdout.
    const result = await runBoundedProcess({
      cmd: ['sh', '-c', 'setsid sh -c \'echo "holder $$"; exec sleep 30\' & sleep 0.2'],
      cwd: '/',
      env,
      timeoutMs: 10_000,
      drainTimeoutMs: 300
    });
    const holderPid = Number(result.stdout.match(/holder (\d+)/)?.[1]);
    try {
      expect(result.exitCode).toBe(0);
      expect(result.drainTimedOut).toBe(true);
    } finally {
      if (holderPid) process.kill(holderPid, 'SIGKILL');
    }
  });

  test('does not call output ending exactly at the limit truncated', async () => {
    const result = await runBoundedProcess({
      cmd: ['sh', '-c', 'printf 1234567890'],
      cwd: '/',
      env,
      timeoutMs: 10_000,
      maxOutputBytes: 10
    });
    expect(result.stdout).toBe('1234567890');
    expect(result.stdoutTruncated).toBe(false);
  });

  test('lets the calling process exit as soon as the command is done, whatever its deadlines', async () => {
    const harness = await timeHarnessProcess(
      'prompt-exit',
      `const result = await runBoundedProcess({ cmd: ['true'], cwd: '/', env: { PATH: '/usr/bin:/bin' }, timeoutMs: 600_000, drainTimeoutMs: 600_000 });
console.log(JSON.stringify({ exitCode: result.exitCode, timedOut: result.timedOut }));`
    );
    expect(harness.stderr).toBe('');
    expect(harness.exitCode).toBe(0);
    expect(JSON.parse(harness.stdout)).toEqual({ exitCode: 0, timedOut: false });
    expect(harness.ms).toBeLessThan(5000);
  });

  test('lets the calling process exit promptly after a command it had to kill', async () => {
    const harness = await timeHarnessProcess(
      'prompt-exit-after-timeout',
      `const result = await runBoundedProcess({ cmd: ['sleep', '60'], cwd: '/', env: { PATH: '/usr/bin:/bin' }, timeoutMs: 300, drainTimeoutMs: 600_000 });
console.log(JSON.stringify({ signal: result.signal, timedOut: result.timedOut }));`
    );
    expect(harness.exitCode).toBe(0);
    expect(JSON.parse(harness.stdout)).toEqual({ signal: 'SIGTERM', timedOut: true });
    expect(harness.ms).toBeLessThan(5000);
  });

  test('writes kept output to files as it arrives', async () => {
    const stdoutFile = join(root, 'streamed.stdout');
    const stderrFile = join(root, 'streamed.stderr');
    const result = await runBoundedProcess({
      cmd: ['sh', '-c', 'echo one; echo two >&2; echo three'],
      cwd: '/',
      env,
      timeoutMs: 10_000,
      outputFiles: { stdout: stdoutFile, stderr: stderrFile }
    });
    expect(await Bun.file(stdoutFile).text()).toBe(result.stdout);
    expect(await Bun.file(stderrFile).text()).toBe('two\n');
  });

  test('keeps the output already written when the measuring process is killed', async () => {
    const stdoutFile = join(root, 'killed.stdout');
    const pidFile = join(root, 'killed.pid');
    const script = join(root, 'killed-harness.ts');
    await writeFile(
      script,
      `import { runBoundedProcess } from ${JSON.stringify(join(import.meta.dir, 'bounded-process.ts'))};
await runBoundedProcess({ cmd: ['sh', '-c', 'echo $$ > ${pidFile}; echo before-kill; sleep 60'], cwd: '/', env: { PATH: '/usr/bin:/bin' }, timeoutMs: 600_000, outputFiles: { stdout: ${JSON.stringify(stdoutFile)}, stderr: ${JSON.stringify(`${stdoutFile}.err`)} } });`
    );
    const harness = Bun.spawn({ cmd: [process.execPath, script], stdout: 'ignore', stderr: 'ignore' });
    try {
      for (
        let attempt = 0;
        attempt < 100 && !((await Bun.file(stdoutFile).exists()) && (await Bun.file(stdoutFile).text()).length > 0);
        attempt++
      ) {
        await Bun.sleep(50);
      }
      harness.kill('SIGKILL');
      await harness.exited;
      expect(await Bun.file(stdoutFile).text()).toBe('before-kill\n');
    } finally {
      // Outside the network sandbox nothing ends the orphaned command for us.
      const orphan = Number(
        (
          await Bun.file(pidFile)
            .text()
            .catch(() => '')
        ).trim()
      );
      if (orphan) process.kill(-orphan, 'SIGKILL');
    }
  });

  test('refuses an existing output file before starting anything', async () => {
    const existing = join(root, 'existing.stdout');
    await writeFile(existing, 'earlier');
    const marker = join(root, 'should-not-exist');
    expect(
      runBoundedProcess({
        cmd: ['touch', marker],
        cwd: '/',
        env,
        timeoutMs: 10_000,
        outputFiles: { stdout: existing, stderr: join(root, 'existing.stderr') }
      })
    ).rejects.toThrow();
    await Bun.sleep(200);
    expect(await Bun.file(marker).exists()).toBe(false);
  });

  test('truncates output above the limit but reads it to the end', async () => {
    const result = await runBoundedProcess({
      cmd: ['sh', '-c', 'head -c 3000000 /dev/zero | tr "\\0" x; echo; echo done >&2'],
      cwd: '/',
      env,
      timeoutMs: 10_000,
      maxOutputBytes: 1000
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout.length).toBe(1000);
    expect(result.stdoutTruncated).toBe(true);
    expect(result.stderr).toBe('done\n');
  });

  test('counts live members of a process group', () => {
    expect(countProcessGroupMembers(process.pid === 1 ? -1 : 2 ** 30)).toBe(0);
  });
});
