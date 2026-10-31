import { describe, expect, test } from 'bun:test';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { findStartingStreamMappings, formatStartingStreamMappingsNotice } from './stream-starting-position';

const mapping = (startingPosition: string | undefined, batchSize = 100) => ({
  Type: 'AWS::Lambda::EventSourceMapping',
  Properties: { EventSourceArn: 'arn:stream', StartingPosition: startingPosition, BatchSize: batchSize }
});

const functions = [
  {
    name: 'fromLatest',
    events: [
      { type: 'http-api-gateway', properties: {} },
      { type: 'dynamo-db-stream', properties: { startingPosition: 'LATEST' } }
    ]
  },
  { name: 'fromStart', events: [{ type: 'dynamo-db-stream', properties: { startingPosition: 'TRIM_HORIZON' } }] },
  { name: 'kinesisLatest', events: [{ type: 'kinesis-stream', properties: { startingPosition: 'LATEST' } }] },
  { name: 'queue', events: [{ type: 'sqs', properties: {} }] }
];

const template = (overrides: Record<string, ReturnType<typeof mapping>> = {}) => ({
  Resources: {
    [cfLogicalNames.eventSourceMapping('fromLatest', 1)]: mapping('LATEST'),
    [cfLogicalNames.eventSourceMapping('fromStart', 0)]: mapping('TRIM_HORIZON'),
    [cfLogicalNames.eventSourceMapping('kinesisLatest', 0)]: mapping('LATEST'),
    [cfLogicalNames.eventSourceMapping('queue', 0)]: mapping(undefined),
    ...overrides
  }
});

describe('stream mappings that a start creates or changes', () => {
  test('a new stack: every DynamoDB and Kinesis mapping, never a queue', () => {
    expect(findStartingStreamMappings({ functions, template: template(), deployedTemplate: undefined })).toEqual([
      { functionName: 'fromLatest', source: 'DynamoDB', fromLatest: true },
      { functionName: 'fromStart', source: 'DynamoDB', fromLatest: false },
      { functionName: 'kinesisLatest', source: 'Kinesis', fromLatest: true }
    ]);
  });

  test('an unchanged stack keeps its mappings reading, so nothing is reported', () => {
    expect(findStartingStreamMappings({ functions, template: template(), deployedTemplate: template() })).toEqual([]);
  });

  test('only the changed or newly added mappings of an existing stack are reported', () => {
    const deployed = template({ [cfLogicalNames.eventSourceMapping('fromLatest', 1)]: mapping('LATEST', 10) });
    delete deployed.Resources[cfLogicalNames.eventSourceMapping('kinesisLatest', 0)];
    expect(
      findStartingStreamMappings({ functions, template: template(), deployedTemplate: deployed }).map(
        ({ functionName }) => functionName
      )
    ).toEqual(['fromLatest', 'kinesisLatest']);
  });

  test('the notice warns about late records, and about lost ones only for LATEST', () => {
    expect(formatStartingStreamMappingsNotice([])).toBeUndefined();
    const trimHorizon = formatStartingStreamMappingsNotice([
      { functionName: 'orderStream', source: 'DynamoDB', fromLatest: false }
    ]);
    expect(trimHorizon).toContain('`orderStream` (DynamoDB)');
    expect(trimHorizon).toContain('can reach the function late');
    expect(trimHorizon).not.toContain('LATEST');
    const latest = formatStartingStreamMappingsNotice([
      { functionName: 'orderStream', source: 'DynamoDB', fromLatest: false },
      { functionName: 'audit', source: 'Kinesis', fromLatest: true }
    ]);
    expect(latest).toContain('`audit` reads from `startingPosition: LATEST`');
    expect(latest).toContain('`startingPosition: TRIM_HORIZON`');
    // A Kinesis stream can retain records for up to 365 days, not 24 hours.
    expect(latest).toContain('every record the stream still retains');
    expect(latest).not.toContain("stream's last 24 hours");
  });

  // #420 review: a replaced stream gives the mapping a new source while its `Fn::GetAtt` stays the same.
  test('a mapping whose stream is replaced is reported, and one whose stream only changes is not', () => {
    const streamFunctions = [
      { name: 'audit', events: [{ type: 'kinesis-stream', properties: { startingPosition: 'LATEST' } }] },
      { name: 'fanOut', events: [{ type: 'kinesis-stream', properties: { startingPosition: 'LATEST' } }] },
      { name: 'orders', events: [{ type: 'dynamo-db-stream', properties: { startingPosition: 'LATEST' } }] }
    ];
    const streamTemplate = ({
      streamName = 'shop-dev-audit',
      retention = 24,
      viewType = 'NEW_IMAGE',
      billing = 'PAY_PER_REQUEST'
    }: { streamName?: string; retention?: number; viewType?: string; billing?: string } = {}) => ({
      Resources: {
        AuditStream: {
          Type: 'AWS::Kinesis::Stream',
          Properties: { Name: streamName, RetentionPeriodHours: retention }
        },
        AuditConsumer: {
          Type: 'AWS::Kinesis::StreamConsumer',
          Properties: { ConsumerName: 'fan-out', StreamARN: { 'Fn::GetAtt': ['AuditStream', 'Arn'] } }
        },
        OrdersTable: {
          Type: 'AWS::DynamoDB::Table',
          Properties: { TableName: 'orders', BillingMode: billing, StreamSpecification: { StreamViewType: viewType } }
        },
        [cfLogicalNames.eventSourceMapping('audit', 0)]: {
          Type: 'AWS::Lambda::EventSourceMapping',
          Properties: { EventSourceArn: { 'Fn::GetAtt': ['AuditStream', 'Arn'] }, StartingPosition: 'LATEST' }
        },
        [cfLogicalNames.eventSourceMapping('fanOut', 0)]: {
          Type: 'AWS::Lambda::EventSourceMapping',
          Properties: { EventSourceArn: { Ref: 'AuditConsumer' }, StartingPosition: 'LATEST' }
        },
        [cfLogicalNames.eventSourceMapping('orders', 0)]: {
          Type: 'AWS::Lambda::EventSourceMapping',
          Properties: { EventSourceArn: { 'Fn::GetAtt': 'OrdersTable.StreamArn' }, StartingPosition: 'LATEST' }
        }
      }
    });
    const reported = (deployed: ReturnType<typeof streamTemplate>, next: ReturnType<typeof streamTemplate>) =>
      findStartingStreamMappings({ functions: streamFunctions, template: next, deployedTemplate: deployed }).map(
        ({ functionName }) => functionName
      );
    const before = streamTemplate();
    expect(reported(before, streamTemplate())).toEqual([]);
    // A new name replaces the stream: its mapping and the consumer's both read a new stream.
    expect(reported(before, streamTemplate({ streamName: 'shop-dev-audit-v2' }))).toEqual(['audit', 'fanOut']);
    // Longer retention and another billing mode update the stream and the table in place.
    expect(reported(before, streamTemplate({ retention: 168, billing: 'PROVISIONED' }))).toEqual([]);
    // Another view type gives the table a new stream.
    expect(reported(before, streamTemplate({ viewType: 'NEW_AND_OLD_IMAGES' }))).toEqual(['orders']);
  });
});
