# ConvexBackendConfig API Reference

## TypeScript definition

```typescript
import type { ContainerWorkloadContainerLogging, ContainerWorkloadResourcesConfig } from 'stacktape';

type ConvexBackendConfig = {
  /** Allow SSH-like sessions into the running backend container for debugging. */
  enableRemoteSessions?: boolean;
  /** Pinned Convex backend Docker image. */
  image?: string;
  /** Logging configuration for the backend container. */
  logging?: ContainerWorkloadContainerLogging;
  /** CPU, memory, and compute engine for the backend container. */
  resources?: ContainerWorkloadResourcesConfig;
};
```

## Property: `enableRemoteSessions`

- Required: no
- Type: `boolean`

Allow SSH-like sessions into the running backend container for debugging.

Stacktape enables ECS Exec for Convex internally because it is required to generate the managed
admin key after the backend starts. This property is kept for compatibility with generic workload
controls and may be removed in a future Convex resource revision.

### Example 1 (yaml)

```yaml
resources:
  backend:
    type: convex
    properties:
      appDirectory: ./convex
      backend:
        enableRemoteSessions: true
```

### Example 2 (typescript)

```typescript
import { Convex, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const backend = new Convex({
    appDirectory: './convex',
    backend: {
      enableRemoteSessions: true
    }
  });
  return { resources: { backend } };
});
```

## Property: `image`

- Required: no
- Type: `string`

Pinned Convex backend Docker image.

Defaults to a known-good version pinned by Stacktape (currently from `ghcr.io/get-convex/convex-backend`).
Override to test newer/older versions. Image upgrades trigger Convex's in-place migration path.

Example: `image: 'ghcr.io/get-convex/convex-backend:0a8d9ae0f0e5c6c9c0c0c0c0'`

### Example 1 (yaml)

```yaml
resources:
  backend:
    type: convex
    properties:
      appDirectory: ./convex
      backend:
        image: ghcr.io/get-convex/convex-backend:0a8d9ae0f0e5c6c9c0c0c0c0
```

### Example 2 (typescript)

```typescript
import { Convex, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const backend = new Convex({
    appDirectory: './convex',
    backend: {
      image: 'ghcr.io/get-convex/convex-backend:0a8d9ae0f0e5c6c9c0c0c0c0'
    }
  });
  return { resources: { backend } };
});
```

## Property: `logging`

- Required: no
- Type: `ContainerWorkloadContainerLogging`

Logging configuration for the backend container.

Container `stdout`/`stderr` are sent to CloudWatch and retained for 90 days by default.
View logs with `stacktape logs `.

### Example 1 (yaml)

```yaml
resources:
  backend:
    type: convex
    properties:
      appDirectory: ./convex
      backend:
        logging:
          retentionDays: 14
```

### Example 2 (typescript)

```typescript
import { Convex, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const backend = new Convex({
    appDirectory: './convex',
    backend: {
      logging: {
        retentionDays: 14
      }
    }
  });
  return { resources: { backend } };
});
```

## Property: `resources`

- Required: no
- Type: `ContainerWorkloadResourcesConfig`

CPU, memory, and compute engine for the backend container.

Defaults to `{ cpu: 0.5, memory: 1024 }`. Override this for production traffic:

**Hobby / small dev**: `{ cpu: 0.5, memory: 1024 }` — fine for a few dozen concurrent users
**Production baseline**: `{ cpu: 1, memory: 2048 }` — handles hundreds of concurrent reactive subscribers
**Heavier production**: `{ cpu: 2, memory: 4096 }` or `{ cpu: 4, memory: 8192 }` — thousands of subscribers, vector search

For EC2 instead of Fargate, specify `instanceTypes` (e.g., `['c6g.large']`). EC2 is typically
cheaper per vCPU and supports `enableWarmPool: true` for faster cold-starts.

Convex backend is single-process — scale **vertically** (bigger box), not horizontally.

### Example 1 (yaml)

```yaml
resources:
  backend:
    type: convex
    properties:
      appDirectory: ./convex
      backend:
        resources:
          cpu: 4
          memory: 8192
          architecture: arm64
```

### Example 2 (typescript)

```typescript
import { Convex, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const backend = new Convex({
    appDirectory: './convex',
    backend: {
      resources: {
        cpu: 4,
        memory: 8192,
        architecture: 'arm64'
      }
    }
  });
  return { resources: { backend } };
});
```
