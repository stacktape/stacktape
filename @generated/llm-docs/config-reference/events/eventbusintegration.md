# EventBusIntegration API Reference

Triggers a batch job when an event matching a specified pattern is received by an event bus.

## TypeScript definition

```typescript
import type { EventBusIntegrationProps } from 'stacktape';

type EventBusIntegration = {
  properties: EventBusIntegrationProps;
};
```

## Property: `properties`

- Required: yes
- Type: `EventBusIntegrationProps`
