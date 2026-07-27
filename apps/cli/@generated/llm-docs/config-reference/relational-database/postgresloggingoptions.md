# PostgresLoggingOptions API Reference

Resource type: `relational-database`

## TypeScript definition

```typescript
type PostgresLoggingOptions = {
  /** Log new client connections. */
  log_connections?: boolean;
  /** Log client disconnections. */
  log_disconnections?: boolean;
  /** Log sessions waiting for locks (helps find lock contention issues). */
  log_lock_waits?: boolean;
  /** Log queries slower than this (ms). -1 = disabled, 0 = log all. Great for finding slow queries. */
  log_min_duration_statement?: number;
  /** Which SQL statements to log: none, ddl (CREATE/ALTER), mod (ddl + INSERT/UPDATE/DELETE), all. */
  log_statement?: "all" | "ddl" | "mod" | "none";
};
```

## Property: `log_connections`

- Required: no
- Type: `boolean`
- Default: `false`

Log new client connections.

### Example 1 (yaml)

```yaml
resources:
mainDatabase:
  type: relational-database
  properties:
    credentials:
      masterUserPassword: $Secret('mainDatabase.password')
    logging:
      logTypes:
        - postgresql
      engineSpecificOptions:
        log_connections: true
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
  logging: {
    logTypes: ['postgresql'],
    engineSpecificOptions: {
      log_connections: true
    }
  },
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

## Property: `log_disconnections`

- Required: no
- Type: `boolean`
- Default: `false`

Log client disconnections.

### Example 1 (yaml)

```yaml
resources:
mainDatabase:
  type: relational-database
  properties:
    credentials:
      masterUserPassword: $Secret('mainDatabase.password')
    logging:
      logTypes:
        - postgresql
      engineSpecificOptions:
        log_disconnections: true
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
  logging: {
    logTypes: ['postgresql'],
    engineSpecificOptions: {
      log_disconnections: true
    }
  },
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

## Property: `log_lock_waits`

- Required: no
- Type: `boolean`
- Default: `false`

Log sessions waiting for locks (helps find lock contention issues).

### Example 1 (yaml)

```yaml
resources:
mainDatabase:
  type: relational-database
  properties:
    credentials:
      masterUserPassword: $Secret('mainDatabase.password')
    logging:
      logTypes:
        - postgresql
      engineSpecificOptions:
        log_lock_waits: true
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
  logging: {
    logTypes: ['postgresql'],
    engineSpecificOptions: {
      log_lock_waits: true
    }
  },
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

## Property: `log_min_duration_statement`

- Required: no
- Type: `number`
- Default: `10000`

Log queries slower than this (ms). `-1` = disabled, `0` = log all. Great for finding slow queries.

### Example 1 (yaml)

```yaml
resources:
mainDatabase:
  type: relational-database
  properties:
    credentials:
      masterUserPassword: $Secret('mainDatabase.password')
    logging:
      logTypes:
        - postgresql
      engineSpecificOptions:
        log_min_duration_statement: 500
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
  logging: {
    logTypes: ['postgresql'],
    engineSpecificOptions: {
      log_min_duration_statement: 500
    }
  },
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

## Property: `log_statement`

- Required: no
- Type: `string: "all" | "ddl" | "mod" | "none"`
- Default: `ddl`

Which SQL statements to log: `none`, `ddl` (CREATE/ALTER), `mod` (ddl + INSERT/UPDATE/DELETE), `all`.

### Example 1 (yaml)

```yaml
resources:
mainDatabase:
  type: relational-database
  properties:
    credentials:
      masterUserPassword: $Secret('mainDatabase.password')
    logging:
      logTypes:
        - postgresql
      engineSpecificOptions:
        log_statement: mod
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
  logging: {
    logTypes: ['postgresql'],
    engineSpecificOptions: {
      log_statement: 'mod'
    }
  },
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
