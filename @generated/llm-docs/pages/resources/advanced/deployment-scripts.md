# Deployment Scripts

A Stacktape deployment script runs a [Lambda function](/resources/compute/lambda-function) automatically during stack deployment or deletion. Use it for database migrations, seed data, cache warming, or cleanup tasks that need to execute inside AWS. With `connectTo` and `joinDefaultVpc`, deployment scripts can reach VPC-protected resources like databases and Redis clusters. Deployment scripts use AWS Lambda pricing — you pay per invocation and for compute time measured in GB-seconds.

## When to use

Deployment scripts solve a specific problem: running code *inside AWS* at deploy or delete time. Common scenarios:

- **Database migrations** — run Prisma, Drizzle, or raw SQL migrations after a deploy, with network access to your database via `joinDefaultVpc`
- **Seed or reference data** — populate lookup tables, create initial admin users, or warm caches after first deploy
- **Schema changes** — create DynamoDB indexes, configure OpenSearch mappings, or set up Redis data structures
- **Pre-deletion cleanup** — export data, drain queues, or snapshot resources before the stack is torn down

For `after:deploy`, use a deployment script when the task must run in AWS and should fail the deployment if it fails. For `before:delete`, use it for best-effort cleanup before Stacktape deletes resources.

## When NOT to use

Not every deploy-time task needs a deployment script. Consider alternatives:

- **Local build steps** (compiling, linting, generating assets) — use [lifecycle hooks](/configuration/hooks-and-scripts) with a `local-script`. These run on your machine or CI runner and don't need AWS access.
- **Tasks longer than 15 minutes or needing more than 10,240 MB memory** — deployment scripts are Lambda functions with a 900-second maximum timeout and 10,240 MB memory cap. For long ETL jobs, data backfills, or heavy processing, use a [batch job](/resources/compute/batch-job).
- **Recurring tasks** — if the task should run on a schedule (nightly reports, periodic cleanup), use a [Lambda function](/resources/compute/lambda-function) with a [schedule trigger](/resources/triggers/schedule-triggers) instead.
- **Tasks needing local files or interactive prompts** — deployment scripts run in AWS Lambda, not on your machine. Use a lifecycle hook with a [local script](/configuration/hooks-and-scripts) for anything that reads local files or needs user input.


## Feature Comparison

| Feature | Deployment script | Lifecycle hook (local script) |
| --- | --- | --- |
| Runs in | AWS Lambda | Local machine / CI |
| VPC resource access | Direct (joinDefaultVpc) | Via bastion tunneling |
| Max duration | 15 minutes | Depends on the local command and runner |
| Needs Lambda packaging | yes | no |
| Can run manually | yes | yes |


Lifecycle hooks run a `local-script` on your machine or CI runner. For commands that need to reach VPC-protected resources, define a `local-script-with-bastion-tunneling` script — it still runs locally, but tunnels connections through a [bastion host](/resources/security/bastion-host) to supported protected resources, including relational databases and Redis clusters. Set the optional `bastionResource` property when you need to pick a specific bastion. See [hooks and scripts](/configuration/hooks-and-scripts) for details.

## Basic example

This deployment script runs database migrations after every deploy. It uses `connectTo` to reference a [relational database](/resources/databases/relational-database) named `mainDatabase`, joins the VPC for network access, and has a 2-minute timeout to accommodate large migrations.


Example (TypeScript):

```typescript
import {
  defineConfig,
  DeploymentScript,
  RelationalDatabase,
  RdsEnginePostgres,
  StacktapeLambdaBuildpackPackaging
} from 'stacktape';
export default defineConfig(() => {
  const mainDatabase = new RelationalDatabase({
    engine: new RdsEnginePostgres({ version: '16', primaryInstance: { instanceSize: 'db.t4g.micro' } }),
    credentials: { masterUserPassword: 'my-secret-password' }
  });

  const runMigrations = new DeploymentScript({
    trigger: 'after:deploy',
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './scripts/migrate.ts'
    }),
    connectTo: ['mainDatabase'],
    joinDefaultVpc: true,
    timeout: 120,
    memory: 512
  });

  return {
    resources: { mainDatabase, runMigrations }
  };
});
```


The `trigger: 'after:deploy'` means this script runs after resources in the stack are created or updated. If it fails, the deployment rolls back — so a broken migration won't leave you with updated code pointing at an un-migrated database.

The `memory` property controls how much memory (in MB) the Lambda function gets. Valid range is 128–10,240 MB. CPU scales proportionally — at 1,769 MB the function gets 1 full vCPU. 512 MB is a reasonable starting point for lightweight migration scripts; increase memory for memory-intensive transformations.

The `storage` property controls ephemeral `/tmp` storage available to the script Lambda. It accepts 512–10,240 MB and defaults to 512 MB. Leave it at the default unless your script downloads, generates, or transforms large temporary files (e.g., database dumps or build artifacts that need scratch disk space).

The handler receives any `parameters` you define as the event payload. Here's what the migration script might look like:

```typescript
import { execSync } from 'child_process';

export default async () => {
  // STP_MAIN_DATABASE_CONNECTION_STRING is auto-injected by connectTo
  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL: process.env.STP_MAIN_DATABASE_CONNECTION_STRING
    }
  });
};
```

## Trigger behavior

The `trigger` property controls when your script runs and what happens if it fails. This is the most important decision when configuring a deployment script.

### after:deploy

A script with `after:deploy` runs after resources in the stack are created or updated. Use it for migrations, seeding, and any setup that depends on your infrastructure being in place.

**If the script fails, Stacktape treats the deployment as failed and triggers a rollback.** This is the safety mechanism that makes deployment scripts reliable for migrations — a failed migration means your stack returns to the previous working state rather than leaving you with updated code pointing at an un-migrated database. Fix the script, then redeploy.

### before:delete

A script with `before:delete` runs before resources are torn down during [`stacktape delete`](/cli/delete). This gives you a window to export data, drain queues, or clean up external integrations.

**If the script fails, deletion continues anyway.** This prevents a broken cleanup script from leaving orphaned stacks you cannot delete. Design `before:delete` scripts defensively — log failures, but don't depend on them succeeding.


Example (TypeScript):

```typescript
import { defineConfig, DeploymentScript, StacktapeLambdaBuildpackPackaging } from 'stacktape';
export default defineConfig(() => {
  const cleanup = new DeploymentScript({
    trigger: 'before:delete',
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './scripts/cleanup.ts'
    }),
    timeout: 300
  });

  return {
    resources: { cleanup }
  };
});
```


## Packaging

Deployment scripts support two Lambda packaging modes. Most teams use the Stacktape buildpack for zero-config bundling. For pre-built artifacts (from a CI pipeline or custom build process), use custom artifact packaging.

| Mode | Class | When to use |
|------|-------|-------------|
| [Stacktape buildpack](/packaging/function/stacktape-buildpack) | `StacktapeLambdaBuildpackPackaging` | Default. Point to a source file — Stacktape bundles code and dependencies into a Lambda deployment package. |
| [Custom artifact](/packaging/function/custom-artifact) | `CustomArtifactLambdaPackaging` | You have a pre-built zip or directory from a custom build step. |

`StacktapeLambdaBuildpackPackaging` supports JavaScript, TypeScript, Python, Java, Go, Ruby, PHP, and .NET. Deployment scripts also expose an optional `runtime` property; when omitted, Stacktape auto-detects the Lambda runtime from the file extension.

### Custom artifact packaging

When your build pipeline produces a pre-built zip or directory, use `CustomArtifactLambdaPackaging`. The `packagePath` points to the artifact — if it's a directory, Stacktape zips it automatically. The `handler` property specifies the entry point in `filepath:functionName` format (e.g., `index.js:handler`).


Example (TypeScript):

```typescript
import { defineConfig, DeploymentScript, CustomArtifactLambdaPackaging } from 'stacktape';
export default defineConfig(() => {
  const runMigrations = new DeploymentScript({
    trigger: 'after:deploy',
    packaging: new CustomArtifactLambdaPackaging({
      packagePath: './dist/migration-bundle',
      handler: 'index.js:handler'
    }),
    timeout: 120
  });

  return {
    resources: { runMigrations }
  };
});
```


For language-specific tuning (Node.js version, Python version, module format), configure the buildpack's `languageSpecificConfig` property. See the [Stacktape buildpack packaging reference](/packaging/function/stacktape-buildpack) for supported options.

## Connecting to resources

Deployment scripts frequently need to interact with databases, buckets, or queues in your stack. Use `connectTo` to grant access and auto-inject connection details as environment variables.

When you list a resource in `connectTo`, Stacktape:
- **Grants IAM permissions** for the script's Lambda execution role (e.g., read/write to a bucket, send messages to a queue)
- **Configures security group rules** for databases and Redis — but the script must also set `joinDefaultVpc: true` to run inside the VPC and actually reach these resources
- **Injects environment variables** with connection details, named `STP_[RESOURCE_NAME]_[PARAM]`

For example, connecting to a resource named `mainDatabase` injects `STP_MAIN_DATABASE_CONNECTION_STRING`, `STP_MAIN_DATABASE_HOST`, and `STP_MAIN_DATABASE_PORT`. See [connecting resources](/configuration/connecting-resources) for the full list of injected variables per resource type.


> **Info:** For VPC-protected resources like [relational databases](/resources/databases/relational-database) and [Redis clusters](/resources/databases/redis), you must also set `joinDefaultVpc: true`. Without it, the Lambda function runs outside the VPC and cannot reach these resources. Note that joining the VPC means the function loses direct internet access — this is standard AWS Lambda VPC behavior. If your script also needs to call external APIs, either configure NAT Gateways in your VPC for outbound internet routing, or split the work into a VPC-joined script for database access and a separate non-VPC script for external API calls.


You can also add raw IAM policy statements with `iamRoleStatements` for AWS services not covered by `connectTo` — for example, calling Amazon Bedrock or writing to a cross-account S3 bucket.

## Environment and parameters

Deployment scripts accept two mechanisms for passing data:

**Environment variables** (`environment`) are injected at runtime. Use them for configuration values, API keys, and secrets via [`$Secret()`](/configuration/directives) or [`$ResourceParam()`](/configuration/directives).

**Parameters** (`parameters`) are passed as the event payload to your handler function. Use them for structured data that your script reads at invocation time. Do not put secrets in `parameters` — the DeploymentScript type marks parameters as non-secret payload data. Use `environment` with `$Secret()` instead.


Example (TypeScript):

```typescript
import { defineConfig, DeploymentScript, StacktapeLambdaBuildpackPackaging } from 'stacktape';
export default defineConfig(() => {
  const seedData = new DeploymentScript({
    trigger: 'after:deploy',
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './scripts/seed.ts'
    }),
    environment: [
      { name: 'SEED_COUNT', value: '100' },
      { name: 'ADMIN_EMAIL', value: '$Secret(admin-email)' }
    ],
    parameters: {
      tableName: 'seed-jobs',
      region: 'eu-west-1'
    },
    timeout: 60
  });

  return {
    resources: { seedData }
  };
});
```


The handler receives `parameters` as the event argument and reads `environment` variables from `process.env`:

```typescript
export default async (event: { tableName: string; region: string }) => {
  const seedCount = Number(process.env.SEED_COUNT);
  console.info(`Seeding ${seedCount} rows into ${event.tableName} in ${event.region}`);
  // ... seeding logic
};
```

## Manual execution

Use [`stacktape deployment-script:run`](/cli/deployment-script-run) to invoke a configured deployment script on demand without a full deploy. Deploy first when you need Stacktape to apply resource, packaging, permission, or environment changes. See the [CLI reference](/cli/deployment-script-run) for available flags and options.

This is useful for re-running migrations after a hotfix, re-seeding data, or testing a script before a full deploy.

## FAQ

### What happens if my after:deploy script fails?

Stacktape treats the deployment as failed and triggers a rollback. Your stack stays consistent — you won't end up with updated application code pointing at a database that failed to migrate. Fix the script, then redeploy.

### What happens if my before:delete script fails?

Stack deletion continues. This is by design — a broken cleanup script should never prevent you from deleting a stack. If your cleanup script fails, inspect the logs via [`stacktape logs`](/cli/logs) to diagnose the issue, but the stack resources will still be removed.

### Can I re-run a deployment script without a full deploy?

Yes. Use [`stacktape deployment-script:run`](/cli/deployment-script-run) to invoke a configured script on demand — useful for re-running migrations after a hotfix or re-seeding data. Run a full [`stacktape deploy`](/cli/deploy) first when you've changed the script's resources, packaging, permissions, or environment, since `deployment-script:run` invokes the already-deployed version.

### Can a deployment script access my database?

Yes. Add the database to `connectTo` and set `joinDefaultVpc: true`. For a relational database, `connectTo` injects `STP_[RESOURCE_NAME]_CONNECTION_STRING`, `STP_[RESOURCE_NAME]_HOST`, and `STP_[RESOURCE_NAME]_PORT`. Aurora clusters also get `STP_[RESOURCE_NAME]_READER_CONNECTION_STRING` and `STP_[RESOURCE_NAME]_READER_HOST`. This is the standard pattern for running database migrations in a deployment script.

### How long can a deployment script run, and what's the default timeout?

Deployment scripts are Lambda functions, so the maximum execution time is 900 seconds (15 minutes). The default `timeout` is only 10 seconds — a common footgun for migrations, which silently get cut off. Set `timeout` explicitly for anything non-trivial. If the task needs more than 15 minutes or more than 10,240 MB of memory, use a [batch job](/resources/compute/batch-job) instead, which runs as a container with longer runtimes and heavier compute.

### Should I use a deployment script or a lifecycle hook for migrations?

Use a deployment script when the migration needs direct VPC access to the database; this is usually the cleanest Stacktape-native path when the migration fits within Lambda limits. A deployment script runs inside AWS as a Lambda function, so it can reach VPC-protected databases when `joinDefaultVpc` is enabled. Use a lifecycle hook with a `local-script` when the migration tool doesn't package well as a Lambda or takes longer than 15 minutes. If the local script needs to reach VPC-protected resources, a `local-script-with-bastion-tunneling` script runs locally and can tunnel connections to supported protected resources, including relational databases and Redis clusters, through a [bastion host](/resources/security/bastion-host); set the optional `bastionResource` property when you need to choose a specific bastion.

### How much does running a deployment script cost?

Deployment scripts use AWS Lambda pricing: you pay per invocation and for compute time measured in GB-seconds. A typical database migration running for 10 seconds with 512 MB memory costs a fraction of a cent. See [AWS Lambda pricing](https://aws.amazon.com/lambda/pricing/) for current rates.


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
