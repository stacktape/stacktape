### 1.1 HTTP API Gateway

Exposes an endpoint for submitting jobs to the queue.

```yml
resources:
  apiGateway:
    type: http-api-gateway
    properties:
      cors:
        enabled: true
```

### 1.2 SQS Queue

Standard SQS queue for reliable message delivery. Failed messages are automatically retried.

```yml
jobQueue:
  type: sqs-queue
```

### 1.3 Enqueue Function

Receives HTTP POST requests and sends messages to the SQS queue. Uses `connectTo` for automatic IAM permissions and
environment variable injection.

```yml
enqueueJob:
  type: function
  properties:
    packaging:
      type: stacktape-lambda-buildpack
      properties:
        entryfilePath: ./src/enqueue.ts
    memory: 512
    connectTo:
      - jobQueue
    events:
      - type: http-api-gateway
        properties:
          httpApiGatewayName: apiGateway
          path: /enqueue
          method: POST
```

### 1.4 Process Function

Consumes messages from the SQS queue in batches. Supports partial batch failure reporting so only failed messages are
retried.

```yml
processJob:
  type: function
  properties:
    packaging:
      type: stacktape-lambda-buildpack
      properties:
        entryfilePath: ./src/process.ts
    memory: 512
    timeout: 30
    events:
      - type: sqs
        properties:
          sqsQueueName: jobQueue
          batchSize: 10
```
