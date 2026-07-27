# WebServiceNlbLoadBalancingPort API Reference

Resource type: `web-service`

## TypeScript definition

```typescript
type WebServiceNlbLoadBalancingPort = {
  /** Public port exposed by the load balancer. */
  port: number;
  /** Port on the container that receives the traffic. Defaults to port. */
  containerPort?: number;
  /** Protocol: TLS (encrypted) or TCP (raw). */
  protocol?: "TCP" | "TLS";
};
```

## Property: `port`

- Required: yes
- Type: `number`

Public port exposed by the load balancer.

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
        ports: [
          {
            port: 443,
            containerPort: 8080,
            protocol: 'TLS'
          }
        ]
      }
    }
  });

  return {
    resources: { tcpService }
  };
});
```

## Property: `containerPort`

- Required: no
- Type: `number`

Port on the container that receives the traffic. Defaults to `port`.

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
          ports:
            - port: 443
              protocol: TLS
              containerPort: 8080
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
        ports: [
          {
            port: 443,
            protocol: 'TLS',
            containerPort: 8080
          }
        ]
      }
    }
  });

  return {
    resources: { tcpService }
  };
});
```

## Property: `protocol`

- Required: no
- Type: `string: "TCP" | "TLS"`
- Default: `TLS`

Protocol: `TLS` (encrypted) or `TCP` (raw).

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
          ports:
            - port: 8883
              containerPort: 1883
              protocol: TCP
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
        ports: [
          {
            port: 8883,
            containerPort: 1883,
            protocol: 'TCP'
          }
        ]
      }
    }
  });

  return {
    resources: { tcpService }
  };
});
```
