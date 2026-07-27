# PrivateServiceLoadBalancing API Reference

Resource type: `private-service`

## TypeScript definition

```typescript
type PrivateServiceLoadBalancing = {
  type: "application-load-balancer" | "service-connect";
};
```

## Property: `type`

- Required: yes
- Type: `string: "application-load-balancer" | "service-connect"`

**Example (YAML):**

```yaml
resources:
  notificationsService:
    type: private-service
    properties:
      packaging:
        type: stacktape-image-buildpack
        properties:
          entryfilePath: src/notifications.ts
      port: 3000
      resources:
        cpu: 1
        memory: 1024
      loadBalancing:
        type: service-connect
```

**Example (TypeScript):**

```ts
import { PrivateService, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const notificationsService = new PrivateService({
    packaging: {
      type: 'stacktape-image-buildpack',
      properties: {
        entryfilePath: 'src/notifications.ts'
      }
    },
    port: 3000,
    resources: {
      cpu: 1,
      memory: 1024
    },
    loadBalancing: {
      type: 'service-connect'
    }
  });

  return { resources: { notificationsService } };
});
```

### Example 1 (yaml)

```yaml
resources:
  notificationsService:
    type: private-service
    properties:
      packaging:
        type: stacktape-image-buildpack
        properties:
          entryfilePath: src/notifications.ts
      port: 3000
      resources:
        cpu: 1
        memory: 1024
      loadBalancing:
        type: service-connect
```

### Example 2 (typescript)

```typescript
import { PrivateService, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const notificationsService = new PrivateService({
    packaging: {
      type: 'stacktape-image-buildpack',
      properties: {
        entryfilePath: 'src/notifications.ts'
      }
    },
    port: 3000,
    resources: {
      cpu: 1,
      memory: 1024
    },
    loadBalancing: {
      type: 'service-connect'
    }
  });

  return { resources: { notificationsService } };
});
```
