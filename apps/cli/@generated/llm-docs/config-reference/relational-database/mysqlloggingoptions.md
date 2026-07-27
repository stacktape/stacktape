# MysqlLoggingOptions API Reference

Resource type: `relational-database`

## TypeScript definition

```typescript
type MysqlLoggingOptions = {
  /** Queries slower than this (seconds) are logged as &quot;slow queries&quot;. -1 to disable. */
  long_query_time?: number;
  /** What to record in the audit log: connections, all queries, DDL only, DML only, etc. */
  server_audit_events?: Array<"CONNECT" | "QUERY" | "QUERY_DCL" | "QUERY_DDL" | "QUERY_DML" | "QUERY_DML_NO_SELECT">;
};
```

## Property: `long_query_time`

- Required: no
- Type: `number`
- Default: `10`

Queries slower than this (seconds) are logged as "slow queries". `-1` to disable.

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
        - slowquery
      engineSpecificOptions:
        long_query_time: 2
    engine:
      type: mysql
      properties:
        version: '8.0.36'
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
    logTypes: ['slowquery'],
    engineSpecificOptions: {
      long_query_time: 2
    }
  },
  engine: {
    type: 'mysql',
    properties: {
      version: '8.0.36',
      primaryInstance: { instanceSize: 'db.t4g.medium' }
    }
  }
});
return { resources: { mainDatabase } };
});
```

## Property: `server_audit_events`

- Required: no
- Type: `Array<string: "CONNECT" | "QUERY" | "QUERY_DCL" | "QUERY_DDL" | "QUERY_DML" | "QUERY_DML_NO_SELECT">`
- Default: `["QUERY_DDL"]`

What to record in the audit log: connections, all queries, DDL only, DML only, etc.

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
        - audit
      engineSpecificOptions:
        server_audit_events:
          - CONNECT
          - QUERY_DDL
    engine:
      type: mysql
      properties:
        version: '8.0.36'
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
    logTypes: ['audit'],
    engineSpecificOptions: {
      server_audit_events: ['CONNECT', 'QUERY_DDL']
    }
  },
  engine: {
    type: 'mysql',
    properties: {
      version: '8.0.36',
      primaryInstance: { instanceSize: 'db.t4g.medium' }
    }
  }
});
return { resources: { mainDatabase } };
});
```
