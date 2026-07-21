# AuroraServerlessEngine API Reference

Aurora Serverless v1: auto-scaling database that can pause when idle.

Resource type: `relational-database`

## TypeScript definition

```typescript
import type { AuroraServerlessEngineProperties } from 'stacktape';

type AuroraServerlessEngine = {
  type: "aurora-mysql-serverless" | "aurora-postgresql-serverless";
  properties?: AuroraServerlessEngineProperties;
};
```

## Property: `type`

- Required: yes
- Type: `string: "aurora-mysql-serverless" | "aurora-postgresql-serverless"`

## Property: `properties`

- Required: no
- Type: `AuroraServerlessEngineProperties`
