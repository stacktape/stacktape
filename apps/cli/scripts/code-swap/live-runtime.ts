import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { randomBytes } from 'node:crypto';
import {
  ECSClient,
  DescribeServicesCommand,
  DescribeTaskDefinitionCommand,
  RunTaskCommand,
  DescribeTasksCommand,
  StopTaskCommand,
  ListTasksCommand
} from '@aws-sdk/client-ecs';
import { CloudWatchLogsClient, FilterLogEventsCommand } from '@aws-sdk/client-cloudwatch-logs';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { awsResourceNames } from '@stacktape/naming/aws-resource-names';
import { getGloballyUniqueStackHash } from '@stacktape/naming/stack-identity';
import { prepareQualification } from './qualify';
import {
  guard,
  save,
  invoke,
  cliArgs,
  cleanup,
  getStack,
  endpoint,
  waitForFleet,
  clients,
  ACCOUNT,
  REGION,
  PROFILE,
  type State,
  type Owned
} from './run';

const ecs = new ECSClient(clients),
  logs = new CloudWatchLogsClient(clients);
type LiveState = State & { tasks: { arn: string; cluster: string; scenario: string }[]; taskLaunchAttempted?: boolean };
const main = async () => {
  await guard();
  const dirArg = process.argv.indexOf('--state');
  const directory = resolve(
    dirArg >= 0 ? process.argv[dirArg + 1]! : `.stacktape/code-swap/runtime-${randomBytes(6).toString('hex')}`
  );
  await mkdir(directory, { recursive: true });
  const persist = (state: LiveState) => save(join(directory, 'state.json'), state);
  const stopTasks = async (state: LiveState) => {
    // group=owner makes recovery cover an accepted RunTask whose response was lost.
    for (const cluster of new Set(state.tasks.map((t) => t.cluster))) {
      const listed = await ecs.send(new ListTasksCommand({ cluster, startedBy: state.owner }));
      for (const arn of listed.taskArns ?? [])
        if (!state.tasks.some((t) => t.arn === arn)) state.tasks.push({ arn, cluster, scenario: 'recovered' });
    }
    state.tasks = state.tasks.filter((t) => t.arn);
    await persist(state);
    for (const task of state.tasks) {
      const found = (await ecs.send(new DescribeTasksCommand({ cluster: task.cluster, tasks: [task.arn] }))).tasks?.[0];
      if (found && found.lastStatus !== 'STOPPED')
        await ecs.send(
          new StopTaskCommand({
            cluster: task.cluster,
            task: task.arn,
            reason: 'Owned code-swap runtime qualification cleanup'
          })
        );
    }
    for (const task of state.tasks) {
      for (let i = 0; i < 120; i++) {
        const found = (await ecs.send(new DescribeTasksCommand({ cluster: task.cluster, tasks: [task.arn] })))
          .tasks?.[0];
        if (!found || found.lastStatus === 'STOPPED') break;
        if (i === 119) throw new Error('Owned qualifier task did not stop.');
        await Bun.sleep(1000);
      }
    }
  };
  if (process.argv.includes('--cleanup-only')) {
    const state: LiveState = JSON.parse(await readFile(join(directory, 'state.json'), 'utf8'));
    if (state.account !== ACCOUNT || state.region !== REGION || state.profile !== PROFILE)
      throw new Error('Recovery target mismatch.');
    await stopTasks(state);
    for (const owned of state.resources) await cleanup(state, owned);
    return;
  }
  const owner = randomBytes(8).toString('hex'),
    name = `v4swap-runtime-${owner.slice(0, 8)}`;
  const hash = getGloballyUniqueStackHash({ stackName: `${name}-bench`, accountId: ACCOUNT, region: REGION });
  const owned: Owned = {
    name,
    owner,
    table: `${name}-unused`,
    bucket: awsResourceNames.deploymentBucket(hash),
    repository: awsResourceNames.deploymentEcrRepo(hash),
    directory: join(directory, 'fixture')
  };
  const state: LiveState = {
    account: ACCOUNT,
    region: REGION,
    profile: PROFILE,
    owner,
    directory,
    resources: [owned],
    tasks: [],
    supervisor: '',
    cli: resolve('.stacktape/code-swap/cli/entrypoint.js')
  };
  await persist(state);
  console.log(
    `Recovery: STP_CODE_SWAP_BENCH_LIVE=1 pnpm --filter @stacktape/cli exec bun scripts/code-swap/live-runtime.ts --cleanup-only --state ${directory}`
  );
  if (await getStack(owned)) throw new Error('Owned stack name already exists.');
  await prepareQualification(owned.directory);
  await writeFile(
    join(owned.directory, 'Dockerfile'),
    (await readFile(join(owned.directory, 'Dockerfile'), 'utf8')) + '\nENV QUAL_SERVE=1 STP_BENCH_TASK_MIB=1024\n'
  );
  const config = {
    projectName: name,
    resources: {
      api: {
        type: 'web-service',
        overrides: {
          [cfLogicalNames.ecsTaskDefinition('api')]: {
            'ContainerDefinitions.0.LinuxParameters.InitProcessEnabled': true,
            'ContainerDefinitions.0.StopTimeout': 82
          }
        },
        properties: {
          port: 8080,
          packaging: { type: 'dockerfile', properties: { buildContextPath: '.', dockerfilePath: 'Dockerfile' } },
          resources: { cpu: 0.5, memory: 1024 },
          scaling: { minInstances: 1, maxInstances: 1 }
        }
      }
    },
    stackConfig: {
      tags: [{ name: 'code-swap-benchmark-owner', value: owner }],
      outputs: [{ name: 'apiUrl', value: "$ResourceParam('api', 'url')" }]
    }
  };
  await save(join(owned.directory, 'stacktape.json'), config);
  const runFile = join(directory, 'run.json');
  await save(runFile, {
    name,
    owner,
    table: owned.table,
    mode: 'image',
    supervisor: join(owned.directory, 'stacktape-supervisor'),
    result: join(directory, 'setup-result.json'),
    memory: 1024,
    count: 1
  });
  try {
    owned.stackAttempted = true;
    await persist(state);
    await invoke(cliArgs(state, owned, 'deploy'), join(directory, 'setup.log'), { STP_CODE_SWAP_BENCH_RUN: runFile });
    owned.stackId = (await getStack(owned))!.StackId;
    await persist(state);
    const fleet = await waitForFleet(owned, 1);
    const service = (await ecs.send(new DescribeServicesCommand({ cluster: fleet.cluster, services: [fleet.service] })))
      .services![0]!;
    const definition = (await ecs.send(new DescribeTaskDefinitionCommand({ taskDefinition: service.taskDefinition! })))
      .taskDefinition!;
    const container = definition.containerDefinitions![0]!;
    const url = await endpoint(owned);
    // Keep the service task's exact ID and immutable definition; no readiness/admission machinery is added.
    const reports: Record<string, unknown> = {};
    for (const scenario of [
      'oom-prepare',
      'oom-switch',
      'lifetime',
      'stop-prepare',
      'stop-switch',
      'stop-old-shutdown'
    ]) {
      state.taskLaunchAttempted = true;
      // Persist the cluster before dispatch so response-loss cleanup can discover startedBy=owner tasks.
      state.tasks.push({ arn: '', cluster: fleet.cluster, scenario: 'dispatch-ledger' });
      await persist(state);
      const launched = await ecs.send(
        new RunTaskCommand({
          cluster: fleet.cluster,
          taskDefinition: definition.taskDefinitionArn,
          launchType: 'FARGATE',
          platformVersion: '1.4.0',
          networkConfiguration: service.networkConfiguration,
          startedBy: owner,
          count: 1,
          tags: [{ key: 'code-swap-benchmark-owner', value: owner }],
          overrides: {
            containerOverrides: [
              {
                name: container.name!,
                environment: [
                  { name: 'QUAL_SERVE', value: '0' },
                  { name: 'QUAL_SCENARIO', value: scenario },
                  { name: 'QUAL_EXTERNAL_STOP', value: scenario.startsWith('stop-') ? '1' : '0' }
                ]
              }
            ]
          }
        })
      );
      if (launched.failures?.length || launched.tasks?.length !== 1) throw new Error('Qualifier task launch failed.');
      state.tasks = state.tasks.filter((t) => t.arn);
      state.tasks.push({ arn: launched.tasks[0]!.taskArn!, cluster: fleet.cluster, scenario });
      await persist(state);
    }
    const deadline = performance.now() + 12 * 60000;
    for (;;) {
      try {
        const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
        const report = (await response.json()) as { state: string };
        if (report.state === 'passed' || report.state === 'failed') reports.normal = report;
      } catch {}
      for (const task of state.tasks) {
        const response = await ecs.send(new DescribeTasksCommand({ cluster: task.cluster, tasks: [task.arn] }));
        const found = response.tasks?.[0];
        if (found?.lastStatus === 'STOPPED' || task.scenario.startsWith('stop-')) {
          const stream = `ecs/${container.name}/${task.arn.split('/').at(-1)}`;
          const events = await logs.send(
            new FilterLogEventsCommand({
              logGroupName: container.logConfiguration!.options!['awslogs-group'],
              logStreamNames: [stream],
              filterPattern: '"qualification"'
            })
          );
          const parsed = (events.events ?? [])
            .flatMap((e) => {
              try {
                return [JSON.parse(e.message!).qualification];
              } catch {
                return [];
              }
            })
            .filter(Boolean);
          if (parsed.at(-1)?.state === 'stop-ready' && found?.desiredStatus !== 'STOPPED') {
            await ecs.send(
              new StopTaskCommand({
                cluster: task.cluster,
                task: task.arn,
                reason: `Phase-2 SIGTERM during ${task.scenario}`
              })
            );
          }
          if (found?.lastStatus === 'STOPPED' && parsed.at(-1) && ['passed', 'failed'].includes(parsed.at(-1).state))
            reports[task.scenario] = {
              ...parsed.at(-1),
              state: found.containers?.[0]?.exitCode === 0 ? parsed.at(-1).state : 'failed',
              exitCode: found.containers?.[0]?.exitCode,
              stoppedReason: found.stoppedReason
            };
        }
      }
      await save(join(directory, 'reports.json'), reports);
      if (Object.keys(reports).length === 7) break;
      if (performance.now() > deadline) throw new Error('Fargate runtime qualification timed out.');
      await Bun.sleep(3000);
    }
    if (Object.values(reports).some((r) => (r as { state: string }).state !== 'passed'))
      throw new Error('Fargate runtime qualification failed; see reports.json.');
    console.log('All seven Fargate runtime scenarios passed.');
  } finally {
    try {
      await stopTasks(state);
    } finally {
      await cleanup(state, owned);
    }
  }
};
if (import.meta.main)
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
