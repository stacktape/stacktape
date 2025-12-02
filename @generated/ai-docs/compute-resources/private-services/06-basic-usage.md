# Basic usage

Here's a basic example of a private service configuration:

```yaml
resources:
  myPrivateService:
    type: private-service
    properties:
      packaging:
        type: stacktape-image-buildpack
        properties:
          entryfilePath: src/main.ts
      resources:
        cpu: 2
        memory: 2048
```

> Example private service configuration.

And here's the corresponding application code:

```typescript
import express from 'express';

const app = express();

app.get('/', async (req, res) => {
  res.send({ message: 'Hello' });
});

// for your app use port number stored in PORT environment variable for your application
// this environment variable is automatically injected by Stacktape
app.listen(process.env.PORT, () => {
  console.info(`Server running on port ${process.env.PORT}`);
});
```

> Example server code in TypeScript (`main.ts`).