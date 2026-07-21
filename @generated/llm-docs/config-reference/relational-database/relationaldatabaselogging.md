# RelationalDatabaseLogging API Reference

Resource type: `relational-database`

## TypeScript definition

```typescript
import type { DatadogLogForwarding, HighlightLogForwarding, HttpEndpointLogForwarding, MysqlLoggingOptions, PostgresLoggingOptions } from 'stacktape';

type RelationalDatabaseLogging = {
  /** Disable CloudWatch logging entirely. */
  disabled?: boolean;
  /** Fine-grained logging settings (PostgreSQL: slow queries, statements; MySQL: audit events). */
  engineSpecificOptions?: RelationalDatabaseLoggingEngineSpecificOptions;
  /** Forward logs to an external service (Datadog, Highlight.io, or any HTTP endpoint). */
  logForwarding?: RelationalDatabaseLoggingLogForwarding;
  /** Which log types to export. Depends on engine:

PostgreSQL: postgresql
MySQL/MariaDB: audit, error, general, slowquery
Oracle: alert, audit, listener, trace
SQL Server: agent, error */
  logTypes?: Array<string>;
  /** How many days to keep logs. */
  retentionDays?: 1 | 120 | 14 | 150 | 180 | 1827 | 3 | 30 | 365 | 3653 | 400 | 5 | 545 | 60 | 7 | 731 | 90;
};

/** Union choices used by the properties above. */
type RelationalDatabaseLoggingEngineSpecificOptions =
  | PostgresLoggingOptions
  | MysqlLoggingOptions;

type RelationalDatabaseLoggingLogForwarding =
  | HttpEndpointLogForwarding
  | HighlightLogForwarding
  | DatadogLogForwarding;
```

## Property: `disabled`

- Required: no
- Type: `boolean`
- Default: `false`

Disable CloudWatch logging entirely.

### Example 1 (yaml)

```yaml
resources:
mainDatabase:
  type: relational-database
  properties:
    credentials:
      masterUserPassword: $Secret('mainDatabase.password')
    logging:
      disabled: true
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
    disabled: true
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

## Property: `engineSpecificOptions`

- Required: no
- Type: `PostgresLoggingOptions | MysqlLoggingOptions`

Fine-grained logging settings (PostgreSQL: slow queries, statements; MySQL: audit events).

Choices:
- `PostgresLoggingOptions` (`PostgresLoggingOptions`). Properties: `log_connections?: boolean`, `log_disconnections?: boolean`, `log_lock_waits?: boolean`, `log_min_duration_statement?: number`, `log_statement?: string: "all" | "ddl" | "mod" | "none"`.
- `MysqlLoggingOptions` (`MysqlLoggingOptions`). Properties: `server_audit_events?: Array<string: "CONNECT" | "QUERY" | "QUERY_DCL" | "QUERY_DDL" | "QUERY_DML" | "QUERY_DML_NO_SELECT">`, `long_query_time?: number`.

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
        log_min_duration_statement: 1000
        log_statement: ddl
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
      log_min_duration_statement: 1000,
      log_statement: 'ddl'
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

## Property: `logForwarding`

- Required: no
- Type: `http-endpoint | highlight | datadog`

Forward logs to an external service (Datadog, Highlight.io, or any HTTP endpoint).

Uses Kinesis Data Firehose (~$0.03/GB). Failed deliveries go to a backup S3 bucket.

Choices:
- `http-endpoint` (`HttpEndpointLogForwarding`). Properties: `endpointUrl: string`, `gzipEncodingEnabled?: boolean`, `parameters?: unknown`, `retryDuration?: number`, `accessKey?: string`.
- `highlight` (`HighlightLogForwarding`). Properties: `projectId: string`, `endpointUrl?: string`.
- `datadog` (`DatadogLogForwarding`). Properties: `apiKey: string`, `endpointUrl?: string`.

### Example 1 (yaml)

```yaml
resources:
  apiFunction:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/api.ts
      memory: 512
      timeout: 10
      logging:
        retentionDays: 90
        logForwarding:
          type: datadog
          properties:
            apiKey: $Secret('datadog.apiKey')
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, StacktapeLambdaBuildpackPackaging, defineConfig, $Secret } from 'stacktape';

export default defineConfig(() => {
  const apiFunction = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: 'src/api.ts' }),
    memory: 512,
    timeout: 10,
    logging: {
      retentionDays: 90,
      logForwarding: {
        type: 'datadog',
        properties: { apiKey: $Secret('datadog.apiKey') }
      }
    }
  });
  return { resources: { apiFunction } };
});
```

## Property: `logTypes`

- Required: no
- Type: `Array<string>`

Which log types to export. Depends on engine:

**PostgreSQL**: `postgresql`
**MySQL/MariaDB**: `audit`, `error`, `general`, `slowquery`
**Oracle**: `alert`, `audit`, `listener`, `trace`
**SQL Server**: `agent`, `error`

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
        - error
        - slowquery
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
    logTypes: ['error', 'slowquery']
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

## Property: `retentionDays`

- Required: no
- Type: `number: 1 | 120 | 14 | 150 | 180 | 1827 | 3 | 30 | 365 | 3653 | 400 | 5 | 545 | 60 | 7 | 731 | 90`
- Default: `90`

How many days to keep logs.

### Example 1 (yaml)

```yaml
resources:
mainDatabase:
  type: relational-database
  properties:
    credentials:
      masterUserPassword: $Secret('mainDatabase.password')
    logging:
      retentionDays: 180
      logTypes:
        - postgresql
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
    retentionDays: 180,
    logTypes: ['postgresql']
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
