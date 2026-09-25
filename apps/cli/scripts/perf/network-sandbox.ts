/**
 * An operating-system boundary for measurements that must not reach external services or the host's Docker daemon.
 *
 * `getNetworkSandboxCommand` wraps a command so it runs in new user, network, mount and PID namespaces:
 *
 * - The network namespace has only loopback, brought up, so no packet can leave the machine whatever code sends it.
 *   Loopback listeners started inside, such as the external-service fixture, stay reachable.
 * - `/etc/resolv.conf` is bind-mounted, in the private mount namespace only, to a file naming 127.0.0.1, where
 *   `startDnsRecorder` answers every query with NXDOMAIN and records the name. A command that tries to reach a host
 *   directly therefore fails fast and leaves the name it asked for.
 * - Unix sockets are files, not network addresses, so the network namespace alone does not stop them. The paths
 *   `discoverSandboxMasks` finds are masked in the private mount namespace: Docker's daemon sockets by binding
 *   `/dev/null` over them, and directories of host services that relay out of the namespace (Docker Desktop's
 *   shared sockets, including its Docker API and HTTP proxies; WSL interop, which starts Windows programs with the
 *   host's network; systemd-resolved) by an empty read-only tmpfs. If any mask cannot be installed, the sandbox does not
 *   start. A Docker CLI called by absolute path, or a raw connection to a daemon socket, therefore reaches nothing.
 * - The command is PID 1 of a new PID namespace, and `unshare --kill-child` ends that namespace when the sandbox is
 *   ended from outside. When PID 1 exits, the kernel kills every other process in the namespace, including any that
 *   left its process group with `setsid`.
 * - Unprivileged programs may bind low ports in the namespace, so the recorder can listen on port 53.
 * - A nested user namespace maps the caller's own uid and gid back, so the command runs as the same user it would run
 *   as outside.
 *
 * Nothing here changes the host: the namespaces end with the command. `assertNetworkSandbox` checks from inside that
 * only loopback exists, the resolver is the recorder, the command is PID 1, and every mask is in place;
 * `probeEgress` is the negative test that a direct connection, a name lookup and an HTTPS request to AWS all fail.
 * `readHostNetworkState` captures, from outside, what a sandbox run must leave as it was.
 *
 * Not covered: AF_VSOCK (Hyper-V) sockets are not namespaced; the measured CLI does not open them.
 */
import { createHash } from 'node:crypto';
import { createSocket } from 'node:dgram';
import { Resolver } from 'node:dns/promises';
import { existsSync, lstatSync, readdirSync, readFileSync, readlinkSync, realpathSync } from 'node:fs';
import { connect } from 'node:net';
import { homedir, networkInterfaces } from 'node:os';
import { join } from 'node:path';

export const NETWORK_SANDBOX_ENV = 'STP_PERF_NETWORK_SANDBOX';
/** The masks the sandbox installed, as JSON, so the command inside can check each one. */
export const SANDBOX_MASKS_ENV = 'STP_PERF_SANDBOX_MASKS';

const quoteForShell = (value: string) => `'${value.replaceAll("'", "'\\''")}'`;

const requireExecutable = (name: string) => {
  const path = Bun.which(name, { PATH: `${process.env.PATH ?? ''}:/usr/sbin:/sbin:/usr/bin:/bin` });
  if (!path) throw new Error(`The network sandbox needs \`${name}\`, which is not installed.`);
  return path;
};

/** The file `/etc/resolv.conf` is replaced with inside the sandbox. */
export const SANDBOX_RESOLV_CONF = 'nameserver 127.0.0.1\noptions timeout:1 attempts:1\n';

export type SandboxMasks = {
  /** Sockets `/dev/null` is bound over. */
  files: string[];
  /** Directories an empty read-only tmpfs is mounted over. */
  directories: string[];
};

/** Host services that relay out of a network namespace, masked whole when present. */
const MASKED_DIRECTORY_CANDIDATES = ['/mnt/wsl/docker-desktop/shared-sockets', '/run/WSL', '/run/systemd/resolve'];
const DAEMON_SOCKET_NAME = /docker|containerd|buildkit|podman/i;

const isUnder = (path: string, directory: string) => path === directory || path.startsWith(`${directory}/`);

/** Sockets named like a container daemon's under `root`, to `depth` levels, not following links. */
const findDaemonSockets = (root: string, depth: number, skip: string[]): string[] => {
  let entries: string[];
  try {
    entries = readdirSync(root);
  } catch {
    return [];
  }
  return entries.flatMap((name) => {
    const path = join(root, name);
    if (skip.some((directory) => isUnder(path, directory))) return [];
    let stats: ReturnType<typeof lstatSync>;
    try {
      stats = lstatSync(path);
    } catch {
      return [];
    }
    if (stats.isSocket()) return DAEMON_SOCKET_NAME.test(name) ? [path] : [];
    return stats.isDirectory() && depth > 0 ? findDaemonSockets(path, depth - 1, skip) : [];
  });
};

/** The places a container daemon socket usually lives for this user, plus a unix `DOCKER_HOST`. */
const daemonSocketRoots = () => {
  const uid = process.getuid?.();
  const dockerHost = process.env.DOCKER_HOST?.startsWith('unix://')
    ? process.env.DOCKER_HOST.slice('unix://'.length)
    : null;
  return {
    roots: [['/run', 3], [join(homedir(), '.docker'), 4], ...(uid === undefined ? [] : [[`/run/user/${uid}`, 3]])] as [
      string,
      number
    ][],
    dockerHost
  };
};

/** Read-only, outside the sandbox: every host path the sandbox must mask. */
export const discoverSandboxMasks = (): SandboxMasks => {
  const directories = MASKED_DIRECTORY_CANDIDATES.filter((path) => {
    try {
      return lstatSync(path).isDirectory();
    } catch {
      return false;
    }
  });
  const { roots, dockerHost } = daemonSocketRoots();
  const files = new Set(roots.flatMap(([root, depth]) => findDaemonSockets(root, depth, directories)));
  if (dockerHost && existsSync(dockerHost) && lstatSync(dockerHost).isSocket()) files.add(realpathSync(dockerHost));
  return { files: [...files].toSorted(), directories };
};

export const getNetworkSandboxCommand = ({
  argv,
  resolvConfPath,
  masks
}: {
  argv: string[];
  resolvConfPath: string;
  masks: SandboxMasks;
}) => {
  const uid = process.getuid?.();
  const gid = process.getgid?.();
  if (uid === undefined || gid === undefined) throw new Error('The network sandbox needs Linux user namespaces.');
  const unshare = requireExecutable('unshare');
  const mount = quoteForShell(requireExecutable('mount'));
  const setup = [
    'set -e',
    `${quoteForShell(requireExecutable('ip'))} link set lo up`,
    'echo 0 > /proc/sys/net/ipv4/ip_unprivileged_port_start',
    `${mount} --bind ${quoteForShell(resolvConfPath)} /etc/resolv.conf`,
    ...masks.directories.map(
      (directory) => `${mount} -t tmpfs -o ro,size=4k,mode=0755 stacktape-sandbox-mask ${quoteForShell(directory)}`
    ),
    ...masks.files.map((file) => `${mount} --bind /dev/null ${quoteForShell(file)}`),
    `exec ${quoteForShell(unshare)} --user --map-user=${uid} --map-group=${gid} -- "$@"`
  ].join('\n');
  return [
    unshare,
    '--user',
    '--map-root-user',
    '--net',
    '--mount',
    '--pid',
    '--fork',
    '--kill-child',
    '--mount-proc',
    'sh',
    '-c',
    setup,
    'stacktape-network-sandbox',
    ...argv
  ];
};

/** The environment the sandboxed command needs so `assertNetworkSandbox` can verify it from inside. */
export const getNetworkSandboxEnvironment = (masks: SandboxMasks) => ({
  [NETWORK_SANDBOX_ENV]: '1',
  [SANDBOX_MASKS_ENV]: JSON.stringify(masks)
});

export type SandboxDescription = {
  interfaces: string[];
  resolvConf: string;
  uid: number | null;
  gid: number | null;
  pid: number;
  /** `/proc/self/ns/pid`, so the caller can check afterwards that no process of the namespace is left. */
  pidNamespace: string;
  masks: SandboxMasks | null;
};

export const describeNetworkSandbox = (): SandboxDescription => {
  let masks: SandboxMasks | null = null;
  try {
    masks = JSON.parse(process.env[SANDBOX_MASKS_ENV] ?? 'null') as SandboxMasks | null;
  } catch {
    masks = null;
  }
  return {
    interfaces: Object.keys(networkInterfaces()).toSorted(),
    resolvConf: readFileSync('/etc/resolv.conf', 'utf8'),
    uid: process.getuid?.() ?? null,
    gid: process.getgid?.() ?? null,
    pid: process.pid,
    pidNamespace: readlinkSync('/proc/self/ns/pid'),
    masks
  };
};

/**
 * Throws unless this process is inside the sandbox: loopback only, names resolved by the local recorder, PID 1 of its
 * own PID namespace, every mask in place, and no container daemon socket reachable where one usually lives.
 */
export const assertNetworkSandbox = () => {
  const description = describeNetworkSandbox();
  if (process.env[NETWORK_SANDBOX_ENV] !== '1') {
    throw new Error(`Not started through the network sandbox (${NETWORK_SANDBOX_ENV} is not set).`);
  }
  if (description.interfaces.join(',') !== 'lo') {
    throw new Error(`The network sandbox has interfaces other than loopback: ${description.interfaces.join(', ')}.`);
  }
  if (description.resolvConf !== SANDBOX_RESOLV_CONF) {
    throw new Error('The network sandbox resolver is not the local DNS recorder.');
  }
  if (description.pid !== 1) {
    throw new Error(`The sandboxed command is PID ${description.pid}, not PID 1 of its own PID namespace.`);
  }
  const { masks } = description;
  if (!masks) throw new Error(`The sandbox masks are unknown (${SANDBOX_MASKS_ENV} is not set).`);
  for (const file of masks.files) {
    if (!lstatSync(file).isCharacterDevice()) throw new Error(`${file} is not masked inside the sandbox.`);
  }
  for (const directory of masks.directories) {
    if (readdirSync(directory).length > 0) throw new Error(`${directory} is not masked inside the sandbox.`);
  }
  const { roots, dockerHost } = daemonSocketRoots();
  const reachable = [
    ...roots.flatMap(([root, depth]) => findDaemonSockets(root, depth, masks.directories)),
    ...(dockerHost && existsSync(dockerHost) && lstatSync(dockerHost).isSocket() ? [dockerHost] : [])
  ];
  if (reachable.length > 0) {
    throw new Error(`Container daemon sockets are reachable inside the sandbox: ${reachable.join(', ')}.`);
  }
  return description;
};

/** Other live processes in this PID namespace; inside the sandbox, anything besides PID 1 that the caller did not start. */
export const listOtherNamespaceProcesses = () =>
  readdirSync('/proc')
    .filter((entry) => /^\d+$/.test(entry) && Number(entry) !== process.pid)
    .flatMap((entry) => {
      try {
        const stat = readFileSync(`/proc/${entry}/stat`, 'utf8');
        const state = stat.slice(stat.lastIndexOf(')') + 2).split(' ')[0];
        return state === 'Z'
          ? []
          : [{ pid: Number(entry), command: stat.slice(stat.indexOf('(') + 1, stat.lastIndexOf(')')) }];
      } catch {
        return [];
      }
    });

export type HostNetworkState = {
  resolvConfTarget: string;
  resolvConfSha256: string;
  interfaces: string[];
  routes: string[];
  /** Mount points on the resolver file; empty unless something was mounted over it. */
  resolverMounts: string[];
};

/** Read-only, from outside the sandbox: what a sandbox run must leave exactly as it found it. */
export const readHostNetworkState = (): HostNetworkState => {
  const resolvConfTarget = realpathSync('/etc/resolv.conf');
  const ip = requireExecutable('ip');
  const routes = ['-4', '-6'].flatMap((family) => {
    const result = Bun.spawnSync({
      cmd: [ip, '-o', family, 'route', 'show'],
      stdout: 'pipe',
      stderr: 'pipe',
      timeout: 10_000
    });
    if (result.exitCode !== 0) throw new Error(`ip ${family} route show exited with ${result.exitCode}.`);
    return result.stdout.toString().split('\n').filter(Boolean);
  });
  const resolverPaths = new Set(['/etc/resolv.conf', resolvConfTarget]);
  return {
    resolvConfTarget,
    resolvConfSha256: createHash('sha256').update(readFileSync(resolvConfTarget)).digest('hex'),
    interfaces: Object.keys(networkInterfaces()).toSorted(),
    routes,
    resolverMounts: readFileSync('/proc/self/mountinfo', 'utf8')
      .split('\n')
      .map((line) => line.split(' ')[4] ?? '')
      .filter((mountPoint) => resolverPaths.has(mountPoint))
  };
};

export type DnsQuery = { name: string; type: number; atMs: number };

const parseQuestion = (message: Buffer) => {
  if (message.length < 12 || message.readUInt16BE(4) < 1) return null;
  const labels: string[] = [];
  let offset = 12;
  while (offset < message.length) {
    const length = message[offset]!;
    offset += 1;
    if (length === 0) break;
    if (length > 63 || offset + length > message.length) return null;
    labels.push(message.subarray(offset, offset + length).toString('latin1'));
    offset += length;
  }
  if (offset + 4 > message.length) return null;
  return { name: labels.join('.'), type: message.readUInt16BE(offset), questionEnd: offset + 4 };
};

/**
 * Answers DNS queries on 127.0.0.1:53 with NXDOMAIN and records each queried name. Only usable inside the sandbox,
 * where the port is free and the resolver points here.
 */
export const startDnsRecorder = async () => {
  const startedAt = performance.now();
  let queries: DnsQuery[] = [];
  const socket = createSocket('udp4');
  socket.on('message', (message, remote) => {
    const question = parseQuestion(message);
    if (!question) return;
    queries.push({
      name: question.name,
      type: question.type,
      atMs: Math.round((performance.now() - startedAt) * 1000) / 1000
    });
    const header = Buffer.alloc(12);
    header.writeUInt16BE(message.readUInt16BE(0), 0);
    // Response, recursion desired copied from the query, recursion available, NXDOMAIN.
    header.writeUInt16BE(0x8000 | (message.readUInt16BE(2) & 0x0100) | 0x0080 | 0x0003, 2);
    header.writeUInt16BE(1, 4);
    socket.send(Buffer.concat([header, message.subarray(12, question.questionEnd)]), remote.port, remote.address);
  });
  await new Promise<void>((resolveBind, reject) => {
    socket.once('error', reject);
    socket.bind(53, '127.0.0.1', () => resolveBind());
  });
  return {
    takeQueries: () => {
      const taken = queries;
      queries = [];
      return taken;
    },
    close: () =>
      new Promise<void>((resolveClose) => {
        socket.close(() => resolveClose());
      })
  };
};

/** Sockets under `directories`, to `depth` levels; read-only, for choosing what the negative test tries to reach. */
export const findSocketsUnder = (directories: string[], depth = 4): string[] =>
  directories.flatMap((directory) => {
    let entries: string[];
    try {
      entries = readdirSync(directory);
    } catch {
      return [];
    }
    return entries.flatMap((name) => {
      const path = join(directory, name);
      try {
        const stats = lstatSync(path);
        if (stats.isSocket()) return [path];
        return stats.isDirectory() && depth > 0 ? findSocketsUnder([path], depth - 1) : [];
      } catch {
        return [];
      }
    });
  });

export type SocketProbe = { path: string; reached: boolean; detail: string };

/**
 * Tries to open each Unix socket. For the paths in `pingPaths`, Docker API sockets, it also sends the read-only
 * `GET /_ping` and reports the first response line. Every attempt is bounded and its socket destroyed afterwards.
 * `reached` means a connection was established: inside the sandbox none may be.
 */
export const probeUnixSockets = async ({
  paths,
  pingPaths = [],
  timeoutMs = 3000
}: {
  paths: string[];
  pingPaths?: string[];
  timeoutMs?: number;
}): Promise<SocketProbe[]> => {
  const probes: SocketProbe[] = [];
  for (const path of paths) {
    const ping = pingPaths.includes(path);
    try {
      const detail = await withDeadline(
        timeoutMs,
        (signal) =>
          new Promise<string>((resolveProbe, reject) => {
            let answer = '';
            const socket = connect({ path });
            const finish = (error?: Error, result?: string) => {
              signal.removeEventListener('abort', onAbort);
              socket.destroy();
              if (error) reject(error);
              else resolveProbe(result ?? 'connected');
            };
            const onAbort = () => finish(new Error('attempt destroyed at the deadline'));
            signal.addEventListener('abort', onAbort, { once: true });
            socket.once('error', (error) => finish(error));
            socket.once('connect', () => {
              if (!ping) {
                finish(undefined, 'connected');
                return;
              }
              socket.setEncoding('latin1');
              socket.on('data', (chunk: string) => {
                answer += chunk;
                if (answer.includes('\r\n')) finish(undefined, `connected; ${answer.split('\r\n')[0]}`);
              });
              socket.once('end', () => finish(undefined, `connected; ${answer.split('\r\n')[0] || 'no answer'}`));
              socket.write('GET /_ping HTTP/1.0\r\nHost: docker\r\n\r\n');
            });
          })
      );
      probes.push({ path, reached: true, detail });
    } catch (error) {
      const detail =
        error instanceof Error
          ? `${(error as NodeJS.ErrnoException).code ?? error.name}: ${error.message}`
          : String(error);
      // A deadline means the connection was not refused; count it as reached rather than risk a false negative.
      probes.push({ path, reached: detail.includes('deadline'), detail: detail.slice(0, 200) });
    }
  }
  return probes;
};

export type EgressProbe = { probe: string; blocked: boolean; detail: string; ms: number };

export type EgressTargets = {
  tcp: { host: string; port: number };
  dnsName: string;
  /** Name servers for the lookup; `/etc/resolv.conf`'s when omitted, which inside the sandbox is the recorder. */
  dnsServers?: string[] | undefined;
  httpsUrl: string;
};

export const DEFAULT_EGRESS_TARGETS: EgressTargets = {
  tcp: { host: '1.1.1.1', port: 443 },
  dnsName: 'sts.amazonaws.com',
  httpsUrl: 'https://sts.amazonaws.com/'
};

/**
 * Runs `attempt` with a deadline. At the deadline the signal aborts, and each attempt tears down its own work on that
 * signal: the TCP socket is destroyed, the DNS query cancelled, the request aborted. The timer is cleared however the
 * race ends, and the signal aborts then too, so nothing an attempt started outlives the probe.
 */
export const withDeadline = async <T>(timeoutMs: number, attempt: (signal: AbortSignal) => Promise<T>): Promise<T> => {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      attempt(controller.signal),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(new Error(`no answer within ${timeoutMs} ms`));
        }, timeoutMs);
      })
    ]);
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
};

const timed = async (probe: string, attempt: () => Promise<string>): Promise<EgressProbe> => {
  const startedAt = performance.now();
  try {
    const detail = await attempt();
    return { probe, blocked: false, detail, ms: Math.round(performance.now() - startedAt) };
  } catch (error) {
    const detail =
      error instanceof Error
        ? `${(error as NodeJS.ErrnoException).code ?? error.name}: ${error.message}`
        : String(error);
    return { probe, blocked: true, detail: detail.slice(0, 200), ms: Math.round(performance.now() - startedAt) };
  }
};

const connectTcp = ({ host, port }: EgressTargets['tcp'], signal: AbortSignal) =>
  new Promise<string>((resolveConnect, reject) => {
    const socket = connect(port, host);
    const finish = (error?: Error) => {
      signal.removeEventListener('abort', onAbort);
      socket.destroy();
      if (error) reject(error);
      else resolveConnect('connected');
    };
    const onAbort = () => finish(new Error('connection attempt destroyed at the deadline'));
    signal.addEventListener('abort', onAbort, { once: true });
    socket.once('connect', () => finish());
    socket.once('error', (error) => finish(error));
  });

const resolveName = async ({ dnsName, dnsServers }: EgressTargets, timeoutMs: number, signal: AbortSignal) => {
  // A cancellable resolver rather than getaddrinfo, which cannot be stopped once started. The CLI's own lookups go
  // through getaddrinfo; the `no-endpoints` safety scenario records those.
  const resolver = new Resolver({ timeout: timeoutMs, tries: 1 });
  if (dnsServers) resolver.setServers(dnsServers);
  const onAbort = () => resolver.cancel();
  signal.addEventListener('abort', onAbort, { once: true });
  try {
    const [address] = await resolver.resolve4(dnsName);
    return `resolved to ${address}`;
  } finally {
    signal.removeEventListener('abort', onAbort);
  }
};

const requestHttps = async (url: string, signal: AbortSignal) => {
  const response = await fetch(url, { signal });
  await response.body?.cancel();
  return `HTTP ${response.status}`;
};

/**
 * The negative test: a TCP connection to a public address, a name lookup and an HTTPS request to STS, each bounded by
 * `timeoutMs` and torn down at that deadline: the socket destroyed, the query cancelled, the request aborted.
 * Inside the sandbox every one must fail; on a connected machine outside it they would succeed.
 */
export const probeEgress = async ({
  timeoutMs = 5000,
  targets = DEFAULT_EGRESS_TARGETS
}: { timeoutMs?: number; targets?: EgressTargets } = {}) => [
  await timed(`tcp ${targets.tcp.host}:${targets.tcp.port}`, () =>
    withDeadline(timeoutMs, (signal) => connectTcp(targets.tcp, signal))
  ),
  await timed(`dns ${targets.dnsName}`, () =>
    withDeadline(timeoutMs, (signal) => resolveName(targets, timeoutMs, signal))
  ),
  await timed(`https ${new URL(targets.httpsUrl).host}`, () =>
    withDeadline(timeoutMs, (signal) => requestHttps(targets.httpsUrl, signal))
  )
];
