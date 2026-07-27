# SqsQueueRedrivePolicy API Reference

Resource type: `sqs-queue`

## TypeScript definition

```typescript
type SqsQueueRedrivePolicy = {
  /** How many times a message can be received (and fail) before being moved to the dead-letter queue. */
  maxReceiveCount: number;
  /** ARN of an external SQS queue to use as the dead-letter queue. Use when the DLQ is in another stack or account. */
  targetSqsQueueArn?: string;
  /** Name of another sqs-queue in your config to use as the dead-letter queue. */
  targetSqsQueueName?: string;
};
```

## Property: `maxReceiveCount`

- Required: yes
- Type: `number`

How many times a message can be received (and fail) before being moved to the dead-letter queue.

A typical starting value is `3`–`5`. Set lower for fast-failing workloads, higher for retryable transient errors.

### Example 1 (yaml)

```yaml
resources:
  jobsDlq:
    type: sqs-queue
  jobsQueue:
    type: sqs-queue
    properties:
      redrivePolicy:
        targetSqsQueueName: jobsDlq
        maxReceiveCount: 3
  jobsWorker:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/jobs-worker.ts
      events:
        - type: sqs
          properties:
            sqsQueueName: jobsQueue
```

### Example 2 (typescript)

```typescript
import { SqsQueue, LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const jobsDlq = new SqsQueue({});

  const jobsQueue = new SqsQueue({
    redrivePolicy: {
      targetSqsQueueName: 'jobsDlq',
      maxReceiveCount: 3
    }
  });

  const jobsWorker = new LambdaFunction({
    packaging: {
      type: 'stacktape-lambda-buildpack',
      properties: { entryfilePath: 'src/jobs-worker.ts' }
    },
    events: [{ type: 'sqs', properties: { sqsQueueName: 'jobsQueue' } }]
  });

  return { resources: { jobsDlq, jobsQueue, jobsWorker } };
});
```

## Property: `targetSqsQueueArn`

- Required: no
- Type: `string`

ARN of an external SQS queue to use as the dead-letter queue. Use when the DLQ is in another stack or account.

### Example 1 (yaml)

```yaml
resources:
  eventsQueue:
    type: sqs-queue
    properties:
      redrivePolicy:
        targetSqsQueueArn: arn:aws:sqs:eu-west-1:123456789012:shared-dead-letter-queue
        maxReceiveCount: 4
  eventsWorker:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/events-worker.ts
      events:
        - type: sqs
          properties:
            sqsQueueName: eventsQueue
```

### Example 2 (typescript)

```typescript
import { SqsQueue, LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const eventsQueue = new SqsQueue({
    redrivePolicy: {
      targetSqsQueueArn: 'arn:aws:sqs:eu-west-1:123456789012:shared-dead-letter-queue',
      maxReceiveCount: 4
    }
  });

  const eventsWorker = new LambdaFunction({
    packaging: {
      type: 'stacktape-lambda-buildpack',
      properties: { entryfilePath: 'src/events-worker.ts' }
    },
    events: [{ type: 'sqs', properties: { sqsQueueName: 'eventsQueue' } }]
  });

  return { resources: { eventsQueue, eventsWorker } };
});
```

## Property: `targetSqsQueueName`

- Required: no
- Type: `string`

Name of another `sqs-queue` in your config to use as the dead-letter queue.

### Example 1 (yaml)

```yaml
resources:
  notificationsDlq:
    type: sqs-queue
  notificationsQueue:
    type: sqs-queue
    properties:
      redrivePolicy:
        targetSqsQueueName: notificationsDlq
        maxReceiveCount: 3
  notificationsWorker:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/notifications-worker.ts
      events:
        - type: sqs
          properties:
            sqsQueueName: notificationsQueue
```

### Example 2 (typescript)

```typescript
import { SqsQueue, LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const notificationsDlq = new SqsQueue({});

  const notificationsQueue = new SqsQueue({
    redrivePolicy: {
      targetSqsQueueName: 'notificationsDlq',
      maxReceiveCount: 3
    }
  });

  const notificationsWorker = new LambdaFunction({
    packaging: {
      type: 'stacktape-lambda-buildpack',
      properties: { entryfilePath: 'src/notifications-worker.ts' }
    },
    events: [{ type: 'sqs', properties: { sqsQueueName: 'notificationsQueue' } }]
  });

  return { resources: { notificationsDlq, notificationsQueue, notificationsWorker } };
});
```
