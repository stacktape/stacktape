# SnsTopicProps API Reference

Resource type: `sns-topic`

## TypeScript definition

```typescript
type SnsTopicProps = {
  /** Automatically deduplicates messages based on content (SHA-256 hash) within a 5-minute window. */
  contentBasedDeduplication?: boolean;
  /** Guarantees message order and exactly-once delivery. Use for financial transactions, sequential workflows. */
  fifoEnabled?: boolean;
  /** Sender name shown on SMS messages sent to subscribers (e.g., &quot;MyApp&quot;). Max 11 characters. */
  smsDisplayName?: string;
};
```

## Property: `contentBasedDeduplication`

- Required: no
- Type: `boolean`
- Default: `false`

Automatically deduplicates messages based on content (SHA-256 hash) within a 5-minute window.

Saves you from generating a unique deduplication ID for each message. Requires `fifoEnabled: true`.

### Example 1 (yaml)

```yaml
resources:
  auditTopic:
    type: sns-topic
    properties:
      fifoEnabled: true
      contentBasedDeduplication: true
  auditLogger:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/audit.ts
      events:
        - type: sns
          properties:
            snsTopicName: auditTopic
```

### Example 2 (typescript)

```typescript
import { SnsTopic, LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const auditTopic = new SnsTopic({
    fifoEnabled: true,
    contentBasedDeduplication: true
  });

  const auditLogger = new LambdaFunction({
    packaging: {
      type: 'stacktape-lambda-buildpack',
      properties: { entryfilePath: 'src/audit.ts' }
    },
    events: [{ type: 'sns', properties: { snsTopicName: 'auditTopic' } }]
  });

  return { resources: { auditTopic, auditLogger } };
});
```

## Property: `fifoEnabled`

- Required: no
- Type: `boolean`
- Default: `false`

Guarantees message order and exactly-once delivery. Use for financial transactions, sequential workflows.

FIFO topics can only deliver to FIFO SQS queues (not email, SMS, or HTTP).
Requires either `contentBasedDeduplication: true` or a unique `MessageDeduplicationId` per message.

### Example 1 (yaml)

```yaml
resources:
  transactionsTopic:
    type: sns-topic
    properties:
      fifoEnabled: true
      contentBasedDeduplication: true
  paymentsProcessor:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/process-payment.ts
      events:
        - type: sns
          properties:
            snsTopicName: transactionsTopic
```

### Example 2 (typescript)

```typescript
import { SnsTopic, LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const transactionsTopic = new SnsTopic({
    fifoEnabled: true,
    contentBasedDeduplication: true
  });

  const paymentsProcessor = new LambdaFunction({
    packaging: {
      type: 'stacktape-lambda-buildpack',
      properties: { entryfilePath: 'src/process-payment.ts' }
    },
    events: [{ type: 'sns', properties: { snsTopicName: 'transactionsTopic' } }]
  });

  return { resources: { transactionsTopic, paymentsProcessor } };
});
```

## Property: `smsDisplayName`

- Required: no
- Type: `string`

Sender name shown on SMS messages sent to subscribers (e.g., "MyApp"). Max 11 characters.

### Example 1 (yaml)

```yaml
resources:
  orderEventsTopic:
    type: sns-topic
    properties:
      smsDisplayName: ShopAlerts
  orderNotifier:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/notify.ts
      events:
        - type: sns
          properties:
            snsTopicName: orderEventsTopic
```

### Example 2 (typescript)

```typescript
import { SnsTopic, LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const orderEventsTopic = new SnsTopic({
    smsDisplayName: 'ShopAlerts'
  });

  const orderNotifier = new LambdaFunction({
    packaging: {
      type: 'stacktape-lambda-buildpack',
      properties: { entryfilePath: 'src/notify.ts' }
    },
    events: [{ type: 'sns', properties: { snsTopicName: 'orderEventsTopic' } }]
  });

  return { resources: { orderEventsTopic, orderNotifier } };
});
```
