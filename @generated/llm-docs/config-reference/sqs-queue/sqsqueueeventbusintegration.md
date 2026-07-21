# SqsQueueEventBusIntegration API Reference

Routes events from an EventBridge event bus to this queue when they match a specified pattern.

Resource type: `sqs-queue`

## TypeScript definition

```typescript
import type { SqsQueueEventBusIntegrationProps } from 'stacktape';

type SqsQueueEventBusIntegration = {
  /** Properties of the integration */
  properties: SqsQueueEventBusIntegrationProps;
};
```

## Property: `properties`

- Required: yes
- Type: `SqsQueueEventBusIntegrationProps`

Properties of the integration

### Example 1 (yaml)

```yaml
resources:
  shipmentQueue:
    type: sqs-queue
    properties:
      events:
        - type: event-bus
          properties:
            useDefaultBus: true
            eventPattern:
              source:
                - logistics-service
              detail-type:
                - ShipmentDispatched
  shipmentWorker:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/shipment-worker.ts
      events:
        - type: sqs
          properties:
            sqsQueueName: shipmentQueue
```

### Example 2 (typescript)

```typescript
import { SqsQueue, LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const shipmentQueue = new SqsQueue({
    events: [
      {
        type: 'event-bus',
        properties: {
          useDefaultBus: true,
          eventPattern: {
            source: ['logistics-service'],
            'detail-type': ['ShipmentDispatched']
          }
        }
      }
    ]
  });

  const shipmentWorker = new LambdaFunction({
    packaging: {
      type: 'stacktape-lambda-buildpack',
      properties: { entryfilePath: 'src/shipment-worker.ts' }
    },
    events: [{ type: 'sqs', properties: { sqsQueueName: 'shipmentQueue' } }]
  });

  return { resources: { shipmentQueue, shipmentWorker } };
});
```
