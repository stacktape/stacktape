/**
 * Qualifies the fixture through its own contract: the emulator answers on a loopback port with synthetic credentials,
 * two accounts from one container cannot see each other's state, code inside the container cannot reach the internet
 * over IPv4 or IPv6 and cannot put the default route back, and `stop()` removes the container and its volumes after
 * success and after a deliberate failure and refuses to report a cleanup Docker did not confirm. Needs Docker; run
 * with `pnpm --filter @stacktape/ministack test:fixture`.
 */
import { afterAll, describe, expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { CreateBucketCommand, HeadBucketCommand, ListBucketsCommand, S3Client } from '@aws-sdk/client-s3';
import { GetCallerIdentityCommand, STSClient } from '@aws-sdk/client-sts';
import {
  assertLocalAwsEndpoint,
  hasDefaultRoute,
  MINISTACK_DEFAULT_ACCOUNT_ID,
  removeMiniStackContainer,
  startMiniStack,
  verifyMiniStackRemoval,
  type DockerResult,
  type DockerRunner,
  type MiniStack
} from './fixture';

const dockerExists = (kind: 'container' | 'volume', name: string) =>
  spawnSync('docker', [...(kind === 'volume' ? ['volume'] : []), 'inspect', name], { stdio: 'ignore' }).status === 0;

/** What code running inside the emulator can do with the network; printed as JSON for the assertions. */
const EGRESS_PROBE = `import json,socket,struct
result={}
for label,host,family in (('ipv4','1.1.1.1',socket.AF_INET),('ipv6','2606:4700:4700::1111',socket.AF_INET6)):
  try:
    s=socket.socket(family,socket.SOCK_STREAM); s.settimeout(3); s.connect((host,443)); result[label]='connected'
  except OSError as error: result[label]='blocked: '+str(error.errno)
s=socket.socket(socket.AF_NETLINK,socket.SOCK_RAW,socket.NETLINK_ROUTE); s.bind((0,0))
header=struct.pack('IHHII',36,24,0x401|0x400,1,0)
route=struct.pack('BBBBBBBBI',socket.AF_INET,0,0,0,254,4,1,0,0)
gateway=struct.pack('HH',8,5)+bytes([172,17,0,1])
s.send(header+route+gateway); reply=s.recv(65535); result['restore_errno']=struct.unpack_from('i',reply,16)[0]
print(json.dumps(result))`;

/** One `/proc/net/ipv6_route` line: destination, prefix length, source, source prefix, gateway, metric, refs, use, flags, device. */
const ipv6Entry = (destination: string, prefix: string, device: string) =>
  `${destination} ${prefix} 00000000000000000000000000000000 00 fe800000000000000000000000000001 00000400 00000001 00000000 00000003 ${device}\n`;

/** A Docker stand-in that answers only the commands a scenario scripted. */
const scripted =
  (answers: Record<string, DockerResult>): DockerRunner =>
  (args) =>
    answers[args.join(' ')] ?? { exitCode: 1, stdout: '', stderr: `unexpected docker ${args.join(' ')}` };

const started: MiniStack[] = [];
afterAll(async () => {
  await Promise.all(started.map((ministack) => ministack.stop()));
});

describe('MiniStack fixture', () => {
  test('rejects any AWS endpoint that is not a loopback port', () => {
    expect(() => assertLocalAwsEndpoint('https://s3.eu-west-1.amazonaws.com')).toThrow(/not a loopback emulator/);
    expect(() => assertLocalAwsEndpoint('http://localhost:4566')).toThrow(/not a loopback emulator/);
    expect(() => assertLocalAwsEndpoint('http://127.0.0.1')).toThrow(/not a loopback emulator/);
    expect(assertLocalAwsEndpoint('http://127.0.0.1:4566')).toBe('http://127.0.0.1:4566');
  });

  test('recognizes IPv4 and IPv6 default routes in the kernel tables', () => {
    const ipv4 = 'Iface\tDestination\tGateway\neth0\t000011AC\t00000000\n';
    expect(hasDefaultRoute(`${ipv4}\nIPV6\n`)).toBe(false);
    expect(hasDefaultRoute(`Iface\tDestination\neth0\t00000000\t010011AC\n\nIPV6\n`)).toBe(true);
    expect(hasDefaultRoute(`${ipv4}\nIPV6\n${ipv6Entry('0'.repeat(32), '00', 'eth0')}`)).toBe(true);
    expect(hasDefaultRoute(`${ipv4}\nIPV6\n${ipv6Entry(`${'0'.repeat(31)}1`, '80', 'lo')}`)).toBe(false);
    // What the kernel keeps when IPv6 is disabled: unreachable ::/0 entries on the loopback device.
    expect(hasDefaultRoute(`${ipv4}\nIPV6\n${ipv6Entry('0'.repeat(32), '00', 'lo')}`)).toBe(false);
  });

  test('cleanup counts only a Docker "no such object" answer as removed', () => {
    const gone = { exitCode: 1, stdout: '', stderr: 'Error: No such object: x' };
    const present = { exitCode: 0, stdout: '{}', stderr: '' };
    const daemonDown = { exitCode: 1, stdout: '', stderr: 'Cannot connect to the Docker daemon' };
    expect(() =>
      verifyMiniStackRemoval(scripted({ 'inspect --type container c': gone, 'volume inspect v': gone }), 'c', ['v'])
    ).not.toThrow();
    expect(() =>
      verifyMiniStackRemoval(scripted({ 'inspect --type container c': gone, 'volume inspect v': present }), 'c', ['v'])
    ).toThrow(/left volume v behind/);
    expect(() =>
      verifyMiniStackRemoval(scripted({ 'inspect --type container c': daemonDown, 'volume inspect v': gone }), 'c', [
        'v'
      ])
    ).toThrow(/could not be verified.*Cannot connect/);
    expect(() =>
      removeMiniStackContainer(
        scripted({
          'rm --force --volumes c': daemonDown,
          'inspect --type container c': gone,
          'volume inspect v': gone
        }),
        'c',
        ['v']
      )
    ).toThrow(/docker rm c failed/);
  });

  test('starts ready on a loopback port, isolates accounts, leaves no way out of the container and cleans up', async () => {
    const ministack = await startMiniStack({ label: 'fixture-test' });
    started.push(ministack);
    expect(ministack.endpoint).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);
    expect(ministack.startupMs).toBeGreaterThan(0);
    expect(dockerExists('container', ministack.containerName)).toBe(true);

    // Code inside the emulator: no IPv4 route out, IPv6 disabled, and no capability to add a route back.
    const probe = spawnSync('docker', ['exec', ministack.containerName, 'python', '-c', EGRESS_PROBE], {
      encoding: 'utf8'
    });
    expect(probe.status, probe.stderr).toBe(0);
    const egress = JSON.parse(probe.stdout) as { ipv4: string; ipv6: string; restore_errno: number };
    expect(egress.ipv4).toMatch(/^blocked/);
    expect(egress.ipv6).toMatch(/^blocked/);
    expect(egress.restore_errno).toBe(-1);

    const environment = ministack.childEnvironment();
    expect(Object.keys(environment).some((name) => /PROFILE/.test(name))).toBe(false);
    expect(environment.AWS_ENDPOINT_URL).toBe(ministack.endpoint);
    expect(environment.AWS_SECRET_ACCESS_KEY).toContain('synthetic');
    expect(environment.AWS_ACCESS_KEY_ID).toBe(MINISTACK_DEFAULT_ACCOUNT_ID);

    const first = ministack.account();
    const second = ministack.account();
    expect(first.accountId).not.toBe(second.accountId);
    const sts = new STSClient(ministack.clientConfig(first));
    const identity = await sts.send(new GetCallerIdentityCommand({}));
    expect(identity.Account).toBe(first.accountId);
    const defaultIdentity = await new STSClient(ministack.clientConfig()).send(new GetCallerIdentityCommand({}));
    expect(defaultIdentity.Account).toBe(MINISTACK_DEFAULT_ACCOUNT_ID);

    const firstS3 = new S3Client(ministack.clientConfig(first));
    const secondS3 = new S3Client(ministack.clientConfig(second));
    await firstS3.send(
      new CreateBucketCommand({
        Bucket: 'owned-by-first',
        CreateBucketConfiguration: { LocationConstraint: 'eu-west-1' }
      })
    );
    await firstS3.send(new HeadBucketCommand({ Bucket: 'owned-by-first' }));
    const seenBySecond = (await secondS3.send(new ListBucketsCommand({}))).Buckets ?? [];
    expect(seenBySecond.map(({ Name }) => Name)).not.toContain('owned-by-first');

    const { containerName, volumes } = ministack;
    await ministack.stop();
    expect(dockerExists('container', containerName)).toBe(false);
    for (const volume of volumes) expect(dockerExists('volume', volume)).toBe(false);
    await ministack.stop();
  }, 120_000);

  test('removes the container after a failure in the caller', async () => {
    let ministack: MiniStack | undefined;
    await expect(
      (async () => {
        ministack = await startMiniStack({ label: 'fixture-failure' });
        try {
          throw new Error('deliberate failure after startup');
        } finally {
          await ministack.stop();
        }
      })()
    ).rejects.toThrow('deliberate failure after startup');
    expect(ministack).toBeDefined();
    expect(dockerExists('container', ministack!.containerName)).toBe(false);
    for (const volume of ministack!.volumes) expect(dockerExists('volume', volume)).toBe(false);
  }, 120_000);
});
