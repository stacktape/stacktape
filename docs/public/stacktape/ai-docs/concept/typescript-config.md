---
docType: concept
title: TypeScript Configuration
tags:
  - typescript
  - configuration
  - concept
source: docs/_curated-docs/concepts/typescript-config.mdx
priority: 1
---

# TypeScript Configuration

TypeScript is the recommended way to configure Stacktape. It provides type safety, IDE autocompletion, and the full power of a programming language for complex configurations.

## Basic Setup

### Install the SDK

```bash
npm install stacktape --save-dev
```

### Create Configuration File

Create `stacktape.ts` in your project root:

```typescript
import {
  defineConfig,
  HttpApiGateway,
  LambdaFunction,
  StacktapeLambdaBuildpackPackaging,
  HttpApiIntegration
} from 'stacktape';

export default defineConfig(({ stage }) => {
  const api = new HttpApiGateway({
    cors: { enabled: true }
  });

  const handler = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/handler.ts'
    }),
    events: [
      new HttpApiIntegration({
        httpApiGatewayName: api.resourceName,
        method: 'GET',
        path: '/'
      })
    ]
  });

  return {
    resources: { api, handler }
  };
});
```

## The defineConfig Function

`defineConfig` is the main entry point. It receives a callback with context information:

```typescript
import { defineConfig } from 'stacktape';

export default defineConfig(({ stage, region, projectName, command, cliArgs }) => {
  console.log(`Deploying ${projectName} to ${stage} in ${region}`);
  console.log(`Running command: ${command}`);
  console.log(`Extra CLI args:`, cliArgs);

  return {
    resources: {}
  };
});
```

### Context Properties

| Property      | Type       | Description                                      |
| ------------- | ---------- | ------------------------------------------------ |
| `stage`       | `string`   | Current stage (e.g., `dev`, `production`)        |
| `region`      | `string`   | AWS region (e.g., `us-east-1`)                   |
| `projectName` | `string`   | Project name                                     |
| `command`     | `string`   | CLI command being run (`deploy`, `delete`, etc.) |
| `cliArgs`     | `string[]` | Additional CLI arguments after `--`              |

## Resource Classes

Stacktape provides typed classes for all resources:

### Compute Resources

```typescript
import {
  LambdaFunction,
  EdgeLambdaFunction,
  WebService,
  PrivateService,
  WorkerService,
  MultiContainerWorkload,
  BatchJob,
  NextjsWeb
} from 'stacktape';
```

### Database Resources

```typescript
import {
  RelationalDatabase,
  DynamoDbTable,
  RedisCluster,
  MongoDbAtlasCluster,
  UpstashRedis,
  OpenSearchDomain
} from 'stacktape';
```

### Networking Resources

```typescript
import { HttpApiGateway, ApplicationLoadBalancer, NetworkLoadBalancer } from 'stacktape';
```

### Other Resources

```typescript
import {
  Bucket,
  HostingBucket,
  SqsQueue,
  SnsTopic,
  EventBus,
  UserAuthPool,
  WebAppFirewall,
  Bastion,
  StateMachine,
  EfsFilesystem
} from 'stacktape';
```

## Packaging Classes

```typescript
import {
  // Lambda packaging
  StacktapeLambdaBuildpackPackaging,
  CustomArtifactPackaging,

  // Container packaging
  StacktapeImageBuildpackPackaging,
  ExternalBuildpackPackaging,
  CustomDockerfilePackaging,
  PrebuiltImagePackaging,
  NixpacksPackaging
} from 'stacktape';
```

## Event/Integration Classes

```typescript
import {
  // Lambda events
  HttpApiIntegration,
  LoadBalancerIntegration,
  ScheduleIntegration,
  SqsIntegration,
  SnsIntegration,
  S3Integration,
  DynamoDbIntegration,
  KinesisIntegration,
  EventBridgeIntegration,
  CloudwatchLogsIntegration,

  // Container events
  ContainerHttpApiIntegration,
  ContainerLoadBalancerIntegration,
  ContainerNetworkLoadBalancerIntegration
} from 'stacktape';
```

## Engine Classes

```typescript
import {
  // RDS engines
  RdsEnginePostgres,
  RdsEngineMysql,
  RdsEngineMariadb,

  // Aurora engines
  AuroraEnginePostgresql,
  AuroraEngineMysql,

  // Aurora Serverless
  AuroraServerlessEnginePostgresql,
  AuroraServerlessEngineMysql
} from 'stacktape';
```

## Directive Functions

```typescript
import { $Secret, $ResourceParam, $Stage, $Region, $Format, $Var, $File } from 'stacktape';
```

## Complete Example

Here's a full-featured configuration:

```typescript
import {
  defineConfig,
  HttpApiGateway,
  LambdaFunction,
  RelationalDatabase,
  Bucket,
  SqsQueue,
  StacktapeLambdaBuildpackPackaging,
  RdsEnginePostgres,
  HttpApiIntegration,
  SqsIntegration,
  LocalScript,
  $Secret
} from 'stacktape';

export default defineConfig(({ stage }) => {
  const isProduction = stage === 'production';

  // Database
  const database = new RelationalDatabase({
    engine: new RdsEnginePostgres({
      version: '16',
      primaryInstance: {
        instanceSize: isProduction ? 'db.t4g.medium' : 'db.t4g.micro',
        multiAz: isProduction
      }
    }),
    credentials: {
      masterUserPassword: $Secret('db-password')
    }
  });

  // File storage
  const uploads = new Bucket({
    cors: [
      {
        allowedOrigins: ['*'],
        allowedMethods: ['GET', 'PUT'],
        allowedHeaders: ['*']
      }
    ]
  });

  // Background job queue
  const jobQueue = new SqsQueue({
    visibilityTimeoutSeconds: 300
  });

  // API Gateway
  const api = new HttpApiGateway({
    cors: { enabled: true },
    customDomains: isProduction ? [{ domainName: 'api.example.com' }] : []
  });

  // API handler
  const apiHandler = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/api/handler.ts'
    }),
    memory: 512,
    timeout: 30,
    connectTo: [database, uploads, jobQueue],
    events: [
      new HttpApiIntegration({
        httpApiGatewayName: api.resourceName,
        method: '*',
        path: '/*'
      })
    ]
  });

  // Background worker
  const worker = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/worker/handler.ts'
    }),
    memory: 1024,
    timeout: 300,
    connectTo: [database, uploads],
    events: [
      new SqsIntegration({
        sqsQueueName: jobQueue.resourceName,
        batchSize: 10
      })
    ]
  });

  // Migration script
  const migrate = new LocalScript({
    executeCommand: 'npx prisma migrate deploy',
    connectTo: [database]
  });

  return {
    resources: {
      database,
      uploads,
      jobQueue,
      api,
      apiHandler,
      worker
    },
    scripts: { migrate },
    hooks: {
      afterDeploy: [{ scriptName: 'migrate' }]
    }
  };
});
```

## Conditional Configuration

Use TypeScript's full power for conditional logic:

```typescript
export default defineConfig(({ stage }) => {
  const resources: Record<string, any> = {};

  // Always create API
  resources.api = new HttpApiGateway({});

  // Only create database in non-ephemeral stages
  if (stage !== 'preview') {
    resources.database = new RelationalDatabase({
      engine: new RdsEnginePostgres({ version: '16' })
    });
  }

  // Add monitoring in production
  if (stage === 'production') {
    resources.firewall = new WebAppFirewall({
      scope: 'regional'
    });
  }

  return { resources };
});
```

## Loops and Dynamic Resources

```typescript
export default defineConfig(({ stage }) => {
  const regions = ['us-east-1', 'eu-west-1', 'ap-southeast-1'];
  const resources: Record<string, any> = {};

  // Create a queue for each region
  for (const region of regions) {
    resources[`queue-${region}`] = new SqsQueue({
      fifoQueue: true
    });
  }

  // Create handlers from a list
  const endpoints = ['users', 'products', 'orders'];
  for (const endpoint of endpoints) {
    resources[`${endpoint}Handler`] = new LambdaFunction({
      packaging: new StacktapeLambdaBuildpackPackaging({
        entryfilePath: `./src/handlers/${endpoint}.ts`
      })
    });
  }

  return { resources };
});
```

## Sharing Configuration

Create reusable configuration modules:

```typescript
// config/database.ts
import { RelationalDatabase, RdsEnginePostgres, $Secret } from 'stacktape';

export const createDatabase = (stage: string) => {
  return new RelationalDatabase({
    engine: new RdsEnginePostgres({
      version: '16',
      primaryInstance: {
        instanceSize: stage === 'production' ? 'db.t4g.medium' : 'db.t4g.micro'
      }
    }),
    credentials: {
      masterUserPassword: $Secret('db-password')
    }
  });
};

// stacktape.ts
import { defineConfig } from 'stacktape';
import { createDatabase } from './config/database';

export default defineConfig(({ stage }) => {
  const database = createDatabase(stage);

  return { resources: { database } };
});
```

## Type Safety Benefits

The TypeScript configuration catches errors at development time:

```typescript
// ❌ Type error: 'invalid' is not a valid engine type
const db = new RelationalDatabase({
  engine: { type: 'invalid' }
});

// ❌ Type error: 'memory' expects a number
const fn = new LambdaFunction({
  memory: '512' // should be 512
});

// ✅ Correct
const fn = new LambdaFunction({
  memory: 512
});
```

## IDE Support

With TypeScript, you get:

- **Autocompletion** for all properties
- **Inline documentation** on hover
- **Go to definition** for types
- **Rename refactoring** across files
- **Error highlighting** before deployment

`[IMAGE PLACEHOLDER: vscode-typescript-autocomplete]`

## Next Steps
