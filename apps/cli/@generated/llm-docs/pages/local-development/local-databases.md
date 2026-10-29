# Local Databases

Stacktape [dev mode](/local-development/dev-mode-overview) runs supported databases locally in Docker, avoiding the corresponding AWS database service. Dev-stack resources and the [dev network](/local-development/debugging-lambda-functions#the-dev-network) can still incur AWS charges. Data persists between sessions and workloads receive connection settings automatically. Use `dev.remote: true` to connect to the deployed database instead.

## When to use local databases

Local databases are the default for day-to-day development and isolate each developer's data. Local clients connect on your machine. Lambda and Batch clients in AWS reach them through the dev network and incur a cloud-to-machine round trip. Use local databases for application logic, migrations and prototypes; test cloud-specific behavior against deployed resources.

## When NOT to use local databases

Switch to [remote (deployed) databases](#using-remote-databases) when your work depends on behavior that local emulation cannot replicate — Aurora multi-AZ failover, DynamoDB Streams, OpenSearch security plugins, or engine-specific query plan differences. Also prefer remote databases when you need to test against a realistic data volume or share state across a team. Set `dev.remote: true` on the resource to connect to the deployed AWS resource instead.

## Supported databases

Dev mode can run the following database resource types locally. Each runs as a Docker container, with data persisted to a host directory mounted into the container.

| Resource type | Local emulation |
|---|---|
| [Relational database](/resources/databases/relational-database) (PostgreSQL, MySQL, MariaDB) | Docker container |
| RDS Aurora (PostgreSQL, MySQL — including Serverless v1/v2) | Mapped to standard PostgreSQL or MySQL container |
| RDS Oracle, RDS SQL Server | Not supported — set `dev.remote: true` |
| [Redis](/resources/databases/redis) | Docker container |
| [DynamoDB table](/resources/databases/dynamodb) | `amazon/dynamodb-local` container |
| [OpenSearch domain](/resources/databases/opensearch) | Docker container |
| [MongoDB Atlas](/resources/databases/mongodb-atlas) | Not supported — third-party managed service |
| [Upstash Redis](/resources/databases/upstash-redis) | Not supported — third-party managed service |

For [relational databases](/resources/databases/relational-database), local containers use the literal credentials from your config. Locally, `credentials.masterUserName` defaults to `postgres` for PostgreSQL and `root` for MySQL/MariaDB. Local databases never use the deployed database's secret: when `credentials.masterUserPassword` is not set or reads a value with a directive such as `$Secret('db.password')`, dev mode generates a random password for each local database and stores it in `.stacktape/dev-data/<stage>/<resourceName>/password`, readable only by your user. Every worktree or copy of the project on your machine gives new local data the same password for a stage, so moving the stage between worktrees does not have to update the dev stack. A Redis `defaultUserPassword` read from a directive gets a generated password the same way, and Redis without a password runs without authentication. The container, deployed dev functions and local workloads all receive the same password through the injected connection information. Properties like `instanceSize` only apply to the deployed AWS resource and are ignored locally.

Aurora engine types — Aurora PostgreSQL, Aurora MySQL, Aurora Serverless v1, and Aurora Serverless v2 — are mapped to standard PostgreSQL or MySQL containers locally. Aurora-specific features (multi-AZ replication, serverless ACU scaling, reader endpoints) are not available in the local emulation. For most application-level SQL access, the local container provides the same kind of SQL endpoint and connection-string shape. Test Aurora-specific behavior against a deployed stage.


> **Info:** Dev mode needs Docker to start local database containers. If Docker is not running, dev mode cannot proceed with local databases.


## How it works

When you run [`stacktape dev`](/cli/dev), Stacktape identifies database resources in your config and starts Docker containers for each one.

1. **Container naming** — each container is named after the project, stage, resource and a short hash of the project directory, so multiple stages, projects and Git worktrees of one project can run in parallel without sharing or stopping each other's containers.
2. **Port allocation** — dev mode finds an available host port for each container, avoiding conflicts when several sessions run in parallel. The port is published on `127.0.0.1` only, so other machines on your network cannot reach the database. The selected port is reflected in the injected connection information.
3. **Data persistence** — dev mode mounts a local data directory into the container, so data survives dev mode restarts.
4. **Readiness checks** — Stacktape polls the container until it responds, then marks the resource ready for your workloads.
5. **Connection information** — referenceable parameters (host, port, connectionString, etc.) are resolved locally so they can be used via `$ResourceParam()`. Workloads that list the database in their `connectTo` receive the documented environment variables following the `STP_[RESOURCE_NAME]_[PARAM]` pattern described in [Connecting resources](/configuration/connecting-resources).

## Relational databases

### PostgreSQL

In dev mode, Stacktape runs a local PostgreSQL container using the configured engine version as the Docker image tag. The container uses the configured credentials and the engine `dbName` when set.


Example (TypeScript):

```typescript
import { defineConfig, RelationalDatabase, RdsEnginePostgres } from 'stacktape';
export default defineConfig(() => {
  const mainDb = new RelationalDatabase({
    credentials: {
      masterUserPassword: "$Secret('db.password')"
    },
    engine: new RdsEnginePostgres({
      version: '16.6',
      primaryInstance: {
        instanceSize: 'db.t4g.micro'
      }
    })
  });

  return {
    resources: { mainDb }
  };
});
```


In dev mode, this starts a PostgreSQL container using image tag `16.6`. The `instanceSize` only applies to the deployed AWS resource — it is ignored locally. Referenceable parameters available for the database include `host`, `port`, `dbName`, `connectionString`, and `jdbcConnectionString`, accessible via `$ResourceParam()`. When the database is listed in a workload's `connectTo`, the documented environment variables are injected following the pattern described in [Connecting resources](/configuration/connecting-resources).

### MySQL and MariaDB

In dev mode, Stacktape runs a local MySQL container for the `mysql` engine and a MariaDB container for the `mariadb` engine, using the configured engine version as the Docker image tag.


Example (TypeScript):

```typescript
import { defineConfig, RelationalDatabase, RdsEngineMysql } from 'stacktape';
export default defineConfig(() => {
  const appDb = new RelationalDatabase({
    credentials: {
      masterUserPassword: "$Secret('db.password')"
    },
    engine: new RdsEngineMysql({
      version: '8.0.36',
      primaryInstance: {
        instanceSize: 'db.t4g.micro'
      }
    })
  });

  return {
    resources: { appDb }
  };
});
```


Referenceable parameters available for MySQL and MariaDB include `host`, `port`, `dbName`, `connectionString`, and `jdbcConnectionString`.

### Aurora engines

All Aurora engine types — Aurora PostgreSQL, Aurora MySQL, Aurora Serverless v1, Aurora Serverless v2 — are mapped to standard PostgreSQL or MySQL containers locally. The mapping is:

| Aurora engine type | Local container |
|---|---|
| `aurora-postgresql`, `aurora-postgresql-serverless`, `aurora-postgresql-serverless-v2` | PostgreSQL |
| `aurora-mysql`, `aurora-mysql-serverless`, `aurora-mysql-serverless-v2` | MySQL |

This is a pragmatic tradeoff: the SQL interface, schema behavior, and connection string format match the deployed database, which is sufficient for application development. Aurora-specific behavior — ACU scaling, multi-AZ replication, reader endpoints, pause-after-inactivity — is only available on the deployed AWS resource. Test these features against a deployed stage using `dev.remote: true`.

### Oracle and SQL Server

RDS Oracle (`oracle-ee`, `oracle-se2`) and SQL Server (`sqlserver-ee`, `sqlserver-se`, `sqlserver-ex`, `sqlserver-web`) engines do not have local emulation. If your config includes an Oracle or SQL Server database, use `dev.remote: true` to connect to the deployed AWS resource during development.

## Redis

In dev mode, Stacktape runs a local Redis container using the configured `engineVersion` as the Docker image tag. Redis runs as a single node locally — cluster-mode features such as hash slots and multi-node failover are not available.


Example (TypeScript):

```typescript
import { defineConfig, Redis } from 'stacktape';
export default defineConfig(() => {
  const cache = new Redis({
    defaultUserPassword: "$Secret('redis.password')",
    engine: { type: 'valkey-serverless' }
  });

  return {
    resources: { cache }
  };
});
```


Use the Redis connection information exposed by dev mode and by the resource's [referenceable parameters](/configuration/referenceable-parameters).

## DynamoDB

Stacktape uses the `amazon/dynamodb-local` image with the `-sharedDb` flag, meaning all tables share a single underlying database file. Tables are automatically created from your config if a `primaryKey` is defined — you do not need to create them manually.

Container readiness is checked by making an HTTP `ListTables` request, polling every 300 ms with a 30-second timeout.


Example (TypeScript):

```typescript
import { defineConfig, DynamoDbTable } from 'stacktape';
export default defineConfig(() => {
  const tasks = new DynamoDbTable({
    primaryKey: {
      partitionKey: { name: 'pk', type: 'string' },
      sortKey: { name: 'sk', type: 'string' }
    }
  });

  return {
    resources: { tasks }
  };
});
```


Referenceable parameters available for the local table include `endpoint` (e.g. `http://localhost:<port>`), `name` (the table name), and `arn` (a synthetic local ARN in the format `arn:aws:dynamodb:local:000000000000:table/<name>`). Your application code should use the `endpoint` parameter to configure the AWS SDK DynamoDB client for local access.


> **Warning:** The `amazon/dynamodb-local` image does not include DynamoDB Streams, Global Tables, TTL, or on-demand backups. Use `dev.remote: true` if your application depends on these features.


## OpenSearch

In dev mode, Stacktape runs a local OpenSearch container as a single-node cluster. Cluster-level features (sharding across nodes, dedicated master nodes) are not available locally.

Referenceable parameters available for the local domain include `domainEndpoint` and `arn`.

## Using remote databases

By default, supported databases run locally. To connect to the real deployed AWS resource instead, set `dev.remote: true` on the resource in your config, or use the `--remote-resources` CLI flag at runtime without editing config.

To switch a single resource to remote at runtime:

```bash
stacktape dev --remote-resources mainDb
```

To switch multiple resources, separate names with commas:

```bash
stacktape dev --remote-resources mainDb,cache
```

Alternatively, set `dev.remote: true` on the resource in your config for a persistent setting:


Example (TypeScript):

```typescript
import { defineConfig, RelationalDatabase, RdsEnginePostgres } from 'stacktape';
export default defineConfig(() => {
  const mainDb = new RelationalDatabase({
    credentials: {
      masterUserPassword: "$Secret('db.password')"
    },
    engine: new RdsEnginePostgres({
      version: '16.6',
      primaryInstance: {
        instanceSize: 'db.t4g.micro'
      }
    }),
    dev: {
      remote: true
    }
  });

  return {
    resources: { mainDb }
  };
});
```


### When to use remote databases

- **Testing against real data** — when you need to reproduce a production issue with actual records.
- **Aurora-specific behavior** — to test failover, reader endpoints, or serverless ACU scaling.
- **DynamoDB advanced features** — Streams, Global Tables, TTL, and backups are only available on the deployed resource.
- **Shared development database** — when multiple developers need to see the same state.

Local emulation avoids AWS database service charges and isolates test data. Deployed clients still use the dev network, with its network latency and AWS costs.

## Resetting local data

Data persists across sessions in host directories mounted into the containers. Use `--fresh-db` to reset databases that startup prepares:

```bash
stacktape dev --fresh-db
```

`--fresh-db` deletes data, schema and local password/identity files when startup prepares a database. This includes selected databases and databases prepared for deployed-workload relay connections, which can include unselected resources. Databases never prepared are untouched; this is not a stage-wide wipe. The stage password can be reused, so it does not promise a new password.

Relational databases, Redis and OpenSearch store data under `.stacktape/dev-data/<stage>/<resourceName>/data/`. Stop dev mode before manually removing one of these data directories.

All DynamoDB Local tables share `.stacktape/dev-data/<stage>/dynamodb-local/data/`. Preparing any local DynamoDB table with `--fresh-db` removes every persisted table in that storage, even tables not selected this time. For a table-specific item reset that preserves schema, use the [local reset endpoint](/using-with-ai/agent-mode-in-dev#reset-and-seed-local-databases) or MCP `reset_db` with the table's `resource` name and `confirm: true`.


> **Tip:** Add `.stacktape/` to your `.gitignore` to avoid committing local database data to version control.


## Databases without local emulation

Not all Stacktape database resources support local emulation:

| Resource | Local support | Alternative |
|---|---|---|
| RDS Oracle / SQL Server | No | Set `dev.remote: true` to use the deployed RDS instance |
| [MongoDB Atlas](/resources/databases/mongodb-atlas) | No | Stacktape dev mode does not provide local emulation for MongoDB Atlas. Use a deployed cluster during development. |
| [Upstash Redis](/resources/databases/upstash-redis) | No | Stacktape dev mode does not provide local emulation for Upstash Redis. Use a deployed Upstash instance during development. |

Oracle and SQL Server engines are not mapped to a local container type. MongoDB Atlas and Upstash Redis are third-party managed services without local emulation in dev mode.

## FAQ

### Does local database data persist when I restart dev mode?

Yes. Local data survives restarts. `--fresh-db` resets databases prepared during startup, including relay dependencies, and removes their local credential/identity files. DynamoDB Local tables share storage, so resetting it removes every persisted table there. See [reset scope](#resetting-local-data).

### Can I run multiple stages locally at the same time?

Yes. Each stage gets its own container name and its own non-conflicting port assignment, so two developers or two stages on the same machine do not collide. You can run `stacktape dev --stage dev-alice` and `stacktape dev --stage dev-bob` in parallel. Two Git worktrees of the same project can also run the same stage in parallel: each worktree has its own data directory, containers and ports. When the stage's deployed Lambda functions use local databases, only one session can receive their connections, so the second session refuses to start unless you pass [`--take-over`](/cli/dev#--take-over).

### Why does dev mode warn that my database keeps the password `localdevpassword`?

Earlier Stacktape versions gave every local database without a configured password the fixed password `localdevpassword`, and a database with a `$Secret` password got the directive text itself as its password. A database stores its password in its data, so a data directory created then keeps working with that password, and dev mode warns about it. To switch to a generated password, start dev mode once with `--fresh-db`. This deletes the database's local data.

### How do I connect to the local database with a GUI tool?

Use the host `localhost` and the port from the injected connection string or referenceable parameters. For PostgreSQL, the local username defaults to `postgres`; for MySQL/MariaDB it defaults to `root`. If your config sets no literal password, read the generated one from `.stacktape/dev-data/<stage>/<resourceName>/password`. For Redis, use the injected connection string. DynamoDB Local and OpenSearch use HTTP endpoints.

### Does local DynamoDB support Streams and Global Tables?

No. The `amazon/dynamodb-local` image used by dev mode does not include Streams, Global Tables, Time to Live (TTL), or on-demand backups. If your application depends on these features, set `dev.remote: true` on the [DynamoDB table](/resources/databases/dynamodb) resource to connect to the deployed AWS resource.

### How does Stacktape handle Aurora Serverless locally?

Aurora Serverless v1 and v2 engine types are mapped to standard PostgreSQL or MySQL containers locally. Serverless scaling (ACU-based), pause-after-inactivity, and automatic failover are AWS-only features. For most application-level SQL access, the local container provides the same kind of SQL endpoint and connection-string shape. Test Aurora-specific behavior against a deployed stage.

### Can I use the local database for running migrations?

Yes. Workloads that list the database in `connectTo` receive the connection string as an environment variable, so migration tools that read the connection string from the environment work without changes. Run migrations from your application startup code, a local migration command (e.g. `npx prisma migrate dev`), or manually via a database client connected to `localhost:<port>`. Schema changes persist across dev sessions because the data directory is mounted from the host.

### Where can I find the actual port a local database is using?

Dev mode finds an available host port for each container, so the actual port may differ from the database's default. The assigned port is reflected in the referenceable parameters and in the connection information provided to workloads via `connectTo`, so your application code does not need to handle port differences.
