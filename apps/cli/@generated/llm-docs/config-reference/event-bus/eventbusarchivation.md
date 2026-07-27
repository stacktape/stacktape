# EventBusArchivation API Reference

Resource type: `event-bus`

## TypeScript definition

```typescript
type EventBusArchivation = {
  /** Enable event archiving. Disabling deletes the archive. */
  enabled: boolean;
  /** Days to keep archived events. Omit to keep indefinitely. */
  retentionDays?: number;
};
```

## Property: `enabled`

- Required: yes
- Type: `boolean`
- Default: `false`

Enable event archiving. Disabling deletes the archive.

### Example 1 (yaml)

```yaml
resources:
  domainEvents:
    type: event-bus
    properties:
      archivation:
        enabled: true
        retentionDays: 30
  eventConsumer:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/consumer.ts
      events:
        - type: event-bus
          properties:
            eventBusName: domainEvents
            eventPattern:
              source:
                - my.domain
```

### Example 2 (typescript)

```typescript
import { EventBus, LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const domainEvents = new EventBus({
    archivation: {
      enabled: true,
      retentionDays: 30
    }
  });

  const eventConsumer = new LambdaFunction({
    packaging: {
      type: 'stacktape-lambda-buildpack',
      properties: { entryfilePath: 'src/consumer.ts' }
    },
    events: [
      {
        type: 'event-bus',
        properties: {
          eventBusName: 'domainEvents',
          eventPattern: { source: ['my.domain'] }
        }
      }
    ]
  });

  return { resources: { domainEvents, eventConsumer } };
});
```

## Property: `retentionDays`

- Required: no
- Type: `number`

Days to keep archived events. Omit to keep indefinitely.

### Example 1 (yaml)

```yaml
resources:
  replayableEvents:
    type: event-bus
    properties:
      archivation:
        enabled: true
        retentionDays: 365
  replayHandler:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/replay-handler.ts
      events:
        - type: event-bus
          properties:
            eventBusName: replayableEvents
            eventPattern:
              source:
                - my.events
```

### Example 2 (typescript)

```typescript
import { EventBus, LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const replayableEvents = new EventBus({
    archivation: {
      enabled: true,
      retentionDays: 365
    }
  });

  const replayHandler = new LambdaFunction({
    packaging: {
      type: 'stacktape-lambda-buildpack',
      properties: { entryfilePath: 'src/replay-handler.ts' }
    },
    events: [
      {
        type: 'event-bus',
        properties: {
          eventBusName: 'replayableEvents',
          eventPattern: { source: ['my.events'] }
        }
      }
    ]
  });

  return { resources: { replayableEvents, replayHandler } };
});
```
