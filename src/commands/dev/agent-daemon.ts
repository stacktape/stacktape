import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'fs-extra';
import { dirname, isAbsolute, join } from 'node:path';
import { globalStateManager } from '@application-services/global-state-manager';

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
  return join(baseDir, '.stacktape', 'dev-agents');
};

/**
 * Get lock file path for a specific project+stage combination.
 * Format: .stacktape/dev-agents/{projectName}-{stage}.json
 */
const getLockFilePath = (projectName?: string, stage?: string): string => {
  // Use args directly since targetStack may not be initialized yet
  const project =
    projectName ?? globalStateManager.targetStack?.projectName ?? globalStateManager.args.projectName ?? 'unknown';
  const stg = stage ?? globalStateManager.targetStack?.stage ?? globalStateManager.stage ?? 'unknown';
  // Sanitize for filename (replace invalid chars)
  const safeName = `${project}-${stg}`.replace(/[^a-zA-Z0-9-_]/g, '_');
  return join(getLockDir(), `${safeName}.json`);
};

export const readAgentLockFile = (projectName?: string, stage?: string): AgentLockFile | null => {
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
export const readAllAgentLockFiles = (): AgentLockFile[] => {
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
export const isProcessRunning = (pid: number): boolean => {
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
    const response = await fetch(`http://localhost:${lockFile.port}/health`, {
      signal: AbortSignal.timeout(2000)
    });
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
      const response = await fetch(`http://localhost:${lockFile.port}/health`, {
        signal: AbortSignal.timeout(2000)
      });
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

  try {
    await fetch(`http://localhost:${lockFile.port}/stop`, {
      method: 'POST',
      signal: AbortSignal.timeout(5000)
    });

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

      // Force kill if still running
      try {
        process.kill(lockFile.pid, 'SIGKILL');
      } catch {
        // Process might have exited
      }
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
        process.kill(lockFile.pid, 'SIGKILL');
        deleteLock();
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }
};

export type DaemonSpawnResult = {
  success: boolean;
  port?: number;
  pid?: number;
  error?: string;
  readyPayload?: AgentReadyPayload;
};

export type AgentReadyPayload = {
  port: number;
  projectName: string;
  stage?: string;
  region?: string;
  workloads?: { name: string; type: string; url?: string }[];
  databases?: { name: string; type: string; port?: number }[];
  logFile?: string;
};

/**
 * Parse AGENT_READY message from stdout.
 */
const parseAgentReady = (line: string): AgentReadyPayload | null => {
  if (!line.startsWith('AGENT_READY ')) return null;
  try {
    return JSON.parse(line.slice('AGENT_READY '.length)) as AgentReadyPayload;
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

/**
 * Spawn the dev agent as a background daemon process.
 *
 * Uses detached spawn with piped stdout. Waits for AGENT_READY message,
 * then detaches and lets parent exit while child keeps running.
 *
 * Works on both Windows and Unix.
 */
export const spawnAgentDaemon = async (args: {
  originalArgs: string[];
  agentPort: number;
  timeoutMs?: number;
}): Promise<DaemonSpawnResult> => {
  const { originalArgs, agentPort, timeoutMs = 180000 } = args;

  const childArgs = [...originalArgs, '--agent-child', '--agentPort', String(agentPort)];
  const workingDir = globalStateManager.workingDir;

  // For compiled binary: spawn the binary directly with CLI args
  // For bun run: spawn bun with script path and args
  // Note: process.execPath is the actual executable path (not argv[0] which is "bun" for compiled binaries)
  const spawnArgs = isCompiledBinary() ? childArgs : [process.argv[1], ...childArgs];

  return new Promise((resolve) => {
    const child: ChildProcess = spawn(process.execPath, spawnArgs, {
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, STACKTAPE_AGENT_DAEMON: '1' },
      cwd: workingDir
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

    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        cleanup();
        // Kill the daemon on timeout
        try {
          process.kill(daemonPid, 'SIGTERM');
        } catch {
          // Ignore
        }
        resolve({
          success: false,
          error: `Daemon did not become ready within ${timeoutMs / 1000}s`
        });
      }
    }, timeoutMs);

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

        // Print non-empty lines to show progress (skip AGENT_READY line itself)
        if (trimmedLine && !trimmedLine.startsWith('AGENT_READY ')) {
          console.log(line);
        }
      }

      // Keep only the last incomplete line in buffer
      stdoutBuffer = lines[lines.length - 1];
    });

    child.stderr?.on('data', (data: Buffer) => {
      const text = data.toString();
      stderrBuffer += text;
      // Print stderr immediately so errors are visible
      process.stderr.write(text);
    });
  });
};

/**
 * Build the AGENT_READY message that signals the daemon is ready.
 * Includes logFile path so LLMs can use standard tools (tail, grep, jq) on the JSONL log.
 */
export const buildAgentReadyMessage = (data: {
  port: number;
  projectName: string;
  stage: string;
  region: string;
  workloads: { name: string; type: string; url?: string }[];
  databases: { name: string; type: string; port?: number }[];
  logFile: string;
}): string => {
  const payload = {
    port: data.port,
    projectName: data.projectName,
    stage: data.stage,
    region: data.region,
    workloads: data.workloads.map((w) => ({ name: w.name, type: w.type, url: w.url })),
    databases: data.databases.map((d) => ({ name: d.name, type: d.type, port: d.port })),
    logFile: data.logFile
  };

  return `AGENT_READY ${JSON.stringify(payload)}`;
};
