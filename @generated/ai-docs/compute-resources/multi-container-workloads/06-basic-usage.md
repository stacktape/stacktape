# Basic usage

```typescript
import express from 'express';

const app = express();

app.get('/', async (req, res) => {
  res.send({ message: 'Hello' });
});

app.listen(process.env.PORT, () => {
  console.info(`Server running on port ${process.env.PORT}`);
});
```

> Example server container written in Typescript

```yaml
resources:
  mainGateway:
    type: http-api-gateway
  apiServer:
    type: multi-container-workload
    properties:
      resources:
        cpu: 2
        memory: 2048
      scaling:
        minInstances: 1
        maxInstances: 5
      containers:
        - name: api-container
          packaging:
            type: stacktape-image-buildpack
            properties:
              entryfilePath: src/main.ts
          environment:
            - name: PORT
              value: 3000
          events:
            - type: http-api-gateway
              properties:
                method: '*'
                path: /{proxy+}
                containerPort: 3000
                httpApiGatewayName: mainGateway
```

> Container connected to HTTP API Gateway