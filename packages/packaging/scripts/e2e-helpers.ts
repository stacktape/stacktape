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
  handler = 'index.handler'
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
}): Promise<Response> => {
  const name = `stp-e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  try {
    await run('docker', [
      'run',
      '--pull',
      'never',
      '--platform',
      'linux/amd64',
      '--detach',
      '--rm',
      '--name',
      name,
      '--label',
      containerLabel,
      '--publish',
      '127.0.0.1::8080',
      '--mount',
      `type=bind,source=${functionDirectory},target=/var/task,readonly`,
      ...(layerDirectory ? ['--mount', `type=bind,source=${layerDirectory},target=/opt,readonly`] : []),
      ...Object.entries(environment).flatMap(([key, value]) => ['--env', `${key}=${value}`]),
      runtimeImage,
      handler
    ]);
    let lastError: unknown;
    for (let attempt = 0; attempt < 120; attempt += 1) {
      try {
        // oxlint-disable-next-line no-await-in-loop -- Polls the runtime until it answers.
        const port = (await run('docker', ['port', name, '8080/tcp'])).stdout.trim().match(/:(\d+)$/)?.[1];
        if (port) {
          // oxlint-disable-next-line no-await-in-loop -- Polls the runtime until it answers.
          const response = await fetch(`http://127.0.0.1:${port}/2015-03-31/functions/function/invocations`, {
            method: 'POST',
            body: JSON.stringify(event)
          });
          // oxlint-disable-next-line no-await-in-loop -- Polls the runtime until it answers.
          const body = await response.text();
          if (response.ok) return JSON.parse(body) as Response;
          lastError = new Error(`HTTP ${response.status}: ${body}`);
        }
      } catch (error) {
        lastError = error;
      }
      // oxlint-disable-next-line no-await-in-loop -- Polls the runtime until it answers.
      await Bun.sleep(250);
    }
    throw new Error(`The Lambda runtime did not answer: ${String(lastError)}`);
  } finally {
    await run('docker', ['rm', '--force', name]).catch(() => undefined);
  }
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

export const run = async (command: string, args: string[], cwd?: string, env?: Record<string, string | undefined>) => {
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
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited
  ]);
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
  environment = {}
}: {
  functionPath: string;
  event: Record<string, unknown>;
  environment?: Record<string, string>;
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
    '--entrypoint',
    'node',
    '--mount',
    `type=bind,source=${functionPath},target=/var/task,readonly`,
    '--env',
    `STP_EVENT=${encodedEvent}`,
    ...Object.entries(environment).flatMap(([key, value]) => ['--env', `${key}=${value}`]),
    'public.ecr.aws/lambda/nodejs:24',
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

/** The Railpack release the CLI pins (`apps/cli/src/config/railpack.ts`); the binary and the frontend come from it. */
export const RAILPACK_VERSION = '0.40.1';
export const RAILPACK_FRONTEND_IMAGE = `ghcr.io/railwayapp/railpack-frontend:v${RAILPACK_VERSION}`;

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
    try {
      if (config !== undefined) {
        await writeFile(join(outputDirectory, 'railpack.json'), JSON.stringify(config, null, 2));
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
            ...(config !== undefined ? ['--config-file', join(outputDirectory, 'railpack.json')] : []),
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
      await rm(outputDirectory, { recursive: true, force: true });
    }
  };
