import { afterAll, beforeAll, expect, test } from 'bun:test';
import { CloudWatchLogsClient, CreateLogStreamCommand, PutLogEventsCommand } from '@aws-sdk/client-cloudwatch-logs';
import { AwsSdkManager } from '../../src/aws/sdk-manager';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { StackInfoMapResource } from '@stacktape/stack-info/contracts';
import { buildOperationsCli, createOperationsFixture, seedDeployedStack, targetArgs } from './cli-process';
import { parseCliJsonl } from '../verify-source-cli-aws-readonly';
import { toQueryXml } from './loopback-aws';
import { ConsoleProcedureError } from './loopback-console';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';

let cli: Awaited<ReturnType<typeof buildOperationsCli>>;
beforeAll(async () => {
  cli = await buildOperationsCli();
}, 60_000);
afterAll(async () => {
  await cli?.close();
});
const lambda: StackInfoMapResource = {
  resourceType: 'function',
  referencableParams: {},
  links: {},
  outputs: {},
  cloudformationChildResources: {}
};
const xml = (operation: string, body: unknown) => ({ kind: 'xml' as const, operation, result: toQueryXml(body) });

const run = async (fixture: Awaited<ReturnType<typeof createOperationsFixture>>, args: string[], ok = true) => {
  const processResult = await fixture.run([...args, ...targetArgs, '--agent']);
  const parsed = parseCliJsonl(processResult.stdout, args[0]);
  expect(processResult.exitCode, parsed.result.message).toBe(ok ? 0 : 1);
  expect(parsed.result.ok).toBe(ok);
  expect(processResult.stderr).toBe('');
  expect(fixture.aws.unexpected).toEqual([]);
  expect(fixture.api.unexpected).toEqual([]);
  return parsed;
};
const payload = (events: ReturnType<typeof parseCliJsonl>['events']) => {
  const event = events.find(
    (event) => event.type === 'log' && typeof event.message === 'string' && event.message.startsWith('{')
  );
  expect(event).toBeDefined();
  return JSON.parse(event.message as string) as Record<string, unknown>;
};

test('metrics and alarms include every AWS page, preserve zero values, and report empty results', async () => {
  const fixture = await createOperationsFixture(cli.path);
  try {
    await seedDeployedStack(fixture, { api: lambda });
    fixture.aws.on('monitoring.GetMetricData', ({ input }) => ({
      kind: 'json' as const,
      body: {
        MetricDataResults: [
          {
            Id: 'm1',
            Label: 'Invocations',
            StatusCode: input.NextToken ? 'Complete' : 'PartialData',
            Timestamps: [input.NextToken ? 1767225900 : 1767225600],
            Values: [input.NextToken ? 3 : 0]
          }
        ],
        ...(!input.NextToken ? { NextToken: 'metric-page-2' } : {})
      }
    }));
    const metrics = payload(
      (await run(fixture, ['metrics', '--resourceName', 'api', '--metric', 'Invocations'])).events
    );
    expect(metrics.datapoints).toEqual([
      { timestamp: '2026-01-01T00:00:00.000Z', value: 0 },
      { timestamp: '2026-01-01T00:05:00.000Z', value: 3 }
    ]);
    const metricCalls = fixture.aws.callsTo('monitoring.GetMetricData');
    expect(metricCalls).toHaveLength(2);
    expect(metricCalls[1].input.NextToken).toBe('metric-page-2');
    expect(
      (
        metricCalls[0].input.MetricDataQueries as Array<{
          MetricStat: { Metric: { Dimensions: Array<{ Value: string }> } };
        }>
      )[0].MetricStat.Metric.Dimensions[0].Value
    ).toBe('j9-operations-test-api');
    const chart = await fixture.run([
      'metrics',
      '--resourceName',
      'api',
      '--metric',
      'Invocations',
      ...targetArgs,
      '--outputFormat',
      'plain'
    ]);
    expect(chart.exitCode).toBe(0);
    expect(chart.stdout).toContain('Invocations');
    expect(chart.stdout).toContain('Min 0');
    expect(chart.stdout).toContain('Max 3');
    expect(chart.stdout).toContain('Sum 3');
    fixture.aws.on('monitoring.GetMetricData', () => ({ kind: 'json' as const, body: { MetricDataResults: [] } }));
    expect(
      payload((await run(fixture, ['metrics', '--resourceName', 'api', '--metric', 'Invocations'])).events).datapoints
    ).toEqual([]);

    // Real alarm names are `<stack>-<Trigger>For<Resource><index>`; the resource is found through the stack's alarm
    // resources. The fake honors the prefix and state filters, and a sibling stage shares the stack-name prefix.
    const alarmLogicalId = (name: string) => cfLogicalNames.cloudwatchAlarm(name);
    await seedDeployedStack(fixture, {
      api: {
        ...lambda,
        cloudformationChildResources: {
          [alarmLogicalId('LambdaErrorRateForApi0')]: { cloudformationResourceType: 'AWS::CloudWatch::Alarm' },
          [alarmLogicalId('LambdaDurationForApi1')]: { cloudformationResourceType: 'AWS::CloudWatch::Alarm' }
        }
      },
      jobs: {
        ...lambda,
        resourceType: 'sqs-queue',
        cloudformationChildResources: {
          [alarmLogicalId('SqsQueueNotEmptyForJobs0')]: { cloudformationResourceType: 'AWS::CloudWatch::Alarm' }
        }
      }
    });
    fixture.aws.on('cloudformation.ListStackResources', () =>
      xml('ListStackResources', {
        StackResourceSummaries: ['LambdaErrorRateForApi0', 'LambdaDurationForApi1', 'SqsQueueNotEmptyForJobs0'].map(
          (name) => ({
            LogicalResourceId: alarmLogicalId(name),
            PhysicalResourceId: `j9-operations-test-${name}`,
            ResourceType: 'AWS::CloudWatch::Alarm',
            ResourceStatus: 'CREATE_COMPLETE'
          })
        )
      })
    );
    const storedAlarms = [
      {
        AlarmName: 'j9-operations-test-LambdaErrorRateForApi0',
        StateValue: 'ALARM',
        MetricName: 'Errors',
        Threshold: 0
      },
      { AlarmName: 'j9-operations-test-LambdaDurationForApi1', StateValue: 'OK', MetricName: 'Duration', Threshold: 3 },
      { AlarmName: 'j9-operations-test-SqsQueueNotEmptyForJobs0', StateValue: 'ALARM', MetricName: 'Messages' },
      { AlarmName: 'j9-operations-test2-LambdaErrorRateForApi0', StateValue: 'ALARM', MetricName: 'Errors' }
    ];
    fixture.aws.on('monitoring.DescribeAlarms', ({ input }) => {
      const matching = storedAlarms.filter(
        ({ AlarmName, StateValue }) =>
          AlarmName.startsWith(input.AlarmNamePrefix as string) &&
          (!input.StateValue || StateValue === input.StateValue)
      );
      return {
        kind: 'json' as const,
        body: input.NextToken
          ? { MetricAlarms: matching.slice(1) }
          : { MetricAlarms: matching.slice(0, 1), ...(matching.length > 1 ? { NextToken: 'alarm-page-2' } : {}) }
      };
    });
    const alarms = payload((await run(fixture, ['alarms', '--resourceName', 'api'])).events).alarms as Array<
      Record<string, unknown>
    >;
    expect(alarms.map(({ name, resource, threshold }) => ({ name, resource, threshold }))).toEqual([
      { name: 'j9-operations-test-LambdaErrorRateForApi0', resource: 'api', threshold: '0' },
      { name: 'j9-operations-test-LambdaDurationForApi1', resource: 'api', threshold: '3' }
    ]);
    const alarming = payload((await run(fixture, ['alarms', '--state', 'ALARM'])).events).alarms as Array<
      Record<string, unknown>
    >;
    expect(alarming.map(({ name, resource }) => ({ name, resource }))).toEqual([
      { name: 'j9-operations-test-LambdaErrorRateForApi0', resource: 'api' },
      { name: 'j9-operations-test-SqsQueueNotEmptyForJobs0', resource: 'jobs' }
    ]);
    const table = await fixture.run(['alarms', '--resourceName', 'api', ...targetArgs, '--outputFormat', 'plain']);
    expect(table.exitCode).toBe(0);
    expect(table.stdout).toContain('2 alarm(s)');
    expect(table.stdout).toContain('1 ALARM');
    expect(table.stdout).toContain('Duration');
    fixture.aws.on('monitoring.DescribeAlarms', () => ({ kind: 'json' as const, body: { MetricAlarms: [] } }));
    expect(payload((await run(fixture, ['alarms'])).events).alarms).toEqual([]);
  } finally {
    await fixture.close();
  }
}, 60_000);

test('logs read stored streams from the intended stack and expose readable plain output', async () => {
  const fixture = await createOperationsFixture(cli.path);
  const logs = new CloudWatchLogsClient(fixture.clientConfig());
  const group = '/aws/lambda/j9-operations-test-api';
  try {
    await seedDeployedStack(
      fixture,
      { api: lambda },
      {
        LambdaLogGroupApi: { Type: 'AWS::Logs::LogGroup', Properties: { LogGroupName: group } },
        DecoyLogGroup: { Type: 'AWS::Logs::LogGroup', Properties: { LogGroupName: `${group}-decoy` } }
      }
    );
    await writeFile(join(fixture.directory, 'stacktape.yml'), '{"resources":{}}');
    const now = Date.now();
    for (const [logGroupName, logStreamName, logEvents] of [
      [
        group,
        'first',
        [
          { timestamp: now - 45 * 60_000, message: 'stale: before the last 30 minutes' },
          { timestamp: now - 20_000, message: 'ERROR: first failure' }
        ]
      ],
      [group, 'second', [{ timestamp: now - 10_000, message: '{"level":"warn","msg":"second warning"}' }]],
      [`${group}-decoy`, 'outside', [{ timestamp: now - 10_000, message: 'ERROR: never show this other resource' }]]
    ] as const) {
      await logs.send(new CreateLogStreamCommand({ logGroupName, logStreamName }));
      await logs.send(new PutLogEventsCommand({ logGroupName, logStreamName, logEvents: [...logEvents] }));
    }
    const messages = async (args: string[]) =>
      (
        payload((await run(fixture, ['logs', '--resourceName', 'api', ...args])).events).events as Array<{
          message: string;
        }>
      ).map(({ message }) => message);
    expect(await messages([])).toEqual([
      'stale: before the last 30 minutes',
      'ERROR: first failure',
      '{"level":"warn","msg":"second warning"}'
    ]);
    expect(await messages(['--startTime', '30m'])).toEqual([
      'ERROR: first failure',
      '{"level":"warn","msg":"second warning"}'
    ]);
    // A limit keeps the most recent events, in order.
    expect(await messages(['--limit', '2'])).toEqual([
      'ERROR: first failure',
      '{"level":"warn","msg":"second warning"}'
    ]);
    const plain = await fixture.run(['logs', '--resourceName', 'api', ...targetArgs, '--outputFormat', 'plain']);
    expect(plain.exitCode, plain.stdout).toBe(0);
    expect(plain.stdout).toContain('ERROR: first failure');
    expect(plain.stdout).toContain('3 event(s)');
    expect(plain.stdout).toContain('1 error(s)');
    expect(plain.stdout).toContain('1 warning(s)');
    expect(plain.stdout).not.toContain('never show');
    const manager = new AwsSdkManager();
    manager.init({ ...fixture.clientConfig(), plugins: [] });
    expect((await manager.observability.getLogGroup({ logGroupName: group }))?.logGroupName).toBe(group);
    expect(await manager.observability.getLogEvents({ logGroupName: 'absent' })).toEqual([]);
    expect(await manager.observability.listLogStreams({ logGroupName: group, limit: 1 })).toHaveLength(1);
    const empty = payload(
      (await run(fixture, ['logs', '--resourceName', 'api', '--filter', 'no-matching-message'])).events
    );
    expect(empty.events).toEqual([]);
  } finally {
    logs.destroy();
    await fixture.close();
  }
}, 60_000);

// Deliberate pagination fault: AWS can return an empty page with a continuation token.
test('logs traverse empty pages and all streams, preserve the filter, and return an empty snapshot', async () => {
  const fixture = await createOperationsFixture(cli.path);
  try {
    await seedDeployedStack(fixture, { api: lambda });
    await writeFile(join(fixture.directory, 'stacktape.yml'), '{"resources":{}}');
    fixture.aws.on('cloudformation.ListStackResources', () =>
      xml('ListStackResources', {
        StackResourceSummaries: [
          {
            LogicalResourceId: 'LambdaLogGroupApi',
            PhysicalResourceId: '/aws/lambda/j9-operations-test-api',
            ResourceType: 'AWS::Logs::LogGroup',
            ResourceStatus: 'CREATE_COMPLETE'
          }
        ]
      })
    );
    fixture.aws.on('logs.DescribeLogStreams', ({ input }) => ({
      kind: 'json',
      body: {
        logStreams: [{ logStreamName: input.nextToken ? 'second-stream' : 'first-stream' }],
        ...(!input.nextToken ? { nextToken: 'stream-page-2' } : {})
      }
    }));
    fixture.aws.on('logs.FilterLogEvents', ({ input }) => ({
      kind: 'json',
      body: input.nextToken
        ? {
            events: [{ timestamp: 1767225600000, message: 'j9-error-line', logStreamName: 'second-stream' }]
          }
        : { events: [], nextToken: 'event-page-2' }
    }));
    const logs = payload((await run(fixture, ['logs', '--resourceName', 'api', '--filter', 'ERROR'])).events);
    expect(logs.events).toEqual([
      { timestamp: '2026-01-01T00:00:00.000Z', message: 'j9-error-line', logStream: 'second-stream' }
    ]);
    expect(fixture.aws.callsTo('logs.FilterLogEvents')[1].input).toMatchObject({
      nextToken: 'event-page-2',
      filterPattern: 'ERROR',
      logStreamNames: ['first-stream', 'second-stream']
    });
    fixture.aws.on('logs.DescribeLogStreams', () => ({ kind: 'json', body: { logStreams: [] } }));
    expect(payload((await run(fixture, ['logs', '--resourceName', 'api'])).events).events).toEqual([]);
  } finally {
    await fixture.close();
  }
}, 60_000);

test('info commands return every stack page, retain stack-detail resources, and expose denied access as failure', async () => {
  const fixture = await createOperationsFixture(cli.path);
  try {
    fixture.aws.on('tagging.GetTagKeys', () => ({ kind: 'json', body: { TagKeys: [] } }));
    fixture.aws.on('ce.GetTags', () => ({ kind: 'json', body: { Tags: [] } }));
    fixture.aws.on('budgets.DescribeBudgets', () => ({ kind: 'json', body: { Budgets: [] } }));
    fixture.aws.on('cloudformation.ListStacks', ({ input }) =>
      xml('ListStacks', {
        StackSummaries: [
          {
            StackName: input.NextToken ? 'j9-second-test' : 'j9-first-test',
            StackStatus: 'CREATE_COMPLETE',
            CreationTime: '2026-01-01T00:00:00Z'
          }
        ],
        ...(!input.NextToken ? { NextToken: 'stack-page-2' } : {})
      })
    );
    const stacks = (await run(fixture, ['info:stacks'])).result.data.result as Array<Record<string, unknown>>;
    expect(stacks.map(({ stackName }) => stackName)).toEqual(['j9-first-test', 'j9-second-test']);
    fixture.aws.on('cloudformation.ListStacks', () => xml('ListStacks', { StackSummaries: [] }));
    expect((await run(fixture, ['info:stacks'])).result.data.result).toEqual([]);
    fixture.api.on('stackDetails', () => ({
      resources: [{ LogicalResourceId: 'ApiFunction', ResourceType: 'AWS::Lambda::Function' }],
      stackOutput: { endpoint: 'https://example.test' },
      stackInfoMap: {},
      description: 'j9 detail'
    }));
    const details = (await run(fixture, ['info:stack'])).result.data.result;
    expect(details).toMatchObject({
      schemaVersion: 'stacktape.info-stack.v1',
      stackName: 'j9-operations-test',
      resources: [{ LogicalResourceId: 'ApiFunction', ResourceType: 'AWS::Lambda::Function' }]
    });
    fixture.api.on('stackDetails', () => ({}));
    expect((await run(fixture, ['info:stack'])).result.data.result).toMatchObject({
      description: null,
      stackOutput: {},
      stackInfoMap: null,
      resources: []
    });
    fixture.api.on('stackDetails', () => {
      throw new ConsoleProcedureError('FORBIDDEN', 'J9 stack is outside your access');
    });
    expect((await run(fixture, ['info:stack'], false)).result.message).toContain('J9 stack is outside your access');
  } finally {
    await fixture.close();
  }
}, 60_000);

test('denied AWS reads fail and cancelling a pending diagnostic read ends with an interruption result', async () => {
  const fixture = await createOperationsFixture(cli.path);
  try {
    await seedDeployedStack(fixture, { api: lambda });
    fixture.aws.on('monitoring.GetMetricData', () => ({
      kind: 'error',
      code: 'AccessDenied',
      message: 'J9 metrics access denied',
      status: 403
    }));
    expect(
      (await run(fixture, ['metrics', '--resourceName', 'api', '--metric', 'Invocations'], false)).result.message
    ).toContain('J9 metrics access denied');
    // Windows has no SIGINT: `kill('SIGINT')` terminates the CLI (exit 130) instead of interrupting it, so the
    // interruption contract is exercised on Linux and macOS only, as the fixture's own interruption cases are.
    if (process.platform === 'win32') return;
    let ready: () => void;
    const received = new Promise<void>((resolve) => {
      ready = resolve;
    });
    fixture.aws.on('monitoring.GetMetricData', () => {
      ready();
      return { kind: 'hang' };
    });
    const child = fixture.start([
      'metrics',
      '--resourceName',
      'api',
      '--metric',
      'Invocations',
      ...targetArgs,
      '--agent'
    ]);
    let deadline: ReturnType<typeof setTimeout>;
    try {
      await Promise.race([
        received,
        new Promise<never>((_, reject) => {
          deadline = setTimeout(() => reject(new Error('Metric request never arrived')), 15_000);
        })
      ]);
    } finally {
      clearTimeout(deadline);
    }
    child.child.kill('SIGINT');
    const stopped = await child.finished;
    expect(stopped.exitCode).toBe(0);
    expect(parseCliJsonl(stopped.stdout, 'metrics').result).toMatchObject({ ok: false, code: 'USER_INTERRUPTION' });
    expect(stopped.stderr).toBe('');
    expect(fixture.aws.unexpected).toEqual([]);
  } finally {
    await fixture.close();
  }
}, 60_000);
