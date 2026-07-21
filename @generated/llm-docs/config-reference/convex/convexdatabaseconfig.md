# ConvexDatabaseConfig API Reference

Database override for the Convex deployment.

## TypeScript definition

```typescript
import type { AuroraEngine, AuroraServerlessV2Engine, DatabaseAccessibility, RdsEngine, RelationalDatabaseLogging } from 'stacktape';

type ConvexDatabaseConfig = {
  /** Database network accessibility. Defaults to scoping-workloads-in-vpc. */
  accessibility?: DatabaseAccessibility;
  /** Days to keep automated daily backups (0–35). Defaults to 1. */
  automatedBackupRetentionDays?: number;
  /** Database engine override. Defaults to RDS PostgreSQL 16 on db.t4g.micro. */
  engine?: ConvexDatabaseConfigEngine;
  /** Database logging (connections, slow queries, errors). */
  logging?: RelationalDatabaseLogging;
  /** When maintenance happens. Format: Sun:02:00-Sun:04:00 (UTC). */
  preferredMaintenanceWindow?: string;
};

/** Union choices used by the properties above. */
type ConvexDatabaseConfigEngine =
  | AuroraEngine
  | AuroraServerlessV2Engine
  | RdsEngine;
```

## Property: `accessibility`

- Required: no
- Type: `DatabaseAccessibility`

Database network accessibility. Defaults to `scoping-workloads-in-vpc`.

The Convex backend auto-connects internally, so users have no reason to set `internet` here
— direct `psql` access to Convex's internal Postgres is almost always wrong (use the dashboard
or `npx convex export` instead).

### Example 1 (yaml)

```yaml
resources:
  backend:
    type: convex
    properties:
      appDirectory: ./convex
      database:
        accessibility:
          accessibilityMode: scoping-workloads-in-vpc
```

### Example 2 (typescript)

```typescript
import { Convex, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const backend = new Convex({
    appDirectory: './convex',
    database: {
      accessibility: {
        accessibilityMode: 'scoping-workloads-in-vpc'
      }
    }
  });
  return { resources: { backend } };
});
```

## Property: `automatedBackupRetentionDays`

- Required: no
- Type: `number`

Days to keep automated daily backups (0–35). Defaults to 1.

### Example 1 (yaml)

```yaml
resources:
  backend:
    type: convex
    properties:
      appDirectory: ./convex
      database:
        automatedBackupRetentionDays: 14
```

### Example 2 (typescript)

```typescript
import { Convex, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const backend = new Convex({
    appDirectory: './convex',
    database: {
      automatedBackupRetentionDays: 14
    }
  });
  return { resources: { backend } };
});
```

## Property: `engine`

- Required: no
- Type: `AuroraEngine | AuroraServerlessV2Engine | RdsEngine`

Database engine override. Defaults to RDS PostgreSQL 16 on `db.t4g.micro`.

Convex requires PostgreSQL 13+. To use Aurora Serverless v2 instead (auto-scales 0.5–8 ACU,
higher idle cost but elastic), set `{ type: 'aurora-postgresql-serverless-v2', properties: { ... } }`.

Choices:
- `AuroraEngine` (`AuroraEngine`) — Aurora: high-performance clustered database with auto-failover.. Properties: `dbName?: string`, `port?: number`, `instances: Array<AuroraEngineInstance>`, `version: string`, `disableAutoMinorVersionUpgrade?: boolean`.
- `AuroraServerlessV2Engine` (`AuroraServerlessV2Engine`) — Aurora Serverless v2: recommended for most new projects.. Properties: `dbName?: string`, `minCapacity?: number`, `maxCapacity?: number`, `serverlessReadersCount?: number`, `version: string`, `disableAutoMinorVersionUpgrade?: boolean`.
- `RdsEngine` (`RdsEngine`) — Standard RDS: single-instance database with predictable pricing.. Properties: `dbName?: string`, `port?: number`, `storage?: RdsEngineStorage`, `primaryInstance: RdsEnginePrimaryInstance`, `readReplicas?: Array<RdsEngineReadReplica>`, `version: string`, `disableAutoMinorVersionUpgrade?: boolean`.

### Example 1 (yaml)

```yaml
resources:
  backend:
    type: convex
    properties:
      appDirectory: ./convex
      database:
        engine:
          type: postgres
          properties:
            version: '16.6'
            primaryInstance:
              instanceSize: db.t4g.medium
              multiAz: true
```

### Example 2 (typescript)

```typescript
import { Convex, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const backend = new Convex({
    appDirectory: './convex',
    database: {
      engine: {
        type: 'postgres',
        properties: {
          version: '16.6',
          primaryInstance: {
            instanceSize: 'db.t4g.medium',
            multiAz: true
          }
        }
      }
    }
  });
  return { resources: { backend } };
});
```

## Property: `logging`

- Required: no
- Type: `RelationalDatabaseLogging`

Database logging (connections, slow queries, errors).

### Example 1 (yaml)

```yaml
resources:
  backend:
    type: convex
    properties:
      appDirectory: ./convex
      database:
        logging:
          retentionDays: 30
          logTypes:
            - postgresql
```

### Example 2 (typescript)

```typescript
import { Convex, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const backend = new Convex({
    appDirectory: './convex',
    database: {
      logging: {
        retentionDays: 30,
        logTypes: ['postgresql']
      }
    }
  });
  return { resources: { backend } };
});
```

## Property: `preferredMaintenanceWindow`

- Required: no
- Type: `string`

When maintenance happens. Format: `Sun:02:00-Sun:04:00` (UTC).

### Example 1 (yaml)

```yaml
resources:
  backend:
    type: convex
    properties:
      appDirectory: ./convex
      database:
        preferredMaintenanceWindow: Sun:02:00-Sun:04:00
```

### Example 2 (typescript)

```typescript
import { Convex, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const backend = new Convex({
    appDirectory: './convex',
    database: {
      preferredMaintenanceWindow: 'Sun:02:00-Sun:04:00'
    }
  });
  return { resources: { backend } };
});
```
