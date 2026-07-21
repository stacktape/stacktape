# DeploymentScriptProps API Reference

Resource type: `deployment-script`

## TypeScript definition

```typescript
import type { CustomArtifactLambdaPackaging, EnvironmentVar, StpBuildpackLambdaPackaging, StpIamRoleStatement } from 'stacktape';

type DeploymentScriptProps = {
  /** How the script code is packaged. Use stacktape-lambda-buildpack for auto-bundling. */
  packaging: DeploymentScriptPackaging;
  /** When to run: after:deploy (fails → rollback) or before:delete (fails → deletion continues). */
  trigger: "after:deploy" | "before:delete";
  /** Give this resource access to other resources in your stack. */
  connectTo?: Array<string>;
  /** Environment variables injected at runtime. Use $ResourceParam() or $Secret() for dynamic values. */
  environment?: Array<EnvironmentVar>;
  /** Raw IAM policy statements for permissions not covered by connectTo. */
  iamRoleStatements?: Array<StpIamRoleStatement>;
  /** Connect to VPC resources (databases, Redis). Warning: function loses direct internet access. */
  joinDefaultVpc?: boolean;
  /** Memory in MB (128–10,240). CPU scales proportionally — 1,769 MB = 1 vCPU. */
  memory?: number;
  /** Structured data passed to the handler function as the event payload. Not for secrets — use environment. */
  parameters?: unknown;
  /** Lambda runtime. Auto-detected from file extension if not specified. */
  runtime?: "dotnet6" | "dotnet7" | "dotnet8" | "java11" | "java17" | "java8" | "java8.al2" | "nodejs18.x" | "nodejs20.x" | "nodejs22.x" | "nodejs24.x" | "provided.al2" | "provided.al2023" | "python3.10" | "python3.11" | "python3.12" | "python3.13" | "python3.8" | "python3.9" | "ruby3.3";
  /** Ephemeral /tmp storage in MB (512–10,240). */
  storage?: number;
  /** Max execution time in seconds. Max: 900 (15 minutes). */
  timeout?: number;
};

/** Union choices used by the properties above. */
type DeploymentScriptPackaging =
  | StpBuildpackLambdaPackaging
  | CustomArtifactLambdaPackaging;
```

## Property: `packaging`

- Required: yes
- Type: `stacktape-lambda-buildpack | custom-artifact`

How the script code is packaged. Use `stacktape-lambda-buildpack` for auto-bundling.

Choices:
- `stacktape-lambda-buildpack` (`StpBuildpackLambdaPackaging`) — A zero-config buildpack that packages your code for AWS Lambda.. Properties: `handlerFunction?: string`, `entryfilePath: string`, `includeFiles?: Array<string>`, `excludeFiles?: Array<string>`, `excludeDependencies?: Array<string>`, `languageSpecificConfig?: Es | Py | Java | Php | Dotnet | Go | Ruby`.
- `custom-artifact` (`CustomArtifactLambdaPackaging`) — Uses a pre-built artifact for Lambda deployment.. Properties: `packagePath: string`, `handler?: string`.

### Example 1 (yaml)

```yaml
resources:
  seedData:
    type: deployment-script
    properties:
      trigger: after:deploy
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: ./scripts/seed.ts
      timeout: 120
```

### Example 2 (typescript)

```typescript
import { defineConfig, DeploymentScript, StacktapeLambdaBuildpackPackaging } from 'stacktape';

export default defineConfig(() => {
  const seedData = new DeploymentScript({
    trigger: 'after:deploy',
    packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './scripts/seed.ts' }),
    timeout: 120
  });

  return { resources: { seedData } };
});
```

## Property: `trigger`

- Required: yes
- Type: `string: "after:deploy" | "before:delete"`

When to run: `after:deploy` (fails → rollback) or `before:delete` (fails → deletion continues).

### Example 1 (yaml)

```yaml
resources:
  cleanup:
    type: deployment-script
    properties:
      trigger: before:delete
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: ./scripts/cleanup.ts
      timeout: 300
```

### Example 2 (typescript)

```typescript
import { defineConfig, DeploymentScript, StacktapeLambdaBuildpackPackaging } from 'stacktape';

export default defineConfig(() => {
  const cleanup = new DeploymentScript({
    trigger: 'before:delete',
    packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './scripts/cleanup.ts' }),
    timeout: 300
  });

  return { resources: { cleanup } };
});
```

## Property: `connectTo`

- Required: no
- Type: `Array<string>`

Give this resource access to other resources in your stack.

List the names of resources this workload needs to communicate with. Stacktape automatically:

**Grants IAM permissions** (e.g., S3 read/write, SQS send/receive)
**Opens network access** (security group rules for databases, Redis)
**Injects environment variables** with connection details: `STP_[RESOURCE_NAME]_[PARAM]`

Example: `connectTo: ["myDatabase", "myBucket"]` gives this workload full access to both
resources and injects `STP_MY_DATABASE_CONNECTION_STRING`, `STP_MY_BUCKET_NAME`, etc.

### Example 1 (yaml)

```yaml
resources:
  api:
    type: web-service
    properties:
      packaging:
        type: stacktape-image-buildpack
        properties:
          entryfilePath: src/server.ts
      resources:
        cpu: 0.5
        memory: 1024
      connectTo:
        - mainDb
        - uploads
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
  uploads:
    type: bucket
    properties: {}
```

### Example 2 (typescript)

```typescript
import { WebService, RelationalDatabase, Bucket, RdsEnginePostgres, StacktapeImageBuildpackPackaging, $Secret, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const mainDb = new RelationalDatabase({
    credentials: { masterUserPassword: $Secret('db-password') },
    engine: new RdsEnginePostgres({ version: '16.2', primaryInstance: { instanceSize: 'db.t4g.micro' } })
  });
  const uploads = new Bucket({});
  const api = new WebService({
    packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }),
    resources: { cpu: 0.5, memory: 1024 },
    connectTo: [mainDb, uploads]
  });

  return { resources: { api, mainDb, uploads } };
});
```

## Property: `environment`

- Required: no
- Type: `Array<EnvironmentVar>`

Environment variables injected at runtime. Use `$ResourceParam()` or `$Secret()` for dynamic values.

### Example 1 (yaml)

```yaml
resources:
  seedData:
    type: deployment-script
    properties:
      trigger: after:deploy
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: ./scripts/seed.ts
      environment:
        - name: STAGE
          value: $Stage()
        - name: ADMIN_API_KEY
          value: $Secret('admin-api-key')
      timeout: 120
```

### Example 2 (typescript)

```typescript
import { defineConfig, DeploymentScript, StacktapeLambdaBuildpackPackaging, $Stage, $Secret } from 'stacktape';

export default defineConfig(() => {
  const seedData = new DeploymentScript({
    trigger: 'after:deploy',
    packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './scripts/seed.ts' }),
    environment: [
      { name: 'STAGE', value: $Stage() },
      { name: 'ADMIN_API_KEY', value: $Secret('admin-api-key') }
    ],
    timeout: 120
  });

  return { resources: { seedData } };
});
```

## Property: `iamRoleStatements`

- Required: no
- Type: `Array<StpIamRoleStatement>`

Raw IAM policy statements for permissions not covered by `connectTo`.

Added as a separate policy alongside auto-generated permissions. Use this for
accessing AWS services directly (e.g., Rekognition, Textract, Bedrock).

### Example 1 (yaml)

```yaml
resources:
  processor:
    type: batch-job
    properties:
      container:
        packaging:
          type: stacktape-image-buildpack
          properties:
            entryfilePath: src/job.ts
      resources:
        cpu: 1
        memory: 2048
      iamRoleStatements:
        - Effect: Allow
          Action:
            - textract:AnalyzeDocument
          Resource:
            - '*'
```

### Example 2 (typescript)

```typescript
import { BatchJob, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const processor = new BatchJob({
    container: { packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/job.ts' }) },
    resources: { cpu: 1, memory: 2048 },
    iamRoleStatements: [
      {
        Effect: 'Allow',
        Action: ['textract:AnalyzeDocument'],
        Resource: ['*']
      }
    ]
  });

  return { resources: { processor } };
});
```

## Property: `joinDefaultVpc`

- Required: no
- Type: `boolean`

Connect to VPC resources (databases, Redis). **Warning:** function loses direct internet access.

### Example 1 (yaml)

```yaml
resources:
  runMigrations:
    type: deployment-script
    properties:
      trigger: after:deploy
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: ./scripts/migrate.ts
      connectTo:
        - mainDatabase
      joinDefaultVpc: true
      timeout: 120
  mainDatabase:
    type: relational-database
    properties:
      credentials:
        masterUserPassword: $Secret('db-password')
      engine:
        type: postgres
        properties:
          primaryInstance:
            instanceSize: db.t4g.micro
          version: '16.2'
```

### Example 2 (typescript)

```typescript
import { defineConfig, DeploymentScript, StacktapeLambdaBuildpackPackaging, RelationalDatabase, RdsEnginePostgres, $Secret } from 'stacktape';

export default defineConfig(() => {
  const mainDatabase = new RelationalDatabase({
    credentials: { masterUserPassword: $Secret('db-password') },
    engine: new RdsEnginePostgres({
      primaryInstance: { instanceSize: 'db.t4g.micro' },
      version: '16.2'
    })
  });

  const runMigrations = new DeploymentScript({
    trigger: 'after:deploy',
    packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './scripts/migrate.ts' }),
    connectTo: ['mainDatabase'],
    joinDefaultVpc: true,
    timeout: 120
  });

  return { resources: { mainDatabase, runMigrations } };
});
```

## Property: `memory`

- Required: no
- Type: `number`

Memory in MB (128–10,240). CPU scales proportionally — 1,769 MB = 1 vCPU.

### Example 1 (yaml)

```yaml
resources:
  runMigrations:
    type: deployment-script
    properties:
      trigger: after:deploy
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: ./scripts/migrate.ts
      memory: 1024
      timeout: 120
```

### Example 2 (typescript)

```typescript
import { defineConfig, DeploymentScript, StacktapeLambdaBuildpackPackaging } from 'stacktape';

export default defineConfig(() => {
  const runMigrations = new DeploymentScript({
    trigger: 'after:deploy',
    packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './scripts/migrate.ts' }),
    memory: 1024,
    timeout: 120
  });

  return { resources: { runMigrations } };
});
```

## Property: `parameters`

- Required: no
- Type: `unknown`

Structured data passed to the handler function as the event payload. Not for secrets — use `environment`.

### Example 1 (yaml)

```yaml
resources:
  seedData:
    type: deployment-script
    properties:
      trigger: after:deploy
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: ./scripts/seed.ts
      parameters:
        seedCount: 100
        truncateFirst: true
        adminEmail: admin@example.com
      timeout: 120
```

### Example 2 (typescript)

```typescript
import { defineConfig, DeploymentScript, StacktapeLambdaBuildpackPackaging } from 'stacktape';

export default defineConfig(() => {
  const seedData = new DeploymentScript({
    trigger: 'after:deploy',
    packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './scripts/seed.ts' }),
    parameters: {
      seedCount: 100,
      truncateFirst: true,
      adminEmail: 'admin@example.com'
    },
    timeout: 120
  });

  return { resources: { seedData } };
});
```

## Property: `runtime`

- Required: no
- Type: `string: "dotnet6" | "dotnet7" | "dotnet8" | "java11" | "java17" | "java8" | "java8.al2" | "nodejs18.x" | "nodejs20.x" | "nodejs22.x" | "nodejs24.x" | "provided.al2" | "provided.al2023" | "python3.10" | "python3.11" | "python3.12" | "python3.13" | "python3.8" | "python3.9" | "ruby3.3"`

Lambda runtime. Auto-detected from file extension if not specified.

### Example 1 (yaml)

```yaml
resources:
  runMigrations:
    type: deployment-script
    properties:
      trigger: after:deploy
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: ./scripts/migrate.ts
      runtime: nodejs22.x
      timeout: 120
```

### Example 2 (typescript)

```typescript
import { defineConfig, DeploymentScript, StacktapeLambdaBuildpackPackaging } from 'stacktape';

export default defineConfig(() => {
  const runMigrations = new DeploymentScript({
    trigger: 'after:deploy',
    packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './scripts/migrate.ts' }),
    runtime: 'nodejs22.x',
    timeout: 120
  });

  return { resources: { runMigrations } };
});
```

## Property: `storage`

- Required: no
- Type: `number`
- Default: `512`

Ephemeral `/tmp` storage in MB (512–10,240).

### Example 1 (yaml)

```yaml
resources:
  exportData:
    type: deployment-script
    properties:
      trigger: before:delete
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: ./scripts/export.ts
      storage: 2048
      timeout: 600
```

### Example 2 (typescript)

```typescript
import { defineConfig, DeploymentScript, StacktapeLambdaBuildpackPackaging } from 'stacktape';

export default defineConfig(() => {
  const exportData = new DeploymentScript({
    trigger: 'before:delete',
    packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './scripts/export.ts' }),
    storage: 2048,
    timeout: 600
  });

  return { resources: { exportData } };
});
```

## Property: `timeout`

- Required: no
- Type: `number`
- Default: `10`

Max execution time in seconds. Max: 900 (15 minutes).

### Example 1 (yaml)

```yaml
resources:
  longSeed:
    type: deployment-script
    properties:
      trigger: after:deploy
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: ./scripts/seed.ts
      timeout: 900
      memory: 1024
```

### Example 2 (typescript)

```typescript
import { defineConfig, DeploymentScript, StacktapeLambdaBuildpackPackaging } from 'stacktape';

export default defineConfig(() => {
  const longSeed = new DeploymentScript({
    trigger: 'after:deploy',
    packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './scripts/seed.ts' }),
    timeout: 900,
    memory: 1024
  });

  return { resources: { longSeed } };
});
```
