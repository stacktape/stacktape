/**
 * Holds a saved config-only run to the current rules again, from its raw files only.
 *
 *   bun scripts/perf/config-only-replay.ts --run <harness output directory> --out <new JSON file outside it>
 *
 * Run from `apps/cli`. It reads the run's `harness-config.json` and `inner-report.json`, as the sandboxed harness wrote
 * them, and applies `evaluateConfigOnly` and `configOnlyChecks` exactly as the harness does after a run, with the
 * retained rounds and helper Lambdas the run was configured with. Nothing is written into the run: the output must be a
 * new file outside it, and both inputs' SHA-256 are recorded before and after. The exit status is 0 only when every
 * check held and every input is unchanged.
 *
 * `--control-logs`: a control sample recorded before the harness stored its refused entries (`refusedEntries`) has them
 * derived from its saved `stdout.log` and `stderr.log`, by `refusedEnvironmentEntries` as the harness derives them. The
 * replay lists every sample so completed, and hashes those logs as inputs too.
 */
import type { SampleRecord } from './cli-report';
import type { ConfigOnlySetup } from './config-only';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { basename, isAbsolute, join, posix, relative, resolve } from 'node:path';
import yargsParser from 'yargs-parser';
import { CONFIG_CONTROL, configOnlyChecks, evaluateConfigOnly, refusedEnvironmentEntries } from './config-only';

const INPUTS = ['harness-config.json', 'inner-report.json'] as const;

const sha256Of = async (path: string) =>
  createHash('sha256')
    .update(await readFile(path))
    .digest('hex');

const hashInputs = async (run: string, extra: string[] = []) =>
  Object.fromEntries(
    await Promise.all([...INPUTS, ...extra].map(async (name) => [name, await sha256Of(join(run, name))]))
  );

const CONTROL_LOGS = ['stdout.log', 'stderr.log'];

/** The run-relative log files of the control samples that have no recorded refused entries. */
const controlLogsToRead = (samples: SampleRecord[]) =>
  samples
    .filter(
      ({ suite, configOnly }) =>
        suite === 'config-only' && configOnly?.state === CONFIG_CONTROL && configOnly.refusedEntries == null
    )
    .map(({ id }) => {
      if (!/^config-only-[\w-]+$/.test(id)) refuse(`the sample id ${id} is not a config-only sample id.`);
      // Run-relative names are recorded as input keys, so they use forward slashes on every platform.
      return { id, logs: CONTROL_LOGS.map((name) => posix.join('samples', id, name)) };
    });

type SavedConfig = {
  packageInstall: string;
  configOnlySamples: number;
  installs: { name: string; helperLambdas: { path: string; sha256: string }[] }[];
};

type SavedInner = {
  samples: SampleRecord[];
  configOnly: ConfigOnlySetup | null;
  fixtures: Record<string, { before: unknown; after: unknown }>;
};

const refuse = (message: string): never => {
  throw new Error(`Refusing to replay: ${message}`);
};

/** The saved configuration's fields the evaluation needs, or a refusal naming the first one missing. */
const readConfig = (value: unknown): SavedConfig => {
  const config = value as Partial<SavedConfig> | null;
  if (typeof config?.packageInstall !== 'string') refuse('harness-config.json has no packageInstall.');
  if (!Number.isInteger(config!.configOnlySamples)) refuse('harness-config.json has no configOnlySamples.');
  const install = Array.isArray(config!.installs)
    ? config!.installs.find(({ name }) => name === config!.packageInstall)
    : undefined;
  if (!install || !Array.isArray(install.helperLambdas)) refuse('harness-config.json has no package install.');
  return config as SavedConfig;
};

const readInner = (value: unknown): SavedInner => {
  const inner = value as Partial<SavedInner> | null;
  if (!Array.isArray(inner?.samples)) refuse('inner-report.json has no samples.');
  return { samples: inner!.samples!, configOnly: inner!.configOnly ?? null, fixtures: inner!.fixtures ?? {} };
};

export const replayConfigOnly = async ({
  run,
  out,
  controlLogs = false
}: {
  run: string;
  out: string;
  /** Derive the refused entries of controls recorded before the field existed from their saved logs. */
  controlLogs?: boolean;
}) => {
  const fromRun = relative(run, out);
  if (!fromRun.startsWith('..') && !isAbsolute(fromRun)) refuse(`the output ${out} is inside the run.`);
  if (existsSync(out)) refuse(`${out} exists already.`);
  const config = readConfig(JSON.parse(await readFile(join(run, 'harness-config.json'), 'utf8')));
  const inner = readInner(JSON.parse(await readFile(join(run, 'inner-report.json'), 'utf8')));
  const completions = controlLogs ? controlLogsToRead(inner.samples) : [];
  const logs = completions.flatMap(({ logs: files }) => files);
  const before = await hashInputs(run, logs);
  const derived: { id: string; refusedEntries: string[] }[] = [];
  for (const { id, logs: files } of completions) {
    const sample = inner.samples.find((candidate) => candidate.id === id)!;
    const output = (await Promise.all(files.map((file) => readFile(join(run, file), 'utf8')))).join('\n');
    sample.configOnly!.refusedEntries = refusedEnvironmentEntries(output);
    derived.push({ id, refusedEntries: sample.configOnly!.refusedEntries });
  }
  const install = config.installs.find(({ name }) => name === config.packageInstall)!;
  const result = evaluateConfigOnly({
    samples: inner.samples,
    setup: inner.configOnly,
    helperLambdas: install.helperLambdas.map(({ path, sha256 }) => ({ file: basename(path), sha256 })),
    retainedWanted: config.configOnlySamples
  });
  const checks = configOnlyChecks({ result, fixtures: inner.fixtures });
  const after = await hashInputs(run, logs);
  const unchanged = JSON.stringify(before) === JSON.stringify(after);
  const replay = {
    schema: 1,
    kind: 'stacktape-config-only-replay',
    run,
    inputs: { before, after, unchanged },
    /** Controls whose refused entries came from their saved logs, not from the inner report. */
    refusedEntriesFromLogs: derived,
    retainedWanted: config.configOnlySamples,
    samples: result.samples.length,
    passed: unchanged && checks.every(({ passed }) => passed),
    checks,
    populationProblems: result.populationProblems,
    shapes: result.shapes.map(({ functions, expected, states, groupingUnchanged, packagingChanged }) => ({
      functions,
      expected,
      samples: states.map(({ state, samples, retained }) => ({ state, samples, retained })),
      grouping: groupingUnchanged.grouping,
      groupingUnchanged: { passed: groupingUnchanged.passed, problems: groupingUnchanged.problems },
      layerContentChanged: packagingChanged.layerContentChanged
    })),
    resolution: {
      samples: result.samples.filter(({ state }) => state !== 'invalid-deployment-value').length,
      withProblems: result.samples.filter(({ resolverProblems }) => resolverProblems.length > 0).length
    }
  };
  await writeFile(out, `${JSON.stringify(replay, null, 2)}\n`, { flag: 'wx' });
  return replay;
};

const main = async () => {
  const args = yargsParser(process.argv.slice(2), { string: ['run', 'out'], boolean: ['control-logs'] });
  if (!args.run || !args.out) {
    throw new Error(
      'Usage: bun scripts/perf/config-only-replay.ts --run <run directory> --out <new JSON file> [--control-logs]'
    );
  }
  const replay = await replayConfigOnly({
    run: resolve(String(args.run)),
    out: resolve(String(args.out)),
    controlLogs: args['control-logs'] === true
  });
  for (const { id, refusedEntries } of replay.refusedEntriesFromLogs) {
    console.info(`from logs: ${id} names ${refusedEntries.join(', ') || 'nothing'}`);
  }
  for (const { check, passed } of replay.checks) console.info(`${passed ? 'PASS' : 'FAIL'} ${check}`);
  console.info(
    `inputs ${replay.inputs.unchanged ? 'unchanged' : 'CHANGED'}: ${Object.entries(replay.inputs.after)
      .map(([name, sha256]) => `${name} ${sha256}`)
      .join(', ')}`
  );
  process.exitCode = replay.passed ? 0 : 1;
};

if (import.meta.main) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
