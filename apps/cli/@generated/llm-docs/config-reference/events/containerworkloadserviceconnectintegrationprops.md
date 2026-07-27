# ContainerWorkloadServiceConnectIntegrationProps API Reference

## TypeScript definition

```typescript
type ContainerWorkloadServiceConnectIntegrationProps = {
  /** The container port to open for service-to-service communication. */
  containerPort: number;
  /** An alias for this service, used for service discovery. */
  alias?: string;
  /** The protocol used for service-to-service communication. */
  protocol?: "grpc" | "http" | "http2";
};
```

## Property: `containerPort`

- Required: yes
- Type: `number`

The container port to open for service-to-service communication.

### Example 1 (yaml)

```yaml
resources:
  appWorkload:
    type: multi-container-workload
    properties:
      resources:
        cpu: 0.5
        memory: 1024
      containers:
        - name: web
          packaging:
            type: prebuilt-image
            properties:
              image: 'my-org/web-app:latest'
          events:
            - type: service-connect
              properties:
                containerPort: 8080
                alias: web-api
                protocol: http
```

### Example 2 (typescript)

```typescript
import { MultiContainerWorkload, defineConfig } from 'stacktape';
export default defineConfig(() => {
  const appWorkload = new MultiContainerWorkload({
    resources: { cpu: 0.5, memory: 1024 },
    containers: [
      {
        name: 'web',
        packaging: { type: 'prebuilt-image', properties: { image: 'my-org/web-app:latest' } },
        events: [
          {
            type: 'service-connect',
            properties: {
              containerPort: 8080,
              alias: 'web-api',
              protocol: 'http'
            }
          }
        ]
      }
    ]
  });
  return { resources: { appWorkload } };
});
```

## Property: `alias`

- Required: no
- Type: `string`

An alias for this service, used for service discovery.

Other resources in the stack can connect to this service using a URL like `protocol://alias:port` (e.g., `http://my-service:8080`).
By default, the alias is derived from the resource and container names (e.g., `my-resource-my-container`).

### Example 1 (yaml)

```yaml
resources:
  appWorkload:
    type: multi-container-workload
    properties:
      resources:
        cpu: 0.5
        memory: 1024
      containers:
        - name: web
          packaging:
            type: prebuilt-image
            properties:
              image: 'my-org/web-app:latest'
          events:
            - type: service-connect
              properties:
                containerPort: 8080
                alias: web-api
                protocol: http
```

### Example 2 (typescript)

```typescript
import { MultiContainerWorkload, defineConfig } from 'stacktape';
export default defineConfig(() => {
  const appWorkload = new MultiContainerWorkload({
    resources: { cpu: 0.5, memory: 1024 },
    containers: [
      {
        name: 'web',
        packaging: { type: 'prebuilt-image', properties: { image: 'my-org/web-app:latest' } },
        events: [
          {
            type: 'service-connect',
            properties: {
              containerPort: 8080,
              alias: 'web-api',
              protocol: 'http'
            }
          }
        ]
      }
    ]
  });
  return { resources: { appWorkload } };
});
```

## Property: `protocol`

- Required: no
- Type: `string: "grpc" | "http" | "http2"`

The protocol used for service-to-service communication.

Specifying the protocol allows AWS to capture protocol-specific metrics, such as the number of HTTP 5xx errors.

### Example 1 (yaml)

```yaml
resources:
  appWorkload:
    type: multi-container-workload
    properties:
      resources:
        cpu: 0.5
        memory: 1024
      containers:
        - name: web
          packaging:
            type: prebuilt-image
            properties:
              image: 'my-org/web-app:latest'
          events:
            - type: service-connect
              properties:
                containerPort: 8080
                alias: web-api
                protocol: http
```

### Example 2 (typescript)

```typescript
import { MultiContainerWorkload, defineConfig } from 'stacktape';
export default defineConfig(() => {
  const appWorkload = new MultiContainerWorkload({
    resources: { cpu: 0.5, memory: 1024 },
    containers: [
      {
        name: 'web',
        packaging: { type: 'prebuilt-image', properties: { image: 'my-org/web-app:latest' } },
        events: [
          {
            type: 'service-connect',
            properties: {
              containerPort: 8080,
              alias: 'web-api',
              protocol: 'http'
            }
          }
        ]
      }
    ]
  });
  return { resources: { appWorkload } };
});
```
