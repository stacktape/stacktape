# BatchJobRetryConfiguration API Reference

Resource type: `batch-job`

## TypeScript definition

```typescript
type BatchJobRetryConfiguration = {
  /** Max retry attempts before the job is marked as failed. */
  attempts?: number;
  /** Multiply wait time by this factor after each retry (exponential backoff). */
  retryIntervalMultiplier?: number;
  /** Seconds to wait between retries. */
  retryIntervalSeconds?: number;
};
```

## Property: `attempts`

- Required: no
- Type: `number`
- Default: `1`

Max retry attempts before the job is marked as failed.

### Example 1 (yaml)

```yaml
resources:
  batchProcessor:
    type: batch-job
    properties:
      container:
        packaging:
          type: stacktape-image-buildpack
          properties:
            entryfilePath: src/process.ts
      resources:
        cpu: 2
        memory: 3840
      retryConfig:
        attempts: 3
```

### Example 2 (typescript)

```typescript
import { BatchJob, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const batchProcessor = new BatchJob({
    container: {
      packaging: {
        type: 'stacktape-image-buildpack',
        properties: { entryfilePath: 'src/process.ts' }
      }
    },
    resources: { cpu: 2, memory: 3840 },
    retryConfig: {
      attempts: 3
    }
  });
  return { resources: { batchProcessor } };
});
```

## Property: `retryIntervalMultiplier`

- Required: no
- Type: `number`
- Default: `1`

Multiply wait time by this factor after each retry (exponential backoff).

E.g., with `retryIntervalSeconds: 5` and `retryIntervalMultiplier: 2`, waits are 5s, 10s, 20s, etc.

### Example 1 (yaml)

```yaml
resources:
  batchProcessor:
    type: batch-job
    properties:
      container:
        packaging:
          type: stacktape-image-buildpack
          properties:
            entryfilePath: src/process.ts
      resources:
        cpu: 2
        memory: 3840
      retryConfig:
        attempts: 4
        retryIntervalSeconds: 5
        retryIntervalMultiplier: 2
```

### Example 2 (typescript)

```typescript
import { BatchJob, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const batchProcessor = new BatchJob({
    container: {
      packaging: {
        type: 'stacktape-image-buildpack',
        properties: { entryfilePath: 'src/process.ts' }
      }
    },
    resources: { cpu: 2, memory: 3840 },
    retryConfig: {
      attempts: 4,
      retryIntervalSeconds: 5,
      retryIntervalMultiplier: 2
    }
  });
  return { resources: { batchProcessor } };
});
```

## Property: `retryIntervalSeconds`

- Required: no
- Type: `number`
- Default: `0`

Seconds to wait between retries.

### Example 1 (yaml)

```yaml
resources:
  batchProcessor:
    type: batch-job
    properties:
      container:
        packaging:
          type: stacktape-image-buildpack
          properties:
            entryfilePath: src/process.ts
      resources:
        cpu: 2
        memory: 3840
      retryConfig:
        attempts: 3
        retryIntervalSeconds: 10
```

### Example 2 (typescript)

```typescript
import { BatchJob, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const batchProcessor = new BatchJob({
    container: {
      packaging: {
        type: 'stacktape-image-buildpack',
        properties: { entryfilePath: 'src/process.ts' }
      }
    },
    resources: { cpu: 2, memory: 3840 },
    retryConfig: {
      attempts: 3,
      retryIntervalSeconds: 10
    }
  });
  return { resources: { batchProcessor } };
});
```
