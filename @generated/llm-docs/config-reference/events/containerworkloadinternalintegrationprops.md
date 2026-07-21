# ContainerWorkloadInternalIntegrationProps API Reference

## TypeScript definition

```typescript
type ContainerWorkloadInternalIntegrationProps = {
  /** The container port to open for internal traffic. */
  containerPort: number;
};
```

## Property: `containerPort`

- Required: yes
- Type: `number`

The container port to open for internal traffic.

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
        - name: metrics
          essential: false
          packaging:
            type: prebuilt-image
            properties:
              image: 'my-org/metrics-sidecar:latest'
          events:
            - type: workload-internal
              properties:
                containerPort: 9090
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
        packaging: { type: 'prebuilt-image', properties: { image: 'my-org/web-app:latest' } }
      },
      {
        name: 'metrics',
        essential: false,
        packaging: { type: 'prebuilt-image', properties: { image: 'my-org/metrics-sidecar:latest' } },
        events: [
          {
            type: 'workload-internal',
            properties: {
              containerPort: 9090
            }
          }
        ]
      }
    ]
  });
  return { resources: { appWorkload } };
});
```
