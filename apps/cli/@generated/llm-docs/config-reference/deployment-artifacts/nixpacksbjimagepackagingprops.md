# NixpacksBjImagePackagingProps API Reference

## TypeScript definition

```typescript
import type { NixpacksPhase } from 'stacktape';

type NixpacksBjImagePackagingProps = {
  /** The path to the source code directory. */
  sourceDirectoryPath: string;
  /** The base image to use for building the application. */
  buildImage?: string;
  /** The build phases for the application. */
  phases?: Array<NixpacksPhase>;
  /** A list of providers to use for determining the build and runtime environments. */
  providers?: Array<string>;
  /** The command to execute when starting the application. */
  startCmd?: string;
  /** A list of file paths to include in the runtime environment; all other files will be excluded. */
  startOnlyIncludeFiles?: Array<string>;
  /** The base image to use for running the application. */
  startRunImage?: string;
};
```

## Property: `sourceDirectoryPath`

- Required: yes
- Type: `string`

The path to the source code directory.

### Example 1 (yaml)

```yaml
resources:
 worker:
   type: worker-service
   properties:
     packaging:
       type: nixpacks
       properties:
         sourceDirectoryPath: ./worker
     resources:
       cpu: 0.5
       memory: 1024
```

### Example 2 (typescript)

```typescript
import { WorkerService, defineConfig } from 'stacktape';

export default defineConfig(() => {
 const worker = new WorkerService({
   packaging: {
     type: 'nixpacks',
     properties: {
       sourceDirectoryPath: './worker'
     }
   },
   resources: {
     cpu: 0.5,
     memory: 1024
   }
 });
 return { resources: { worker } };
});
```

## Property: `buildImage`

- Required: no
- Type: `string`

The base image to use for building the application.

For more details, see the [Nixpacks documentation](https://nixpacks.com/docs/configuration/file#build-image).

### Example 1 (yaml)

```yaml
resources:
 worker:
   type: worker-service
   properties:
     packaging:
       type: nixpacks
       properties:
         sourceDirectoryPath: ./worker
         buildImage: ubuntu:22.04
     resources:
       cpu: 0.5
       memory: 1024
```

### Example 2 (typescript)

```typescript
import { WorkerService, defineConfig } from 'stacktape';

export default defineConfig(() => {
 const worker = new WorkerService({
   packaging: {
     type: 'nixpacks',
     properties: {
       sourceDirectoryPath: './worker',
       buildImage: 'ubuntu:22.04'
     }
   },
   resources: {
     cpu: 0.5,
     memory: 1024
   }
 });
 return { resources: { worker } };
});
```

## Property: `phases`

- Required: no
- Type: `Array<NixpacksPhase>`

The build phases for the application.

### Example 1 (yaml)

```yaml
resources:
 worker:
   type: worker-service
   properties:
     packaging:
       type: nixpacks
       properties:
         sourceDirectoryPath: ./worker
         phases:
           - name: install
             cmds:
               - npm ci
           - name: build
             cmds:
               - npm run build
     resources:
       cpu: 0.5
       memory: 1024
```

### Example 2 (typescript)

```typescript
import { WorkerService, defineConfig } from 'stacktape';

export default defineConfig(() => {
 const worker = new WorkerService({
   packaging: {
     type: 'nixpacks',
     properties: {
       sourceDirectoryPath: './worker',
       phases: [
         { name: 'install', cmds: ['npm ci'] },
         { name: 'build', cmds: ['npm run build'] }
       ]
     }
   },
   resources: {
     cpu: 0.5,
     memory: 1024
   }
 });
 return { resources: { worker } };
});
```

## Property: `providers`

- Required: no
- Type: `Array<string>`

A list of providers to use for determining the build and runtime environments.

### Example 1 (yaml)

```yaml
resources:
 worker:
   type: worker-service
   properties:
     packaging:
       type: nixpacks
       properties:
         sourceDirectoryPath: ./worker
         providers:
           - node
     resources:
       cpu: 0.5
       memory: 1024
```

### Example 2 (typescript)

```typescript
import { WorkerService, defineConfig } from 'stacktape';

export default defineConfig(() => {
 const worker = new WorkerService({
   packaging: {
     type: 'nixpacks',
     properties: {
       sourceDirectoryPath: './worker',
       providers: ['node']
     }
   },
   resources: {
     cpu: 0.5,
     memory: 1024
   }
 });
 return { resources: { worker } };
});
```

## Property: `startCmd`

- Required: no
- Type: `string`

The command to execute when starting the application.

This overrides the default start command inferred by Nixpacks.

### Example 1 (yaml)

```yaml
resources:
 worker:
   type: worker-service
   properties:
     packaging:
       type: nixpacks
       properties:
         sourceDirectoryPath: ./worker
         startCmd: node dist/worker.js
     resources:
       cpu: 0.5
       memory: 1024
```

### Example 2 (typescript)

```typescript
import { WorkerService, defineConfig } from 'stacktape';

export default defineConfig(() => {
 const worker = new WorkerService({
   packaging: {
     type: 'nixpacks',
     properties: {
       sourceDirectoryPath: './worker',
       startCmd: 'node dist/worker.js'
     }
   },
   resources: {
     cpu: 0.5,
     memory: 1024
   }
 });
 return { resources: { worker } };
});
```

## Property: `startOnlyIncludeFiles`

- Required: no
- Type: `Array<string>`

A list of file paths to include in the runtime environment; all other files will be excluded.

### Example 1 (yaml)

```yaml
resources:
 worker:
   type: worker-service
   properties:
     packaging:
       type: nixpacks
       properties:
         sourceDirectoryPath: ./worker
         startOnlyIncludeFiles:
           - dist
           - node_modules
     resources:
       cpu: 0.5
       memory: 1024
```

### Example 2 (typescript)

```typescript
import { WorkerService, defineConfig } from 'stacktape';

export default defineConfig(() => {
 const worker = new WorkerService({
   packaging: {
     type: 'nixpacks',
     properties: {
       sourceDirectoryPath: './worker',
       startOnlyIncludeFiles: ['dist', 'node_modules']
     }
   },
   resources: {
     cpu: 0.5,
     memory: 1024
   }
 });
 return { resources: { worker } };
});
```

## Property: `startRunImage`

- Required: no
- Type: `string`

The base image to use for running the application.

### Example 1 (yaml)

```yaml
resources:
 worker:
   type: worker-service
   properties:
     packaging:
       type: nixpacks
       properties:
         sourceDirectoryPath: ./worker
         startRunImage: gcr.io/distroless/nodejs22-debian12
     resources:
       cpu: 0.5
       memory: 1024
```

### Example 2 (typescript)

```typescript
import { WorkerService, defineConfig } from 'stacktape';

export default defineConfig(() => {
 const worker = new WorkerService({
   packaging: {
     type: 'nixpacks',
     properties: {
       sourceDirectoryPath: './worker',
       startRunImage: 'gcr.io/distroless/nodejs22-debian12'
     }
   },
   resources: {
     cpu: 0.5,
     memory: 1024
   }
 });
 return { resources: { worker } };
});
```
