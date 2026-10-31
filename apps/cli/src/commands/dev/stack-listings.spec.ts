import { expect, test } from 'bun:test';
import type { AwsSdkResult } from '@stacktape/aws-read-only/executor';
import { listStackResources } from './stack-listings';

// r2an: when a stream's first event vanished, the dev agent's ListEventSourceMappings and ListRules on the stack's
// own custom bus were denied. IAM cannot limit ListEventSourceMappings to a stack, and limits ListRules to the bus it
// names, so these list the stack's own mappings and rules (checked against IAM in us-west-2 on 31 Oct 2026).
const account = '123456789012';
const functionArn = (name: string) => `arn:aws:lambda:eu-west-1:${account}:function:${name}`;
const tableStream = `arn:aws:dynamodb:eu-west-1:${account}:table/shop-dev-orders/stream/2026-10-31T00:00:00.000`;
const queue = `arn:aws:sqs:eu-west-1:${account}:shop-dev-jobs`;

/** What AWS holds: the stack's resources and another stage's, which only an account-wide read would reach. */
const mappings: Record<string, Record<string, unknown>> = {
  'uuid-stream': {
    UUID: 'uuid-stream',
    FunctionArn: functionArn('shop-dev-consumer'),
    EventSourceArn: tableStream,
    State: 'Enabled',
    LastProcessingResult: 'No records processed',
    StateTransitionReason: 'User action'
  },
  'uuid-queue': { UUID: 'uuid-queue', FunctionArn: `${functionArn('shop-dev-worker')}:live`, EventSourceArn: queue },
  'uuid-other-stage': { UUID: 'uuid-other-stage', FunctionArn: functionArn('shop-dev-production-consumer') }
};
const rules: Record<string, Record<string, unknown>> = {
  'default|shop-dev-NightlyRule-1': { Name: 'shop-dev-NightlyRule-1', EventBusName: 'default' },
  'default|shop-dev-AuditRule-2': { Name: 'shop-dev-AuditRule-2', EventBusName: 'default' },
  'default|shop-dev-production-NightlyRule-1': { Name: 'shop-dev-production-NightlyRule-1', EventBusName: 'default' }
};

const stackResources = [
  {
    LogicalResourceId: 'ConsumerEvent0EventSourceMapping',
    ResourceType: 'AWS::Lambda::EventSourceMapping',
    PhysicalResourceId: 'uuid-stream'
  },
  {
    LogicalResourceId: 'WorkerEvent0EventSourceMapping',
    ResourceType: 'AWS::Lambda::EventSourceMapping',
    PhysicalResourceId: 'uuid-queue'
  },
  {
    LogicalResourceId: 'GoneEventSourceMapping',
    ResourceType: 'AWS::Lambda::EventSourceMapping',
    PhysicalResourceId: 'uuid-deleted'
  },
  { LogicalResourceId: 'EventsEventBus', ResourceType: 'AWS::Events::EventBus', PhysicalResourceId: 'shop-dev-events' },
  {
    LogicalResourceId: 'ConsumerEvent1Rule',
    ResourceType: 'AWS::Events::Rule',
    PhysicalResourceId: 'shop-dev-events|shop-dev-ConsumerEvent1Rule-9'
  },
  { LogicalResourceId: 'NightlyRule', ResourceType: 'AWS::Events::Rule', PhysicalResourceId: 'shop-dev-NightlyRule-1' },
  { LogicalResourceId: 'AuditRule', ResourceType: 'AWS::Events::Rule', PhysicalResourceId: 'shop-dev-AuditRule-2' }
];

const list = async (service: string, command: string, input: Record<string, unknown> = {}) => {
  const sent: string[] = [];
  const result = await listStackResources({
    service,
    command,
    input,
    stackResources,
    send: async (read, readInput): Promise<AwsSdkResult> => {
      sent.push(`${read} ${JSON.stringify(readInput)}`);
      if (read === 'GetEventSourceMapping') {
        const mapping = mappings[readInput.UUID as string];
        return mapping
          ? { ok: true, data: { ...mapping, ResponseMetadata: {} } }
          : { ok: false, code: 'NOT_FOUND', error: 'Resource not found: The resource you requested does not exist.' };
      }
      const rule = rules[`${(readInput.EventBusName as string) ?? 'default'}|${readInput.Name as string}`];
      return rule ? { ok: true, data: rule } : { ok: false, code: 'NOT_FOUND', error: 'Rule does not exist.' };
    }
  });
  return { result, sent };
};

test("ListEventSourceMappings returns the stack's own mappings with their state, read one by one", async () => {
  const { result, sent } = await list('lambda', 'ListEventSourceMappings');
  expect(sent).toEqual([
    'GetEventSourceMapping {"UUID":"uuid-stream"}',
    'GetEventSourceMapping {"UUID":"uuid-queue"}',
    'GetEventSourceMapping {"UUID":"uuid-deleted"}'
  ]);
  expect(result).toMatchObject({
    ok: true,
    data: {
      EventSourceMappings: [mappings['uuid-stream'], mappings['uuid-queue']],
      UnreadableEventSourceMappings: [
        { LogicalResourceId: 'GoneEventSourceMapping', PhysicalResourceId: 'uuid-deleted', code: 'NOT_FOUND' }
      ]
    }
  });
  expect(JSON.stringify(result)).not.toContain('uuid-other-stage');
  expect(JSON.stringify(result)).not.toContain('ResponseMetadata');
});

test('ListEventSourceMappings filters by function, by name or ARN and across aliases, and by event source', async () => {
  const uuids = async (input: Record<string, unknown>) =>
    ((await list('lambda', 'ListEventSourceMappingsCommand', input)).result as any).data.EventSourceMappings.map(
      ({ UUID }: { UUID: string }) => UUID
    );
  expect(await uuids({ FunctionName: 'shop-dev-consumer' })).toEqual(['uuid-stream']);
  expect(await uuids({ FunctionName: functionArn('shop-dev-worker') })).toEqual(['uuid-queue']);
  expect(await uuids({ FunctionName: `${account}:function:shop-dev-worker:live` })).toEqual(['uuid-queue']);
  expect(await uuids({ FunctionName: 'shop-dev-production-consumer' })).toEqual([]);
  expect(await uuids({ EventSourceArn: queue })).toEqual(['uuid-queue']);
});

test("ListRules is sent to AWS for the stack's own custom bus, and answered from its own rules elsewhere", async () => {
  for (const EventBusName of ['shop-dev-events', `arn:aws:events:eu-west-1:${account}:event-bus/shop-dev-events`]) {
    expect((await list('events', 'ListRules', { EventBusName })).result).toBeUndefined();
  }

  const onDefault = await list('eventbridge', 'ListRules');
  expect(onDefault.sent).toEqual([
    'DescribeRule {"Name":"shop-dev-NightlyRule-1"}',
    'DescribeRule {"Name":"shop-dev-AuditRule-2"}'
  ]);
  expect(onDefault.result).toMatchObject({
    ok: true,
    data: { Rules: [rules['default|shop-dev-NightlyRule-1'], rules['default|shop-dev-AuditRule-2']] }
  });
  expect(JSON.stringify(onDefault.result)).not.toContain('shop-dev-production');
  expect((onDefault.result as any).data.Note).toContain('shop-dev-events');

  const prefixed = await list('eventbridge', 'ListRules', { EventBusName: 'default', NamePrefix: 'shop-dev-Audit' });
  expect(prefixed.sent).toEqual(['DescribeRule {"Name":"shop-dev-AuditRule-2"}']);
  const elsewhere = await list('eventbridge', 'ListRules', { EventBusName: 'shop-dev-production-events' });
  expect(elsewhere.sent).toEqual([]);
  expect(elsewhere.result).toMatchObject({ ok: true, data: { Rules: [] } });
});

test('other reads are left to the executor', async () => {
  expect((await list('lambda', 'GetEventSourceMapping', { UUID: 'uuid-stream' })).result).toBeUndefined();
  expect((await list('eventbridge', 'DescribeRule', { Name: 'x' })).result).toBeUndefined();
  expect((await list('sqs', 'ListQueues')).result).toBeUndefined();
});
