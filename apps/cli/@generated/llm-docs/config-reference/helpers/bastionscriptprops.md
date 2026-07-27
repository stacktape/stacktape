# BastionScriptProps API Reference

## TypeScript definition

```typescript
import type { EnvironmentVar } from 'stacktape';

type BastionScriptProps = {
  /** Assume Role of Resource */
  assumeRoleOfResource?: string;
  /** Bastion Resource Name */
  bastionResource?: string;
  /** Connect To */
  connectTo?: Array<string>;
  /** Working Directory */
  cwd?: string;
  /** Environment Variables */
  environment?: Array<EnvironmentVar>;
  /** Execute Command */
  executeCommand?: string;
  /** Execute Commands */
  executeCommands?: Array<string>;
};
```

## Property: `assumeRoleOfResource`

- Required: no
- Type: `string`

Assume Role of Resource

The name of a deployed resource whose IAM role the script should assume. This grants the script the same permissions as the specified resource.

The resource must be deployed before the script is executed. Stacktape injects temporary AWS credentials as environment variables, which are automatically used by most AWS SDKs and CLIs.

**Supported Resource Types:**

`function`
`batch-job`
`worker-service`
`web-service`
`private-service`
`multi-container-workload`
`nextjs-web`
`astro-web`
`nuxt-web`
`sveltekit-web`
`solidstart-web`
`tanstack-web`
`remix-web`

### Example 1 (yaml)

```yaml
scripts:
  invokeAsApi:
    type: local-script
    properties:
      executeScript: scripts/admin-task.ts
      assumeRoleOfResource: api
resources:
  api:
    type: web-service
    properties:
      packaging:
        type: stacktape-image-buildpack
        properties:
          entryfilePath: src/server.ts
      resources:
        cpu: 0.25
        memory: 512
      connectTo:
        - dataBucket
  dataBucket:
    type: bucket
    properties: {}
```

### Example 2 (typescript)

```typescript
import { WebService, Bucket, StacktapeImageBuildpackPackaging, LocalScript, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const dataBucket = new Bucket({});
  const api = new WebService({
    packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }),
    resources: { cpu: 0.25, memory: 512 },
    connectTo: [dataBucket]
  });
  const invokeAsApi = new LocalScript({
    executeScript: 'scripts/admin-task.ts',
    assumeRoleOfResource: 'api'
  });

  return { scripts: { invokeAsApi }, resources: { api, dataBucket } };
});
```

## Property: `bastionResource`

- Required: no
- Type: `string`

Bastion Resource Name

The name of the bastion resource on which the commands will be executed.

### Example 1 (yaml)

```yaml
scripts:
  runOnBastion:
    type: bastion-script
    properties:
      bastionResource: jumpBox
      executeCommand: psql -h $STP_PRIVATE_DB_HOST -c 'SELECT 1'
      connectTo:
        - privateDb
resources:
  jumpBox:
    type: bastion
    properties:
      instanceSize: t3.micro
  privateDb:
    type: relational-database
    properties:
      credentials:
        masterUserPassword: $Secret('db-password')
      accessibility:
        accessibilityMode: scoping-workloads-in-vpc
      engine:
        type: postgres
        properties:
          version: '16.2'
          primaryInstance:
            instanceSize: db.t4g.micro
```

### Example 2 (typescript)

```typescript
import { Bastion, RelationalDatabase, RdsEnginePostgres, BastionScript, $Secret, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const jumpBox = new Bastion({ instanceSize: 't3.micro' });
  const privateDb = new RelationalDatabase({
    credentials: { masterUserPassword: $Secret('db-password') },
    accessibility: { accessibilityMode: 'scoping-workloads-in-vpc' },
    engine: new RdsEnginePostgres({ version: '16.2', primaryInstance: { instanceSize: 'db.t4g.micro' } })
  });
  const runOnBastion = new BastionScript({
    bastionResource: 'jumpBox',
    executeCommand: "psql -h $STP_PRIVATE_DB_HOST -c 'SELECT 1'",
    connectTo: [privateDb]
  });

  return { scripts: { runOnBastion }, resources: { jumpBox, privateDb } };
});
```

## Property: `connectTo`

- Required: no
- Type: `Array<string>`

Connect To

A list of resources the script needs to interact with. Stacktape automatically injects environment variables with connection details for each specified resource.

Environment variable names are in the format `STP_[RESOURCE_NAME]_[VARIABLE_NAME]` (e.g., `STP_MY_DATABASE_CONNECTION_STRING`).

**Injected Variables by Resource Type:**

**`Bucket`**: `NAME`, `ARN`
**`DynamoDbTable`**: `NAME`, `ARN`, `STREAM_ARN`
**`MongoDbAtlasCluster`**: `CONNECTION_STRING`
**`RelationalDatabase`**: `CONNECTION_STRING`, `JDBC_CONNECTION_STRING`, `HOST`, `PORT`. For Aurora clusters, `READER_CONNECTION_STRING`, `READER_JDBC_CONNECTION_STRING`, and `READER_HOST` are also included.
**`RedisCluster`**: `HOST`, `READER_HOST`, `PORT`
**`EventBus`**: `ARN`
**`Function`**: `ARN`
**`BatchJob`**: `JOB_DEFINITION_ARN`, `STATE_MACHINE_ARN`
**`UserAuthPool`**: `ID`, `CLIENT_ID`, `ARN`
**`SnsTopic`**: `ARN`, `NAME`
**`SqsQueue`**: `ARN`, `NAME`, `URL`
**`UpstashKafkaTopic`**: `TOPIC_NAME`, `TOPIC_ID`, `USERNAME`, `PASSWORD`, `TCP_ENDPOINT`, `REST_URL`
**`UpstashRedis`**: `HOST`, `PORT`, `PASSWORD`, `REST_TOKEN`, `REST_URL`, `REDIS_URL`
**`PrivateService`**: `ADDRESS`
**`WebService`**: `URL`

### Example 1 (yaml)

```yaml
scripts:
  migrate:
    type: local-script
    properties:
      executeCommand: npx prisma migrate deploy
      connectTo:
        - mainDb
resources:
  mainDb:
    type: relational-database
    properties:
      credentials:
        masterUserPassword: $Secret('db-password')
      engine:
        type: postgres
        properties:
          version: '16.2'
          primaryInstance:
            instanceSize: db.t4g.micro
```

### Example 2 (typescript)

```typescript
import { RelationalDatabase, RdsEnginePostgres, LocalScript, $Secret, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const mainDb = new RelationalDatabase({
    credentials: { masterUserPassword: $Secret('db-password') },
    engine: new RdsEnginePostgres({ version: '16.2', primaryInstance: { instanceSize: 'db.t4g.micro' } })
  });
  const migrate = new LocalScript({
    executeCommand: 'npx prisma migrate deploy',
    connectTo: [mainDb]
  });

  return { scripts: { migrate }, resources: { mainDb } };
});
```

## Property: `cwd`

- Required: no
- Type: `string`
- Default: `/`

Working Directory

The directory on the bastion host where the command will be executed.

### Example 1 (yaml)

```yaml
scripts:
  runScript:
    type: bastion-script
    properties:
      bastionResource: jumpBox
      executeCommand: ./maintenance.sh
      cwd: /opt/scripts
resources:
  jumpBox:
    type: bastion
    properties:
      instanceSize: t3.micro
```

### Example 2 (typescript)

```typescript
import { Bastion, BastionScript, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const jumpBox = new Bastion({ instanceSize: 't3.micro' });
  const runScript = new BastionScript({
    bastionResource: 'jumpBox',
    executeCommand: './maintenance.sh',
    cwd: '/opt/scripts'
  });

  return { scripts: { runScript }, resources: { jumpBox } };
});
```

## Property: `environment`

- Required: no
- Type: `Array<EnvironmentVar>`

Environment Variables

A list of environment variables to pass to the script or command.

Values can be:

A static string, number, or boolean.
The result of a [custom directive](/configuration/directives/#custom-directives).
A reference to another resource's parameter using the [`$ResourceParam` directive](/configuration/referencing-parameters/).
A value from a [secret](/resources/secrets/) using the [`$Secret` directive](/configuration/directives/#secret).

### Example 1 (yaml)

```yaml
scripts:
  seed:
    type: local-script
    properties:
      executeScript: scripts/seed.ts
      environment:
        - name: NODE_ENV
          value: production
        - name: API_KEY
          value: $Secret('seed-api-key')
resources:
  table:
    type: dynamo-db-table
    properties:
      primaryKey:
        partitionKey:
          name: id
          type: string
```

### Example 2 (typescript)

```typescript
import { DynamoDbTable, LocalScript, $Secret, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const table = new DynamoDbTable({ primaryKey: { partitionKey: { name: 'id', type: 'string' } } });
  const seed = new LocalScript({
    executeScript: 'scripts/seed.ts',
    environment: {
      NODE_ENV: 'production',
      API_KEY: $Secret('seed-api-key')
    }
  });

  return { scripts: { seed }, resources: { table } };
});
```

## Property: `executeCommand`

- Required: no
- Type: `string`

Execute Command

A single terminal command to execute on the bastion host. Logs from the execution are streamed to your terminal.

You can use either `executeCommand` or `executeCommands`, but not both.

### Example 1 (yaml)

```yaml
scripts:
  pingDb:
    type: bastion-script
    properties:
      bastionResource: jumpBox
      executeCommand: pg_isready -h $STP_PRIVATE_DB_HOST
      connectTo:
        - privateDb
resources:
  jumpBox:
    type: bastion
    properties:
      instanceSize: t3.micro
  privateDb:
    type: relational-database
    properties:
      credentials:
        masterUserPassword: $Secret('db-password')
      accessibility:
        accessibilityMode: scoping-workloads-in-vpc
      engine:
        type: postgres
        properties:
          version: '16.2'
          primaryInstance:
            instanceSize: db.t4g.micro
```

### Example 2 (typescript)

```typescript
import { Bastion, RelationalDatabase, RdsEnginePostgres, BastionScript, $Secret, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const jumpBox = new Bastion({ instanceSize: 't3.micro' });
  const privateDb = new RelationalDatabase({
    credentials: { masterUserPassword: $Secret('db-password') },
    accessibility: { accessibilityMode: 'scoping-workloads-in-vpc' },
    engine: new RdsEnginePostgres({ version: '16.2', primaryInstance: { instanceSize: 'db.t4g.micro' } })
  });
  const pingDb = new BastionScript({
    bastionResource: 'jumpBox',
    executeCommand: 'pg_isready -h $STP_PRIVATE_DB_HOST',
    connectTo: [privateDb]
  });

  return { scripts: { pingDb }, resources: { jumpBox, privateDb } };
});
```

## Property: `executeCommands`

- Required: no
- Type: `Array<string>`

Execute Commands

A list of terminal commands to execute sequentially as a script on the bastion host. Logs from the execution are streamed to your terminal.

You can use either `executeCommand` or `executeCommands`, but not both.

### Example 1 (yaml)

```yaml
scripts:
  dbMaintenance:
    type: bastion-script
    properties:
      bastionResource: jumpBox
      executeCommands:
        - psql -h $STP_PRIVATE_DB_HOST -c 'VACUUM ANALYZE;'
        - psql -h $STP_PRIVATE_DB_HOST -c 'REINDEX DATABASE postgres;'
      connectTo:
        - privateDb
resources:
  jumpBox:
    type: bastion
    properties:
      instanceSize: t3.micro
  privateDb:
    type: relational-database
    properties:
      credentials:
        masterUserPassword: $Secret('db-password')
      accessibility:
        accessibilityMode: scoping-workloads-in-vpc
      engine:
        type: postgres
        properties:
          version: '16.2'
          primaryInstance:
            instanceSize: db.t4g.micro
```

### Example 2 (typescript)

```typescript
import { Bastion, RelationalDatabase, RdsEnginePostgres, BastionScript, $Secret, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const jumpBox = new Bastion({ instanceSize: 't3.micro' });
  const privateDb = new RelationalDatabase({
    credentials: { masterUserPassword: $Secret('db-password') },
    accessibility: { accessibilityMode: 'scoping-workloads-in-vpc' },
    engine: new RdsEnginePostgres({ version: '16.2', primaryInstance: { instanceSize: 'db.t4g.micro' } })
  });
  const dbMaintenance = new BastionScript({
    bastionResource: 'jumpBox',
    executeCommands: [
      "psql -h $STP_PRIVATE_DB_HOST -c 'VACUUM ANALYZE;'",
      "psql -h $STP_PRIVATE_DB_HOST -c 'REINDEX DATABASE postgres;'"
    ],
    connectTo: [privateDb]
  });

  return { scripts: { dbMaintenance }, resources: { jumpBox, privateDb } };
});
```
