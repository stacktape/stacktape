import { spawnSync } from 'node:child_process';
import { randomBytes, randomInt } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';

/**
 * The one local AWS emulator the tests use. Pin a new release only after the deploy loop in `apps/cli/tests/ministack`
 * and the Console lanes that use this fixture pass against it; the digest is the tag's `linux/amd64` image.
 */
export const MINISTACK_IMAGE =
  'ministackorg/ministack:1.5.26@sha256:f90981c85c9b431d819afa8bdad9735d1434e22e42f1deb8c99a0bcaf30363e7';
export const MINISTACK_DEFAULT_REGION = 'eu-west-1';
/** The account MiniStack provisions CloudFormation stacks in and gives to code it runs. */
export const MINISTACK_DEFAULT_ACCOUNT_ID = '000000000000';
const CONTAINER_PORT = 4566;
const SYNTHETIC_SECRET_ACCESS_KEY = 'stacktape-ministack-synthetic-not-a-real-key';
const CONTAINER_NAME_PREFIX = 'stacktape-ministack-';

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
   * it over an otherwise minimal environment; never spread `process.env` under it.
   */
  childEnvironment: (account?: MiniStackAccount, options?: { region?: string }) => Record<string, string>;
  /** The container's combined stdout and stderr so far. */
  logs: () => string;
  /** Removes the container with its volumes and verifies both are gone. Safe to call twice. */
  stop: () => Promise<void>;
};

export type StartMiniStackOptions = {
  /** Appears in the container name, which is otherwise random. */
  label?: string;
  region?: string;
  /** How long the emulator may take to answer its health check. */
  startTimeoutMs?: number;
  /**
   * Remove the container's default route after it starts, so code the emulator runs (Lambda functions, custom
   * resources) can reach the emulator and nothing outside the machine. Needs the image's Python, which the pinned
   * image has. On by default.
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

const docker = (
  args: string[],
  { allowFailure = false, timeoutMs = 60_000 }: { allowFailure?: boolean; timeoutMs?: number } = {}
) => {
  const result = spawnSync('docker', args, { encoding: 'utf8', timeout: timeoutMs, stdio: ['ignore', 'pipe', 'pipe'] });
  const exitCode = result.status ?? (result.error ? 1 : 0);
  if (!allowFailure && exitCode !== 0) {
    const detail = result.error?.message ?? result.stderr.trim();
    throw new MiniStackError(`docker ${args.slice(0, 2).join(' ')} failed: ${detail}`);
  }
  return { exitCode, stdout: result.stdout?.trim() ?? '', stderr: result.stderr?.trim() ?? '' };
};

/**
 * Deletes every IPv4 default route through the kernel's netlink socket; the image has no `ip` binary. Prints the
 * routing table afterwards so the caller can verify.
 */
const DELETE_DEFAULT_ROUTE = `import socket,struct
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
print(open('/proc/net/route').read())`;

const hasDefaultRoute = (routeTable: string) =>
  routeTable
    .split('\n')
    .slice(1)
    .some((line) => line.split(/\s+/)[1] === '00000000');

const randomAccountId = () => `${randomInt(1, 10)}${Array.from({ length: 11 }, () => randomInt(0, 10)).join('')}`;

const synthetic = (accessKeyId: string): MiniStackCredentials => ({
  accessKeyId,
  secretAccessKey: SYNTHETIC_SECRET_ACCESS_KEY
});

/** Waits until the emulator answers its health endpoint, failing fast when the container dies first. */
const waitForHealth = async (endpoint: string, containerName: string, deadline: number) => {
  while (Date.now() < deadline) {
    const state = docker(['inspect', '--format', '{{.State.Running}}', containerName], { allowFailure: true });
    if (state.exitCode !== 0 || state.stdout !== 'true') {
      const logs = docker(['logs', '--tail', '40', containerName], { allowFailure: true });
      throw new MiniStackError(`MiniStack exited before becoming ready.\n${logs.stdout}\n${logs.stderr}`);
    }
    try {
      // oxlint-disable-next-line no-await-in-loop -- polling one listener until it answers.
      const response = await fetch(`${endpoint}/_ministack/health`, { signal: AbortSignal.timeout(500) });
      if (response.ok) return;
    } catch {
      // The listener is still starting.
    }
    // oxlint-disable-next-line no-await-in-loop -- the poll interval.
    await delay(100);
  }
  throw new MiniStackError(`MiniStack did not answer its health check within the start timeout (${containerName}).`);
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
  const containerName = `${CONTAINER_NAME_PREFIX}${label.replace(/[^a-zA-Z0-9_.-]/g, '-')}-${randomBytes(6).toString('hex')}`;
  let stopped = false;
  let volumes: string[] = [];
  const stop = async () => {
    if (stopped) return;
    stopped = true;
    docker(['rm', '--force', '--volumes', containerName], { allowFailure: true });
    const remaining = [
      ...(docker(['inspect', containerName], { allowFailure: true }).exitCode === 0
        ? [`container ${containerName}`]
        : []),
      ...volumes
        .filter((volume) => docker(['volume', 'inspect', volume], { allowFailure: true }).exitCode === 0)
        .map((volume) => `volume ${volume}`)
    ];
    if (remaining.length > 0) {
      throw new MiniStackError(`MiniStack cleanup left ${remaining.join(', ')} behind.`);
    }
  };
  try {
    docker(
      [
        'run',
        '--detach',
        '--name',
        containerName,
        '--publish',
        `127.0.0.1::${CONTAINER_PORT}`,
        ...(blockEgress ? ['--cap-add', 'NET_ADMIN'] : []),
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
      const routeTable = docker(['exec', containerName, 'python', '-c', DELETE_DEFAULT_ROUTE]).stdout;
      if (hasDefaultRoute(routeTable)) {
        throw new MiniStackError(`The container still has a default route:\n${routeTable}`);
      }
    }
    const port = /127\.0\.0\.1:(\d+)/.exec(docker(['port', containerName, `${CONTAINER_PORT}/tcp`]).stdout)?.[1];
    if (!port) throw new MiniStackError('MiniStack did not publish a loopback port.');
    const endpoint = assertLocalAwsEndpoint(`http://127.0.0.1:${port}`);
    await waitForHealth(endpoint, containerName, Date.now() + startTimeoutMs);
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
