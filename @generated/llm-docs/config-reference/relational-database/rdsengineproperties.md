# RdsEngineProperties API Reference

Resource type: `relational-database`

## TypeScript definition

```typescript
import type { RdsEnginePrimaryInstance, RdsEngineReadReplica, RdsEngineStorage } from 'stacktape';

type RdsEngineProperties = {
  /** The primary (writer) instance. Handles all write operations. */
  primaryInstance: RdsEnginePrimaryInstance;
  /** Engine version (e.g., 16.6 for PostgreSQL, 8.0.36 for MySQL). */
  version: string;
  /** Name of the database created on initialization. For Oracle, this is the SID. Not applicable to SQL Server. */
  dbName?: string;
  /** Skip automatic minor version upgrades (e.g., 16.4 → 16.5). */
  disableAutoMinorVersionUpgrade?: boolean;
  /** Port the database listens on. Defaults: PostgreSQL 5432, MySQL/MariaDB 3306, Oracle 1521, SQL Server 1433. */
  port?: number;
  /** Read replicas to offload read traffic from the primary instance. */
  readReplicas?: Array<RdsEngineReadReplica>;
  /** Storage configuration. Auto-scales up when free space is low. */
  storage?: RdsEngineStorage;
};
```

## Property: `primaryInstance`

- Required: yes
- Type: `RdsEnginePrimaryInstance`

The primary (writer) instance. Handles all write operations.

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
          instanceSize: db.r6g.large
          multiAz: true
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
      primaryInstance: {
        instanceSize: 'db.r6g.large',
        multiAz: true
      }
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

Name of the database created on initialization. For Oracle, this is the SID. Not applicable to SQL Server.

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
        dbName: appdb
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
      dbName: 'appdb',
      primaryInstance: { instanceSize: 'db.t4g.medium' }
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

Port the database listens on. Defaults: PostgreSQL 5432, MySQL/MariaDB 3306, Oracle 1521, SQL Server 1433.

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
        port: 5433
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
      port: 5433,
      primaryInstance: { instanceSize: 'db.t4g.medium' }
    }
  }
});
return { resources: { mainDatabase } };
});
```

## Property: `readReplicas`

- Required: no
- Type: `Array<RdsEngineReadReplica>`

Read replicas to offload read traffic from the primary instance.

Each replica gets its own endpoint. Data is replicated asynchronously from the primary.

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
          instanceSize: db.r6g.large
        readReplicas:
          - instanceSize: db.r6g.large
          - instanceSize: db.t4g.medium
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
      primaryInstance: { instanceSize: 'db.r6g.large' },
      readReplicas: [
        { instanceSize: 'db.r6g.large' },
        { instanceSize: 'db.t4g.medium' }
      ]
    }
  }
});
return { resources: { mainDatabase } };
});
```

## Property: `storage`

- Required: no
- Type: `RdsEngineStorage`

Storage configuration. Auto-scales up when free space is low.

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
        storage:
          initialSize: 50
          maxSize: 500
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
      storage: { initialSize: 50, maxSize: 500 },
      primaryInstance: { instanceSize: 'db.t4g.medium' }
    }
  }
});
return { resources: { mainDatabase } };
});
```
