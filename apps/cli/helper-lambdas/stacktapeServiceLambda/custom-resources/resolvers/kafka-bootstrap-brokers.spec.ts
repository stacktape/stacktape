import { describe, expect, test } from 'bun:test';
import { Kafka } from '@aws-sdk/client-kafka';
import { resolveKafkaBootstrapBrokers } from './kafka-bootstrap-brokers';

const clusterArn = 'arn:aws:kafka:eu-west-1:123456789012:cluster/orders/uuid';

// MiniStack lacks MSK. This provider accepts only the actual bootstrap-brokers wire request for this cluster.
const resolveAgainstMsk = async (response: Record<string, string>, operation: 'Create' | 'Update') => {
  const server = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    fetch(request) {
      if (
        request.method !== 'GET' ||
        decodeURIComponent(new URL(request.url).pathname) !== `/v1/clusters/${clusterArn}/bootstrap-brokers`
      ) {
        return Response.json({ message: 'Unknown MSK operation or cluster' }, { status: 404 });
      }
      return Response.json(response);
    }
  });
  const client = new Kafka({
    region: 'eu-west-1',
    endpoint: String(server.url),
    credentials: { accessKeyId: 'synthetic-msk-key', secretAccessKey: 'synthetic-msk-secret' },
    maxAttempts: 1
  });
  try {
    return await resolveKafkaBootstrapBrokers({ clusterArn, operation, client });
  } finally {
    client.destroy();
    await server.stop(true);
  }
};

describe('Kafka bootstrap-brokers custom resource', () => {
  test('returns the IAM brokers of a cluster that also enables TLS and plaintext listeners', async () => {
    const result = await resolveAgainstMsk(
      {
        bootstrapBrokerString: 'broker-1:9092,broker-2:9092',
        bootstrapBrokerStringTls: 'broker-1:9094,broker-2:9094',
        bootstrapBrokerStringSaslIam: 'broker-1:9098,broker-2:9098'
      },
      'Create'
    );

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
    await expect(resolveAgainstMsk({}, 'Update')).rejects.toThrow('did not return IAM bootstrap brokers');
  });
});
