import { describe, expect, test } from 'bun:test';
import { resolveKafkaBootstrapBrokers } from './kafka-bootstrap-brokers';

describe('Kafka bootstrap-brokers custom resource', () => {
  test('returns the real IAM broker response field', async () => {
    const result = await resolveKafkaBootstrapBrokers({
      clusterArn: 'arn:aws:kafka:eu-west-1:123456789012:cluster/orders/uuid',
      operation: 'Create',
      client: {
        send: async () => {
          return { BootstrapBrokerStringSaslIam: 'broker-1:9098,broker-2:9098' };
        }
      }
    });

    expect(result).toEqual({
      data: { BootstrapServers: 'broker-1:9098,broker-2:9098' },
      physicalResourceId: 'arn:aws:kafka:eu-west-1:123456789012:cluster/orders/uuid'
    });
  });

  test('deletion is a no-op and never calls MSK', async () => {
    const result = await resolveKafkaBootstrapBrokers({
      clusterArn: 'arn:aws:kafka:eu-west-1:123456789012:cluster/orders/uuid',
      operation: 'Delete',
      client: {
        send: async () => {
          throw new Error('Deleted MSK cluster is unavailable');
        }
      }
    });
    expect(result.data).toEqual({});
  });

  test('fails closed when MSK does not return IAM brokers', async () => {
    await expect(
      resolveKafkaBootstrapBrokers({
        clusterArn: 'arn:aws:kafka:eu-west-1:123456789012:cluster/orders/uuid',
        operation: 'Update',
        client: { send: async () => ({}) }
      })
    ).rejects.toThrow('did not return IAM bootstrap brokers');
  });
});
