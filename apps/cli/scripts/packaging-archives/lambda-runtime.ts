/**
 * Extracts Lambda artifacts and runs them in the official AWS Lambda Node.js image, as Lambda would.
 *
 * Extraction uses Info-ZIP `unzip`, which restores stored modes and links exactly, so nothing of Stacktape's own ZIP
 * code judges its own output. Functions run through the image's Runtime Interface Emulator as uid 993, an unprivileged
 * test user chosen because it owns none of the files: AWS Lambda likewise runs code as a user other than the one owning
 * it, although AWS does not promise this numeric identity. A file that is owner-only or not executable therefore fails
 * here as it would in AWS. Every container has a unique name, is removed, and its removal is verified.
 */
import { createHash, randomUUID } from 'node:crypto';
import { chmod, lstat, mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';

export const LAMBDA_IMAGE = 'public.ecr.aws/lambda/nodejs:24';
/** The unprivileged test user and group; see the module comment. */
export const LAMBDA_USER = '993:990';
/** Every container an archive acceptance starts carries this label, so leftovers can be found. */
export const CONTAINER_LABEL = 'stacktape.test=lambda-archive-acceptance';

type CommandResult = { exitCode: number | null; stdout: string; stderr: string };
type RunCommand = (command: string[]) => CommandResult;

const run: RunCommand = (command) => {
  const result = Bun.spawnSync(command, { stdout: 'pipe', stderr: 'pipe' });
  return { exitCode: result.exitCode, stdout: result.stdout.toString(), stderr: result.stderr.toString() };
};

const runOrThrow = (command: string[], runCommand: RunCommand = run) => {
  const result = runCommand(command);
  if (result.exitCode !== 0) {
    throw new Error(`${command.slice(0, 3).join(' ')} failed (${result.exitCode}): ${result.stderr || result.stdout}`);
  }
  return result.stdout;
};

/** Pulls `image` only when it is missing, and returns the digest of the local image that will run. */
export const ensureLambdaImage = (image = LAMBDA_IMAGE) => {
  if (run(['docker', 'image', 'inspect', image]).exitCode !== 0) {
    runOrThrow(['docker', 'pull', image]);
  }
  return runOrThrow(['docker', 'image', 'inspect', '--format', '{{index .RepoDigests 0}}', image]).trim();
};

/**
 * Extracts each ZIP, in order, into one new directory with `unzip` and returns it: several layer archives extracted
 * together make up `/opt` as Lambda assembles it. The directory is removed again if any extraction fails.
 */
export const extractZip = async (zipPaths: string | string[], runCommand: RunCommand = run) => {
  const directory = await mkdtemp(join(tmpdir(), 'stacktape-lambda-archive-'));
  try {
    // The archives have no entry for the root itself; Lambda's /var/task and /opt are readable by the function's user.
    // Entry modes stay exactly as extracted: they are what is under test.
    await chmod(directory, 0o755);
    for (const zipPath of [zipPaths].flat()) {
      runOrThrow(['unzip', '-q', '-o', zipPath, '-d', directory], runCommand);
    }
    return directory;
  } catch (error) {
    await rm(directory, { recursive: true, force: true });
    throw error;
  }
};

/** Each entry of an extracted tree as `path mode sha256` (files) or `path directory`, sorted. */
export const listExtractedEntries = async (root: string) => {
  const lines: string[] = [];
  for (const entry of await readdir(root, { recursive: true, withFileTypes: true })) {
    const path = join(entry.parentPath, entry.name);
    const info = await lstat(path);
    const mode = (info.mode & 0o777).toString(8);
    lines.push(
      info.isFile()
        ? `${relative(root, path)} ${mode} ${createHash('sha256')
            .update(await readFile(path))
            .digest('hex')}`
        : `${relative(root, path)} ${info.isDirectory() ? 'directory' : 'other'} ${mode}`
    );
  }
  return lines.toSorted();
};

/** What the function returned, with the container's stdout and stderr for diagnosis and log checks. */
export type Invocation = { status: number; body: string; logs: { stdout: string; stderr: string } };

/**
 * Posts `body` to `url` and reads the whole answer before `deadline` (epoch milliseconds). Refused connections, while
 * the emulator starts, are retried; a request that is accepted but never answered, or an answer that never finishes, is
 * aborted at the deadline instead of hanging.
 */
export const postBeforeDeadline = async ({ url, body, deadline }: { url: string; body: string; deadline: number }) => {
  for (;;) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      throw new Error(`${url} did not answer before the deadline.`);
    }
    const signal = AbortSignal.timeout(remaining);
    try {
      const response = await fetch(url, { method: 'POST', body, signal });
      return { status: response.status, body: await response.text() };
    } catch (error) {
      if (signal.aborted) {
        throw new Error(`${url} did not answer before the deadline.`, { cause: error });
      }
      // Not listening yet: try again shortly, within the same deadline.
      await Bun.sleep(Math.min(200, Math.max(0, deadline - Date.now())));
    }
  }
};

/**
 * Removes the container and proves it is gone. A failing `docker ps` is no evidence of removal, so it is an error, as
 * is a container that still exists.
 */
export const removeContainer = (name: string, runCommand: RunCommand = run) => {
  runCommand(['docker', 'rm', '--force', name]);
  const listing = runCommand(['docker', 'ps', '--all', '--quiet', '--filter', `name=^/${name}$`]);
  if (listing.exitCode !== 0) {
    throw new Error(`Could not verify that container ${name} was removed: docker ps failed (${listing.exitCode}).`);
  }
  if (listing.stdout.trim()) {
    throw new Error(`Container ${name} is still present after removal.`);
  }
};

/**
 * Invokes the function in `functionDirectory` (mounted at /var/task) with `layerDirectory` mounted at /opt. Without a
 * handler, `/var/task/bootstrap` is started as a custom runtime, the way Lambda starts one. The whole invocation,
 * including the answer, must finish within `timeoutMs`; the container is removed whatever happens.
 */
export const invokeInLambdaRuntime = async ({
  functionDirectory,
  layerDirectory,
  handler,
  event = {},
  timeoutMs = 60_000,
  image = LAMBDA_IMAGE
}: {
  functionDirectory: string;
  layerDirectory?: string | undefined;
  handler?: string | undefined;
  event?: unknown;
  timeoutMs?: number;
  image?: string | undefined;
}): Promise<Invocation> => {
  const name = `stp-lambda-archive-${randomUUID().slice(0, 12)}`;
  let outcome: { invocation: Invocation } | { error: unknown };
  try {
    runOrThrow([
      'docker',
      'run',
      '--detach',
      '--name',
      name,
      '--label',
      CONTAINER_LABEL,
      '--user',
      LAMBDA_USER,
      '--publish',
      '127.0.0.1::8080',
      '--mount',
      `type=bind,source=${functionDirectory},target=/var/task,readonly`,
      ...(layerDirectory ? ['--mount', `type=bind,source=${layerDirectory},target=/opt,readonly`] : []),
      ...(handler ? [image, handler] : ['--entrypoint', '/usr/local/bin/aws-lambda-rie', image, '/var/task/bootstrap'])
    ]);
    const port = runOrThrow(['docker', 'port', name, '8080/tcp']).trim().split('\n')[0]!.split(':').at(-1);
    const answer = await postBeforeDeadline({
      url: `http://127.0.0.1:${port}/2015-03-31/functions/function/invocations`,
      body: JSON.stringify(event),
      deadline: Date.now() + timeoutMs
    });
    const logs = run(['docker', 'logs', name]);
    outcome = { invocation: { ...answer, logs: { stdout: logs.stdout, stderr: logs.stderr } } };
  } catch (error) {
    const logs = run(['docker', 'logs', name]);
    outcome = {
      error: new Error(`${error instanceof Error ? error.message : String(error)}\n${logs.stdout}${logs.stderr}`, {
        cause: error
      })
    };
  }
  removeContainer(name);
  if ('error' in outcome) {
    throw outcome.error;
  }
  return outcome.invocation;
};

/** Containers this acceptance started that still exist; always expected to be none. */
export const listLeftoverContainers = () => {
  const listing = run(['docker', 'ps', '--all', '--format', '{{.Names}}', '--filter', `label=${CONTAINER_LABEL}`]);
  if (listing.exitCode !== 0) {
    throw new Error(`Could not list acceptance containers: docker ps failed (${listing.exitCode}).`);
  }
  return listing.stdout.split('\n').filter(Boolean);
};
