### 1.1 HTTP API Gateway

Exposes a public HTTP endpoint for submitting orders into the pipeline.

```yml
resources:
  apiGateway:
    type: http-api-gateway
    properties:
      cors:
        enabled: true
```

### 1.2 Order Queue (FIFO)

FIFO SQS queue that guarantees ordered, exactly-once delivery of order messages. Messages that fail processing 3 times
are automatically moved to the dead-letter queue.

```yml
orderQueue:
  type: sqs-queue
  properties:
    fifoEnabled: true
    redrivePolicy:
      targetSqsQueueName: orderDlq
      maxReceiveCount: 3
```

### 1.3 Dead-Letter Queue

Captures messages that repeatedly fail processing. Use this to inspect and replay failed orders.

```yml
orderDlq:
  type: sqs-queue
  properties:
    fifoEnabled: true
```

### 1.4 Submit Order Function

Receives HTTP POST requests and sends order messages to the FIFO queue. Uses `connectTo` for automatic IAM permissions
and environment variable injection (`STP_orderQueue_QUEUE_URL`).

```yml
submitOrder:
  type: function
  properties:
    packaging:
      type: stacktape-lambda-buildpack
      properties:
        entryfilePath: ./src/submit-order.ts
    memory: 512
    connectTo:
      - orderQueue
    events:
      - type: http-api-gateway
        properties:
          httpApiGatewayName: apiGateway
          path: /orders
          method: POST
```

### 1.5 Process Order Function

Consumes messages from the FIFO queue one at a time, validates the order, and publishes an `OrderProcessed` event to
EventBridge. Supports partial batch failure reporting so only failed messages are retried.

```yml
processOrder:
  type: function
  properties:
    packaging:
      type: stacktape-lambda-buildpack
      properties:
        entryfilePath: ./src/process-order.ts
    memory: 512
    timeout: 30
    connectTo:
      - eventBus
    events:
      - type: sqs
        properties:
          sqsQueueName: orderQueue
          batchSize: 1
```

### 1.6 Event Bus

Custom EventBridge event bus that routes domain events between services. The `processOrder` function publishes
`OrderProcessed` events here, and downstream consumers subscribe using event patterns.

```yml
eventBus:
  type: event-bus
```

### 1.7 On Order Processed Function

Subscribes to `OrderProcessed` events from the event bus. Handles downstream side-effects such as sending confirmation
emails, updating dashboards, or triggering shipping workflows.

```yml
onOrderProcessed:
  type: function
  properties:
    packaging:
      type: stacktape-lambda-buildpack
      properties:
        entryfilePath: ./src/on-order-processed.ts
    memory: 512
    events:
      - type: event-bus
        properties:
          eventBusName: eventBus
          eventPattern:
            source:
              - orders
            detail-type:
              - OrderProcessed
```
