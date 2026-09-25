/**
 * Whether a release executable's bytecode is used on its own target, and whether the executable behaves exactly like
 * the same build without bytecode: the `check` half of `qualify-bytecode.ts`.
 *
 * Bun generates bytecode on the build host, and a target runtime that cannot use it falls back to parsing the source
 * without a word. So a cross-built archive counts as qualified only after it ran on its target. Both archives are
 * extracted there, and each executable is checked with:
 * - `--version`, `--help` and `defaults:list`, whose normalized output must be identical;
 * - `validate` of a valid and an invalid one-function configuration. STS and telemetry go to a local stand-in
 *   (`perf/external-service-fixture.ts`) that refuses every other AWS request, so the valid configuration stops only
 *   after validation. Both executables must stop at the same point with the same error code;
 * - `package` of pure-JavaScript fixtures with Docker absent, unless skipped. Everything `package` writes must be
 *   identical between the two (`perf/artifact-inspection.ts`);
 * - the interactive launcher in a pseudo-terminal, except on Windows (`verify-interactive-launcher.ts`).
 *
 * `--version` and `--help` are then timed in interleaved pairs, the order alternating each round, after one discarded
 * run of each executable. Depth 1 qualifies when every check passed and, for both commands, its median is at most 80 %
 * of the bytecode-off median and it was faster in at least three pairs out of four. `package` is timed too, for the
 * report.
 *
 * Every command gets an owned home, inert AWS credentials, the stand-in's endpoints and refusing proxy, and a PATH
 * without Docker. None of this confines a client that ignores those settings, so run it where the network is confined
 * (a container with `--network none`) or where an escape reaches nothing that matters.
 */
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { arch, cpus, loadavg, platform as hostPlatform, release } from 'node:os';
import { join } from 'node:path';
import AdmZip from 'adm-zip';
import stripAnsi from 'strip-ansi';
import * as tar from 'tar';
import { writeInstallMarker } from '../packaging-archives/split-project-fixture';
import { inspectArtifacts } from '../perf/artifact-inspection';
import { createPathWithoutDocker, getCliEnvironment } from '../perf/cli-environment';
import { startExternalServiceFixture } from '../perf/external-service-fixture';
import { FIXTURE_CONFIG_FILE, writeFixtureConfig, writePackagingFixture } from '../perf/packaging-fixture';
import { verifyInteractiveLauncher } from '../verify-interactive-launcher';

const QUALIFICATION_VARIANTS = ['off', 'depth-1'] as const;
type Variant = (typeof QUALIFICATION_VARIANTS)[number];

/** Depth 1 must take at most this share of the bytecode-off median, and win at least this share of the pairs. */
const MAXIMUM_MEDIAN_RATIO = 0.8;
const MINIMUM_FASTER_SHARE = 0.75;
const COMMAND_TIMEOUT_MS = 120_000;
const TIMED_STARTUP_COMMANDS = [['--version'], ['--help']];
const PACKAGE_ARGS = ['package', '--projectName', 'bytecodequalify', '--stage', 'check', '--region', 'eu-west-1'];
const VALIDATE_ARGS = ['validate', '--projectName', 'bytecodequalify', '--stage', 'check', '--region', 'eu-west-1'];

type CommandRun = { exitCode: number | null; output: string; ms: number };
type Check = { name: string; ok: boolean; detail: string };

const sha256File = async (path: string) =>
  createHash('sha256')
    .update(await readFile(path))
    .digest('hex');

const median = (values: number[]) => {
  const sorted = values.toSorted((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2;
};

const round = (value: number) => Math.round(value * 10) / 10;

/** The one release archive in `directory`. */
const findArchive = async (directory: string) => {
  const archives = (await readdir(directory)).filter((name) => name.endsWith('.tar.gz') || name.endsWith('.zip'));
  if (archives.length !== 1) throw new Error(`Expected one release archive in ${directory}, found ${archives.length}.`);
  return join(directory, archives[0]!);
};

const extractArchive = async (archivePath: string, destination: string) => {
  await mkdir(destination, { recursive: true });
  if (archivePath.endsWith('.zip')) new AdmZip(archivePath).extractAllTo(destination, true);
  else await tar.x({ file: archivePath, cwd: destination });
};

/** Output with the parts that legitimately differ between runs replaced: durations and the owned directories. */
const normalize = (output: string, replacements: [string, string][]) => {
  let normalized = output.replace(/\d+(?:\.\d+)?\s?(?:ms|s)\b/g, '<duration>');
  for (const [value, placeholder] of replacements) normalized = normalized.split(value).join(placeholder);
  return normalized;
};

/** The first error code a failed command printed, such as `CONFIG_SCHEMA_INVALID`. */
const errorCodeOf = (output: string) => output.match(/\b[A-Z][A-Z0-9]+(?:_[A-Z0-9]+){1,}\b/)?.[0] ?? null;

/** What `package` wrote, without what differs between two runs of the same build: the invocation folder's name. */
const describePackageOutput = (manifest: Awaited<ReturnType<typeof inspectArtifacts>>) => ({
  problems: manifest.problems,
  entries: manifest.entries.map(({ path, kind, mode, bytes, sha256 }) =>
    path.endsWith('.zip') ? { path, kind, mode } : { path, kind, mode, bytes, sha256 }
  ),
  archives: manifest.archives.map(({ path, entries, files, uncompressedBytes, canonicalSha256, modes }) => ({
    path,
    entries,
    files,
    uncompressedBytes,
    canonicalSha256,
    modes
  }))
});

const summarizePairs = (pairs: Record<Variant, number>[]) => {
  const off = median(pairs.map((pair) => pair.off));
  const depth1 = median(pairs.map((pair) => pair['depth-1']));
  return {
    samples: pairs.length,
    offMedianMs: round(off),
    depth1MedianMs: round(depth1),
    ratio: Math.round((depth1 / off) * 1000) / 1000,
    pairedDifferenceMedianMs: round(median(pairs.map((pair) => pair['depth-1'] - pair.off))),
    depth1FasterShare:
      Math.round((pairs.filter((pair) => pair['depth-1'] < pair.off).length / pairs.length) * 100) / 100,
    pairs: pairs.map((pair) => ({ off: round(pair.off), 'depth-1': round(pair['depth-1']) }))
  };
};

export const runBytecodeQualification = async ({
  archives,
  work,
  samples = 11,
  packageSamples = 7,
  packageFunctions = [1],
  skipPackage = false
}: {
  /** Holds `off/<archive>` and `depth-1/<archive>`, as `qualify-bytecode.ts build` writes them. */
  archives: string;
  /** An owned, new or empty scratch directory. */
  work: string;
  samples?: number;
  packageSamples?: number;
  packageFunctions?: number[];
  skipPackage?: boolean;
}) => {
  if (samples < 7) throw new Error('At least 7 paired samples are needed.');
  const windows = hostPlatform() === 'win32';
  await mkdir(work, { recursive: true });
  if ((await readdir(work)).length > 0) throw new Error(`${work} is not empty.`);
  const checks: Check[] = [];
  const check = (name: string, ok: boolean, detail = '') => {
    checks.push({ name, ok, detail });
    console.info(`${ok ? 'ok    ' : 'FAILED'}  ${name}${detail ? ` — ${detail}` : ''}`);
  };

  const installs = {} as Record<Variant, { executable: string; directory: string; version: string; home: string }>;
  const archiveRecords: Record<string, unknown> = {};
  for (const variant of QUALIFICATION_VARIANTS) {
    const archivePath = await findArchive(join(archives, variant));
    const directory = join(work, 'installs', variant);
    await extractArchive(archivePath, directory);
    const executable = join(directory, windows ? 'stacktape.exe' : 'stacktape');
    const { version } = JSON.parse(await readFile(join(directory, 'release-data.json'), 'utf8')) as { version: string };
    const home = join(work, 'homes', variant);
    await mkdir(home, { recursive: true });
    installs[variant] = { executable, directory, version, home };
    archiveRecords[variant] = {
      archive: archivePath,
      archiveBytes: (await stat(archivePath)).size,
      executableBytes: (await stat(executable)).size,
      executableSha256: await sha256File(executable),
      version
    };
  }
  const { version } = installs.off;
  check('both archives hold the same version', installs['depth-1'].version === version, version);

  const fixture = await startExternalServiceFixture();
  const path = windows
    ? [process.env.SystemRoot ? join(process.env.SystemRoot, 'System32') : 'C:\\Windows\\System32']
    : [
        (
          await createPathWithoutDocker({
            directory: join(work, 'path-without-docker'),
            sourceDirectories: ['/usr/bin', '/bin'].filter((directory) => existsSync(directory))
          })
        ).directory
      ];
  const environmentFor = (variant: Variant, timingsFile?: string) => {
    const { home } = installs[variant];
    const environment = getCliEnvironment({
      home,
      path,
      serviceUrl: fixture.serviceUrl,
      proxyUrl: fixture.proxyUrl,
      timingsFile
    });
    if (!windows) return environment;
    // Windows reads the profile from USERPROFILE and needs its system variables to start processes at all.
    return {
      ...environment,
      PATH: path.join(';'),
      USERPROFILE: home,
      APPDATA: join(home, 'AppData', 'Roaming'),
      LOCALAPPDATA: join(home, 'AppData', 'Local'),
      TEMP: join(home, 'Temp'),
      TMP: join(home, 'Temp'),
      ...Object.fromEntries(
        ['SystemRoot', 'windir', 'SystemDrive', 'PATHEXT', 'ComSpec']
          .filter((name) => process.env[name])
          .map((name) => [name, process.env[name]!])
      )
    };
  };
  // Asynchronous: the stand-in answers from this process, so a blocking spawn would starve it until the CLI timed out.
  const run = async (
    variant: Variant,
    args: string[],
    { cwd = work, timingsFile }: { cwd?: string; timingsFile?: string } = {}
  ): Promise<CommandRun> => {
    const started = performance.now();
    const child = Bun.spawn({
      cmd: [installs[variant].executable, ...args],
      cwd,
      env: environmentFor(variant, timingsFile),
      stdout: 'pipe',
      stderr: 'pipe',
      timeout: COMMAND_TIMEOUT_MS
    });
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
      child.exited
    ]);
    return { exitCode, output: stripAnsi(`${stdout}${stderr}`), ms: performance.now() - started };
  };
  const replacementsFor = (variant: Variant): [string, string][] => [
    [installs[variant].directory, '<install>'],
    [installs[variant].home, '<home>']
  ];

  const writeProject = async (root: string, functions: number, invalid = false) => {
    const manifest = await writePackagingFixture({ root, functions });
    await writeFixtureConfig({ root, functions: manifest.functions });
    if (invalid) {
      const configPath = join(root, FIXTURE_CONFIG_FILE);
      await writeFile(configPath, (await readFile(configPath, 'utf8')).replace('memory: 512', 'memory: not-a-number'));
    }
    await writeInstallMarker(root);
  };
  const projects = {
    valid: join(work, 'projects', 'validate-valid'),
    invalid: join(work, 'projects', 'validate-invalid'),
    ...Object.fromEntries(
      packageFunctions.map((functions) => [`package-${functions}`, join(work, 'projects', `package-${functions}`)])
    )
  } as Record<string, string>;
  await writeProject(projects.valid!, 1);
  await writeProject(projects.invalid!, 1, true);
  for (const functions of packageFunctions) await writeProject(projects[`package-${functions}`]!, functions);

  // Behavior: the same checks for both executables, whose outcomes must then be equal.
  const behavior = {} as Record<Variant, Record<string, unknown>>;
  const packageOutputs = {} as Record<Variant, Record<string, ReturnType<typeof describePackageOutput>>>;
  const standInRequests = {} as Record<Variant, unknown[]>;
  for (const variant of QUALIFICATION_VARIANTS) {
    const outcome: Record<string, unknown> = {};
    const versionRun = await run(variant, ['--version']);
    check(
      `${variant}: --version`,
      versionRun.exitCode === 0 && versionRun.output.includes(`Stacktape version: ${version}`),
      versionRun.output.trim().split('\n')[0]
    );
    const helpRun = await run(variant, ['--help']);
    check(
      `${variant}: --help`,
      helpRun.exitCode === 0 &&
        ['Available commands:', 'deploy', 'delete', 'package'].every((text) => helpRun.output.includes(text)),
      `${helpRun.output.split('\n').length} lines`
    );
    const defaultsRun = await run(variant, ['defaults:list']);
    check(`${variant}: defaults:list`, defaultsRun.exitCode === 0, `exit ${defaultsRun.exitCode}`);
    outcome.output = Object.fromEntries(
      [
        ['--version', versionRun],
        ['--help', helpRun],
        ['defaults:list', defaultsRun]
      ].map(([name, commandRun]) => [name, normalize((commandRun as CommandRun).output, replacementsFor(variant))])
    );

    const timingsFile = join(work, `validate-${variant}-timings.json`);
    const validRun = await run(variant, VALIDATE_ARGS, { cwd: projects.valid, timingsFile });
    const spans = existsSync(timingsFile)
      ? ((JSON.parse(await readFile(timingsFile, 'utf8')) as { spans?: { name: string; end: number | null }[] })
          .spans ?? [])
      : [];
    const validated = spans.some(({ name, end }) => name === 'config:validate' && end !== null);
    check(
      `${variant}: validate passes a valid configuration and stops at the refused AWS request after it`,
      validated && !validRun.output.includes('CONFIG_SCHEMA_INVALID'),
      `exit ${validRun.exitCode}, ${errorCodeOf(validRun.output) ?? 'no error code'}`
    );
    const invalidRun = await run(variant, VALIDATE_ARGS, { cwd: projects.invalid });
    check(
      `${variant}: validate refuses an invalid configuration`,
      invalidRun.exitCode !== 0 && invalidRun.output.includes('CONFIG_SCHEMA_INVALID'),
      `exit ${invalidRun.exitCode}, ${errorCodeOf(invalidRun.output) ?? 'no error code'}`
    );
    outcome.validate = {
      valid: { exitCode: validRun.exitCode, errorCode: errorCodeOf(validRun.output), validated },
      invalid: { exitCode: invalidRun.exitCode, errorCode: errorCodeOf(invalidRun.output) }
    };

    packageOutputs[variant] = {};
    for (const functions of skipPackage ? [] : packageFunctions) {
      const project = projects[`package-${functions}`]!;
      const packageRun = await run(variant, PACKAGE_ARGS, { cwd: project });
      const output = describePackageOutput(await inspectArtifacts({ root: join(project, '.stacktape') }));
      await rm(join(project, '.stacktape'), { recursive: true, force: true });
      packageOutputs[variant][`${functions}`] = output;
      check(
        `${variant}: package of ${functions} pure-JavaScript function(s), Docker absent`,
        packageRun.exitCode === 0 && output.problems.length === 0 && output.archives.length >= functions,
        packageRun.exitCode === 0
          ? `${output.entries.length} entries, ${output.archives.length} archives`
          : packageRun.output.slice(-600)
      );
    }

    if (!windows) {
      const error = await verifyInteractiveLauncher({
        binaryPath: installs[variant].executable,
        home: installs[variant].home,
        version
      }).then(
        () => null,
        (launcherError: unknown) => (launcherError instanceof Error ? launcherError.message : String(launcherError))
      );
      check(
        `${variant}: the interactive launcher draws, redraws for input and quits on Ctrl+C`,
        error === null,
        error ?? ''
      );
    }
    behavior[variant] = outcome;
    standInRequests[variant] = fixture.takeRequests().map(({ kind, target, status }) => `${kind} ${target} ${status}`);
  }
  check(
    'depth 1 prints exactly what bytecode-off prints for --version, --help and defaults:list',
    JSON.stringify(behavior['depth-1'].output) === JSON.stringify(behavior.off.output)
  );
  check(
    'depth 1 validates like bytecode-off: the same stop, exit code and error code',
    JSON.stringify(behavior['depth-1'].validate) === JSON.stringify(behavior.off.validate),
    JSON.stringify(behavior.off.validate)
  );
  if (!skipPackage) {
    check(
      'depth 1 packages exactly what bytecode-off packages',
      JSON.stringify(packageOutputs['depth-1']) === JSON.stringify(packageOutputs.off)
    );
  }

  // Timing: interleaved pairs, the order alternating each round, after one discarded run of each executable.
  const timePairs = async ({
    args,
    count,
    cwd = work,
    cleanUp = async () => {}
  }: {
    args: string[];
    count: number;
    cwd?: string;
    /** Runs after every run, outside the timed region. */
    cleanUp?: () => Promise<void>;
  }) => {
    const loadBefore = loadavg()[0];
    const pairs: Record<Variant, number>[] = [];
    for (let index = -1; index < count; index++) {
      const pair = {} as Record<Variant, number>;
      for (const variant of index % 2 === 0 ? QUALIFICATION_VARIANTS : QUALIFICATION_VARIANTS.toReversed()) {
        const timed = await run(variant, args, { cwd });
        if (timed.exitCode !== 0) throw new Error(`${variant} ${args.join(' ')} exited ${timed.exitCode}.`);
        pair[variant] = timed.ms;
        await cleanUp();
      }
      // Round -1 is the discarded warm-up.
      if (index >= 0) pairs.push(pair);
    }
    return { ...summarizePairs(pairs), loadAverage1m: { before: loadBefore, after: loadavg()[0] } };
  };
  const timings: Record<string, Awaited<ReturnType<typeof timePairs>>> = {};
  for (const args of TIMED_STARTUP_COMMANDS) {
    timings[args.join(' ')] = await timePairs({ args, count: samples });
  }
  if (!skipPackage) {
    const project = projects[`package-${packageFunctions[0]}`]!;
    timings[`package (${packageFunctions[0]} function)`] = await timePairs({
      args: PACKAGE_ARGS,
      count: packageSamples,
      cwd: project,
      cleanUp: () => rm(join(project, '.stacktape'), { recursive: true, force: true })
    });
  }
  for (const args of TIMED_STARTUP_COMMANDS) {
    const timing = timings[args.join(' ')]!;
    const fasterPercent = Math.round(timing.depth1FasterShare * 100);
    check(
      `depth 1 is used: ${args.join(' ')} median at most ${MAXIMUM_MEDIAN_RATIO * 100} % of bytecode-off, ` +
        `faster in at least ${MINIMUM_FASTER_SHARE * 100} % of pairs`,
      timing.ratio <= MAXIMUM_MEDIAN_RATIO && timing.depth1FasterShare >= MINIMUM_FASTER_SHARE,
      `${timing.offMedianMs} → ${timing.depth1MedianMs} ms (ratio ${timing.ratio}), ` +
        `faster in ${fasterPercent} % of ${timing.samples} pairs`
    );
  }
  await fixture.close();

  return {
    kind: 'stacktape-bytecode-qualification',
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    host: {
      platform: hostPlatform(),
      arch: arch(),
      release: release(),
      cpus: cpus().length,
      cpuModel: cpus()[0]?.model
    },
    archives: archiveRecords,
    behavior,
    packageOutputs,
    standInRequests,
    timings,
    checks,
    qualified: checks.every(({ ok }) => ok)
  };
};
