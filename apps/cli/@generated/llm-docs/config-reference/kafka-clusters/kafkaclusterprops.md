# KafkaClusterProps API Reference

## TypeScript definition

```typescript
import type { DevModeConfig } from 'stacktape';

type KafkaClusterProps = {
  /** Development-mode behavior. */
  dev?: DevModeConfig;
};
```

## Property: `dev`

- Required: no
- Type: `DevModeConfig`

Development-mode behavior.

Stacktape does not emulate Kafka locally and does not deploy this costly cluster during `stacktape dev` by
default. Set `remote: true` only when the dev session should use a cluster deployed in AWS.
