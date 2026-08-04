# RdsEngine API Reference

Standard RDS: single-instance database with predictable pricing.

Resource type: `relational-database`

## TypeScript definition

```typescript
import type { RdsEngineProperties } from 'stacktape';

type RdsEngine = {
  properties: RdsEngineProperties;
  type: "mariadb" | "mysql" | "oracle-ee" | "oracle-se2" | "postgres" | "sqlserver-ee" | "sqlserver-ex" | "sqlserver-se" | "sqlserver-web";
};
```

## Property: `properties`

- Required: yes
- Type: `RdsEngineProperties`

## Property: `type`

- Required: yes
- Type: `string: "mariadb" | "mysql" | "oracle-ee" | "oracle-se2" | "postgres" | "sqlserver-ee" | "sqlserver-ex" | "sqlserver-se" | "sqlserver-web"`
