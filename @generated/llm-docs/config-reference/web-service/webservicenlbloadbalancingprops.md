# WebServiceNlbLoadBalancingProps API Reference

Resource type: `web-service`

## TypeScript definition

```typescript
import type { WebServiceNlbLoadBalancingPort } from 'stacktape';

type WebServiceNlbLoadBalancingProps = {
  ports: Array<WebServiceNlbLoadBalancingPort>;
  /** Seconds between health checks (5-300). */
  healthcheckInterval?: number;
  /** Health check path (only used when healthCheckProtocol is HTTP). */
  healthcheckPath?: string;
  /** Health check port. Defaults to the traffic port. */
  healthCheckPort?: number;
  /** Health check protocol: TCP (port check) or HTTP (path check). */
  healthCheckProtocol?: "HTTP" | "TCP";
  /** Seconds before a health check is considered failed (2-120). */
  healthcheckTimeout?: number;
};
```

## Property: `ports`

- Required: yes
- Type: `Array<WebServiceNlbLoadBalancingPort>`

## Property: `healthcheckInterval`

- Required: no
- Type: `number`
- Default: `5`

Seconds between health checks (5-300).

### Example 1 (yaml)

```yaml
resources:
  tcpService:
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
        type: network-load-balancer
        properties:
          healthcheckInterval: 30
          ports:
            - port: 443
              containerPort: 8080
              protocol: TLS
```

### Example 2 (typescript)

```typescript
import { defineConfig, WebService, StacktapeImageBuildpackPackaging } from 'stacktape';

export default defineConfig(() => {
  const tcpService = new WebService({
    packaging: new StacktapeImageBuildpackPackaging({
      entryfilePath: 'src/main.ts'
    }),
    resources: {
      cpu: 1,
      memory: 2048
    },
    loadBalancing: {
      type: 'network-load-balancer',
      properties: {
        healthcheckInterval: 30,
        ports: [{ port: 443, containerPort: 8080, protocol: 'TLS' }]
      }
    }
  });

  return {
    resources: { tcpService }
  };
});
```

## Property: `healthcheckPath`

- Required: no
- Type: `string`
- Default: `/`

Health check path (only used when `healthCheckProtocol` is `HTTP`).

### Example 1 (yaml)

```yaml
resources:
  tcpService:
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
        type: network-load-balancer
        properties:
          healthCheckProtocol: HTTP
          healthcheckPath: /health
          ports:
            - port: 443
              containerPort: 8080
              protocol: TLS
```

### Example 2 (typescript)

```typescript
import { defineConfig, WebService, StacktapeImageBuildpackPackaging } from 'stacktape';

export default defineConfig(() => {
  const tcpService = new WebService({
    packaging: new StacktapeImageBuildpackPackaging({
      entryfilePath: 'src/main.ts'
    }),
    resources: {
      cpu: 1,
      memory: 2048
    },
    loadBalancing: {
      type: 'network-load-balancer',
      properties: {
        healthCheckProtocol: 'HTTP',
        healthcheckPath: '/health',
        ports: [{ port: 443, containerPort: 8080, protocol: 'TLS' }]
      }
    }
  });

  return {
    resources: { tcpService }
  };
});
```

## Property: `healthCheckPort`

- Required: no
- Type: `number`

Health check port. Defaults to the traffic port.

### Example 1 (yaml)

```yaml
resources:
  tcpService:
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
        type: network-load-balancer
        properties:
          healthCheckProtocol: TCP
          healthCheckPort: 8081
          ports:
            - port: 443
              containerPort: 8080
              protocol: TLS
```

### Example 2 (typescript)

```typescript
import { defineConfig, WebService, StacktapeImageBuildpackPackaging } from 'stacktape';

export default defineConfig(() => {
  const tcpService = new WebService({
    packaging: new StacktapeImageBuildpackPackaging({
      entryfilePath: 'src/main.ts'
    }),
    resources: {
      cpu: 1,
      memory: 2048
    },
    loadBalancing: {
      type: 'network-load-balancer',
      properties: {
        healthCheckProtocol: 'TCP',
        healthCheckPort: 8081,
        ports: [{ port: 443, containerPort: 8080, protocol: 'TLS' }]
      }
    }
  });

  return {
    resources: { tcpService }
  };
});
```

## Property: `healthCheckProtocol`

- Required: no
- Type: `string: "HTTP" | "TCP"`
- Default: `TCP`

Health check protocol: `TCP` (port check) or `HTTP` (path check).

### Example 1 (yaml)

```yaml
resources:
  tcpService:
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
        type: network-load-balancer
        properties:
          healthCheckProtocol: HTTP
          healthcheckPath: /health
          ports:
            - port: 443
              containerPort: 8080
              protocol: TLS
```

### Example 2 (typescript)

```typescript
import { defineConfig, WebService, StacktapeImageBuildpackPackaging } from 'stacktape';

export default defineConfig(() => {
  const tcpService = new WebService({
    packaging: new StacktapeImageBuildpackPackaging({
      entryfilePath: 'src/main.ts'
    }),
    resources: {
      cpu: 1,
      memory: 2048
    },
    loadBalancing: {
      type: 'network-load-balancer',
      properties: {
        healthCheckProtocol: 'HTTP',
        healthcheckPath: '/health',
        ports: [{ port: 443, containerPort: 8080, protocol: 'TLS' }]
      }
    }
  });

  return {
    resources: { tcpService }
  };
});
```

## Property: `healthcheckTimeout`

- Required: no
- Type: `number`
- Default: `4`

Seconds before a health check is considered failed (2-120).

### Example 1 (yaml)

```yaml
resources:
  tcpService:
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
        type: network-load-balancer
        properties:
          healthcheckInterval: 30
          healthcheckTimeout: 10
          ports:
            - port: 443
              containerPort: 8080
              protocol: TLS
```

### Example 2 (typescript)

```typescript
import { defineConfig, WebService, StacktapeImageBuildpackPackaging } from 'stacktape';

export default defineConfig(() => {
  const tcpService = new WebService({
    packaging: new StacktapeImageBuildpackPackaging({
      entryfilePath: 'src/main.ts'
    }),
    resources: {
      cpu: 1,
      memory: 2048
    },
    loadBalancing: {
      type: 'network-load-balancer',
      properties: {
        healthcheckInterval: 30,
        healthcheckTimeout: 10,
        ports: [{ port: 443, containerPort: 8080, protocol: 'TLS' }]
      }
    }
  });

  return {
    resources: { tcpService }
  };
});
```
