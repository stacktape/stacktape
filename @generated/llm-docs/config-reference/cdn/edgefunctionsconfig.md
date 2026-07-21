# EdgeFunctionsConfig API Reference

Resource type: `cdn`

## TypeScript definition

```typescript
type EdgeFunctionsConfig = {
  /** Name of an edge-lambda-function to run before forwarding to the origin (after cache miss). */
  onOriginRequest?: string;
  /** Name of an edge-lambda-function to run after the origin responds (before caching). */
  onOriginResponse?: string;
  /** Name of an edge-lambda-function to run when the CDN receives a request (before cache lookup). */
  onRequest?: string;
  /** Name of an edge-lambda-function to run before returning the response to the client. */
  onResponse?: string;
};
```

## Property: `onOriginRequest`

- Required: no
- Type: `string`

Name of an `edge-lambda-function` to run before forwarding to the origin (after cache miss).

Only runs on cache misses. Use to modify the request before it reaches your origin.

  **Warning:** Stacktape uses this trigger internally for bucket/web-service/API Gateway CDN setups.
Overriding it may break default behavior. Only use if you know what you're doing.

### Example 1 (yaml)

```yaml
resources:
rewriteOrigin:
  type: edge-lambda-function
  properties:
    packaging:
      type: stacktape-lambda-buildpack
      properties:
        entryfilePath: ./src/edge/origin-rewrite.ts
api:
  type: http-api-gateway
  properties:
    cdn:
      enabled: true
      edgeFunctions:
        onOriginRequest: rewriteOrigin
```

### Example 2 (typescript)

```typescript
import { EdgeLambdaFunction, HttpApiGateway, StacktapeLambdaBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
const rewriteOrigin = new EdgeLambdaFunction({
  packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/edge/origin-rewrite.ts' })
});
const api = new HttpApiGateway({
  cdn: {
    enabled: true,
    edgeFunctions: {
      onOriginRequest: 'rewriteOrigin'
    }
  }
});
return { resources: { rewriteOrigin, api } };
});
```

## Property: `onOriginResponse`

- Required: no
- Type: `string`

Name of an `edge-lambda-function` to run after the origin responds (before caching).

Modify the response before it's cached and returned. Changes are cached as if they came from the origin.

### Example 1 (yaml)

```yaml
resources:
cacheTuner:
  type: edge-lambda-function
  properties:
    packaging:
      type: stacktape-lambda-buildpack
      properties:
        entryfilePath: ./src/edge/cache-tune.ts
api:
  type: http-api-gateway
  properties:
    cdn:
      enabled: true
      edgeFunctions:
        onOriginResponse: cacheTuner
```

### Example 2 (typescript)

```typescript
import { EdgeLambdaFunction, HttpApiGateway, StacktapeLambdaBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
const cacheTuner = new EdgeLambdaFunction({
  packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/edge/cache-tune.ts' })
});
const api = new HttpApiGateway({
  cdn: {
    enabled: true,
    edgeFunctions: {
      onOriginResponse: 'cacheTuner'
    }
  }
});
return { resources: { cacheTuner, api } };
});
```

## Property: `onRequest`

- Required: no
- Type: `string`

Name of an `edge-lambda-function` to run when the CDN receives a request (before cache lookup).

Use to modify the request, add auth checks, or return an immediate response without hitting the origin.

### Example 1 (yaml)

```yaml
resources:
authAtEdge:
  type: edge-lambda-function
  properties:
    packaging:
      type: stacktape-lambda-buildpack
      properties:
        entryfilePath: ./src/edge/auth.ts
api:
  type: http-api-gateway
  properties:
    cdn:
      enabled: true
      edgeFunctions:
        onRequest: authAtEdge
```

### Example 2 (typescript)

```typescript
import { EdgeLambdaFunction, HttpApiGateway, StacktapeLambdaBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
const authAtEdge = new EdgeLambdaFunction({
  packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/edge/auth.ts' })
});
const api = new HttpApiGateway({
  cdn: {
    enabled: true,
    edgeFunctions: {
      onRequest: 'authAtEdge'
    }
  }
});
return { resources: { authAtEdge, api } };
});
```

## Property: `onResponse`

- Required: no
- Type: `string`

Name of an `edge-lambda-function` to run before returning the response to the client.

Use to modify response headers, add security headers, or set cookies.
Does not run if the origin returned a 400+ error or if `onRequest` already generated a response.

### Example 1 (yaml)

```yaml
resources:
securityHeaders:
  type: edge-lambda-function
  properties:
    packaging:
      type: stacktape-lambda-buildpack
      properties:
        entryfilePath: ./src/edge/headers.ts
api:
  type: http-api-gateway
  properties:
    cdn:
      enabled: true
      edgeFunctions:
        onResponse: securityHeaders
```

### Example 2 (typescript)

```typescript
import { EdgeLambdaFunction, HttpApiGateway, StacktapeLambdaBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
const securityHeaders = new EdgeLambdaFunction({
  packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/edge/headers.ts' })
});
const api = new HttpApiGateway({
  cdn: {
    enabled: true,
    edgeFunctions: {
      onResponse: 'securityHeaders'
    }
  }
});
return { resources: { securityHeaders, api } };
});
```
