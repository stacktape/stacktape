# Relational database

A relational database is a managed SQL database on Amazon RDS or Aurora. You pick the engine, and Stacktape creates the
database, its network access, its credentials and its backups in your AWS account.

Standard RDS and provisioned Aurora bill for every hour an instance runs, used or not. The smallest PostgreSQL
instance, `db.t4g.micro`, is about $12 a month in us-east-1 plus storage. Aurora Serverless v2 bills for the capacity it
uses and, by default, pauses when nobody connects. For key-value data with no idle cost, use
[DynamoDB](/resources/databases/dynamodb).

## Basic example


Example (TypeScript):

```typescript
import { defineConfig, RelationalDatabase, RdsEnginePostgres } from 'stacktape';
export default defineConfig(() => {
  const mainDatabase = new RelationalDatabase({
    credentials: {
      masterUserPassword: "$Secret('database', 'password')"
    },
    engine: new RdsEnginePostgres({
      version: '16',
      primaryInstance: {
        instanceSize: 'db.t4g.micro'
      }
    })
  });

  return {
    resources: { mainDatabase }
  };
});
```


The deploy creates a PostgreSQL 16 database on a `db.t4g.micro` instance with 20 GB of storage. It contains a database
named `defdb`, and you sign in as `db_master_user`. If the `database` secret doesn't exist yet, the deploy generates a
random password and stores it there. Creating a new database takes 10 to 15 minutes.

Check that it answers:

```bash
stacktape query sql mainDatabase "SELECT version()" --stage dev
```

Anyone who has the credentials can reach this database from the internet, because `internet` is the default
[access mode](#accessibility). Restrict it before you store real data.

## Engine types

| | Standard RDS | Aurora | Aurora Serverless v2 |
|---|---|---|---|
| Engines | PostgreSQL, MySQL, MariaDB, Oracle, SQL Server | PostgreSQL, MySQL | PostgreSQL, MySQL |
| Compute | One instance of a size you pick | Instances of a size you pick | Scales between `minCapacity` and `maxCapacity` |
| Idle cost | Full instance price | Full instance price | Storage only while paused |
| High availability | `multiAz` standby (doubles the instance cost) | Add a second instance | Add a reader |

Start with standard RDS when you want one fixed monthly price, or with Aurora Serverless v2 when traffic is uneven or
the database sits idle for long periods (dev and preview stages). Provisioned Aurora suits large production databases
that need fast failover and several readers.

Choose before you store data you care about. Changing `instanceSize` or `multiAz` later updates the instance in place,
with a short interruption for a size change. Changing the engine type, for example from RDS to Aurora, replaces the
database: the deploy creates an empty new one and deletes the old one with its data. Dump the data first and restore
it into the new database, and keep `deletionProtection` on so a deploy can't delete the old database by accident.

### Standard RDS

Engine types: `postgres`, `mysql`, `mariadb`, `oracle-se2`, `sqlserver-ee`, `sqlserver-ex`, `sqlserver-se` and
`sqlserver-web` (classes `RdsEnginePostgres`, `RdsEngineMysql`, `RdsEngineMariadb`, `RdsEngineOracleSE2` and the
`RdsEngineSqlServer*` classes). Oracle and SQL Server run with a license included in the instance price. The
`oracle-ee` type currently fails validation, so use `oracle-se2` for Oracle.

`instanceSize` sets CPU and memory. PostgreSQL prices in us-east-1, single-AZ, on-demand
([RDS pricing](https://aws.amazon.com/rds/postgresql/pricing/)):

| Instance | vCPU | RAM | Per month (730 hours) |
|---|---|---|---|
| `db.t4g.micro` | 2 | 1 GB | about $12 |
| `db.t4g.medium` | 2 | 4 GB | about $47 |
| `db.r6g.large` | 2 | 16 GB | about $164 |

The `t` family is burstable: it earns CPU credits while idle and slows down when it runs out under sustained load. It
suits development and small production apps. The `r` family gives steady performance and more memory. Move to it when
CPU stays above about 60% for long periods.

Storage is billed separately; see [Storage](#storage).

### Aurora

Aurora is a clustered PostgreSQL- or MySQL-compatible database. It keeps six copies of your data across three
availability zones. Engine types: `aurora-postgresql` and `aurora-mysql` (classes `AuroraEnginePostgresql` and
`AuroraEngineMysql`).


Example (TypeScript):

```typescript
import { defineConfig, RelationalDatabase, AuroraEnginePostgresql } from 'stacktape';

export default defineConfig(() => {
  const mainDatabase = new RelationalDatabase({
    credentials: {
      masterUserPassword: "$Secret('database', 'password')"
    },
    engine: new AuroraEnginePostgresql({
      version: '16',
      instances: [{ instanceSize: 'db.r6g.large' }, { instanceSize: 'db.r6g.large' }]
    })
  });

  return {
    resources: { mainDatabase }
  };
});
```


The first entry in `instances` is the writer, the others are readers. With two or more instances, AWS promotes a reader
if the writer fails, usually within a minute. Readers share read traffic through the reader endpoint; they don't add
write capacity. Each instance bills at its own hourly rate, plus storage at $0.10 per GB-month and $0.20 per million
I/O requests ([Aurora pricing](https://aws.amazon.com/rds/aurora/pricing/)).

### Aurora Serverless v2

Aurora Serverless v2 scales compute in Aurora capacity units (ACUs, about 2 GB of memory each) between `minCapacity`
and `maxCapacity`. Engine types: `aurora-postgresql-serverless-v2` and `aurora-mysql-serverless-v2` (classes
`AuroraServerlessV2EnginePostgresql` and `AuroraServerlessV2EngineMysql`). An ACU-hour costs $0.12 in us-east-1.


Example (TypeScript):

```typescript
import { defineConfig, RelationalDatabase, AuroraServerlessV2EnginePostgresql } from 'stacktape';

export default defineConfig(() => {
  const mainDatabase = new RelationalDatabase({
    credentials: {
      masterUserPassword: "$Secret('database', 'password')"
    },
    engine: new AuroraServerlessV2EnginePostgresql({
      version: '16',
      minCapacity: 0.5,
      maxCapacity: 16
    }),
    accessibility: {
      accessibilityMode: 'vpc'
    }
  });

  return {
    resources: { mainDatabase }
  };
});
```


- **`minCapacity`**: when you leave it out, Stacktape sets 0. The database then pauses after about five minutes without
  connections and you pay only for storage while it's paused. The first connection after a pause waits about 15 seconds
  while it resumes. Set `0.5` or more to keep it running, which costs at least $44 a month at 0.5 ACU.
- **`maxCapacity`** (default 10) caps scaling and cost. 16 ACUs give about 32 GB of memory.
- **`serverlessReadersCount`** (default 0) adds readers. Each reader scales between the same bounds.

Pausing at 0 ACUs needs a recent engine version (for example PostgreSQL 16.3 or later). A major version such as `'16'`
always gets a current minor version.

AWS retired Aurora Serverless v1 on 31 March 2025, and Stacktape v4 rejects its engine types
(`aurora-postgresql-serverless`, `aurora-mysql-serverless`). To move a deployed v1 database, see
[Upgrading from v3](/getting-started/upgrading-from-v3/#aurora-serverless-v1).

## Database name, port and version

| Property | Default | Notes |
|---|---|---|
| `dbName` | `defdb` | The database created with the instance. For Oracle it's the SID (8 characters at most). SQL Server doesn't accept it. |
| `port` | 5432 PostgreSQL, 3306 MySQL and MariaDB, 1521 Oracle, 1433 SQL Server | Not configurable on Aurora Serverless v2. |
| `version` | Required | A release line (`'16'` for PostgreSQL, `'8.4'` for MySQL) or an exact version (`'16.9'`). |

With a release line, AWS runs a current minor version and applies new minor versions in the maintenance window.
Switching a deployed database from `'16.6'` to `'16'` doesn't change the running version. Oracle and SQL Server need an
exact version. Set `disableAutoMinorVersionUpgrade: true` on the engine to stop automatic minor upgrades.

## Accessibility

The access mode decides who can open a network connection to the database. The username and password are checked in
every mode.

| Mode | Who can connect |
|---|---|
| `internet` (default) | Anyone on the internet who has the credentials |
| `vpc` | Resources in the stack's VPC, plus `whitelistedIps` |
| `scoping-workloads-in-vpc` | Only workloads that list the database in `connectTo`, plus `whitelistedIps` |
| `whitelisted-ips-only` | Only the addresses in `whitelistedIps` |

Use `scoping-workloads-in-vpc` for production. It admits the workloads that declare the database in
[`connectTo`](/configuration/connecting-resources), plus any `whitelistedIps`. The example below also admits one office
address; leave `whitelistedIps` out if only your workloads should connect.


Example (TypeScript):

```typescript
import { defineConfig, RelationalDatabase, RdsEnginePostgres } from 'stacktape';

export default defineConfig(() => {
  const mainDatabase = new RelationalDatabase({
    credentials: {
      masterUserPassword: "$Secret('database', 'password')"
    },
    engine: new RdsEnginePostgres({
      version: '16',
      primaryInstance: {
        instanceSize: 'db.t4g.micro'
      }
    }),
    accessibility: {
      accessibilityMode: 'scoping-workloads-in-vpc',
      whitelistedIps: ['203.0.113.50/32']
    }
  });

  return {
    resources: { mainDatabase }
  };
});
```


`whitelistedIps` adds addresses, for example your office or a CI runner, and has no effect in `internet` mode. In the
VPC modes the database keeps a public IP address that only whitelisted addresses can reach. `forceDisablePublicIp: true`
removes it; set it, without `whitelistedIps`, for a database nothing outside the VPC can reach. On Aurora you can set it
only when you create the database.

To connect from your machine to a database that isn't open to the internet, use a
[bastion host](/resources/security/bastion-host) and [`stacktape bastion tunnel`](/cli/bastion-tunnel), or pass
`--bastion-resource` to `stacktape query sql`.

## Credentials

`masterUserPassword` is required; `masterUserName` defaults to `db_master_user`. Keep the password in a
[secret](/configuration/secrets) with `$Secret()`, as in the examples.


> **Warning:** Changing `masterUserName` after the first deploy replaces the database and deletes all its data.


Avoid these characters in the username and password: `[]{}(),;?*=!@`. Many drivers and ORMs fail to parse connection
strings that contain them.

## High availability and read replicas

- **Standard RDS**: `multiAz: true` on the primary instance keeps a standby copy in a second availability zone. AWS fails
  over to it automatically and patches with less downtime. The standby serves no traffic and doubles the instance cost.
  `readReplicas` adds instances that serve reads, each with its own endpoint and asynchronous replication.
- **Aurora**: add instances to `instances`. Every extra instance is both a failover target and a reader.
- **Aurora Serverless v2**: set `serverlessReadersCount`.


Example (TypeScript):

```typescript
import { defineConfig, RelationalDatabase, RdsEnginePostgres } from 'stacktape';

export default defineConfig(() => {
  const mainDatabase = new RelationalDatabase({
    credentials: {
      masterUserPassword: "$Secret('database', 'password')"
    },
    engine: new RdsEnginePostgres({
      version: '16',
      primaryInstance: {
        instanceSize: 'db.r6g.large',
        multiAz: true
      },
      readReplicas: [{ instanceSize: 'db.r6g.large' }]
    })
  });

  return {
    resources: { mainDatabase }
  };
});
```


## Connecting from workloads

List the database in a workload's [`connectTo`](/configuration/connecting-resources). Stacktape opens the network path
(in the VPC modes) and injects one environment variable per [referenceable parameter](#referenceable-parameters). For a
database named `mainDatabase` these include `STP_MAIN_DATABASE_CONNECTION_STRING`, `STP_MAIN_DATABASE_HOST`,
`STP_MAIN_DATABASE_PORT`, `STP_MAIN_DATABASE_DB_NAME` and `STP_MAIN_DATABASE_JDBC_CONNECTION_STRING`. Aurora adds the
`READER_*` variants, and RDS read replicas add `READ_REPLICA_*` lists.


Example (TypeScript):

```typescript
import {
  defineConfig,
  RelationalDatabase,
  RdsEnginePostgres,
  LambdaFunction,
  JsBundleLambdaPackaging
} from 'stacktape';

export default defineConfig(() => {
  const mainDatabase = new RelationalDatabase({
    credentials: {
      masterUserPassword: "$Secret('database', 'password')"
    },
    engine: new RdsEnginePostgres({
      version: '16',
      primaryInstance: {
        instanceSize: 'db.t4g.micro'
      }
    })
  });
  const api = new LambdaFunction({
    packaging: new JsBundleLambdaPackaging({
      entryfilePath: './src/api.ts'
    }),
    memory: 1024,
    timeout: 30,
    connectTo: [mainDatabase]
  });

  return {
    resources: { mainDatabase, api }
  };
});
```


The connection string includes the username, password, host, port and database name. Prisma, Drizzle, TypeORM and most
drivers accept it as is:

```typescript
import { Client } from 'pg';

const client = new Client({
  connectionString: process.env.STP_MAIN_DATABASE_CONNECTION_STRING
});
await client.connect();
```

A Lambda function opens a connection per concurrent execution. If a busy function exhausts the database's connection
limit, reuse the client across invocations (create it outside the handler) or move to a larger instance.

Run migrations with a [release command](/deployment-and-lifecycle/release-commands): it runs your deployed image
inside the VPC during each deploy, before services and functions get the new code. A `local-script` with
`connectTo: ['mainDatabase']`, called from a [hook](/configuration/hooks-and-scripts), works too, but it runs on the
machine that deploys; a database that isn't open to the internet then needs a `local-script-with-bastion-tunneling`
script and a [bastion host](/resources/security/bastion-host).

## Storage

Standard RDS starts with 20 GB of gp3 storage (`storage.initialSize`) and grows automatically up to 200 GB
(`storage.maxSize`) when free space runs low. You pay for the allocated size, not the maximum. Aurora manages storage
itself and grows up to 128 TB.

Raise `initialSize` for write-heavy workloads, because each automatic expansion can briefly slow I/O. Set `maxSize` to cap
storage cost if a bug starts writing data in a loop.


Example (TypeScript):

```typescript
import { defineConfig, RelationalDatabase, RdsEnginePostgres } from 'stacktape';

export default defineConfig(() => {
  const mainDatabase = new RelationalDatabase({
    credentials: {
      masterUserPassword: "$Secret('database', 'password')"
    },
    engine: new RdsEnginePostgres({
      version: '16',
      primaryInstance: {
        instanceSize: 'db.t4g.medium'
      },
      storage: {
        initialSize: 50,
        maxSize: 500
      }
    })
  });

  return {
    resources: { mainDatabase }
  };
});
```


## Backups and maintenance

AWS backs up the database every day. `automatedBackupRetentionDays` sets how long backups are kept (default 1 day):

- Standard RDS accepts 0 to 35. 0 turns automated backups off.
- Aurora accepts 1 to 35. Aurora backups can't be turned off.

Raise it to 7 or more for production. With one day of backups, you can't go back past yesterday when someone finds bad
data on Monday. A restore creates a new database from a backup; you do it in the AWS console and then point your config
or workloads at the restored database.

`preferredMaintenanceWindow` sets when AWS applies patches, in UTC (for example `Sun:02:00-Sun:04:00`). By default it's
Sunday 02:00–04:00 in the region's local standard time, and the daily backup runs an hour before it. The database can be
unavailable for a short time during maintenance; `multiAz` and Aurora readers shorten it.

Deleting the stack, or removing the database from the config, deletes the database without a final snapshot.
`deletionProtection: true` prevents that for production data. While it's on, `stacktape delete` lists the protected
databases and stops before deleting anything, and a deploy can't remove or replace the database. To remove it, deploy
with `deletionProtection: false` first.

## Logging

Database logs go to CloudWatch and are kept for 90 days (`logging.retentionDays`). The log types depend on the engine:

| Engine | Log types |
|---|---|
| PostgreSQL | `postgresql` |
| MySQL, MariaDB | `audit`, `error`, `general`, `slowquery` |
| Oracle | `alert`, `audit`, `listener`, `trace` |
| SQL Server | `agent`, `error` |

`logging.engineSpecificOptions` tunes what gets logged:

- **PostgreSQL**: `log_min_duration_statement` logs queries slower than this many milliseconds (default 10000).
  `log_statement` picks the statements to log: `none`, `ddl` (default: `CREATE`, `ALTER`, `DROP`), `mod` (also `INSERT`,
  `UPDATE`, `DELETE`) or `all`. `log_connections`, `log_disconnections` and `log_lock_waits` help with connection and
  locking problems.
- **MySQL**: `server_audit_events` (default `['QUERY_DDL']`) picks what the audit log records. `QUERY` and `QUERY_DML`
  log every data operation and produce a lot of output. `long_query_time` (default 10 seconds) sets the slow query
  threshold.


Example (TypeScript):

```typescript
import { defineConfig, RelationalDatabase, RdsEnginePostgres } from 'stacktape';

export default defineConfig(() => {
  const mainDatabase = new RelationalDatabase({
    credentials: {
      masterUserPassword: "$Secret('database', 'password')"
    },
    engine: new RdsEnginePostgres({
      version: '16',
      primaryInstance: {
        instanceSize: 'db.t4g.micro'
      }
    }),
    logging: {
      retentionDays: 30,
      engineSpecificOptions: {
        log_min_duration_statement: 1000,
        log_statement: 'mod'
      }
    }
  });

  return {
    resources: { mainDatabase }
  };
});
```


Read the logs with [`stacktape logs`](/cli/logs). `logging.disabled: true` turns CloudWatch logging off, and
[log forwarding](/observability/log-forwarding) sends the logs to another service.

## Alarms

Database alarms notify your [alert channels](/observability/alert-channels) when a metric crosses a threshold. See
[Alarms](/observability/alarms) for evaluation settings and channels.

| Trigger type | Threshold unit | Watches |
|---|---|---|
| `database-cpu-utilization` | Percent | CPU usage |
| `database-free-memory` | MB | Available memory |
| `database-free-storage` | MB | Free disk space |
| `database-connection-count` | Count | Open connections |
| `database-read-latency` | Seconds | Read I/O latency |
| `database-write-latency` | Seconds | Write I/O latency |

Set at least a `database-free-storage` alarm on every production database. A database that runs out of storage stops
accepting writes.


Example (TypeScript):

```typescript
import { defineConfig, RelationalDatabase, RdsEnginePostgres } from 'stacktape';

export default defineConfig(() => {
  const mainDatabase = new RelationalDatabase({
    credentials: {
      masterUserPassword: "$Secret('database', 'password')"
    },
    engine: new RdsEnginePostgres({
      version: '16',
      primaryInstance: {
        instanceSize: 'db.t4g.micro'
      }
    }),
    alarms: [
      {
        trigger: {
          type: 'database-cpu-utilization',
          properties: { thresholdPercent: 80 }
        }
      },
      {
        trigger: {
          type: 'database-free-storage',
          properties: { thresholdMB: 1000 }
        }
      }
    ]
  });

  return {
    resources: { mainDatabase }
  };
});
```


`disabledGlobalAlarms` excludes named legacy Console alarm rules while you
[export them into the config](/observability/alarms#migrating-legacy-console-alarm-rules).

## Dev mode

In [`stacktape dev`](/local-development/dev-mode-overview), PostgreSQL, MySQL, MariaDB and Aurora databases run
locally in Docker with their own generated password. Oracle and SQL Server can't run locally. Set `dev.remote: true` to
use the deployed database instead. See [Local databases](/local-development/local-databases).

## Configuration reference


### Definition: `RelationalDatabaseProps`

The complete property-level reference is included in `llms-api-reference.txt` and indexed under route `/config-reference/relational-database` with definition name `RelationalDatabaseProps`.

| Property | Required | Type | Default |
| --- | --- | --- | --- |
| `credentials` | yes | `RelationalDatabaseCredentials` | - |
| `engine` | yes | `AuroraEngine \| AuroraServerlessV2Engine \| RdsEngine` | - |
| `accessibility` | no | `DatabaseAccessibility` | - |
| `alarms` | no | `Array<RelationalDatabaseAlarm>` | - |
| `automatedBackupRetentionDays` | no | `number` | `1` |
| `deletionProtection` | no | `boolean` | `false` |
| `dev` | no | `DevModeConfig` | - |
| `disabledGlobalAlarms` | no | `Array<string>` | - |
| `logging` | no | `RelationalDatabaseLogging` | - |
| `preferredMaintenanceWindow` | no | `string` | - |


## Referenceable parameters


## Referenceable Parameters: `relational-database`
These values can be referenced with `$ResourceParam("<<resource-name>>", "<<parameter-name>>")`.

| Parameter | Description | Usage |
| --- | --- | --- |
| `connectionString` | Fully-formed connection string that can be used to access the primary instance. For aurora databases, this is connectionString to cluster endpoint, which can be used for both reads and writes. Includes **host**, **port**, **username**, **password** and **dbName**. | `$ResourceParam("<<resource-name>>", "connectionString")` |
| `jdbcConnectionString` | Fully-formed connection string in JDBC form that can be used to access the primary instance. Includes **host**, **port**, **username**, **password** and **dbName**. | `$ResourceParam("<<resource-name>>", "jdbcConnectionString")` |
| `host` | Hostname (address) of the primary instance that can be used for both reads and writes. For aurora databases, this is hostname of a cluster endpoint, which can be used for both reads and writes. | `$ResourceParam("<<resource-name>>", "host")` |
| `port` | Port of the database. | `$ResourceParam("<<resource-name>>", "port")` |
| `dbName` | Name of the automatically created database (can be configured using the `dbName` property). | `$ResourceParam("<<resource-name>>", "dbName")` |
| `readerHost` | Hostname (address) used for reads only. (only available for `aurora-postgresql` and `aurora-mysql` engines). If you have multiple instances, it is advised to use readerHost for reads to offload the primary (read/write) host. ReaderHost automatically balances requests between available instances. Connections are auto-balanced among available reader hosts. | `$ResourceParam("<<resource-name>>", "readerHost")` |
| `readerConnectionString` | Same as **connectionString** but targets readerHosts (only available for `aurora-postgresql` and `aurora-mysql` engines). Connections are auto-balanced among available reader hosts. | `$ResourceParam("<<resource-name>>", "readerConnectionString")` |
| `readerJdbcConnectionString` | Same as **readerConnectionString** but in JDBC format (only available for `aurora-postgresql` and `aurora-mysql` engines). | `$ResourceParam("<<resource-name>>", "readerJdbcConnectionString")` |
| `readReplicaHosts` | Comma-separated list of read replica hostnames (only available if read replicas are configured). Read replicas can only be used for read operations. | `$ResourceParam("<<resource-name>>", "readReplicaHosts")` |
| `readReplicaConnectionStrings` | Comma-separated list of connection strings (URLs) used to connect to read replicas (only available when read replicas are configured). Read replicas can only be used for read operations. | `$ResourceParam("<<resource-name>>", "readReplicaConnectionStrings")` |
| `readReplicaJdbcConnectionStrings` | Same as **readReplicaConnectionStrings** but in JDBC format (only available when read replicas are configured). | `$ResourceParam("<<resource-name>>", "readReplicaJdbcConnectionStrings")` |


## Next steps

- [Release commands](/deployment-and-lifecycle/release-commands): run migrations during each deploy.
- [Local databases](/local-development/local-databases): run the database on your machine in dev mode.
- [Bastion host](/resources/security/bastion-host): reach a VPC-only database from your machine.
