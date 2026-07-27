# AuroraEngineProperties API Reference

Resource type: `relational-database`

## TypeScript definition

```typescript
import type { AuroraEngineInstance } from 'stacktape';

type AuroraEngineProperties = {
  /** Cluster instances. First = primary (writer), rest = read replicas. */
  instances: Array<AuroraEngineInstance>;
  /** Engine version (e.g., 16.6 for PostgreSQL, 8.0.36 for MySQL). */
  version: string;
  /** Name of the initial database. */
  dbName?: string;
  /** Skip automatic minor version upgrades (e.g., 16.4 → 16.5). */
  disableAutoMinorVersionUpgrade?: boolean;
  /** Port. Defaults: aurora-mysql 3306, aurora-postgresql 5432. */
  port?: number;
};
```

## Property: `instances`

- Required: yes
- Type: `Array<AuroraEngineInstance>`

Cluster instances. First = primary (writer), rest = read replicas.

Reads are load-balanced across all instances. If the primary fails,
a replica is automatically promoted (usually within 30 seconds).

### Example 1 (yaml)

```yaml
resources:
mainDatabase:
  type: relational-database
  properties:
    credentials:
      masterUserPassword: $Secret('mainDatabase.password')
    engine:
      type: aurora-postgresql
      properties:
        version: '16.6'
        instances:
          - instanceSize: db.r6g.large
          - instanceSize: db.r6g.large
```

### Example 2 (typescript)

```typescript
import { RelationalDatabase, defineConfig, $Secret } from 'stacktape';

export default defineConfig(() => {
const mainDatabase = new RelationalDatabase({
  credentials: { masterUserPassword: $Secret('mainDatabase.password') },
  engine: {
    type: 'aurora-postgresql',
    properties: {
      version: '16.6',
      instances: [
        { instanceSize: 'db.r6g.large' },
        { instanceSize: 'db.r6g.large' }
      ]
    }
  }
});
return { resources: { mainDatabase } };
});
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
      type: aurora-postgresql
      properties:
        version: '16.6'
        dbName: appdb
        instances:
          - instanceSize: db.r6g.large
```

### Example 2 (typescript)

```typescript
import { RelationalDatabase, defineConfig, $Secret } from 'stacktape';

export default defineConfig(() => {
const mainDatabase = new RelationalDatabase({
  credentials: { masterUserPassword: $Secret('mainDatabase.password') },
  engine: {
    type: 'aurora-postgresql',
    properties: {
      version: '16.6',
      dbName: 'appdb',
      instances: [{ instanceSize: 'db.r6g.large' }]
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

## Property: `port`

- Required: no
- Type: `number`

Port. Defaults: aurora-mysql 3306, aurora-postgresql 5432.

### Example 1 (yaml)

```yaml
resources:
mainDatabase:
  type: relational-database
  properties:
    credentials:
      masterUserPassword: $Secret('mainDatabase.password')
    engine:
      type: aurora-postgresql
      properties:
        version: '16.6'
        port: 5433
        instances:
          - instanceSize: db.r6g.large
```

### Example 2 (typescript)

```typescript
import { RelationalDatabase, defineConfig, $Secret } from 'stacktape';

export default defineConfig(() => {
const mainDatabase = new RelationalDatabase({
  credentials: { masterUserPassword: $Secret('mainDatabase.password') },
  engine: {
    type: 'aurora-postgresql',
    properties: {
      version: '16.6',
      port: 5433,
      instances: [{ instanceSize: 'db.r6g.large' }]
    }
  }
});
return { resources: { mainDatabase } };
});
```
