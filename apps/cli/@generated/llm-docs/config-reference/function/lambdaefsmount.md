# LambdaEfsMount API Reference

Resource type: `function`

## TypeScript definition

```typescript
import type { LambdaEfsMountProps } from 'stacktape';

type LambdaEfsMount = {
  /** Properties for the EFS volume mount. */
  properties: LambdaEfsMountProps;
};
```

## Property: `properties`

- Required: yes
- Type: `LambdaEfsMountProps`

Properties for the EFS volume mount.

### Example 1 (yaml)

```yaml
resources:
  mediaProcessor:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/media.ts
      joinDefaultVpc: true
      volumeMounts:
        - type: efs
          properties:
            efsFilesystemName: mediaStore
            mountPath: /mnt/media
  mediaStore:
    type: efs-filesystem
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, EfsFilesystem, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const mediaProcessor = new LambdaFunction({
    packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/media.ts' } },
    joinDefaultVpc: true,
    volumeMounts: [
      {
        type: 'efs',
        properties: { efsFilesystemName: 'mediaStore', mountPath: '/mnt/media' }
      }
    ]
  });
  const mediaStore = new EfsFilesystem({});
  return { resources: { mediaProcessor, mediaStore } };
});
```
