# ConvexDashboardConfig API Reference

## TypeScript definition

```typescript
import type { ContainerWorkloadContainerLogging, ContainerWorkloadResourcesConfig } from 'stacktape';

type ConvexDashboardConfig = {
  /** CIDR ranges allowed to reach the dashboard. By default the dashboard is internet-reachable. */
  allowedIpRanges?: Array<string>;
  /** Whether to provision the admin dashboard. */
  enabled?: boolean;
  /** Pinned Convex dashboard Docker image. */
  image?: string;
  /** Logging configuration for the dashboard container. */
  logging?: ContainerWorkloadContainerLogging;
  /** CPU, memory, and compute engine for the dashboard container. */
  resources?: ContainerWorkloadResourcesConfig;
};
```

## Property: `allowedIpRanges`

- Required: no
- Type: `Array<string>`

CIDR ranges allowed to reach the dashboard. By default the dashboard is internet-reachable.

The dashboard has no built-in authentication — the admin key (which you paste on login) is
the only security barrier. Convex's admin key is high-entropy and is the same model managed
Convex uses, but if you want defense-in-depth, pin access to your office IPs or VPN range.

Example: `allowedIpRanges: ['203.0.113.0/24', '198.51.100.42/32']`.

### Example 1 (yaml)

```yaml
resources:
  backend:
    type: convex
    properties:
      appDirectory: ./convex
      dashboard:
        enabled: true
        allowedIpRanges:
          - 203.0.113.0/24
          - 198.51.100.42/32
```

### Example 2 (typescript)

```typescript
import { Convex, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const backend = new Convex({
    appDirectory: './convex',
    dashboard: {
      enabled: true,
      allowedIpRanges: ['203.0.113.0/24', '198.51.100.42/32']
    }
  });
  return { resources: { backend } };
});
```

## Property: `enabled`

- Required: no
- Type: `boolean`
- Default: `true`

Whether to provision the admin dashboard.

The dashboard is a small stateless Next.js app (~$3–5/month at default sizing) that gives
you a data browser, log viewer, function REPL, env-var manager, and snapshot export/import
UI. Disable only if you have a strong reason — self-hosted Convex without the dashboard is
operationally painful.

### Example 1 (yaml)

```yaml
resources:
  backend:
    type: convex
    properties:
      appDirectory: ./convex
      dashboard:
        enabled: false
```

### Example 2 (typescript)

```typescript
import { Convex, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const backend = new Convex({
    appDirectory: './convex',
    dashboard: {
      enabled: false
    }
  });
  return { resources: { backend } };
});
```

## Property: `image`

- Required: no
- Type: `string`

Pinned Convex dashboard Docker image.

Defaults to a known-good version pinned by Stacktape (currently from `ghcr.io/get-convex/convex-dashboard`).
Override to test newer/older versions.

### Example 1 (yaml)

```yaml
resources:
  backend:
    type: convex
    properties:
      appDirectory: ./convex
      dashboard:
        enabled: true
        image: ghcr.io/get-convex/convex-dashboard:0a8d9ae0f0e5c6c9c0c0c0c0
```

### Example 2 (typescript)

```typescript
import { Convex, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const backend = new Convex({
    appDirectory: './convex',
    dashboard: {
      enabled: true,
      image: 'ghcr.io/get-convex/convex-dashboard:0a8d9ae0f0e5c6c9c0c0c0c0'
    }
  });
  return { resources: { backend } };
});
```

## Property: `logging`

- Required: no
- Type: `ContainerWorkloadContainerLogging`

Logging configuration for the dashboard container.

### Example 1 (yaml)

```yaml
resources:
  backend:
    type: convex
    properties:
      appDirectory: ./convex
      dashboard:
        enabled: true
        logging:
          retentionDays: 7
```

### Example 2 (typescript)

```typescript
import { Convex, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const backend = new Convex({
    appDirectory: './convex',
    dashboard: {
      enabled: true,
      logging: {
        retentionDays: 7
      }
    }
  });
  return { resources: { backend } };
});
```

## Property: `resources`

- Required: no
- Type: `ContainerWorkloadResourcesConfig`

CPU, memory, and compute engine for the dashboard container.

Defaults to `{ cpu: 0.25, memory: 512 }`. The dashboard is a Next.js app and is very light —
`{ cpu: 0.25, memory: 512 }` is plenty for most teams.

### Example 1 (yaml)

```yaml
resources:
  backend:
    type: convex
    properties:
      appDirectory: ./convex
      dashboard:
        enabled: true
        resources:
          cpu: 0.5
          memory: 1024
```

### Example 2 (typescript)

```typescript
import { Convex, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const backend = new Convex({
    appDirectory: './convex',
    dashboard: {
      enabled: true,
      resources: {
        cpu: 0.5,
        memory: 1024
      }
    }
  });
  return { resources: { backend } };
});
```
