# SqsQueuePolicyStatement API Reference

Resource type: `sqs-queue`

## TypeScript definition

```typescript
type SqsQueuePolicyStatement = {
  /** SQS actions to allow or deny. E.g., ["sqs:SendMessage"] or ["sqs:*"]. */
  Action: Array<string>;
  /** Allow or Deny access for the specified actions and principal. */
  Effect: string;
  /** Who gets access: AWS account ID, IAM ARN, or `"*"` for everyone. E.g., `{ "Service": "sns.amazonaws.com" }`. */
  Principal: unknown;
  /** Optional conditions for when this statement applies (e.g., restrict by source ARN or IP range). */
  Condition?: unknown;
};
```

## Property: `Action`

- Required: yes
- Type: `Array<string>`

SQS actions to allow or deny. E.g., `["sqs:SendMessage"]` or `["sqs:*"]`.

### Example 1 (yaml)

```yaml
resources:
  ingestQueue:
    type: sqs-queue
    properties:
      policyStatements:
        - Effect: Allow
          Principal:
            Service: events.amazonaws.com
          Action:
            - sqs:SendMessage
            - sqs:GetQueueAttributes
  ingestWorker:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/ingest-worker.ts
      events:
        - type: sqs
          properties:
            sqsQueueName: ingestQueue
```

### Example 2 (typescript)

```typescript
import { SqsQueue, LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const ingestQueue = new SqsQueue({
    policyStatements: [
      {
        Effect: 'Allow',
        Principal: { Service: 'events.amazonaws.com' },
        Action: ['sqs:SendMessage', 'sqs:GetQueueAttributes']
      }
    ]
  });

  const ingestWorker = new LambdaFunction({
    packaging: {
      type: 'stacktape-lambda-buildpack',
      properties: { entryfilePath: 'src/ingest-worker.ts' }
    },
    events: [{ type: 'sqs', properties: { sqsQueueName: 'ingestQueue' } }]
  });

  return { resources: { ingestQueue, ingestWorker } };
});
```

## Property: `Effect`

- Required: yes
- Type: `string`

`Allow` or `Deny` access for the specified actions and principal.

### Example 1 (yaml)

```yaml
resources:
  restrictedQueue:
    type: sqs-queue
    properties:
      policyStatements:
        - Effect: Deny
          Principal: "*"
          Action:
            - sqs:DeleteQueue
  restrictedWorker:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/restricted-worker.ts
      events:
        - type: sqs
          properties:
            sqsQueueName: restrictedQueue
```

### Example 2 (typescript)

```typescript
import { SqsQueue, LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const restrictedQueue = new SqsQueue({
    policyStatements: [
      {
        Effect: 'Deny',
        Principal: '*',
        Action: ['sqs:DeleteQueue']
      }
    ]
  });

  const restrictedWorker = new LambdaFunction({
    packaging: {
      type: 'stacktape-lambda-buildpack',
      properties: { entryfilePath: 'src/restricted-worker.ts' }
    },
    events: [{ type: 'sqs', properties: { sqsQueueName: 'restrictedQueue' } }]
  });

  return { resources: { restrictedQueue, restrictedWorker } };
});
```

## Property: `Principal`

- Required: yes
- Type: `unknown`

Who gets access: AWS account ID, IAM ARN, or `"*"` for everyone. E.g., `{ "Service": "sns.amazonaws.com" }`.

**Example (YAML):**

```yaml
resources:
  partnerQueue:
    type: sqs-queue
    properties:
      policyStatements:
        - Effect: Allow
          Principal:
            AWS: arn:aws:iam::210987654321:root
          Action:
            - sqs:SendMessage
            - sqs:ReceiveMessage
  partnerWorker:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/partner-worker.ts
      events:
        - type: sqs
          properties:
            sqsQueueName: partnerQueue
```

**Example (TypeScript):**

```ts
import { SqsQueue, LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const partnerQueue = new SqsQueue({
    policyStatements: [
      {
        Effect: 'Allow',
        Principal: { AWS: 'arn:aws:iam::210987654321:root' },
        Action: ['sqs:SendMessage', 'sqs:ReceiveMessage']
      }
    ]
  });

  const partnerWorker = new LambdaFunction({
    packaging: {
      type: 'stacktape-lambda-buildpack',
      properties: { entryfilePath: 'src/partner-worker.ts' }
    },
    events: [{ type: 'sqs', properties: { sqsQueueName: 'partnerQueue' } }]
  });

  return { resources: { partnerQueue, partnerWorker } };
});
```

## Property: `Condition`

- Required: no
- Type: `unknown`

Optional conditions for when this statement applies (e.g., restrict by source ARN or IP range).

**Example (YAML):**

```yaml
resources:
  topicBoundQueue:
    type: sqs-queue
    properties:
      policyStatements:
        - Effect: Allow
          Principal: "*"
          Action:
            - sqs:SendMessage
          Condition:
            ArnEquals:
              aws:SourceArn: arn:aws:sns:eu-west-1:123456789012:order-events-topic
  topicBoundWorker:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/topic-bound-worker.ts
      events:
        - type: sqs
          properties:
            sqsQueueName: topicBoundQueue
```

**Example (TypeScript):**

```ts
import { SqsQueue, LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const topicBoundQueue = new SqsQueue({
    policyStatements: [
      {
        Effect: 'Allow',
        Principal: '*',
        Action: ['sqs:SendMessage'],
        Condition: {
          ArnEquals: {
            'aws:SourceArn': 'arn:aws:sns:eu-west-1:123456789012:order-events-topic'
          }
        }
      }
    ]
  });

  const topicBoundWorker = new LambdaFunction({
    packaging: {
      type: 'stacktape-lambda-buildpack',
      properties: { entryfilePath: 'src/topic-bound-worker.ts' }
    },
    events: [{ type: 'sqs', properties: { sqsQueueName: 'topicBoundQueue' } }]
  });

  return { resources: { topicBoundQueue, topicBoundWorker } };
});
```
