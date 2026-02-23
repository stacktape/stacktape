# Background Jobs & Automations

Run scheduled tasks, process queues, handle webhooks.

## Scheduled Job (Cron)

```yaml
resources:
  dailyReport:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/daily-report.ts
      timeout: 300
      events:
        - type: schedule
          properties:
            scheduleRate: cron(0 9 * * ? *)  # 9 AM UTC daily
      connectTo:
        - database
        - aws:ses
```

Common cron patterns:
- `cron(0 9 * * ? *)` - Daily at 9 AM
- `cron(0 */2 * * ? *)` - Every 2 hours
- `cron(0 9 ? * MON *)` - Every Monday at 9 AM
- `rate(5 minutes)` - Every 5 minutes

## Job Queue with Retry

```yaml
resources:
  # API adds jobs to queue
  api:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/api.ts
      events:
        - type: http-api-gateway
          properties:
            path: /{proxy+}
            method: '*'
      connectTo:
        - jobQueue

  # Main job queue
  jobQueue:
    type: sqs-queue
    properties:
      visibilityTimeoutSeconds: 300
      redrivePolicy:
        targetSqsQueueName: deadLetterQueue
        maxReceiveCount: 3  # Retry 3 times, then DLQ

  # Failed jobs
  deadLetterQueue:
    type: sqs-queue

  # Worker processes jobs
  worker:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/worker.ts
      timeout: 300
      events:
        - type: sqs
          properties:
            sqsQueueName: jobQueue
            batchSize: 1
      connectTo:
        - database
```

Adding jobs from your API:
```typescript
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

const sqs = new SQSClient({});

await sqs.send(new SendMessageCommand({
  QueueUrl: process.env.STP_JOB_QUEUE_QUEUE_URL,
  MessageBody: JSON.stringify({ type: 'process-order', orderId: 123 })
}));
```

## Webhook Processor

```yaml
resources:
  webhookReceiver:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/webhook.ts
      events:
        - type: http-api-gateway
          properties:
            path: /webhooks/{provider}
            method: POST
      connectTo:
        - database
        - notificationQueue

  # Process notifications async
  notificationQueue:
    type: sqs-queue

  notificationWorker:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/notifications.ts
      events:
        - type: sqs
          properties:
            sqsQueueName: notificationQueue
      connectTo:
        - aws:ses
```

## File Processing Pipeline

Process files when uploaded to S3:

```yaml
resources:
  uploads:
    type: bucket

  fileProcessor:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/process-file.ts
      timeout: 300
      memory: 2048
      events:
        - type: s3
          properties:
            bucketName: uploads
            s3Events:
              - s3:ObjectCreated:*
            filterRules:
              - type: prefix
                value: incoming/
      connectTo:
        - uploads
        - database
```

## Long-Running Batch Jobs

For jobs > 15 minutes or needing more resources:

```yaml
resources:
  heavyJob:
    type: batch-job
    properties:
      packaging:
        type: stacktape-image-buildpack
        properties:
          entryfilePath: src/heavy-processing.ts
      resources:
        cpu: 4
        memory: 8192
      timeout: 3600  # 1 hour
      events:
        - type: schedule
          properties:
            scheduleRate: cron(0 2 * * ? *)  # 2 AM daily
      connectTo:
        - database
```

## Event-Driven Architecture

```yaml
resources:
  # Central event bus
  eventBus:
    type: event-bus

  # Order service publishes events
  orderService:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/orders.ts
      events:
        - type: http-api-gateway
          properties:
            path: /orders/{proxy+}
            method: '*'
      connectTo:
        - database
        - eventBus

  # Email service listens for order events
  emailService:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/send-emails.ts
      events:
        - type: event-bus
          properties:
            eventBusName: eventBus
            eventPattern:
              source:
                - orders
              detail-type:
                - OrderCreated
                - OrderShipped
      connectTo:
        - aws:ses

  # Analytics service listens for all events
  analyticsService:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/analytics.ts
      events:
        - type: event-bus
          properties:
            eventBusName: eventBus
            eventPattern:
              source:
                - prefix: ''  # All sources
      connectTo:
        - analyticsDb
```

Publishing events:
```typescript
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';

const eventBridge = new EventBridgeClient({});

await eventBridge.send(new PutEventsCommand({
  Entries: [{
    EventBusName: process.env.STP_EVENT_BUS_NAME,
    Source: 'orders',
    DetailType: 'OrderCreated',
    Detail: JSON.stringify({ orderId: 123, userId: 456 })
  }]
}));
```
