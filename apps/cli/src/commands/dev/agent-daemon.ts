import { spawn, type ChildProcess } from 'node:child_process';
import killProcessTree from 'tree-kill';
import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'fs-extra';
import { dirname, isAbsolute, join, resolve as resolvePath } from 'node:path';
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
  /** File holding the session token the agent requires on every request. */
  tokenFile?: string;
};

const readAgentToken = (tokenFile: string | undefined): string | undefined => {
  if (!tokenFile) return undefined;
  try {
    return readFileSync(tokenFile, 'utf-8').trim() || undefined;
  } catch {
    return undefined;
  }
};

/**
 * Calls a dev agent the way every local client must: on loopback, with the session token from its token file and, for
 * POST, a JSON content type. Without a readable token file the request goes out unauthenticated and the agent refuses
 * it with 401.
 */
export const requestDevAgent = (
  agent: { port: number; tokenFile?: string },
  path: string,
  { method = 'GET', timeoutMs }: { method?: 'GET' | 'POST'; timeoutMs: number }
): Promise<Response> => {
  const token = readAgentToken(agent.tokenFile);
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

export const writeAgentLockFile = (data: AgentLockFile): void => {
  const lockPath = getLockFilePath(data.projectName, data.stage);
  const dir = dirname(lockPath);

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  writeFileSync(lockPath, JSON.stringify(data, null, 2));
};

export const deleteAgentLockFile = (projectName?: string, stage?: string): void => {
  const lockPath = getLockFilePath(projectName, stage);
  if (existsSync(lockPath)) {
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
 * Check if an agent is already running and healthy for the current project+stage.
 * Returns the lock file data if running, null otherwise.
 */
export const getRunningAgent = async (projectName?: string, stage?: string): Promise<AgentLockFile | null> => {
  const lockFile = readAgentLockFile(projectName, stage);
  if (!lockFile) return null;

  // Check if process is still running
  if (!isProcessRunning(lockFile.pid)) {
    deleteAgentLockFile(lockFile.projectName, lockFile.stage);
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
      deleteAgentLockFile(lockFile.projectName, lockFile.stage);
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

/**
 * Stop a running agent by sending POST /stop and waiting for exit.
 */
export const stopRunningAgent = async (lockFile: AgentLockFile): Promise<boolean> => {
  const hasPid = lockFile.pid > 0;
  const deleteLock = () => deleteAgentLockFile(lockFile.projectName, lockFile.stage);
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
  /** Workloads that failed while dev mode started; a non-empty list means the start failed. */
  failedWorkloads?: { name: string; error: string }[];
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

const parseJsonlResult = (line: string): { ok: boolean; code: string; message: string } | null => {
  try {
    const parsed = JSON.parse(line);
    if (parsed?.type === 'result') {
      return {
        ok: !!parsed.ok,
        code: parsed.code || 'UNKNOWN_ERROR',
        message: parsed.message || 'Child process failed'
      };
    }
    return null;
  } catch {
    return null;
  }
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
 * Spawn the dev agent as a background daemon process.
 *
 * Uses detached spawn with piped stdout. Waits for AGENT_READY message,
 * then detaches and lets parent exit while child keeps running.
 *
 * Works on both Windows and Unix.
 */
export const spawnAgentDaemon = async (args: {
  explicitArgs: Readonly<Record<string, unknown>>;
  customArgs: readonly string[];
  agentPort: number;
  timeoutMs?: number;
}): Promise<DaemonSpawnResult> => {
  const { explicitArgs, customArgs, agentPort, timeoutMs = 180000 } = args;
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

  return new Promise((resolve) => {
    const child: ChildProcess = spawn(process.execPath, spawnArgs, {
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, STACKTAPE_AGENT_DAEMON: '1', STP_DISABLE_CONSOLE_INTERCEPT: 'true' },
      cwd: childCwd
    });

    if (!child.pid) {
      resolve({ success: false, error: 'Failed to spawn daemon process' });
      return;
    }

    const daemonPid = child.pid;
    let resolved = false;
    let stdoutBuffer = '';
    let stderrBuffer = '';

    const cleanup = () => {
      child.stdout?.removeAllListeners();
      child.stderr?.removeAllListeners();
      child.removeAllListeners();
      // Destroy streams and unref to allow parent to exit
      child.stdout?.destroy();
      child.stderr?.destroy();
      child.unref();
    };

    // An inactivity limit rather than a total deadline: a first run legitimately spends a long
    // time deploying the dev stack, and the daemon emits AGENT_STARTING heartbeats while it works.
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
        resolved = true;
        clearTimeout(timeout);
        cleanup();
        const errMsg = stderrBuffer.trim().slice(0, 500) || `Process exited with code ${code}`;
        resolve({ success: false, error: `Daemon exited unexpectedly: ${errMsg}` });
      }
    });

    child.stdout?.on('data', (data: Buffer) => {
      resetInactivityTimeout();
      stdoutBuffer += data.toString();

      // Check each line for AGENT_READY and print progress
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

        if (trimmedLine && !trimmedLine.startsWith('AGENT_READY ')) {
          const childResult = parseJsonlResult(trimmedLine);
          if (childResult && !childResult.ok && !resolved) {
            resolved = true;
            clearTimeout(timeout);
            cleanup();
            resolve({ success: false, error: `${childResult.code}: ${childResult.message}` });
            return;
          }
        }
      }

      // Keep only the last incomplete line in buffer
      stdoutBuffer = lines[lines.length - 1];
    });

    child.stderr?.on('data', (data: Buffer) => {
      resetInactivityTimeout();
      const text = data.toString();
      stderrBuffer += text;
      for (const line of text.split(/\r?\n/)) {
        if (line.trim()) {
          console.error(line);
        }
      }
    });
  });
};

/**
 * Build the AGENT_READY message that signals the daemon finished starting.
 * Includes logFile path so LLMs can use standard tools (tail, grep, jq) on the JSONL log, and the token file path
 * (never the token) so they can call the agent.
 */
export const buildAgentReadyMessage = (data: {
  port: number;
  projectName: string;
  stage: string;
  region: string;
  workloads: { name: string; type: string; url?: string }[];
  databases: { name: string; type: string; port?: number }[];
  logFile: string;
  tokenFile?: string;
  failedWorkloads?: { name: string; error: string }[];
}): string => {
  const payload: AgentReadyPayload = {
    port: data.port,
    projectName: data.projectName,
    stage: data.stage,
    region: data.region,
    workloads: data.workloads.map((w) => ({ name: w.name, type: w.type, url: w.url })),
    databases: data.databases.map((d) => ({ name: d.name, type: d.type, port: d.port })),
    logFile: data.logFile,
    tokenFile: data.tokenFile,
    failedWorkloads: data.failedWorkloads ?? []
  };

  return `AGENT_READY ${JSON.stringify(payload)}`;
};
