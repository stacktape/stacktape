# KafkaTopicIntegrationProps API Reference

## TypeScript definition

```typescript
import type { CustomKafkaEventSource } from 'stacktape';

type KafkaTopicIntegrationProps = {
  /** The details of your Kafka cluster. */
  customKafkaConfiguration: CustomKafkaEventSource;
  /** The maximum number of records to process in a single batch. */
  batchSize?: number;
  /** The maximum time (in seconds) to wait before invoking the function with a batch of records. */
  maxBatchWindowSeconds?: number;
};
```

## Property: `customKafkaConfiguration`

- Required: yes
- Type: `CustomKafkaEventSource`

The details of your Kafka cluster.

Specifies the bootstrap servers, topic name, and authentication used by the self-managed Kafka event source.
This is required because self-managed Kafka is the only Kafka source currently supported by Stacktape.

## Property: `batchSize`

- Required: no
- Type: `number`
- Default: `100`

The maximum number of records to process in a single batch.

The function will be invoked with up to this many records. Maximum is 10,000.

## Property: `maxBatchWindowSeconds`

- Required: no
- Type: `number`
- Default: `0.5`

The maximum time (in seconds) to wait before invoking the function with a batch of records.

The function will be triggered when either the `batchSize` is reached or this time window expires.
Maximum is 300 seconds.
