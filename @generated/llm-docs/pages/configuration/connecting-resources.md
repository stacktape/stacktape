# Connecting Resources

The `connectTo` property wires resources together inside a Stacktape stack. Adding a resource name to a workload's `connectTo` list automatically grants IAM permissions, injects `STP_*` environment variables with connection details, and — for databases and Redis clusters — opens security group access. One line replaces manual IAM policies, networking rules, and environment configuration.

## When to use

Use `connectTo` whenever one resource needs to interact with another at runtime. A [Lambda function](/resources/compute/lambda-function) querying a database, a [web service](/resources/compute/web-service) publishing to a queue, a [deployment script](/resources/advanced/deployment-scripts) running migrations — all are `connectTo` use cases. It is the default mechanism for resource-to-resource access and should be your first choice over manual IAM and environment configuration.

## When NOT to use

Skip `connectTo` when you need permissions narrower than the defaults it grants. For example, `connectTo` gives a workload broad read/write/delete access to a [bucket](/resources/storage/s3-bucket) — if you only need read access, use `iamRoleStatements` with specific actions and set environment variables manually via [`$ResourceParam()`](/configuration/directives). You cannot selectively reduce the permissions `connectTo` grants for a given target; it is all-or-nothing per resource.

## Basic example


Example (TypeScript):

```typescript
import {
  defineConfig,
  LambdaFunction,
  StacktapeLambdaBuildpackPackaging,
  RelationalDatabase,
  RdsEnginePostgres,
  Bucket
} from 'stacktape';
export default defineConfig(() => {
  const myDatabase = new RelationalDatabase({
    credentials: {
      masterUserPassword: "$Secret('database.password')"
    },
    engine: new RdsEnginePostgres({
      version: '16',
      primaryInstance: { instanceSize: 'db.t4g.micro' }
    })
  });

  const uploads = new Bucket({});

  const api = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/handler.ts'
    }),
    connectTo: ['myDatabase', 'uploads']
  });

  return {
    resources: { myDatabase, uploads, api }
  };
});
```


The `connectTo: ['myDatabase', 'uploads']` line gives the Lambda function access to both the database and the bucket. Stacktape injects connection details as `STP_MY_DATABASE_*` and `STP_UPLOADS_*` environment variables, grants IAM permissions for the bucket, and opens security group access to the database.

## Complete Lambda and DynamoDB API example

This minimal TypeScript config wires a Hono-style Lambda API to a DynamoDB table. The `connectTo: ['usersTable']` line grants the function DynamoDB read/write access and injects `STP_USERS_TABLE_NAME`, which your handler can use as the table name for AWS SDK calls.


Example (TypeScript):

```typescript
import {
  defineConfig,
  DynamoDbTable,
  HttpApiGateway,
  LambdaFunction,
  StacktapeLambdaBuildpackPackaging
} from 'stacktape';
export default defineConfig(() => {
  const usersTable = new DynamoDbTable({
    primaryKey: {
      partitionKey: { name: 'userId', type: 'string' }
    }
  });

  const apiGateway = new HttpApiGateway({});

  const api = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/handler.ts'
    }),
    connectTo: ['usersTable'],
    events: [
      {
        type: 'http-api-gateway',
        properties: {
          httpApiGatewayName: 'apiGateway',
          method: 'ANY',
          path: '/{proxy+}'
        }
      },
      {
        type: 'http-api-gateway',
        properties: {
          httpApiGatewayName: 'apiGateway',
          method: 'ANY',
          path: '/'
        }
      }
    ]
  });

  return {
    resources: { usersTable, apiGateway, api }
  };
});
```


## What connectTo does

When you add a resource name to `connectTo`, Stacktape performs up to three actions depending on the target resource type:

1. **Grants IAM permissions** — the consuming resource's execution role gets a policy allowing it to interact with the target (e.g., read/write objects for buckets, send/receive messages for queues). Network-bound resources like relational databases and Redis clusters don't use IAM for data-plane access.

2. **Opens security group access** — for [relational databases](/resources/databases/relational-database) and [Redis clusters](/resources/databases/redis), Stacktape creates security group rules allowing the consuming resource to reach the target on the correct port. See the [Lambda function](/resources/compute/lambda-function) and [relational database](/resources/databases/relational-database) pages for VPC placement details.

3. **Injects environment variables** — Stacktape injects connection parameters as `STP_[RESOURCE_NAME]_[PARAM]` environment variables into the consuming resource. The exact set of injected variables depends on the target resource type, documented in the tables below.

## Environment variable naming

Stacktape converts the resource name and parameter name to `UPPER_SNAKE_CASE` with the `STP_` prefix:

```
STP_[RESOURCE_NAME]_[PARAMETER_NAME]
```

A resource named `myDatabase` with parameter `connectionString` becomes `STP_MY_DATABASE_CONNECTION_STRING`. A resource named `uploads` with parameter `name` becomes `STP_UPLOADS_NAME`. CamelCase names are split at word boundaries: `jobQueue` → `JOB_QUEUE`, `usersTable` → `USERS_TABLE`.

## Injected variables

The tables below document the environment variables injected by `connectTo` for each supported target resource type. Each table assumes an illustrative resource name shown in the heading — your actual variable names follow the `STP_[RESOURCE_NAME]_[PARAM]` pattern based on the name you give the resource in your config. Additional parameters beyond what is listed here may be accessible via [`$ResourceParam()`](/configuration/directives).

### Relational database

Assuming a resource named `myDatabase`:

| Parameter | Example env var | Description |
|---|---|---|
| `connectionString` | `STP_MY_DATABASE_CONNECTION_STRING` | Full connection string |
| `host` | `STP_MY_DATABASE_HOST` | Database hostname |
| `port` | `STP_MY_DATABASE_PORT` | Database port |
| `readerConnectionString` | `STP_MY_DATABASE_READER_CONNECTION_STRING` | Reader endpoint connection string (Aurora only) |
| `readerHost` | `STP_MY_DATABASE_READER_HOST` | Reader endpoint hostname (Aurora only) |


> **Tip:** Use [`$Secret()`](/configuration/secrets) for the database password in your config to keep credentials out of source control. Additional database parameters like `dbName` and `masterUserName` are available via [`$ResourceParam()`](/configuration/directives).


### Lambda to Postgres example

Use `connectTo` on the Lambda function to inject database connection variables. For a database resource named `mainDatabase`, the Lambda reads `process.env.STP_MAIN_DATABASE_CONNECTION_STRING`.


Example (TypeScript):

```typescript
import {
  defineConfig,
  LambdaFunction,
  RelationalDatabase,
  RdsEnginePostgres,
  StacktapeLambdaBuildpackPackaging
} from 'stacktape';
export default defineConfig(() => {
  const mainDatabase = new RelationalDatabase({
    credentials: {
      masterUserPassword: "$Secret('database.password')"
    },
    engine: new RdsEnginePostgres({
      version: '16',
      primaryInstance: {
        instanceSize: 'db.t4g.micro'
      }
    })
  });

  const api = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/api.ts'
    }),
    connectTo: ['mainDatabase']
  });

  return {
    resources: { mainDatabase, api }
  };
});
```


For databases that restrict access to VPC-only modes, the consuming Lambda function may need VPC placement. See the [Lambda function](/resources/compute/lambda-function) and [relational database](/resources/databases/relational-database) pages for VPC and accessibility mode configuration.

### Bucket

Assuming a resource named `uploads`:

| Parameter | Example env var | Description |
|---|---|---|
| `name` | `STP_UPLOADS_NAME` | Bucket name |
| `arn` | `STP_UPLOADS_ARN` | Bucket ARN |


> **Tip:** Additional bucket parameters are available via [`$ResourceParam()`](/configuration/directives). See the [referenceable parameters](/configuration/referenceable-parameters) page for the full list.


### DynamoDB table

Assuming a resource named `usersTable`:

| Parameter | Example env var | Description |
|---|---|---|
| `name` | `STP_USERS_TABLE_NAME` | Table name |
| `arn` | `STP_USERS_TABLE_ARN` | Table ARN |
| `streamArn` | `STP_USERS_TABLE_STREAM_ARN` | DynamoDB Streams ARN |

### SQS queue

Assuming a resource named `jobQueue`:

| Parameter | Example env var | Description |
|---|---|---|
| `arn` | `STP_JOB_QUEUE_ARN` | Queue ARN |
| `name` | `STP_JOB_QUEUE_NAME` | Queue name |
| `url` | `STP_JOB_QUEUE_URL` | Queue URL (used for sending/receiving) |

### SNS topic

Assuming a resource named `notifications`:

| Parameter | Example env var | Description |
|---|---|---|
| `arn` | `STP_NOTIFICATIONS_ARN` | Topic ARN |
| `name` | `STP_NOTIFICATIONS_NAME` | Topic name |

### Redis cluster

Assuming a resource named `cache`:

| Parameter | Example env var | Description |
|---|---|---|
| `host` | `STP_CACHE_HOST` | Primary host endpoint |
| `readerHost` | `STP_CACHE_READER_HOST` | Reader endpoint |
| `port` | `STP_CACHE_PORT` | Port number |

### Event bus

Assuming a resource named `events`:

| Parameter | Example env var | Description |
|---|---|---|
| `arn` | `STP_EVENTS_ARN` | Event bus ARN |

The `archiveArn` parameter is also available via [`$ResourceParam()`](/configuration/directives) — see the [referenceable parameters](/configuration/referenceable-parameters) page for all event bus parameters.

### User auth pool

Assuming a resource named `auth`:

| Parameter | Example env var | Description |
|---|---|---|
| `id` | `STP_AUTH_ID` | Cognito User Pool ID |
| `clientId` | `STP_AUTH_CLIENT_ID` | App client ID |
| `arn` | `STP_AUTH_ARN` | User Pool ARN |

### Lambda function

Assuming a resource named `myFunction`:

| Parameter | Example env var | Description |
|---|---|---|
| `arn` | `STP_MY_FUNCTION_ARN` | Function ARN |

### Batch job

Assuming a resource named `myJob`:

| Parameter | Example env var | Description |
|---|---|---|
| `jobDefinitionArn` | `STP_MY_JOB_JOB_DEFINITION_ARN` | Batch job definition ARN |
| `stateMachineArn` | `STP_MY_JOB_STATE_MACHINE_ARN` | Step Functions state machine ARN (wraps the batch job) |

### MongoDB Atlas cluster

Assuming a resource named `mongo`:

| Parameter | Example env var | Description |
|---|---|---|
| `connectionString` | `STP_MONGO_CONNECTION_STRING` | MongoDB connection string |

### Upstash Redis

Assuming a resource named `redis`:

| Parameter | Example env var | Description |
|---|---|---|
| `host` | `STP_REDIS_HOST` | Redis host |
| `port` | `STP_REDIS_PORT` | Redis port |
| `password` | `STP_REDIS_PASSWORD` | Redis password |
| `restToken` | `STP_REDIS_REST_TOKEN` | REST API token |
| `restUrl` | `STP_REDIS_REST_URL` | REST API URL |
| `redisUrl` | `STP_REDIS_REDIS_URL` | Full Redis URL |

### Private service

Assuming a resource named `backend`:

| Parameter | Example env var | Description |
|---|---|---|
| `address` | `STP_BACKEND_ADDRESS` | Internal service address |

### Additional connectTo targets

The `connectTo` property also accepts additional resource types as targets beyond those listed above — including [multi-container workloads](/resources/compute/multi-container-workload), [event buses](/resources/messaging/event-bus), [state machines](/resources/orchestration/state-machine), [OpenSearch domains](/resources/databases/opensearch), and [Kinesis streams](/resources/messaging/kinesis-stream). For these targets, `connectTo` adds the required IAM permissions to the consuming workload's execution role, but the injected environment variables are not documented in the tables above. Use [`$ResourceParam()`](/configuration/directives) to pass specific parameters as environment variables. In the type definitions, `connectTo` targets either affect the consuming workload's IAM role or security-group access. The role-affecting set includes Lambda functions, container workloads, batch jobs, state machines, event buses, buckets, DynamoDB tables, OpenSearch domains, user auth pools, SQS queues, SNS topics, and Kinesis streams. Relational databases and Redis clusters affect security-group access. `connectTo` also accepts supported AWS service macros such as `aws:ses`.

### Script-only variables

[Scripts](/configuration/hooks-and-scripts) have their own `connectTo` environment-variable set. For scripts, a [web service](/resources/compute/web-service) additionally injects `STP_[RESOURCE_NAME]_URL`. The following parameters are injected exclusively in scripts, in addition to any variables from the tables above:

| Resource type | Script-only parameters |
|---|---|
| [Relational database](/resources/databases/relational-database) | `JDBC_CONNECTION_STRING`. Aurora also adds `READER_JDBC_CONNECTION_STRING` |
| [Web service](/resources/compute/web-service) | `URL` |
| Upstash Kafka topic | `TOPIC_NAME`, `TOPIC_ID`, `USERNAME`, `PASSWORD`, `TCP_ENDPOINT`, `REST_URL` |

## Using injected variables in code

Access the `STP_*` variables through `process.env` in your application code:

```typescript
import { Client } from 'pg';

export const handler = async () => {
  const client = new Client({
    connectionString: process.env.STP_MY_DATABASE_CONNECTION_STRING
  });

  await client.connect();
  const result = await client.query('SELECT NOW()');
  await client.end();

  return { statusCode: 200, body: JSON.stringify(result.rows) };
};
```

For S3 operations, use the injected bucket name:

```typescript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3 = new S3Client({});

export const handler = async () => {
  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.STP_UPLOADS_NAME,
      Key: 'hello.txt',
      Body: 'Hello, world!'
    })
  );

  return { statusCode: 200, body: 'Uploaded' };
};
```


> **Tip:** IAM permissions from `connectTo` are applied to the resource's execution role automatically. AWS SDK calls work without explicit credentials — the SDK uses the role's temporary credentials from the environment.


## Permissions granted

Stacktape generates IAM policies at deploy time based on the target resource type. The access categories below reflect the documented behavior for each target:

| Target resource | Access granted |
|---|---|
| [Bucket](/resources/storage/s3-bucket) | Read, write, and delete objects; list bucket contents |
| [DynamoDB table](/resources/databases/dynamodb) | CRUD operations (get, put, update, delete) + query and scan |
| [SQS queue](/resources/messaging/sqs-queue) | Send, receive, and delete messages |
| [SNS topic](/resources/messaging/sns-topic) | Publish and subscribe |
| [Event bus](/resources/messaging/event-bus) | Publish events |
| [Lambda function](/resources/compute/lambda-function) | Invoke the function |
| [Batch job](/resources/compute/batch-job) | Submit, list, and terminate jobs |
| [User auth pool](/resources/security/user-auth-pool) | Full Cognito User Pool control |
| [MongoDB Atlas cluster](/resources/databases/mongodb-atlas) | Temporary credential-less access |
| [Relational database](/resources/databases/relational-database) | Network access (security group rules, not IAM) |
| [Redis cluster](/resources/databases/redis) | Network access (security group rules, not IAM) |

[Relational databases](/resources/databases/relational-database) and [Redis clusters](/resources/databases/redis) are network-bound resources — data-plane access is controlled through VPC security groups rather than IAM policies. Stacktape opens the correct port between the consuming resource and the target automatically.

[Multi-container workloads](/resources/compute/multi-container-workload), [state machines](/resources/orchestration/state-machine), [OpenSearch domains](/resources/databases/opensearch), [Kinesis streams](/resources/messaging/kinesis-stream), and [event buses](/resources/messaging/event-bus) are also valid `connectTo` targets that affect the consuming workload's IAM role. For the final deployed policy, inspect the generated CloudFormation template, for example with [`stacktape compile-template`](/cli/compile-template).


> **Info:** The exact IAM policy statements generated at deploy time may include additional supporting actions (e.g., listing, describing). For the authoritative policy, inspect the generated CloudFormation template or the deployed stack's IAM roles in the AWS Console.


## AWS service macros

In addition to stack resources, `connectTo` supports the `aws:ses` macro for granting AWS SES (Simple Email Service) permissions without a dedicated resource:


Example (TypeScript):

```typescript
import { defineConfig, LambdaFunction, StacktapeLambdaBuildpackPackaging } from 'stacktape';
export default defineConfig(() => {
  const emailSender = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/send-email.ts'
    }),
    connectTo: ['aws:ses']
  });

  return {
    resources: { emailSender }
  };
});
```


The `aws:ses` macro grants SES email sending permissions to the consuming resource. You call the SES API directly via the AWS SDK using methods like `SendEmailCommand`.

## Custom permissions with iamRoleStatements

When you need access to an AWS service not covered by `connectTo`, or need different permissions than `connectTo` provides, use `iamRoleStatements`:


Example (TypeScript):

```typescript
import { defineConfig, LambdaFunction, StacktapeLambdaBuildpackPackaging, Bucket } from 'stacktape';
export default defineConfig(() => {
  const uploads = new Bucket({});

  const reader = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/reader.ts'
    }),
    environment: [{ name: 'BUCKET_NAME', value: "$ResourceParam('uploads', 'name')" }],
    iamRoleStatements: [
      {
        Resource: ["$ResourceParam('uploads', 'arn')/*"],
        Action: ['s3:GetObject']
      }
    ]
  });

  return {
    resources: { uploads, reader }
  };
});
```


In this example, the reader function gets read-only access to the bucket via `iamRoleStatements` instead of the broad read/write/delete access that `connectTo` would grant. The `$ResourceParam('uploads', 'arn')` directive resolves to the bucket's ARN at deploy time. The `/*` suffix targets objects inside the bucket — `s3:GetObject` acts on individual objects, so the IAM resource must be `arn:aws:s3:::bucket-name/*` rather than the bucket ARN alone. The bucket name is injected manually via `$ResourceParam()`. Verify the exact parameter key for each resource type on the [referenceable parameters](/configuration/referenceable-parameters) page before using `$ResourceParam` in IAM resource ARNs.

The `iamRoleStatements` property adds a separate IAM policy alongside any auto-generated policies. If you use both `connectTo` and `iamRoleStatements` targeting the same resource, both policies apply — `iamRoleStatements` does not override or narrow `connectTo` permissions.

## Scripts with connectTo

[Scripts](/configuration/hooks-and-scripts) support `connectTo` for running local commands that need access to deployed resources — database migrations, seed scripts, or health checks:


Example (TypeScript):

```typescript
import { defineConfig, RelationalDatabase, RdsEnginePostgres, Bastion } from 'stacktape';
export default defineConfig(() => {
  const myDatabase = new RelationalDatabase({
    credentials: {
      masterUserPassword: "$Secret('database.password')"
    },
    engine: new RdsEnginePostgres({
      version: '16',
      primaryInstance: { instanceSize: 'db.t4g.micro' }
    })
  });

  const bastion = new Bastion({});

  return {
    resources: { myDatabase, bastion },
    scripts: {
      migrate: {
        type: 'local-script-with-bastion-tunneling',
        properties: {
          bastionResource: 'bastion',
          executeCommand: 'npx prisma migrate deploy',
          connectTo: ['myDatabase']
        }
      }
    }
  };
});
```


Run the script with [`stacktape script:run`](/cli/script-run):

```bash
stacktape script:run --scriptName migrate --stage production --region eu-west-1
```

The `local-script-with-bastion-tunneling` type tunnels connections through a [bastion host](/resources/security/bastion-host), giving your local machine secure access to VPC-only databases. The injected environment variables are automatically adjusted to route through the tunnel. Use `local-script` for commands that can reach their targets from the machine running Stacktape; use `local-script-with-bastion-tunneling` when the target must be reached through a bastion tunnel. Three script types support `connectTo`: `local-script`, `local-script-with-bastion-tunneling`, and `bastion-script`. The example uses `executeCommand`; local scripts can also use `executeCommands`, `executeScript`, or `executeScripts`, while bastion scripts support `executeCommand` and `executeCommands`.

For `local-script-with-bastion-tunneling` and `bastion-script`, `properties.bastionResource` can name the [bastion host](/resources/security/bastion-host) resource to use for tunneling.

Scripts can also define `properties.environment` for static values, secrets, custom directives, or `$ResourceParam()` values when a tool expects a specific variable name that differs from the `STP_*` convention. Use `connectTo` when the script needs connection variables for specific targets. Use `assumeRoleOfResource` when the script should run with the same IAM permissions as a deployed workload — such as a function, batch job, web service, private service, worker service, multi-container workload, or SSR frontend.

## Resources that use connectTo

The following list covers resources where the `connectTo` property is available — these are **consumers** that can connect to other resources. The supported **target** resources and what each target provides are documented in the [injected variables](#injected-variables) and [permissions granted](#permissions-granted) sections above.

- [Lambda function](/resources/compute/lambda-function)
- [Web service](/resources/compute/web-service)
- [Private service](/resources/compute/private-service)
- [Worker service](/resources/compute/worker-service)
- [Multi-container workload](/resources/compute/multi-container-workload)
- [Batch job](/resources/compute/batch-job)
- SSR frontends — see each resource's page for `connectTo` on the server workload: [Next.js](/resources/frontend/nextjs), [Astro](/resources/frontend/astro), [Nuxt](/resources/frontend/nuxt), [SvelteKit](/resources/frontend/sveltekit), [SolidStart](/resources/frontend/solidstart), [TanStack Start](/resources/frontend/tanstack-start), [Remix](/resources/frontend/remix)
- [Deployment scripts](/resources/advanced/deployment-scripts)
- Scripts (`local-script`, `local-script-with-bastion-tunneling`, `bastion-script`)

For [edge Lambda functions](/resources/compute/edge-function), check the [edge function page](/resources/compute/edge-function) for `connectTo` support and any limitations specific to CloudFront edge runtimes.

## VPC and networking

When you connect to [relational databases](/resources/databases/relational-database) or [Redis clusters](/resources/databases/redis), Stacktape creates security group rules that allow the consuming resource to reach the target on the correct port. Workloads that need to reach VPC-bound databases or Redis clusters must be placed in the same VPC — see the [Lambda function](/resources/compute/lambda-function), [web service](/resources/compute/web-service), and [relational database](/resources/databases/relational-database) pages for VPC placement configuration.


> **Warning:** Lambda functions placed in a VPC lose direct internet access. If your function needs to call external APIs while also connecting to a VPC database, you can configure NAT Gateways (see `stackConfig.vpc.nat`) or use a database with internet-accessible settings for development stages.


## FAQ

### How does connectTo differ from manually setting environment variables?

The `connectTo` property does three things that manual `environment` entries cannot: it grants IAM permissions, opens security group rules for network-bound resources, and resolves dynamic values (like hostnames only known after deployment). Manual environment variables only set static or directive-resolved values without affecting permissions or networking.

### When should I use connectTo instead of hardcoding credentials?

Always prefer `connectTo` over hardcoded credentials. Hardcoded connection strings break across stages (dev, staging, production) because hostnames and ports differ per deployment. `connectTo` injects the correct values for each stage automatically and manages IAM permissions and network access — two concerns that hardcoded credentials cannot address. The only exception is connecting to resources outside your Stacktape stack, where manual environment variables are required.

### What is the difference between IAM permissions and security groups?

AWS IAM controls which API calls a resource can make (e.g., writing to S3, invoking a Lambda function). Security groups control network traffic between resources at the TCP level (e.g., allowing port 5432 connections to a database). Services like S3 and DynamoDB are accessed over the public AWS API, so they only need IAM. Databases and Redis clusters run inside a VPC and need security group rules to allow network traffic. `connectTo` manages both layers depending on the target resource type.

### How do AWS IAM execution roles work for Lambda and ECS tasks?

Every AWS Lambda function and ECS task runs with an IAM execution role — a set of permissions that determines which AWS APIs the code can call. When your function uses the AWS SDK to read from S3, the SDK automatically uses temporary credentials from this role. `connectTo` adds policies to this execution role, so your code can call the target service without passing explicit credentials. The credentials rotate automatically and never appear in your source code.

### Can I connect to resources in a different stack?

Not directly through `connectTo` — it takes names of resources defined within the same Stacktape configuration. To access resources from another stack, set environment variables manually with the target's endpoint or ARN and configure `iamRoleStatements` for the required IAM permissions. For network-bound resources like databases, consult the relevant [networking](/resources/networking/custom-domains) and resource pages for cross-stack access patterns.

### What happens if I remove a resource from connectTo?

After you remove a target from `connectTo` and redeploy, your application code should no longer rely on the automatically managed permissions, network access, or `STP_*` variables for that target. If the code still needs access, configure it explicitly with `environment` variables and `iamRoleStatements`. The target resource itself is not affected — only the consuming workload's access to it changes.

### Can I limit which actions connectTo grants?

Not directly — `connectTo` grants a fixed set of permissions per resource type. If you need narrower permissions (e.g., read-only bucket access), skip `connectTo` for that target and instead set environment variables manually via `$ResourceParam()` and add specific actions in `iamRoleStatements`. You can use both `connectTo` (for some targets) and `iamRoleStatements` (for others) on the same resource.

### Does connectTo work with side containers in a multi-container workload?

The `connectTo` property is configured on the [multi-container workload](/resources/compute/multi-container-workload) level, which determines the task's IAM role. All containers in an AWS ECS task share the same IAM execution role, so side containers can make the same AWS API calls. Check the [multi-container workload docs](/resources/compute/multi-container-workload) for details on configuring environment variables for individual containers.

### Does connectTo add latency to my function?

No. `connectTo` is a deploy-time configuration mechanism — it sets IAM policies, security group rules, and environment variables during CloudFormation deployment. At runtime, there is no additional middleware, proxy, or indirection between your code and the target resource. The only latency impact is indirect: Lambda functions placed in a VPC (to reach databases or Redis) may experience slightly longer cold starts due to VPC network interface setup.

### What is the aws:ses macro and when should I use it?

The `aws:ses` macro is a special `connectTo` target that grants AWS SES (Simple Email Service) permissions without requiring you to define an SES resource in your stack. Use it when your function or service needs to send transactional emails. The macro grants IAM permissions for SES email sending. You call the SES API directly through the AWS SDK using standard methods like `SendEmailCommand`.
