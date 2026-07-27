# WebServiceAlbLoadBalancingProps API Reference

Resource type: `web-service`

## TypeScript definition

```typescript
type WebServiceAlbLoadBalancingProps = {
  /** Seconds between health checks. */
  healthcheckInterval?: number;
  /** Path the load balancer pings to check container health. */
  healthcheckPath?: string;
  /** Seconds before a health check is considered failed. */
  healthcheckTimeout?: number;
};
```

## Property: `healthcheckInterval`

- Required: no
- Type: `number`
- Default: `5`

Seconds between health checks.

### Example 1 (yaml)

```yaml
resources:
  apiService:
    type: web-service
    properties:
      packaging:
        type: stacktape-image-buildpack
        properties:
          entryfilePath: src/main.ts
      resources:
        cpu: 1
        memory: 2048
      loadBalancing:
        type: application-load-balancer
        properties:
          healthcheckPath: /health
          healthcheckInterval: 10
```

### Example 2 (typescript)

```typescript
import { defineConfig, WebService, StacktapeImageBuildpackPackaging } from 'stacktape';

export default defineConfig(() => {
  const apiService = new WebService({
    packaging: new StacktapeImageBuildpackPackaging({
      entryfilePath: 'src/main.ts'
    }),
    resources: {
      cpu: 1,
      memory: 2048
    },
    loadBalancing: {
      type: 'application-load-balancer',
      properties: {
        healthcheckPath: '/health',
        healthcheckInterval: 10
      }
    }
  });

  return {
    resources: { apiService }
  };
});
```

## Property: `healthcheckPath`

- Required: no
- Type: `string`
- Default: `/`

Path the load balancer pings to check container health.

### Example 1 (yaml)

```yaml
resources:
  apiService:
    type: web-service
    properties:
      packaging:
        type: stacktape-image-buildpack
        properties:
          entryfilePath: src/main.ts
      resources:
        cpu: 1
        memory: 2048
      loadBalancing:
        type: application-load-balancer
        properties:
          healthcheckPath: /health
```

### Example 2 (typescript)

```typescript
import { defineConfig, WebService, StacktapeImageBuildpackPackaging } from 'stacktape';

export default defineConfig(() => {
  const apiService = new WebService({
    packaging: new StacktapeImageBuildpackPackaging({
      entryfilePath: 'src/main.ts'
    }),
    resources: {
      cpu: 1,
      memory: 2048
    },
    loadBalancing: {
      type: 'application-load-balancer',
      properties: {
        healthcheckPath: '/health'
      }
    }
  });

  return {
    resources: { apiService }
  };
});
```

## Property: `healthcheckTimeout`

- Required: no
- Type: `number`
- Default: `4`

Seconds before a health check is considered failed.

### Example 1 (yaml)

```yaml
resources:
  apiService:
    type: web-service
    properties:
      packaging:
        type: stacktape-image-buildpack
        properties:
          entryfilePath: src/main.ts
      resources:
        cpu: 1
        memory: 2048
      loadBalancing:
        type: application-load-balancer
        properties:
          healthcheckPath: /health
          healthcheckInterval: 10
          healthcheckTimeout: 5
```

### Example 2 (typescript)

```typescript
import { defineConfig, WebService, StacktapeImageBuildpackPackaging } from 'stacktape';

export default defineConfig(() => {
  const apiService = new WebService({
    packaging: new StacktapeImageBuildpackPackaging({
      entryfilePath: 'src/main.ts'
    }),
    resources: {
      cpu: 1,
      memory: 2048
    },
    loadBalancing: {
      type: 'application-load-balancer',
      properties: {
        healthcheckPath: '/health',
        healthcheckInterval: 10,
        healthcheckTimeout: 5
      }
    }
  });

  return {
    resources: { apiService }
  };
});
```
