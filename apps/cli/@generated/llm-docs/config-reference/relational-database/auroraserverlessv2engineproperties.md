# AuroraServerlessV2EngineProperties API Reference

Resource type: `relational-database`

## TypeScript definition

```typescript
type AuroraServerlessV2EngineProperties = {
  /** Engine version (e.g., 16.6 for PostgreSQL, 8.0.36 for MySQL). */
  version: string;
  /** Name of the initial database. */
  dbName?: string;
  /** Skip automatic minor version upgrades (e.g., 16.4 → 16.5). */
  disableAutoMinorVersionUpgrade?: boolean;
  /** Maximum ACUs (0.5-128 in 0.5 increments). Caps your scaling and cost. */
  maxCapacity?: number;
  /** Minimum ACUs (0.5-128 in 0.5 increments). ~1 ACU ≈ 2 GB RAM. */
  minCapacity?: number;
  /** Number of reader instances in the Aurora Serverless v2 cluster. */
  serverlessReadersCount?: number;
};
```

## Property: `version`

- Required: yes
- Type: `string`

Engine version (e.g., `16.6` for PostgreSQL, `8.0.36` for MySQL).

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
      primaryInstance: { instanceSize: 'db.t4g.medium' }
    }
  }
});
return { resources: { mainDatabase } };
});
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
    engine:
      type: aurora-postgresql-serverless-v2
      properties:
        version: '16.6'
        dbName: appdb
        minCapacity: 0.5
        maxCapacity: 8
```

### Example 2 (typescript)

```typescript
import { RelationalDatabase, defineConfig, $Secret } from 'stacktape';

export default defineConfig(() => {
const mainDatabase = new RelationalDatabase({
  credentials: { masterUserPassword: $Secret('mainDatabase.password') },
  engine: {
    type: 'aurora-postgresql-serverless-v2',
    properties: {
      version: '16.6',
      dbName: 'appdb',
      minCapacity: 0.5,
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
- Default: `10`

Maximum ACUs (0.5-128 in 0.5 increments). Caps your scaling and cost.

### Example 1 (yaml)

```yaml
resources:
mainDatabase:
  type: relational-database
  properties:
    credentials:
      masterUserPassword: $Secret('mainDatabase.password')
    engine:
      type: aurora-postgresql-serverless-v2
      properties:
        version: '16.6'
        minCapacity: 0.5
        maxCapacity: 16
```

### Example 2 (typescript)

```typescript
import { RelationalDatabase, defineConfig, $Secret } from 'stacktape';

export default defineConfig(() => {
const mainDatabase = new RelationalDatabase({
  credentials: { masterUserPassword: $Secret('mainDatabase.password') },
  engine: {
    type: 'aurora-postgresql-serverless-v2',
    properties: {
      version: '16.6',
      minCapacity: 0.5,
      maxCapacity: 16
    }
  }
});
return { resources: { mainDatabase } };
});
```

## Property: `minCapacity`

- Required: no
- Type: `number`
- Default: `0.5`

Minimum ACUs (0.5-128 in 0.5 increments). ~1 ACU ≈ 2 GB RAM.

Set low (0.5) for dev/staging to minimize cost. The database scales up instantly under load.

### Example 1 (yaml)

```yaml
resources:
mainDatabase:
  type: relational-database
  properties:
    credentials:
      masterUserPassword: $Secret('mainDatabase.password')
    engine:
      type: aurora-postgresql-serverless-v2
      properties:
        version: '16.6'
        minCapacity: 0.5
        maxCapacity: 8
```

### Example 2 (typescript)

```typescript
import { RelationalDatabase, defineConfig, $Secret } from 'stacktape';

export default defineConfig(() => {
const mainDatabase = new RelationalDatabase({
  credentials: { masterUserPassword: $Secret('mainDatabase.password') },
  engine: {
    type: 'aurora-postgresql-serverless-v2',
    properties: {
      version: '16.6',
      minCapacity: 0.5,
      maxCapacity: 8
    }
  }
});
return { resources: { mainDatabase } };
});
```

## Property: `serverlessReadersCount`

- Required: no
- Type: `number`
- Default: `0`

Number of reader instances in the Aurora Serverless v2 cluster.

Aurora Serverless v2 always has one writer instance. This value adds additional readers
(`0` means writer only, `2` means writer + 2 readers).

### Example 1 (yaml)

```yaml
resources:
mainDatabase:
  type: relational-database
  properties:
    credentials:
      masterUserPassword: $Secret('mainDatabase.password')
    engine:
      type: aurora-postgresql-serverless-v2
      properties:
        version: '16.6'
        minCapacity: 0.5
        maxCapacity: 16
        serverlessReadersCount: 2
```

### Example 2 (typescript)

```typescript
import { RelationalDatabase, defineConfig, $Secret } from 'stacktape';

export default defineConfig(() => {
const mainDatabase = new RelationalDatabase({
  credentials: { masterUserPassword: $Secret('mainDatabase.password') },
  engine: {
    type: 'aurora-postgresql-serverless-v2',
    properties: {
      version: '16.6',
      minCapacity: 0.5,
      maxCapacity: 16,
      serverlessReadersCount: 2
    }
  }
});
return { resources: { mainDatabase } };
});
```
