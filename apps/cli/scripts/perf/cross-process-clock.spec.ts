import type { TimingDocument } from './cli-sample';
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runBoundedProcess } from './bounded-process';
import { readTimingDocument } from './cli-sample';
import { analyzeTimings } from './cli-timing-analysis';
import { readMonotonicNs } from './monotonic-clock';

/*
 * The real shape: a compiled Bun executable carrying `utils/timings.ts`, run as a separate process by the harness's own
 * runner. Both tails are made long on purpose, so the measured values can be checked against known delays: a shell
 * sleeps 300 ms before it `exec`s the child, and the child busy-waits 200 ms after the timing module wrote its exit
 * anchor. The earlier wall-clock estimate put the harness and the child 18 s apart; any clock-domain mix-up of that
 * kind lands far outside these bounds or breaks the ordering checks.
 */
const PRE_ORIGIN_DELAY_MS = 300;
const AFTER_EXIT_DELAY_MS = 200;
/** Room for the shell, `exec` and the runtime's own start or teardown on a busy machine. */
const SLACK_MS = 700;

let root: string;
let child: string;

const available = process.platform === 'linux' && readMonotonicNs !== null;

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'stacktape-cross-process-clock-'));
  if (!available) return;
  const entry = join(root, 'child.ts');
  await writeFile(
    entry,
    `import { markTiming } from ${JSON.stringify(join(import.meta.dir, '../../src/utils/timings.ts'))};
const [mode, timingsFile] = process.argv.slice(2);
const entryHrtime = process.hrtime.bigint();
markTiming('child:entry');
await Bun.sleep(100);
// Registered after the timing module's own exit listener, so it runs after the exit anchor has been written.
process.on('exit', () => {
  const until = performance.now() + ${AFTER_EXIT_DELAY_MS};
  while (performance.now() < until) {}
  if (mode === 'valid') return;
  const document = JSON.parse(require('node:fs').readFileSync(timingsFile, 'utf8'));
  const { init, exit } = document.clockAnchors;
  if (mode === 'process-relative') {
    // What a clock counting from the process's own start produces, like Bun's process.hrtime.
    init.monotonicNs = entryHrtime.toString();
    exit.monotonicNs = process.hrtime.bigint().toString();
  } else if (mode === 'rate-skew') {
    const initNs = BigInt(init.monotonicNs);
    exit.monotonicNs = (initNs + BigInt(Math.round((exit.performanceMs - init.performanceMs) * 1.05 * 1_000_000))).toString();
  }
  require('node:fs').writeFileSync(timingsFile, JSON.stringify(document));
});
process.exit(0);
`
  );
  child = join(root, 'child');
  const build = Bun.spawnSync({
    cmd: [process.execPath, 'build', '--compile', entry, '--outfile', child],
    stdout: 'pipe',
    stderr: 'pipe',
    timeout: 120_000
  });
  if (build.exitCode !== 0) throw new Error(`Compiling the child failed:\n${build.stderr.toString()}`);
}, 180_000);

afterAll(async () => {
  await rm(root, { recursive: true, force: true });
});

const runChild = async (mode: 'valid' | 'process-relative' | 'rate-skew') => {
  const timingsFile = join(root, `${mode}-timings.json`);
  const run = await runBoundedProcess({
    cmd: ['sh', '-c', `sleep ${PRE_ORIGIN_DELAY_MS / 1000}; exec "$0" "$@"`, child, mode, timingsFile],
    cwd: root,
    env: { PATH: process.env.PATH ?? '/usr/bin:/bin', STP_TIMINGS_FILE: timingsFile },
    timeoutMs: 60_000
  });
  const { document, error } = await readTimingDocument(timingsFile);
  if (!document) throw new Error(`No timing document (${error}): ${run.stderr}`);
  return { run, document };
};

const analyze = ({ run, document }: { run: Awaited<ReturnType<typeof runBoundedProcess>>; document: TimingDocument }) =>
  analyzeTimings({
    document,
    wallMs: run.wallMs,
    spawnMonotonicNs: run.spawnMonotonicNs,
    exitMonotonicNs: run.exitMonotonicNs
  });

describe('cross-process times from the shared monotonic clock', () => {
  test.skipIf(!available)(
    'match known delays before the time origin and after the exit handler, and add up to the wall time',
    async () => {
      const result = await runChild('valid');
      expect(result.run.exitCode).toBe(0);
      const analysis = analyze(result);
      expect(analysis.crossProcess).toMatchObject({ measured: true });
      const { beforeOriginMs, afterExitHandlerMs, rate, conservationResidualMs } = analysis.crossProcess as {
        beforeOriginMs: number;
        afterExitHandlerMs: number;
        rate: number;
        conservationResidualMs: number;
      };
      expect(beforeOriginMs).toBeGreaterThanOrEqual(PRE_ORIGIN_DELAY_MS);
      expect(beforeOriginMs).toBeLessThan(PRE_ORIGIN_DELAY_MS + SLACK_MS);
      expect(afterExitHandlerMs).toBeGreaterThanOrEqual(AFTER_EXIT_DELAY_MS);
      expect(afterExitHandlerMs).toBeLessThan(AFTER_EXIT_DELAY_MS + SLACK_MS);
      expect(Math.abs(rate - 1)).toBeLessThan(0.001);
      expect(Math.abs(conservationResidualMs)).toBeLessThanOrEqual(1);
      // The child's own time runs from its origin to its exit handler: at least the 100 ms it slept.
      expect(result.document.exitAt).toBeGreaterThanOrEqual(100);

      // Shifting the wall-clock time origin by the 18 s the earlier estimate was off changes nothing.
      const shifted = analyze({
        ...result,
        document: { ...result.document, timeOrigin: result.document.timeOrigin + 18_126 }
      });
      expect(shifted.beforeOriginMs).toBe(analysis.beforeOriginMs);
      expect(shifted.afterExitHandlerMs).toBe(analysis.afterExitHandlerMs);
    },
    90_000
  );

  test.skipIf(!available)(
    'refuses anchors from a clock that counts from the process start',
    async () => {
      const analysis = analyze(await runChild('process-relative'));
      expect(analysis.crossProcess.measured).toBe(false);
      expect((analysis.crossProcess as { problems: string[] }).problems).toContain(
        'the child time origin precedes the spawn on the shared clock'
      );
      expect(analysis.beforeOriginMs).toBeNull();
      expect(analysis.afterExitHandlerMs).toBeNull();
    },
    90_000
  );

  test.skipIf(!available)(
    'refuses anchors whose clocks advanced at different rates',
    async () => {
      const analysis = analyze(await runChild('rate-skew'));
      expect(analysis.crossProcess.measured).toBe(false);
      expect((analysis.crossProcess as { problems: string[] }).problems.join('\n')).toContain(
        'performance.now() advanced'
      );
      expect(analysis.beforeOriginMs).toBeNull();
      expect(analysis.afterExitHandlerMs).toBeNull();
    },
    90_000
  );
});
