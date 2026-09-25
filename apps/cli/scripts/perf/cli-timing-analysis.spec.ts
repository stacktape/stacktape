import type { TimingDocument, TimingSpan } from './cli-sample';
import { describe, expect, test } from 'bun:test';
import { analyzeTimings } from './cli-timing-analysis';

// Shared-clock readings in these documents are nanoseconds on an arbitrary monotonic base.
const BASE = BigInt(5_000_000_000_000);
const ns = (milliseconds: number) => (BASE + BigInt(Math.round(milliseconds * 1_000_000))).toString();

/**
 * A child whose time origin is 30 ms after the spawn (shared-clock time 0), whose exit handler runs at 900 ms on its own
 * clock, and whose exit the harness sees 20 ms later: a wall time of 950 ms.
 */
const document = (spans: TimingSpan[], overrides: Partial<TimingDocument> = {}): TimingDocument => ({
  schema: 3,
  kind: 'stacktape-cli-timings',
  timeOrigin: 1_000_000,
  clockAnchors: {
    init: { monotonicNs: ns(30 + 5), performanceMs: 5 },
    exit: { monotonicNs: ns(30 + 900), performanceMs: 900 }
  },
  pid: 1,
  exitCode: 0,
  exitAt: 900,
  instrumentedSubprocesses: 2,
  droppedSpans: 0,
  spans,
  ...overrides
});

const harness = { wallMs: 950, spawnMonotonicNs: ns(0), exitMonotonicNs: ns(950) };

const span = (name: string, start: number, end: number | null, detail?: TimingSpan['detail']): TimingSpan => ({
  name,
  start,
  end,
  ...(detail && { detail })
});

describe('analyzeTimings', () => {
  test('splits the run into before origin, entry, module load, command, shutdown and after exit', () => {
    const analysis = analyzeTimings({
      ...harness,
      document: document([
        span('cli:entry', 400, 400),
        span('startup:load-native-runtime', 401, 403),
        span('startup:load-dispatcher', 405, 805),
        span('startup:read-arguments', 806, 808),
        span('cli:run-command', 810, 880),
        span('shutdown:start', 890, 890)
      ])
    });
    expect(analysis).toMatchObject({
      wallMs: 950,
      beforeOriginMs: 30,
      toEntryMs: 400,
      moduleLoadMs: 402,
      readArgumentsMs: 2,
      commandMs: 70,
      shutdownMs: 10,
      afterExitHandlerMs: 20,
      originToBundlingMs: null,
      spawnToBundlingMs: null,
      failedAt: null,
      instrumentedSubprocesses: 2
    });
    expect(analysis.crossProcess).toEqual({
      measured: true,
      beforeOriginMs: 30,
      afterExitHandlerMs: 20,
      rate: 1,
      conservationResidualMs: 0
    });
  });

  test('ignores the wall-clock time origin, which only labels the document', () => {
    const shifted = analyzeTimings({ ...harness, document: document([], { timeOrigin: 1_000_000 + 18_126 }) });
    expect(shifted.beforeOriginMs).toBe(30);
    expect(shifted.afterExitHandlerMs).toBe(20);
  });

  test.each([
    [
      'no anchors in the document',
      { clockAnchors: undefined },
      harness,
      'the timing document has no shared-clock anchors'
    ],
    [
      'no shared clock in the harness',
      {},
      { ...harness, spawnMonotonicNs: null },
      'the harness could not read the shared monotonic clock'
    ],
    [
      'a child clock running 5% fast',
      {
        clockAnchors: {
          init: { monotonicNs: ns(35), performanceMs: 5 },
          exit: { monotonicNs: ns(35 + 895 / 1.05), performanceMs: 900 }
        }
      },
      harness,
      'performance.now() advanced'
    ],
    [
      // What a process-relative clock such as Bun's `process.hrtime` produces: the child seems to start before the spawn.
      'anchors from another clock domain',
      {
        clockAnchors: {
          init: { monotonicNs: BigInt(2_000_000).toString(), performanceMs: 5 },
          exit: { monotonicNs: BigInt(897_000_000).toString(), performanceMs: 900 }
        }
      },
      harness,
      'the child time origin precedes the spawn on the shared clock'
    ],
    [
      'an exit anchor after the harness saw the exit',
      {},
      { ...harness, exitMonotonicNs: ns(925) },
      'the child exit anchor follows the harness seeing the exit'
    ],
    ['parts that do not add up to the wall time', {}, { ...harness, wallMs: 990 }, 'miss the wall time by']
  ] as const)('refuses cross-process times with %s, and never clamps them', (_label, overrides, inputs, problem) => {
    const analysis = analyzeTimings({ ...inputs, document: document([span('split:build', 500, 600)], overrides) });
    expect(analysis.crossProcess.measured).toBe(false);
    expect((analysis.crossProcess as { problems: string[] }).problems.join('\n')).toContain(problem);
    expect(analysis.beforeOriginMs).toBeNull();
    expect(analysis.afterExitHandlerMs).toBeNull();
    expect(analysis.spawnToBundlingMs).toBeNull();
    // Measured inside the process, so a clock problem between the processes does not affect it.
    expect(analysis.originToBundlingMs).toBe(500);
  });

  test('reports phases no span visited as unvisited, never as zero', () => {
    const { phases } = analyzeTimings({ ...harness, document: document([span('telemetry:report', 10, 12)]) });
    expect(phases.telemetry).toEqual({ visited: true, spans: 1, unionMs: 2, sumMs: 2 });
    expect(phases.s3).toEqual({ visited: false });
    expect(phases.zip).toEqual({ visited: false });
  });

  test('counts overlapping per-function spans once in the union and fully in the sum', () => {
    const { phases, originToBundlingMs, spawnToBundlingMs } = analyzeTimings({
      ...harness,
      document: document([
        span('event:BUILD_CODE', 100, 150, { instance: 'a' }),
        span('event:BUILD_CODE', 120, 170, { instance: 'b' }),
        span('event:BUILD_CODE', 200, 210, { instance: 'c' })
      ])
    });
    expect(phases.build).toEqual({ visited: true, spans: 3, unionMs: 80, sumMs: 110 });
    expect(originToBundlingMs).toBe(100);
    expect(spawnToBundlingMs).toBe(130);
  });

  test('uses the split build alone as the build phase when there is one', () => {
    const { phases, originToBundlingMs } = analyzeTimings({
      ...harness,
      document: document([
        span('event:BUILD_CODE', 90, 400, { instance: 'shared-layer' }),
        span('split:build', 100, 130, { functions: 2 }),
        span('event:BUILD_CODE', 95, 420, { instance: 'handler01' })
      ])
    });
    expect(phases.build).toEqual({ visited: true, spans: 1, unionMs: 30, sumMs: 30 });
    expect(originToBundlingMs).toBe(100);
  });

  test('keeps the decision, package manager, CI detection and command of each dependency install', () => {
    const { dependencyInstalls, phases } = analyzeTimings({
      ...harness,
      document: document([
        span('dependencies:install', 100, 460, {
          packageManager: 'npm',
          ciDetected: true,
          command: 'npm ci',
          decision: 'installed'
        }),
        span('dependencies:install', 470, 471, { decision: 'marker-matches', packageManager: 'pnpm', ciDetected: true })
      ])
    });
    expect(dependencyInstalls).toEqual([
      { decision: 'installed', packageManager: 'npm', ciDetected: true, command: 'npm ci', ms: 360 },
      { decision: 'marker-matches', packageManager: 'pnpm', ciDetected: true, command: null, ms: 1 }
    ]);
    expect(phases.dependencies).toEqual({ visited: true, spans: 2, unionMs: 361, sumMs: 361 });
  });

  test('names the most specific failing step and lists unfinished spans', () => {
    const analysis = analyzeTimings({
      ...harness,
      document: document(
        [
          span('cli:run-command', 10, 500, { outcome: 'error' }),
          span('command:execute', 20, null),
          span('docker:probe', 30, 40, { running: true }),
          span('docker:build-platforms', 41, 60, { outcome: 'error' }),
          span('subprocess', 42, 59, { executable: 'docker', exitCode: 1, outcome: 'error' })
        ],
        { exitCode: 1 }
      )
    });
    expect(analysis.failedAt).toBe('docker:build-platforms');
    expect(analysis.unfinishedSpans).toEqual(['command:execute']);
    expect(analysis.originToBundlingMs).toBeNull();
    expect(analysis.phases.docker).toEqual({ visited: true, spans: 2, unionMs: 29, sumMs: 29 });
  });
});
