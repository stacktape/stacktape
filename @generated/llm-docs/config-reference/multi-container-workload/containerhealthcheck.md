# ContainerHealthCheck API Reference

Resource type: `multi-container-workload`

## TypeScript definition

```typescript
type ContainerHealthCheck = {
  /** Command to check health. E.g., ["CMD-SHELL", "curl -f http://localhost/ || exit 1"]. Exit 0 = healthy. */
  healthCheckCommand: Array<string>;
  /** Seconds between health checks (5-300). */
  intervalSeconds?: number;
  /** Consecutive failures before marking unhealthy (1-10). */
  retries?: number;
  /** Grace period (seconds) before counting failures. Gives the container time to start (0-300). */
  startPeriodSeconds?: number;
  /** Seconds before a check is considered failed (2-60). */
  timeoutSeconds?: number;
};
```

## Property: `healthCheckCommand`

- Required: yes
- Type: `Array<string>`

Command to check health. E.g., `["CMD-SHELL", "curl -f http://localhost/ || exit 1"]`. Exit 0 = healthy.

### Example 1 (yaml)

```yaml
resources:
  app:
    type: multi-container-workload
    properties:
      containers:
        - name: api
          packaging:
            type: stacktape-image-buildpack
            properties:
              entryfilePath: src/server.ts
          internalHealthCheck:
            healthCheckCommand:
              - CMD-SHELL
              - curl -f http://localhost:3000/ || exit 1
      resources:
        cpu: 0.5
        memory: 1024
```

### Example 2 (typescript)

```typescript
import { MultiContainerWorkload, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const app = new MultiContainerWorkload({
    containers: [
      {
        name: 'api',
        packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }),
        internalHealthCheck: {
          healthCheckCommand: ['CMD-SHELL', 'curl -f http://localhost:3000/ || exit 1']
        }
      }
    ],
    resources: { cpu: 0.5, memory: 1024 }
  });
  return { resources: { app } };
});
```

## Property: `intervalSeconds`

- Required: no
- Type: `number`
- Default: `30`

Seconds between health checks (5-300).

### Example 1 (yaml)

```yaml
resources:
  app:
    type: multi-container-workload
    properties:
      containers:
        - name: api
          packaging:
            type: stacktape-image-buildpack
            properties:
              entryfilePath: src/server.ts
          internalHealthCheck:
            healthCheckCommand:
              - CMD-SHELL
              - curl -f http://localhost:3000/ || exit 1
            intervalSeconds: 60
      resources:
        cpu: 0.5
        memory: 1024
```

### Example 2 (typescript)

```typescript
import { MultiContainerWorkload, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const app = new MultiContainerWorkload({
    containers: [
      {
        name: 'api',
        packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }),
        internalHealthCheck: {
          healthCheckCommand: ['CMD-SHELL', 'curl -f http://localhost:3000/ || exit 1'],
          intervalSeconds: 60
        }
      }
    ],
    resources: { cpu: 0.5, memory: 1024 }
  });
  return { resources: { app } };
});
```

## Property: `retries`

- Required: no
- Type: `number`
- Default: `3`

Consecutive failures before marking unhealthy (1-10).

### Example 1 (yaml)

```yaml
resources:
  app:
    type: multi-container-workload
    properties:
      containers:
        - name: api
          packaging:
            type: stacktape-image-buildpack
            properties:
              entryfilePath: src/server.ts
          internalHealthCheck:
            healthCheckCommand:
              - CMD-SHELL
              - curl -f http://localhost:3000/ || exit 1
            retries: 5
      resources:
        cpu: 0.5
        memory: 1024
```

### Example 2 (typescript)

```typescript
import { MultiContainerWorkload, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const app = new MultiContainerWorkload({
    containers: [
      {
        name: 'api',
        packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }),
        internalHealthCheck: {
          healthCheckCommand: ['CMD-SHELL', 'curl -f http://localhost:3000/ || exit 1'],
          retries: 5
        }
      }
    ],
    resources: { cpu: 0.5, memory: 1024 }
  });
  return { resources: { app } };
});
```

## Property: `startPeriodSeconds`

- Required: no
- Type: `number`

Grace period (seconds) before counting failures. Gives the container time to start (0-300).

### Example 1 (yaml)

```yaml
resources:
  app:
    type: multi-container-workload
    properties:
      containers:
        - name: api
          packaging:
            type: stacktape-image-buildpack
            properties:
              entryfilePath: src/server.ts
          internalHealthCheck:
            healthCheckCommand:
              - CMD-SHELL
              - curl -f http://localhost:3000/ || exit 1
            startPeriodSeconds: 60
      resources:
        cpu: 0.5
        memory: 1024
```

### Example 2 (typescript)

```typescript
import { MultiContainerWorkload, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const app = new MultiContainerWorkload({
    containers: [
      {
        name: 'api',
        packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }),
        internalHealthCheck: {
          healthCheckCommand: ['CMD-SHELL', 'curl -f http://localhost:3000/ || exit 1'],
          startPeriodSeconds: 60
        }
      }
    ],
    resources: { cpu: 0.5, memory: 1024 }
  });
  return { resources: { app } };
});
```

## Property: `timeoutSeconds`

- Required: no
- Type: `number`
- Default: `5`

Seconds before a check is considered failed (2-60).

### Example 1 (yaml)

```yaml
resources:
  app:
    type: multi-container-workload
    properties:
      containers:
        - name: api
          packaging:
            type: stacktape-image-buildpack
            properties:
              entryfilePath: src/server.ts
          internalHealthCheck:
            healthCheckCommand:
              - CMD-SHELL
              - curl -f http://localhost:3000/ || exit 1
            timeoutSeconds: 10
      resources:
        cpu: 0.5
        memory: 1024
```

### Example 2 (typescript)

```typescript
import { MultiContainerWorkload, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const app = new MultiContainerWorkload({
    containers: [
      {
        name: 'api',
        packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }),
        internalHealthCheck: {
          healthCheckCommand: ['CMD-SHELL', 'curl -f http://localhost:3000/ || exit 1'],
          timeoutSeconds: 10
        }
      }
    ],
    resources: { cpu: 0.5, memory: 1024 }
  });
  return { resources: { app } };
});
```
