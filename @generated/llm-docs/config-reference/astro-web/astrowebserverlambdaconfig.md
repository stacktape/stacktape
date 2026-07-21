# AstroWebServerLambdaConfig API Reference

Resource type: `astro-web`

## TypeScript definition

```typescript
import type { LambdaFunctionLogging } from 'stacktape';

type AstroWebServerLambdaConfig = {
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
  cache:
    type: redis-cluster
    properties:
      defaultUserPassword: $Secret('redis.password')
      instanceSize: cache.t3.micro
  web:
    type: astro-web
    properties:
      connectTo:
        - cache
      serverLambda:
        joinDefaultVpc: true
```

### Example 2 (typescript)

```typescript
import { AstroWeb, RedisCluster, defineConfig, $Secret } from 'stacktape';

export default defineConfig(() => {
  const cache = new RedisCluster({
    defaultUserPassword: $Secret('redis.password'),
    instanceSize: 'cache.t3.micro'
  });
  const web = new AstroWeb({
    connectTo: ['cache'],
    serverLambda: {
      joinDefaultVpc: true
    }
  });
  return { resources: { cache, web } };
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
    type: astro-web
    properties:
      serverLambda:
        logging:
          retentionDays: 90
```

### Example 2 (typescript)

```typescript
import { AstroWeb, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const web = new AstroWeb({
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
    type: astro-web
    properties:
      serverLambda:
        memory: 3008
        timeout: 30
```

### Example 2 (typescript)

```typescript
import { AstroWeb, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const web = new AstroWeb({
    serverLambda: {
      memory: 3008,
      timeout: 30
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
    type: astro-web
    properties:
      serverLambda:
        memory: 1024
        timeout: 25
```

### Example 2 (typescript)

```typescript
import { AstroWeb, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const web = new AstroWeb({
    serverLambda: {
      memory: 1024,
      timeout: 25
    }
  });
  return { resources: { web } };
});
```
