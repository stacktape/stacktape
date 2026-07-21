# CustomDockerfileBjImagePackagingProps API Reference

Configures an image to be built by Stacktape from a specified Dockerfile.

## TypeScript definition

```typescript
import type { DockerBuildArg } from 'stacktape';

type CustomDockerfileBjImagePackagingProps = {
  /** The path to the build context directory, relative to your Stacktape configuration file. */
  buildContextPath: string;
  /** A list of arguments to pass to the docker build command. */
  buildArgs?: Array<DockerBuildArg>;
  /** A command to be executed when the container starts. */
  command?: Array<string>;
  /** The path to the Dockerfile, relative to buildContextPath. */
  dockerfilePath?: string;
};
```

## Property: `buildContextPath`

- Required: yes
- Type: `string`

The path to the build context directory, relative to your Stacktape configuration file.

### Example 1 (yaml)

```yaml
resources:
 processor:
   type: batch-job
   properties:
     container:
       packaging:
         type: custom-dockerfile
         properties:
           buildContextPath: ./worker
     resources:
       cpu: 1
       memory: 2048
```

### Example 2 (typescript)

```typescript
import { BatchJob, defineConfig } from 'stacktape';

export default defineConfig(() => {
 const processor = new BatchJob({
   container: {
     packaging: {
       type: 'custom-dockerfile',
       properties: {
         buildContextPath: './worker'
       }
     }
   },
   resources: {
     cpu: 1,
     memory: 2048
   }
 });
 return { resources: { processor } };
});
```

## Property: `buildArgs`

- Required: no
- Type: `Array<DockerBuildArg>`

A list of arguments to pass to the `docker build` command.

### Example 1 (yaml)

```yaml
resources:
 processor:
   type: batch-job
   properties:
     container:
       packaging:
         type: custom-dockerfile
         properties:
           buildContextPath: ./worker
           buildArgs:
             - argName: NODE_ENV
               value: production
             - argName: BUILD_VERSION
               value: "1.4.2"
     resources:
       cpu: 1
       memory: 2048
```

### Example 2 (typescript)

```typescript
import { BatchJob, defineConfig } from 'stacktape';

export default defineConfig(() => {
 const processor = new BatchJob({
   container: {
     packaging: {
       type: 'custom-dockerfile',
       properties: {
         buildContextPath: './worker',
         buildArgs: [
           { argName: 'NODE_ENV', value: 'production' },
           { argName: 'BUILD_VERSION', value: '1.4.2' }
         ]
       }
     }
   },
   resources: {
     cpu: 1,
     memory: 2048
   }
 });
 return { resources: { processor } };
});
```

## Property: `command`

- Required: no
- Type: `Array<string>`

A command to be executed when the container starts.

This overrides the `CMD` instruction in the Dockerfile.

Example: `['/app/start.sh']`

### Example 1 (yaml)

```yaml
resources:
 processor:
   type: batch-job
   properties:
     container:
       packaging:
         type: custom-dockerfile
         properties:
           buildContextPath: ./worker
           command:
             - node
             - dist/process.js
     resources:
       cpu: 1
       memory: 2048
```

### Example 2 (typescript)

```typescript
import { BatchJob, defineConfig } from 'stacktape';

export default defineConfig(() => {
 const processor = new BatchJob({
   container: {
     packaging: {
       type: 'custom-dockerfile',
       properties: {
         buildContextPath: './worker',
         command: ['node', 'dist/process.js']
       }
     }
   },
   resources: {
     cpu: 1,
     memory: 2048
   }
 });
 return { resources: { processor } };
});
```

## Property: `dockerfilePath`

- Required: no
- Type: `string`

The path to the Dockerfile, relative to `buildContextPath`.

### Example 1 (yaml)

```yaml
resources:
 processor:
   type: batch-job
   properties:
     container:
       packaging:
         type: custom-dockerfile
         properties:
           buildContextPath: ./worker
           dockerfilePath: docker/Dockerfile.prod
     resources:
       cpu: 1
       memory: 2048
```

### Example 2 (typescript)

```typescript
import { BatchJob, defineConfig } from 'stacktape';

export default defineConfig(() => {
 const processor = new BatchJob({
   container: {
     packaging: {
       type: 'custom-dockerfile',
       properties: {
         buildContextPath: './worker',
         dockerfilePath: 'docker/Dockerfile.prod'
       }
     }
   },
   resources: {
     cpu: 1,
     memory: 2048
   }
 });
 return { resources: { processor } };
});
```
