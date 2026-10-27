import type { Server, Socket } from 'node:net';
import { networkInterfaces } from 'node:os';
import { connect, createServer } from 'node:net';
import { execDocker, getDockerHostAddress } from '@utils/docker';

/** The name a dev container uses for this machine, on every platform. */
export const DOCKER_HOST_NAME = 'host.docker.internal';

/**
 * How dev containers reach this machine and get their ports.
 *
 * - `bridge`: each container has its own network, so two stages of one app on this machine can both listen on any port
 *   inside their containers. Declared ports are published on the host with the stage's offset, and the container
 *   reaches this machine as `host.docker.internal`. Docker Desktop forwards that name to this machine's loopback. Native
 *   Linux Docker sends it to the bridge's gateway address, where loopback-only listeners (local databases, SSM tunnels)
 *   do not listen, so dev mode relays their ports from `gatewayAddress` to loopback (`ensureLoopbackRelays`).
 * - `host`: the container shares this machine's network. Only when the bridge gateway is not an address of this
 *   machine (rootless Docker), so a relay cannot listen on it. Ports cannot be remapped then.
 */
export type DevContainerNetwork =
  | { mode: 'bridge'; dockerArgs: string[]; gatewayAddress?: string; subnet?: string }
  | { mode: 'host'; dockerArgs: string[] };

let resolvedNetwork: Promise<DevContainerNetwork> | undefined;

export const resolveDevContainerNetwork = (): Promise<DevContainerNetwork> =>
  (resolvedNetwork ??= (async (): Promise<DevContainerNetwork> => {
    // Docker Desktop (macOS, Windows, WSL with Docker Desktop) runs containers in a VM that already maps the name.
    if ((await getDockerHostAddress()) === DOCKER_HOST_NAME) return { mode: 'bridge', dockerArgs: [] };
    const { stdout } = await execDocker(['network', 'inspect', 'bridge', '--format', '{{json .IPAM.Config}}'], {
      skipHandleError: true
    }).catch(() => ({ stdout: '' }));
    const ipv4 = parseBridgeIpam(stdout);
    if (!ipv4 || !isLocalAddress(ipv4.gateway)) return { mode: 'host', dockerArgs: [] };
    return {
      mode: 'bridge',
      dockerArgs: [`--add-host ${DOCKER_HOST_NAME}:${ipv4.gateway}`],
      gatewayAddress: ipv4.gateway,
      subnet: ipv4.subnet
    };
  })());

/** The IPv4 subnet and gateway of Docker's default bridge, from `docker network inspect bridge`. */
export const parseBridgeIpam = (output: string): { subnet: string; gateway: string } | undefined => {
  try {
    const configs = JSON.parse(output) as { Subnet?: string; Gateway?: string }[];
    const ipv4 = configs?.find(({ Subnet, Gateway }) => Subnet?.includes('.') && Gateway?.includes('.'));
    return ipv4 ? { subnet: ipv4.Subnet!, gateway: ipv4.Gateway! } : undefined;
  } catch {
    return undefined;
  }
};

const isLocalAddress = (address: string) =>
  Object.values(networkInterfaces()).some((entries) => entries?.some((entry) => entry.address === address));

const ipv4ToNumber = (address: string) => address.split('.').reduce((result, part) => result * 256 + Number(part), 0);

export const isInIpv4Subnet = (address: string, subnet: string) => {
  const [base, bits] = subnet.split('/');
  const plain = address.replace(/^::ffff:/, '');
  if (!/^\d+\.\d+\.\d+\.\d+$/.test(plain)) return false;
  const size = 2 ** (32 - Number(bits));
  return Math.floor(ipv4ToNumber(plain) / size) === Math.floor(ipv4ToNumber(base) / size);
};

/**
 * Points a container's variables at this machine: `localhost` or `127.0.0.1` followed by one of `hostPorts` (a local
 * database, an SSM tunnel, another dev container) becomes `host.docker.internal`. Other loopback addresses stay, such as
 * an app's URL of itself.
 */
export const pointLoopbackAtDockerHost = <T extends Record<string, unknown>>(
  environment: T,
  hostPorts: Iterable<number>
): T => {
  const ports = new Set([...hostPorts].map(String));
  return Object.fromEntries(
    Object.entries(environment).map(([name, value]) => [
      name,
      typeof value === 'string'
        ? value.replace(/\b(?:localhost|127\.0\.0\.1):(\d+)\b/g, (match, port: string) =>
            ports.has(port) ? `${DOCKER_HOST_NAME}:${port}` : match
          )
        : value
    ])
  ) as T;
};

/**
 * Accepts connections on `bindAddress:port` from clients in `subnet` (the containers) and passes them to the same port
 * on this machine's loopback. Resolves `undefined` when the port is in use on every address already, as a published
 * container port is: containers reach that one through the gateway without a relay.
 */
export const startLoopbackRelay = async ({
  bindAddress,
  port,
  subnet
}: {
  bindAddress: string;
  port: number;
  subnet?: string;
}): Promise<{ close: () => Promise<void> } | undefined> => {
  const sockets = new Set<Socket>();
  const track = (socket: Socket) => {
    sockets.add(socket);
    socket.once('close', () => sockets.delete(socket));
  };
  // Half-open: a client that has sent everything can still read the answer, and each side's end passes through.
  const server: Server = createServer({ allowHalfOpen: true }, (client) => {
    if (subnet && !isInIpv4Subnet(client.remoteAddress ?? '', subnet)) {
      client.destroy();
      return;
    }
    const upstream = connect({ port, host: '127.0.0.1', allowHalfOpen: true });
    track(client);
    track(upstream);
    client.pipe(upstream).pipe(client);
    client.on('error', () => upstream.destroy());
    upstream.on('error', () => client.destroy());
  });
  return new Promise((resolve, reject) => {
    server.once('error', (error: NodeJS.ErrnoException) =>
      error.code === 'EADDRINUSE' ? resolve(undefined) : reject(error)
    );
    server.listen(port, bindAddress, () =>
      resolve({
        close: () =>
          new Promise<void>((done) => {
            server.close(() => done());
            for (const socket of sockets) socket.destroy();
          })
      })
    );
  });
};

const relays = new Map<number, ReturnType<typeof startLoopbackRelay>>();

/** Relays each of `ports` once per session (see `DevContainerNetwork`); a no-op without a gateway to listen on. */
export const ensureLoopbackRelays = async (network: DevContainerNetwork, ports: Iterable<number>) => {
  if (network.mode !== 'bridge' || !network.gatewayAddress) return;
  const { gatewayAddress, subnet } = network;
  await Promise.all(
    [...new Set(ports)].map((port) => {
      let relay = relays.get(port);
      if (!relay) {
        relay = startLoopbackRelay({ bindAddress: gatewayAddress, port, subnet });
        relays.set(port, relay);
      }
      return relay;
    })
  );
};

export const stopLoopbackRelays = async () => {
  const started = await Promise.all([...relays.values()].map((relay) => relay.catch(() => undefined)));
  relays.clear();
  await Promise.all(started.map((relay) => relay?.close()));
};
