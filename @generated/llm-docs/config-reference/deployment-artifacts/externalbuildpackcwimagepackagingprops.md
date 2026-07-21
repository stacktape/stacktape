# ExternalBuildpackCwImagePackagingProps API Reference

## TypeScript definition

```typescript
type ExternalBuildpackCwImagePackagingProps = {
  /** The path to the source code directory. */
  sourceDirectoryPath: string;
  /** The Buildpack Builder to use. */
  builder?: string;
  /** The specific Buildpack to use. */
  buildpacks?: Array<string>;
  /** A command to be executed when the container starts. */
  command?: Array<string>;
};
```

## Property: `sourceDirectoryPath`

- Required: yes
- Type: `string`

The path to the source code directory.

### Example 1 (yaml)

```yaml
resources:
 importer:
   type: batch-job
   properties:
     container:
       packaging:
         type: external-buildpack
         properties:
           sourceDirectoryPath: ./importer
     resources:
       cpu: 1
       memory: 2048
```

### Example 2 (typescript)

```typescript
import { BatchJob, defineConfig } from 'stacktape';

export default defineConfig(() => {
 const importer = new BatchJob({
   container: {
     packaging: {
       type: 'external-buildpack',
       properties: {
         sourceDirectoryPath: './importer'
       }
     }
   },
   resources: {
     cpu: 1,
     memory: 2048
   }
 });
 return { resources: { importer } };
});
```

## Property: `builder`

- Required: no
- Type: `string`
- Default: `paketobuildpacks/builder-jammy-base`

The Buildpack Builder to use.

### Example 1 (yaml)

```yaml
resources:
 importer:
   type: batch-job
   properties:
     container:
       packaging:
         type: external-buildpack
         properties:
           sourceDirectoryPath: ./importer
           builder: paketobuildpacks/builder-jammy-full
     resources:
       cpu: 1
       memory: 2048
```

### Example 2 (typescript)

```typescript
import { BatchJob, defineConfig } from 'stacktape';

export default defineConfig(() => {
 const importer = new BatchJob({
   container: {
     packaging: {
       type: 'external-buildpack',
       properties: {
         sourceDirectoryPath: './importer',
         builder: 'paketobuildpacks/builder-jammy-full'
       }
     }
   },
   resources: {
     cpu: 1,
     memory: 2048
   }
 });
 return { resources: { importer } };
});
```

## Property: `buildpacks`

- Required: no
- Type: `Array<string>`

The specific Buildpack to use.

By default, the buildpack is detected automatically.

### Example 1 (yaml)

```yaml
resources:
 importer:
   type: batch-job
   properties:
     container:
       packaging:
         type: external-buildpack
         properties:
           sourceDirectoryPath: ./importer
           buildpacks:
             - paketo-buildpacks/nodejs
     resources:
       cpu: 1
       memory: 2048
```

### Example 2 (typescript)

```typescript
import { BatchJob, defineConfig } from 'stacktape';

export default defineConfig(() => {
 const importer = new BatchJob({
   container: {
     packaging: {
       type: 'external-buildpack',
       properties: {
         sourceDirectoryPath: './importer',
         buildpacks: ['paketo-buildpacks/nodejs']
       }
     }
   },
   resources: {
     cpu: 1,
     memory: 2048
   }
 });
 return { resources: { importer } };
});
```

## Property: `command`

- Required: no
- Type: `Array<string>`

A command to be executed when the container starts.

Example: `['/app/start.sh']`

### Example 1 (yaml)

```yaml
resources:
 importer:
   type: batch-job
   properties:
     container:
       packaging:
         type: external-buildpack
         properties:
           sourceDirectoryPath: ./importer
           command:
             - npm
             - run
             - import
     resources:
       cpu: 1
       memory: 2048
```

### Example 2 (typescript)

```typescript
import { BatchJob, defineConfig } from 'stacktape';

export default defineConfig(() => {
 const importer = new BatchJob({
   container: {
     packaging: {
       type: 'external-buildpack',
       properties: {
         sourceDirectoryPath: './importer',
         command: ['npm', 'run', 'import']
       }
     }
   },
   resources: {
     cpu: 1,
     memory: 2048
   }
 });
 return { resources: { importer } };
});
```
