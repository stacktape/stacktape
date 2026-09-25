import { createWriteStream } from 'node:fs';
import { mkdir, readdir, stat } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { ZipArchive } from 'archiver';
import type { ArchiveItem, PackagingProgressLogger, RunDocker } from '../src/runtime-contracts';
import { buildSplitBundle } from '../src/split-bundler/bundler';
import { assignChunksToLayers } from '../src/split-bundler/layer-assignment';
import { createLayerArtifacts } from '../src/split-bundler/layer-builder';

export const write = async (path: string, contents: string | Uint8Array) => {
  await mkdir(dirname(path), { recursive: true });
  await Bun.write(path, contents);
};

/**
 * Invokes `index.handler` of an extracted function in a local Lambda Node.js image (never pulled), with the function at
 * `/var/task` and an optional layer at `/opt`, both read-only, and returns its parsed JSON response. The container is
 * labelled for the caller's leftover check and always removed.
 */
export const invokeInLambdaImage = async <Response = unknown>({
  functionDirectory,
  layerDirectory,
  event = {},
  containerLabel,
  environment = {},
  nodeVersion = 24
}: {
  functionDirectory: string;
  layerDirectory?: string | undefined;
  event?: unknown;
  containerLabel: string;
  environment?: Record<string, string>;
  nodeVersion?: number;
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
      `public.ecr.aws/lambda/nodejs:${nodeVersion}`,
      'index.handler'
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
      cwd,
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
