import { createWriteStream, existsSync } from 'node:fs';
import { mkdir, mkdtemp, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { ZipArchive } from 'archiver';
import type { ArchiveItem, PackagingProgressLogger, RunDocker, RunRailpackPrepare } from '../src/runtime-contracts';
import { buildSplitBundle } from '../src/split-bundler/bundler';
import { assignChunksToLayers } from '../src/split-bundler/layer-assignment';
import { createLayerArtifacts } from '../src/split-bundler/layer-builder';

export const write = async (path: string, contents: string | Uint8Array) => {
  await mkdir(dirname(path), { recursive: true });
  await Bun.write(path, contents);
};

const removeLambdaContainer = async (name: string) => {
  // --rm may already have removed a failed runtime. Only a successful listing proves absence.
  await run('docker', ['rm', '--force', name], undefined, undefined, 5_000).catch(() => undefined);
  const remaining = await run('docker', ['ps', '-aq', '--filter', `name=^/${name}$`], undefined, undefined, 5_000);
  if (remaining.stdout.trim()) throw new Error(`Lambda container ${name} survived cleanup.`);
};

/**
 * Invokes `index.handler` of an extracted function in a local Lambda Node.js image (never pulled; `runtimeImage` and
 * `handler` select another local Lambda image and handler), with the function at
 * `/var/task` and an optional layer at `/opt`, both read-only, and returns its parsed JSON response. The container is
 * labelled for the caller's leftover check and always removed.
 */
export const invokeInLambdaImage = async <Response = unknown>({
  functionDirectory,
  layerDirectory,
  event = {},
  containerLabel,
  environment = {},
  nodeVersion = 24,
  runtimeImage = `public.ecr.aws/lambda/nodejs:${nodeVersion}`,
  handler = 'index.handler',
  user,
  timeoutMs = 60_000
}: {
  functionDirectory: string;
  layerDirectory?: string | undefined;
  event?: unknown;
  containerLabel: string;
  environment?: Record<string, string>;
  nodeVersion?: number;
  /** Another local Lambda base image, for example `public.ecr.aws/lambda/provided:al2023` with handler `bootstrap`. */
  runtimeImage?: string;
  handler?: string;
  user?: string;
  timeoutMs?: number;
}): Promise<Response> => {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;
  // Docker Desktop on WSL sometimes publishes a port that nothing listens on: every host connection is refused while
  // the runtime waits inside. The emulator listens within a second of starting, and before that Docker's proxies reset
  // connections rather than refuse them. A refused request never reached the function, so a new container is safe.
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const name = `stp-e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    let portLost = false;
    try {
      // oxlint-disable-next-line no-await-in-loop -- one runtime container per attempt.
      await run('docker', [
        'run',
        '--pull',
        'never',
        '--platform',
        'linux/amd64',
        '--detach',
        '--name',
        name,
        '--label',
        containerLabel,
        ...(user ? ['--user', user] : []),
        '--publish',
        '127.0.0.1::8080',
        '--mount',
        `type=bind,source=${functionDirectory},target=/var/task,readonly`,
        ...(layerDirectory ? ['--mount', `type=bind,source=${layerDirectory},target=/opt,readonly`] : []),
        ...Object.entries(environment).flatMap(([key, value]) => ['--env', `${key}=${value}`]),
        runtimeImage,
        handler
      ]);
      let refusedSince: number | undefined;
      while (Date.now() < deadline) {
        let refused = false;
        try {
          // oxlint-disable-next-line no-await-in-loop -- Polls the runtime until it answers.
          const port = (await run('docker', ['port', name, '8080/tcp'], undefined, undefined, 5_000)).stdout
            .trim()
            .match(/:(\d+)$/)?.[1];
          if (port) {
            // oxlint-disable-next-line no-await-in-loop -- Polls the runtime until it answers.
            const response = await fetch(`http://127.0.0.1:${port}/2015-03-31/functions/function/invocations`, {
              method: 'POST',
              body: JSON.stringify(event),
              signal: AbortSignal.timeout(Math.max(1, deadline - Date.now()))
            });
            // oxlint-disable-next-line no-await-in-loop -- Reads the response within the invocation deadline.
            const body = await response.text();
            if (response.ok) return JSON.parse(body) as Response;
            // The runtime answered: an invocation error is terminal, not a readiness retry.
            lastError = new Error(`HTTP ${response.status}: ${body}`);
            break;
          }
        } catch (error) {
          lastError = error;
          refused = (error as { code?: string }).code === 'ConnectionRefused';
        }
        refusedSince = refused ? (refusedSince ?? Date.now()) : undefined;
        if (refusedSince !== undefined && Date.now() - refusedSince >= 10_000 && attempt < 3) {
          portLost = true;
          break;
        }
        // oxlint-disable-next-line no-await-in-loop -- Polls the runtime until it answers.
        await Bun.sleep(Math.min(250, Math.max(0, deadline - Date.now())));
      }
      if (portLost) continue;
      // oxlint-disable-next-line no-await-in-loop -- the logs of the failed attempt.
      const logs = await run('docker', ['logs', name], undefined, undefined, 5_000);
      throw new Error(`The Lambda runtime did not answer: ${String(lastError)}\n${logs.stdout}${logs.stderr}`);
    } finally {
      // oxlint-disable-next-line no-await-in-loop -- each attempt's container is gone before the next starts.
      await removeLambdaContainer(name);
    }
  }
  throw new Error(`The Lambda runtime's host port was refused in three containers: ${String(lastError)}`);
};

/**
 * A production split build of `project`'s `src/<name>.ts` handlers under `directory` (`functions/<name>`, `shared`,
 * `layers`): chunks used by two or more functions go into layers, which are then created. Returns each function's
 * chunk names as the build left them, before layering moved some of them out.
 */
export const buildSplitProjectWithLayers = async ({
  project,
  names,
  directory
}: {
  project: string;
  names: readonly string[];
  directory: string;
}) => {
  const split = await buildSplitBundle({
    entrypoints: names.map((name) => ({
      name,
      jobName: name,
      entryfilePath: join(project, 'src', `${name}.ts`),
      distFolderPath: join(directory, 'functions', name)
    })),
    sharedOutdir: join(directory, 'shared'),
    cwd: project,
    minify: true,
    sourceMaps: 'external',
    sourceMapBannerType: 'pre-compiled',
    installDependencies: async () => undefined,
    createPackagingError
  });
  const chunksByFunction = new Map(
    names.map((name) => [
      name,
      new Set(
        split.lambdaOutputs
          .get(name)!
          .files.filter((file) => file.includes('/chunks/'))
          .map((file) => basename(file))
      )
    ])
  );
  const layerAssignment = assignChunksToLayers(split.chunkAnalysis, {
    minUsageCount: 2,
    minChunkSize: 1,
    maxLayers: 3,
    maxLayerSize: 50 * 1024 * 1024
  });
  const { layerArtifacts } = await createLayerArtifacts({
    lambdaOutputs: split.lambdaOutputs,
    layerAssignment,
    layerBasePath: join(directory, 'layers')
  });
  return { layerArtifacts, chunksByFunction };
};

/** Creates an E2E's output directory, refusing one that already has contents. */
export const claimEmptyOutput = async (directory: string) => {
  await mkdir(directory, { recursive: true });
  if ((await readdir(directory)).length > 0) throw new Error(`Refusing to write into ${directory}: it is not empty.`);
};

/** Records an E2E's named checks, printing each as it is made. */
export const createChecks = () => {
  const results: { check: string; ok: boolean; detail: string }[] = [];
  const check = (name: string, ok: boolean, detail: string) => {
    results.push({ check: name, ok, detail });
    console.log(`${ok ? 'ok    ' : 'FAILED'}  ${name} — ${detail}`);
  };
  return { results, check };
};

export const run = async (
  command: string,
  args: string[],
  cwd?: string,
  env?: Record<string, string | undefined>,
  timeoutMs = command === 'docker' ? 420_000 : 240_000
) => {
  const child = Bun.spawn(
    process.platform === 'win32' && ['pnpm', 'npm', 'npx', 'yarn'].includes(command.toLowerCase())
      ? ['cmd.exe', '/d', '/s', '/c', command, ...args]
      : [command, ...args],
    {
      ...(cwd !== undefined && { cwd }),
      env: env ?? { ...Bun.env },
      stdout: 'pipe',
      stderr: 'pipe'
    }
  );
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    child.kill();
  }, timeoutMs);
  let stdout: string;
  let stderr: string;
  let exitCode: number;
  try {
    [stdout, stderr, exitCode] = await Promise.all([
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
      child.exited
    ]);
  } finally {
    clearTimeout(timer);
  }
  if (timedOut) {
    throw new Error(`${command} ${args.join(' ')} timed out after ${timeoutMs}ms.\n${stderr || stdout}`);
  }
  if (exitCode !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed (${exitCode}).\n${stderr || stdout}`);
  }
  return { stdout, stderr, exitCode };
};

export const runDocker: RunDocker = (commands, options) =>
  run('docker', commands, options?.cwd, options?.env ? { ...Bun.env, ...options.env } : undefined);

export const progressLogger: PackagingProgressLogger = {
  eventContext: { instanceId: 'synthetic-e2e' },
  startEvent: () => undefined,
  updateEvent: () => undefined,
  finishEvent: () => undefined
};

export const createPackagingError = ({ message, cause }: { message: string; cause?: unknown }) =>
  new Error(message, { cause });

export const archiveItem: ArchiveItem = async ({
  absoluteSourcePath,
  absoluteDestDirPath,
  fileNameBase,
  format,
  executablePatterns = [],
  compressionLevel = 9,
  store = false
}) => {
  if (format !== 'zip') {
    throw new Error(`The synthetic E2E archive adapter only supports ZIP files, received ${format}.`);
  }

  const absoluteOutputPath = join(
    absoluteDestDirPath ?? dirname(absoluteSourcePath),
    `${fileNameBase ?? basename(absoluteSourcePath)}.zip`
  );
  await mkdir(dirname(absoluteOutputPath), { recursive: true });
  const output = createWriteStream(absoluteOutputPath);
  const archive = new ZipArchive({
    store,
    zlib: { level: store ? 0 : compressionLevel }
  });

  await new Promise<void>((resolveArchive, rejectArchive) => {
    output.on('close', resolveArchive);
    output.on('error', rejectArchive);
    archive.on('error', rejectArchive);
    archive.on('warning', (error) => {
      if (error.code !== 'ENOENT') rejectArchive(error);
    });
    archive.directory(absoluteSourcePath, false, (entry) => {
      entry.mode = entry.stats?.isDirectory()
        ? 0o755
        : executablePatterns.some((pattern) => entry.name === pattern || entry.name.endsWith(`/${pattern}`))
          ? 0o755
          : 0o644;
      return entry;
    });
    archive.pipe(output);
    void archive.finalize().catch(rejectArchive);
  });

  return absoluteOutputPath;
};

export const assertFile = async (path: string) => {
  const details = await stat(path);
  if (!details.isFile() || details.size === 0) {
    throw new Error(`Expected a non-empty artifact file at ${path}`);
  }
};

export const assertRunOutput = async ({ dockerArgs, expected }: { dockerArgs: string[]; expected: string }) => {
  const result = await run('docker', ['run', '--rm', ...dockerArgs]);
  const combinedOutput = `${result.stdout}\n${result.stderr}`;
  if (!combinedOutput.includes(expected)) {
    throw new Error(`Expected runtime output to contain ${JSON.stringify(expected)}.\n${combinedOutput}`);
  }
};

export const invokeNodeHandlerInLambdaImage = async ({
  functionPath,
  event,
  environment = {},
  platform = 'linux/amd64'
}: {
  functionPath: string;
  event: Record<string, unknown>;
  environment?: Record<string, string>;
  /** The Lambda architecture to run; arm64 runs under emulation on an x64 machine. */
  platform?: 'linux/amd64' | 'linux/arm64';
}) => {
  const encodedEvent = Buffer.from(JSON.stringify(event)).toString('base64');
  const script = [
    'const { handler } = await import("/var/task/index-wrap.mjs");',
    'const event = JSON.parse(Buffer.from(process.env.STP_EVENT, "base64").toString("utf8"));',
    'const response = await handler(event, {});',
    'console.log(`STP_E2E_RESPONSE:${JSON.stringify(response)}`);',
    'process.exit(0);'
  ].join('\n');
  const result = await run('docker', [
    'run',
    '--rm',
    '--platform',
    platform,
    '--entrypoint',
    'node',
    '--mount',
    `type=bind,source=${functionPath},target=/var/task,readonly`,
    '--env',
    `STP_EVENT=${encodedEvent}`,
    ...Object.entries(environment).flatMap(([key, value]) => ['--env', `${key}=${value}`]),
    // SSR server functions deploy with nodejs22.x.
    'public.ecr.aws/lambda/nodejs:22',
    '--input-type=module',
    '--eval',
    script
  ]);
  const marker = result.stdout.split(/\r?\n/).find((line) => line.startsWith('STP_E2E_RESPONSE:'));
  if (!marker) {
    throw new Error(`The Lambda Node runtime did not print a handler response.\n${result.stdout}\n${result.stderr}`);
  }
  return JSON.parse(marker.slice('STP_E2E_RESPONSE:'.length)) as {
    body: string;
    cookies?: string[] | undefined;
    headers: Record<string, string>;
    isBase64Encoded: boolean;
    statusCode: number;
  };
};

/**
 * The Railpack release the CLI pins (`apps/cli/src/config/external-tools.json`, written by its `pin-external-tools.ts`);
 * the binary and the frontend come from it.
 */
export const RAILPACK_VERSION = '0.40.1';
export const RAILPACK_FRONTEND_IMAGE = `ghcr.io/railwayapp/railpack-frontend:v${RAILPACK_VERSION}@sha256:f1973377693af30c9b37a92c97c661c07b277ccdc6be909213c74c771f8d2d6d`;

/** The CLI's tools-directory platform keys this host could use, most likely first. */
const railpackPlatformKeys = (): string[] => {
  const arch = process.arch === 'arm64' ? 'arm64' : 'x64';
  if (process.platform === 'darwin') return [`darwin-${arch}`];
  if (process.platform !== 'linux') return [];
  if (arch === 'arm64') return ['linux-arm64-glibc'];
  return existsSync('/etc/alpine-release')
    ? ['linux-x64-musl', 'linux-x64-glibc']
    : ['linux-x64-glibc', 'linux-x64-musl'];
};

/**
 * A railpack binary for the E2E scripts, which cannot use the CLI's downloader: `STP_RAILPACK_BINARY`, then the
 * binary the CLI downloaded into `~/.stacktape/tools/railpack/<version>/<platform>/`, then `railpack` on PATH.
 * `undefined` when there is none; the caller skips its Railpack scenarios.
 */
export const findRailpackBinary = (): string | undefined => {
  const configured = Bun.env.STP_RAILPACK_BINARY;
  if (configured) {
    if (!existsSync(configured)) throw new Error(`STP_RAILPACK_BINARY points at ${configured}, which does not exist.`);
    return configured;
  }
  const downloaded = railpackPlatformKeys()
    .map((key) => join(homedir(), '.stacktape', 'tools', 'railpack', RAILPACK_VERSION, key, 'railpack'))
    .find((path) => existsSync(path));
  return downloaded ?? Bun.which('railpack') ?? undefined;
};

/**
 * `railpack prepare` with a given binary, as the CLI's host planner runs it: the variables are named on the command
 * line (`--env NAME`) and their values are in the planner's environment only. Returns the parsed plan and info files;
 * a failed detection returns its info file (`success: false`) instead of throwing, so the packaging error is tested.
 */
export const createRailpackPrepare =
  (binary: string): RunRailpackPrepare =>
  async ({ sourceDirectoryPath, variables, config }) => {
    const outputDirectory = await mkdtemp(join(tmpdir(), 'stp-e2e-railpack-'));
    // Railpack reads `--config-file` relative to the source directory, so the file is there, as the CLI writes it,
    // only while the planner runs.
    const configFile = config === undefined ? undefined : `.stacktape-railpack-${basename(outputDirectory)}.json`;
    try {
      if (configFile !== undefined) {
        await writeFile(join(sourceDirectoryPath, configFile), JSON.stringify(config, null, 2));
      }
      const readJson = async (name: string) =>
        JSON.parse(await readFile(join(outputDirectory, name), 'utf8')) as unknown;
      try {
        await run(
          binary,
          [
            'prepare',
            sourceDirectoryPath,
            '--plan-out',
            join(outputDirectory, 'plan.json'),
            '--info-out',
            join(outputDirectory, 'info.json'),
            ...(configFile !== undefined ? ['--config-file', configFile] : []),
            ...Object.keys(variables).flatMap((name) => ['--env', name])
          ],
          sourceDirectoryPath,
          { ...Bun.env, ...variables }
        );
      } catch (error) {
        const info = (await readJson('info.json').catch(() => undefined)) as { success?: boolean } | undefined;
        if (info?.success === false) return { plan: undefined, info };
        throw error;
      }
      return { plan: await readJson('plan.json'), info: await readJson('info.json') };
    } finally {
      if (configFile !== undefined) await rm(join(sourceDirectoryPath, configFile), { force: true });
      await rm(outputDirectory, { recursive: true, force: true });
    }
  };
