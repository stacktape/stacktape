# NextjsServerLambdaProperties API Reference

Resource type: `nextjs-web`

## TypeScript definition

```typescript
import type { LambdaFunctionLogging } from 'stacktape';

type NextjsServerLambdaProperties = {
  /** Connect to VPC resources (databases, Redis). Warning: function loses direct internet access. */
  joinDefaultVpc?: boolean;
  /** Logging config. Logs are sent to CloudWatch. View with stacktape logs or in the AWS console. */
  logging?: LambdaFunctionLogging;
  /** Memory in MB (128–10,240). CPU scales proportionally — 1,769 MB = 1 vCPU. */
  memory?: number;
  /** Max execution time in seconds. Max: 30. */
  timeout?: number;
};
```

## Property: `joinDefaultVpc`

- Required: no
- Type: `boolean`

Connect to VPC resources (databases, Redis). **Warning:** function loses direct internet access.

S3 and DynamoDB remain accessible via auto-created VPC endpoints.

### Example 1 (yaml)

```yaml
resources:
  database:
    type: relational-database
    properties:
      credentials:
        masterUserPassword: $Secret('db.password')
      engine:
        type: postgres
        properties:
          primaryInstance:
            instanceSize: db.t4g.micro
          version: '16.6'
  web:
    type: nextjs-web
    properties:
      appDirectory: ./
      connectTo:
        - database
      serverLambda:
        joinDefaultVpc: true
```

### Example 2 (typescript)

```typescript
import { NextjsWeb, RelationalDatabase, defineConfig, $Secret } from 'stacktape';

export default defineConfig(() => {
  const database = new RelationalDatabase({
    credentials: { masterUserPassword: $Secret('db.password') },
    engine: {
      type: 'postgres',
      properties: {
        primaryInstance: { instanceSize: 'db.t4g.micro' },
        version: '16.6'
      }
    }
  });
  const web = new NextjsWeb({
    appDirectory: './',
    connectTo: [database],
    serverLambda: {
      joinDefaultVpc: true
    }
  });
  return { resources: { database, web } };
});
```

## Property: `logging`

- Required: no
- Type: `LambdaFunctionLogging`

Logging config. Logs are sent to CloudWatch. View with `stacktape logs` or in the AWS console.

### Example 1 (yaml)

```yaml
resources:
  web:
    type: nextjs-web
    properties:
      appDirectory: ./
      serverLambda:
        logging:
          retentionDays: 90
```

### Example 2 (typescript)

```typescript
import { NextjsWeb, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const web = new NextjsWeb({
    appDirectory: './',
    serverLambda: {
      logging: {
        retentionDays: 90
      }
    }
  });
  return { resources: { web } };
});
```

## Property: `memory`

- Required: no
- Type: `number`
- Default: `1024`

Memory in MB (128–10,240). CPU scales proportionally — 1,769 MB = 1 vCPU.

### Example 1 (yaml)

```yaml
resources:
  web:
    type: nextjs-web
    properties:
      appDirectory: ./
      serverLambda:
        memory: 3008
```

### Example 2 (typescript)

```typescript
import { NextjsWeb, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const web = new NextjsWeb({
    appDirectory: './',
    serverLambda: {
      memory: 3008
    }
  });
  return { resources: { web } };
});
```

## Property: `timeout`

- Required: no
- Type: `number`
- Default: `30`

Max execution time in seconds. Max: 30.

### Example 1 (yaml)

```yaml
resources:
  web:
    type: nextjs-web
    properties:
      appDirectory: ./
      serverLambda:
        timeout: 30
```

### Example 2 (typescript)

```typescript
import { NextjsWeb, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const web = new NextjsWeb({
    appDirectory: './',
    serverLambda: {
      timeout: 30
    }
  });
  return { resources: { web } };
});
```
