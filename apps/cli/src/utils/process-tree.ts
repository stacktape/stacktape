import killProcessTree from 'tree-kill';

const STOP_GRACE_MS = 2000;
const KILL_WAIT_MS = 1000;

const signalDescendants = (pid: number, signal: NodeJS.Signals) =>
  new Promise<void>((resolveSignal) => {
    killProcessTree(pid, signal, () => resolveSignal());
  });

const signalGroup = (pid: number, signal: NodeJS.Signals) => {
  try {
    process.kill(-pid, signal);
  } catch {
    // The group has no process left.
  }
};

/** Whether `pid` runs, or, with a negative pid, whether a process of that group still runs. */
const isRunning = (pid: number) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'EPERM';
  }
};

const waitUntilStopped = async (running: () => boolean, timeoutMs: number): Promise<boolean> => {
  const deadline = Date.now() + timeoutMs;
  while (running()) {
    if (Date.now() >= deadline) return false;
    await new Promise((resolveWait) => setTimeout(resolveWait, 50));
  }
  return true;
};

/**
 * Stops `pid` and every process below it, first with SIGTERM and then with SIGKILL: its descendants (`taskkill /T` on
 * Windows), and on POSIX every process of the group `pid` leads when it was started detached. The group also holds
 * processes whose parent already exited. Returns whether nothing of it runs any more; on Windows, only `pid` itself
 * can be checked.
 */
export const stopProcessTree = async (pid: number, { processGroup }: { processGroup: boolean }): Promise<boolean> => {
  const usesGroup = processGroup && process.platform !== 'win32';
  const running = () => isRunning(usesGroup ? -pid : pid);
  for (const [signal, waitMs] of [
    ['SIGTERM', STOP_GRACE_MS],
    ['SIGKILL', KILL_WAIT_MS]
  ] as const) {
    // Descendants first: once the parent is gone, the ones in other groups can no longer be found.
    await signalDescendants(pid, signal);
    if (usesGroup) signalGroup(pid, signal);
    if (await waitUntilStopped(running, waitMs)) return true;
  }
  return false;
};

/**
 * Sends SIGTERM to the group `pid` leads when this process exits while the group still runs. A detached group does not
 * receive the terminal's Ctrl+C, so this keeps it from outliving the CLI. Returns the function that removes the hook.
 */
export const stopProcessGroupOnExit = (pid: number): (() => void) => {
  if (process.platform === 'win32') return () => {};
  const stop = () => signalGroup(pid, 'SIGTERM');
  process.once('exit', stop);
  return () => process.removeListener('exit', stop);
};
