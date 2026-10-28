# ContainerEfsMountProps API Reference

Resource type: `multi-container-workload`

## TypeScript definition

```typescript
type ContainerEfsMountProps = {
  /** Name of the `efs-filesystem` resource defined in your config. */
  efsFilesystemName: string;
  /** Absolute path inside the container where the volume is mounted (e.g., `/data`). */
  mountPath: string;
  /** Mount the volume read-only, so the container can read its files but not change them. */
  readOnly?: boolean;
  /** Subdirectory within the EFS filesystem to mount. Restricts access to that directory. */
  rootDirectory?: string;
};
```

## Property: `efsFilesystemName`

- Required: yes
- Type: `string`

Name of the `efs-filesystem` resource defined in your config.

### Example 1 (yaml)

```yaml
resources:
  app:
    type: multi-container-workload
    properties:
      containers:
        - name: api
          packaging:
            type: js-bundle
            properties:
              entryfilePath: src/server.ts
          volumeMounts:
            - type: efs
              properties:
                efsFilesystemName: sharedStorage
                mountPath: /data
      resources:
        cpu: 0.5
        memory: 1024
  sharedStorage:
    type: efs-filesystem
```

### Example 2 (typescript)

```typescript
import { MultiContainerWorkload, EfsFilesystem, defineConfig, JsBundleImagePackaging } from 'stacktape';

export default defineConfig(() => {
  const sharedStorage = new EfsFilesystem({});
  const app = new MultiContainerWorkload({
    containers: [
      {
        name: 'api',
        packaging: new JsBundleImagePackaging({ entryfilePath: 'src/server.ts' }),
        volumeMounts: [
          {
            type: 'efs',
            properties: {
              efsFilesystemName: 'sharedStorage',
              mountPath: '/data'
            }
          }
        ]
      }
    ],
    resources: { cpu: 0.5, memory: 1024 }
  });
  return { resources: { app, sharedStorage } };
});
```

## Property: `mountPath`

- Required: yes
- Type: `string`

Absolute path inside the container where the volume is mounted (e.g., `/data`).

### Example 1 (yaml)

```yaml
resources:
  app:
    type: multi-container-workload
    properties:
      containers:
        - name: api
          packaging:
            type: js-bundle
            properties:
              entryfilePath: src/server.ts
          volumeMounts:
            - type: efs
              properties:
                efsFilesystemName: sharedStorage
                mountPath: /data
      resources:
        cpu: 0.5
        memory: 1024
  sharedStorage:
    type: efs-filesystem
```

### Example 2 (typescript)

```typescript
import { MultiContainerWorkload, EfsFilesystem, defineConfig, JsBundleImagePackaging } from 'stacktape';

export default defineConfig(() => {
  const sharedStorage = new EfsFilesystem({});
  const app = new MultiContainerWorkload({
    containers: [
      {
        name: 'api',
        packaging: new JsBundleImagePackaging({ entryfilePath: 'src/server.ts' }),
        volumeMounts: [
          {
            type: 'efs',
            properties: {
              efsFilesystemName: 'sharedStorage',
              mountPath: '/data'
            }
          }
        ]
      }
    ],
    resources: { cpu: 0.5, memory: 1024 }
  });
  return { resources: { app, sharedStorage } };
});
```

## Property: `readOnly`

- Required: no
- Type: `boolean`
- Default: `false`

Mount the volume read-only, so the container can read its files but not change them.

Use it for a container that only consumes files another workload writes to the same filesystem.

## Property: `rootDirectory`

- Required: no
- Type: `string`
- Default: `/`

Subdirectory within the EFS filesystem to mount. Restricts access to that directory.

### Example 1 (yaml)

```yaml
resources:
  app:
    type: multi-container-workload
    properties:
      containers:
        - name: api
          packaging:
            type: js-bundle
            properties:
              entryfilePath: src/server.ts
          volumeMounts:
            - type: efs
              properties:
                efsFilesystemName: sharedStorage
                rootDirectory: /uploads
                mountPath: /data
      resources:
        cpu: 0.5
        memory: 1024
  sharedStorage:
    type: efs-filesystem
```

### Example 2 (typescript)

```typescript
import { MultiContainerWorkload, EfsFilesystem, defineConfig, JsBundleImagePackaging } from 'stacktape';

export default defineConfig(() => {
  const sharedStorage = new EfsFilesystem({});
  const app = new MultiContainerWorkload({
    containers: [
      {
        name: 'api',
        packaging: new JsBundleImagePackaging({ entryfilePath: 'src/server.ts' }),
        volumeMounts: [
          {
            type: 'efs',
            properties: {
              efsFilesystemName: 'sharedStorage',
              rootDirectory: '/uploads',
              mountPath: '/data'
            }
          }
        ]
      }
    ],
    resources: { cpu: 0.5, memory: 1024 }
  });
  return { resources: { app, sharedStorage } };
});
```
