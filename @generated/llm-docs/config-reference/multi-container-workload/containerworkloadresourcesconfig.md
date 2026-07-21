# ContainerWorkloadResourcesConfig API Reference

Resource type: `multi-container-workload`

## TypeScript definition

```typescript
type ContainerWorkloadResourcesConfig = {
  /** CPU architecture for Fargate. arm64 is ~20% cheaper. Ignored when using instanceTypes. */
  architecture?: "arm64" | "x86_64";
  /** vCPUs for the workload (Fargate). Ignored when using instanceTypes. */
  cpu?: 0.25 | 0.5 | 1 | 16 | 2 | 4 | 8;
  /** Keep pre-initialized EC2 instances ready for faster scaling. Only works with a single instance type. */
  enableWarmPool?: boolean;
  /** EC2 instance types for the workload (e.g., t3.medium, c6g.large). Use instead of cpu/memory. */
  instanceTypes?: Array<string>;
  /** Memory in MB. Must be compatible with the vCPU count on Fargate. */
  memory?: number;
};
```

## Property: `architecture`

- Required: no
- Type: `string: "arm64" | "x86_64"`
- Default: `'x86_64'`

CPU architecture for Fargate. `arm64` is ~20% cheaper. Ignored when using `instanceTypes`.

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
        architecture: arm64
```

### Example 2 (typescript)

```typescript
import { MultiContainerWorkload, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const app = new MultiContainerWorkload({
    containers: [
      { name: 'api', packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }) }
    ],
    resources: {
      cpu: 0.5,
      memory: 1024,
      architecture: 'arm64'
    }
  });
  return { resources: { app } };
});
```

## Property: `cpu`

- Required: no
- Type: `number: 0.25 | 0.5 | 1 | 16 | 2 | 4 | 8`

vCPUs for the workload (Fargate). Ignored when using `instanceTypes`.

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
        cpu: 2
        memory: 4096
```

### Example 2 (typescript)

```typescript
import { MultiContainerWorkload, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const app = new MultiContainerWorkload({
    containers: [
      { name: 'api', packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }) }
    ],
    resources: {
      cpu: 2,
      memory: 4096
    }
  });
  return { resources: { app } };
});
```

## Property: `enableWarmPool`

- Required: no
- Type: `boolean`

Keep pre-initialized EC2 instances ready for faster scaling. Only works with a single instance type.

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
        instanceTypes:
          - t3.medium
        enableWarmPool: true
```

### Example 2 (typescript)

```typescript
import { MultiContainerWorkload, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const app = new MultiContainerWorkload({
    containers: [
      { name: 'api', packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }) }
    ],
    resources: {
      instanceTypes: ['t3.medium'],
      enableWarmPool: true
    }
  });
  return { resources: { app } };
});
```

## Property: `instanceTypes`

- Required: no
- Type: `Array<string>`

EC2 instance types for the workload (e.g., `t3.medium`, `c6g.large`). Use instead of `cpu`/`memory`.

First type in the list is preferred. Instances auto-scale and are refreshed weekly for patching.
Tip: specify a single type and omit `cpu`/`memory` for optimal sizing.

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
        instanceTypes:
          - c6g.large
```

### Example 2 (typescript)

```typescript
import { MultiContainerWorkload, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const app = new MultiContainerWorkload({
    containers: [
      { name: 'api', packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }) }
    ],
    resources: {
      instanceTypes: ['c6g.large']
    }
  });
  return { resources: { app } };
});
```

## Property: `memory`

- Required: no
- Type: `number`

Memory in MB. Must be compatible with the vCPU count on Fargate.

Fargate valid combos: 0.25 vCPU → 512-2048 MB, 0.5 → 1024-4096, 1 → 2048-8192, 2 → 4096-16384,
4 → 8192-30720, 8 → 16384-61440, 16 → 32768-122880.
For EC2: auto-detected from instance type if omitted.

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
        cpu: 1
        memory: 4096
```

### Example 2 (typescript)

```typescript
import { MultiContainerWorkload, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const app = new MultiContainerWorkload({
    containers: [
      { name: 'api', packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }) }
    ],
    resources: {
      cpu: 1,
      memory: 4096
    }
  });
  return { resources: { app } };
});
```
