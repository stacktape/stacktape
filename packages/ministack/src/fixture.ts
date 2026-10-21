import { spawnSync } from 'node:child_process';
import { randomBytes, randomInt } from 'node:crypto';
import { createServer, connect, type Server } from 'node:net';
import { networkInterfaces } from 'node:os';
import { setTimeout as delay } from 'node:timers/promises';

/**
 * The one local AWS emulator the tests use. Pin a new release only after the deploy loop in `apps/cli/tests/ministack`
 * and the Console lanes that use this fixture pass against it; the digest is the tag's multi-platform index.
 */
export const MINISTACK_IMAGE =
  'ministackorg/ministack:1.5.27@sha256:4cb4f8c5c1b8e58e9a37af1c80f243de5b5cecf2e7b0461086d0dc7781d6642c';
export const MINISTACK_DEFAULT_REGION = 'eu-west-1';
/** The account MiniStack provisions CloudFormation stacks in and gives to code it runs. */
export const MINISTACK_DEFAULT_ACCOUNT_ID = '000000000000';
const CONTAINER_PORT = 4566;
const SYNTHETIC_SECRET_ACCESS_KEY = 'stacktape-ministack-synthetic-not-a-real-key';
const CONTAINER_NAME_PREFIX = 'stacktape-ministack-';
const DOCKER_HOST_NAME = 'host.docker.internal';

export type MiniStackCredentials = { accessKeyId: string; secretAccessKey: string };

/**
 * A namespace inside one emulator. MiniStack keys every service's state by the account it derives from a 12-digit
 * access key ID, so scenarios that share a container but hold different accounts cannot see each other's resources.
 */
export type MiniStackAccount = { accountId: string; credentials: MiniStackCredentials };

export type MiniStackClientConfig = {
  endpoint: string;
  region: string;
  credentials: MiniStackCredentials;
  maxAttempts: number;
  /** Bucket names cannot be a subdomain of 127.0.0.1; every S3 request uses the path style. */
  forcePathStyle: true;
};

export type MiniStack = {
  /** `http://127.0.0.1:<random port>`. */
  endpoint: string;
  region: string;
  image: string;
  imageId: string;
  containerName: string;
  /** Anonymous volumes the image declares; `stop()` removes and verifies them. */
  volumes: readonly string[];
  startupMs: number;
  defaultAccount: MiniStackAccount;
  /** A fresh account namespace for one scenario. */
  account: () => MiniStackAccount;
  /** Configuration for an AWS SDK v3 client that talks only to this emulator. */
  clientConfig: (account?: MiniStackAccount, options?: { region?: string }) => MiniStackClientConfig;
  /**
   * Environment for a child process (the source CLI, a worker) so every AWS SDK in it reaches only this emulator:
   * synthetic credentials, no profile, config file or instance metadata, and the endpoint set for every service. Merge
   * it over an otherwise minimal environment; never spread `process.env` under it. The child must also load the
   * repository's network guard preload: an explicit SDK endpoint in code overrides any of these variables.
   */
  childEnvironment: (account?: MiniStackAccount, options?: { region?: string }) => Record<string, string>;
  /**
   * Lets code the emulator runs (Lambda functions, custom resources) reach a server on this machine's
   * `127.0.0.1:<port>` under that same address, such as a control-plane fake whose URL the CLI writes into a
   * function's environment. A relay inside the container listens on its own `127.0.0.1:<port>` and connects to the
   * Docker host. With egress blocked, the only route this adds is one to the Docker host, which a Linux container
   * reaches over its bridge anyway; the internet stays unreachable.
   */
  forwardHostPort: (port: number) => Promise<void>;
  /** The container's combined stdout and stderr so far. */
  logs: () => string;
  /**
   * Removes the container with its volumes and verifies with Docker that both are gone. Throws when Docker cannot
   * confirm the removal; calling it again retries. Resolves at once after a verified cleanup.
   */
  stop: () => Promise<void>;
};

export type StartMiniStackOptions = {
  /** Appears in the container name, which is otherwise random. */
  label?: string;
  region?: string;
  /** How long the emulator may take to answer its health check. */
  startTimeoutMs?: number;
  /**
   * Leave the emulator without a route to the outside: IPv6 is disabled in the container, and a short-lived helper
   * container sharing its network namespace deletes the IPv4 default route. The emulator itself has no NET_ADMIN, so
   * code it runs (Lambda functions, custom resources) can neither reach the internet nor restore the route. On by
   * default.
   */
  blockEgress?: boolean;
  /** Extra variables for the emulator process itself. */
  environment?: Record<string, string>;
};

export class MiniStackError extends Error {
  override name = 'MiniStackError';
}

/** The only AWS endpoint a test may use: this machine's loopback address with an explicit port. */
export const assertLocalAwsEndpoint = (endpoint: string): string => {
  if (!/^http:\/\/127\.0\.0\.1:\d{1,5}$/.test(endpoint)) {
    throw new MiniStackError(
      `AWS endpoint ${JSON.stringify(endpoint)} is not a loopback emulator (http://127.0.0.1:<port>).`
    );
  }
  return endpoint;
};

export type DockerResult = { exitCode: number; stdout: string; stderr: string };
export type DockerRunner = (args: string[], options?: { allowFailure?: boolean; timeoutMs?: number }) => DockerResult;

const docker: DockerRunner = (args, { allowFailure = false, timeoutMs = 60_000 } = {}) => {
  const result = spawnSync('docker', args, { encoding: 'utf8', timeout: timeoutMs, stdio: ['ignore', 'pipe', 'pipe'] });
  const exitCode = result.status ?? (result.error ? 1 : 0);
  if (!allowFailure && exitCode !== 0) {
    const detail = result.error?.message ?? result.stderr.trim();
    throw new MiniStackError(`docker ${args.slice(0, 2).join(' ')} failed: ${detail}`);
  }
  return { exitCode, stdout: result.stdout?.trim() ?? '', stderr: result.stderr?.trim() ?? '' };
};

const NOT_FOUND = /No such (?:object|container|volume)/i;

/**
 * Confirms with Docker that the container and each volume are gone. Only Docker's own "no such ..." answer counts
 * as absence; a daemon that cannot be reached, or an object that still exists, is an error. Shared with the
 * fixture's self-test, which drives it with scripted Docker answers.
 */
export const verifyMiniStackRemoval = (run: DockerRunner, containerName: string, volumes: readonly string[]) => {
  const remaining: string[] = [];
  const problems: string[] = [];
  const check = (label: string, args: string[]) => {
    const result = run(args, { allowFailure: true });
    if (result.exitCode === 0) remaining.push(label);
    else if (!NOT_FOUND.test(result.stderr))
      problems.push(`${label}: ${result.stderr || `docker exited ${result.exitCode}`}`);
  };
  check(`container ${containerName}`, ['inspect', '--type', 'container', containerName]);
  for (const volume of volumes) check(`volume ${volume}`, ['volume', 'inspect', volume]);
  if (remaining.length > 0) throw new MiniStackError(`MiniStack cleanup left ${remaining.join(', ')} behind.`);
  if (problems.length > 0) {
    throw new MiniStackError(`MiniStack cleanup could not be verified: ${problems.join('; ')}`);
  }
};

/** Removes the container and its anonymous volumes, then verifies. */
export const removeMiniStackContainer = (run: DockerRunner, containerName: string, volumes: readonly string[]) => {
  const removal = run(['rm', '--force', '--volumes', containerName], { allowFailure: true });
  if (removal.exitCode !== 0 && !NOT_FOUND.test(removal.stderr)) {
    throw new MiniStackError(`docker rm ${containerName} failed: ${removal.stderr || `exit ${removal.exitCode}`}`);
  }
  verifyMiniStackRemoval(run, containerName, volumes);
};

/**
 * Deletes every IPv4 default route of the current network namespace through the kernel's netlink socket (the image
 * has no `ip` binary), then prints the IPv4 and IPv6 routing tables so the caller can verify.
 */
const DELETE_DEFAULT_ROUTES = `import socket,struct
s=socket.socket(socket.AF_NETLINK,socket.SOCK_RAW,socket.NETLINK_ROUTE)
s.bind((0,0))
s.send(struct.pack('IHHII',28,26,0x301,1,0)+struct.pack('BBBBBBBBI',socket.AF_INET,0,0,0,0,0,0,0,0))
routes=[]
done=False
while not done:
 data=s.recv(65535)
 offset=0
 while offset<len(data):
  length,kind,flags,seq,pid=struct.unpack_from('IHHII',data,offset)
  payload=data[offset+16:offset+length]
  if kind==3: done=True
  if kind==24 and payload[1]==0 and payload[4]==254: routes.append(payload)
  offset+=(length+3)&~3
for route in routes:
 s.send(struct.pack('IHHII',16+len(route),25,5,2,0)+route)
 reply=s.recv(65535)
 if struct.unpack_from('i',reply,16)[0]!=0: raise RuntimeError('default route deletion failed')
print(open('/proc/net/route').read())
print('IPV6')
print(open('/proc/net/ipv6_route').read())`;

/**
 * Adds a route to one IPv4 address through the given gateway unless a directly connected subnet already reaches it.
 * Arguments: the address and the gateway. Runs in a NET_ADMIN helper sharing the emulator's network namespace.
 */
const ADD_HOST_ROUTE = `import socket,struct,sys
address,gateway=sys.argv[1],sys.argv[2]
target=struct.unpack('<I',socket.inet_aton(address))[0]
for line in open('/proc/net/route').read().splitlines()[1:]:
 fields=line.split()
 if len(fields)>7 and fields[2]=='00000000' and target&int(fields[7],16)==int(fields[1],16) and int(fields[7],16)!=0:
  print('connected')
  sys.exit(0)
s=socket.socket(socket.AF_NETLINK,socket.SOCK_RAW,socket.NETLINK_ROUTE)
s.bind((0,0))
route=struct.pack('BBBBBBBBI',socket.AF_INET,32,0,0,254,4,0,1,0)
attributes=struct.pack('HH',8,1)+socket.inet_aton(address)+struct.pack('HH',8,5)+socket.inet_aton(gateway)
s.send(struct.pack('IHHII',16+len(route)+len(attributes),24,0x605,1,0)+route+attributes)
reply=s.recv(65535)
error=struct.unpack_from('i',reply,16)[0]
if error!=0: raise RuntimeError('route to the Docker host failed: errno %d'%-error)
print('routed')`;

/**
 * A TCP relay: listens on 127.0.0.1 at the first argument's port and connects every client to the second and third
 * arguments. It prints "ready" once it listens and leaves a detached child serving, so `docker exec` returns.
 */
const LOOPBACK_RELAY = `import os,socket,sys,threading
port,target_host,target_port=int(sys.argv[1]),sys.argv[2],int(sys.argv[3])
server=socket.socket()
server.setsockopt(socket.SOL_SOCKET,socket.SO_REUSEADDR,1)
server.bind(('127.0.0.1',port))
server.listen(64)
if os.fork()>0:
 print('ready',flush=True)
 os._exit(0)
os.setsid()
null=os.open(os.devnull,os.O_RDWR)
for fd in (0,1,2): os.dup2(null,fd)
def pipe(source,sink):
 try:
  while True:
   data=source.recv(65536)
   if not data: break
   sink.sendall(data)
 except OSError: pass
 try: sink.shutdown(socket.SHUT_WR)
 except OSError: pass
def serve(client):
 try: upstream=socket.create_connection((target_host,target_port),5)
 except OSError:
  client.close()
  return
 back=threading.Thread(target=pipe,args=(upstream,client),daemon=True)
 back.start()
 pipe(client,upstream)
 back.join()
 client.close()
 upstream.close()
while True:
 client,_=server.accept()
 threading.Thread(target=serve,args=(client,),daemon=True).start()`;

/**
 * Exits 0 once the first and second arguments accept a TCP connection, retrying for 15 seconds; run inside the
 * emulator. Docker Desktop in WSL reaches a new loopback listener only after WSL's localhost forwarding notices it.
 */
const CONNECT_PROBE = `import socket,sys,time
deadline=time.time()+15
while True:
 try:
  socket.create_connection((sys.argv[1],int(sys.argv[2])),3).close()
  break
 except OSError:
  if time.time()>deadline: raise
  time.sleep(0.2)`;

/** True when one of this machine's interfaces holds the address, as Docker's bridge gateway does on Linux. */
const isLocalAddress = (address: string) =>
  Object.values(networkInterfaces()).some((entries) => entries?.some((entry) => entry.address === address));

/**
 * Relays connections that arrive on a Docker bridge address to the same machine's loopback, accepting only the given
 * client. A Linux Docker host receives a container's host-gateway traffic on the bridge, where a loopback server does
 * not listen.
 */
const startBridgeRelay = async (bindAddress: string, allowedClient: string, loopbackPort: number) => {
  const server = createServer((client) => {
    if (client.remoteAddress?.replace(/^::ffff:/, '') !== allowedClient) {
      client.destroy();
      return;
    }
    const upstream = connect(loopbackPort, '127.0.0.1');
    client.pipe(upstream).pipe(client);
    client.on('error', () => upstream.destroy());
    upstream.on('error', () => client.destroy());
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, bindAddress, () => resolve());
  });
  const address = server.address();
  if (address === null || typeof address === 'string') throw new MiniStackError('The bridge relay has no TCP port.');
  return { server, port: address.port };
};

/**
 * True when `/proc/net/route` lists a destination 0.0.0.0, or `/proc/net/ipv6_route` a ::/0 entry through a real
 * interface. With IPv6 disabled the kernel keeps `::/0` reject entries on `lo`; those lead nowhere and do not count.
 */
export const hasDefaultRoute = (routeTables: string): boolean => {
  const [ipv4 = '', ipv6 = ''] = routeTables.split('\nIPV6\n');
  const ipv4Default = ipv4
    .split('\n')
    .slice(1)
    .some((line) => line.split(/\s+/)[1] === '00000000');
  const ipv6Default = ipv6
    .split('\n')
    .map((line) => line.trim().split(/\s+/))
    .some(
      (fields) => fields.length >= 10 && /^0{32}$/.test(fields[0] ?? '') && fields[1] === '00' && fields.at(-1) !== 'lo'
    );
  return ipv4Default || ipv6Default;
};

const randomAccountId = () => `${randomInt(1, 10)}${Array.from({ length: 11 }, () => randomInt(0, 10)).join('')}`;

const synthetic = (accessKeyId: string): MiniStackCredentials => ({
  accessKeyId,
  secretAccessKey: SYNTHETIC_SECRET_ACCESS_KEY
});

/**
 * Docker Desktop sometimes publishes a port that nothing listens on in a WSL distro: Docker reports the mapping and a
 * healthy container, and every host connection is refused. Only a new container with a new port recovers.
 */
class UnreachablePublishedPort extends MiniStackError {}

/** How long host connections may be refused after Docker reports the container healthy before the port counts as lost. */
const UNREACHABLE_AFTER_HEALTHY_MS = 5_000;

/** Waits until the emulator answers its health endpoint, failing fast when the container dies first. */
const waitForHealth = async (endpoint: string, containerName: string, deadline: number) => {
  let lastProblem = 'no request completed';
  let refusedWhileHealthySince: number | undefined;
  while (Date.now() < deadline) {
    const state = docker(
      ['inspect', '--format', '{{.State.Running}} {{if .State.Health}}{{.State.Health.Status}}{{end}}', containerName],
      { allowFailure: true }
    );
    const [running, health] = state.stdout.split(' ');
    if (state.exitCode !== 0 || running !== 'true') {
      const logs = docker(['logs', '--tail', '40', containerName], { allowFailure: true });
      throw new MiniStackError(`MiniStack exited before becoming ready.\n${logs.stdout}\n${logs.stderr}`);
    }
    let refused = false;
    try {
      // oxlint-disable-next-line no-await-in-loop -- polling one listener until it answers.
      const response = await fetch(`${endpoint}/_ministack/health`, { signal: AbortSignal.timeout(500) });
      if (response.ok) return;
      lastProblem = `HTTP ${response.status}`;
    } catch (error) {
      // The listener is still starting. Node's fetch keeps the socket error in `cause`; Bun puts it on the error.
      const { code, cause } = (error ?? {}) as { code?: string; cause?: { code?: string } };
      const errorCode = cause?.code ?? code;
      refused = errorCode === 'ECONNREFUSED' || errorCode === 'ConnectionRefused';
      lastProblem =
        error instanceof Error ? `${error.name}: ${error.message} ${errorCode ?? ''}`.trim() : String(error);
    }
    refusedWhileHealthySince = refused && health === 'healthy' ? (refusedWhileHealthySince ?? Date.now()) : undefined;
    if (
      refusedWhileHealthySince !== undefined &&
      Date.now() - refusedWhileHealthySince >= UNREACHABLE_AFTER_HEALTHY_MS
    ) {
      throw new UnreachablePublishedPort(`Docker reports ${containerName} healthy, but nothing accepts ${endpoint}.`);
    }
    // oxlint-disable-next-line no-await-in-loop -- the poll interval.
    await delay(100);
  }
  throw new MiniStackError(
    `MiniStack did not answer its health check at ${endpoint} within the start timeout (${containerName}). ` +
      `Last host request: ${lastProblem}.`
  );
};

/**
 * Starts one pinned MiniStack container on a random loopback port and returns it ready. The caller owns `stop()`;
 * call it from `finally` or `afterAll` so a failed test still removes the container.
 */
export const startMiniStack = async ({
  label = 'test',
  region = MINISTACK_DEFAULT_REGION,
  startTimeoutMs = 90_000,
  blockEgress = true,
  environment = {}
}: StartMiniStackOptions = {}): Promise<MiniStack> => {
  const started = performance.now();
  const newContainerName = () =>
    `${CONTAINER_NAME_PREFIX}${label.replace(/[^a-zA-Z0-9_.-]/g, '-')}-${randomBytes(6).toString('hex')}`;
  let containerName = newContainerName();
  let stopped = false;
  let volumes: string[] = [];
  const bridgeRelays: Server[] = [];
  const stop = async () => {
    if (stopped) return;
    for (const relay of bridgeRelays.splice(0)) relay.close();
    removeMiniStackContainer(docker, containerName, volumes);
    stopped = true;
  };
  try {
    // The image is Linux-only. A Windows-containers daemon (GitHub's windows-latest) fails later with an unhelpful
    // error; say what is actually missing.
    const daemonOs = docker(['info', '--format', '{{.OSType}}'], { allowFailure: true });
    if (daemonOs.exitCode !== 0) {
      throw new MiniStackError(`Docker is not available: ${daemonOs.stderr || 'docker info failed'}.`);
    }
    if (daemonOs.stdout !== 'linux') {
      throw new MiniStackError(
        `MiniStack needs a Docker daemon that runs Linux containers; this one runs ${daemonOs.stdout}.`
      );
    }
    let endpoint = '';
    for (let attempt = 1; ; attempt += 1) {
      docker(
        [
          'run',
          '--detach',
          '--name',
          containerName,
          '--publish',
          `127.0.0.1::${CONTAINER_PORT}`,
          // The address `forwardHostPort` relays to; Docker resolves it to the bridge gateway on Linux and to the host
          // proxy on Docker Desktop.
          '--add-host',
          `${DOCKER_HOST_NAME}:host-gateway`,
          ...(blockEgress ? ['--sysctl', 'net.ipv6.conf.all.disable_ipv6=1'] : []),
          // Code the emulator runs locally (Lambda functions, custom resources) must find the emulator and must never
          // hold anything but synthetic credentials.
          '--env',
          `AWS_ENDPOINT_URL=http://127.0.0.1:${CONTAINER_PORT}`,
          '--env',
          `AWS_ACCESS_KEY_ID=${MINISTACK_DEFAULT_ACCOUNT_ID}`,
          '--env',
          `AWS_SECRET_ACCESS_KEY=${SYNTHETIC_SECRET_ACCESS_KEY}`,
          '--env',
          'AWS_EC2_METADATA_DISABLED=true',
          ...Object.entries(environment).flatMap(([name, value]) => ['--env', `${name}=${value}`]),
          MINISTACK_IMAGE
        ],
        { timeoutMs: 180_000 }
      );
      volumes = (
        JSON.parse(docker(['inspect', '--format', '{{json .Mounts}}', containerName]).stdout) as Array<{
          Type: string;
          Name?: string;
        }>
      )
        .filter((mount) => mount.Type === 'volume' && mount.Name)
        .map((mount) => mount.Name!);
      if (blockEgress) {
        // The helper shares the emulator's network namespace and is the only process that ever holds NET_ADMIN.
        const routeTables = docker(
          [
            'run',
            '--rm',
            '--network',
            `container:${containerName}`,
            '--cap-add',
            'NET_ADMIN',
            '--entrypoint',
            'python',
            MINISTACK_IMAGE,
            '-c',
            DELETE_DEFAULT_ROUTES
          ],
          { timeoutMs: 120_000 }
        ).stdout;
        if (hasDefaultRoute(routeTables)) {
          throw new MiniStackError(`The container still has a default route:\n${routeTables}`);
        }
      }
      const port = /127\.0\.0\.1:(\d+)/.exec(docker(['port', containerName, `${CONTAINER_PORT}/tcp`]).stdout)?.[1];
      if (!port) throw new MiniStackError('MiniStack did not publish a loopback port.');
      endpoint = assertLocalAwsEndpoint(`http://127.0.0.1:${port}`);
      try {
        // oxlint-disable-next-line no-await-in-loop -- a lost port is retried with a new container.
        await waitForHealth(endpoint, containerName, Date.now() + startTimeoutMs);
        break;
      } catch (error) {
        if (!(error instanceof UnreachablePublishedPort) || attempt === 3) throw error;
        removeMiniStackContainer(docker, containerName, volumes);
        containerName = newContainerName();
        volumes = [];
      }
    }
    const imageId = docker(['inspect', '--format', '{{.Image}}', containerName]).stdout;
    // The access key is the account ID itself: MiniStack scopes S3 by the raw key when it is not a known account, and
    // credentials it gives Lambda workers are the function's account, so every path must name the same tenant.
    const defaultAccount: MiniStackAccount = {
      accountId: MINISTACK_DEFAULT_ACCOUNT_ID,
      credentials: synthetic(MINISTACK_DEFAULT_ACCOUNT_ID)
    };
    const clientConfig = (
      account: MiniStackAccount = defaultAccount,
      options: { region?: string } = {}
    ): MiniStackClientConfig => ({
      endpoint,
      region: options.region ?? region,
      credentials: account.credentials,
      maxAttempts: 2,
      forcePathStyle: true
    });
    const forwardedPorts = new Set<number>();
    let dockerHost: Promise<{ address: string; clientAddress: string }> | undefined;
    /** Where the Docker host is from inside the container, with the route to it when egress is blocked. */
    const reachDockerHost = async () => {
      const python = (script: string, ...args: string[]) =>
        docker(['exec', containerName, 'python', '-c', script, ...args]).stdout;
      const address = python(`import socket;print(socket.gethostbyname('${DOCKER_HOST_NAME}'))`);
      const [gateway = '', clientAddress = ''] = docker([
        'inspect',
        '--format',
        '{{range .NetworkSettings.Networks}}{{.Gateway}} {{.IPAddress}}{{end}}',
        containerName
      ]).stdout.split(' ');
      if (blockEgress) {
        docker(
          [
            'run',
            '--rm',
            '--network',
            `container:${containerName}`,
            '--cap-add',
            'NET_ADMIN',
            '--entrypoint',
            'python',
            MINISTACK_IMAGE,
            '-c',
            ADD_HOST_ROUTE,
            address,
            gateway
          ],
          { timeoutMs: 120_000 }
        );
      }
      return { address, clientAddress };
    };
    const forwardHostPort = async (port: number) => {
      if (stopped) throw new MiniStackError('MiniStack is stopped.');
      if (forwardedPorts.has(port)) return;
      dockerHost ??= reachDockerHost();
      const { address, clientAddress } = await dockerHost;
      // Docker Desktop delivers host-gateway connections to the host's loopback. Linux delivers them to the bridge
      // address, so a relay there admits this container and passes the connection on to loopback.
      let targetPort = port;
      if (isLocalAddress(address)) {
        const relay = await startBridgeRelay(address, clientAddress, port);
        bridgeRelays.push(relay.server);
        targetPort = relay.port;
      }
      const relayStart = docker(
        ['exec', containerName, 'python', '-c', LOOPBACK_RELAY, String(port), address, String(targetPort)],
        { allowFailure: true }
      );
      if (relayStart.exitCode !== 0 || relayStart.stdout !== 'ready') {
        throw new MiniStackError(`MiniStack could not listen on 127.0.0.1:${port}: ${relayStart.stderr}`);
      }
      const reached = docker(['exec', containerName, 'python', '-c', CONNECT_PROBE, address, String(targetPort)], {
        allowFailure: true
      });
      if (reached.exitCode !== 0) {
        throw new MiniStackError(
          `Code in MiniStack cannot reach this machine's port ${port} through ${address}:${targetPort}: ${reached.stderr}`
        );
      }
      forwardedPorts.add(port);
    };
    return {
      endpoint,
      region,
      image: MINISTACK_IMAGE,
      imageId,
      containerName,
      volumes,
      startupMs: Math.round(performance.now() - started),
      defaultAccount,
      account: () => {
        const accountId = randomAccountId();
        return { accountId, credentials: synthetic(accountId) };
      },
      clientConfig,
      forwardHostPort,
      childEnvironment: (account = defaultAccount, options = {}) => ({
        AWS_ACCESS_KEY_ID: account.credentials.accessKeyId,
        AWS_SECRET_ACCESS_KEY: account.credentials.secretAccessKey,
        AWS_REGION: options.region ?? region,
        AWS_DEFAULT_REGION: options.region ?? region,
        AWS_EC2_METADATA_DISABLED: 'true',
        AWS_SDK_LOAD_CONFIG: '0',
        AWS_CONFIG_FILE: '/nonexistent/stacktape-ministack/aws-config',
        AWS_SHARED_CREDENTIALS_FILE: '/nonexistent/stacktape-ministack/aws-credentials',
        AWS_ENDPOINT_URL: endpoint,
        AWS_ENDPOINT_URL_STS: endpoint,
        // A test preload may have turned configured endpoints off for its own process; the child must honor this one.
        AWS_IGNORE_CONFIGURED_ENDPOINT_URLS: 'false'
      }),
      logs: () => {
        const logs = docker(['logs', containerName], { allowFailure: true });
        return `${logs.stdout}\n${logs.stderr}`;
      },
      stop
    };
  } catch (error) {
    await stop().catch(() => undefined);
    throw error;
  }
};

/**
 * Stops the emulator when the process receives SIGINT or SIGTERM, then re-raises the signal so the process still ends
 * the way the sender asked. Use it in lanes that run as plain scripts; test runners call `stop()` from `afterAll`.
 */
export const stopMiniStackOnSignals = (ministack: MiniStack) => {
  const handler = (signal: NodeJS.Signals) => {
    void ministack.stop().finally(() => {
      process.off('SIGINT', handler);
      process.off('SIGTERM', handler);
      process.kill(process.pid, signal);
    });
  };
  process.once('SIGINT', handler);
  process.once('SIGTERM', handler);
  return () => {
    process.off('SIGINT', handler);
    process.off('SIGTERM', handler);
  };
};
