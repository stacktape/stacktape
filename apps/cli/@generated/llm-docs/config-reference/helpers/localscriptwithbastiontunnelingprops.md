# LocalScriptWithBastionTunnelingProps API Reference

## TypeScript definition

```typescript
import type { EnvironmentVar } from 'stacktape';

type LocalScriptWithBastionTunnelingProps = {
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
  /** Execute Script */
  executeScript?: string;
  /** Execute Scripts */
  executeScripts?: Array<string>;
  /** Pipe Stdio */
  pipeStdio?: boolean;
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

The name of the bastion resource to use for tunneling to protected resources.

### Example 1 (yaml)

```yaml
scripts:
  migrateThroughTunnel:
    type: local-script-with-bastion-tunneling
    properties:
      bastionResource: jumpBox
      executeCommand: npx prisma migrate deploy
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
import { Bastion, RelationalDatabase, RdsEnginePostgres, LocalScriptWithBastionTunneling, $Secret, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const jumpBox = new Bastion({ instanceSize: 't3.micro' });
  const privateDb = new RelationalDatabase({
    credentials: { masterUserPassword: $Secret('db-password') },
    accessibility: { accessibilityMode: 'scoping-workloads-in-vpc' },
    engine: new RdsEnginePostgres({ version: '16.2', primaryInstance: { instanceSize: 'db.t4g.micro' } })
  });
  const migrateThroughTunnel = new LocalScriptWithBastionTunneling({
    bastionResource: 'jumpBox',
    executeCommand: 'npx prisma migrate deploy',
    connectTo: [privateDb]
  });

  return { scripts: { migrateThroughTunnel }, resources: { jumpBox, privateDb } };
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
- Default: `The directory where the Stacktape command was executed.`

Working Directory

The directory where the script or command will be executed.

### Example 1 (yaml)

```yaml
scripts:
  buildFrontend:
    type: local-script
    properties:
      executeCommand: npm run build
      cwd: ./frontend
resources:
  web:
    type: hosting-bucket
    properties:
      uploadDirectoryPath: ./frontend/dist
```

### Example 2 (typescript)

```typescript
import { HostingBucket, LocalScript, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const buildFrontend = new LocalScript({
    executeCommand: 'npm run build',
    cwd: './frontend'
  });
  const web = new HostingBucket({ uploadDirectoryPath: './frontend/dist' });

  return { scripts: { buildFrontend }, resources: { web } };
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

A single terminal command to execute in a separate shell process.

The command runs on the machine executing the Stacktape command. Be aware of potential differences between local and CI environments (e.g., OS, shell). You can only use one of `executeScript`, `executeScripts`, `executeCommand`, or `executeCommands`.

### Example 1 (yaml)

```yaml
scripts:
  build:
    type: local-script
    properties:
      executeCommand: npm run build
resources:
  web:
    type: hosting-bucket
    properties:
      uploadDirectoryPath: ./dist
```

### Example 2 (typescript)

```typescript
import { HostingBucket, LocalScript, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const build = new LocalScript({
    executeCommand: 'npm run build'
  });
  const web = new HostingBucket({ uploadDirectoryPath: './dist' });

  return { scripts: { build }, resources: { web } };
});
```

## Property: `executeCommands`

- Required: no
- Type: `Array<string>`

Execute Commands

A list of terminal commands to execute sequentially. Each command runs in a separate shell process.

The commands run on the machine executing the Stacktape command. Be aware of potential differences between environments. You can only use one of `executeScript`, `executeScripts`, `executeCommand`, or `executeCommands`.

### Example 1 (yaml)

```yaml
scripts:
  buildAll:
    type: local-script
    properties:
      executeCommands:
        - npm ci
        - npm run lint
        - npm run build
resources:
  web:
    type: hosting-bucket
    properties:
      uploadDirectoryPath: ./dist
```

### Example 2 (typescript)

```typescript
import { HostingBucket, LocalScript, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const buildAll = new LocalScript({
    executeCommands: ['npm ci', 'npm run lint', 'npm run build']
  });
  const web = new HostingBucket({ uploadDirectoryPath: './dist' });

  return { scripts: { buildAll }, resources: { web } };
});
```

## Property: `executeScript`

- Required: no
- Type: `string`

Execute Script

The path to a script file to execute. The script can be written in JavaScript, TypeScript, or Python and runs in a separate process.

The executable is determined by `defaults:configure` or the system default (`node` for JS/TS, `python` for Python). You can only use one of `executeScript`, `executeScripts`, `executeCommand`, or `executeCommands`.

### Example 1 (yaml)

```yaml
scripts:
  seed:
    type: local-script
    properties:
      executeScript: scripts/seed.ts
      connectTo:
        - db
resources:
  db:
    type: dynamo-db-table
    properties:
      primaryKey:
        partitionKey:
          name: id
          type: string
```

### Example 2 (typescript)

```typescript
import { DynamoDbTable, LocalScript, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const db = new DynamoDbTable({ primaryKey: { partitionKey: { name: 'id', type: 'string' } } });
  const seed = new LocalScript({
    executeScript: 'scripts/seed.ts',
    connectTo: [db]
  });

  return { scripts: { seed }, resources: { db } };
});
```

## Property: `executeScripts`

- Required: no
- Type: `Array<string>`

Execute Scripts

A list of script files to execute sequentially. Each script runs in a separate process.

The script can be written in JavaScript, TypeScript, or Python. The executable is determined by `defaults:configure` or the system default. You can only use one of `executeScript`, `executeScripts`, `executeCommand`, or `executeCommands`.

### Example 1 (yaml)

```yaml
scripts:
  setup:
    type: local-script
    properties:
      executeScripts:
        - scripts/migrate.ts
        - scripts/seed.ts
      connectTo:
        - db
resources:
  db:
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
  const db = new RelationalDatabase({
    credentials: { masterUserPassword: $Secret('db-password') },
    engine: new RdsEnginePostgres({ version: '16.2', primaryInstance: { instanceSize: 'db.t4g.micro' } })
  });
  const setup = new LocalScript({
    executeScripts: ['scripts/migrate.ts', 'scripts/seed.ts'],
    connectTo: [db]
  });

  return { scripts: { setup }, resources: { db } };
});
```

## Property: `pipeStdio`

- Required: no
- Type: `boolean`
- Default: `true`

Pipe Stdio

If `true`, pipes the standard input/output (stdio) of the hook process to the main process. This allows you to see logs from your hook and interact with prompts.

### Example 1 (yaml)

```yaml
scripts:
  silentTask:
    type: local-script
    properties:
      executeCommand: node ./scripts/background-task.js
      pipeStdio: false
resources:
  web:
    type: hosting-bucket
    properties:
      uploadDirectoryPath: ./dist
```

### Example 2 (typescript)

```typescript
import { HostingBucket, LocalScript, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const silentTask = new LocalScript({
    executeCommand: 'node ./scripts/background-task.js',
    pipeStdio: false
  });
  const web = new HostingBucket({ uploadDirectoryPath: './dist' });

  return { scripts: { silentTask }, resources: { web } };
});
```
