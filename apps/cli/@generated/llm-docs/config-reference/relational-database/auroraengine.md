# AuroraEngine API Reference

Aurora: high-performance clustered database with auto-failover.

Resource type: `relational-database`

## TypeScript definition

```typescript
import type { AuroraEngineProperties } from 'stacktape';

type AuroraEngine = {
  properties: AuroraEngineProperties;
  type: "aurora-mysql" | "aurora-postgresql";
};
```

## Property: `properties`

- Required: yes
- Type: `AuroraEngineProperties`

## Property: `type`

- Required: yes
- Type: `string: "aurora-mysql" | "aurora-postgresql"`
