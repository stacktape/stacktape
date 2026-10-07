import { afterAll, beforeAll, expect, test } from 'bun:test';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { StackInfoMapResource } from '@stacktape/stack-info/contracts';
import { buildOperationsCli, createOperationsFixture, seedDeployedStack, targetArgs } from './cli-process';
import { parseCliJsonl } from '../verify-source-cli-aws-readonly';
import { toQueryXml } from './loopback-aws';
import { ConsoleProcedureError } from './loopback-console';

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
    seedDeployedStack(fixture, { api: lambda });
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
    fixture.aws.on('monitoring.GetMetricData', () => ({ kind: 'json' as const, body: { MetricDataResults: [] } }));
    expect(
      payload((await run(fixture, ['metrics', '--resourceName', 'api', '--metric', 'Invocations'])).events).datapoints
    ).toEqual([]);

    fixture.aws.on('monitoring.DescribeAlarms', ({ input }) => ({
      kind: 'json' as const,
      body: {
        MetricAlarms: [
          {
            AlarmName: `j9-operations-test-api-${input.NextToken ? 'errors' : 'zero'}`,
            StateValue: 'ALARM',
            MetricName: 'Errors',
            Threshold: input.NextToken ? 3 : 0
          }
        ],
        ...(!input.NextToken ? { NextToken: 'alarm-page-2' } : {})
      }
    }));
    const alarms = payload((await run(fixture, ['alarms', '--resourceName', 'api'])).events).alarms as Array<
      Record<string, unknown>
    >;
    expect(alarms.map(({ name, threshold }) => ({ name, threshold }))).toEqual([
      { name: 'j9-operations-test-api-zero', threshold: '0' },
      { name: 'j9-operations-test-api-errors', threshold: '3' }
    ]);
    fixture.aws.on('monitoring.DescribeAlarms', () => ({ kind: 'json' as const, body: { MetricAlarms: [] } }));
    expect(payload((await run(fixture, ['alarms'])).events).alarms).toEqual([]);
  } finally {
    await fixture.close();
  }
}, 60_000);

test('logs traverse empty pages and all streams, preserve the filter, and return an empty snapshot', async () => {
  const fixture = await createOperationsFixture(cli.path);
  try {
    seedDeployedStack(fixture, { api: lambda });
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
    seedDeployedStack(fixture, { api: lambda });
    fixture.aws.on('monitoring.GetMetricData', () => ({
      kind: 'error',
      code: 'AccessDenied',
      message: 'J9 metrics access denied',
      status: 403
    }));
    expect(
      (await run(fixture, ['metrics', '--resourceName', 'api', '--metric', 'Invocations'], false)).result.message
    ).toContain('J9 metrics access denied');
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
