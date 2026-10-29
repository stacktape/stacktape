import { spawn, type ChildProcess } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import killProcessTree from 'tree-kill';
import { existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, unlinkSync, writeFileSync } from 'fs-extra';
import {
  closeSync,
  copyFileSync,
  fstatSync,
  linkSync,
  openSync,
  readSync,
  renameSync,
  rmSync,
  statSync,
  truncateSync
} from 'node:fs';
import { StringDecoder } from 'node:string_decoder';
import { dirname, isAbsolute, join, resolve as resolvePath } from 'node:path';
import { applicationManager } from '@application-services/application-manager';
import { globalStateManager } from '@application-services/global-state-manager';
import { localStatePaths } from 'src/config/local-state-paths';

export type AgentLockFile = {
  pid: number;
  port: number;
  phase: 'starting' | 'ready' | 'stopping';
  projectName: string;
  stage: string;
  region: string;
  startedAt: string;
  workloads: string[];
  databases: string[];
  logFile?: string;
  /** The agent's session ID, the same one its `/status` reports and MCP uses as `devSessionId`. */
  sessionId?: string;
  /** The session's SSM session to the dev box, so a later start can end it if this process was killed. */
  devBoxSessionId?: string;
  /** The AWS profile and account the session runs against, so a start for another target does not reuse it. */
  profile?: string;
  awsAccountId?: string;
  awsAccountName?: string;
};

/** What a start asks for. A field it does not know yet (the account before credentials load) is left out. */
export type DevSessionTarget = Pick<AgentLockFile, 'region' | 'profile' | 'awsAccountId' | 'awsAccountName'>;

/**
 * How the session of `lock` compares with the target a start asks for. A Console account (`awsAccountName`) supplies
 * the credentials by itself, so a profile does not count. Local credentials are the profile and the account they
 * resolve to; an unset profile matches only an unset one. Without the account of local credentials nothing can be
 * compared (`comparable: false`): a profile can select another account than it did when the session started.
 */
export const compareSessionTarget = (
  lock: AgentLockFile,
  requested: Partial<DevSessionTarget>
): { comparable: boolean; mismatch: string[] } => {
  const viaConsole = requested.awsAccountName !== undefined;
  if (!viaConsole && requested.awsAccountId === undefined) return { comparable: false, mismatch: [] };
  const show = (value: string | undefined, none: string) => value ?? none;
  const mismatch: string[] = [];
  if (lock.region !== requested.region) mismatch.push(`region ${lock.region} (this start: ${requested.region})`);
  if (viaConsole) {
    if (lock.awsAccountName !== requested.awsAccountName)
      mismatch.push(
        `AWS account ${show(lock.awsAccountName, 'of local credentials')} (this start: ${requested.awsAccountName})`
      );
    return { comparable: true, mismatch };
  }
  if (lock.awsAccountName !== undefined)
    mismatch.push(`AWS account ${lock.awsAccountName} (this start: local credentials)`);
  else if (lock.awsAccountId !== requested.awsAccountId)
    mismatch.push(`AWS account ${show(lock.awsAccountId, 'unknown')} (this start: ${requested.awsAccountId})`);
  if (lock.profile !== requested.profile)
    mismatch.push(`AWS profile ${show(lock.profile, 'none')} (this start: ${show(requested.profile, 'none')})`);
  return { comparable: true, mismatch };
};

/** The live session of another process that this directory's lock file of `stage` names, if any. */
export const findLiveStageSession = async (projectName: string, stage: string): Promise<AgentLockFile | null> => {
  const lock = readAgentLockFile(projectName, stage);
  return lock && lock.pid !== process.pid && (await isLockOwnerAlive(lock)) ? lock : null;
};

let devBoxSessionId: string | undefined;

/** The session token of the agent on `port`, read from the per-user file every agent writes when it starts. */
export const readDevAgentToken = (port: number): string | undefined => {
  try {
    return readFileSync(localStatePaths.devAgentTokenFile({ port }), 'utf-8').trim() || undefined;
  } catch {
    return undefined;
  }
};

/**
 * Calls a dev agent the way every local client must: on loopback, with the session token of the agent on that port
 * and, for POST, a JSON content type. Without a readable token file the request goes out unauthenticated and the agent
 * refuses it with 401.
 */
export const requestDevAgent = (
  agent: { port: number },
  path: string,
  { method = 'GET', timeoutMs }: { method?: 'GET' | 'POST'; timeoutMs: number }
): Promise<Response> => {
  const token = readDevAgentToken(agent.port);
  return fetch(`http://127.0.0.1:${agent.port}${path}`, {
    method,
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(method === 'POST' ? { 'content-type': 'application/json' } : {})
    },
    ...(method === 'POST' ? { body: '{}' } : {}),
    signal: AbortSignal.timeout(timeoutMs)
  });
};

const getLockDir = (): string => {
  // Use workingDir if available, otherwise derive from args.configPath
  // This is needed because configPath may not be set on globalStateManager yet
  // when getRunningAgent() is called early in the dev command
  let baseDir = globalStateManager.workingDir;
  if (baseDir === process.cwd() && globalStateManager.args.configPath) {
    const configPath = globalStateManager.args.configPath;
    baseDir = dirname(isAbsolute(configPath) ? configPath : join(process.cwd(), configPath));
  }
  return localStatePaths.devAgentRegistryDirectory({ workingDirectory: baseDir });
};

/**
 * Get lock file path for a specific project+stage combination.
 * Format: .stacktape/dev-agents/{projectName}-{stage}.json
 */
export const getLockFilePath = (projectName?: string, stage?: string): string => {
  // Use args directly since targetStack may not be initialized yet
  const project =
    projectName ?? globalStateManager.targetStack?.projectName ?? globalStateManager.args.projectName ?? 'unknown';
  const stg = stage ?? globalStateManager.targetStack?.stage ?? globalStateManager.stage ?? 'unknown';
  // Sanitize for filename (replace invalid chars)
  const safeName = `${project}-${stg}`.replace(/[^a-zA-Z0-9-_]/g, '_');
  return join(getLockDir(), `${safeName}.json`);
};

const readAgentLockFile = (projectName?: string, stage?: string): AgentLockFile | null => {
  const lockPath = getLockFilePath(projectName, stage);
  if (!existsSync(lockPath)) return null;

  try {
    const content = readFileSync(lockPath, 'utf-8');
    return JSON.parse(content) as AgentLockFile;
  } catch {
    return null;
  }
};

/**
 * Read all agent lock files in the lock directory.
 */
const readAllAgentLockFiles = (): AgentLockFile[] => {
  const lockDir = getLockDir();
  if (!existsSync(lockDir)) return [];

  try {
    const files = readdirSync(lockDir).filter((f) => f.endsWith('.json'));
    const lockFiles: AgentLockFile[] = [];

    for (const file of files) {
      try {
        const content = readFileSync(join(lockDir, file), 'utf-8');
        lockFiles.push(JSON.parse(content) as AgentLockFile);
      } catch {
        // Skip invalid files
      }
    }

    return lockFiles;
  } catch {
    return [];
  }
};

/** The project and stage of this process's own lock file. */
let ownLock: { projectName: string; stage: string } | undefined;
/** Whether this session has begun to stop, possibly before it wrote its lock file. */
let ownSessionStopping = false;

/** The lock file's content, written to a temporary file beside it: readers see the whole file or none. */
const writeLockContent = (data: AgentLockFile): { lockPath: string; temporaryPath: string } => {
  const lockPath = getLockFilePath(data.projectName, data.stage);
  mkdirSync(dirname(lockPath), { recursive: true });
  let phase = data.phase;
  if (data.pid === process.pid) {
    ownLock = { projectName: data.projectName, stage: data.stage };
    // A start that finishes after a stop began must not record the session as ready again.
    if (ownSessionStopping) phase = 'stopping';
  }
  const temporaryPath = `${lockPath}.${process.pid}.${randomBytes(4).toString('hex')}.tmp`;
  writeFileSync(
    temporaryPath,
    JSON.stringify({ ...data, phase, ...(devBoxSessionId && { devBoxSessionId }) }, null, 2)
  );
  return { lockPath, temporaryPath };
};

/** Writes the lock file of `data`'s session, replacing it in one step. A start creates its own with `acquireAgentLockFile`. */
export const writeAgentLockFile = (data: AgentLockFile): void => {
  const { lockPath, temporaryPath } = writeLockContent(data);
  renameSync(temporaryPath, lockPath);
};

/**
 * Whether the session a lock file names still runs. Its process must run, and an agent must answer on its port with
 * the session ID of the lock: a process ID the system gave to another program after the session died is not the
 * session. An agent that is stopping has closed its port, and one that does not answer in time is taken to run.
 */
export const isLockOwnerAlive = async (lock: AgentLockFile): Promise<boolean> => {
  if (!isProcessRunning(lock.pid)) return false;
  if (!lock.port || !lock.sessionId || lock.phase === 'stopping') return true;
  try {
    const response = await requestDevAgent(lock, '/status', { timeoutMs: 2000 });
    if (!response.ok) return true;
    const { data } = (await response.json()) as { data?: { sessionId?: unknown } };
    return data?.sessionId === undefined || data.sessionId === lock.sessionId;
  } catch (error) {
    const name = (error as Error)?.name;
    return name === 'TimeoutError' || name === 'AbortError';
  }
};

/**
 * Creates this session's lock file of its project and stage. Returns null when it did, or the live session that holds
 * it. The file appears in one step (a hard link of the complete temporary file), and only if none exists: review of
 * #385, two starts that both passed their checks both wrote it. A lock file whose session is gone is replaced, by one
 * start at a time (`replaceStaleLockFile`).
 */
export const acquireAgentLockFile = async (data: AgentLockFile): Promise<AgentLockFile | null> => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { lockPath, temporaryPath } = writeLockContent(data);
    try {
      linkSync(temporaryPath, lockPath);
      return null;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
    } finally {
      rmSync(temporaryPath, { force: true });
    }
    const holder = readAgentLockFile(data.projectName, data.stage);
    if (holder && holder.pid !== process.pid && (await isLockOwnerAlive(holder))) return holder;
    await replaceStaleLockFile(lockPath, holder);
  }
  throw new Error(`Could not create the dev session lock file ${getLockFilePath(data.projectName, data.stage)}.`);
};

/**
 * Deletes the lock file at `lockPath` if it still is `stale`, while holding `<lockPath>.takeover`, so that of two starts
 * that found the same stale file, the second does not delete the file the first created after it.
 */
const replaceStaleLockFile = async (lockPath: string, stale: AgentLockFile | null) => {
  const mutex = `${lockPath}.takeover`;
  try {
    mkdirSync(mutex);
  } catch {
    // Another start replaces it; a mutex left by a killed start is removed once it is old.
    try {
      if (Date.now() - statSync(mutex).mtimeMs > 10_000) rmSync(mutex, { recursive: true, force: true });
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
    return;
  }
  try {
    const current = readLockFileAt(lockPath);
    // Unchanged: still the stale session's file, or still unreadable. A file another start created meanwhile stays.
    const unchanged =
      current === 'missing'
        ? false
        : stale === null
          ? current === 'unreadable'
          : current !== 'unreadable' && current.pid === stale.pid && current.startedAt === stale.startedAt;
    if (unchanged) unlinkSync(lockPath);
  } finally {
    rmSync(mutex, { recursive: true, force: true });
  }
};

const readLockFileAt = (lockPath: string): AgentLockFile | 'missing' | 'unreadable' => {
  let content: string;
  try {
    content = readFileSync(lockPath, 'utf-8');
  } catch {
    return 'missing';
  }
  try {
    const lock = JSON.parse(content) as AgentLockFile;
    return typeof lock?.pid === 'number' ? lock : 'unreadable';
  } catch {
    return 'unreadable';
  }
};

/**
 * Records in this process's lock file that its session stops. The lock file is deleted only when the cleanup has
 * finished, so a start of the same stage meanwhile waits for this process (`waitForStoppingSession`) instead of
 * starting a second session next to it.
 */
export const markOwnAgentLockStopping = (): void => {
  if (ownSessionStopping) return;
  ownSessionStopping = true;
  if (!ownLock) return;
  const lock = readAgentLockFile(ownLock.projectName, ownLock.stage);
  if (lock?.pid === process.pid) writeAgentLockFile(lock);
};

/** Whether this session has begun to stop: `/stop` marks it before the interrupt that runs the cleanup arrives. */
export const isOwnSessionStopping = (): boolean => ownSessionStopping;

/**
 * The cleanup of this session's lock file. The lock file goes last: a start of this stage while the cleanup runs (right
 * after a `/stop`) finds it marked as stopping and waits, instead of starting a second session next to this one. It is
 * deleted only while it is still this process's own, so a successor's lock file stays.
 */
export const registerOwnLockCleanup = ({ projectName, stage }: { projectName: string; stage: string }) => {
  applicationManager.registerCleanUpHook(async () => markOwnAgentLockStopping());
  applicationManager.finalCleanUpHooks.push(async () =>
    deleteAgentLockFile({ projectName, stage, ownerPid: process.pid })
  );
};

/**
 * Waits up to `timeoutMs` for the session of this project and stage that is stopping to exit. Returns its lock file
 * if it still runs then, otherwise null. r2mm dogfood: a start right after a `/stop` ran next to the stopping session.
 */
export const waitForStoppingSession = async ({
  projectName,
  stage,
  timeoutMs,
  onWait
}: {
  projectName?: string;
  stage?: string;
  timeoutMs: number;
  /** Called once, when there is a session to wait for. */
  onWait?: (lock: AgentLockFile) => void;
}): Promise<AgentLockFile | null> => {
  const deadline = Date.now() + timeoutMs;
  let waiting = false;
  for (;;) {
    const lock = readAgentLockFile(projectName, stage);
    if (!lock || lock.phase !== 'stopping' || lock.pid === process.pid || !isProcessRunning(lock.pid)) return null;
    if (Date.now() >= deadline) return lock;
    if (!waiting) onWait?.(lock);
    waiting = true;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
};

/** Records this session's current SSM session to the dev box in its lock file. */
export const recordDevBoxSession = (sessionId: string | undefined, projectName: string, stage: string) => {
  devBoxSessionId = sessionId;
  const lock = readAgentLockFile(projectName, stage);
  if (lock?.pid === process.pid) writeAgentLockFile(lock);
};

/**
 * The SSM session a killed earlier session of this project and stage left open. A killed plugin's server-side session
 * stays open, and its agent keeps the old relay connections. Read before this session writes its own lock file.
 */
export const findOrphanedDevBoxSession = (projectName: string, stage: string): string | undefined => {
  const lock = readAgentLockFile(projectName, stage);
  return lock && lock.pid !== process.pid && !isProcessRunning(lock.pid) ? lock.devBoxSessionId : undefined;
};

/**
 * Deletes the lock file of this project and stage if the session of process `ownerPid` still owns it. A later session
 * of the stage writes its own lock file over a stopping or dead one; deleting by path alone removed the successor's.
 */
export const deleteAgentLockFile = ({
  projectName,
  stage,
  ownerPid
}: {
  projectName: string;
  stage: string;
  ownerPid: number;
}): void => {
  const lockPath = getLockFilePath(projectName, stage);
  if (readAgentLockFile(projectName, stage)?.pid === ownerPid) {
    try {
      unlinkSync(lockPath);
    } catch {
      // Ignore errors
    }
  }
};

/**
 * Check if a process with the given PID is still running.
 */
const isProcessRunning = (pid: number): boolean => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

/**
 * Deletes the lock file of a dead session, unless it records the SSM session to the dev box that the session left
 * open: the next start of the stage reads it (`findOrphanedDevBoxSession`), closes that session and then replaces the
 * lock file with its own.
 */
const forgetDeadAgent = (lockFile: AgentLockFile) => {
  if (lockFile.devBoxSessionId) return;
  deleteAgentLockFile({ projectName: lockFile.projectName, stage: lockFile.stage, ownerPid: lockFile.pid });
};

/** The other live dev sessions of this project directory, of any stage, as their lock files record them. */
export const findOtherDevSessions = (): AgentLockFile[] =>
  readAllAgentLockFiles().filter(({ pid }) => pid !== process.pid && isProcessRunning(pid));

/**
 * Check if an agent is already running and healthy for the current project+stage.
 * Returns the lock file data if running, null otherwise.
 */
export const getRunningAgent = async (projectName?: string, stage?: string): Promise<AgentLockFile | null> => {
  const lockFile = readAgentLockFile(projectName, stage);
  if (!lockFile) return null;

  // Check if process is still running
  if (!isProcessRunning(lockFile.pid)) {
    forgetDeadAgent(lockFile);
    return null;
  }

  // Verify agent is responding via HTTP
  try {
    const response = await requestDevAgent(lockFile, '/health', { timeoutMs: 2000 });
    if (response.ok) {
      return lockFile;
    }
  } catch {
    // Agent not responding
  }

  return null;
};

/**
 * Get all running agents across all projects/stages.
 */
export const getAllRunningAgents = async (): Promise<AgentLockFile[]> => {
  const lockFiles = readAllAgentLockFiles();
  const runningAgents: AgentLockFile[] = [];

  for (const lockFile of lockFiles) {
    // Check if process is still running
    if (!isProcessRunning(lockFile.pid)) {
      forgetDeadAgent(lockFile);
      continue;
    }

    // Verify agent is responding via HTTP
    try {
      const response = await requestDevAgent(lockFile, '/health', { timeoutMs: 2000 });
      if (response.ok) {
        runningAgents.push(lockFile);
      }
    } catch {
      // Agent not responding - skip
    }
  }

  return runningAgents;
};

/** A running dev agent found through its token file, with the project and stage its `/status` reports. */
export type DiscoveredDevAgent = {
  port: number;
  pid: number;
  phase?: string;
  sessionId?: string;
  projectDirectory?: string;
  projectName?: string;
  stage?: string;
  region?: string;
};

/**
 * Every dev agent this user runs, in any directory. Each agent writes its session token under its port in the user's
 * state directory, and its `/status` names its project directory and stage, so a client that has no lock file (`dev
 * stop` from another directory, a restarted MCP server) can still find the right one. Agents of CLI versions that do
 * not report a project directory are returned without one.
 */
export const discoverDevAgents = async (): Promise<DiscoveredDevAgent[]> => {
  let ports: number[];
  try {
    ports = readdirSync(localStatePaths.devAgentTokenDirectory())
      .map((file) => /^(\d+)\.token$/.exec(file)?.[1])
      .filter((port): port is string => port !== undefined)
      .map(Number);
  } catch {
    return [];
  }
  const agents = await Promise.all(
    ports.map(async (port): Promise<DiscoveredDevAgent | undefined> => {
      try {
        const response = await requestDevAgent({ port }, '/status', { timeoutMs: 2000 });
        if (!response.ok) return undefined;
        // The agent wraps every response in its `{ v, ok, code, data }` envelope.
        const { data = {} } = (await response.json()) as { data?: Record<string, unknown> };
        const text = (key: string) => (typeof data[key] === 'string' ? (data[key] as string) : undefined);
        return {
          port,
          pid: typeof data.pid === 'number' ? data.pid : 0,
          phase: text('phase'),
          sessionId: text('sessionId'),
          projectDirectory: text('projectDirectory'),
          projectName: text('projectName'),
          stage: text('stage'),
          region: text('region')
        };
      } catch {
        return undefined;
      }
    })
  );
  return agents.filter((agent): agent is DiscoveredDevAgent => agent !== undefined);
};

/** Whether two directory paths name the same directory, following symbolic links where the paths exist. */
export const isSameDirectory = (a: string, b: string): boolean => {
  const canonical = (path: string) => {
    try {
      return realpathSync(path);
    } catch {
      return resolvePath(path);
    }
  };
  return canonical(a) === canonical(b);
};

/**
 * Stop a running agent by sending POST /stop and waiting for exit.
 */
export const stopRunningAgent = async (lockFile: AgentLockFile): Promise<boolean> => {
  const hasPid = lockFile.pid > 0;
  const deleteLock = () =>
    deleteAgentLockFile({ projectName: lockFile.projectName, stage: lockFile.stage, ownerPid: lockFile.pid });
  const forceStop = async (): Promise<boolean> => {
    if (!isProcessRunning(lockFile.pid)) {
      deleteLock();
      return true;
    }
    // Discover watchers and tunnel processes before killing the parent, including detached process groups.
    await new Promise<void>((resolve, reject) => {
      killProcessTree(lockFile.pid, 'SIGKILL', (error) => (error ? reject(error) : resolve()));
    });
    const deadline = Date.now() + 3000;
    while (isProcessRunning(lockFile.pid) && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    if (isProcessRunning(lockFile.pid)) return false;
    deleteLock();
    return true;
  };

  try {
    const response = await requestDevAgent(lockFile, '/stop', { method: 'POST', timeoutMs: 5000 });
    if (!response.ok) {
      // The agent refused the request (no readable token). An interrupt still runs its cleanup, which restores Lambda
      // environments and stops containers; Windows has no interrupt to send, so the process tree is stopped directly.
      if (!hasPid) return false;
      if (process.platform === 'win32') return await forceStop();
      process.kill(lockFile.pid, 'SIGINT');
    }

    // Wait for process to exit (only if we know the PID)
    if (hasPid) {
      const startTime = Date.now();
      while (Date.now() - startTime < 10000) {
        if (!isProcessRunning(lockFile.pid)) {
          deleteLock();
          return true;
        }
        await new Promise((r) => setTimeout(r, 200));
      }

      return await forceStop();
    } else {
      // No PID - just wait a bit for the stop request to take effect
      await new Promise((r) => setTimeout(r, 1000));
    }

    deleteLock();
    return true;
  } catch {
    // Try force kill if we have a PID
    if (hasPid) {
      try {
        return await forceStop();
      } catch {
        return false;
      }
    }
    return false;
  }
};

export type { AgentReadyPayload };

export type DaemonSpawnResult = {
  success: boolean;
  port?: number;
  pid?: number;
  error?: string;
  /** The daemon's own result when it failed: its error code and hints, which the parent reports unchanged. */
  childResult?: ChildResult;
  readyPayload?: AgentReadyPayload;
};

type AgentReadyPayload = {
  port: number;
  projectName: string;
  stage?: string;
  region?: string;
  workloads?: { name: string; type: string; url?: string }[];
  databases?: { name: string; type: string; port?: number }[];
  logFile?: string;
  tokenFile?: string;
  sessionId?: string;
  /** Workloads that failed while dev mode started; a non-empty list means the start failed. */
  failedWorkloads?: { name: string; error: string; hints?: string[] }[];
  /** What dev mode decided on its own, such as deploying a table that a stream trigger reads. */
  notices?: string[];
};

/**
 * Parse AGENT_READY message from stdout.
 */
const parseAgentReady = (line: string): AgentReadyPayload | null => {
  const parseRawReady = (raw: string): AgentReadyPayload | null => {
    if (!raw.startsWith('AGENT_READY ')) return null;
    try {
      return JSON.parse(raw.slice('AGENT_READY '.length)) as AgentReadyPayload;
    } catch {
      return null;
    }
  };

  const rawReady = parseRawReady(line);
  if (rawReady) return rawReady;

  try {
    const parsed = JSON.parse(line);
    if (parsed?.source === 'stdout-raw' && typeof parsed?.message === 'string') {
      return parseRawReady(parsed.message.trim());
    }
  } catch {
    // Not JSONL, ignore.
  }

  return null;
};

type ChildResult = { ok: boolean; code: string; message: string; hints?: string[] };

const parseJsonlResult = (record: Record<string, unknown> | null): ChildResult | null => {
  if (record?.type !== 'result') return null;
  const data = record.data as { hints?: unknown } | undefined;
  const hints = Array.isArray(data?.hints) ? data.hints.filter((hint): hint is string => typeof hint === 'string') : [];
  return {
    ok: !!record.ok,
    code: typeof record.code === 'string' && record.code ? record.code : 'UNKNOWN_ERROR',
    message: typeof record.message === 'string' && record.message ? record.message : 'Child process failed',
    ...(hints.length ? { hints } : {})
  };
};

const parseJsonRecord = (line: string): Record<string, unknown> | null => {
  try {
    const parsed = JSON.parse(line);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
};

/** A record of the daemon's JSONL output that its parent passes on while the daemon starts. */
export type ForwardedChildRecord =
  | { type: 'event'; line: string; record: Record<string, unknown> }
  | { type: 'log'; line: string; record: Record<string, unknown> };

/**
 * The startup progress worth passing on: every tracked event (dev network, dev box, dev stack deploy with resource
 * counts, workloads and databases) and Stacktape's own messages. Raw stdout lines repeat what the events say, build
 * output stays in the session's log file, and the error display (the only log record with data) repeats the failed
 * result the parent reports itself.
 */
export const selectForwardedChildRecord = (line: string): ForwardedChildRecord | null => {
  const record = parseJsonRecord(line);
  if (!record) return null;
  if (record.type === 'event') return { type: 'event', line, record };
  if (
    record.type === 'log' &&
    typeof record.message === 'string' &&
    record.message.trim() &&
    record.source !== 'stdout-raw' &&
    record.source !== 'console' &&
    record.data === undefined
  ) {
    return { type: 'log', line, record };
  }
  return null;
};

/**
 * Detect if running as a compiled Bun binary (vs via `bun run script.ts`).
 * Compiled binaries have execPath pointing to the binary itself, not bun.
 */
const isCompiledBinary = (): boolean => {
  const execPath = process.execPath.toLowerCase();
  return !execPath.endsWith('bun') && !execPath.endsWith('bun.exe');
};

const DAEMON_PARENT_ONLY_ARGS = new Set(['agent', 'agentPort', 'agentChild']);

/**
 * The daemon's command line, rebuilt from the parsed arguments rather than copied from this process: the child starts
 * in another directory, so relative paths become absolute, and its internal flags go before `--`, where the parser reads
 * them. The custom arguments after `--` are passed on unchanged.
 */
export const buildDaemonChildArgs = ({
  explicitArgs,
  customArgs,
  agentPort,
  cwd,
  workingDir
}: {
  /** The arguments the user gave. Project settings are not among them; the child reads them from the config itself. */
  explicitArgs: Readonly<Record<string, unknown>>;
  customArgs: readonly string[];
  agentPort: number;
  /** Directory the parent was started in, which relative paths are resolved against. */
  cwd: string;
  /** Set when the child must find the project from another directory and the user did not pass `--cwd`. */
  workingDir?: string;
}): string[] => {
  const args: Record<string, unknown> = Object.fromEntries(
    Object.entries(explicitArgs).filter(([name, value]) => !DAEMON_PARENT_ONLY_ARGS.has(name) && value !== undefined)
  );
  const base = typeof args.currentWorkingDirectory === 'string' ? resolvePath(cwd, args.currentWorkingDirectory) : cwd;
  if (typeof args.currentWorkingDirectory === 'string') args.currentWorkingDirectory = base;
  else if (workingDir !== undefined) args.currentWorkingDirectory = workingDir;
  if (typeof args.configPath === 'string') args.configPath = resolvePath(base, args.configPath);
  const flags = Object.entries(args).flatMap(([name, value]) => {
    if (value === true) return [`--${name}`];
    if (value === false) return [`--${name}=false`];
    // `=` keeps a value that starts with a dash from being read as a flag.
    return (Array.isArray(value) ? value : [value]).map((item) => `--${name}=${String(item)}`);
  });
  return [
    'dev',
    ...flags,
    '--agentChild',
    `--agentPort=${agentPort}`,
    ...(customArgs.length ? ['--', ...customArgs] : [])
  ];
};

/** Custom arguments given after `--`, exactly as typed. */
export const getCustomArgsSuffix = (argv: readonly string[] = process.argv.slice(2)): string[] => {
  const separator = argv.indexOf('--');
  return separator < 0 ? [] : argv.slice(separator + 1);
};

/**
 * Reads what is appended to `filePath` and hands it to `onData` until the returned function is called. A daemon writes
 * its output to files rather than pipes: a pipe whose reader has exited makes every later write fail with `EPIPE`, also
 * the writes of the build tools the daemon starts with its own output.
 */
export const followFile = (
  filePath: string,
  onData: (text: string) => void,
  { intervalMs = 100 }: { intervalMs?: number } = {}
): (() => void) => {
  let fd: number | undefined;
  let position = 0;
  const buffer = Buffer.alloc(64 * 1024);
  const decoder = new StringDecoder('utf8');
  const read = () => {
    try {
      fd ??= openSync(filePath, 'r');
      for (;;) {
        const bytesRead = readSync(fd, buffer, 0, buffer.length, position);
        if (bytesRead <= 0) return;
        position += bytesRead;
        const text = decoder.write(buffer.subarray(0, bytesRead));
        if (text) onData(text);
      }
    } catch {
      // The file appears with the daemon; the next read tries again.
    }
  };
  const timer = setInterval(read, intervalMs);
  return () => {
    clearInterval(timer);
    read();
    if (fd !== undefined) closeSync(fd);
  };
};

/** How large a daemon output file grows before it is moved to `<file>.1` and starts again. */
const DAEMON_OUTPUT_FILE_MAX_BYTES = 5 * 1024 * 1024;

/**
 * Keeps the output file open as `fd` below `maxBytes`: a larger one is copied to `<path>.1` and emptied. Every writer
 * appends (see `spawnAgentDaemon`), so after the file is emptied their writes start at its beginning again, without a
 * gap. A line written between the copy and the truncation is lost.
 *
 * The file is emptied through a new handle opened by its path: Windows refuses to truncate through a handle opened for
 * appending (EPERM, in the process that opened it and in those that inherited it).
 */
export const rotateDaemonOutputFile = ({ fd, path, maxBytes }: { fd: number; path: string; maxBytes: number }) => {
  try {
    const stats = fstatSync(fd);
    if (!stats.isFile() || stats.size <= maxBytes) return;
    copyFileSync(path, `${path}.1`);
    truncateSync(path, 0);
  } catch {
    // The output files only help debugging; the session must not stop for them.
  }
};

/**
 * Bounds the daemon's output files. All of the daemon's output goes to them: its own (`console.*` under Bun writes to
 * the descriptor directly), and that of the builds and containers it starts, which inherit the descriptors. A long
 * `--watch` session would grow them without end; each is checked every `intervalMs` and kept below `maxBytes`, with the
 * previous part in `<file>.1`.
 */
export const capDaemonOutputFiles = ({
  maxBytes = DAEMON_OUTPUT_FILE_MAX_BYTES,
  intervalMs = 30_000
}: {
  maxBytes?: number;
  intervalMs?: number;
} = {}) => {
  const paths = process.env.STACKTAPE_AGENT_DAEMON === '1' && process.env.STACKTAPE_AGENT_DAEMON_OUTPUT_FILES;
  if (!paths) return () => {};
  const { stdout, stderr } = JSON.parse(paths) as { stdout: string; stderr: string };
  const files = [
    { fd: 1, path: stdout },
    { fd: 2, path: stderr }
  ];
  const check = () => {
    for (const file of files) rotateDaemonOutputFile({ ...file, maxBytes });
  };
  const timer = setInterval(check, intervalMs);
  timer.unref();
  // Only this start's files, once nobody reads them: another start's reader may not have opened its files yet.
  applicationManager.finalCleanUpHooks.push(async () => {
    for (const path of [stdout, stderr]) {
      for (const file of [path, `${path}.1`]) rmSync(file, { force: true });
    }
  });
  return () => clearInterval(timer);
};

/**
 * Spawn the dev agent as a background daemon process.
 *
 * The daemon's stdout and stderr are files (see `followFile`). This process reads them until the AGENT_READY message,
 * then lets go of the daemon and exits while the daemon keeps running. The daemon bounds their size from then on.
 *
 * Works on both Windows and Unix.
 */
export const spawnAgentDaemon = async (args: {
  explicitArgs: Readonly<Record<string, unknown>>;
  customArgs: readonly string[];
  agentPort: number;
  /** The port was chosen automatically, so the daemon may listen on another one if it was taken meanwhile. */
  automaticAgentPort?: boolean;
  timeoutMs?: number;
  /** Receives the daemon's startup progress until it is ready or fails. */
  onChildRecord?: (record: ForwardedChildRecord) => void;
  /** The process to start instead of this CLI's `dev` command; tests start a stand-in daemon. */
  command?: { executable: string; args: string[]; cwd: string };
}): Promise<DaemonSpawnResult> => {
  const {
    explicitArgs,
    customArgs,
    agentPort,
    automaticAgentPort = false,
    timeoutMs = 180000,
    onChildRecord,
    command
  } = args;
  const workingDir = globalStateManager.workingDir;

  // The development wrapper (`bun run scripts/dev.ts`) rebuilds the CLI from its process cwd, so a
  // wrapper-spawned child must start inside the CLI package and receive the project directory as an
  // argument instead. A compiled binary has no such constraint and keeps the plain cwd contract.
  const childCwd = isCompiledBinary() ? workingDir : dirname(dirname(process.argv[1]));
  const childArgs = buildDaemonChildArgs({
    explicitArgs,
    customArgs,
    agentPort,
    cwd: process.cwd(),
    ...(isCompiledBinary() ? {} : { workingDir })
  });

  // For compiled binary: spawn the binary directly with CLI args
  // For bun run: spawn bun with script path and args
  // Note: process.execPath is the actual executable path (not argv[0] which is "bun" for compiled binaries)
  const spawnArgs = isCompiledBinary() ? childArgs : [process.argv[1], ...childArgs];

  // r2mm dogfood: a start right after a `/stop` reused the stopping daemon's files on the same port. That daemon still
  // appended to them, and its final USER_INTERRUPTION result was read as the new daemon's failure. A ready daemon deletes
  // its own files when it exits (`capDaemonOutputFiles`).
  const startId = randomBytes(4).toString('hex');
  const outputFiles = {
    stdout: localStatePaths.devAgentDaemonOutputFile({ port: agentPort, startId, stream: 'stdout' }),
    stderr: localStatePaths.devAgentDaemonOutputFile({ port: agentPort, startId, stream: 'stderr' })
  };
  mkdirSync(dirname(outputFiles.stdout), { recursive: true, mode: 0o700 });
  // Emptied, then opened for appending: the daemon empties a file that grew too large while it and its children keep
  // writing to it (see `capDaemonOutputFiles`).
  for (const file of Object.values(outputFiles)) writeFileSync(file, '', { mode: 0o600 });
  const stdoutFd = openSync(outputFiles.stdout, 'a', 0o600);
  const stderrFd = openSync(outputFiles.stderr, 'a', 0o600);

  return new Promise((resolve) => {
    let child: ChildProcess;
    try {
      child = spawn(command?.executable ?? process.execPath, command?.args ?? spawnArgs, {
        detached: true,
        stdio: ['ignore', stdoutFd, stderrFd],
        env: {
          ...process.env,
          STACKTAPE_AGENT_DAEMON: '1',
          STACKTAPE_AGENT_PORT_AUTOMATIC: automaticAgentPort ? '1' : '0',
          STACKTAPE_AGENT_DAEMON_OUTPUT_FILES: JSON.stringify(outputFiles),
          STP_DISABLE_CONSOLE_INTERCEPT: 'true'
        },
        cwd: command?.cwd ?? childCwd
      });
    } finally {
      // The daemon has its own copies of the descriptors.
      closeSync(stdoutFd);
      closeSync(stderrFd);
    }

    if (!child.pid) {
      resolve({ success: false, error: 'Failed to spawn daemon process' });
      return;
    }

    const daemonPid = child.pid;
    let resolved = false;
    let stdoutBuffer = '';
    let stderrBuffer = '';
    const stopFollowing: Array<() => void> = [];

    const cleanup = () => {
      for (const stop of stopFollowing.splice(0)) stop();
      child.removeAllListeners();
      child.unref();
    };

    // An inactivity limit rather than a total deadline: a first run legitimately spends a long
    // time deploying the dev stack, and the daemon emits a progress heartbeat while it works.
    // Only a child that has gone completely silent for `timeoutMs` is treated as hung and reaped.
    const onTimeout = () => {
      if (!resolved) {
        resolved = true;
        cleanup();
        // A hung daemon may already hold the agent port and have started dev servers and containers; stop its whole
        // process tree, not only the daemon, so none of them outlives this failed start.
        killProcessTree(daemonPid, 'SIGTERM', () => {});
        resolve({
          success: false,
          error: `Daemon produced no output for ${timeoutMs / 1000}s and was treated as hung`
        });
      }
    };
    let timeout = setTimeout(onTimeout, timeoutMs);
    const resetInactivityTimeout = () => {
      if (resolved) return;
      clearTimeout(timeout);
      timeout = setTimeout(onTimeout, timeoutMs);
    };

    child.on('error', (err) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        cleanup();
        resolve({ success: false, error: `Failed to spawn daemon: ${err.message}` });
      }
    });

    child.on('exit', (code) => {
      if (!resolved) {
        // What the daemon wrote right before it exited may not have been read yet.
        for (const stop of stopFollowing.splice(0)) stop();
        if (resolved) return;
        resolved = true;
        clearTimeout(timeout);
        cleanup();
        const errMsg = stderrBuffer.trim().slice(0, 500) || `Process exited with code ${code}`;
        resolve({ success: false, error: `Daemon exited unexpectedly: ${errMsg}` });
      }
    });

    const onStdout = (text: string) => {
      if (resolved) return;
      resetInactivityTimeout();
      stdoutBuffer += text;

      // Check each line for AGENT_READY or a failed result, and pass the startup progress on
      const lines = stdoutBuffer.split('\n');
      for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i];
        const trimmedLine = line.trim();

        // Check for AGENT_READY signal
        const payload = parseAgentReady(trimmedLine);
        if (payload && !resolved) {
          resolved = true;
          clearTimeout(timeout);
          cleanup();
          resolve({
            success: true,
            port: payload.port,
            pid: daemonPid,
            readyPayload: payload
          });
          return;
        }

        if (trimmedLine && !trimmedLine.startsWith('AGENT_READY ') && !resolved) {
          const childResult = parseJsonlResult(parseJsonRecord(trimmedLine));
          if (childResult && !childResult.ok) {
            resolved = true;
            clearTimeout(timeout);
            cleanup();
            resolve({ success: false, error: `${childResult.code}: ${childResult.message}`, childResult });
            return;
          }
          const forwarded = onChildRecord && selectForwardedChildRecord(trimmedLine);
          if (forwarded) {
            try {
              onChildRecord(forwarded);
            } catch {
              // Progress output must never change the outcome of the start.
            }
          }
        }
      }

      // Keep only the last incomplete line in buffer
      stdoutBuffer = lines[lines.length - 1];
    };

    const onStderr = (text: string) => {
      if (resolved) return;
      resetInactivityTimeout();
      stderrBuffer += text;
      for (const line of text.split(/\r?\n/)) {
        if (line.trim()) {
          console.error(line);
        }
      }
    };

    stopFollowing.push(followFile(outputFiles.stdout, onStdout), followFile(outputFiles.stderr, onStderr));
  });
};

/**
 * What `dev --agent` reports once an agent is ready, whether it started one or found one running.
 * Includes logFile path so LLMs can use standard tools (tail, grep, jq) on the JSONL log, and the token file path
 * (never the token) so they can call the agent.
 */
export const buildAgentReadyPayload = (data: {
  port: number;
  projectName: string;
  stage: string;
  region: string;
  workloads: { name: string; type: string; url?: string }[];
  databases: { name: string; type: string; port?: number }[];
  logFile: string;
  sessionId?: string;
  failedWorkloads?: { name: string; error: string; hints?: string[] }[];
  notices?: string[];
}): AgentReadyPayload => ({
  port: data.port,
  projectName: data.projectName,
  stage: data.stage,
  region: data.region,
  workloads: data.workloads.map((w) => ({ name: w.name, type: w.type, url: w.url })),
  databases: data.databases.map((d) => ({ name: d.name, type: d.type, port: d.port })),
  logFile: data.logFile,
  tokenFile: localStatePaths.devAgentTokenFile({ port: data.port }),
  ...(data.sessionId ? { sessionId: data.sessionId } : {}),
  failedWorkloads: data.failedWorkloads ?? [],
  ...(data.notices?.length ? { notices: data.notices } : {})
});

/** The AGENT_READY line that signals the daemon finished starting. */
export const buildAgentReadyMessage = (data: Parameters<typeof buildAgentReadyPayload>[0]): string =>
  `AGENT_READY ${JSON.stringify(buildAgentReadyPayload(data))}`;
