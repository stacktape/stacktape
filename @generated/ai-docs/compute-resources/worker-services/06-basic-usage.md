# Basic usage

Here's a basic example of a worker service configuration:

```yaml
resources:
  myWorkerService:
    type: worker-service
    properties:
      packaging:
        type: stacktape-image-buildpack
        properties:
          entryfilePath: src/main.ts
      resources:
        cpu: 2
        memory: 2048
```

> Example worker service configuration.

And here's the corresponding application code:

```typescript
import myContinuouslyRunningApp from './my-app';

const app = myContinuouslyRunningApp();

app.run();
```

> Example worker container in TypeScript (`main.ts`).