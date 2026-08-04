# AuroraServerlessV2Engine API Reference

Aurora Serverless v2: recommended for most new projects.

Resource type: `relational-database`

## TypeScript definition

```typescript
import type { AuroraServerlessV2EngineProperties } from 'stacktape';

type AuroraServerlessV2Engine = {
  properties: AuroraServerlessV2EngineProperties;
  type: "aurora-mysql-serverless-v2" | "aurora-postgresql-serverless-v2";
};
```

## Property: `properties`

- Required: yes
- Type: `AuroraServerlessV2EngineProperties`

## Property: `type`

- Required: yes
- Type: `string: "aurora-mysql-serverless-v2" | "aurora-postgresql-serverless-v2"`
