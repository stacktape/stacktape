# On response trigger

A function triggered by an `onResponse` event can modify the response from the origin before it's sent to the client. In this example, the function adds a `Set-Cookie` header to the response:

```typescript
export default async (event) => {
  const { response } = event.Records[0].cf;

  response.headers['set-cookie'] = [
    {
      key: 'Set-Cookie',
      value: 'my-experimental-cookie=cookie-value'
    }
  ];

  return response;
};
```

> Code for the function that sets a cookie.

```yaml
resources:
  # {start-highlight}
  cookieFunction:
    type: edge-lambda-function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: set-cookie.ts
  # {stop-highlight}

  myBucket:
    type: bucket
    properties:
      cdn:
        enabled: true
        # {start-highlight}
        edgeFunctions:
          onResponse: cookieFunction
        # {stop-highlight}
```

> Example configuration for the `onResponse` trigger.