# EfsFilesystemProps API Reference

Resource type: `efs-filesystem`

## TypeScript definition

```typescript
type EfsFilesystemProps = {
  /** Enable daily automatic backups with 35-day retention. Incremental (only changes are copied). */
  backupEnabled?: boolean;
  /** Guaranteed throughput in MiB/s. Required when throughputMode is provisioned. */
  provisionedThroughputInMibps?: number;
  /** How throughput scales with your workload. */
  throughputMode?: "bursting" | "elastic" | "provisioned";
};
```

## Property: `backupEnabled`

- Required: no
- Type: `boolean`

Enable daily automatic backups with 35-day retention. Incremental (only changes are copied).

### Example 1 (yaml)

```yaml
resources:
  mediaStorage:
    type: efs-filesystem
    properties:
      backupEnabled: true
      throughputMode: elastic
  cmsWorkload:
    type: multi-container-workload
    properties:
      containers:
        - name: cms
          packaging:
            type: prebuilt-image
            properties:
              image: my-repo/cms
          volumeMounts:
            - type: efs
              properties:
                efsFilesystemName: mediaStorage
                mountPath: /var/www/uploads
      resources:
        cpu: 0.5
        memory: 1024
```

### Example 2 (typescript)

```typescript
import { EfsFilesystem, MultiContainerWorkload, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const mediaStorage = new EfsFilesystem({
    backupEnabled: true,
    throughputMode: 'elastic'
  });

  const cmsWorkload = new MultiContainerWorkload({
    containers: [
      {
        name: 'cms',
        packaging: { type: 'prebuilt-image', properties: { image: 'my-repo/cms' } },
        volumeMounts: [
          { type: 'efs', properties: { efsFilesystemName: 'mediaStorage', mountPath: '/var/www/uploads' } }
        ]
      }
    ],
    resources: { cpu: 0.5, memory: 1024 }
  });

  return { resources: { mediaStorage, cmsWorkload } };
});
```

## Property: `provisionedThroughputInMibps`

- Required: no
- Type: `number`

Guaranteed throughput in MiB/s. Required when `throughputMode` is `provisioned`.

E.g., `100` = 100 MiB/s. Additional fees apply based on the provisioned amount. Can be changed anytime.

### Example 1 (yaml)

```yaml
resources:
  highThroughputStorage:
    type: efs-filesystem
    properties:
      throughputMode: provisioned
      provisionedThroughputInMibps: 256
  dataWorkload:
    type: multi-container-workload
    properties:
      containers:
        - name: processor
          packaging:
            type: prebuilt-image
            properties:
              image: my-repo/data-processor
          volumeMounts:
            - type: efs
              properties:
                efsFilesystemName: highThroughputStorage
                mountPath: /shared
      resources:
        cpu: 4
        memory: 8192
```

### Example 2 (typescript)

```typescript
import { EfsFilesystem, MultiContainerWorkload, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const highThroughputStorage = new EfsFilesystem({
    throughputMode: 'provisioned',
    provisionedThroughputInMibps: 256
  });

  const dataWorkload = new MultiContainerWorkload({
    containers: [
      {
        name: 'processor',
        packaging: { type: 'prebuilt-image', properties: { image: 'my-repo/data-processor' } },
        volumeMounts: [
          { type: 'efs', properties: { efsFilesystemName: 'highThroughputStorage', mountPath: '/shared' } }
        ]
      }
    ],
    resources: { cpu: 4, memory: 8192 }
  });

  return { resources: { highThroughputStorage, dataWorkload } };
});
```

## Property: `throughputMode`

- Required: no
- Type: `string: "bursting" | "elastic" | "provisioned"`
- Default: `elastic`

How throughput scales with your workload.

**`elastic`** (recommended): Auto-scales throughput. Best for spiky workloads (web apps, CI/CD).
**`provisioned`**: Fixed throughput you set via `provisionedThroughputInMibps`. Best for steady high-throughput workloads.
**`bursting`**: Throughput scales with storage size (50 KiB/s per GiB). Can run out of burst credits.

### Example 1 (yaml)

```yaml
resources:
  modelStorage:
    type: efs-filesystem
    properties:
      backupEnabled: false
      throughputMode: provisioned
      provisionedThroughputInMibps: 100
  inferenceWorkload:
    type: multi-container-workload
    properties:
      containers:
        - name: inference
          packaging:
            type: prebuilt-image
            properties:
              image: my-repo/ml-inference
          volumeMounts:
            - type: efs
              properties:
                efsFilesystemName: modelStorage
                mountPath: /models
      resources:
        cpu: 2
        memory: 4096
```

### Example 2 (typescript)

```typescript
import { EfsFilesystem, MultiContainerWorkload, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const modelStorage = new EfsFilesystem({
    backupEnabled: false,
    throughputMode: 'provisioned',
    provisionedThroughputInMibps: 100
  });

  const inferenceWorkload = new MultiContainerWorkload({
    containers: [
      {
        name: 'inference',
        packaging: { type: 'prebuilt-image', properties: { image: 'my-repo/ml-inference' } },
        volumeMounts: [
          { type: 'efs', properties: { efsFilesystemName: 'modelStorage', mountPath: '/models' } }
        ]
      }
    ],
    resources: { cpu: 2, memory: 4096 }
  });

  return { resources: { modelStorage, inferenceWorkload } };
});
```
