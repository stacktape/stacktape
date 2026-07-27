# PrebuiltImageCwPackagingProps API Reference

Configures a pre-built container image.

## TypeScript definition

```typescript
type PrebuiltImageCwPackagingProps = {
  /** The name or URL of the container image. */
  image: string;
  /** A command to be executed when the container starts. */
  command?: Array<string>;
  /** A script to be executed when the container starts. */
  entryPoint?: Array<string>;
  /** The ARN of a secret containing credentials for a private container registry. */
  repositoryCredentialsSecretArn?: string;
};
```

## Property: `image`

- Required: yes
- Type: `string`

The name or URL of the container image.

### Example 1 (yaml)

```yaml
resources:
 encoder:
   type: batch-job
   properties:
     container:
       packaging:
         type: prebuilt-image
         properties:
           image: jrottenberg/ffmpeg:6.1-ubuntu
     resources:
       cpu: 2
       memory: 7680
```

### Example 2 (typescript)

```typescript
import { BatchJob, defineConfig } from 'stacktape';

export default defineConfig(() => {
 const encoder = new BatchJob({
   container: {
     packaging: {
       type: 'prebuilt-image',
       properties: {
         image: 'jrottenberg/ffmpeg:6.1-ubuntu'
       }
     }
   },
   resources: {
     cpu: 2,
     memory: 7680
   }
 });
 return { resources: { encoder } };
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
 encoder:
   type: batch-job
   properties:
     container:
       packaging:
         type: prebuilt-image
         properties:
           image: jrottenberg/ffmpeg:6.1-ubuntu
           command:
             - -i
             - input.mp4
             - output.webm
     resources:
       cpu: 2
       memory: 7680
```

### Example 2 (typescript)

```typescript
import { BatchJob, defineConfig } from 'stacktape';

export default defineConfig(() => {
 const encoder = new BatchJob({
   container: {
     packaging: {
       type: 'prebuilt-image',
       properties: {
         image: 'jrottenberg/ffmpeg:6.1-ubuntu',
         command: ['-i', 'input.mp4', 'output.webm']
       }
     }
   },
   resources: {
     cpu: 2,
     memory: 7680
   }
 });
 return { resources: { encoder } };
});
```

## Property: `entryPoint`

- Required: no
- Type: `Array<string>`

A script to be executed when the container starts.

This overrides the `ENTRYPOINT` instruction in the Dockerfile.

### Example 1 (yaml)

```yaml
resources:
 appService:
   type: web-service
   properties:
     packaging:
       type: prebuilt-image
       properties:
         image: node:22-alpine
         entryPoint:
           - /bin/sh
           - -c
           - node server.js
     resources:
       cpu: 0.5
       memory: 1024
```

### Example 2 (typescript)

```typescript
import { WebService, defineConfig } from 'stacktape';

export default defineConfig(() => {
 const appService = new WebService({
   packaging: {
     type: 'prebuilt-image',
     properties: {
       image: 'node:22-alpine',
       entryPoint: ['/bin/sh', '-c', 'node server.js']
     }
   },
   resources: {
     cpu: 0.5,
     memory: 1024
   }
 });
 return { resources: { appService } };
});
```

## Property: `repositoryCredentialsSecretArn`

- Required: no
- Type: `string`

The ARN of a secret containing credentials for a private container registry.

The secret must be a JSON object with `username` and `password` keys.
You can create secrets using the `stacktape secret:create` command.

### Example 1 (yaml)

```yaml
resources:
 privateImageService:
   type: web-service
   properties:
     packaging:
       type: prebuilt-image
       properties:
         image: registry.example.com/my-org/my-app:latest
         repositoryCredentialsSecretArn: $Secret('registry-credentials.arn')
     resources:
       cpu: 0.5
       memory: 1024
```

### Example 2 (typescript)

```typescript
import { WebService, $Secret, defineConfig } from 'stacktape';

export default defineConfig(() => {
 const privateImageService = new WebService({
   packaging: {
     type: 'prebuilt-image',
     properties: {
       image: 'registry.example.com/my-org/my-app:latest',
       repositoryCredentialsSecretArn: $Secret('registry-credentials.arn')
     }
   },
   resources: {
     cpu: 0.5,
     memory: 1024
   }
 });
 return { resources: { privateImageService } };
});
```
