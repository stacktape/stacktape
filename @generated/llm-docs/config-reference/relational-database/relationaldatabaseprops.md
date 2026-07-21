# RelationalDatabaseProps API Reference

Resource type: `relational-database`

## TypeScript definition

```typescript
import type { AuroraEngine, AuroraServerlessEngine, AuroraServerlessV2Engine, DatabaseAccessibility, DevModeConfig, RdsEngine, RelationalDatabaseAlarm, RelationalDatabaseCredentials, RelationalDatabaseLogging } from 'stacktape';

type RelationalDatabaseProps = {
  /** Master user credentials (username and password). */
  credentials: RelationalDatabaseCredentials;
  /** Database engine: what type of database and how it runs. */
  engine: RelationalDatabaseEngine;
  /** Who can connect to this database (network-level access control). */
  accessibility?: DatabaseAccessibility;
  /** Alarms for this database (merged with global alarms from the Stacktape Console). */
  alarms?: Array<RelationalDatabaseAlarm>;
  /** Days to keep automated daily backups (0-35). Set to 0 to disable (RDS only). */
  automatedBackupRetentionDays?: number;
  /** Prevent accidental deletion of the database. Must be disabled before deleting. */
  deletionProtection?: boolean;
  /** Dev mode: runs locally in Docker by default. Set remote: true to use the deployed database. */
  dev?: DevModeConfig;
  /** Global alarm names to exclude from this database. */
  disabledGlobalAlarms?: Array<string>;
  /** Database logging (connections, slow queries, errors). */
  logging?: RelationalDatabaseLogging;
  /** When maintenance (patching, upgrades) happens. Format: Sun:02:00-Sun:04:00 (UTC). */
  preferredMaintenanceWindow?: string;
};

/** Union choices used by the properties above. */
type RelationalDatabaseEngine =
  | AuroraEngine
  | AuroraServerlessEngine
  | AuroraServerlessV2Engine
  | RdsEngine;
```

## Property: `credentials`

- Required: yes
- Type: `RelationalDatabaseCredentials`

Master user credentials (username and password).

Included in the auto-generated connection string. Store the password in a Stacktape secret
to avoid exposing it in your config file.

### Example 1 (yaml)

```yaml
resources:
mainDatabase:
  type: relational-database
  properties:
    credentials:
      masterUserName: db_master_user
      masterUserPassword: $Secret('mainDatabase.password')
    engine:
      type: postgres
      properties:
        version: '16.6'
        primaryInstance:
          instanceSize: db.t4g.micro
```

### Example 2 (typescript)

```typescript
import { RelationalDatabase, defineConfig, $Secret } from 'stacktape';

export default defineConfig(() => {
const mainDatabase = new RelationalDatabase({
  credentials: {
    masterUserName: 'db_master_user',
    masterUserPassword: $Secret('mainDatabase.password')
  },
  engine: {
    type: 'postgres',
    properties: {
      version: '16.6',
      primaryInstance: { instanceSize: 'db.t4g.micro' }
    }
  }
});
return { resources: { mainDatabase } };
});
```

## Property: `engine`

- Required: yes
- Type: `AuroraEngine | AuroraServerlessEngine | AuroraServerlessV2Engine | RdsEngine`

Database engine: what type of database and how it runs.

**RDS** (`postgres`, `mysql`, `mariadb`, etc.): Single-node, fixed-size. Simple and predictable pricing.
**Aurora** (`aurora-postgresql`, `aurora-mysql`): High-performance clustered DB with auto-failover.
Up to 5x faster than standard MySQL / 3x faster than standard PostgreSQL.
**Aurora Serverless v2** (`aurora-postgresql-serverless-v2`): Auto-scales from 0.5 to 128 ACUs.
**Recommended for most new projects** — pay only for what you use.

Choices:
- `AuroraEngine` (`AuroraEngine`) — Aurora: high-performance clustered database with auto-failover.. Properties: `dbName?: string`, `port?: number`, `instances: Array<AuroraEngineInstance>`, `version: string`, `disableAutoMinorVersionUpgrade?: boolean`.
- `AuroraServerlessEngine` (`AuroraServerlessEngine`) — Aurora Serverless v1: auto-scaling database that can pause when idle.. Properties: `version?: string`, `dbName?: string`, `minCapacity?: number`, `maxCapacity?: number`, `pauseAfterSeconds?: number`, `disableAutoMinorVersionUpgrade?: boolean`.
- `AuroraServerlessV2Engine` (`AuroraServerlessV2Engine`) — Aurora Serverless v2: recommended for most new projects.. Properties: `dbName?: string`, `minCapacity?: number`, `maxCapacity?: number`, `serverlessReadersCount?: number`, `version: string`, `disableAutoMinorVersionUpgrade?: boolean`.
- `RdsEngine` (`RdsEngine`) — Standard RDS: single-instance database with predictable pricing.. Properties: `dbName?: string`, `port?: number`, `storage?: RdsEngineStorage`, `primaryInstance: RdsEnginePrimaryInstance`, `readReplicas?: Array<RdsEngineReadReplica>`, `version: string`, `disableAutoMinorVersionUpgrade?: boolean`.

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

## Property: `accessibility`

- Required: no
- Type: `DatabaseAccessibility`

Who can connect to this database (network-level access control).

Default is `internet` — anyone with credentials can connect (fine for development).
For production, use `scoping-workloads-in-vpc` to restrict access to only resources
that list this database in their `connectTo`.

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
      type: postgres
      properties:
        version: '16.6'
        primaryInstance:
          instanceSize: db.t4g.micro
```

### Example 2 (typescript)

```typescript
import { RelationalDatabase, defineConfig, $Secret } from 'stacktape';

export default defineConfig(() => {
const mainDatabase = new RelationalDatabase({
  credentials: { masterUserPassword: $Secret('mainDatabase.password') },
  accessibility: { accessibilityMode: 'scoping-workloads-in-vpc' },
  engine: {
    type: 'postgres',
    properties: {
      version: '16.6',
      primaryInstance: { instanceSize: 'db.t4g.micro' }
    }
  }
});
return { resources: { mainDatabase } };
});
```

## Property: `alarms`

- Required: no
- Type: `Array<RelationalDatabaseAlarm>`

Alarms for this database (merged with global alarms from the Stacktape Console).

### Example 1 (yaml)

```yaml
resources:
mainDatabase:
  type: relational-database
  properties:
    credentials:
      masterUserPassword: $Secret('mainDatabase.password')
    alarms:
      - trigger:
          type: database-cpu-utilization
          properties:
            thresholdPercent: 85
        notificationTargets:
          - type: email
            properties:
              sender: alerts@example.com
              recipient: ops@example.com
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
  alarms: [
    {
      trigger: {
        type: 'database-cpu-utilization',
        properties: { thresholdPercent: 85 }
      },
      notificationTargets: [
        {
          type: 'email',
          properties: { sender: 'alerts@example.com', recipient: 'ops@example.com' }
        }
      ]
    }
  ],
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

## Property: `automatedBackupRetentionDays`

- Required: no
- Type: `number`
- Default: `1`

Days to keep automated daily backups (0-35). Set to 0 to disable (RDS only).

### Example 1 (yaml)

```yaml
resources:
mainDatabase:
  type: relational-database
  properties:
    credentials:
      masterUserPassword: $Secret('mainDatabase.password')
    automatedBackupRetentionDays: 7
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
  automatedBackupRetentionDays: 7,
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

## Property: `deletionProtection`

- Required: no
- Type: `boolean`
- Default: `false`

Prevent accidental deletion of the database. Must be disabled before deleting.

### Example 1 (yaml)

```yaml
resources:
mainDatabase:
  type: relational-database
  properties:
    credentials:
      masterUserPassword: $Secret('mainDatabase.password')
    deletionProtection: true
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
  deletionProtection: true,
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

## Property: `dev`

- Required: no
- Type: `DevModeConfig`

Dev mode: runs locally in Docker by default. Set `remote: true` to use the deployed database.

### Example 1 (yaml)

```yaml
resources:
mainDatabase:
  type: relational-database
  properties:
    credentials:
      masterUserPassword: $Secret('mainDatabase.password')
    dev:
      remote: true
    engine:
      type: postgres
      properties:
        version: '16.6'
        primaryInstance:
          instanceSize: db.t4g.micro
```

### Example 2 (typescript)

```typescript
import { RelationalDatabase, defineConfig, $Secret } from 'stacktape';

export default defineConfig(() => {
const mainDatabase = new RelationalDatabase({
  credentials: { masterUserPassword: $Secret('mainDatabase.password') },
  dev: { remote: true },
  engine: {
    type: 'postgres',
    properties: {
      version: '16.6',
      primaryInstance: { instanceSize: 'db.t4g.micro' }
    }
  }
});
return { resources: { mainDatabase } };
});
```

## Property: `disabledGlobalAlarms`

- Required: no
- Type: `Array<string>`

Global alarm names to exclude from this database.

### Example 1 (yaml)

```yaml
resources:
mainDatabase:
  type: relational-database
  properties:
    credentials:
      masterUserPassword: $Secret('mainDatabase.password')
    disabledGlobalAlarms:
      - db-cpu-high
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
  disabledGlobalAlarms: ['db-cpu-high'],
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

## Property: `logging`

- Required: no
- Type: `RelationalDatabaseLogging`

Database logging (connections, slow queries, errors).

Logs are sent to CloudWatch and retained for 90 days by default.
Available log types vary by engine.

### Example 1 (yaml)

```yaml
resources:
mainDatabase:
  type: relational-database
  properties:
    credentials:
      masterUserPassword: $Secret('mainDatabase.password')
    logging:
      retentionDays: 30
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
    retentionDays: 30,
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

## Property: `preferredMaintenanceWindow`

- Required: no
- Type: `string`

When maintenance (patching, upgrades) happens. Format: `Sun:02:00-Sun:04:00` (UTC).

The database may be briefly unavailable during this window.
Use multi-AZ or Aurora to minimize downtime.

### Example 1 (yaml)

```yaml
resources:
mainDatabase:
  type: relational-database
  properties:
    credentials:
      masterUserPassword: $Secret('mainDatabase.password')
    preferredMaintenanceWindow: Sun:02:00-Sun:04:00
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
  preferredMaintenanceWindow: 'Sun:02:00-Sun:04:00',
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
