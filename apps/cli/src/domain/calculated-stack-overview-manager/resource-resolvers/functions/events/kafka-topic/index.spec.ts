import { beforeAll, describe, expect, test } from 'bun:test';
import type { KafkaTopicIntegrationProps } from '@stacktape/config/events';
import type { StpLambdaFunction } from '@domain-services/config-manager/resolved-types/functions';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { CliError } from '@utils/errors';
import {
  getEventSourceMapping,
  getKafkaEventSourceMappingLogicalName,
  resolveKafkaTopicEvents,
  validateExistingMskArn,
  validateKafkaEventOptions,
  validateKafkaEventsForFunction,
  validateKafkaSecretArn,
  validateNativeKafkaTriggerVpc
} from '.';

const existing = (overrides: Record<string, unknown> = {}) =>
  ({
    mskClusterArn: `arn:aws:kafka:${calculatedStackOverviewManager.context.region}:${calculatedStackOverviewManager.context.accountId}:cluster/orders.prod_v2/uuid-1`,
    topicName: 'orders',
    startFrom: 'latest',
    ...overrides
  }) as unknown as KafkaTopicIntegrationProps;

const selfManaged = (overrides: Record<string, unknown> = {}) =>
  ({
    customKafkaConfiguration: {
      bootstrapServers: ['broker.internal:9096'],
      topicName: 'orders',
      authentication: {
        type: 'SASL_SCRAM_512_AUTH',
        properties: { authenticationSecretArn: 'arn:aws:secretsmanager:eu-west-1:123456789012:secret:kafka' }
      }
    },
    startFrom: 'earliest',
    ...overrides
  }) as unknown as KafkaTopicIntegrationProps;

const lambda = (eventProperties: KafkaTopicIntegrationProps[], timeout = 30) =>
  ({
    aliasLogicalName: undefined,
    cfLogicalName: 'WorkerFunction',
    configParentResourceType: 'function',
    events: eventProperties.map((properties) => ({ type: 'kafka-topic', properties })),
    name: 'worker',
    nameChain: ['worker'],
    timeout
  }) as unknown as StpLambdaFunction;

const expectCode = (operation: () => unknown, code: string) => {
  try {
    operation();
    expect.unreachable(`Expected ${code}`);
  } catch (error) {
    expect(error).toBeInstanceOf(CliError);
    expect((error as CliError).code).toBe(code);
  }
};

beforeAll(async () => {
  await calculatedStackOverviewManager.init({
    context: {
      accountId: '123456789012',
      command: 'synth',
      globallyUniqueStackHash: 'hash',
      invocationId: 'invocation',
      projectName: 'project',
      region: 'eu-west-1',
      stackName: 'project-production',
      stage: 'production',
      workingDir: 'C:/project'
    }
  });
});

describe('Kafka topic event validation and synthesis', () => {
  test('requires exactly one source and an exact start position', () => {
    expectCode(
      () => validateKafkaEventOptions('worker', {} as KafkaTopicIntegrationProps),
      'CONFIG_KAFKA_SOURCE_EXACTLY_ONE'
    );
    expectCode(
      () => validateKafkaEventOptions('worker', existing({ kafkaClusterName: 'native' })),
      'CONFIG_KAFKA_SOURCE_EXACTLY_ONE'
    );
    expectCode(
      () => validateKafkaEventOptions('worker', existing({ startFrom: 'middle' })),
      'CONFIG_KAFKA_START_POSITION_REQUIRED'
    );
  });

  test('validates topic and batching boundaries', () => {
    expectCode(
      () => validateKafkaEventOptions('worker', existing({ topicName: '.hidden' })),
      'CONFIG_KAFKA_TOPIC_NAME_INVALID'
    );
    expect(() => validateKafkaEventOptions('worker', existing({ batchSize: 10 }))).not.toThrow();
    expect(() => validateKafkaEventOptions('worker', existing({ batchSize: 11 }))).not.toThrow();
    expect(() =>
      validateKafkaEventOptions('worker', existing({ batchSize: 11, maxBatchWindowSeconds: 0 }))
    ).not.toThrow();
    expect(() =>
      validateKafkaEventOptions('worker', existing({ batchSize: 11, maxBatchWindowSeconds: 1 }))
    ).not.toThrow();
    expect(() =>
      validateKafkaEventOptions('worker', existing({ consumerGroupId: 'orders/v2:blue+canary=1@stacktape' }))
    ).not.toThrow();
    expectCode(
      () => validateKafkaEventOptions('worker', existing({ consumerGroupId: 'orders-*' })),
      'CONFIG_KAFKA_CONSUMER_GROUP_INVALID'
    );
  });

  test('maps native AWS properties and omits consumer-group configuration by default', () => {
    const mapping = getEventSourceMapping({ eventDetails: existing(), lambdaEndpointArn: 'function-arn' });
    expect(mapping.Properties).toMatchObject({ StartingPosition: 'LATEST', Topics: ['orders'] });
    expect(mapping.Properties.AmazonManagedKafkaEventSourceConfig).toBeUndefined();
    expect(mapping.Properties.SelfManagedKafkaEventSourceConfig).toBeUndefined();
  });

  test('maps self-managed VPC access and preserves its v4 baseline logical ID', () => {
    const details = selfManaged({
      consumerGroupId: 'orders-worker',
      vpc: { subnetIds: ['subnet-1', 'subnet-2'], securityGroupIds: ['sg-1'] }
    });
    const mapping = getEventSourceMapping({ eventDetails: details, lambdaEndpointArn: 'function-arn' });
    expect(mapping.Properties).toMatchObject({
      StartingPosition: 'TRIM_HORIZON',
      SelfManagedKafkaEventSourceConfig: { ConsumerGroupId: 'orders-worker' },
      SourceAccessConfigurations: expect.arrayContaining([
        { Type: 'VPC_SUBNET', URI: 'subnet:subnet-1' },
        { Type: 'VPC_SECURITY_GROUP', URI: 'security_group:sg-1' }
      ])
    });
    expect(getKafkaEventSourceMappingLogicalName({ event: details, eventIndex: 2, functionName: 'worker' })).toBe(
      cfLogicalNames.eventSourceMapping('worker', 2)
    );
  });

  test('validates self-managed broker and VPC source access', () => {
    expectCode(
      () =>
        validateKafkaEventOptions(
          'worker',
          selfManaged({ customKafkaConfiguration: { ...selfManaged().customKafkaConfiguration, bootstrapServers: [] } })
        ),
      'CONFIG_KAFKA_BOOTSTRAP_SERVERS_INVALID'
    );
    for (const broker of ['broker..example.com:9092', '-broker.example.com:9092', 'broker.example.com:0']) {
      expectCode(
        () =>
          validateKafkaEventOptions(
            'worker',
            selfManaged({
              customKafkaConfiguration: {
                ...selfManaged().customKafkaConfiguration,
                bootstrapServers: [broker]
              }
            })
          ),
        'CONFIG_KAFKA_BOOTSTRAP_SERVERS_INVALID'
      );
    }
    expectCode(
      () =>
        validateKafkaEventOptions(
          'worker',
          selfManaged({
            customKafkaConfiguration: {
              ...selfManaged().customKafkaConfiguration,
              bootstrapServers: ['not a broker']
            }
          })
        ),
      'CONFIG_KAFKA_BOOTSTRAP_SERVERS_INVALID'
    );
    expectCode(
      () => validateKafkaEventOptions('worker', selfManaged({ vpc: { subnetIds: [], securityGroupIds: [] } })),
      'CONFIG_KAFKA_VPC_ACCESS_INVALID'
    );
  });

  test('requires concrete same-region Secrets Manager ARNs before granting secret access', () => {
    expect(() =>
      validateKafkaSecretArn(
        'worker',
        `arn:aws:secretsmanager:${calculatedStackOverviewManager.context.region}:999999999999:secret:kafka-creds-a1b2c3`
      )
    ).not.toThrow();
    const wrongRegionArn = `arn:aws:secretsmanager:us-east-1:${calculatedStackOverviewManager.context.accountId}:secret:kafka-creds-a1b2c3`;
    expectCode(
      () =>
        resolveKafkaTopicEvents({
          lambdaFunction: lambda([
            selfManaged({
              customKafkaConfiguration: {
                ...selfManaged().customKafkaConfiguration,
                authentication: {
                  type: 'SASL_SCRAM_512_AUTH',
                  properties: { authenticationSecretArn: wrongRegionArn }
                }
              }
            })
          ])
        }),
      'CONFIG_KAFKA_SECRET_ARN_INVALID'
    );
    for (const arn of [
      `arn:aws:secretsmanager:${calculatedStackOverviewManager.context.region}:${calculatedStackOverviewManager.context.accountId}:secret:kafka-*`,
      `arn:aws:ssm:${calculatedStackOverviewManager.context.region}:${calculatedStackOverviewManager.context.accountId}:parameter/kafka`
    ]) {
      expectCode(() => validateKafkaSecretArn('worker', arn), 'CONFIG_KAFKA_SECRET_ARN_INVALID');
    }
  });

  test('uses consumer groups in managed logical identity and rejects duplicates', () => {
    const first = getKafkaEventSourceMappingLogicalName({
      event: existing({ consumerGroupId: 'first' }),
      eventIndex: 0,
      functionName: 'worker'
    });
    const second = getKafkaEventSourceMappingLogicalName({
      event: existing({ consumerGroupId: 'second' }),
      eventIndex: 1,
      functionName: 'worker'
    });
    expect(first).not.toBe(second);
    expectCode(
      () => validateKafkaEventsForFunction({ lambdaFunction: lambda([existing(), existing()]) }),
      'CONFIG_KAFKA_EVENT_DUPLICATE'
    );
  });

  test('enforces the Lambda 14-minute Kafka limit', () => {
    expectCode(
      () => validateKafkaEventsForFunction({ lambdaFunction: lambda([selfManaged()], 841) }),
      'CONFIG_KAFKA_FUNCTION_TIMEOUT_INVALID'
    );
    expect(() => validateKafkaEventsForFunction({ lambdaFunction: lambda([selfManaged()], 840) })).not.toThrow();
  });

  test('accepts a safe existing ARN but rejects region and wildcard injection', () => {
    expect(() => validateExistingMskArn(existing().mskClusterArn!)).not.toThrow();
    expectCode(
      () =>
        validateExistingMskArn(
          `arn:aws:kafka:us-east-1:${calculatedStackOverviewManager.context.accountId}:cluster/orders/uuid`
        ),
      'CONFIG_KAFKA_MSK_ARN_INVALID'
    );
    expectCode(
      () =>
        validateExistingMskArn(
          `arn:aws:kafka:${calculatedStackOverviewManager.context.region}:${calculatedStackOverviewManager.context.accountId}:cluster/orders*/uuid`
        ),
      'CONFIG_KAFKA_MSK_ARN_INVALID'
    );
  });

  test('does not claim ownership of VPC-global endpoints in a reused VPC', () => {
    expectCode(() => validateNativeKafkaTriggerVpc({ reusedVpc: true }), 'CONFIG_KAFKA_REUSED_VPC_TRIGGER_UNSUPPORTED');
    expect(() => validateNativeKafkaTriggerVpc({ reusedVpc: false })).not.toThrow();
  });
});
