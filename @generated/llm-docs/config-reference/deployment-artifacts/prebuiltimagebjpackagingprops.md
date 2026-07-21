# PrebuiltImageBjPackagingProps API Reference

Configures a pre-built container image.

## TypeScript definition

```typescript
type PrebuiltImageBjPackagingProps = {
  /** The name or URL of the container image. */
  image: string;
  /** A command to be executed when the container starts. */
  command?: Array<string>;
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
