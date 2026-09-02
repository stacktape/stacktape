import { createWriteStream } from 'node:fs';
import { mkdir, stat } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { ZipArchive } from 'archiver';
import type { ArchiveItem, PackagingProgressLogger, RunDocker } from '../src/runtime-contracts';

export const write = async (path: string, contents: string | Uint8Array) => {
  await mkdir(dirname(path), { recursive: true });
  await Bun.write(path, contents);
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
