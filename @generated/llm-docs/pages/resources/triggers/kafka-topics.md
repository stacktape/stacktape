# Kafka Topics

A Kafka topic trigger invokes a function when new messages are available in an Apache Kafka topic. Configure this trigger on a [Lambda function](/resources/compute/lambda-function) to batch records and deliver them to your handler. The supported authentication methods are SASL and mutual TLS (MTLS), with credentials stored in AWS Secrets Manager.

## When to use

Use a Kafka topic trigger when you have Kafka brokers reachable from Lambda and want a Lambda-based consumer for a topic. AWS Lambda handles polling and invocation for the event source mapping, so you do not run a separate consumer process yourself.

Common scenarios:

- Processing order events, clickstreams, or CDC records from a Kafka topic
- Bridging Kafka into AWS-native workflows (persist to DynamoDB, forward to SQS, trigger Step Functions)
- Running lightweight transformations or enrichments on each batch of Kafka records

## When NOT to use

- **Simple message queuing** — if you don't already run Kafka, an [SQS queue trigger](/resources/triggers/sqs-events) is simpler and cheaper for standard async processing.
- **Fan-out to multiple consumers** — Kafka handles fan-out natively via consumer groups, but if your architecture is AWS-native, [SNS](/resources/triggers/sns-events) or [EventBridge](/resources/triggers/event-bus-events) is typically easier to operate.
- **Ordered stream processing with retry controls** — if you need `maximumRetryAttempts`, `onFailure` destinations, or `bisectBatchOnFunctionError`, consider a [Kinesis stream trigger](/resources/triggers/kinesis-events) or [DynamoDB stream trigger](/resources/triggers/dynamodb-streams) instead. The Kafka topic trigger does not expose these properties.

## Basic example

This example creates a Lambda function that consumes messages from a Kafka topic using SASL/SCRAM-512 authentication.


Example (TypeScript):

```typescript
import {
  defineConfig,
  LambdaFunction,
  StacktapeLambdaBuildpackPackaging,
  KafkaTopicIntegration
} from 'stacktape';
export default defineConfig(() => {
  const orderConsumer = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/kafka-consumer.ts'
    }),
    memory: 512,
    timeout: 60,
    events: [
      new KafkaTopicIntegration({
        customKafkaConfiguration: {
          bootstrapServers: ['broker1.example.com:9092', 'broker2.example.com:9092'],
          topicName: 'order-events',
          authentication: {
            type: 'SASL_SCRAM_512_AUTH',
            properties: {
              authenticationSecretArn:
                'arn:aws:secretsmanager:eu-west-1:123456789012:secret:kafka-creds'
            }
          }
        },
        batchSize: 100,
        maxBatchWindowSeconds: 5
      })
    ]
  });

  return { resources: { orderConsumer } };
});
```


The `bootstrapServers` array contains `host:port` addresses for your Kafka brokers. The `topicName` identifies which Kafka topic to consume from.

`batchSize` controls how many records are delivered per invocation (default 100, maximum 10,000). `maxBatchWindowSeconds` sets the maximum wait time before invoking with whatever records are available (default 0.5 seconds, maximum 300 seconds). The function is triggered when either `batchSize` is reached or `maxBatchWindowSeconds` expires.

## Authentication

The Kafka cluster configuration includes an authentication block. The supported authentication variants are SASL and MTLS, both referencing Secrets Manager secret ARNs for credentials.

### SASL authentication

SASL (Simple Authentication and Security Layer) authenticates with a username and password stored in AWS Secrets Manager. Three protocol variants are available:

| Type value | Protocol | When to use |
|---|---|---|
| `BASIC_AUTH` | SASL/PLAIN | Clusters configured for the SASL/PLAIN mechanism |
| `SASL_SCRAM_256_AUTH` | SCRAM-SHA-256 | Production clusters with SCRAM-256 enabled |
| `SASL_SCRAM_512_AUTH` | SCRAM-SHA-512 | Production clusters with SCRAM-512 enabled |

The referenced Secrets Manager secret must be a JSON object with `username` and `password` keys. You can create it using the [`stacktape secret:set`](/cli/secret-set) CLI command. Set `authenticationSecretArn` to the ARN of the Secrets Manager secret that contains the Kafka credentials.

Stacktape exposes `BASIC_AUTH`, `SASL_SCRAM_256_AUTH`, and `SASL_SCRAM_512_AUTH`. Choose the variant that matches your Kafka cluster's configured SASL mechanism. Use `BASIC_AUTH` only when the broker requires SASL/PLAIN.


Example (TypeScript):

```typescript
import {
  defineConfig,
  LambdaFunction,
  StacktapeLambdaBuildpackPackaging,
  KafkaTopicIntegration
} from 'stacktape';
export default defineConfig(() => {
  const consumer = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/consumer.ts'
    }),
    events: [
      new KafkaTopicIntegration({
        customKafkaConfiguration: {
          bootstrapServers: ['kafka.internal.example.com:9092'],
          topicName: 'user-activity',
          authentication: {
            type: 'SASL_SCRAM_512_AUTH',
            properties: {
              authenticationSecretArn:
                'arn:aws:secretsmanager:eu-west-1:123456789012:secret:kafka-sasl-creds'
            }
          }
        }
      })
    ]
  });

  return { resources: { consumer } };
});
```


### Mutual TLS (MTLS) authentication

MTLS authenticates using a client-side TLS certificate. Use this when your Kafka cluster requires certificate-based identity verification — typically in enterprise or zero-trust environments. The `clientCertificate` secret must contain the certificate chain (X.509 PEM), private key (PKCS#8 PEM), and an optional private key password. Optionally provide a `serverRootCaCertificate` for clusters with self-signed or private CA certificates.

MTLS is more complex to set up than SASL — you need to manage certificate rotation and ensure the client certificate is trusted by the broker. Choose MTLS when your organization mandates certificate-based authentication; otherwise, SASL is simpler to operate.


Example (TypeScript):

```typescript
import {
  defineConfig,
  LambdaFunction,
  StacktapeLambdaBuildpackPackaging,
  KafkaTopicIntegration
} from 'stacktape';
export default defineConfig(() => {
  const consumer = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/consumer.ts'
    }),
    events: [
      new KafkaTopicIntegration({
        customKafkaConfiguration: {
          bootstrapServers: ['broker.secure.example.com:9094'],
          topicName: 'transactions',
          authentication: {
            type: 'MTLS',
            properties: {
              clientCertificate:
                'arn:aws:secretsmanager:eu-west-1:123456789012:secret:kafka-client-cert',
              serverRootCaCertificate:
                'arn:aws:secretsmanager:eu-west-1:123456789012:secret:kafka-root-ca'
            }
          }
        }
      })
    ]
  });

  return { resources: { consumer } };
});
```


> **Info:** The `serverRootCaCertificate` is optional. Omit it when your brokers use certificates issued by a publicly trusted CA. Include it when brokers use a private or self-signed CA.


## Batching and throughput

Kafka topic triggers deliver messages in batches. Two properties on `KafkaTopicIntegration` control how batches are formed:

| Property | Default | Maximum | Effect |
|---|---|---|---|
| `batchSize` | 100 | 10,000 | Maximum records delivered per invocation |
| `maxBatchWindowSeconds` | 0.5 | 300 | Maximum seconds to wait before invoking with available records |

The function is triggered when either `batchSize` is reached or `maxBatchWindowSeconds` expires — whichever comes first. A larger `batchSize` reduces the number of invocations (lower cost) but increases per-invocation latency and memory usage. A longer `maxBatchWindowSeconds` accumulates more records into each batch, which is useful for low-throughput topics where you want to avoid many small invocations.

Increase `batchSize` or `maxBatchWindowSeconds` when you want larger batches and can tolerate more waiting. Keep the default batch window when latency matters more than invocation count.


> **Warning:** Kafka records are delivered in batches, so design handlers so that repeated processing of the same record is safe when your broader pipeline can retry or replay messages.


## Handler example

Your Lambda function receives a batch of Kafka records as an event object. The event follows the standard AWS Lambda event format for Kafka triggers. AWS Lambda's self-managed Kafka event format encodes record keys and values as base64 strings.

```typescript
export const handler = async (event: any) => {
  for (const [topicPartition, records] of Object.entries(event.records)) {
    for (const record of records as any[]) {
      const value = Buffer.from(record.value, 'base64').toString('utf-8');
      const key = record.key ? Buffer.from(record.key, 'base64').toString('utf-8') : null;
      console.info(`Partition: ${record.partition}, Offset: ${record.offset}, Key: ${key}, Value: ${value}`);
    }
  }
};
```

Stacktape does not redefine the AWS Lambda Kafka event payload. Refer to the [AWS Lambda documentation on self-managed Kafka events](https://docs.aws.amazon.com/lambda/latest/dg/with-kafka.html) for the complete event structure.

## Network connectivity

The Kafka brokers specified in `bootstrapServers` must be reachable from the AWS Lambda execution environment. Public broker endpoints are usually reachable without VPC configuration, while private brokers require Lambda VPC access and matching routing/security-group rules.

For private Kafka clusters (running inside a VPC, on-premises, or behind a VPN), configure your Lambda function with VPC access so it can reach the broker endpoints. See the [Lambda function](/resources/compute/lambda-function) page for VPC configuration options. Ensure security groups and routing allow outbound connectivity to your broker endpoints on the configured ports.

## API reference


## API Reference: `KafkaTopicIntegrationProps`
```typescript
import type { CustomKafkaEventSource } from 'stacktape';

type KafkaTopicIntegrationProps = {
  /** The maximum number of records to process in a single batch. */
  batchSize?: number;
  /** The details of your Kafka cluster. */
  customKafkaConfiguration?: CustomKafkaEventSource;
  /** The maximum time (in seconds) to wait before invoking the function with a batch of records. */
  maxBatchWindowSeconds?: number;
};
```

| Property | Required | Type | Description | Default |
| --- | --- | --- | --- | --- |
| `batchSize` | no | `number` | The maximum number of records to process in a single batch. The function will be invoked with up to this many records. Maximum is 10,000. | `100` |
| `customKafkaConfiguration` | no | `CustomKafkaEventSource` | The details of your Kafka cluster. Specifies the bootstrap servers and topic name. | - |
| `maxBatchWindowSeconds` | no | `number` | The maximum time (in seconds) to wait before invoking the function with a batch of records. The function will be triggered when either the `batchSize` is reached or this time window expires.
Maximum is 300 seconds. | `0.5` |


## FAQ

### Can I consume from multiple Kafka topics with one Lambda function?

Yes. The Lambda function `events` property accepts an array, so you can add multiple `KafkaTopicIntegration` entries — each pointing to a different topic or a different cluster. This is useful when a single function needs to process events from several sources with the same handler logic.

### What happens if my function fails?

Unlike [Kinesis stream](/resources/triggers/kinesis-events) or [DynamoDB stream](/resources/triggers/dynamodb-streams) triggers, which expose `maximumRetryAttempts` and `onFailure` destination properties, the Kafka topic trigger does not expose these controls. Design your handler to be idempotent, and consider implementing dead-letter logic within your function code if you need to capture persistently failing records.

### How do I create the Secrets Manager secret for authentication?

Create a Secrets Manager secret with the [`stacktape secret:set`](/cli/secret-set) command. For SASL, the secret value must be a JSON object with `username` and `password` keys — set the resulting ARN as `authenticationSecretArn`. For MTLS, the `clientCertificate` property (required) references a secret containing the certificate chain (X.509 PEM), private key (PKCS#8 PEM), and an optional private key password. The `serverRootCaCertificate` property (optional) references a separate secret containing the server's root CA certificate for clusters using a private or self-signed CA.

### Which authentication type should I use: SASL or MTLS?

Stacktape exposes four types: `BASIC_AUTH` (SASL/PLAIN), `SASL_SCRAM_256_AUTH`, `SASL_SCRAM_512_AUTH`, and `MTLS`. The SASL variants authenticate with a username and password stored in Secrets Manager and are simpler to operate — pick the variant matching your cluster's configured SASL mechanism (use `BASIC_AUTH` only when the broker requires SASL/PLAIN). Choose `MTLS` (client TLS certificate) only when your organization mandates certificate-based identity, since you then have to manage certificate rotation and broker trust.

### Is there a cost for the Kafka event-source mapping?

There is no Stacktape-specific surcharge for Kafka topic triggers. Costs come from the underlying AWS services — primarily Lambda invocation and duration, plus Secrets Manager for credential retrieval. Refer to the AWS Lambda and AWS Secrets Manager pricing pages for current rates.

### Can I filter messages before they reach my function?

`KafkaTopicIntegrationProps` exposes `customKafkaConfiguration`, `batchSize`, and `maxBatchWindowSeconds`; it does not expose a Stacktape-level filter property for Kafka triggers. If you need filtering, implement it in your handler or route records into narrower Kafka topics before attaching the trigger.
