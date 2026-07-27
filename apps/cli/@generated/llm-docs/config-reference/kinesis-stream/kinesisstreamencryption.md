# KinesisStreamEncryption API Reference

Resource type: `kinesis-stream`

## TypeScript definition

```typescript
type KinesisStreamEncryption = {
  /** Enable server-side encryption. */
  enabled: boolean;
  /** ARN of your own KMS key. If omitted, uses the AWS-managed alias/aws/kinesis key (no extra cost). */
  kmsKeyArn?: string;
};
```

## Property: `enabled`

- Required: yes
- Type: `boolean`
- Default: `false`

Enable server-side encryption.

### Example 1 (yaml)

```yaml
# encryption.enabled
resources:
  encryptedStream:
    type: kinesis-stream
    properties:
      capacityMode: ON_DEMAND
      retentionPeriodHours: 24
      encryption:
        enabled: true
  encryptedConsumer:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/consume.ts
      events:
        - type: kinesis-stream
          properties:
            kinesisStreamName: encryptedStream
```

### Example 2 (typescript)

```typescript
// encryption.enabled
import { KinesisStream, LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const encryptedStream = new KinesisStream({
    capacityMode: 'ON_DEMAND',
    retentionPeriodHours: 24,
    encryption: {
      enabled: true
    }
  });

  const encryptedConsumer = new LambdaFunction({
    packaging: {
      type: 'stacktape-lambda-buildpack',
      properties: { entryfilePath: 'src/consume.ts' }
    },
    events: [
      {
        type: 'kinesis-stream',
        properties: {
          kinesisStreamName: 'encryptedStream'
        }
      }
    ]
  });

  return { resources: { encryptedStream, encryptedConsumer } };
});
```

## Property: `kmsKeyArn`

- Required: no
- Type: `string`

ARN of your own KMS key. If omitted, uses the AWS-managed `alias/aws/kinesis` key (no extra cost).

### Example 1 (yaml)

```yaml
# encryption.kmsKeyArn
resources:
  cmkStream:
    type: kinesis-stream
    properties:
      capacityMode: ON_DEMAND
      encryption:
        enabled: true
        kmsKeyArn: arn:aws:kms:eu-west-1:123456789012:key/1234abcd-12ab-34cd-56ef-1234567890ab
  cmkConsumer:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/consume.ts
      events:
        - type: kinesis-stream
          properties:
            kinesisStreamName: cmkStream
```

### Example 2 (typescript)

```typescript
// encryption.kmsKeyArn
import { KinesisStream, LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const cmkStream = new KinesisStream({
    capacityMode: 'ON_DEMAND',
    encryption: {
      enabled: true,
      kmsKeyArn: 'arn:aws:kms:eu-west-1:123456789012:key/1234abcd-12ab-34cd-56ef-1234567890ab'
    }
  });

  const cmkConsumer = new LambdaFunction({
    packaging: {
      type: 'stacktape-lambda-buildpack',
      properties: { entryfilePath: 'src/consume.ts' }
    },
    events: [
      {
        type: 'kinesis-stream',
        properties: {
          kinesisStreamName: 'cmkStream'
        }
      }
    ]
  });

  return { resources: { cmkStream, cmkConsumer } };
});
```
