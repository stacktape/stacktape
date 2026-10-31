import type { EnvironmentVar } from '@stacktape/config/shared';
import { randomBytes } from 'node:crypto';
import { link, rename, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { configManager } from '@domain-services/config-manager';
import { pathExists, readFile, remove, writeFile } from 'fs-extra';
import { findOtherDevSessions } from './agent-daemon';
import { assertEnvironmentResolved } from './unresolved-environment';

export const ENV_FILE_NAME = '.env.local';
const BLOCK_START = '# >>> stacktape dev: managed block, rewritten on every dev start >>>';
const BLOCK_END = '# <<< stacktape dev <<<';
/** The block's second line names the stage whose dev session wrote it. */
const BLOCK_STAGE = /^# stage: (.+)$/;

/** The environment each frontend's dev server got at its latest start, for the agent's `/env`. */
const frontendEnvironments = new Map<string, Record<string, string>>();

export const getFrontendEnvironment = (name: string): Record<string, string> | undefined =>
  frontendEnvironments.get(name);

/** A value dotenv reads back unchanged: plain URLs, hosts and generated passwords as they are, anything else quoted. */
const formatEnvValue = (value: string): string => {
  if (/^[\w.:/@?&=%+,~*-]*$/.test(value)) return value;
  if (!value.includes('"')) return `"${value.replaceAll('\r', '').replaceAll('\n', '\\n')}"`;
  if (!value.includes("'")) return `'${value}'`;
  return `\`${value}\``;
};

/**
 * The env file with Stacktape's block replaced by one holding `envVars`, or removed when there are none. Everything
 * outside the markers is the developer's and stays as it is. A new block goes to the end, where its values win over
 * earlier lines with the same names.
 */
export const mergeManagedEnvBlock = (existing: string, envVars: Record<string, string>, stage?: string): string => {
  const newline = existing.includes('\r\n') ? '\r\n' : '\n';
  const lines = existing ? existing.split(/\r?\n/) : [];
  const start = lines.indexOf(BLOCK_START);
  const end = start === -1 ? -1 : lines.indexOf(BLOCK_END, start);
  const before = start === -1 ? lines : lines.slice(0, start);
  const after = start === -1 ? [] : end === -1 ? [] : lines.slice(end + 1);
  const entries = Object.entries(envVars);
  const block = entries.length
    ? [
        BLOCK_START,
        ...(stage ? [`# stage: ${stage}`] : []),
        ...entries.map(([name, value]) => `${name}=${formatEnvValue(value)}`),
        BLOCK_END
      ]
    : [];
  if (start === -1) {
    if (!block.length) return existing;
    while (before.length && before.at(-1) === '') before.pop();
    return [...before, ...(before.length ? [''] : []), ...block, ''].join(newline);
  }
  return [...before, ...block, ...after].join(newline);
};

/** How long a start waits for another dev session that writes the same env file. */
const ENV_FILE_LOCK_WAIT_MS = 10_000;
/** A lock without a readable owner is stale once this old; writing takes milliseconds. */
const ENV_FILE_LOCK_STALE_MS = 30_000;

const isProcessRunning = (pid: number) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    // Another user's process exists too; only "no such process" means it ended.
    return (error as NodeJS.ErrnoException).code === 'EPERM';
  }
};

/** The lock's content when its owner ended: a process that died while it wrote. `undefined` while it can still write. */
const readStaleLock = async (lockPath: string): Promise<string | undefined> => {
  const content = await readFile(lockPath, 'utf8').catch(() => undefined);
  if (content === undefined) return undefined;
  const pid = Number(content.split(':')[0]);
  if (Number.isInteger(pid) && pid > 0) return isProcessRunning(pid) ? undefined : content;
  const lockedAt = (await stat(lockPath).catch(() => undefined))?.mtimeMs;
  return lockedAt !== undefined && Date.now() - lockedAt > ENV_FILE_LOCK_STALE_MS ? content : undefined;
};

/**
 * Takes a stale lock out of the way. Every waiting process may find it stale, but only one rename of it succeeds; a
 * process whose rename caught a lock that another one created meanwhile puts that lock back.
 */
export const removeStaleLock = async (lockPath: string, staleContent: string) => {
  const aside = `${lockPath}.${process.pid}-${randomBytes(4).toString('hex')}.stale`;
  try {
    await rename(lockPath, aside);
  } catch {
    return;
  }
  if ((await readFile(aside, 'utf8').catch(() => undefined)) !== staleContent) {
    await link(aside, lockPath).catch(() => {});
  }
  await remove(aside).catch(() => {});
};

/**
 * Runs `write` while this process holds the env file's lock, so two dev sessions that start together decide who owns
 * the Stacktape block one after the other, each from the file the other left. The lock names its owner's process; it
 * is stale only once that process has ended.
 */
export const withEnvFileLock = async <T>(envFilePath: string, write: () => Promise<T>): Promise<T> => {
  const lockPath = `${envFilePath}.stacktape-lock`;
  const owner = `${process.pid}:${randomBytes(8).toString('hex')}`;
  const deadline = Date.now() + ENV_FILE_LOCK_WAIT_MS;
  for (;;) {
    try {
      await writeFile(lockPath, owner, { flag: 'wx' });
      break;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      const stale = await readStaleLock(lockPath);
      if (stale !== undefined) {
        await removeStaleLock(lockPath, stale);
        continue;
      }
      if (Date.now() > deadline) {
        throw new Error(
          `Another dev session has been writing ${envFilePath} for ${ENV_FILE_LOCK_WAIT_MS / 1000} s. If none runs, delete ${lockPath}.`
        );
      }
      await delay(50);
    }
  }
  try {
    return await write();
  } finally {
    // Only this process's own lock is removed.
    if ((await readFile(lockPath, 'utf8').catch(() => undefined)) === owner) await remove(lockPath).catch(() => {});
  }
};

/** The stage whose dev session wrote the env file's Stacktape block, when the block names it. */
export const readManagedBlockStage = (existing: string): string | undefined => {
  const lines = existing.split(/\r?\n/);
  const start = lines.indexOf(BLOCK_START);
  if (start === -1) return undefined;
  return lines[start + 1]?.match(BLOCK_STAGE)?.[1];
};

/**
 * Resolves a frontend's own environment (`injectEnvironment` of a hosting bucket, `environment` of an SSR or Next.js
 * app), adds the local variables of the resources it lists in `connectTo`, and writes them to the managed block of
 * `<workingDirectory>/.env.local`. The dev server also gets them as process environment, which outranks every env
 * file, including mode-specific ones such as Vite's `.env.development`.
 */
export const prepareFrontendEnvironment = async ({
  name,
  workingDirectory,
  environment,
  connectedEnvVars
}: {
  name: string;
  workingDirectory: string;
  environment?: EnvironmentVar[];
  connectedEnvVars: Record<string, string>;
}): Promise<Record<string, string>> => {
  const envVars: Record<string, string> = { ...connectedEnvVars };
  if (environment?.length) {
    const resolved = await configManager.resolveDirectives<EnvironmentVar[]>({
      itemToResolve: environment,
      resolveRuntime: true,
      useLocalResolve: true
    });
    assertEnvironmentResolved({
      owner: name,
      environment: Object.fromEntries(resolved.map(({ name: varName, value }) => [varName, value])),
      configured: Object.fromEntries(environment.map(({ name: varName, value }) => [varName, value]))
    });
    for (const { name: varName, value } of resolved) envVars[varName] = String(value);
  }
  frontendEnvironments.set(name, envVars);

  const envFilePath = join(workingDirectory, ENV_FILE_NAME);
  const stage = globalStateManager.targetStack?.stage ?? globalStateManager.stage;
  const written = await withEnvFileLock(envFilePath, async () => {
    const existing = (await pathExists(envFilePath)) ? await readFile(envFilePath, 'utf8') : '';
    if (!existing && !Object.keys(envVars).length) return false;
    // Two stages can run one app directory, each in its own dev session. The block belongs to the session that wrote
    // it while that session runs the app; this server still gets this stage's values as process environment.
    const owner = readManagedBlockStage(existing);
    if (
      owner &&
      owner !== stage &&
      findOtherDevSessions().some((session) => session.stage === owner && session.workloads?.includes(name))
    ) {
      tuiManager.warn(
        `[${name}] ${ENV_FILE_NAME} holds the values of stage ${owner}, whose dev session runs this app, so dev mode left it unchanged. This dev server gets stage ${stage}'s values as process environment, which outranks the file; a build or tool that reads ${ENV_FILE_NAME} gets stage ${owner}'s.`
      );
      return false;
    }
    const merged = mergeManagedEnvBlock(existing, envVars, stage);
    if (merged === existing) return true;
    if (!merged.trim()) {
      await remove(envFilePath);
      return true;
    }
    // A dev server or build that reads the file meanwhile sees the old or the new file, never a half-written one.
    const temporary = `${envFilePath}.${process.pid}-${randomBytes(4).toString('hex')}.tmp`;
    try {
      await writeFile(temporary, merged);
      await rename(temporary, envFilePath);
    } finally {
      await remove(temporary).catch(() => {});
    }
    return true;
  });
  if (!written) return envVars;
  if (Object.keys(envVars).length) {
    tuiManager.info(
      `[${name}] Wrote ${Object.keys(envVars).length} env vars to the Stacktape block of ${ENV_FILE_NAME}`
    );
  }
  return envVars;
};
