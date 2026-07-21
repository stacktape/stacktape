# CdnRouteRewrite API Reference

Resource type: `cdn`

## TypeScript definition

```typescript
import type { CdnBucketRoute, CdnCachingOptions, CdnCustomDomainRoute, CdnForwardingOptions, CdnHttpApiGatewayRoute, CdnLambdaFunctionRoute, CdnLoadBalancerRoute, EdgeFunctionsConfig } from 'stacktape';

type CdnRouteRewrite = {
  /** URL path pattern to match (e.g., /api/*, *.jpg, /docs/v2/*). Wildcards supported. */
  path: string;
  /** Override caching behavior for requests matching this route. */
  cachingOptions?: CdnCachingOptions;
  /** Run edge functions on requests/responses matching this route. */
  edgeFunctions?: EdgeFunctionsConfig;
  /** Override which headers, cookies, and query params are forwarded for this route. */
  forwardingOptions?: CdnForwardingOptions;
  /** Prepend a path prefix to requests before forwarding to the origin. */
  routePrefix?: string;
  /** Where to send matching requests. Can be a bucket, API Gateway, load balancer, Lambda, or external domain. */
  routeTo?: CdnRouteRewriteRouteTo;
};

/** Union choices used by the properties above. */
type CdnRouteRewriteRouteTo =
  | CdnLoadBalancerRoute
  | CdnHttpApiGatewayRoute
  | CdnLambdaFunctionRoute
  | CdnCustomDomainRoute
  | CdnBucketRoute;
```

## Property: `path`

- Required: yes
- Type: `string`

URL path pattern to match (e.g., `/api/*`, `*.jpg`, `/docs/v2/*`). Wildcards supported.

### Example 1 (yaml)

```yaml
resources:
api:
  type: http-api-gateway
  properties:
    cdn:
      enabled: true
      routeRewrites:
        - path: /assets/*
          routeTo:
            type: bucket
            properties:
              bucketName: assets
assets:
  type: bucket
  properties:
    directoryUpload:
      directoryPath: ./public
```

### Example 2 (typescript)

```typescript
import { Bucket, HttpApiGateway, defineConfig } from 'stacktape';

export default defineConfig(() => {
const assets = new Bucket({
  directoryUpload: { directoryPath: './public' }
});
const api = new HttpApiGateway({
  cdn: {
    enabled: true,
    routeRewrites: [
      {
        path: '/assets/*',
        routeTo: { type: 'bucket', properties: { bucketName: 'assets' } }
      }
    ]
  }
});
return { resources: { assets, api } };
});
```

## Property: `cachingOptions`

- Required: no
- Type: `CdnCachingOptions`

Override caching behavior for requests matching this route.

### Example 1 (yaml)

```yaml
resources:
api:
  type: http-api-gateway
  properties:
    cdn:
      enabled: true
      routeRewrites:
        - path: /assets/*
          routeTo:
            type: bucket
            properties:
              bucketName: assets
          cachingOptions:
            defaultTTL: 604800
assets:
  type: bucket
  properties:
    directoryUpload:
      directoryPath: ./public
```

### Example 2 (typescript)

```typescript
import { Bucket, HttpApiGateway, defineConfig } from 'stacktape';

export default defineConfig(() => {
const assets = new Bucket({
  directoryUpload: { directoryPath: './public' }
});
const api = new HttpApiGateway({
  cdn: {
    enabled: true,
    routeRewrites: [
      {
        path: '/assets/*',
        routeTo: { type: 'bucket', properties: { bucketName: 'assets' } },
        cachingOptions: { defaultTTL: 604800 }
      }
    ]
  }
});
return { resources: { assets, api } };
});
```

## Property: `edgeFunctions`

- Required: no
- Type: `EdgeFunctionsConfig`

Run edge functions on requests/responses matching this route.

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
      routeRewrites:
        - path: /private/*
          routeTo:
            type: bucket
            properties:
              bucketName: assets
          edgeFunctions:
            onRequest: authAtEdge
assets:
  type: bucket
  properties:
    directoryUpload:
      directoryPath: ./public
```

### Example 2 (typescript)

```typescript
import { Bucket, EdgeLambdaFunction, HttpApiGateway, StacktapeLambdaBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
const authAtEdge = new EdgeLambdaFunction({
  packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/edge/auth.ts' })
});
const assets = new Bucket({
  directoryUpload: { directoryPath: './public' }
});
const api = new HttpApiGateway({
  cdn: {
    enabled: true,
    routeRewrites: [
      {
        path: '/private/*',
        routeTo: { type: 'bucket', properties: { bucketName: 'assets' } },
        edgeFunctions: { onRequest: 'authAtEdge' }
      }
    ]
  }
});
return { resources: { authAtEdge, assets, api } };
});
```

## Property: `forwardingOptions`

- Required: no
- Type: `CdnForwardingOptions`

Override which headers, cookies, and query params are forwarded for this route.

### Example 1 (yaml)

```yaml
resources:
api:
  type: http-api-gateway
  properties:
    cdn:
      enabled: true
      routeRewrites:
        - path: /assets/*
          routeTo:
            type: bucket
            properties:
              bucketName: assets
          forwardingOptions:
            cookies:
              none: true
assets:
  type: bucket
  properties:
    directoryUpload:
      directoryPath: ./public
```

### Example 2 (typescript)

```typescript
import { Bucket, HttpApiGateway, defineConfig } from 'stacktape';

export default defineConfig(() => {
const assets = new Bucket({
  directoryUpload: { directoryPath: './public' }
});
const api = new HttpApiGateway({
  cdn: {
    enabled: true,
    routeRewrites: [
      {
        path: '/assets/*',
        routeTo: { type: 'bucket', properties: { bucketName: 'assets' } },
        forwardingOptions: { cookies: { none: true } }
      }
    ]
  }
});
return { resources: { assets, api } };
});
```

## Property: `routePrefix`

- Required: no
- Type: `string`

Prepend a path prefix to requests before forwarding to the origin.

E.g., with prefix `/v2`, a request for `/users` is forwarded as `/v2/users`.

### Example 1 (yaml)

```yaml
resources:
api:
  type: http-api-gateway
  properties:
    cdn:
      enabled: true
      routeRewrites:
        - path: /api/*
          routePrefix: /v2
          routeTo:
            type: http-api-gateway
            properties:
              httpApiGatewayName: backendApi
backendApi:
  type: http-api-gateway
```

### Example 2 (typescript)

```typescript
import { HttpApiGateway, defineConfig } from 'stacktape';

export default defineConfig(() => {
const backendApi = new HttpApiGateway({});
const api = new HttpApiGateway({
  cdn: {
    enabled: true,
    routeRewrites: [
      {
        path: '/api/*',
        routePrefix: '/v2',
        routeTo: { type: 'http-api-gateway', properties: { httpApiGatewayName: 'backendApi' } }
      }
    ]
  }
});
return { resources: { backendApi, api } };
});
```

## Property: `routeTo`

- Required: no
- Type: `application-load-balancer | http-api-gateway | function | custom-origin | bucket`

Where to send matching requests. Can be a bucket, API Gateway, load balancer, Lambda, or external domain.

If not set, requests go to the default origin (the resource this CDN is attached to).

Choices:
- `application-load-balancer` (`CdnLoadBalancerRoute`). Properties: `loadBalancerName: string`, `listenerPort?: number`, `originDomainName?: string`.
- `http-api-gateway` (`CdnHttpApiGatewayRoute`). Properties: `httpApiGatewayName: string`.
- `function` (`CdnLambdaFunctionRoute`). Properties: `functionName: string`.
- `custom-origin` (`CdnCustomDomainRoute`). Properties: `domainName: string`, `protocol?: string: "HTTP" | "HTTPS"`, `port?: number`.
- `bucket` (`CdnBucketRoute`). Properties: `bucketName: string`, `disableUrlNormalization?: boolean`.

### Example 1 (yaml)

```yaml
resources:
api:
  type: http-api-gateway
  properties:
    cdn:
      enabled: true
      routeRewrites:
        - path: /static/*
          routeTo:
            type: bucket
            properties:
              bucketName: assets
assets:
  type: bucket
  properties:
    directoryUpload:
      directoryPath: ./public
```

### Example 2 (typescript)

```typescript
import { Bucket, HttpApiGateway, defineConfig } from 'stacktape';

export default defineConfig(() => {
const assets = new Bucket({
  directoryUpload: { directoryPath: './public' }
});
const api = new HttpApiGateway({
  cdn: {
    enabled: true,
    routeRewrites: [
      {
        path: '/static/*',
        routeTo: { type: 'bucket', properties: { bucketName: 'assets' } }
      }
    ]
  }
});
return { resources: { assets, api } };
});
```
