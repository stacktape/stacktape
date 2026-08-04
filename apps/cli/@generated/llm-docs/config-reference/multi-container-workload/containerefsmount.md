# ContainerEfsMount API Reference

Resource type: `multi-container-workload`

## TypeScript definition

```typescript
import type { ContainerEfsMountProps } from 'stacktape';

type ContainerEfsMount = {
  /** Properties for the EFS volume mount. */
  properties: ContainerEfsMountProps;
};
```

## Property: `properties`

- Required: yes
- Type: `ContainerEfsMountProps`

Properties for the EFS volume mount.

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
import { MultiContainerWorkload, EfsFilesystem, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const sharedStorage = new EfsFilesystem({});
  const app = new MultiContainerWorkload({
    containers: [
      {
        name: 'api',
        packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }),
        volumeMounts: [
          {
            type: 'efs',
            properties: { efsFilesystemName: 'sharedStorage', mountPath: '/data' }
          }
        ]
      }
    ],
    resources: { cpu: 0.5, memory: 1024 }
  });
  return { resources: { app, sharedStorage } };
});
```
