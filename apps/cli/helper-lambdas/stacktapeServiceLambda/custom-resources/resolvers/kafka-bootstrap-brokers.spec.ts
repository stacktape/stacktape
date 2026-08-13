import { describe, expect, test } from 'bun:test';
import { GetBootstrapBrokersCommand } from '@aws-sdk/client-kafka';
import { resolveKafkaBootstrapBrokers } from './kafka-bootstrap-brokers';

describe('Kafka bootstrap-brokers custom resource', () => {
  test('returns the real IAM broker response field', async () => {
    const commands: unknown[] = [];
    const result = await resolveKafkaBootstrapBrokers({
      clusterArn: 'arn:aws:kafka:eu-west-1:123456789012:cluster/orders/uuid',
      operation: 'Create',
      client: {
        send: async (command) => {
          commands.push(command);
          return { BootstrapBrokerStringSaslIam: 'broker-1:9098,broker-2:9098' };
        }
      }
    });

    expect(commands[0]).toBeInstanceOf(GetBootstrapBrokersCommand);
    expect((commands[0] as GetBootstrapBrokersCommand).input.ClusterArn).toContain(':cluster/orders/uuid');
    expect(result).toEqual({
      data: { BootstrapServers: 'broker-1:9098,broker-2:9098' },
      physicalResourceId: 'arn:aws:kafka:eu-west-1:123456789012:cluster/orders/uuid'
    });
  });

  test('deletion is a no-op and never calls MSK', async () => {
    let called = false;
    const result = await resolveKafkaBootstrapBrokers({
      clusterArn: 'arn:aws:kafka:eu-west-1:123456789012:cluster/orders/uuid',
      operation: 'Delete',
      client: { send: async () => ((called = true), {}) }
    });
    expect(called).toBe(false);
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
