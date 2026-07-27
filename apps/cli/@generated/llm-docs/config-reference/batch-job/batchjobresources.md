# BatchJobResources API Reference

Resource type: `batch-job`

## TypeScript definition

```typescript
type BatchJobResources = {
  /** Number of vCPUs for the job (e.g., 1, 2, 4). */
  cpu: number;
  /** Memory in MB. Use slightly less than powers of 2 for efficient instance sizing. */
  memory: number;
  /** Number of GPUs. The job will run on a GPU instance (NVIDIA A100, A10G, etc.). */
  gpu?: number;
};
```

## Property: `cpu`

- Required: yes
- Type: `number`

Number of vCPUs for the job (e.g., 1, 2, 4).

### Example 1 (yaml)

```yaml
resources:
  computeJob:
    type: batch-job
    properties:
      container:
        packaging:
          type: stacktape-image-buildpack
          properties:
            entryfilePath: src/compute.ts
      resources:
        cpu: 4
        memory: 7680
```

### Example 2 (typescript)

```typescript
import { BatchJob, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const computeJob = new BatchJob({
    container: {
      packaging: {
        type: 'stacktape-image-buildpack',
        properties: { entryfilePath: 'src/compute.ts' }
      }
    },
    resources: {
      cpu: 4,
      memory: 7680
    }
  });
  return { resources: { computeJob } };
});
```

## Property: `memory`

- Required: yes
- Type: `number`

Memory in MB. Use slightly less than powers of 2 for efficient instance sizing.

AWS reserves some memory for system processes. Requesting exactly 8192 MB (8 GB) may provision
a larger instance than needed. Use 7680 MB instead to fit on a standard 8 GB instance.

### Example 1 (yaml)

```yaml
resources:
  memoryJob:
    type: batch-job
    properties:
      container:
        packaging:
          type: stacktape-image-buildpack
          properties:
            entryfilePath: src/compute.ts
      resources:
        cpu: 2
        memory: 7680
```

### Example 2 (typescript)

```typescript
import { BatchJob, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const memoryJob = new BatchJob({
    container: {
      packaging: {
        type: 'stacktape-image-buildpack',
        properties: { entryfilePath: 'src/compute.ts' }
      }
    },
    resources: {
      cpu: 2,
      memory: 7680
    }
  });
  return { resources: { memoryJob } };
});
```

## Property: `gpu`

- Required: no
- Type: `number`

Number of GPUs. The job will run on a GPU instance (NVIDIA A100, A10G, etc.).

Omit for CPU-only workloads.

### Example 1 (yaml)

```yaml
resources:
  inferenceJob:
    type: batch-job
    properties:
      container:
        packaging:
          type: stacktape-image-buildpack
          properties:
            entryfilePath: src/infer.ts
      resources:
        cpu: 4
        memory: 15360
        gpu: 1
```

### Example 2 (typescript)

```typescript
import { BatchJob, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const inferenceJob = new BatchJob({
    container: {
      packaging: {
        type: 'stacktape-image-buildpack',
        properties: { entryfilePath: 'src/infer.ts' }
      }
    },
    resources: {
      cpu: 4,
      memory: 15360,
      gpu: 1
    }
  });
  return { resources: { inferenceJob } };
});
```
