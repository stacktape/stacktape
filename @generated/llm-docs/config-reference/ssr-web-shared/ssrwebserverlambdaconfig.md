# SsrWebServerLambdaConfig API Reference

Server Lambda configuration shared by all SSR web resources

## TypeScript definition

```typescript
import type { LambdaFunctionLogging } from 'stacktape';

type SsrWebServerLambdaConfig = {
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

### Example 1 (yaml)

```yaml
resources:
  database:
    type: relational-database
    properties:
      credentials:
        masterUserPassword: $Secret('database.password')
      engine:
        type: postgres
        properties:
          version: '16.6'
          primaryInstance:
            instanceSize: db.t4g.micro
      accessibility:
        accessibilityMode: scoping-workloads-in-vpc
  webApp:
    type: nuxt-web
    properties:
      appDirectory: .
      connectTo:
        - database
      environment:
        - name: DATABASE_URL
          value: $ResourceParam('database', 'connectionString')
      serverLambda:
        memory: 1024
        joinDefaultVpc: true
```

### Example 2 (typescript)

```typescript
import { NuxtWeb, RelationalDatabase, $Secret, $ResourceParam, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const database = new RelationalDatabase({
    credentials: { masterUserPassword: $Secret('database.password') },
    engine: {
      type: 'postgres',
      properties: { version: '16.6', primaryInstance: { instanceSize: 'db.t4g.micro' } }
    },
    accessibility: { accessibilityMode: 'scoping-workloads-in-vpc' }
  });

  const webApp = new NuxtWeb({
    appDirectory: '.',
    connectTo: [database],
    environment: { DATABASE_URL: $ResourceParam('database', 'connectionString') },
    serverLambda: {
      memory: 1024,
      joinDefaultVpc: true
    }
  });

  return { resources: { database, webApp } };
});
```

## Property: `logging`

- Required: no
- Type: `LambdaFunctionLogging`

Logging config. Logs are sent to CloudWatch. View with `stacktape logs` or in the AWS console.

### Example 1 (yaml)

```yaml
resources:
  webApp:
    type: nuxt-web
    properties:
      appDirectory: .
      serverLambda:
        memory: 1024
        logging:
          retentionDays: 30
```

### Example 2 (typescript)

```typescript
import { NuxtWeb, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const webApp = new NuxtWeb({
    appDirectory: '.',
    serverLambda: {
      memory: 1024,
      logging: {
        retentionDays: 30
      }
    }
  });

  return { resources: { webApp } };
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
  webApp:
    type: nuxt-web
    properties:
      appDirectory: .
      environment:
        - name: NODE_ENV
          value: production
      serverLambda:
        memory: 2048
        timeout: 20
```

### Example 2 (typescript)

```typescript
import { NuxtWeb, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const webApp = new NuxtWeb({
    appDirectory: '.',
    environment: { NODE_ENV: 'production' },
    serverLambda: {
      memory: 2048,
      timeout: 20
    }
  });

  return { resources: { webApp } };
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
  webApp:
    type: nuxt-web
    properties:
      appDirectory: .
      serverLambda:
        memory: 1024
        timeout: 25
```

### Example 2 (typescript)

```typescript
import { NuxtWeb, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const webApp = new NuxtWeb({
    appDirectory: '.',
    serverLambda: {
      memory: 1024,
      timeout: 25
    }
  });

  return { resources: { webApp } };
});
```
