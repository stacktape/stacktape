import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import killProcessTree from 'tree-kill';

/** How long a process gets to end on SIGTERM before SIGKILL: a timed-out script must stop writing soon. */
const STOP_GRACE_MS = 500;
const KILL_WAIT_MS = 1000;
const POLL_MS = 50;

type ProcessEntry = { pid: number; parentPid: number; groupId: number; zombie: boolean };

/** `/proc/<pid>/stat`: the command name in parentheses can hold spaces, so the fields are read after its last `)`. */
const readProcEntry = (pid: number): ProcessEntry | undefined => {
  try {
    const stat = readFileSync(`/proc/${pid}/stat`, 'utf8');
    const [state, parentPid, groupId] = stat.slice(stat.lastIndexOf(')') + 2).split(' ');
    return { pid, parentPid: Number(parentPid), groupId: Number(groupId), zombie: state === 'Z' };
  } catch {
    return undefined;
  }
};

/** Every process of this user and others that the system lets this process see. */
const listProcesses = (): ProcessEntry[] => {
  if (process.platform === 'linux') {
    return readdirSync('/proc')
      .filter((name) => /^\d+$/.test(name))
      .map((name) => readProcEntry(Number(name)))
      .filter((entry): entry is ProcessEntry => Boolean(entry));
  }
  const listed = spawnSync('ps', ['-A', '-o', 'pid=,ppid=,pgid=,stat='], { encoding: 'utf8' });
  return (listed.stdout ?? '')
    .split('\n')
    .map((line) => line.trim().split(/\s+/))
    .filter((fields) => fields.length >= 4 && /^\d+$/.test(fields[0]!))
    .map(([pid, parentPid, groupId, state]) => ({
      pid: Number(pid),
      parentPid: Number(parentPid),
      groupId: Number(groupId),
      zombie: state!.startsWith('Z')
    }));
};

/** Adds to `tracked` every listed process below one it holds, and with `groupId` every member of that group. */
const collect = (tracked: Set<number>, processes: ProcessEntry[], groupId?: number) => {
  for (let added = true; added;) {
    added = false;
    for (const entry of processes) {
      if (tracked.has(entry.pid)) continue;
      if (tracked.has(entry.parentPid) || entry.groupId === groupId) {
        tracked.add(entry.pid);
        added = true;
      }
    }
  }
};

const signal = (pid: number, name: NodeJS.Signals) => {
  try {
    process.kill(pid, name);
  } catch {
    // It has exited.
  }
};

/** The tracked processes that still run; a zombie has exited and waits only for its parent. */
const findRunning = (tracked: Set<number>, processes: ProcessEntry[]) => {
  const listed = new Map(processes.map((entry) => [entry.pid, entry]));
  return [...tracked].filter((pid) => {
    const entry = listed.get(pid);
    return entry !== undefined && !entry.zombie;
  });
};

export type ProcessTreeStopResult = { stopped: boolean; survivingPids: number[] };

/**
 * Stops `pid` and every process below it, SIGTERM first and SIGKILL after a short grace. The process table is read
 * before any signal, so a descendant that left the group with `setsid()` is still known by its parent; on POSIX every
 * member of the group `pid` leads (when it was started detached) counts too, which also holds processes whose parent
 * already exited. Processes started during the grace are added as they appear. `stopped` is true only once no tracked
 * process runs; otherwise `survivingPids` lists them. On Windows, `taskkill /T` stops the tree and only `pid` itself
 * can be checked.
 */
export const stopProcessTree = async (
  pid: number,
  { processGroup }: { processGroup: boolean }
): Promise<ProcessTreeStopResult> => {
  if (process.platform === 'win32') {
    await new Promise<void>((resolveKill) => killProcessTree(pid, 'SIGKILL', () => resolveKill()));
    const running = (() => {
      try {
        process.kill(pid, 0);
        return true;
      } catch {
        return false;
      }
    })();
    return { stopped: !running, survivingPids: running ? [pid] : [] };
  }

  const groupId = processGroup ? pid : undefined;
  const tracked = new Set([pid]);
  collect(tracked, listProcesses(), groupId);
  let running: number[] = [];
  for (const [name, waitMs] of [
    ['SIGTERM', STOP_GRACE_MS],
    ['SIGKILL', KILL_WAIT_MS]
  ] as const) {
    const deadline = Date.now() + waitMs;
    let processes = listProcesses();
    collect(tracked, processes, groupId);
    running = findRunning(tracked, processes);
    for (const target of running) signal(target, name);
    while (running.length && Date.now() < deadline) {
      await new Promise((resolveWait) => setTimeout(resolveWait, POLL_MS));
      processes = listProcesses();
      const known = tracked.size;
      collect(tracked, processes, groupId);
      running = findRunning(tracked, processes);
      // A process started after the signal was sent gets it too.
      if (tracked.size > known) for (const target of running) signal(target, name);
    }
    if (!running.length) return { stopped: true, survivingPids: [] };
  }
  return { stopped: false, survivingPids: running };
};

/**
 * Sends SIGTERM to the group `pid` leads when this process exits while the group still runs. A detached group does not
 * receive the terminal's Ctrl+C, so this keeps it from outliving the CLI. Returns the function that removes the hook.
 */
export const stopProcessGroupOnExit = (pid: number): (() => void) => {
  if (process.platform === 'win32') return () => {};
  const stop = () => signal(-pid, 'SIGTERM');
  process.once('exit', stop);
  return () => process.removeListener('exit', stop);
};
