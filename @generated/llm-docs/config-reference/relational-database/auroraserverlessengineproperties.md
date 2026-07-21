# AuroraServerlessEngineProperties API Reference

Resource type: `relational-database`

## TypeScript definition

```typescript
type AuroraServerlessEngineProperties = {
  /** Name of the initial database. */
  dbName?: string;
  /** Skip automatic minor version upgrades (e.g., 16.4 → 16.5). */
  disableAutoMinorVersionUpgrade?: boolean;
  /** Maximum ACUs to scale up to. */
  maxCapacity?: number;
  /** Minimum ACUs to scale down to (~1 ACU ≈ 2 GB RAM). */
  minCapacity?: number;
  /** Pause the database after this many seconds of inactivity (no connections). */
  pauseAfterSeconds?: number;
  /** Engine version. Usually managed by AWS automatically for serverless v1. */
  version?: string;
};
```

## Property: `dbName`

- Required: no
- Type: `string`
- Default: `defdb`

Name of the initial database.

### Example 1 (yaml)

```yaml
resources:
mainDatabase:
  type: relational-database
  properties:
    credentials:
      masterUserPassword: $Secret('mainDatabase.password')
    accessibility:
      accessibilityMode: scoping-workloads-in-vpc
    engine:
      type: aurora-postgresql-serverless
      properties:
        dbName: appdb
        minCapacity: 2
        maxCapacity: 8
```

### Example 2 (typescript)

```typescript
import { RelationalDatabase, defineConfig, $Secret } from 'stacktape';

export default defineConfig(() => {
const mainDatabase = new RelationalDatabase({
  credentials: { masterUserPassword: $Secret('mainDatabase.password') },
  accessibility: { accessibilityMode: 'scoping-workloads-in-vpc' },
  engine: {
    type: 'aurora-postgresql-serverless',
    properties: {
      dbName: 'appdb',
      minCapacity: 2,
      maxCapacity: 8
    }
  }
});
return { resources: { mainDatabase } };
});
```

## Property: `disableAutoMinorVersionUpgrade`

- Required: no
- Type: `boolean`
- Default: `false`

Skip automatic minor version upgrades (e.g., 16.4 → 16.5).

### Example 1 (yaml)

```yaml
resources:
mainDatabase:
  type: relational-database
  properties:
    credentials:
      masterUserPassword: $Secret('mainDatabase.password')
    engine:
      type: postgres
      properties:
        version: '16.6'
        disableAutoMinorVersionUpgrade: true
        primaryInstance:
          instanceSize: db.t4g.medium
```

### Example 2 (typescript)

```typescript
import { RelationalDatabase, defineConfig, $Secret } from 'stacktape';

export default defineConfig(() => {
const mainDatabase = new RelationalDatabase({
  credentials: { masterUserPassword: $Secret('mainDatabase.password') },
  engine: {
    type: 'postgres',
    properties: {
      version: '16.6',
      disableAutoMinorVersionUpgrade: true,
      primaryInstance: { instanceSize: 'db.t4g.medium' }
    }
  }
});
return { resources: { mainDatabase } };
});
```

## Property: `maxCapacity`

- Required: no
- Type: `number`
- Default: `4`

Maximum ACUs to scale up to.

MySQL: 1-256 (powers of 2). PostgreSQL: 2-256 (powers of 2).

### Example 1 (yaml)

```yaml
resources:
mainDatabase:
  type: relational-database
  properties:
    credentials:
      masterUserPassword: $Secret('mainDatabase.password')
    accessibility:
      accessibilityMode: scoping-workloads-in-vpc
    engine:
      type: aurora-postgresql-serverless
      properties:
        minCapacity: 2
        maxCapacity: 32
```

### Example 2 (typescript)

```typescript
import { RelationalDatabase, defineConfig, $Secret } from 'stacktape';

export default defineConfig(() => {
const mainDatabase = new RelationalDatabase({
  credentials: { masterUserPassword: $Secret('mainDatabase.password') },
  accessibility: { accessibilityMode: 'scoping-workloads-in-vpc' },
  engine: {
    type: 'aurora-postgresql-serverless',
    properties: {
      minCapacity: 2,
      maxCapacity: 32
    }
  }
});
return { resources: { mainDatabase } };
});
```

## Property: `minCapacity`

- Required: no
- Type: `number`
- Default: `2`

Minimum ACUs to scale down to (~1 ACU ≈ 2 GB RAM).

MySQL: 1-256 (powers of 2). PostgreSQL: 2-256 (powers of 2).

### Example 1 (yaml)

```yaml
resources:
mainDatabase:
  type: relational-database
  properties:
    credentials:
      masterUserPassword: $Secret('mainDatabase.password')
    accessibility:
      accessibilityMode: scoping-workloads-in-vpc
    engine:
      type: aurora-postgresql-serverless
      properties:
        minCapacity: 2
        maxCapacity: 16
```

### Example 2 (typescript)

```typescript
import { RelationalDatabase, defineConfig, $Secret } from 'stacktape';

export default defineConfig(() => {
const mainDatabase = new RelationalDatabase({
  credentials: { masterUserPassword: $Secret('mainDatabase.password') },
  accessibility: { accessibilityMode: 'scoping-workloads-in-vpc' },
  engine: {
    type: 'aurora-postgresql-serverless',
    properties: {
      minCapacity: 2,
      maxCapacity: 16
    }
  }
});
return { resources: { mainDatabase } };
});
```

## Property: `pauseAfterSeconds`

- Required: no
- Type: `number`

Pause the database after this many seconds of inactivity (no connections).

When paused, you only pay for storage. Range: 300 (5 min) - 86400 (24 hr).
Omit to never pause.

### Example 1 (yaml)

```yaml
resources:
mainDatabase:
  type: relational-database
  properties:
    credentials:
      masterUserPassword: $Secret('mainDatabase.password')
    accessibility:
      accessibilityMode: scoping-workloads-in-vpc
    engine:
      type: aurora-postgresql-serverless
      properties:
        minCapacity: 2
        maxCapacity: 8
        pauseAfterSeconds: 900
```

### Example 2 (typescript)

```typescript
import { RelationalDatabase, defineConfig, $Secret } from 'stacktape';

export default defineConfig(() => {
const mainDatabase = new RelationalDatabase({
  credentials: { masterUserPassword: $Secret('mainDatabase.password') },
  accessibility: { accessibilityMode: 'scoping-workloads-in-vpc' },
  engine: {
    type: 'aurora-postgresql-serverless',
    properties: {
      minCapacity: 2,
      maxCapacity: 8,
      pauseAfterSeconds: 900
    }
  }
});
return { resources: { mainDatabase } };
});
```

## Property: `version`

- Required: no
- Type: `string`

Engine version. Usually managed by AWS automatically for serverless v1.

### Example 1 (yaml)

```yaml
resources:
mainDatabase:
  type: relational-database
  properties:
    credentials:
      masterUserPassword: $Secret('mainDatabase.password')
    accessibility:
      accessibilityMode: scoping-workloads-in-vpc
    engine:
      type: aurora-postgresql-serverless
      properties:
        version: '13.12'
        minCapacity: 2
        maxCapacity: 8
```

### Example 2 (typescript)

```typescript
import { RelationalDatabase, defineConfig, $Secret } from 'stacktape';

export default defineConfig(() => {
const mainDatabase = new RelationalDatabase({
  credentials: { masterUserPassword: $Secret('mainDatabase.password') },
  accessibility: { accessibilityMode: 'scoping-workloads-in-vpc' },
  engine: {
    type: 'aurora-postgresql-serverless',
    properties: {
      version: '13.12',
      minCapacity: 2,
      maxCapacity: 8
    }
  }
});
return { resources: { mainDatabase } };
});
```
