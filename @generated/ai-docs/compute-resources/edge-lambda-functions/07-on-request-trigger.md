# On request trigger

When a function is triggered by an `onRequest` event, you can either:

1.  **Return a response directly from the function**: This bypasses the origin and serves the response immediately to the client.
2.  **Modify the request and forward it to the origin**: You can alter the request (e.g., add headers) before it continues to the origin.

The following example demonstrates both:

```typescript
const validateAuthorizationToken = (token) => {
  // perform some validation
  return true;
};

export default async (event) => {
  const { request } = event.Records[0].cf;
  const { headers } = request;

  const authorizationToken = headers.authorization?.[0]?.value;

  const userAuthorized = validateAuthorizationToken(authorizationToken);

  // if user is not authorized, redirect him to login page
  if (!userAuthorized) {
    return {
      status: '302',
      headers: {
        location: [
          {
            key: 'Location',
            value: '/login'
          }
        ],
        'cache-control': [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, max-age=0, must-revalidate'
          }
        ]
      }
    };
  }

  // after we validated that user is authorized, we can return the request
  // request will be forwarded to origin
  return request;
};
```

> If the user is authorized, the request is forwarded to the origin. Otherwise, a redirect response is returned.

```yaml
resources:
  # {start-highlight}
  authFunction:
    type: edge-lambda-function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: auth-function.ts
  # {stop-highlight}

  myBucket:
    type: bucket
    properties:
      cdn:
        enabled: true
        # {start-highlight}
        edgeFunctions:
          onRequest: authFunction
        # {stop-highlight}
```

> Example configuration for the authorizer function.