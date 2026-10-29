# ValkeyEngine API Reference

Node-based Valkey: fixed-size nodes billed per hour, compatible with every Redis client.

Resource type: `redis`

## TypeScript definition

```typescript
import type { ValkeyEngineProperties } from 'stacktape';

type ValkeyEngine = {
  properties: ValkeyEngineProperties;
};
```

## Property: `properties`

- Required: yes
- Type: `ValkeyEngineProperties`
