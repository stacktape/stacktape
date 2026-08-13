import { describe, expect, test } from 'bun:test';
import type { StpLambdaFunction } from '../resolved-types/functions';
import { CliError } from '@utils/errors';
import { validateKafkaConsumerGroupUniqueness } from './validation';

const consumer = (name: string, consumerGroupId: string) =>
  ({
    name,
    events: [
      {
        type: 'kafka-topic',
        properties: {
          mskClusterArn: 'arn:aws:kafka:eu-west-1:123456789012:cluster/orders/uuid',
          topicName: name,
          startFrom: 'latest',
          consumerGroupId
        }
      }
    ]
  }) as unknown as StpLambdaFunction;

describe('Kafka config validation', () => {
  test('requires explicit consumer groups to be unique across functions', () => {
    expect(() =>
      validateKafkaConsumerGroupUniqueness({
        configManager: {
          functions: [consumer('orders', 'shared'), consumer('billing', 'shared')]
        }
      })
    ).toThrow(CliError);
  });

  test('allows AWS-assigned groups and distinct explicit groups', () => {
    const withoutGroup = consumer('orders', 'unused');
    delete (withoutGroup.events![0].properties as { consumerGroupId?: string }).consumerGroupId;
    expect(() =>
      validateKafkaConsumerGroupUniqueness({
        configManager: {
          functions: [withoutGroup, consumer('billing', 'billing-group'), consumer('audit', 'audit-group')]
        }
      })
    ).not.toThrow();
  });

  test('does not depend on synthesized helper Lambdas during initial config validation', () => {
    expect(() =>
      validateKafkaConsumerGroupUniqueness({
        configManager: { functions: [consumer('orders', 'orders-group')] }
      })
    ).not.toThrow();
  });
});
