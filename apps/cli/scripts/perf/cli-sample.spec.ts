import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readTimingDocument, runCliSample } from './cli-sample';

let root: string;

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'stacktape-cli-sample-'));
});

afterAll(async () => {
  await rm(root, { recursive: true, force: true });
});

const env = { PATH: '/usr/bin:/bin' };

/** A stand-in CLI that writes a timing document the way `utils/timings.ts` does, with the given exit code. */
const fakeCli = (exitCode: number, documentExitCode = exitCode) => [
  'sh',
  '-c',
  `printf '{"schema":1,"kind":"stacktape-cli-timings","timeOrigin":1,"pid":1,"exitCode":${documentExitCode},"exitAt":1,"instrumentedSubprocesses":0,"droppedSpans":0,"spans":[]}\\n' > "$STP_TIMINGS_FILE"; exit ${exitCode}`
];

// Samples run `sh` in a process group the harness accounts for through `/proc`: Linux, like the harness sandbox.
describe.skipIf(process.platform !== 'linux')('runCliSample', () => {
  test('accepts a complete sample', async () => {
    const sample = await runCliSample({
      cmd: fakeCli(0),
      cwd: root,
      env,
      timeoutMs: 10_000,
      timingsFile: join(root, 'ok.json')
    });
    expect(sample.invalidReasons).toEqual([]);
    expect(sample.timings?.exitCode).toBe(0);
  });

  test('fails a sample without a timing file', async () => {
    const sample = await runCliSample({
      cmd: ['true'],
      cwd: root,
      env,
      timeoutMs: 10_000,
      timingsFile: join(root, 'none.json')
    });
    expect(sample.invalidReasons).toEqual(['timing file missing']);
  });

  test('fails a sample whose timing document disagrees with the exit code', async () => {
    const sample = await runCliSample({
      cmd: fakeCli(1, 0),
      cwd: root,
      env,
      timeoutMs: 10_000,
      timingsFile: join(root, 'mismatch.json')
    });
    expect(sample.invalidReasons).toEqual(["timing file exit code 0 differs from the process's 1"]);
  });

  test('fails a timed-out sample and keeps what it produced', async () => {
    const sample = await runCliSample({
      cmd: ['sh', '-c', 'echo partial; sleep 60'],
      cwd: root,
      env,
      timeoutMs: 300,
      timingsFile: join(root, 'timeout.json')
    });
    expect(sample.invalidReasons).toContain('timed out after 300 ms');
    expect(sample.invalidReasons).toContain('timing file missing');
    expect(sample.process.stdout).toBe('partial\n');
  });

  test('kills and reports a process the command left outside its process group', async () => {
    const pidFile = join(root, 'escaped.pid');
    const sample = await runCliSample({
      cmd: [
        'sh',
        '-c',
        `setsid sh -c 'echo $$ > ${pidFile}; exec sleep 60' > /dev/null 2>&1 & sleep 0.2; ${fakeCli(0)[2]}`
      ],
      cwd: root,
      env,
      timeoutMs: 10_000,
      timingsFile: join(root, 'escaped.json'),
      findEscapedProcesses: () => {
        const pid = Number(readFileSync(pidFile, 'utf8').trim());
        return [{ pid, command: 'sleep' }];
      }
    });
    const pid = Number(readFileSync(pidFile, 'utf8').trim());
    expect(sample.invalidReasons).toEqual(['1 process(es) left running outside the process group']);
    expect(sample.escapedProcesses).toEqual([{ pid, command: 'sleep' }]);
    await Bun.sleep(100);
    expect(() => process.kill(pid, 0)).toThrow();
  });

  /**
   * A stand-in for the CLI's telemetry sender: a detached process whose arguments include `__telemetry-sender`, left
   * running after the command exits. Its PID goes to `pidFile`.
   */
  const commandLeavingSender = ({
    pidFile,
    senderMs,
    argument
  }: {
    pidFile: string;
    senderMs: number;
    argument: string;
  }) => [
    'sh',
    '-c',
    `setsid sh -c 'echo $$ > ${pidFile}; exec ${process.execPath} -e "await Bun.sleep(${senderMs})" ${argument}' > /dev/null 2>&1 & sleep 0.2; ${fakeCli(0)[2]}`
  ];
  const isRunning = (pid: number) => {
    try {
      const stat = readFileSync(`/proc/${pid}/stat`, 'utf8');
      return stat.slice(stat.lastIndexOf(')') + 2)[0] !== 'Z';
    } catch {
      return false;
    }
  };
  const listFromPidFile = (pidFile: string) => () => {
    const pid = Number(readFileSync(pidFile, 'utf8').trim());
    return isRunning(pid) ? [{ pid, command: 'bun' }] : [];
  };

  test('waits for a telemetry sender that ends by itself and records how long', async () => {
    const pidFile = join(root, 'sender.pid');
    const sample = await runCliSample({
      cmd: commandLeavingSender({ pidFile, senderMs: 600, argument: '__telemetry-sender' }),
      cwd: root,
      env,
      timeoutMs: 10_000,
      timingsFile: join(root, 'sender.json'),
      findEscapedProcesses: listFromPidFile(pidFile)
    });
    expect(sample.invalidReasons).toEqual([]);
    expect(sample.escapedProcesses).toEqual([]);
    expect(sample.telemetrySenderWaitMs).toBeGreaterThan(100);
    expect(sample.telemetrySenderWaitMs).toBeLessThan(5000);
  });

  test('kills a telemetry sender that outlives the wait, and does not wait for any other process', async () => {
    const senderPidFile = join(root, 'slow-sender.pid');
    const slow = await runCliSample({
      cmd: commandLeavingSender({ pidFile: senderPidFile, senderMs: 60_000, argument: '__telemetry-sender' }),
      cwd: root,
      env,
      timeoutMs: 10_000,
      timingsFile: join(root, 'slow-sender.json'),
      findEscapedProcesses: listFromPidFile(senderPidFile),
      telemetrySenderWaitMs: 300
    });
    expect(slow.invalidReasons).toEqual(['1 process(es) left running outside the process group']);
    expect(slow.telemetrySenderWaitMs).toBeGreaterThanOrEqual(300);
    await Bun.sleep(100);
    expect(isRunning(Number(readFileSync(senderPidFile, 'utf8').trim()))).toBe(false);

    const otherPidFile = join(root, 'other.pid');
    const startedAt = performance.now();
    const other = await runCliSample({
      cmd: commandLeavingSender({ pidFile: otherPidFile, senderMs: 60_000, argument: 'something-else' }),
      cwd: root,
      env,
      timeoutMs: 10_000,
      timingsFile: join(root, 'other.json'),
      findEscapedProcesses: listFromPidFile(otherPidFile)
    });
    expect(other.invalidReasons).toEqual(['1 process(es) left running outside the process group']);
    expect(other.telemetrySenderWaitMs).toBeNull();
    expect(performance.now() - startedAt).toBeLessThan(2000);
  });

  test('refuses a timing path that already exists', async () => {
    const path = join(root, 'existing.json');
    await writeFile(path, '{}');
    expect(runCliSample({ cmd: ['true'], cwd: root, env, timeoutMs: 1000, timingsFile: path })).rejects.toThrow(
      'already exists'
    );
  });

  test('reports an unreadable or foreign timing document', async () => {
    await writeFile(join(root, 'broken.json'), '{');
    await writeFile(join(root, 'foreign.json'), '{"kind":"other"}');
    expect((await readTimingDocument(join(root, 'broken.json'))).error).toStartWith('unreadable');
    expect((await readTimingDocument(join(root, 'foreign.json'))).error).toBe('not a Stacktape timing document');
  });
});
