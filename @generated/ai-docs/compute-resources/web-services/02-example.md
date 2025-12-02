# Example

Here's an example of a simple web service that listens for HTTP requests.

```typescript
import express from 'express';

const app = express();

app.get('/', async (req, res) => {
  res.send({ message: 'Hello' });
});

// for your use port number stored in PORT environment variable for your application
// this environment variable is automatically injected by Stacktape
app.listen(process.env.PORT, () => {
  console.info(`Server running on port ${process.env.PORT}`);
});
```

> Example server code in TypeScript.

And here's the corresponding configuration:

```yaml
resources:
  webService:
    type: web-service
    properties:
      packaging:
        type: stacktape-image-buildpack
        properties:
          entryfilePath: src/main.ts
      resources:
        cpu: 2
        memory: 2048
```

> Example web service configuration.