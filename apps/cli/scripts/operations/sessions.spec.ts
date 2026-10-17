import { afterAll, beforeAll, expect, test } from 'bun:test';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  CloudWatchLogsClient,
  CreateLogGroupCommand,
  CreateLogStreamCommand,
  PutLogEventsCommand
} from '@aws-sdk/client-cloudwatch-logs';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { externalToolPath } from '../../src/utils/external-tools';
import { buildOperationsCli, createOperationsFixture, seedDeployedStack, targetArgs } from './cli-process';
import { parseCliJsonl } from '../verify-source-cli-aws-readonly';
import { toQueryXml } from './loopback-aws';

let cli: Awaited<ReturnType<typeof buildOperationsCli>>;
let tools: string;
const token = 'j9-synthetic-session-token-never-in-output';
beforeAll(async () => {
  cli = await buildOperationsCli();
  tools = await mkdtemp(join(tmpdir(), 'stacktape-j9-tools-'));
  const plugin = externalToolPath({ tool: 'session-manager-plugin', toolsDirectory: tools });
  await mkdir(dirname(plugin), { recursive: true });
  const source = join(tools, 'plugin.ts');
  await writeFile(
    source,
    `import { writeFileSync } from 'node:fs';
const session = JSON.parse(process.argv[2]);
writeFileSync('.j9-plugin.json', JSON.stringify({ pid: process.pid, sessionId: session.SessionId, region: process.argv[3], operation: process.argv[4], target: JSON.parse(process.argv[6]) }));
if (session.SessionId === 'startup-fail') { console.error(session.TokenValue); process.exit(7); }
if (session.SessionId === 'ignore-term' || session.SessionId === 'startup-wait') process.on('SIGTERM', () => {});
if (session.SessionId === 'idle-zero' || session.SessionId === 'idle-fail') setTimeout(() => process.exit(session.SessionId === 'idle-zero' ? 0 : 7), 300);
if (session.SessionId === 'fail') process.exit(7);
if (session.SessionId === 'exec-fail') { console.error('j9-exec-failed'); process.exit(7); }
if (session.SessionId === 'exec') { console.log('j9-exec-result'); process.exit(0); }
if (session.SessionId !== 'startup-wait') console.log(['tunnel', 'idle-zero', 'idle-fail', 'ignore-term'].includes(session.SessionId) ? 'Waiting for connections...' : 'j9-shell-ready');
process.stdin.setEncoding('utf8');
process.stdin.on('data', (input) => { writeFileSync('.j9-input', input); console.log('j9-shell-received'); process.exit(0); });
setInterval(() => {}, 1000);
`
  );
  const build = Bun.spawn([process.execPath, 'build', '--compile', source, '--outfile', plugin], {
    stdout: 'ignore',
    stderr: 'pipe'
  });
  const errors = new Response(build.stderr).text();
  expect(await build.exited, await errors).toBe(0);
}, 60_000);
afterAll(async () => {
  await cli?.close();
  if (tools) await rm(tools, { recursive: true, force: true });
});
const xml = (operation: string, body: unknown) => ({ kind: 'xml' as const, operation, result: toQueryXml(body) });
const stackResource = (resourceType: string) => ({
  resourceType,
  links: {},
  outputs: {},
  referencableParams: {},
  cloudformationChildResources: {}
});
const create = () => createOperationsFixture(cli.path, { STACKTAPE_TOOLS_DIR: tools });
const record = async (fixture: Awaited<ReturnType<typeof create>>) => {
  const state = JSON.parse(await readFile(join(fixture.directory, '.j9-plugin.json'), 'utf8')) as {
    pid: number;
    sessionId: string;
    region: string;
    operation: string;
    target: { Target: string };
  };
  return state;
};
const expectStopped = async (pid: number) => {
  if (process.platform === 'linux') {
    const stat = await readFile(`/proc/${pid}/stat`, 'utf8').catch(() => '');
    expect(stat === '' || stat.slice(stat.lastIndexOf(')') + 2).startsWith('Z')).toBe(true);
  } else expect(() => process.kill(pid, 0)).toThrow();
};
const assertRequests = (fixture: Awaited<ReturnType<typeof create>>) => {
  expect(fixture.aws.unexpected).toEqual([]);
  expect(fixture.api.unexpected).toEqual([]);
};
const seedBastion = async (fixture: Awaited<ReturnType<typeof create>>, sessionId: string) => {
  await seedDeployedStack(fixture, {
    bastion: stackResource('bastion'),
    cache: {
      ...stackResource('redis-cluster'),
      referencableParams: {
        host: { value: 'redis.j9.internal', showDuringPrint: true },
        port: { value: 6379, showDuringPrint: true },
        connectionString: { value: 'redis://redis.j9.internal:6379', showDuringPrint: false }
      }
    }
  });
  fixture.aws.on('cloudformation.ListStackResources', () =>
    xml('ListStackResources', {
      StackResourceSummaries: [
        {
          LogicalResourceId: cfLogicalNames.bastionEc2AutoscalingGroup('bastion'),
          PhysicalResourceId: 'j9-bastion-asg',
          ResourceType: 'AWS::AutoScaling::AutoScalingGroup',
          ResourceStatus: 'CREATE_COMPLETE'
        }
      ]
    })
  );
  fixture.aws.on('autoscaling.DescribeAutoScalingGroups', () =>
    xml('DescribeAutoScalingGroups', {
      AutoScalingGroups: [
        {
          AutoScalingGroupName: 'j9-bastion-asg',
          Instances: [
            { InstanceId: 'i-j9-old', LaunchTemplate: { Version: '1' } },
            { InstanceId: 'i-j9-current', LaunchTemplate: { Version: '2' } }
          ]
        }
      ]
    })
  );
  fixture.aws.on('ssm.StartSession', () => ({
    kind: 'json',
    body: { SessionId: sessionId, TokenValue: token, StreamUrl: 'wss://example.test' }
  }));
  fixture.aws.on('ssm.TerminateSession', () => ({ kind: 'json', body: { SessionId: sessionId } }));
};

// MiniStack 1.5.27 rejects StartSession with InvalidAction; session transport and runtime availability are supplied deliberately here.
// The Windows plugin is bundled rather than resolved through STACKTAPE_TOOLS_DIR. This fixture exercises the POSIX cache boundary.
test.skipIf(process.platform === 'win32')(
  'bastion shell selects the newest instance, forwards terminal stdin, and terminates the session',
  async () => {
    const fixture = await create();
    try {
      await seedBastion(fixture, 'shell');
      const child = fixture.start(['bastion:session', '--bastionResource', 'bastion', ...targetArgs], { tty: true });
      await child.waitFor('j9-shell-ready');
      const state = await record(fixture);
      expect(state).toMatchObject({
        region: 'eu-west-1',
        operation: 'StartSession',
        target: { Target: 'i-j9-current' }
      });
      child.write('j9-input\n');
      const result = await child.finished;
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('j9-shell-received');
      expect(result.stdout).not.toContain(token);
      expect(await readFile(join(fixture.directory, '.j9-input'), 'utf8')).toBe('j9-input\n');
      expect(fixture.aws.callsTo('ssm.TerminateSession').map(({ input }) => input.SessionId)).toEqual(['shell']);
      await expectStopped(state.pid);
      assertRequests(fixture);
    } finally {
      await fixture.close();
    }
  },
  60_000
);

test.skipIf(process.platform === 'win32')(
  'bastion tunnel sends the remote target and terminates both ends on interruption',
  async () => {
    const fixture = await create();
    try {
      await seedBastion(fixture, 'tunnel');
      let serverTerminated = false;
      fixture.aws.on('ssm.TerminateSession', async () => {
        await Bun.sleep(150);
        serverTerminated = true;
        return { kind: 'json', body: {} };
      });
      const child = fixture.start([
        'bastion:tunnel',
        '--resourceName',
        'cache',
        '--bastionResource',
        'bastion',
        ...targetArgs,
        '--agent'
      ]);
      await child.waitFor('Tunnels open');
      const state = await record(fixture);
      expect(fixture.aws.callsTo('ssm.StartSession')[0].input).toMatchObject({
        Target: 'i-j9-current',
        DocumentName: 'AWS-StartPortForwardingSessionToRemoteHost',
        Parameters: { host: ['redis.j9.internal'], portNumber: ['6379'] }
      });
      expect(
        Number((state.target as unknown as { Parameters: { localPortNumber: string[] } }).Parameters.localPortNumber[0])
      ).toBeGreaterThan(0);
      child.child.kill('SIGINT');
      const result = await child.finished;
      expect(result.exitCode).toBe(0);
      expect(serverTerminated).toBe(true);
      expect(parseCliJsonl(result.stdout, 'bastion:tunnel').result.code).toBe('USER_INTERRUPTION');
      expect(result.stdout + result.stderr).not.toContain(token);
      expect(fixture.aws.callsTo('ssm.TerminateSession').map(({ input }) => input.SessionId)).toEqual(['tunnel']);
      await expectStopped(state.pid);
      assertRequests(fixture);
    } finally {
      await fixture.close();
    }
  },
  60_000
);

test.skipIf(process.platform === 'win32')(
  'failed bastion plugin reports failure without exposing the SSM token and still closes the server session',
  async () => {
    const fixture = await create();
    try {
      await seedBastion(fixture, 'fail');
      const result = await fixture.run(['bastion:session', '--bastionResource', 'bastion', ...targetArgs, '--agent']);
      expect(result.exitCode).toBe(1);
      expect(result.stdout + result.stderr).not.toContain(token);
      expect(parseCliJsonl(result.stdout, 'bastion:session').result.code).toBe('SSM_SESSION_FAILED');
      expect(fixture.aws.callsTo('ssm.TerminateSession').map(({ input }) => input.SessionId)).toEqual(['fail']);
      await expectStopped((await record(fixture)).pid);
      assertRequests(fixture);
    } finally {
      await fixture.close();
    }
  },
  60_000
);

const clusterArn = 'arn:aws:ecs:eu-west-1:111122223333:cluster/j9-cluster';
const taskArn = (id: string) => `arn:aws:ecs:eu-west-1:111122223333:task/j9-cluster/${id}`;
const seedContainer = async (
  fixture: Awaited<ReturnType<typeof create>>,
  sessionId: string,
  ids = ['first', 'second']
) => {
  await seedDeployedStack(fixture, {
    service: {
      ...stackResource('multi-container-workload'),
      cloudformationChildResources: {
        ServiceEcsService: { cloudformationResourceType: 'AWS::ECS::Service' }
      }
    }
  });
  fixture.aws.on('cloudformation.ListStackResources', () =>
    xml('ListStackResources', {
      StackResourceSummaries: [
        {
          LogicalResourceId: 'ServiceEcsService',
          PhysicalResourceId: 'arn:aws:ecs:eu-west-1:111122223333:service/j9-cluster/j9-service',
          ResourceType: 'AWS::ECS::Service',
          ResourceStatus: 'CREATE_COMPLETE'
        }
      ]
    })
  );
  fixture.aws.on('ecs.DescribeServices', () => ({
    kind: 'json',
    body: {
      services: [
        { clusterArn, deployments: [{ status: 'PRIMARY', rolloutState: 'COMPLETED', taskDefinition: 'j9-task:1' }] }
      ]
    }
  }));
  fixture.aws.on('ecs.DescribeTaskDefinition', () => ({
    kind: 'json',
    body: { taskDefinition: { containerDefinitions: [{ name: 'main' }, { name: 'sidecar' }] } }
  }));
  fixture.aws.on('ecs.ListTasks', () => ({ kind: 'json', body: { taskArns: ids.map(taskArn) } }));
  fixture.aws.on('ecs.DescribeTasks', () => ({
    kind: 'json',
    body: {
      tasks: ids.map((id) => ({
        taskArn: taskArn(id),
        clusterArn,
        containers: [
          { name: 'main', runtimeId: `j9-main-${id}` },
          { name: 'sidecar', runtimeId: `j9-sidecar-${id}` }
        ]
      }))
    }
  }));
  fixture.aws.on('ecs.ExecuteCommand', () => ({
    kind: 'json',
    body: { session: { sessionId, tokenValue: token, streamUrl: 'wss://example.test' } }
  }));
  fixture.aws.on('ssm.TerminateSession', () => ({ kind: 'json', body: { SessionId: sessionId } }));
};

test.skipIf(process.platform === 'win32')(
  'container exec selects the requested task and container, captures output, and closes the server session',
  async () => {
    const fixture = await create();
    try {
      await seedContainer(fixture, 'exec');
      const child = await fixture.run([
        'container:exec',
        '--resourceName',
        'service',
        '--container',
        'sidecar',
        '--taskArn',
        'second',
        '--command',
        'printf j9-command',
        ...targetArgs,
        '--agent'
      ]);
      const { events, result } = parseCliJsonl(child.stdout, 'container:exec');
      expect(child.exitCode, result.message).toBe(0);
      const output = events.find(
        (event) => event.type === 'log' && typeof event.message === 'string' && event.message.startsWith('{')
      );
      expect(JSON.parse(output.message as string)).toMatchObject({
        containerName: 'sidecar',
        taskArn: taskArn('second'),
        output: 'j9-exec-result',
        exitCode: 0
      });
      expect(fixture.aws.callsTo('ecs.ExecuteCommand')[0].input).toMatchObject({
        cluster: clusterArn,
        task: taskArn('second'),
        container: 'sidecar',
        command: 'printf j9-command',
        interactive: true
      });
      const state = await record(fixture);
      expect(state.target.Target).toBe('ecs:j9-cluster_second_j9-sidecar-second');
      expect(fixture.aws.callsTo('ssm.TerminateSession').map(({ input }) => input.SessionId)).toEqual(['exec']);
      expect(child.stdout + child.stderr).not.toContain(token);
      await expectStopped(state.pid);
      await seedContainer(fixture, 'exec-fail');
      const failed = await fixture.run([
        'container:exec',
        '--resourceName',
        'service',
        '--container',
        'sidecar',
        '--taskArn',
        'second',
        '--command',
        'false',
        ...targetArgs,
        '--agent'
      ]);
      expect(failed.exitCode).toBe(1);
      expect(parseCliJsonl(failed.stdout, 'container:exec').result.code).toBe('CONTAINER_EXEC_FAILED');
      expect(failed.stdout).toContain('j9-exec-failed');
      expect(failed.stdout + failed.stderr).not.toContain(token);
      expect(fixture.aws.callsTo('ssm.TerminateSession').map(({ input }) => input.SessionId)).toEqual([
        'exec',
        'exec-fail'
      ]);
      assertRequests(fixture);
    } finally {
      await fixture.close();
    }
  },
  60_000
);

test.skipIf(process.platform === 'win32')(
  'container shell forwards stdin and masks a failed plugin; no running task gives an actionable failure',
  async () => {
    const fixture = await create();
    try {
      await seedContainer(fixture, 'shell', ['first']);
      const child = fixture.start(
        ['container:session', '--resourceName', 'service', '--container', 'main', ...targetArgs],
        { tty: true }
      );
      await child.waitFor('j9-shell-ready');
      const state = await record(fixture);
      expect(state.target.Target).toBe('ecs:j9-cluster_first_j9-main-first');
      child.write('j9-container-input\n');
      expect((await child.finished).exitCode).toBe(0);
      expect(await readFile(join(fixture.directory, '.j9-input'), 'utf8')).toBe('j9-container-input\n');
      await expectStopped(state.pid);
      await seedContainer(fixture, 'fail', ['first']);
      const failed = await fixture.run([
        'container:session',
        '--resourceName',
        'service',
        '--container',
        'main',
        ...targetArgs,
        '--agent'
      ]);
      expect(failed.exitCode).toBe(1);
      expect(failed.stdout + failed.stderr).not.toContain(token);
      expect(parseCliJsonl(failed.stdout, 'container:session').result.code).toBe('SSM_SESSION_FAILED');
      expect(fixture.aws.callsTo('ssm.TerminateSession').map(({ input }) => input.SessionId)).toEqual([
        'shell',
        'fail'
      ]);
      await seedContainer(fixture, 'unused', []);
      const absent = await fixture.run([
        'container:session',
        '--resourceName',
        'service',
        '--container',
        'main',
        ...targetArgs,
        '--agent'
      ]);
      expect(absent.exitCode).toBe(1);
      expect(parseCliJsonl(absent.stdout, 'container:session').result.code).toBe('CONTAINER_TASK_NOT_RUNNING');
      expect(fixture.aws.callsTo('ecs.ExecuteCommand')).toHaveLength(2);
      assertRequests(fixture);
    } finally {
      await fixture.close();
    }
  },
  60_000
);

test.skipIf(process.platform === 'win32')(
  'interrupting a container shell stops its plugin and terminates the server session before CLI exit',
  async () => {
    const fixture = await create();
    try {
      await seedContainer(fixture, 'shell', ['first']);
      fixture.aws.on('ssm.TerminateSession', async () => {
        await Bun.sleep(80);
        return { kind: 'json', body: { SessionId: 'shell' } };
      });
      const child = fixture.start(
        ['container:session', '--resourceName', 'service', '--container', 'main', ...targetArgs],
        { tty: true }
      );
      await child.waitFor('j9-shell-ready');
      const state = await record(fixture);
      child.write('\x03');
      const result = await child.finished;
      expect(result.exitCode).toBe(0);
      expect(result.stdout + result.stderr).not.toContain(token);
      expect(fixture.aws.callsTo('ssm.TerminateSession').map(({ input }) => input.SessionId)).toEqual(['shell']);
      await expectStopped(state.pid);
      assertRequests(fixture);
    } finally {
      await fixture.close();
    }
  },
  60_000
);

test.skipIf(process.platform === 'win32')(
  'local script inherits terminal stdin through the CLI',
  async () => {
    const fixture = await create();
    try {
      await seedDeployedStack(fixture);
      await writeFile(
        join(fixture.directory, 'stacktape.yml'),
        JSON.stringify({
          resources: {},
          scripts: {
            input: {
              type: 'local-script',
              properties: {
                executeCommand: 'printf j9-script-ready; read line; printf "%s" "$line" > .j9-script-input',
                stdioMode: 'inherit'
              }
            }
          }
        })
      );
      const child = fixture.start(['script:run', '--scriptName', 'input', ...targetArgs], { tty: true });
      await child.waitFor('j9-script-ready');
      child.write('j9-script-stdin\n');
      expect((await child.finished).exitCode).toBe(0);
      expect(await readFile(join(fixture.directory, '.j9-script-input'), 'utf8')).toBe('j9-script-stdin');
      assertRequests(fixture);
    } finally {
      await fixture.close();
    }
  },
  60_000
);

// The plugin substitutes the vendor's WebSocket transport deliberately: inject startup/exit faults that an emulator cannot deliver.
test.skipIf(process.platform === 'win32')(
  'tunnel plugin startup failure and both idle exits close the server session without leaking tokens',
  async () => {
    for (const mode of ['startup-fail', 'idle-zero', 'idle-fail']) {
      const fixture = await create();
      try {
        await seedBastion(fixture, mode);
        const result = await fixture.run([
          'bastion:tunnel',
          '--resourceName',
          'cache',
          '--bastionResource',
          'bastion',
          ...targetArgs,
          '--agent'
        ]);
        expect(result.exitCode).toBe(1);
        expect(parseCliJsonl(result.stdout, 'bastion:tunnel').result.ok).toBe(false);
        expect(result.stdout + result.stderr).not.toContain(token);
        expect(fixture.aws.callsTo('ssm.TerminateSession').map(({ input }) => input.SessionId)).toEqual([mode]);
        await expectStopped((await record(fixture)).pid);
        assertRequests(fixture);
      } finally {
        await fixture.close();
      }
    }
  },
  60_000
);

test.skipIf(process.platform === 'win32')(
  'interrupting startup and a SIGTERM-resistant tunnel cleans up both ends',
  async () => {
    for (const mode of ['startup-wait', 'ignore-term']) {
      const fixture = await create();
      try {
        await seedBastion(fixture, mode);
        const child = fixture.start([
          'bastion:tunnel',
          '--resourceName',
          'cache',
          '--bastionResource',
          'bastion',
          ...targetArgs,
          '--agent'
        ]);
        let state: Awaited<ReturnType<typeof record>> | undefined;
        for (const deadline = Date.now() + 10_000; !state && Date.now() < deadline;) {
          state = await record(fixture).catch(() => undefined);
          if (!state) await Bun.sleep(20);
        }
        expect(state).toBeDefined();
        if (mode === 'ignore-term') await child.waitFor('Tunnels open');
        const interruptedAt = performance.now();
        child.child.kill('SIGINT');
        const result = await child.finished;
        expect(performance.now() - interruptedAt).toBeLessThan(4500);
        expect(result.exitCode).toBe(0);
        expect(parseCliJsonl(result.stdout, 'bastion:tunnel').result.code).toBe('USER_INTERRUPTION');
        expect(fixture.aws.callsTo('ssm.TerminateSession').map(({ input }) => input.SessionId)).toEqual([mode]);
        await expectStopped(state!.pid);
        expect(result.stdout + result.stderr).not.toContain(token);
        assertRequests(fixture);
      } finally {
        await fixture.close();
      }
    }
  },
  60_000
);

test('tunnel reconnects a disconnected target but fails immediately on terminal SSM denial', async () => {
  for (const disconnected of [false, true]) {
    const fixture = await create();
    try {
      await seedBastion(fixture, 'unused');
      let attempts = 0;
      fixture.aws.on('ssm.StartSession', () => {
        attempts++;
        return {
          kind: 'error',
          status: 400,
          code: disconnected && attempts === 1 ? 'TargetNotConnected' : 'AccessDeniedException',
          message: disconnected && attempts === 1 ? 'TargetNotConnected' : 'Injected session denial'
        };
      });
      const result = await fixture.run([
        'bastion:tunnel',
        '--resourceName',
        'cache',
        '--bastionResource',
        'bastion',
        ...targetArgs,
        '--agent'
      ]);
      expect(result.exitCode).toBe(1);
      expect(parseCliJsonl(result.stdout, 'bastion:tunnel').result.message).toContain('Injected session denial');
      expect(attempts).toBe(disconnected ? 2 : 1);
      expect(fixture.aws.callsTo('ssm.TerminateSession')).toEqual([]);
      assertRequests(fixture);
    } finally {
      await fixture.close();
    }
  }
}, 60_000);

test.skipIf(process.platform === 'win32')(
  'a tunneled local script runs every command in its directory against local endpoints and closes the session',
  async () => {
    for (const outcome of ['success', 'failure'] as const) {
      const fixture = await create();
      try {
        await seedBastion(fixture, 'tunnel');
        await mkdir(join(fixture.directory, 'scripts'));
        await writeFile(
          join(fixture.directory, 'stacktape.yml'),
          JSON.stringify({
            resources: {
              bastion: { type: 'bastion', properties: {} },
              cache: {
                type: 'redis-cluster',
                properties: { instanceSize: 'cache.t4g.micro', defaultUserPassword: 'j9-synthetic-redis-password' }
              }
            },
            scripts: {
              migrate: {
                type: 'local-script-with-bastion-tunneling',
                properties: {
                  bastionResource: 'bastion',
                  connectTo: ['cache'],
                  cwd: 'scripts',
                  executeCommands: [
                    'env | grep ^STP_CACHE_ | sort > ../tunnel-env.txt',
                    outcome === 'success' ? 'pwd > ../second-command.txt' : 'exit 3'
                  ]
                }
              }
            }
          })
        );
        const result = await fixture.run(['script:run', '--scriptName', 'migrate', ...targetArgs, '--agent']);
        const { result: final } = parseCliJsonl(result.stdout, 'script:run');
        expect(result.exitCode, final.message).toBe(outcome === 'success' ? 0 : 1);
        const state = await record(fixture);
        const localPort = (state.target as unknown as { Parameters: { localPortNumber: string[] } }).Parameters
          .localPortNumber[0];
        expect(fixture.aws.callsTo('ssm.StartSession')[0].input).toMatchObject({
          Target: 'i-j9-current',
          Parameters: { host: ['redis.j9.internal'], portNumber: ['6379'], localPortNumber: [localPort] }
        });
        const env = Object.fromEntries(
          (await readFile(join(fixture.directory, 'tunnel-env.txt'), 'utf8'))
            .trim()
            .split('\n')
            .map((line) => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1)])
        );
        expect(env).toMatchObject({
          STP_CACHE_HOST: '127.0.0.1',
          STP_CACHE_PORT: localPort,
          STP_CACHE_CONNECTION_STRING: `redis://127.0.0.1:${localPort}`,
          STP_CACHE_TLS_SERVER_NAME: 'redis.j9.internal'
        });
        if (outcome === 'success') {
          expect((await readFile(join(fixture.directory, 'second-command.txt'), 'utf8')).trim()).toEndWith('/scripts');
        } else expect(final.code).toBe('SCRIPT_ERROR');
        expect(fixture.aws.callsTo('ssm.TerminateSession').map(({ input }) => input.SessionId)).toEqual(['tunnel']);
        await expectStopped(state.pid);
        expect(result.stdout + result.stderr).not.toContain(token);
        assertRequests(fixture);
      } finally {
        await fixture.close();
      }
    }
  },
  60_000
);

// MiniStack has no SSM Run Command. The fake runs the sent document with a local shell and stores its output in
// MiniStack logs, where the CLI reads it the way it reads CloudWatch.
test.skipIf(process.platform === 'win32')(
  'a bastion script runs its commands with exact environment values and stops at the first failing command',
  async () => {
    for (const outcome of ['success', 'failure'] as const) {
      const fixture = await create();
      const logs = new CloudWatchLogsClient(fixture.clientConfig());
      try {
        await seedBastion(fixture, 'unused');
        await writeFile(
          join(fixture.directory, 'stacktape.yml'),
          JSON.stringify({
            resources: { bastion: { type: 'bastion', properties: {} } },
            scripts: {
              remote: {
                type: 'bastion-script',
                properties: {
                  bastionResource: 'bastion',
                  cwd: '/srv/app',
                  environment: [{ name: 'J9_SECRET', value: `pa$$word "quoted" \\ 'single'` }],
                  executeCommands: [
                    'printf "%s" "$J9_SECRET" > received-env.txt; echo "j9-remote-ran in $(basename "$PWD")"',
                    ...(outcome === 'failure' ? ['false', 'echo j9-after-failure > after-failure.txt'] : [])
                  ]
                }
              }
            }
          })
        );
        const remoteRoot = join(fixture.directory, 'bastion-root');
        let status = 'InProgress';
        fixture.aws.on('ssm.SendCommand', async ({ input }) => {
          const { commands, workingDirectory } = input.Parameters as Record<string, string[]>;
          const cwd = join(remoteRoot, workingDirectory[0]);
          await mkdir(cwd, { recursive: true });
          const shell = Bun.spawnSync(['bash', '-c', commands.join('\n')], { cwd, env: { PATH: process.env.PATH } });
          status = shell.exitCode === 0 ? 'Success' : 'Failed';
          const logGroupName = '/aws/ssm/AWS-RunShellScript';
          const logStreamName = 'j9-command/i-j9-current/aws-runShellScript/stdout';
          await logs.send(new CreateLogGroupCommand({ logGroupName }));
          await logs.send(new CreateLogStreamCommand({ logGroupName, logStreamName }));
          await logs.send(
            new PutLogEventsCommand({
              logGroupName,
              logStreamName,
              logEvents: [{ timestamp: Date.now(), message: shell.stdout.toString() || '(no output)' }]
            })
          );
          return { kind: 'json', body: { Command: { CommandId: 'j9-command' } } };
        });
        fixture.aws.on('ssm.ListCommandInvocations', () => ({
          kind: 'json',
          body: {
            CommandInvocations: [
              {
                CommandId: 'j9-command',
                InstanceId: 'i-j9-current',
                Status: status,
                RequestedDateTime: Math.floor(Date.now() / 1000) - 60
              }
            ]
          }
        }));
        const result = await fixture.run(['script:run', '--scriptName', 'remote', ...targetArgs, '--agent']);
        const { result: final } = parseCliJsonl(result.stdout, 'script:run');
        expect(result.exitCode, final.message).toBe(outcome === 'success' ? 0 : 1);
        expect(fixture.aws.callsTo('ssm.SendCommand')[0].input).toMatchObject({ InstanceIds: ['i-j9-current'] });
        expect(await readFile(join(remoteRoot, 'srv/app/received-env.txt'), 'utf8')).toBe(
          `pa$$word "quoted" \\ 'single'`
        );
        expect(result.stdout).toContain('j9-remote-ran in app');
        if (outcome === 'failure') {
          expect(final.code).toBe('SCRIPT_ERROR');
          expect(await Bun.file(join(remoteRoot, 'srv/app/after-failure.txt')).exists()).toBe(false);
        }
        assertRequests(fixture);
      } finally {
        logs.destroy();
        await fixture.close();
      }
    }
  },
  60_000
);
