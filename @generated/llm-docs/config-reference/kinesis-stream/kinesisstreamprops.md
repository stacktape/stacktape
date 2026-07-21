# KinesisStreamProps API Reference

Resource type: `kinesis-stream`

## TypeScript definition

```typescript
import type { KinesisStreamEncryption } from 'stacktape';

type KinesisStreamProps = {
  /** How the stream scales. */
  capacityMode?: "ON_DEMAND" | "PROVISIONED";
  /** Give each consumer its own dedicated 2 MB/s read throughput (instead of sharing). */
  enableEnhancedFanOut?: boolean;
  /** Encrypt data at rest using a KMS key. */
  encryption?: KinesisStreamEncryption;
  /** How long records stay in the stream (hours). Range: 24–8,760 (365 days). Beyond 24h costs extra. */
  retentionPeriodHours?: number;
  /** Number of shards. Only used when capacityMode is PROVISIONED. */
  shardCount?: number;
};
```

## Property: `capacityMode`

- Required: no
- Type: `string: "ON_DEMAND" | "PROVISIONED"`
- Default: `ON_DEMAND`

How the stream scales.

**`ON_DEMAND`**: Auto-scales, pay per GB. Recommended for most use cases.
**`PROVISIONED`**: You choose a fixed number of shards (1 MB/s write, 2 MB/s read each). More predictable costs.

### Example 1 (yaml)

```yaml
# capacityMode
resources:
  eventStream:
    type: kinesis-stream
    properties:
      capacityMode: ON_DEMAND
      retentionPeriodHours: 48
  streamProcessor:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/process-records.ts
      events:
        - type: kinesis-stream
          properties:
            kinesisStreamName: eventStream
            batchSize: 100
            startingPosition: LATEST
```

### Example 2 (typescript)

```typescript
// capacityMode
import { KinesisStream, LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const eventStream = new KinesisStream({
    capacityMode: 'ON_DEMAND',
    retentionPeriodHours: 48
  });

  const streamProcessor = new LambdaFunction({
    packaging: {
      type: 'stacktape-lambda-buildpack',
      properties: { entryfilePath: 'src/process-records.ts' }
    },
    events: [
      {
        type: 'kinesis-stream',
        properties: {
          kinesisStreamName: 'eventStream',
          batchSize: 100,
          startingPosition: 'LATEST'
        }
      }
    ]
  });

  return { resources: { eventStream, streamProcessor } };
});
```

## Property: `enableEnhancedFanOut`

- Required: no
- Type: `boolean`
- Default: `false`

Give each consumer its own dedicated 2 MB/s read throughput (instead of sharing).

Use when you have multiple consumers reading from the same stream and need low latency.
Enhanced fan-out consumers are auto-created when a Lambda uses `autoCreateConsumer: true`.

### Example 1 (yaml)

```yaml
# enableEnhancedFanOut
resources:
  fanoutStream:
    type: kinesis-stream
    properties:
      capacityMode: ON_DEMAND
      enableEnhancedFanOut: true
  realtimeConsumer:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/realtime.ts
      events:
        - type: kinesis-stream
          properties:
            kinesisStreamName: fanoutStream
            autoCreateConsumer: true
            startingPosition: LATEST
```

### Example 2 (typescript)

```typescript
// enableEnhancedFanOut
import { KinesisStream, LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const fanoutStream = new KinesisStream({
    capacityMode: 'ON_DEMAND',
    enableEnhancedFanOut: true
  });

  const realtimeConsumer = new LambdaFunction({
    packaging: {
      type: 'stacktape-lambda-buildpack',
      properties: { entryfilePath: 'src/realtime.ts' }
    },
    events: [
      {
        type: 'kinesis-stream',
        properties: {
          kinesisStreamName: 'fanoutStream',
          autoCreateConsumer: true,
          startingPosition: 'LATEST'
        }
      }
    ]
  });

  return { resources: { fanoutStream, realtimeConsumer } };
});
```

## Property: `encryption`

- Required: no
- Type: `KinesisStreamEncryption`

Encrypt data at rest using a KMS key.

### Example 1 (yaml)

```yaml
# encryption
resources:
  secureStream:
    type: kinesis-stream
    properties:
      capacityMode: ON_DEMAND
      encryption:
        enabled: true
  secureConsumer:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/consume.ts
      events:
        - type: kinesis-stream
          properties:
            kinesisStreamName: secureStream
```

### Example 2 (typescript)

```typescript
// encryption
import { KinesisStream, LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const secureStream = new KinesisStream({
    capacityMode: 'ON_DEMAND',
    encryption: {
      enabled: true
    }
  });

  const secureConsumer = new LambdaFunction({
    packaging: {
      type: 'stacktape-lambda-buildpack',
      properties: { entryfilePath: 'src/consume.ts' }
    },
    events: [
      {
        type: 'kinesis-stream',
        properties: {
          kinesisStreamName: 'secureStream'
        }
      }
    ]
  });

  return { resources: { secureStream, secureConsumer } };
});
```

## Property: `retentionPeriodHours`

- Required: no
- Type: `number`
- Default: `24`

How long records stay in the stream (hours). Range: 24–8,760 (365 days). Beyond 24h costs extra.

### Example 1 (yaml)

```yaml
# retentionPeriodHours
resources:
  auditTrail:
    type: kinesis-stream
    properties:
      capacityMode: ON_DEMAND
      retentionPeriodHours: 168
  auditConsumer:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/audit.ts
      events:
        - type: kinesis-stream
          properties:
            kinesisStreamName: auditTrail
            startingPosition: TRIM_HORIZON
```

### Example 2 (typescript)

```typescript
// retentionPeriodHours
import { KinesisStream, LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const auditTrail = new KinesisStream({
    capacityMode: 'ON_DEMAND',
    retentionPeriodHours: 168
  });

  const auditConsumer = new LambdaFunction({
    packaging: {
      type: 'stacktape-lambda-buildpack',
      properties: { entryfilePath: 'src/audit.ts' }
    },
    events: [
      {
        type: 'kinesis-stream',
        properties: {
          kinesisStreamName: 'auditTrail',
          startingPosition: 'TRIM_HORIZON'
        }
      }
    ]
  });

  return { resources: { auditTrail, auditConsumer } };
});
```

## Property: `shardCount`

- Required: no
- Type: `number`
- Default: `1`

Number of shards. Only used when `capacityMode` is `PROVISIONED`.

Each shard: 1 MB/s write (1,000 records/s), 2 MB/s read (shared across consumers).

### Example 1 (yaml)

```yaml
# shardCount
resources:
  clickstream:
    type: kinesis-stream
    properties:
      capacityMode: PROVISIONED
      shardCount: 4
      retentionPeriodHours: 72
  analyticsConsumer:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/analytics.ts
      events:
        - type: kinesis-stream
          properties:
            kinesisStreamName: clickstream
            batchSize: 500
```

### Example 2 (typescript)

```typescript
// shardCount
import { KinesisStream, LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const clickstream = new KinesisStream({
    capacityMode: 'PROVISIONED',
    shardCount: 4,
    retentionPeriodHours: 72
  });

  const analyticsConsumer = new LambdaFunction({
    packaging: {
      type: 'stacktape-lambda-buildpack',
      properties: { entryfilePath: 'src/analytics.ts' }
    },
    events: [
      {
        type: 'kinesis-stream',
        properties: {
          kinesisStreamName: 'clickstream',
          batchSize: 500
        }
      }
    ]
  });

  return { resources: { clickstream, analyticsConsumer } };
});
```
