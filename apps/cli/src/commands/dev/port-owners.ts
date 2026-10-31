/**
 * Which process receives the connections a client makes to a local port. A port that accepts connections is not
 * necessarily served by the program dev mode started: on Windows another program can listen on `127.0.0.1` and `::1`
 * of a port whose wildcard address a dev server holds, and then receives every loopback request for it (r2bd2).
 */
import { execFile } from 'node:child_process';
import { readdir, readFile, readlink } from 'node:fs/promises';
import { promisify } from 'node:util';
import { normalizeAddress, parseProcNetListeners } from '@utils/ports';
import { acceptsTcpConnection } from './port-utils';

const execFileAsync = promisify(execFile);

/** A TCP listener on a local port: its address as written by `normalizeAddress` and its process, when known. */
export type PortListener = { address: string; pid?: number };

/** The listeners of a port and the processes of the tree that dev mode started, or `undefined` where unknown. */
type PortInspection = { listeners: PortListener[]; ownPids: Set<number> };

/** The loopback addresses a local client reaches a server on; `localhost` resolves to either. */
export const LOOPBACK_HOSTS = ['127.0.0.1', '::1'] as const;
export type LoopbackHost = (typeof LOOPBACK_HOSTS)[number];

/**
 * The listener that receives a connection to `host`: one on that exact address wins over a wildcard one, on Linux,
 * macOS and Windows alike. Without an IPv4 listener, a dual-stack `::` listener takes IPv4 connections too.
 */
export const findLoopbackOwner = (listeners: PortListener[], host: LoopbackHost): PortListener | undefined => {
  const exact = listeners.find(({ address }) => address === host);
  if (exact) return exact;
  if (host === '::1') return listeners.find(({ address }) => address === '::');
  return listeners.find(({ address }) => address === '0.0.0.0') ?? listeners.find(({ address }) => address === '::');
};

export type LoopbackRoute =
  /** The server dev mode started receives connections to `host`. */
  | { state: 'own'; host: LoopbackHost }
  /** Every loopback address of the port leads to another program, so no local client can reach the server. */
  | { state: 'taken'; owners: { host: LoopbackHost; pid?: number }[] }
  /** The server does not listen yet on an address that leads to it; another program may hold some of them. */
  | { state: 'pending' };

/**
 * Where to reach the server whose processes are `ownPids` on a port: the first of `acceptingHosts` whose connections
 * it receives. `loopbackHosts` are the loopback addresses this machine has.
 */
export const resolveLoopbackRoute = ({
  listeners,
  ownPids,
  acceptingHosts,
  loopbackHosts = LOOPBACK_HOSTS
}: {
  listeners: PortListener[];
  ownPids: Set<number>;
  acceptingHosts: readonly LoopbackHost[];
  loopbackHosts?: readonly LoopbackHost[];
}): LoopbackRoute => {
  const isOwn = (listener: PortListener | undefined) => listener?.pid !== undefined && ownPids.has(listener.pid);
  const host = acceptingHosts.find((candidate) => isOwn(findLoopbackOwner(listeners, candidate)));
  if (host) return { state: 'own', host };
  const owners = loopbackHosts.map((candidate) => ({
    host: candidate,
    owner: findLoopbackOwner(listeners, candidate)
  }));
  if (owners.every(({ owner }) => owner && !isOwn(owner))) {
    return {
      state: 'taken',
      owners: owners.map(({ host: ownerHost, owner }) => ({ host: ownerHost, pid: owner!.pid }))
    };
  }
  return { state: 'pending' };
};

/** `rootPid` and every process below it, from `[pid, parentPid]` pairs. */
export const collectProcessTree = (rootPid: number, processes: Iterable<[number, number]>): Set<number> => {
  const children = new Map<number, number[]>();
  for (const [pid, parentPid] of processes) {
    if (pid === parentPid) continue;
    children.set(parentPid, [...(children.get(parentPid) ?? []), pid]);
  }
  const tree = new Set([rootPid]);
  const queue = [rootPid];
  while (queue.length) {
    for (const child of children.get(queue.shift()!) ?? []) {
      if (!tree.has(child)) {
        tree.add(child);
        queue.push(child);
      }
    }
  }
  return tree;
};

const inspectLinux = async (port: number, rootPid: number): Promise<PortInspection> => {
  const sockets = (
    await Promise.all(['/proc/net/tcp', '/proc/net/tcp6'].map((path) => readFile(path, 'utf8').catch(() => '')))
  ).flatMap((text) => parseProcNetListeners(text).filter((listener) => listener.port === port));
  const pids = (await readdir('/proc')).filter((entry) => /^\d+$/.test(entry)).map(Number);
  const processes: [number, number][] = [];
  const socketOwners = new Map<string, number>();
  const wanted = new Set(sockets.map(({ inode }) => `socket:[${inode}]`));
  await Promise.all(
    pids.map(async (pid) => {
      // The command name in parentheses can hold spaces; the parent is the second field after its last `)`.
      const stat = await readFile(`/proc/${pid}/stat`, 'utf8').catch(() => '');
      const parentPid = Number(stat.slice(stat.lastIndexOf(')') + 2).split(' ')[1]);
      if (Number.isInteger(parentPid)) processes.push([pid, parentPid]);
      if (!wanted.size) return;
      // Another user's descriptors are unreadable: its sockets stay without an owner, which is not this session.
      const descriptors = await readdir(`/proc/${pid}/fd`).catch(() => [] as string[]);
      for (const descriptor of descriptors) {
        const target = await readlink(`/proc/${pid}/fd/${descriptor}`).catch(() => '');
        if (wanted.has(target)) socketOwners.set(target, pid);
      }
    })
  );
  return {
    listeners: sockets.map(({ address, inode }) => ({ address, pid: socketOwners.get(`socket:[${inode}]`) })),
    ownPids: collectProcessTree(rootPid, processes)
  };
};

/** `lsof -F ptn` output: a `p<pid>` line starts a process, `t<IPv4|IPv6>` and `n<address:port>` describe each socket. */
export const parseLsofListeners = (text: string): PortListener[] => {
  const listeners: PortListener[] = [];
  let pid: number | undefined;
  let family = '';
  for (const line of text.split('\n')) {
    const value = line.slice(1).trim();
    if (line.startsWith('p')) pid = Number(value);
    else if (line.startsWith('t')) family = value;
    else if (line.startsWith('n')) {
      const address = normalizeAddress(value.slice(0, value.lastIndexOf(':')));
      listeners.push({ address: address === '*' ? (family === 'IPv6' ? '::' : '0.0.0.0') : address, pid });
    }
  }
  return listeners;
};

const inspectMacos = async (port: number, rootPid: number): Promise<PortInspection> => {
  const [lsof, ps] = await Promise.all([
    // lsof exits with 1 when nothing matches.
    execFileAsync('lsof', ['-nP', '-a', `-iTCP:${port}`, '-sTCP:LISTEN', '-F', 'ptn'], { timeout: 10_000 }).catch(
      (error: { stdout?: string; code?: number }) => {
        if (error.code === 1) return { stdout: error.stdout ?? '' };
        throw error;
      }
    ),
    execFileAsync('ps', ['-A', '-o', 'pid=,ppid='], { timeout: 10_000 })
  ]);
  return { listeners: parseLsofListeners(lsof.stdout), ownPids: collectProcessTree(rootPid, parsePidPairs(ps.stdout)) };
};

/** Lines of two numbers, a process and its parent. */
const parsePidPairs = (text: string): [number, number][] =>
  text
    .split('\n')
    .map((line) => line.trim().split(/\s+/).map(Number))
    .filter((pair): pair is [number, number] => pair.length === 2 && pair.every(Number.isInteger));

/**
 * One PowerShell run lists the port's listeners (`L <address> <pid>`) and every process with its parent
 * (`P <pid> <parent>`). Get-NetTCPConnection names addresses the same way in every Windows language, unlike netstat's
 * state column.
 */
const windowsInspectionScript = (port: number) =>
  [
    "$ErrorActionPreference = 'Stop'",
    `Get-NetTCPConnection -State Listen -LocalPort ${port} -ErrorAction SilentlyContinue | ForEach-Object { "L $($_.LocalAddress) $($_.OwningProcess)" }`,
    'Get-CimInstance Win32_Process -Property ProcessId,ParentProcessId | ForEach-Object { "P $($_.ProcessId) $($_.ParentProcessId)" }'
  ].join('\n');

export const parseWindowsInspection = (text: string, rootPid: number): PortInspection => {
  const listeners: PortListener[] = [];
  const processes: [number, number][] = [];
  for (const line of text.split(/\r?\n/)) {
    const [kind, first, second] = line.trim().split(/\s+/);
    if (kind === 'L' && first && second) listeners.push({ address: normalizeAddress(first), pid: Number(second) });
    if (kind === 'P' && Number.isInteger(Number(first)) && Number.isInteger(Number(second))) {
      processes.push([Number(first), Number(second)]);
    }
  }
  return { listeners, ownPids: collectProcessTree(rootPid, processes) };
};

const inspectWindows = async (port: number, rootPid: number): Promise<PortInspection> => {
  const encoded = Buffer.from(windowsInspectionScript(port), 'utf16le').toString('base64');
  const { stdout } = await execFileAsync(
    'powershell.exe',
    ['-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', encoded],
    { timeout: 20_000, windowsHide: true }
  );
  return parseWindowsInspection(stdout, rootPid);
};

/**
 * The listeners of `port` and the processes of the tree under `rootPid`, or `undefined` when this system cannot tell
 * (a missing tool, a restricted `/proc`). Callers then fall back to accepting any listener.
 */
export const inspectPort = async (port: number, rootPid: number): Promise<PortInspection | undefined> => {
  try {
    if (process.platform === 'linux') return await inspectLinux(port, rootPid);
    if (process.platform === 'darwin') return await inspectMacos(port, rootPid);
    if (process.platform === 'win32') return await inspectWindows(port, rootPid);
  } catch {
    // Unknown: the caller treats an accepted connection as the server's, as before ownership was checked.
  }
  return undefined;
};

/** The loopback addresses this machine has: `::1` is missing where IPv6 is switched off. */
let loopbackHosts: Promise<LoopbackHost[]> | undefined;
const getLoopbackHosts = () =>
  (loopbackHosts ??= import('node:net').then(
    ({ createServer }) =>
      new Promise<LoopbackHost[]>((resolve) => {
        const server = createServer();
        server.once('error', () => resolve(['127.0.0.1']));
        server.listen(0, '::1', () => server.close(() => resolve([...LOOPBACK_HOSTS])));
      })
  ));

/**
 * Waits until the server under `rootPid` receives the connections a local client makes to its port, and reports the
 * loopback address that leads to it. Reports `taken` when another program holds every loopback address of the port.
 * Where the system does not say who listens, the first loopback address that accepts a connection counts.
 */
export const waitForOwnListener = async ({
  port,
  rootPid,
  timeoutMs,
  shouldStop = () => false,
  pollIntervalMs = 200,
  inspect = inspectPort
}: {
  /** The port, or a function that reads it at each attempt when the program can still move to another one. */
  port: number | (() => number);
  rootPid: number;
  timeoutMs: number;
  shouldStop?: () => boolean;
  pollIntervalMs?: number;
  inspect?: typeof inspectPort;
}): Promise<
  | { result: 'ready'; host: LoopbackHost }
  | { result: 'taken'; port: number; owners: { host: LoopbackHost; pid?: number }[] }
  | { result: 'timeout' | 'stopped' }
> => {
  const deadline = Date.now() + timeoutMs;
  const hosts = await getLoopbackHosts();
  while (Date.now() < deadline) {
    if (shouldStop()) return { result: 'stopped' };
    const currentPort = typeof port === 'number' ? port : port();
    const accepted = await Promise.all(hosts.map((host) => acceptsTcpConnection({ port: currentPort, host })));
    const acceptingHosts = hosts.filter((_, index) => accepted[index]);
    if (acceptingHosts.length) {
      const inspection = await inspect(currentPort, rootPid);
      if (shouldStop()) return { result: 'stopped' };
      if (!inspection) return { result: 'ready', host: acceptingHosts[0]! };
      const route = resolveLoopbackRoute({ ...inspection, acceptingHosts, loopbackHosts: hosts });
      if (route.state === 'own') return { result: 'ready', host: route.host };
      if (route.state === 'taken') return { result: 'taken', port: currentPort, owners: route.owners };
    }
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }
  return { result: shouldStop() ? 'stopped' : 'timeout' };
};

/** The `PORT_TAKEN_BY_OTHER_PROCESS` explanation: which program holds which loopback address of the port. */
export const describePortTaken = ({
  port,
  owners,
  workload
}: {
  port: number;
  owners: { host: LoopbackHost; pid?: number }[];
  workload: string;
}) => {
  const pids = [...new Set(owners.map(({ pid }) => pid).filter((pid) => pid !== undefined))];
  const program = pids.length ? `Another program (process ${pids.join(', ')})` : 'Another program';
  return `PORT_TAKEN_BY_OTHER_PROCESS: ${program} listens on port ${port} at ${owners
    .map(({ host }) => host)
    .join(' and ')}, so local requests to that port do not reach ${workload}.`;
};

/**
 * The loopback addresses of `port` on which some program accepts connections, with its process where the system says,
 * or `undefined` when none does. Called after the server dev mode started has exited, so any listener is another's.
 */
export const findOtherListeners = async (port: number): Promise<{ host: LoopbackHost; pid?: number }[] | undefined> => {
  const hosts = await getLoopbackHosts();
  const accepted = await Promise.all(hosts.map((host) => acceptsTcpConnection({ port, host })));
  const acceptingHosts = hosts.filter((_, index) => accepted[index]);
  if (!acceptingHosts.length) return undefined;
  const inspection = await inspectPort(port, -1);
  return acceptingHosts.map((host) => ({
    host,
    pid: inspection ? findLoopbackOwner(inspection.listeners, host)?.pid : undefined
  }));
};
