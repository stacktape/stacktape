---
docType: recipe
title: Background Jobs
tags:
  - background
  - jobs
  - recipe
source: docs/_curated-docs/recipes/background-jobs.mdx
priority: 1
---

# Background Job Processing

Process jobs asynchronously using SQS queues and Lambda functions.

## Configuration

```typescript
import { defineConfig, LambdaFunction, SqsQueue, HttpApiGateway } from 'stacktape';

export default defineConfig(() => {
  // Job queue
  const jobQueue = new SqsQueue({
    visibilityTimeoutSeconds: 300, // 5 minutes to process
    messageRetentionPeriodSeconds: 1209600 // Keep for 14 days
  });

  // Job processor
  const jobProcessor = new LambdaFunction({
    packaging: {
      type: 'stacktape-lambda-buildpack',
      properties: {
        entryfilePath: './src/processor.ts'
      }
    },
    timeout: 300, // 5 minute timeout
    memory: 1024,
    events: [
      {
        type: 'sqs',
        properties: {
          sqsQueueName: 'jobQueue',
          batchSize: 10
        }
      }
    ]
  });

  // API to enqueue jobs
  const api = new LambdaFunction({
    packaging: {
      type: 'stacktape-lambda-buildpack',
      properties: {
        entryfilePath: './src/api.ts'
      }
    },
    connectTo: [jobQueue]
  });

  const gateway = new HttpApiGateway({
    routes: [{ path: '/jobs', method: 'POST', integration: { type: 'function', properties: { function: api } } }]
  });

  return {
    resources: { jobQueue, jobProcessor, api, gateway }
  };
});
```

## API Handler (Enqueue Jobs)

```typescript
// src/api.ts
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';

const sqs = new SQSClient({});

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const body = JSON.parse(event.body || '{}');

  await sqs.send(
    new SendMessageCommand({
      QueueUrl: process.env.STP_JOBQUEUE_QUEUE_URL,
      MessageBody: JSON.stringify({
        type: body.type,
        payload: body.payload,
        createdAt: new Date().toISOString()
      })
    })
  );

  return {
    statusCode: 202,
    body: JSON.stringify({ message: 'Job queued' })
  };
};
```

## Job Processor

```typescript
// src/processor.ts
import { SQSHandler } from 'aws-lambda';

export const handler: SQSHandler = async (event) => {
  for (const record of event.Records) {
    const job = JSON.parse(record.body);

    console.log(`Processing job: ${job.type}`);

    switch (job.type) {
      case 'email':
        await sendEmail(job.payload);
        break;
      case 'resize-image':
        await resizeImage(job.payload);
        break;
      case 'generate-report':
        await generateReport(job.payload);
        break;
      default:
        console.warn(`Unknown job type: ${job.type}`);
    }
  }
};

async function sendEmail(payload: any) {
  // Email sending logic
}

async function resizeImage(payload: any) {
  // Image processing logic
}

async function generateReport(payload: any) {
  // Report generation logic
}
```

## Dead Letter Queue

Handle failed jobs:

```typescript
// Failed jobs go here after 3 retries
const deadLetterQueue = new SqsQueue({
  messageRetentionPeriodSeconds: 1209600
});

const jobQueue = new SqsQueue({
  visibilityTimeoutSeconds: 300,
  redrivePolicy: {
    targetSqsQueueName: 'deadLetterQueue',
    maxReceiveCount: 3 // Retry 3 times before DLQ
  }
});

// Alert on DLQ messages
const dlqProcessor = new LambdaFunction({
  packaging: {
    type: 'stacktape-lambda-buildpack',
    properties: {
      entryfilePath: './src/dlq-alert.ts'
    }
  },
  events: [
    {
      type: 'sqs',
      properties: { sqsQueueName: 'deadLetterQueue' }
    }
  ]
});
```

## Usage

```bash
# Enqueue a job
curl -X POST https://your-api.execute-api.us-east-1.amazonaws.com/jobs \
  -H "Content-Type: application/json" \
  -d '{"type": "email", "payload": {"to": "user@example.com", "subject": "Hello"}}'
```
