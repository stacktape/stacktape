/**
 * Qualifies the fixture through its own contract: the emulator answers on a loopback port with synthetic credentials,
 * two accounts from one container cannot see each other's state, code inside the container cannot reach the internet
 * over IPv4 or IPv6 and cannot put the default route back, a forwarded host loopback port is the one way it reaches
 * this machine, the opt-in Application Auto Scaling extension keeps AWS's rules for ECS services, and `stop()` removes the container and its volumes after
 * success and after a deliberate failure and refuses to report a cleanup Docker did not confirm. Needs Docker; run
 * with `pnpm --filter @stacktape/ministack test:fixture`.
 */
import { afterAll, describe, expect, test } from 'bun:test';
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import {
  ApplicationAutoScalingClient,
  DeregisterScalableTargetCommand,
  DescribeScalableTargetsCommand,
  DescribeScalingPoliciesCommand,
  PutScalingPolicyCommand,
  RegisterScalableTargetCommand
} from '@aws-sdk/client-application-auto-scaling';
import {
  CreateClusterCommand,
  CreateServiceCommand,
  DescribeServicesCommand,
  ECSClient,
  RegisterTaskDefinitionCommand
} from '@aws-sdk/client-ecs';
import { CreateBucketCommand, HeadBucketCommand, ListBucketsCommand, S3Client } from '@aws-sdk/client-s3';
import { GetCallerIdentityCommand, STSClient } from '@aws-sdk/client-sts';
import {
  assertLocalAwsEndpoint,
  hasDefaultRoute,
  MINISTACK_DEFAULT_ACCOUNT_ID,
  MINISTACK_IMAGE,
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

/** A loopback HTTP server on this machine that echoes the request path. */
const startServer = async () => {
  const server = createServer((request, response) => response.end(`host saw ${request.url}`));
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  return { server, port: (server.address() as { port: number }).port };
};

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

    // Two loopback servers on this machine: code in the emulator reaches the forwarded one at the same address and
    // nothing else on the host, under any address the Docker host has from a container.
    const forwarded = await startServer();
    const unforwarded = await startServer();
    // Asynchronous, so this process can answer while the container waits for it.
    const fetchInside = async (url: string) => {
      const child = Bun.spawn(
        [
          'docker',
          'exec',
          ministack.containerName,
          'python',
          '-c',
          `import urllib.request;print(urllib.request.urlopen('${url}',timeout=3).read().decode())`
        ],
        { stdout: 'pipe', stderr: 'pipe' }
      );
      const [stdout, stderr, status] = await Promise.all([
        new Response(child.stdout).text(),
        new Response(child.stderr).text(),
        child.exited
      ]);
      return { stdout: stdout.trim(), stderr, status };
    };
    try {
      const dockerHostAddresses = [
        spawnSync(
          'docker',
          [
            'run',
            '--rm',
            '--add-host',
            'probe-host:host-gateway',
            '--entrypoint',
            'python',
            MINISTACK_IMAGE,
            '-c',
            "import socket;print(socket.gethostbyname('probe-host'))"
          ],
          { encoding: 'utf8' }
        ).stdout.trim(),
        spawnSync(
          'docker',
          ['inspect', '--format', '{{range .NetworkSettings.Networks}}{{.Gateway}}{{end}}', ministack.containerName],
          { encoding: 'utf8' }
        ).stdout.trim()
      ];
      for (const address of dockerHostAddresses) expect(address).toMatch(/^\d+\.\d+\.\d+\.\d+$/);
      expect((await fetchInside(`http://127.0.0.1:${forwarded.port}/before`)).status).not.toBe(0);
      await ministack.forwardHostPort(forwarded.port);
      await ministack.forwardHostPort(forwarded.port);
      const reached = await fetchInside(`http://127.0.0.1:${forwarded.port}/from-ministack`);
      expect(reached.stdout, reached.stderr).toBe('host saw /from-ministack');
      const unreachable = [
        `http://127.0.0.1:${unforwarded.port}/`,
        ...dockerHostAddresses.flatMap((address) => [
          `http://${address}:${unforwarded.port}/`,
          `http://${address}:${forwarded.port}/`
        ])
      ];
      const attempts = await Promise.all(unreachable.map(fetchInside));
      attempts.forEach((attempt, index) =>
        expect(attempt.status, `${unreachable[index]} answered ${attempt.stdout}`).not.toBe(0)
      );
      const afterForward = spawnSync('docker', ['exec', ministack.containerName, 'python', '-c', EGRESS_PROBE], {
        encoding: 'utf8'
      });
      expect(JSON.parse(afterForward.stdout)).toMatchObject({
        ipv4: expect.stringMatching(/^blocked/),
        ipv6: expect.stringMatching(/^blocked/)
      });
    } finally {
      forwarded.server.close();
      unforwarded.server.close();
    }

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
    expect(dockerExists('container', `${containerName}-host-relay`)).toBe(true);
    await ministack.stop();
    expect(dockerExists('container', containerName)).toBe(false);
    expect(dockerExists('container', `${containerName}-host-relay`)).toBe(false);
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
  test('serves Application Auto Scaling for ECS services when asked, with AWS rules', async () => {
    const ministack = await startMiniStack({ label: 'fixture-autoscaling', applicationAutoScaling: true });
    const ecs = new ECSClient(ministack.clientConfig());
    const autoScaling = new ApplicationAutoScalingClient(ministack.clientConfig());
    try {
      const key = {
        ServiceNamespace: 'ecs',
        ResourceId: 'service/scaled/api',
        ScalableDimension: 'ecs:service:DesiredCount'
      } as const;
      // No service yet: AWS refuses to register a target for it.
      await expect(
        autoScaling.send(new RegisterScalableTargetCommand({ ...key, MinCapacity: 1, MaxCapacity: 2 }))
      ).rejects.toThrow(/ECS service doesn't exist/);
      await ecs.send(new CreateClusterCommand({ clusterName: 'scaled' }));
      const { taskDefinition } = await ecs.send(
        new RegisterTaskDefinitionCommand({
          family: 'api',
          containerDefinitions: [{ name: 'api', image: 'public.ecr.aws/docker/library/nginx:alpine', memory: 128 }]
        })
      );
      await ecs.send(
        new CreateServiceCommand({
          cluster: 'scaled',
          serviceName: 'api',
          taskDefinition: taskDefinition!.taskDefinitionArn,
          desiredCount: 1
        })
      );
      await expect(
        autoScaling.send(new PutScalingPolicyCommand({ ...key, PolicyName: 'cpu', PolicyType: 'StepScaling' }))
      ).rejects.toThrow(/No scalable target registered/);
      await expect(autoScaling.send(new RegisterScalableTargetCommand(key))).rejects.toThrow(
        /MinCapacity and MaxCapacity/
      );
      await expect(
        autoScaling.send(new RegisterScalableTargetCommand({ ...key, MinCapacity: 3, MaxCapacity: 2 }))
      ).rejects.toThrow(/Maximum capacity cannot be less than minimum capacity/);
      // Registration moves the service's desired count inside the range, here up to the minimum.
      await autoScaling.send(new RegisterScalableTargetCommand({ ...key, MinCapacity: 3, MaxCapacity: 5 }));
      const desiredCount = async () =>
        (await ecs.send(new DescribeServicesCommand({ cluster: 'scaled', services: ['api'] }))).services?.[0]
          ?.desiredCount;
      expect(await desiredCount()).toBe(3);
      const { ScalableTargets } = await autoScaling.send(
        new DescribeScalableTargetsCommand({ ServiceNamespace: 'ecs', ResourceIds: [key.ResourceId] })
      );
      expect(ScalableTargets?.map(({ MinCapacity, MaxCapacity }) => [MinCapacity, MaxCapacity])).toEqual([[3, 5]]);
      const { PolicyARN } = await autoScaling.send(
        new PutScalingPolicyCommand({
          ...key,
          PolicyName: 'cpu',
          PolicyType: 'TargetTrackingScaling',
          TargetTrackingScalingPolicyConfiguration: {
            TargetValue: 70,
            PredefinedMetricSpecification: { PredefinedMetricType: 'ECSServiceAverageCPUUtilization' }
          }
        })
      );
      expect(PolicyARN).toMatch(/^arn:aws:autoscaling:.*:policyName\/cpu$/);
      // Deregistering the target deletes its policies.
      await autoScaling.send(new DeregisterScalableTargetCommand(key));
      const remaining = await autoScaling.send(new DescribeScalingPoliciesCommand({ ServiceNamespace: 'ecs' }));
      expect(remaining.ScalingPolicies).toEqual([]);
    } finally {
      ecs.destroy();
      autoScaling.destroy();
      await ministack.stop();
    }
  }, 120_000);

  // A runner killed by `timeout` or Ctrl-C never reaches `afterAll`; aborted runs used to leave emulators running for
  // hours. GNU timeout signals the whole process group and then sends SIGKILL, so the owner gets no chance to clean up.
  test('removes the emulator, relay and volumes when the owning process group is killed before stop()', async () => {
    const owner = spawn(
      process.execPath,
      [
        '-e',
        `import { createServer } from 'node:http';
import { startMiniStack } from ${JSON.stringify(new URL('./fixture.ts', import.meta.url).pathname)};
const ministack = await startMiniStack({ label: 'fixture-killed' });
const server = createServer((_, response) => response.end('ok'));
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
await ministack.forwardHostPort(server.address().port);
console.log(JSON.stringify({ containerName: ministack.containerName, volumes: ministack.volumes }));
setInterval(() => undefined, 60_000);`
      ],
      { detached: true, stdio: ['ignore', 'pipe', 'inherit'] }
    );
    const orphan = await new Promise<{ containerName: string; volumes: string[] }>((resolve, reject) => {
      let output = '';
      owner.stdout!.on('data', (chunk) => {
        output += chunk;
        if (output.includes('\n')) resolve(JSON.parse(output));
      });
      owner.once('exit', (code) => reject(new Error(`The owner exited with ${code} before MiniStack started.`)));
    });
    const leftovers = () =>
      [
        dockerExists('container', orphan.containerName) && orphan.containerName,
        dockerExists('container', `${orphan.containerName}-host-relay`) && `${orphan.containerName}-host-relay`,
        ...orphan.volumes.filter((volume) => dockerExists('volume', volume))
      ].filter(Boolean);
    try {
      expect(leftovers()).toHaveLength(2 + orphan.volumes.length);
      process.kill(-owner.pid!, 'SIGKILL');
      const deadline = Date.now() + 30_000;
      // oxlint-disable-next-line no-await-in-loop -- polls Docker until the watchdog has removed everything.
      while (leftovers().length > 0 && Date.now() < deadline) await Bun.sleep(500);
      expect(leftovers()).toEqual([]);
    } finally {
      spawnSync('docker', ['rm', '--force', '--volumes', `${orphan.containerName}-host-relay`], { stdio: 'ignore' });
      spawnSync('docker', ['rm', '--force', '--volumes', orphan.containerName], { stdio: 'ignore' });
    }
  }, 180_000);
});
