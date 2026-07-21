# LambdaEfsMountProps API Reference

Resource type: `function`

## TypeScript definition

```typescript
type LambdaEfsMountProps = {
  /** Name of the efs-filesystem resource defined in your config. */
  efsFilesystemName: string;
  /** Path inside the function where the volume appears. Must start with /mnt/ (e.g., /mnt/data). */
  mountPath: string;
  /** Subdirectory within the EFS filesystem to mount. Omit for full access. */
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
        properties: {
          efsFilesystemName: 'mediaStore',
          mountPath: '/mnt/media'
        }
      }
    ]
  });
  const mediaStore = new EfsFilesystem({});
  return { resources: { mediaProcessor, mediaStore } };
});
```

## Property: `mountPath`

- Required: yes
- Type: `string`

Path inside the function where the volume appears. Must start with `/mnt/` (e.g., `/mnt/data`).

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
        properties: {
          efsFilesystemName: 'mediaStore',
          mountPath: '/mnt/media'
        }
      }
    ]
  });
  const mediaStore = new EfsFilesystem({});
  return { resources: { mediaProcessor, mediaStore } };
});
```

## Property: `rootDirectory`

- Required: no
- Type: `string`
- Default: `/`

Subdirectory within the EFS filesystem to mount. Omit for full access.

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
            rootDirectory: /uploads
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
        properties: {
          efsFilesystemName: 'mediaStore',
          rootDirectory: '/uploads',
          mountPath: '/mnt/media'
        }
      }
    ]
  });
  const mediaStore = new EfsFilesystem({});
  return { resources: { mediaProcessor, mediaStore } };
});
```
