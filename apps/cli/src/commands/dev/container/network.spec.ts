import { afterEach, expect, test } from 'bun:test';
import { connect, createServer, type AddressInfo, type Server } from 'node:net';
import { isInIpv4Subnet, parseBridgeIpam, pointLoopbackAtDockerHost, startLoopbackRelay } from './network';

const servers: { close: () => unknown }[] = [];
afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => server.close()));
});

/** A loopback-only server that answers each connection with `greeting`, as a local database's published port does. */
const loopbackServer = async (greeting: string) => {
  const server = createServer((socket) => socket.end(greeting));
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  servers.push(server);
  return (server.address() as AddressInfo).port;
};

const read = (host: string, port: number) =>
  new Promise<string>((resolve) => {
    let data = '';
    const socket = connect({ host, port });
    socket.on('data', (chunk) => (data += chunk));
    socket.on('close', () => resolve(data));
    socket.on('error', () => resolve(data));
  });

test('the default bridge gives the IPv4 gateway that host.docker.internal points at', () => {
  expect(
    parseBridgeIpam('[{"Subnet":"fd00::/64","Gateway":"fd00::1"},{"Subnet":"172.17.0.0/16","Gateway":"172.17.0.1"}]')
  ).toEqual({ subnet: '172.17.0.0/16', gateway: '172.17.0.1' });
  expect(parseBridgeIpam('[]')).toBeUndefined();
  expect(parseBridgeIpam('')).toBeUndefined();
});

test('only clients in the bridge subnet count as containers', () => {
  expect(isInIpv4Subnet('172.17.0.5', '172.17.0.0/16')).toBeTrue();
  expect(isInIpv4Subnet('::ffff:172.17.255.254', '172.17.0.0/16')).toBeTrue();
  expect(isInIpv4Subnet('172.18.0.5', '172.17.0.0/16')).toBeFalse();
  expect(isInIpv4Subnet('192.168.1.20', '172.17.0.0/16')).toBeFalse();
  expect(isInIpv4Subnet('::1', '172.17.0.0/16')).toBeFalse();
});

test("a container's variables reach this machine's databases, tunnels and other containers, not its own loopback", () => {
  const environment = pointLoopbackAtDockerHost(
    {
      DATABASE_URL: 'postgresql://app:secret@127.0.0.1:5433/app',
      REDIS_URL: 'redis://:pw@localhost:6380',
      AWS_ENDPOINT_URL_DYNAMODB: 'http://127.0.0.1:12200',
      STP_OTHER_URL: 'http://127.0.0.1:8082',
      SELF_URL: 'http://localhost:8080',
      PORT: '8080'
    },
    [5433, 6380, 12200, 8082]
  );
  expect(environment).toEqual({
    DATABASE_URL: 'postgresql://app:secret@host.docker.internal:5433/app',
    REDIS_URL: 'redis://:pw@host.docker.internal:6380',
    AWS_ENDPOINT_URL_DYNAMODB: 'http://host.docker.internal:12200',
    STP_OTHER_URL: 'http://host.docker.internal:8082',
    SELF_URL: 'http://localhost:8080',
    PORT: '8080'
  });
});

test('a relay passes connections from allowed clients to the loopback port and refuses others', async () => {
  const port = await loopbackServer('loopback-only');
  // 127.0.0.2 stands in for the bridge gateway: an address of this machine where the database does not listen.
  expect(await read('127.0.0.2', port)).toBe('');
  const relay = await startLoopbackRelay({ bindAddress: '127.0.0.2', port, subnet: '127.0.0.0/8' });
  servers.push(relay!);
  expect(await read('127.0.0.2', port)).toBe('loopback-only');

  const otherPort = await loopbackServer('not for you');
  const strict = await startLoopbackRelay({ bindAddress: '127.0.0.2', port: otherPort, subnet: '172.17.0.0/16' });
  servers.push(strict!);
  expect(await read('127.0.0.2', otherPort)).toBe('');
});

test('a port that already listens on every address needs no relay', async () => {
  const wildcard: Server = createServer((socket) => socket.end('published'));
  await new Promise<void>((resolve) => wildcard.listen(0, '0.0.0.0', resolve));
  servers.push(wildcard);
  const port = (wildcard.address() as AddressInfo).port;
  expect(await startLoopbackRelay({ bindAddress: '127.0.0.2', port })).toBeUndefined();
  expect(await read('127.0.0.2', port)).toBe('published');
});
