# Deployment Scripts and Hooks

Stacktape provides two complementary mechanisms for automating work around deployments. **Hooks** run named scripts before or after CLI commands on your machine or CI runner. **Deployment scripts** execute as Lambda functions inside AWS during the CloudFormation lifecycle. Together they cover pre-deploy builds, post-deploy migrations, and pre-delete cleanup.

## When to use hooks vs deployment scripts

Hooks and deployment scripts serve different execution contexts. Choose based on where the work needs to happen and what failure behavior you need.

| | Hooks + scripts | Deployment scripts |
|---|---|---|
| **Runs on** | Your machine or CI runner | AWS Lambda |
| **Triggered by** | CLI commands (deploy, delete, dev) | CloudFormation lifecycle (`after:deploy`, `before:delete`) |
| **`after:deploy` failure** | — | CloudFormation rolls back the deployment |
| **`before:delete` failure** | — | Deletion continues |
| **Max timeout** | — | 900 seconds (Lambda maximum) |
| **VPC access** | Via bastion tunneling | Via `joinDefaultVpc` |
| **Local file access** | Yes | No (packaged code only) |

**Use hooks** when you need access to your local filesystem (running builds, linting, local CLI tools like Prisma or Drizzle), or when you want to use tooling installed on your machine or CI runner.

**Use deployment scripts** when the work must happen inside AWS (direct VPC access without a bastion), when failure should trigger a full CloudFormation rollback to keep schema and code in sync, or when the script must run as part of the CloudFormation lifecycle regardless of what initiated the deployment.

## Hooks

Stacktape hooks run named scripts automatically before or after the deploy, delete, and dev commands. Each hook entry references a script defined in the top-level `scripts` section of your configuration. See [hooks and scripts configuration](/configuration/hooks-and-scripts) for the full list of hook points, entry properties, and CI/local skip flags.

### Basic hook example

This configuration builds the frontend before every deploy and runs database migrations after:


Example (TypeScript):

```typescript
import {
  defineConfig,
  LambdaFunction,
  RelationalDatabase,
  RdsEnginePostgres,
  StacktapeLambdaBuildpackPackaging,
  $Secret,
  LocalScript
} from 'stacktape';
export default defineConfig(() => {
  const database = new RelationalDatabase({
    engine: new RdsEnginePostgres({
      version: '16',
      primaryInstance: { instanceSize: 'db.t4g.micro' }
    }),
    credentials: {
      masterUserPassword: $Secret('db-password')
    }
  });

  const api = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/handler.ts'
    }),
    connectTo: [database]
  });

  const build = new LocalScript({
    executeCommand: 'npm run build'
  });

  const migrate = new LocalScript({
    executeCommand: 'npx prisma migrate deploy',
    connectTo: [database]
  });

  return {
    hooks: {
      beforeDeploy: [{ scriptName: 'build' }],
      afterDeploy: [{ scriptName: 'migrate' }]
    },
    scripts: { build, migrate },
    resources: { database, api }
  };
});
```


The `beforeDeploy` hook runs the build script before Stacktape begins packaging. The `afterDeploy` hook runs migrations after the deployment completes. The `migrate` script uses `connectTo` to receive the database connection details as environment variables.

### Skipping hooks in CI or locally

Hook entries support `skipOnCI` and `skipOnLocal` flags — useful when a hook only makes sense in one environment (for example, opening a browser locally or sending a notification from CI). See [hooks and scripts configuration](/configuration/hooks-and-scripts) for the full hook entry reference.


Example (TypeScript):

```typescript
import {
  defineConfig,
  LambdaFunction,
  StacktapeLambdaBuildpackPackaging,
  LocalScript
} from 'stacktape';
export default defineConfig(() => {
  const api = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/handler.ts'
    })
  });

  const openBrowser = new LocalScript({
    executeCommand: 'open https://my-app.example.com'
  });

  const notifySlack = new LocalScript({
    executeScript: './scripts/notify-slack.ts'
  });

  return {
    hooks: {
      afterDeploy: [
        { scriptName: 'openBrowser', skipOnCI: true },
        { scriptName: 'notifySlack', skipOnLocal: true }
      ]
    },
    scripts: { openBrowser, notifySlack },
    resources: { api }
  };
});
```


## Scripts

Scripts are named, reusable commands or code files defined in the top-level `scripts` section. They can be run manually with [`stacktape script:run`](/cli/script-run) or attached to [hooks](#hooks). Stacktape supports three script types — local scripts, local scripts with bastion tunneling, and bastion scripts — each suited to a different execution context. Scripts can be shell commands or JavaScript, TypeScript, or Python files.

### Local scripts

A local script runs on the machine executing the Stacktape command — your laptop or a CI runner. Use local scripts for builds, linting, running migration CLIs, seed scripts, or any task that benefits from your local tooling. Each local script must define one of `executeCommand`, `executeScript`, `executeCommands`, or `executeScripts`. See [hooks and scripts configuration](/configuration/hooks-and-scripts) for the full property reference.

The `connectTo` property auto-injects environment variables with connection details for each specified resource, in the format `STP_[RESOURCE_NAME]_[PARAM]` (for example, `STP_MY_DATABASE_CONNECTION_STRING` when connecting to a resource named `myDatabase`).


Example (TypeScript):

```typescript
import {
  defineConfig,
  LambdaFunction,
  RelationalDatabase,
  RdsEnginePostgres,
  StacktapeLambdaBuildpackPackaging,
  $Secret,
  LocalScript
} from 'stacktape';
export default defineConfig(() => {
  const database = new RelationalDatabase({
    engine: new RdsEnginePostgres({
      version: '16',
      primaryInstance: { instanceSize: 'db.t4g.micro' }
    }),
    credentials: {
      masterUserPassword: $Secret('db-password')
    }
  });

  const api = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/handler.ts'
    }),
    connectTo: [database]
  });

  const migrate = new LocalScript({
    executeCommand: 'npx prisma migrate deploy',
    connectTo: [database]
  });

  const seed = new LocalScript({
    executeScript: './scripts/seed.ts',
    connectTo: [database],
    environment: { SEED_COUNT: '100' }
  });

  const setup = new LocalScript({
    executeCommands: ['npm run build', 'npm run test', 'npm run lint']
  });

  return {
    scripts: { migrate, seed, setup },
    resources: { database, api }
  };
});
```


### Bastion scripts

A bastion script runs remotely on a [bastion host](/resources/security/bastion-host) inside your VPC. Use bastion scripts when you need direct network access to VPC-only resources from a consistent Linux execution environment. The `bastionResource` property specifies which bastion host to use.


Example (TypeScript):

```typescript
import {
  defineConfig,
  RelationalDatabase,
  RdsEnginePostgres,
  Bastion,
  LambdaFunction,
  StacktapeLambdaBuildpackPackaging,
  $Secret,
  BastionScript
} from 'stacktape';
export default defineConfig(() => {
  const database = new RelationalDatabase({
    engine: new RdsEnginePostgres({
      version: '16',
      primaryInstance: { instanceSize: 'db.t4g.micro' }
    }),
    credentials: {
      masterUserPassword: $Secret('db-password')
    }
  });

  const bastion = new Bastion({});

  const api = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/handler.ts'
    }),
    connectTo: [database]
  });

  const checkDb = new BastionScript({
    executeCommand: 'psql -c "SELECT count(*) FROM users;"',
    connectTo: [database],
    bastionResource: 'bastion'
  });

  return {
    scripts: { checkDb },
    resources: { database, bastion, api }
  };
});
```


### Local scripts with bastion tunneling

A local script with bastion tunneling runs on your machine but tunnels connections to VPC-only resources (private databases, Redis clusters) through a [bastion host](/resources/security/bastion-host). This gives you local tooling (ORMs, migration CLIs, database GUIs) with secure access to resources that are not publicly reachable.


Example (TypeScript):

```typescript
import {
  defineConfig,
  RelationalDatabase,
  RdsEnginePostgres,
  Bastion,
  LambdaFunction,
  StacktapeLambdaBuildpackPackaging,
  $Secret,
  LocalScriptWithBastionTunneling
} from 'stacktape';
export default defineConfig(() => {
  const database = new RelationalDatabase({
    engine: new RdsEnginePostgres({
      version: '16',
      primaryInstance: { instanceSize: 'db.t4g.micro' }
    }),
    credentials: {
      masterUserPassword: $Secret('db-password')
    }
  });

  const bastion = new Bastion({});

  const api = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/handler.ts'
    }),
    connectTo: [database]
  });

  const migrate = new LocalScriptWithBastionTunneling({
    executeCommand: 'npx prisma migrate deploy',
    connectTo: [database],
    bastionResource: 'bastion'
  });

  return {
    scripts: { migrate },
    resources: { database, bastion, api }
  };
});
```


> **Tip:** Use `LocalScriptWithBastionTunneling` for database migrations in projects where the database is not publicly accessible. You get the convenience of running Prisma, Drizzle, or any local ORM tool while connecting securely to the private database through the bastion tunnel.


### Shared script properties

All three script types (`LocalScript`, `BastionScript`, `LocalScriptWithBastionTunneling`) inherit from a shared base that provides the following properties:

- **`connectTo`** — List resource names to auto-inject connection environment variables (`STP_[RESOURCE_NAME]_[PARAM]`).
- **`environment`** — Additional environment variables. Supports [`$ResourceParam()`](/configuration/directives) and [`$Secret()`](/configuration/directives) for dynamic values.
- **`assumeRoleOfResource`** — Assume the IAM role of a deployed resource so the script gets the same AWS permissions. Stacktape injects temporary AWS credentials that AWS SDKs and CLIs pick up automatically. The resource must be deployed before the script runs. See [hooks and scripts configuration](/configuration/hooks-and-scripts) for the list of supported resource types.

See [hooks and scripts configuration](/configuration/hooks-and-scripts) for the complete property reference for each script type.

### Running scripts manually

Run any named script with the [`stacktape script:run`](/cli/script-run) command:

```bash
stacktape script:run --scriptName migrate
```

## Deployment scripts

A Stacktape [deployment script](/resources/advanced/deployment-scripts) is a resource that executes as a Lambda function during the CloudFormation deployment lifecycle. Unlike hooks and local scripts, deployment scripts run inside AWS and participate in CloudFormation's rollback semantics — an `after:deploy` script failure rolls back all infrastructure changes from that deployment.

### Triggers

Deployment scripts support two trigger points:

- **`after:deploy`** — Runs after resources are created or updated. If the script fails, CloudFormation rolls back the entire deployment. Use this for database migrations or data transformations where a failure means the new code cannot function correctly.
- **`before:delete`** — Runs before stack resources are deleted. If the script fails, deletion continues anyway. Use this for cleanup tasks like exporting data or deregistering from external services.

### Basic example

This deployment script runs a database migration after every deploy. The `environment` property passes the connection string explicitly using [`$ResourceParam()`](/configuration/directives), and `joinDefaultVpc` connects the Lambda function to the default VPC for network access to VPC resources.


Example (TypeScript):

```typescript
import {
  defineConfig,
  RelationalDatabase,
  RdsEnginePostgres,
  DeploymentScript,
  StacktapeLambdaBuildpackPackaging,
  LambdaFunction,
  $Secret,
  $ResourceParam
} from 'stacktape';
export default defineConfig(() => {
  const database = new RelationalDatabase({
    engine: new RdsEnginePostgres({
      version: '16',
      primaryInstance: { instanceSize: 'db.t4g.micro' }
    }),
    credentials: {
      masterUserPassword: $Secret('db-password')
    }
  });

  const migrate = new DeploymentScript({
    trigger: 'after:deploy',
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './scripts/migrate.ts'
    }),
    environment: [{ name: 'DATABASE_URL', value: $ResourceParam('database', 'connectionString') }],
    joinDefaultVpc: true,
    timeout: 120,
    memory: 512
  });

  const api = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/handler.ts'
    }),
    connectTo: [database]
  });

  return {
    resources: { database, migrate, api }
  };
});
```


The `timeout` is set to 120 seconds because migrations can take longer than the 10-second default. The `memory` is set to 512 MB — CPU scales proportionally with memory (1,769 MB equals 1 full vCPU). The `joinDefaultVpc` flag connects the Lambda function to the default VPC, enabling network access to VPC resources such as databases and Redis clusters.

```typescript
// scripts/migrate.ts
import { Client } from 'pg';

export const handler = async () => {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  await client.connect();

  await client.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await client.end();
  return { success: true };
};
```


> **Warning:** Enabling `joinDefaultVpc` connects the Lambda function to the default VPC but removes direct internet access. If your script needs to call external APIs, configure a NAT gateway in your VPC.


### Passing parameters

Use `parameters` to pass structured data to your deployment script handler. Values support [directives](/configuration/directives) like `$ResourceParam()`. Parameters are resolved at deploy time and delivered as the Lambda event payload.


> **Info:** The `parameters` property is for non-sensitive structured data only. For secrets and credentials, use the `environment` property with [`$Secret()`](/configuration/directives) instead.


Example (TypeScript):

```typescript
import {
  defineConfig,
  DeploymentScript,
  StacktapeLambdaBuildpackPackaging,
  Bucket,
  $ResourceParam
} from 'stacktape';
export default defineConfig(() => {
  const uploads = new Bucket({});

  const cleanup = new DeploymentScript({
    trigger: 'before:delete',
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './scripts/cleanup.ts'
    }),
    connectTo: ['uploads'],
    parameters: {
      bucketName: $ResourceParam('uploads', 'name')
    },
    timeout: 300
  });

  return {
    resources: { uploads, cleanup }
  };
});
```


The handler receives the `parameters` object as the Lambda event payload:

```typescript
// scripts/cleanup.ts
import { S3Client, DeleteObjectsCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

export const handler = async (event: { bucketName: string }) => {
  const s3 = new S3Client({});
  console.info(`Cleaning up bucket ${event.bucketName}`);

  const listed = await s3.send(new ListObjectsV2Command({ Bucket: event.bucketName }));
  if (listed.Contents?.length) {
    await s3.send(new DeleteObjectsCommand({
      Bucket: event.bucketName,
      Delete: { Objects: listed.Contents.map(obj => ({ Key: obj.Key })) }
    }));
  }

  return { deleted: listed.Contents?.length || 0 };
};
```

### Running deployment scripts manually

Use [`stacktape deployment-script:run`](/cli/deployment-script-run) to execute a deployment script outside of the normal deploy lifecycle. This is useful during development or when a migration needs to be re-applied. See the [CLI reference](/cli/deployment-script-run) for the available flags.

```bash
stacktape deployment-script:run --scriptName migrate
```

### Memory, timeout, and storage

Deployment scripts run as Lambda functions with the following configurable limits:

| Property | Range | Default | Notes |
|----------|-------|---------|-------|
| `memory` | 128–10,240 MB | — | CPU scales proportionally. 1,769 MB = 1 full vCPU. |
| `timeout` | 1–900 seconds | 10 | Maximum is 15 minutes. Increase for migrations. |
| `storage` | 512–10,240 MB | 512 | Ephemeral `/tmp` storage. |
| `runtime` | — | Auto-detected | Detected from entry file extension when not specified. |

### Packaging

Deployment scripts are packaged as Lambda functions and support two packaging modes. The **Stacktape buildpack** (`StacktapeLambdaBuildpackPackaging`) auto-bundles your source from an entry file — this is the recommended default for most scripts. The **custom-artifact** mode (`CustomArtifactLambdaPackaging`) accepts a pre-built zip or directory — use it when you have a custom build process or binary dependencies the buildpack cannot handle. See [Lambda packaging](/packaging/overview) for full configuration details on both modes.

## Common patterns

These patterns highlight common automation tasks — build steps and permission reuse.

### Database migrations — choosing the right approach

Database migrations are the most common automation use case. Stacktape supports two approaches:

- **Hook approach** — Attach a [local script with `connectTo`](#local-scripts) to the `afterDeploy` hook. Runs your installed migration CLI (Prisma, Drizzle, Knex) directly on your machine or CI runner. See the [basic hook example](#basic-hook-example) for a complete configuration.
- **Deployment script approach** — Use a [deployment script](#basic-example) with `trigger: 'after:deploy'`. Runs inside AWS as a Lambda function. If the migration fails, CloudFormation rolls back all infrastructure changes from that deployment.

The hook approach is simpler — you use your existing migration tool directly. The deployment script approach is safer for production — if the migration fails, all infrastructure changes from that deploy roll back automatically, keeping your database schema and application code in sync.

### Build before deploy

Run a build step locally before Stacktape packages and deploys your code:


Example (TypeScript):

```typescript
import {
  defineConfig,
  LambdaFunction,
  StacktapeLambdaBuildpackPackaging,
  LocalScript
} from 'stacktape';
export default defineConfig(() => {
  const api = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './dist/handler.js'
    })
  });

  const build = new LocalScript({
    executeCommands: ['npm run typecheck', 'npm run build']
  });

  return {
    hooks: {
      beforeDeploy: [{ scriptName: 'build' }]
    },
    scripts: { build },
    resources: { api }
  };
});
```


### Using assumeRoleOfResource

When a local script needs the same AWS permissions as a deployed workload (to interact with AWS services directly), use `assumeRoleOfResource` instead of configuring IAM permissions separately. The script assumes the IAM role of the specified resource, and Stacktape injects temporary AWS credentials that AWS SDKs pick up automatically. See [hooks and scripts configuration](/configuration/hooks-and-scripts) for the list of supported resource types.


Example (TypeScript):

```typescript
import {
  defineConfig,
  LambdaFunction,
  StacktapeLambdaBuildpackPackaging,
  DynamoDbTable,
  LocalScript
} from 'stacktape';
export default defineConfig(() => {
  const table = new DynamoDbTable({
    primaryKey: { partitionKey: { name: 'pk', type: 'string' } }
  });

  const api = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/handler.ts'
    }),
    connectTo: [table]
  });

  const seedData = new LocalScript({
    executeScript: './scripts/seed.ts',
    assumeRoleOfResource: 'api'
  });

  return {
    hooks: {
      afterDeploy: [{ scriptName: 'seedData' }]
    },
    scripts: { seedData },
    resources: { table, api }
  };
});
```


The script inherits the `api` function's IAM role, which has DynamoDB access through `connectTo`. The specified resource must be deployed before the script runs.

## Debugging

View logs from deployment scripts using [`stacktape logs`](/cli/logs):

```bash
stacktape logs --resourceName migrate
```

Local script and bastion script output is visible in your terminal when running the script. See [hooks and scripts configuration](/configuration/hooks-and-scripts) for any output-handling options exposed by each script type.

## FAQ

### When should I use a hook vs a deployment script for database migrations?

Use a **hook** with a local script when you want to run your existing migration tooling (Prisma, Drizzle, Knex) directly from your machine or CI runner. Use a **deployment script** when you need rollback safety — if the migration fails with `after:deploy`, CloudFormation rolls back all infrastructure changes, keeping your schema and code in sync. For most production stacks, the deployment script approach is safer.

### What happens when a deployment script fails?

It depends on the trigger, and the two behaviors are intentionally asymmetric. An `after:deploy` failure rolls back the entire deployment — all infrastructure changes from that deploy are reverted, so a failed migration never leaves your stack in a half-updated state. A `before:delete` failure is logged but does not block the stack from being destroyed, because those scripts handle best-effort cleanup (exporting data, deregistering external services) rather than hard prerequisites for deletion.

### How long can a deployment script run?

The maximum `timeout` is 900 seconds (15 minutes), which is the AWS Lambda execution limit. The default timeout is 10 seconds, so you should explicitly set a higher value for migrations or data processing. If your workload needs more than 15 minutes, run it as a hook with a local script instead — hooks run on your machine or CI runner and are not bound by the Lambda timeout.

### Can I pass secrets to deployment scripts?

Use the `environment` property with [`$Secret()`](/configuration/directives) for sensitive values like API keys and database credentials. Do not use `parameters` for secrets — `parameters` is designed for non-sensitive structured data passed as the Lambda event payload and may appear in CloudFormation events.

### Can I re-run a deployment script without redeploying?

Yes. Use [`stacktape deployment-script:run`](/cli/deployment-script-run) to invoke the deployment script Lambda outside of the normal deployment lifecycle. This is useful during development or when a migration needs to be re-applied.

### How do I access a private database from a deployment script?

Set `joinDefaultVpc: true` on the deployment script. This connects the Lambda function to the default VPC, enabling network access to VPC resources such as databases and Redis clusters. VPC-connected Lambda functions lose direct internet access — if your script also needs to call external APIs, configure a NAT gateway in your VPC.

## API reference

The full property reference for the `DeploymentScript` resource. For script and hook entry properties (`LocalScript`, `BastionScript`, `LocalScriptWithBastionTunneling`, hook entries), see [hooks and scripts configuration](/configuration/hooks-and-scripts).


### Definition: `DeploymentScriptProps`

The complete property-level reference is included in `llms-api-reference.txt` and indexed under route `/config-reference/deployment-script` with definition name `DeploymentScriptProps`.

| Property | Required | Type | Default |
| --- | --- | --- | --- |
| `packaging` | yes | `stacktape-lambda-buildpack \| custom-artifact` | - |
| `trigger` | yes | `string: "after:deploy" \| "before:delete"` | - |
| `connectTo` | no | `Array<string>` | - |
| `environment` | no | `Array<EnvironmentVar>` | - |
| `iamRoleStatements` | no | `Array<StpIamRoleStatement>` | - |
| `joinDefaultVpc` | no | `boolean` | - |
| `memory` | no | `number` | - |
| `parameters` | no | `unknown` | - |
| `runtime` | no | `string: "dotnet6" \| "dotnet7" \| "dotnet8" \| "java11" \| "java17" \| "java8" \| "java8.al2" \| "nodejs18.x" \| "nodejs20.x" \| "nodejs22.x" \| "nodejs24.x" \| "provided.al2" \| "provided.al2023" \| "python3.10" \| "python3.11" \| "python3.12" \| "python3.13" \| "python3.8" \| "python3.9" \| "ruby3.3"` | - |
| `storage` | no | `number` | `512` |
| `timeout` | no | `number` | `10` |
