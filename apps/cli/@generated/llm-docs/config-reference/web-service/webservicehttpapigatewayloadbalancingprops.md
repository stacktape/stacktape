# WebServiceHttpApiGatewayLoadBalancingProps API Reference

Resource type: `web-service`

## TypeScript definition

```typescript
type WebServiceHttpApiGatewayLoadBalancingProps = {
  /** HTTP path used to check whether the application is ready.

Without a path, Stacktape requests `/` on the container's port and accepts any HTTP response, including 404 or 500.
Set a path such as `/health` to require a 200–399 response instead. Redirects are not followed.
The check runs in a small side container, so your image needs no health-check tools.
An explicit `internalHealthCheck` on the application takes precedence. */
  healthcheckPath?: string;
};
```

## Property: `healthcheckPath`

- Required: no
- Type: `string`

HTTP path used to check whether the application is ready.

Without a path, Stacktape requests `/` on the container's port and accepts any HTTP response, including 404 or 500.
Set a path such as `/health` to require a 200–399 response instead. Redirects are not followed.
The check runs in a small side container, so your image needs no health-check tools.
An explicit `internalHealthCheck` on the application takes precedence.
