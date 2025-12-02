# Basic usage

This example uses a deployment script to test a public API endpoint after a deployment.

```typescript
import fetch from 'node-fetch';

export default async (event) => {
  const { apiURL } = event;

  // do whatever you want with apiURL ...
  const result = await fetch(apiURL);

  // fail the script if the test fails
  if (result.statusCode === 404) {
    throw Error('API test failed');
  }
};
```

> A deployment script in TypeScript (`test-url.ts`).

```yaml
resources:
  myHttpApi:
    type: http-api-gateway

  # {start-highlight}
  testApiMethods:
    type: deployment-script
    properties:
      trigger: after:deploy
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: test-url.ts
      parameters:
        apiURL: $ResourceParam('myHttpApi', 'url')
  # {stop-highlight}
```

> The Stacktape configuration for the deployment script.