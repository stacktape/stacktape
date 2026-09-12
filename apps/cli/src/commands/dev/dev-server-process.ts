import type { ChildProcess } from 'node:child_process';
import killProcessTree from 'tree-kill';

export const terminateDevServerProcess = async (child: ChildProcess): Promise<void> => {
  if (!child.pid || child.exitCode !== null || child.signalCode !== null) return;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let onClose = () => {};
  const closed = new Promise<void>((resolveClosed, reject) => {
    onClose = resolveClosed;
    child.once('close', onClose);
    timer = setTimeout(() => reject(new Error('The dev server process tree did not close.')), 3_000);
  });
  try {
    // Package managers and Turbo can start watchers in separate process groups. Enumerate the whole
    // tree before signalling its parent; killing the shell first loses those descendants. Dev cleanup
    // already used forced termination, but its assumed process group did not belong to the shell.
    await Promise.all([
      closed,
      new Promise<void>((resolveKill, reject) => {
        killProcessTree(child.pid!, 'SIGKILL', (error) => (error ? reject(error) : resolveKill()));
      })
    ]);
  } finally {
    clearTimeout(timer);
    child.removeListener('close', onClose);
  }
};
