# ContainerWorkloadScalingPolicy API Reference

Resource type: `multi-container-workload`

## TypeScript definition

```typescript
type ContainerWorkloadScalingPolicy = {
  /** Scale out when avg CPU exceeds this %, scale in when it drops below. */
  keepAvgCpuUtilizationUnder?: number;
  /** Scale out when avg memory exceeds this %, scale in when it drops below. */
  keepAvgMemoryUtilizationUnder?: number;
};
```

## Property: `keepAvgCpuUtilizationUnder`

- Required: no
- Type: `number`
- Default: `80`

Scale out when avg CPU exceeds this %, scale in when it drops below.

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
          keepAvgCpuUtilizationUnder: 65
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
      scalingPolicy: {
        keepAvgCpuUtilizationUnder: 65
      }
    }
  });
  return { resources: { app } };
});
```

## Property: `keepAvgMemoryUtilizationUnder`

- Required: no
- Type: `number`
- Default: `80`

Scale out when avg memory exceeds this %, scale in when it drops below.

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
          keepAvgMemoryUtilizationUnder: 70
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
      scalingPolicy: {
        keepAvgMemoryUtilizationUnder: 70
      }
    }
  });
  return { resources: { app } };
});
```
