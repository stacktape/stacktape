/**
 * End a child process without taking the CLI down with it.
 *
 * The hazard this exists for has already fired once: on a Windows console, `child.kill()` can be
 * delivered as a CTRL_C event to the *whole console process group* — this process included. The
 * wizard's own SIGINT handler then runs its clean shutdown, and the session disappears mid-use with
 * exit code 0 and not a word of explanation. It took a real end-to-end run to catch.
 *
 * So: children that will exit on their own are simply not killed (unref and walk away), and
 * children that must actually die — a hung agent burning someone's subscription — die through
 * `taskkill`, which terminates the process tree without raising any console event. Elsewhere a
 * plain signal is fine.
 */

import { spawn, type ChildProcess } from 'node:child_process';

export const terminateChild = (child: ChildProcess): void => {
  if (child.pid === undefined || child.exitCode !== null || child.killed) return;
  if (process.platform === 'win32') {
    // `/t` takes the tree with it — agent CLIs spawn their own helpers — and `/f` means it is not
    // a suggestion. `taskkill` failing (already exited, permissions) changes nothing worth handling.
    spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore' }).unref();
    return;
  }
  child.kill('SIGTERM');
};
