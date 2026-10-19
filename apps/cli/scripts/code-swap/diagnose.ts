import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

type Clock = { rate: number; offset: number; maxResidualMs?: number };
type Edit = {
  label: string;
  start: number;
  exitMs?: number;
  allMs?: number;
  hostClockOffsetMs?: number;
  details?: { mode: string; fallback?: string; completed?: { task: string; timings: Record<string, unknown> }[] };
};
type Sample = {
  hostMs: number;
  awsMs: number;
  rttMs: number;
  status: number;
  phase?: string;
  requestStartMs?: number;
  error?: string;
  errorBody?: string;
  requestId?: string;
  path?: string;
};
type Gateway = {
  loggedAtMs?: number;
  requestTimeEpoch?: string;
  status: string;
  integrationError: string;
  integrationLatency: string;
};
type Trace = {
  phase: string;
  hostMs: number;
  startedHostMs?: number;
  eventType?: string;
  status?: string | number;
  service?: string;
  target?: string;
  id?: number;
  invocation?: string;
  attempt?: string;
  error?: string;
  reused?: number;
  socketMs?: number;
  dnsMs?: number;
  connectMs?: number;
  tlsMs?: number;
  sentMs?: number;
  firstByteMs?: number;
  totalMs?: number;
};
const json = async <T>(path: string, fallback: T): Promise<T> => {
  try {
    return JSON.parse(await readFile(path, 'utf8')) as T;
  } catch {
    return fallback;
  }
};
const count = (values: string[]) =>
  Object.fromEntries([...new Set(values)].sort().map((key) => [key, values.filter((v) => v === key).length]));
const failureType = (p: Sample) =>
  p.status === 0
    ? (p.error ?? 'transport')
    : p.status < 400 && p.error
      ? `business assertion: ${p.error}`
      : `HTTP ${p.status}`;
const quantiles = (values: number[]) => {
  const ordered = values.toSorted((a, b) => a - b);
  return {
    n: values.length,
    p50: ordered.length
      ? (ordered[Math.floor((ordered.length - 1) / 2)]! + ordered[Math.ceil((ordered.length - 1) / 2)]!) / 2
      : null,
    p95: ordered[Math.ceil(ordered.length * 0.95) - 1] ?? null,
    max: ordered.at(-1) ?? null
  };
};

export const diagnoseConfiguration = async (location: string, results: Edit[], clocks: Map<string, Clock>) => {
  const errors: {
    source: string;
    label?: string;
    phase: string;
    transition?: string;
    type: string;
    requestId?: string;
    requestStartAwsMs?: number;
    requestEndAwsMs?: number;
    requestStartHostMs?: number;
    requestEndHostMs?: number;
    path?: string;
    errorBody?: string;
    overlappingEdits?: string[];
    gateway?: Gateway;
  }[] = [];
  const edits = [];
  const phases: Record<string, number[]> = {};
  const add = (name: string, value: number | undefined) => {
    if (value !== undefined && Number.isFinite(value)) (phases[name] ??= []).push(value);
  };
  for (const result of results) {
    const clock = clocks.get(result.label);
    const toAws = (host: number) => (clock ? (host - clock.offset) / clock.rate : undefined);
    let traces: Trace[] = [];
    try {
      traces = (await readFile(join(location, `${result.label}-trace.jsonl`), 'utf8'))
        .trim()
        .split('\n')
        .map((line) => JSON.parse(line) as Trace);
    } catch {}
    const traceAws = (line?: Trace) =>
      line && result.hostClockOffsetMs !== undefined ? toAws(line.hostMs - result.hostClockOffsetMs) : undefined;
    const moment = (phase: string) => traceAws(traces.find((line) => line.phase === phase));
    const event = (eventType: string, status: string) =>
      traceAws(traces.find((line) => line.phase === 'event' && line.eventType === eventType && line.status === status));
    const start = toAws(result.start);
    const proposal = moment('signal:prepare');
    const commit = moment('signal:commit');
    const switched =
      result.details?.completed?.map((s) => Number(s.timings.switchedAtMs)).filter(Number.isFinite) ?? [];
    const lastSwitch = switched.length ? Math.max(...switched) : undefined;
    const spans: Record<string, number> = {};
    const span = (name: string, a?: number, b?: number) => {
      if (a !== undefined && b !== undefined) spans[name] = (b - a) / 1000;
    };
    span('startup', start, event('LOAD_USER_DATA', 'started'));
    span('credentialsAndSetup', event('LOAD_USER_DATA', 'started'), event('LOAD_CONFIG_FILE', 'started'));
    span('configAndMetadata', event('LOAD_CONFIG_FILE', 'started'), event('LOAD_METADATA_FROM_AWS', 'completed'));
    span('bundle', event('LOAD_METADATA_FROM_AWS', 'completed'), event('BUILD_CODE', 'completed'));
    span('imageBuildAndUpload', event('BUILD_CODE', 'completed'), event('UPLOAD_IMAGE', 'completed'));
    span('precommit', event('UPLOAD_IMAGE', 'completed'), commit);
    span('commitToSwitch', commit, lastSwitch);
    span(
      'publicObservation',
      lastSwitch,
      start !== undefined && clock && result.allMs !== undefined ? start + result.allMs / clock.rate : undefined
    );
    const overlappingWork: Record<string, number> = {};
    const overlap = (name: string, a?: number, b?: number) => {
      if (a !== undefined && b !== undefined) overlappingWork[name] = (b - a) / 1000;
    };
    overlap('imageBuild', event('BUILD_IMAGE', 'started'), event('BUILD_IMAGE', 'completed'));
    overlap('imageUpload', event('UPLOAD_IMAGE', 'started'), event('UPLOAD_IMAGE', 'completed'));
    overlap(
      'bundleUpload',
      moment('bundleUpload:start') ?? moment('prepareFleet:end'),
      moment('bundleUpload:end') ?? moment('bundleUploaded')
    );
    overlap('proposalWrite', moment('preparePrerequisitesReady') ?? moment('bundleUploaded'), proposal);
    const supervisor =
      result.details?.completed?.map(({ task, timings: t }) => ({
        task,
        download: Number(t.downloadMs) / 1000,
        extract: Number(t.extractMs) / 1000,
        candidateStartup: Number(t.startupMs) / 1000,
        prepareHealth: Number(t.prepareHealthMs) / 1000,
        postHealth: Number(t.postHealthMs) / 1000,
        drain: Number(t.drainMs) / 1000,
        oldExit: Number(t.oldExitMs) / 1000,
        prepareDetectedAfterProposal: proposal === undefined ? undefined : (Number(t.detectedAtMs) - proposal) / 1000,
        preparedToCommit: commit === undefined ? undefined : (commit - Number(t.preparedAtMs)) / 1000
      })) ?? [];
    // Transport marks are cumulative host-clock intervals. Divide by this edit's measured clock rate,
    // and keep setup, dispatch-to-headers and body collection separate. Reused sockets do no DNS/TCP/TLS work.
    const networkRequests = traces
      .filter((t) => t.phase === 'aws-http' && t.startedHostMs !== undefined && clock)
      .map((t) => {
        const seconds = (value: number | undefined) => (value === undefined ? undefined : value / clock!.rate / 1000);
        const difference = (end: number | undefined, begin: number | undefined) =>
          end === undefined || begin === undefined ? undefined : seconds(Math.max(0, end - begin));
        return {
          service: t.service,
          target: t.target,
          status: t.status,
          error: t.error,
          id: t.id,
          invocation: t.invocation,
          attempt: t.attempt,
          reused: t.reused,
          startAwsMs:
            result.hostClockOffsetMs === undefined ? undefined : toAws(t.startedHostMs! - result.hostClockOffsetMs),
          seconds: (t.hostMs - t.startedHostMs!) / clock!.rate / 1000,
          transportSeconds: {
            socket: seconds(t.socketMs),
            dns: t.reused ? 0 : difference(t.dnsMs, t.socketMs),
            connect: t.reused ? 0 : difference(t.connectMs, t.dnsMs ?? t.socketMs),
            tls: t.reused ? 0 : difference(t.tlsMs, t.connectMs),
            firstByte: seconds(t.firstByteMs),
            responseWait: difference(t.firstByteMs, t.sentMs),
            body: difference(t.totalMs, t.firstByteMs),
            total: seconds(t.totalMs)
          }
        };
      });
    const slowRequests = networkRequests.filter((t) => t.seconds > 1);
    const cliTimings = await json<{
      clockAnchors?: { init?: { monotonicNs: string; performanceMs: number } };
      spans?: { name: string; start: number; end: number | null; detail?: Record<string, unknown> }[];
    }>(join(location, `${result.label}-timings.json`), {});
    const anchor = cliTimings.clockAnchors?.init;
    const slowCliSpans = (cliTimings.spans ?? [])
      .filter((s) => s.end !== null && clock && (s.end - s.start) / clock.rate > 1000)
      .map((s) => ({
        name: s.name,
        detail: s.detail,
        seconds: (s.end! - s.start) / clock!.rate / 1000,
        startAwsMs:
          anchor && result.hostClockOffsetMs !== undefined
            ? toAws(Number(anchor.monotonicNs) / 1e6 + s.start - anchor.performanceMs - result.hostClockOffsetMs)
            : undefined
      }));
    // SDK middleware names JSON/queryless operations (notably S3) without exposing request paths or bodies.
    if (anchor && result.hostClockOffsetMs !== undefined && clock) {
      for (const transport of networkRequests) {
        if (transport.startAwsMs === undefined) continue;
        const containing = (cliTimings.spans ?? [])
          .filter((s) => s.end !== null && (s.name === 'aws:request' || s.name === 'console:request'))
          .map((s) => ({
            operation: s.detail?.operation ?? s.detail?.procedure,
            start: toAws(Number(anchor.monotonicNs) / 1e6 + s.start - anchor.performanceMs - result.hostClockOffsetMs!),
            duration: (s.end! - s.start) / clock.rate
          }))
          .filter(
            (s) =>
              typeof s.operation === 'string' &&
              s.start !== undefined &&
              s.start <= transport.startAwsMs! + 2 &&
              s.start + s.duration >= transport.startAwsMs! + transport.seconds * 1000 - 2
          )
          .toSorted((a, b) => a.duration - b.duration)[0];
        if (containing) transport.target = String(containing.operation);
      }
    }
    const polls = [
      ...(await json<Sample[]>(join(location, `${result.label}-polls.json`), [])),
      ...(await json<Sample[]>(join(location, `${result.label}-business.json`), []))
    ];
    for (const p of polls.filter((p) => p.error || p.status === 0 || p.status >= 400)) {
      const begin = toAws(p.requestStartMs ?? p.hostMs - p.rttMs);
      const end = toAws(p.hostMs);
      // A request that crosses a transition stays visible; never explain it away based only on its end time.
      const transition =
        proposal === undefined
          ? 'proposal-time-unavailable'
          : end !== undefined && end < proposal
            ? 'before-proposal'
            : begin !== undefined && begin < proposal
              ? 'crosses-proposal'
              : commit !== undefined && end !== undefined && end < commit
                ? 'prepare'
                : commit !== undefined && begin !== undefined && begin < commit
                  ? 'crosses-commit'
                  : 'after-commit';
      errors.push({
        source: p.path ? 'business' : 'timed',
        label: result.label,
        phase: result.label.startsWith('swap-') ? 'swap' : 'image',
        transition,
        type: failureType(p),
        requestStartHostMs: p.requestStartMs ?? p.hostMs - p.rttMs,
        requestEndHostMs: p.hostMs,
        path: p.path,
        requestId: p.requestId,
        requestStartAwsMs: begin,
        requestEndAwsMs: end,
        errorBody: p.errorBody
      });
    }
    const edit = {
      label: result.label,
      mode: result.details?.mode,
      fallback: result.details?.fallback,
      allSeconds: clock && result.allMs !== undefined ? result.allMs / clock.rate / 1000 : undefined,
      startAwsMs: start,
      proposalAwsMs: proposal,
      commitAwsMs: commit,
      lastSwitchAwsMs: lastSwitch,
      clockResidualMs: clock?.maxResidualMs,
      clockAlignmentWarnings: Object.entries(spans)
        .filter(([, value]) => value < 0)
        .map(([phase, seconds]) => ({ phase, seconds })),
      spans,
      overlappingWork,
      supervisor,
      networkRequests,
      slowRequests,
      slowCliSpans
    };
    edits.push(edit);
    if (result.label.startsWith('swap-') && result.details?.mode === 'swap') {
      for (const [key, value] of Object.entries(spans)) add(key, value);
      for (const [key, value] of Object.entries(overlappingWork)) add(key, value);
      for (const s of supervisor)
        for (const key of [
          'download',
          'extract',
          'candidateStartup',
          'prepareHealth',
          'postHealth',
          'oldExit'
        ] as const)
          add(key, s[key]);
    }
  }
  for (const [source, file] of [
    ['continuous', 'continuous-traffic.json'],
    ['setup', 'setup-traffic.json'],
    ['setup-business', 'setup-business.json']
  ] as const) {
    const samples = await json<Sample[]>(join(location, file), []);
    for (const p of samples.filter((p) => p.error || p.status === 0 || p.status >= 400)) {
      const label = p.phase?.split(':')[0];
      const edit = results.find((r) => r.label === label);
      const nearest =
        edit ??
        results
          .filter((r) => clocks.has(r.label))
          .toSorted((a, b) => Math.abs(a.start - p.hostMs) - Math.abs(b.start - p.hostMs))[0];
      const clock = nearest ? clocks.get(nearest.label) : undefined;
      const overlappingEdits = results
        .filter(
          (r) => (p.requestStartMs ?? p.hostMs - p.rttMs) <= r.start + (r.exitMs ?? r.allMs ?? 0) && p.hostMs >= r.start
        )
        .map((r) => r.label);
      errors.push({
        source,
        label,
        phase: p.phase ?? 'legacy-unclassified',
        overlappingEdits,
        type: failureType(p),
        requestStartHostMs: p.requestStartMs ?? p.hostMs - p.rttMs,
        requestEndHostMs: p.hostMs,
        path: p.path,
        requestId: p.requestId,
        requestStartAwsMs: clock ? ((p.requestStartMs ?? p.hostMs - p.rttMs) - clock.offset) / clock.rate : undefined,
        requestEndAwsMs: p.awsMs > 0 ? p.awsMs : clock ? (p.hostMs - clock.offset) / clock.rate : undefined,
        errorBody: p.errorBody
      });
    }
  }
  const gatewayByRequest = new Map<string, Gateway>();
  for (const file of ['gateway-errors.json', 'gateway-errors-observed.json']) {
    for (const event of await json<{ message?: string; timestamp?: number }[]>(join(location, file), [])) {
      try {
        const row = JSON.parse(event.message ?? '') as Gateway & { requestId: string; atMs?: string };
        gatewayByRequest.set(row.requestId, {
          loggedAtMs: event.timestamp,
          requestTimeEpoch: row.requestTimeEpoch ?? row.atMs,
          status: row.status,
          integrationError: row.integrationError,
          integrationLatency: row.integrationLatency
        });
      } catch {}
    }
  }
  for (const error of errors) if (error.requestId) error.gateway = gatewayByRequest.get(error.requestId);
  await writeFile(join(location, 'request-errors.json'), JSON.stringify(errors, null, 2));
  await writeFile(join(location, 'timing-details.json'), JSON.stringify(edits, null, 2));
  const swapErrors = errors.filter(
    (e) =>
      e.phase === 'swap' ||
      e.phase.startsWith('swap-') ||
      e.overlappingEdits?.some((label) => label.startsWith('swap-'))
  );
  return {
    timingSeconds: Object.fromEntries(Object.entries(phases).map(([key, value]) => [key, quantiles(value)])),
    tails: edits.filter((e) => e.label.startsWith('swap-') && e.allSeconds !== undefined && e.allSeconds > 10),
    requestErrors: {
      total: errors.length,
      duringSwaps: swapErrors.length,
      gatewayMatched: errors.filter((e) => e.gateway).length,
      byPhaseAndType: count(errors.map((e) => `${e.source} / ${e.phase} / ${e.type}`)),
      ledger: 'request-errors.json',
      timingLedger: 'timing-details.json'
    }
  };
};
