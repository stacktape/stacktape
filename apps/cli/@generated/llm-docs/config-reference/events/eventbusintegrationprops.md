# EventBusIntegrationProps API Reference

## TypeScript definition

```typescript
import type { EventBusIntegrationPattern, EventBusOnDeliveryFailure, EventInputTransformer } from 'stacktape';

type EventBusIntegrationProps = {
  /** A pattern to filter events from the event bus. */
  eventPattern: EventBusIntegrationPattern;
  /** The ARN of an existing event bus. */
  eventBusArn?: string;
  /** The name of an event bus defined in your stack&#39;s resources. */
  eventBusName?: string;
  /** A fixed JSON object to be passed as the event payload. */
  input?: unknown;
  /** A JSONPath expression to extract a portion of the event to pass to the target. */
  inputPath?: string;
  /** Customizes the event payload sent to the target. */
  inputTransformer?: EventInputTransformer;
  /** A destination for events that fail to be delivered to the target. */
  onDeliveryFailure?: EventBusOnDeliveryFailure;
  /** Uses the default AWS event bus. */
  useDefaultBus?: boolean;
};
```

## Property: `eventPattern`

- Required: yes
- Type: `EventBusIntegrationPattern`

A pattern to filter events from the event bus.

Only events that match this pattern will trigger the target.
For details on the syntax, see the [AWS EventBridge documentation on event patterns](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-event-patterns.html).

## Property: `eventBusArn`

- Required: no
- Type: `string`

The ARN of an existing event bus.

Use this to subscribe to an event bus that is not managed by your stack.
You must specify only one of `eventBusArn`, `eventBusName`, or `useDefaultBus`.

## Property: `eventBusName`

- Required: no
- Type: `string`

The name of an event bus defined in your stack's resources.

You must specify only one of `eventBusArn`, `eventBusName`, or `useDefaultBus`.

## Property: `input`

- Required: no
- Type: `unknown`

A fixed JSON object to be passed as the event payload.

If you need to customize the payload based on the event, use `inputTransformer` instead.
You can only use one of `input`, `inputPath`, or `inputTransformer`.

**Example (YAML):**

```yaml
resources:
  orderEvents:
    type: event-bus
  orderProcessor:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/process-order.ts
      events:
        - type: event-bus
          properties:
            eventBusName: orderEvents
            eventPattern:
              source:
                - my.orders
            input:
              source: my-custom-event
```

**Example (TypeScript):**

```ts
import { LambdaFunction, EventBus, StacktapeLambdaBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const orderEvents = new EventBus({});
  const orderProcessor = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: 'src/process-order.ts' }),
    events: [
      {
        type: 'event-bus',
        properties: {
          eventBusName: 'orderEvents',
          eventPattern: { source: ['my.orders'] },
          input: { source: 'my-custom-event' }
        }
      }
    ]
  });
  return { resources: { orderEvents, orderProcessor } };
});
```

## Property: `inputPath`

- Required: no
- Type: `string`

A JSONPath expression to extract a portion of the event to pass to the target.

This is useful for forwarding only a specific part of the event payload.
You can only use one of `input`, `inputPath`, or `inputTransformer`.

### Example 1 (yaml)

```yaml
resources:
  orderEvents:
    type: event-bus
  orderProcessor:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/process-order.ts
      events:
        - type: event-bus
          properties:
            eventBusName: orderEvents
            eventPattern:
              source:
                - my.orders
            inputPath: $.detail
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, EventBus, StacktapeLambdaBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const orderEvents = new EventBus({});
  const orderProcessor = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: 'src/process-order.ts' }),
    events: [
      {
        type: 'event-bus',
        properties: {
          eventBusName: 'orderEvents',
          eventPattern: { source: ['my.orders'] },
          inputPath: '$.detail'
        }
      }
    ]
  });
  return { resources: { orderEvents, orderProcessor } };
});
```

## Property: `inputTransformer`

- Required: no
- Type: `EventInputTransformer`

Customizes the event payload sent to the target.

This allows you to extract values from the original event and use them to construct a new payload.
You can only use one of `input`, `inputPath`, or `inputTransformer`.

### Example 1 (yaml)

```yaml
resources:
  orderEvents:
    type: event-bus
  orderProcessor:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/process-order.ts
      events:
        - type: event-bus
          properties:
            eventBusName: orderEvents
            eventPattern:
              source:
                - my.orders
            inputTransformer:
              inputPathsMap:
                instanceId: $.detail.instance-id
                instanceState: $.detail.state
              inputTemplate:
                message: Instance <instanceId> is now in state <instanceState>.
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, EventBus, StacktapeLambdaBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const orderEvents = new EventBus({});
  const orderProcessor = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: 'src/process-order.ts' }),
    events: [
      {
        type: 'event-bus',
        properties: {
          eventBusName: 'orderEvents',
          eventPattern: { source: ['my.orders'] },
          inputTransformer: {
            inputPathsMap: {
              instanceId: '$.detail.instance-id',
              instanceState: '$.detail.state'
            },
            inputTemplate: { message: 'Instance <instanceId> is now in state <instanceState>.' }
          }
        }
      }
    ]
  });
  return { resources: { orderEvents, orderProcessor } };
});
```

## Property: `onDeliveryFailure`

- Required: no
- Type: `EventBusOnDeliveryFailure`

A destination for events that fail to be delivered to the target.

In rare cases, an event might fail to be delivered. This property specifies an SQS queue where failed events will be sent.

## Property: `useDefaultBus`

- Required: no
- Type: `boolean`

Uses the default AWS event bus.

You must specify only one of `eventBusArn`, `eventBusName`, or `useDefaultBus`.
