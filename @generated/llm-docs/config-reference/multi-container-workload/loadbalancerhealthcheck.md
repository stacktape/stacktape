# LoadBalancerHealthCheck API Reference

Resource type: `multi-container-workload`

## TypeScript definition

```typescript
type LoadBalancerHealthCheck = {
  /** Seconds between health checks. */
  healthcheckInterval?: number;
  /** Path the load balancer pings to check container health. */
  healthcheckPath?: string;
  /** Health check port. Defaults to the traffic port. */
  healthCheckPort?: number;
  /** Health check protocol. ALB defaults to HTTP, NLB defaults to TCP. */
  healthCheckProtocol?: "HTTP" | "TCP";
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
  app:
    type: multi-container-workload
    properties:
      containers:
        - name: web
          packaging:
            type: stacktape-image-buildpack
            properties:
              entryfilePath: src/index.ts
          events:
            - type: application-load-balancer
              properties:
                loadBalancerName: appLb
                priority: 1
                containerPort: 3000
          loadBalancerHealthCheck:
            healthcheckPath: /health
            healthcheckInterval: 15
      resources:
        cpu: 0.5
        memory: 1024
  appLb:
    type: application-load-balancer
```

### Example 2 (typescript)

```typescript
import { MultiContainerWorkload, ApplicationLoadBalancer, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const appLb = new ApplicationLoadBalancer({});
  const app = new MultiContainerWorkload({
    containers: [
      {
        name: 'web',
        packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/index.ts' }),
        events: [
          { type: 'application-load-balancer', properties: { loadBalancerName: 'appLb', priority: 1, containerPort: 3000 } }
        ],
        loadBalancerHealthCheck: {
          healthcheckPath: '/health',
          healthcheckInterval: 15
        }
      }
    ],
    resources: { cpu: 0.5, memory: 1024 }
  });
  return { resources: { app, appLb } };
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
  app:
    type: multi-container-workload
    properties:
      containers:
        - name: web
          packaging:
            type: stacktape-image-buildpack
            properties:
              entryfilePath: src/index.ts
          events:
            - type: application-load-balancer
              properties:
                loadBalancerName: appLb
                priority: 1
                containerPort: 3000
          loadBalancerHealthCheck:
            healthcheckPath: /health
      resources:
        cpu: 0.5
        memory: 1024
  appLb:
    type: application-load-balancer
```

### Example 2 (typescript)

```typescript
import { MultiContainerWorkload, ApplicationLoadBalancer, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const appLb = new ApplicationLoadBalancer({});
  const app = new MultiContainerWorkload({
    containers: [
      {
        name: 'web',
        packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/index.ts' }),
        events: [
          { type: 'application-load-balancer', properties: { loadBalancerName: 'appLb', priority: 1, containerPort: 3000 } }
        ],
        loadBalancerHealthCheck: {
          healthcheckPath: '/health'
        }
      }
    ],
    resources: { cpu: 0.5, memory: 1024 }
  });
  return { resources: { app, appLb } };
});
```

## Property: `healthCheckPort`

- Required: no
- Type: `number`

Health check port. Defaults to the traffic port.

### Example 1 (yaml)

```yaml
resources:
  app:
    type: multi-container-workload
    properties:
      containers:
        - name: web
          packaging:
            type: stacktape-image-buildpack
            properties:
              entryfilePath: src/index.ts
          events:
            - type: application-load-balancer
              properties:
                loadBalancerName: appLb
                priority: 1
                containerPort: 3000
          loadBalancerHealthCheck:
            healthcheckPath: /health
            healthCheckPort: 3000
      resources:
        cpu: 0.5
        memory: 1024
  appLb:
    type: application-load-balancer
```

### Example 2 (typescript)

```typescript
import { MultiContainerWorkload, ApplicationLoadBalancer, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const appLb = new ApplicationLoadBalancer({});
  const app = new MultiContainerWorkload({
    containers: [
      {
        name: 'web',
        packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/index.ts' }),
        events: [
          { type: 'application-load-balancer', properties: { loadBalancerName: 'appLb', priority: 1, containerPort: 3000 } }
        ],
        loadBalancerHealthCheck: {
          healthcheckPath: '/health',
          healthCheckPort: 3000
        }
      }
    ],
    resources: { cpu: 0.5, memory: 1024 }
  });
  return { resources: { app, appLb } };
});
```

## Property: `healthCheckProtocol`

- Required: no
- Type: `string: "HTTP" | "TCP"`

Health check protocol. ALB defaults to `HTTP`, NLB defaults to `TCP`.

### Example 1 (yaml)

```yaml
resources:
  app:
    type: multi-container-workload
    properties:
      containers:
        - name: web
          packaging:
            type: stacktape-image-buildpack
            properties:
              entryfilePath: src/index.ts
          events:
            - type: application-load-balancer
              properties:
                loadBalancerName: appLb
                priority: 1
                containerPort: 3000
          loadBalancerHealthCheck:
            healthCheckProtocol: HTTP
            healthcheckPath: /health
      resources:
        cpu: 0.5
        memory: 1024
  appLb:
    type: application-load-balancer
```

### Example 2 (typescript)

```typescript
import { MultiContainerWorkload, ApplicationLoadBalancer, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const appLb = new ApplicationLoadBalancer({});
  const app = new MultiContainerWorkload({
    containers: [
      {
        name: 'web',
        packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/index.ts' }),
        events: [
          { type: 'application-load-balancer', properties: { loadBalancerName: 'appLb', priority: 1, containerPort: 3000 } }
        ],
        loadBalancerHealthCheck: {
          healthCheckProtocol: 'HTTP',
          healthcheckPath: '/health'
        }
      }
    ],
    resources: { cpu: 0.5, memory: 1024 }
  });
  return { resources: { app, appLb } };
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
  app:
    type: multi-container-workload
    properties:
      containers:
        - name: web
          packaging:
            type: stacktape-image-buildpack
            properties:
              entryfilePath: src/index.ts
          events:
            - type: application-load-balancer
              properties:
                loadBalancerName: appLb
                priority: 1
                containerPort: 3000
          loadBalancerHealthCheck:
            healthcheckPath: /health
            healthcheckTimeout: 3
      resources:
        cpu: 0.5
        memory: 1024
  appLb:
    type: application-load-balancer
```

### Example 2 (typescript)

```typescript
import { MultiContainerWorkload, ApplicationLoadBalancer, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const appLb = new ApplicationLoadBalancer({});
  const app = new MultiContainerWorkload({
    containers: [
      {
        name: 'web',
        packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/index.ts' }),
        events: [
          { type: 'application-load-balancer', properties: { loadBalancerName: 'appLb', priority: 1, containerPort: 3000 } }
        ],
        loadBalancerHealthCheck: {
          healthcheckPath: '/health',
          healthcheckTimeout: 3
        }
      }
    ],
    resources: { cpu: 0.5, memory: 1024 }
  });
  return { resources: { app, appLb } };
});
```
