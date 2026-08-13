import { describe, expect, test } from 'bun:test';
import { configManager } from '@domain-services/config-manager';
import type { StpLambdaFunction } from '@domain-services/config-manager/resolved-types/functions';
import { CliError } from '@utils/errors';
import { getHttpApiRouteKey } from './http-api-events';
import { resolveKafkaTopicEvents } from '../functions/events/kafka-topic';
import { resolveKinesisEvents } from '../functions/events/kinesis';
import { getScheduleEventRule } from '../functions/events/schedule';
import { resolveSnsEvents } from '../functions/events/sns';
import { resolveSqsEvents } from '../functions/events/sqs';
import { getHttpApiContainerWorkloadIntegration } from '../multi-container-workloads/events/http-api-gateway';

const expectCliError = (operation: () => unknown, code: string) => {
  try {
    operation();
    expect.unreachable(`Expected ${code}`);
  } catch (error: unknown) {
    expect(error).toBeInstanceOf(CliError);
    if (!(error instanceof CliError)) throw error;
    expect(error.code).toBe(code);
    expect(error.category).toBe('CONFIG_VALIDATION');
    expect(error.message).not.toContain('\u001B');
    return error;
  }
};

const functionWithEvent = (event: unknown) =>
  ({
    aliasLogicalName: undefined,
    cfLogicalName: 'WorkerFunction',
    configParentResourceType: 'function',
    events: [event],
    name: 'worker',
    nameChain: ['worker']
  }) as unknown as StpLambdaFunction;

describe('configuration errors used during resource synthesis', () => {
  test('identifies an invalid method on the HTTP API default route', () => {
    expectCliError(
      () =>
        getHttpApiRouteKey({
          workloadName: 'api',
          method: 'GET',
          path: '*'
        }),
      'CONFIG_HTTP_API_DEFAULT_ROUTE_METHOD_INVALID'
    );
  });

  test('identifies unsupported container HTTP API payload formats', () => {
    expectCliError(
      () =>
        getHttpApiContainerWorkloadIntegration({
          workloadName: 'api',
          workloadType: 'web-service',
          stpHttpApiGatewayName: 'gateway',
          targetedPort: 3000,
          payloadFormat: '2.0'
        }),
      'CONFIG_HTTP_API_CONTAINER_PAYLOAD_FORMAT_UNSUPPORTED'
    );
  });

  test('gives schedule syntax failures a stable code', () => {
    expectCliError(
      () =>
        getScheduleEventRule({
          workloadName: 'worker',
          lambdaEndpointArn: 'arn:aws:lambda:eu-west-1:111111111111:function:worker',
          eventIndex: 0,
          eventDetails: { scheduleRate: 'every minute' }
        }),
      'CONFIG_SCHEDULE_RATE_INVALID'
    );
  });

  test('distinguishes conflicting and malformed schedule input', () => {
    expectCliError(
      () =>
        getScheduleEventRule({
          workloadName: 'worker',
          lambdaEndpointArn: 'arn:aws:lambda:eu-west-1:111111111111:function:worker',
          eventIndex: 0,
          eventDetails: { scheduleRate: 'rate(1 minute)', input: '{}', inputPath: '$' }
        }),
      'CONFIG_SCHEDULE_INPUT_CONFLICT'
    );
    expectCliError(
      () =>
        getScheduleEventRule({
          workloadName: 'worker',
          lambdaEndpointArn: 'arn:aws:lambda:eu-west-1:111111111111:function:worker',
          eventIndex: 0,
          eventDetails: { scheduleRate: 'rate(1 minute)', input: '{' }
        }),
      'CONFIG_SCHEDULE_INPUT_INVALID'
    );
  });

  test('identifies invalid SQS and SNS event references', () => {
    for (const properties of [
      {},
      {
        sqsQueueArn: 'arn:aws:sqs:eu-west-1:111111111111:queue',
        sqsQueueName: 'queue'
      }
    ]) {
      const error = expectCliError(
        () => resolveSqsEvents({ lambdaFunction: functionWithEvent({ type: 'sqs', properties }) }),
        'CONFIG_SQS_QUEUE_REFERENCE_INVALID'
      );
      expect(error.message).toContain('function `worker`');
    }

    for (const properties of [
      {},
      {
        snsTopicArn: 'arn:aws:sns:eu-west-1:111111111111:topic',
        snsTopicName: 'topic'
      }
    ]) {
      const error = expectCliError(
        () => resolveSnsEvents({ lambdaFunction: functionWithEvent({ type: 'sns', properties }) }),
        'CONFIG_SNS_TOPIC_REFERENCE_INVALID'
      );
      expect(error.message).toContain('function `worker`');
    }
  });

  test('rejects FIFO SNS topics as Lambda event sources', () => {
    const previousConfig = configManager.config;
    configManager.config = {
      resources: {
        topic: {
          type: 'sns-topic',
          properties: { fifoEnabled: true }
        }
      }
    } as typeof configManager.config;

    try {
      const error = expectCliError(
        () =>
          resolveSnsEvents({
            lambdaFunction: functionWithEvent({ type: 'sns', properties: { snsTopicName: 'topic' } })
          }),
        'CONFIG_SNS_FIFO_TOPIC_UNSUPPORTED'
      );
      expect(error.message).toContain('SNS topic `topic`');
    } finally {
      configManager.config = previousConfig;
    }
  });

  test('identifies conflicting Kinesis consumer settings', () => {
    const error = expectCliError(
      () =>
        resolveKinesisEvents({
          lambdaFunction: functionWithEvent({
            type: 'kinesis-stream',
            properties: {
              autoCreateConsumer: true,
              consumerArn: 'arn:aws:kinesis:eu-west-1:111111111111:stream/events/consumer/worker:1',
              streamArn: 'arn:aws:kinesis:eu-west-1:111111111111:stream/events'
            }
          })
        }),
      'CONFIG_KINESIS_CONSUMER_CONFLICT'
    );
    expect(error.message).toContain('function `worker`');
    expect(error.hints).toEqual(['Specify only one of these properties, or omit both.']);
  });

  test('requires exactly one Kinesis stream reference', () => {
    for (const properties of [
      {},
      {
        kinesisStreamName: 'events',
        streamArn: 'arn:aws:kinesis:eu-west-1:111111111111:stream/events'
      }
    ]) {
      const error = expectCliError(
        () =>
          resolveKinesisEvents({
            lambdaFunction: functionWithEvent({ type: 'kinesis-stream', properties })
          }),
        'CONFIG_KINESIS_STREAM_REFERENCE_INVALID'
      );
      expect(error.message).toContain('function `worker`');
    }
  });

  test('requires the self-managed Kafka source configuration', () => {
    const error = expectCliError(
      () =>
        resolveKafkaTopicEvents({
          lambdaFunction: functionWithEvent({ type: 'kafka-topic', properties: {} })
        }),
      'CONFIG_KAFKA_SOURCE_EXACTLY_ONE'
    );
    expect(error.message).toContain('function `worker`');
  });

  test('requires exactly one SNS delivery-failure queue reference', () => {
    for (const onDeliveryFailure of [
      {},
      {
        sqsQueueArn: 'arn:aws:sqs:eu-west-1:111111111111:failures',
        sqsQueueName: 'failures'
      }
    ]) {
      const error = expectCliError(
        () =>
          resolveSnsEvents({
            lambdaFunction: functionWithEvent({
              type: 'sns',
              properties: {
                onDeliveryFailure,
                snsTopicArn: 'arn:aws:sns:eu-west-1:111111111111:events'
              }
            })
          }),
        'CONFIG_SNS_DELIVERY_FAILURE_QUEUE_REFERENCE_INVALID'
      );
      expect(error.message).toContain('function `worker`');
    }
  });
});
