# EventBusProps API Reference

Resource type: `event-bus`

## TypeScript definition

```typescript
import type { EventBusArchivation } from 'stacktape';

type EventBusProps = {
  /** Archive events to store and replay them later. Useful for debugging, testing, or error recovery. */
  archivation?: EventBusArchivation;
  /** Partner event source name. Only needed for receiving events from third-party SaaS integrations. */
  eventSourceName?: string;
};
```

## Property: `archivation`

- Required: no
- Type: `EventBusArchivation`

Archive events to store and replay them later. Useful for debugging, testing, or error recovery.

### Example 1 (yaml)

```yaml
resources:
  auditEvents:
    type: event-bus
    properties:
      archivation:
        enabled: true
        retentionDays: 90
  auditLogger:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/audit-logger.ts
      events:
        - type: event-bus
          properties:
            eventBusName: auditEvents
            eventPattern:
              source:
                - my.audit
```

### Example 2 (typescript)

```typescript
import { EventBus, LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const auditEvents = new EventBus({
    archivation: {
      enabled: true,
      retentionDays: 90
    }
  });

  const auditLogger = new LambdaFunction({
    packaging: {
      type: 'stacktape-lambda-buildpack',
      properties: { entryfilePath: 'src/audit-logger.ts' }
    },
    events: [
      {
        type: 'event-bus',
        properties: {
          eventBusName: 'auditEvents',
          eventPattern: { source: ['my.audit'] }
        }
      }
    ]
  });

  return { resources: { auditEvents, auditLogger } };
});
```

## Property: `eventSourceName`

- Required: no
- Type: `string`

Partner event source name. Only needed for receiving events from third-party SaaS integrations.

### Example 1 (yaml)

```yaml
resources:
  partnerEvents:
    type: event-bus
    properties:
      eventSourceName: aws.partner/example.com/12345/my-integration
  partnerHandler:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/handle-partner-event.ts
      events:
        - type: event-bus
          properties:
            eventBusName: partnerEvents
            eventPattern:
              source:
                - aws.partner/example.com/12345/my-integration
```

### Example 2 (typescript)

```typescript
import { EventBus, LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const partnerEvents = new EventBus({
    eventSourceName: 'aws.partner/example.com/12345/my-integration'
  });

  const partnerHandler = new LambdaFunction({
    packaging: {
      type: 'stacktape-lambda-buildpack',
      properties: { entryfilePath: 'src/handle-partner-event.ts' }
    },
    events: [
      {
        type: 'event-bus',
        properties: {
          eventBusName: 'partnerEvents',
          eventPattern: { source: ['aws.partner/example.com/12345/my-integration'] }
        }
      }
    ]
  });

  return { resources: { partnerEvents, partnerHandler } };
});
```
