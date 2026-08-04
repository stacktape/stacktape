# ContainerWorkloadScaling API Reference

Resource type: `multi-container-workload`

## TypeScript definition

```typescript
import type { ContainerWorkloadScalingPolicy } from 'stacktape';

type ContainerWorkloadScaling = {
  /** Maximum running instances. Traffic is distributed across all instances. */
  maxInstances?: number;
  /** Minimum running instances. Set to 0 is not supported — minimum is 1. */
  minInstances?: number;
  /** When to scale: CPU and/or memory utilization targets. */
  scalingPolicy?: ContainerWorkloadScalingPolicy;
};
```

## Property: `maxInstances`

- Required: no
- Type: `number`
- Default: `1`

Maximum running instances. Traffic is distributed across all instances.

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
      resources:
        cpu: 0.5
        memory: 1024
      scaling:
        minInstances: 2
        maxInstances: 8
```

### Example 2 (typescript)

```typescript
import { MultiContainerWorkload, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const app = new MultiContainerWorkload({
    containers: [
      { name: 'api', packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }) }
    ],
    resources: { cpu: 0.5, memory: 1024 },
    scaling: {
      minInstances: 2,
      maxInstances: 8
    }
  });
  return { resources: { app } };
});
```

## Property: `minInstances`

- Required: no
- Type: `number`
- Default: `1`

Minimum running instances. Set to 0 is not supported — minimum is 1.

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
      resources:
        cpu: 0.5
        memory: 1024
      scaling:
        minInstances: 2
        maxInstances: 8
```

### Example 2 (typescript)

```typescript
import { MultiContainerWorkload, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const app = new MultiContainerWorkload({
    containers: [
      { name: 'api', packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }) }
    ],
    resources: { cpu: 0.5, memory: 1024 },
    scaling: {
      minInstances: 2,
      maxInstances: 8
    }
  });
  return { resources: { app } };
});
```

## Property: `scalingPolicy`

- Required: no
- Type: `ContainerWorkloadScalingPolicy`

When to scale: CPU and/or memory utilization targets.

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
      resources:
        cpu: 0.5
        memory: 1024
      scaling:
        minInstances: 2
        maxInstances: 8
        scalingPolicy:
          keepAvgCpuUtilizationUnder: 60
          keepAvgMemoryUtilizationUnder: 75
```

### Example 2 (typescript)

```typescript
import { MultiContainerWorkload, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const app = new MultiContainerWorkload({
    containers: [
      { name: 'api', packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }) }
    ],
    resources: { cpu: 0.5, memory: 1024 },
    scaling: {
      minInstances: 2,
      maxInstances: 8,
      scalingPolicy: { keepAvgCpuUtilizationUnder: 60, keepAvgMemoryUtilizationUnder: 75 }
    }
  });
  return { resources: { app } };
});
```
