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
    expect(trimHorizon).toContain('reach the function late');
    expect(trimHorizon).not.toContain('LATEST');
    const latest = formatStartingStreamMappingsNotice([
      { functionName: 'orderStream', source: 'DynamoDB', fromLatest: false },
      { functionName: 'audit', source: 'Kinesis', fromLatest: true }
    ]);
    expect(latest).toContain('`audit` reads from `startingPosition: LATEST`');
    expect(latest).toContain('`startingPosition: TRIM_HORIZON`');
  });
});
