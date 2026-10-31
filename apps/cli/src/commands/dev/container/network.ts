import type { AddressInfo, Server, Socket } from 'node:net';
import { networkInterfaces } from 'node:os';
import { connect, createServer } from 'node:net';
import { tuiManager } from '@application-services/tui-manager';
import { execDocker, getDockerHostAddress } from '@utils/docker';

/** The name a dev container uses for this machine, on every platform. */
export const DOCKER_HOST_NAME = 'host.docker.internal';

/**
 * How dev containers reach this machine and get their ports.
 *
 * - `bridge`: each container has its own network, so two stages of one app on this machine can both listen on any port
 *   inside their containers. Declared ports get a stable host port with the stage's offset on this machine's loopback
 *   (`startPortSwitch`), and the container reaches this machine as `host.docker.internal`. Docker Desktop forwards
 *   that name to this machine's loopback. Native Linux Docker sends it to the bridge's gateway address, where
 *   loopback-only listeners (local databases, SSM tunnels, the stable ports of dev containers) do not listen, so dev
 *   mode relays their ports from `gatewayAddress` to loopback (`ensureLoopbackRelays`).
 * - `host`: the container shares this machine's network. Only when the bridge gateway is not an address of this
 *   machine (rootless Docker), so a relay cannot listen on it. Ports cannot be remapped then.
 */
export type DevContainerNetwork =
  | { mode: 'bridge'; dockerArgs: string[]; gatewayAddress?: string; subnet?: string }
  | { mode: 'host'; dockerArgs: string[] };

/**
 * The host at which processes on this machine reach a dev container: its stable host port is on loopback
 * (`startPortSwitch`, or the port itself on the host network). Native frontends, hooks and scripts use this address as
 * it is; a container on its own network gets it with loopback replaced by `DOCKER_HOST_NAME` (`pointLoopbackAtHost`).
 * Docker Desktop (Windows, macOS) resolves `host.docker.internal` only inside its containers, so a native process given
 * that name failed with `getaddrinfo ENOTFOUND` (r2bd).
 */
export const LOCAL_WORKLOAD_HOST = '127.0.0.1';

/** The injected parameter of a local container workload: `address` (host:port) for a private service, else `url`. */
export const getLocalWorkloadEndpoint = ({ resourceType, hostPort }: { resourceType: string; hostPort: number }) =>
  resourceType === 'private-service'
    ? { param: 'address' as const, value: `${LOCAL_WORKLOAD_HOST}:${hostPort}` }
    : { param: 'url' as const, value: `http://${LOCAL_WORKLOAD_HOST}:${hostPort}` };

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

type Forwarder = { close: () => Promise<void> };

/**
 * Listens on `bindAddress:port` and passes each connection it accepts to `targetPort()` on this machine's loopback. A
 * connection the target refuses, or that arrives before there is a target, is closed, as Docker's port proxy closes
 * one to a container that does not listen yet. An error after the listener started (too many open files) is reported
 * once per kind and the listener goes on: an unhandled one ended the dev session.
 */
const startForwarder = ({
  bindAddress,
  port,
  targetPort,
  accepts = () => true
}: {
  bindAddress: string;
  port: number;
  targetPort: () => number | undefined;
  accepts?: (client: Socket) => boolean;
}): Promise<Forwarder> => {
  const sockets = new Set<Socket>();
  const track = (socket: Socket) => {
    sockets.add(socket);
    socket.once('close', () => sockets.delete(socket));
  };
  // Half-open: a client that has sent everything can still read the answer, and each side's end passes through.
  const server: Server = createServer({ allowHalfOpen: true }, (client) => {
    const target = targetPort();
    if (target === undefined || !accepts(client)) {
      client.destroy();
      return;
    }
    const upstream = connect({ port: target, host: '127.0.0.1', allowHalfOpen: true });
    track(client);
    track(upstream);
    client.pipe(upstream).pipe(client);
    client.on('error', () => upstream.destroy());
    upstream.on('error', () => client.destroy());
  });
  const reported = new Set<string>();
  const reportError = (error: NodeJS.ErrnoException) => {
    const kind = error.code ?? error.message;
    if (reported.has(kind)) return;
    reported.add(kind);
    tuiManager.warn(`Forwarding connections on ${bindAddress}:${port} failed: ${error.message}`);
  };
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, bindAddress, () => {
      server.off('error', reject);
      server.on('error', reportError);
      resolve({
        close: () =>
          new Promise<void>((done) => {
            server.close(() => done());
            for (const socket of sockets) socket.destroy();
          })
      });
    });
  });
};

/**
 * Accepts connections on `bindAddress:port` from clients in `subnet` (the containers) and passes them to the same port
 * on this machine's loopback. Resolves `undefined` when the port is in use on every address already: containers reach
 * such a port through the gateway without a relay.
 */
export const startLoopbackRelay = async ({
  bindAddress,
  port,
  subnet
}: {
  bindAddress: string;
  port: number;
  subnet?: string;
}): Promise<Forwarder | undefined> =>
  startForwarder({
    bindAddress,
    port,
    targetPort: () => port,
    accepts: (client) => !subnet || isInIpv4Subnet(client.remoteAddress ?? '', subnet)
  }).catch((error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') return undefined;
    throw error;
  });

/**
 * The stable host port of a dev container on its own network, on this machine's loopback only. Each run of the
 * container publishes its port on a spare loopback port, and the switch passes connections to the run that serves:
 * a rebuilt container starts next to the running one and takes over only once it serves, so a new build that crashes
 * on start leaves the previous one serving. Local databases, other containers (through `ensureLoopbackRelays`),
 * frontends and the dev proxy keep using the stable port.
 */
export const startPortSwitch = async ({ port, targetPort }: { port: number; targetPort?: number }) => {
  let target = targetPort;
  const listeners = [await startForwarder({ bindAddress: '127.0.0.1', port, targetPort: () => target })];
  // A client that resolves `localhost` to ::1 first. A machine without IPv6 loopback has no such client.
  const ipv6 = await startForwarder({ bindAddress: '::1', port, targetPort: () => target }).catch(() => undefined);
  if (ipv6) listeners.push(ipv6);
  return {
    setTarget: (port: number) => {
      target = port;
    },
    close: () => Promise.all(listeners.map((listener) => listener.close())).then(() => undefined)
  };
};

/** A port on this machine's loopback that nothing listens on now, for a container run to publish. */
export const findSpareLoopbackPort = () =>
  new Promise<number>((resolve, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as AddressInfo;
      server.close(() => resolve(port));
    });
  });

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
        // A relay that failed to start is tried again by the next container start or rebuild.
        relay.catch(() => relays.delete(port));
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
