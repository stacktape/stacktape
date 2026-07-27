# ApplicationLoadBalancerCdnConfiguration API Reference

Resource type: `application-load-balancer`

## TypeScript definition

```typescript
import type { CdnCachingOptions, CdnForwardingOptions, CdnRouteRewrite, DomainConfiguration, EdgeFunctionsConfig } from 'stacktape';

type ApplicationLoadBalancerCdnConfiguration = {
  /** Enable CDN (CloudFront) for faster global delivery and lower bandwidth costs. */
  enabled: boolean;
  /** Control how long and what gets cached at the CDN edge. */
  cachingOptions?: CdnCachingOptions;
  /** Which regions the CDN serves from. Fewer regions = lower cost, but slower for distant users. */
  cloudfrontPriceClass?: "PriceClass_100" | "PriceClass_200" | "PriceClass_All";
  /** Custom domains (e.g., cdn.example.com). Stacktape auto-creates DNS records and TLS certificates. */
  customDomains?: Array<DomainConfiguration>;
  /** Prepend a path prefix to all requests forwarded to the origin. */
  defaultRoutePrefix?: string;
  /** Skip clearing the CDN cache after each deploy. */
  disableInvalidationAfterDeploy?: boolean;
  /** Run edge functions on CDN requests/responses (URL rewrites, auth, A/B testing). */
  edgeFunctions?: EdgeFunctionsConfig;
  /** Page to show for 404 errors (e.g., /error.html). */
  errorDocument?: string;
  /** Control which headers, cookies, and query params are forwarded to your origin. */
  forwardingOptions?: CdnForwardingOptions;
  /** Page served for requests to /. */
  indexDocument?: string;
  /** Listener port for CDN traffic. Only needed if using custom listeners. */
  listenerPort?: number;
  /** Explicit origin domain. Only needed if the ALB has no customDomains and uses customCertificateArns. */
  originDomainName?: string;
  /** Route specific URL patterns to different origins (e.g., /api/* → Lambda, /assets/* → S3). */
  routeRewrites?: Array<CdnRouteRewrite>;
  /** Name of a web-app-firewall resource to protect this CDN from common web exploits. */
  useFirewall?: string;
};
```

## Property: `enabled`

- Required: yes
- Type: `boolean`
- Default: `false`

Enable CDN (CloudFront) for faster global delivery and lower bandwidth costs.

Caches responses at edge locations worldwide so users get content from the nearest server.
The CDN itself has no monthly fee — you pay per request (~$0.01/10k) and per GB transferred.

### Example 1 (yaml)

```yaml
resources:
assets:
  type: bucket
  properties:
    directoryUpload:
      directoryPath: ./public
    cdn:
      enabled: true
```

### Example 2 (typescript)

```typescript
import { Bucket, defineConfig } from 'stacktape';

export default defineConfig(() => {
const assets = new Bucket({
  directoryUpload: { directoryPath: './public' },
  cdn: {
    enabled: true
  }
});
return { resources: { assets } };
});
```

## Property: `cachingOptions`

- Required: no
- Type: `CdnCachingOptions`

Control how long and what gets cached at the CDN edge.

When the origin response has no `Cache-Control` header, defaults apply:

**Bucket origins**: cached for 6 months (or until invalidated on deploy).
**API Gateway / Load Balancer origins**: not cached.

### Example 1 (yaml)

```yaml
resources:
assets:
  type: bucket
  properties:
    directoryUpload:
      directoryPath: ./public
    cdn:
      enabled: true
      cachingOptions:
        defaultTTL: 86400
        maxTTL: 31536000
```

### Example 2 (typescript)

```typescript
import { Bucket, defineConfig } from 'stacktape';

export default defineConfig(() => {
const assets = new Bucket({
  directoryUpload: { directoryPath: './public' },
  cdn: {
    enabled: true,
    cachingOptions: {
      defaultTTL: 86400,
      maxTTL: 31536000
    }
  }
});
return { resources: { assets } };
});
```

## Property: `cloudfrontPriceClass`

- Required: no
- Type: `string: "PriceClass_100" | "PriceClass_200" | "PriceClass_All"`
- Default: `PriceClass_All`

Which regions the CDN serves from. Fewer regions = lower cost, but slower for distant users.

**`PriceClass_100`**: North America + Europe. Cheapest option. Good if your users are in the US/EU.
**`PriceClass_200`**: Adds Asia, Middle East, Africa.
**`PriceClass_All`** (default): All regions worldwide, including South America and Oceania.

The CDN itself has no monthly base cost - you only pay per request and per GB transferred.
The price class controls which edge locations are used, and some regions cost more per request.

### Example 1 (yaml)

```yaml
resources:
assets:
  type: bucket
  properties:
    directoryUpload:
      directoryPath: ./public
    cdn:
      enabled: true
      cloudfrontPriceClass: PriceClass_100
```

### Example 2 (typescript)

```typescript
import { Bucket, defineConfig } from 'stacktape';

export default defineConfig(() => {
const assets = new Bucket({
  directoryUpload: { directoryPath: './public' },
  cdn: {
    enabled: true,
    cloudfrontPriceClass: 'PriceClass_100'
  }
});
return { resources: { assets } };
});
```

## Property: `customDomains`

- Required: no
- Type: `Array<DomainConfiguration>`

Custom domains (e.g., `cdn.example.com`). Stacktape auto-creates DNS records and TLS certificates.

Your domain must be added as a Route53 hosted zone in your AWS account first.

### Example 1 (yaml)

```yaml
resources:
assets:
  type: bucket
  properties:
    directoryUpload:
      directoryPath: ./public
    cdn:
      enabled: true
      customDomains:
        - domainName: cdn.example.com
```

### Example 2 (typescript)

```typescript
import { Bucket, defineConfig } from 'stacktape';

export default defineConfig(() => {
const assets = new Bucket({
  directoryUpload: { directoryPath: './public' },
  cdn: {
    enabled: true,
    customDomains: [{ domainName: 'cdn.example.com' }]
  }
});
return { resources: { assets } };
});
```

## Property: `defaultRoutePrefix`

- Required: no
- Type: `string`

Prepend a path prefix to all requests forwarded to the origin.

E.g., with prefix `/v2`, a request for `/users` is forwarded to the origin as `/v2/users`.

### Example 1 (yaml)

```yaml
resources:
api:
  type: http-api-gateway
  properties:
    cdn:
      enabled: true
      defaultRoutePrefix: /v2
```

### Example 2 (typescript)

```typescript
import { HttpApiGateway, defineConfig } from 'stacktape';

export default defineConfig(() => {
const api = new HttpApiGateway({
  cdn: {
    enabled: true,
    defaultRoutePrefix: '/v2'
  }
});
return { resources: { api } };
});
```

## Property: `disableInvalidationAfterDeploy`

- Required: no
- Type: `boolean`
- Default: `false`

Skip clearing the CDN cache after each deploy.

By default, all cached content is flushed on every deploy so users see the latest version.
Set to `true` if you manage cache invalidation yourself or want to keep cached content between deploys.

### Example 1 (yaml)

```yaml
resources:
assets:
  type: bucket
  properties:
    directoryUpload:
      directoryPath: ./public
    cdn:
      enabled: true
      disableInvalidationAfterDeploy: true
```

### Example 2 (typescript)

```typescript
import { Bucket, defineConfig } from 'stacktape';

export default defineConfig(() => {
const assets = new Bucket({
  directoryUpload: { directoryPath: './public' },
  cdn: {
    enabled: true,
    disableInvalidationAfterDeploy: true
  }
});
return { resources: { assets } };
});
```

## Property: `edgeFunctions`

- Required: no
- Type: `EdgeFunctionsConfig`

Run edge functions on CDN requests/responses (URL rewrites, auth, A/B testing).

`onRequest`: Before cache lookup — modify the request, add auth, or return early.
`onResponse`: Before returning to the client — modify headers, add cookies.

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

## Property: `errorDocument`

- Required: no
- Type: `string`
- Default: `/404.html`

Page to show for 404 errors (e.g., `/error.html`).

### Example 1 (yaml)

```yaml
resources:
webapp:
  type: bucket
  properties:
    directoryUpload:
      directoryPath: ./dist
    cdn:
      enabled: true
      errorDocument: /error.html
```

### Example 2 (typescript)

```typescript
import { Bucket, defineConfig } from 'stacktape';

export default defineConfig(() => {
const webapp = new Bucket({
  directoryUpload: { directoryPath: './dist' },
  cdn: {
    enabled: true,
    errorDocument: '/error.html'
  }
});
return { resources: { webapp } };
});
```

## Property: `forwardingOptions`

- Required: no
- Type: `CdnForwardingOptions`

Control which headers, cookies, and query params are forwarded to your origin.

By default, all headers/cookies/query params are forwarded. Use this to restrict
what reaches your app (e.g., strip cookies for static content).

### Example 1 (yaml)

```yaml
resources:
api:
  type: http-api-gateway
  properties:
    cdn:
      enabled: true
      forwardingOptions:
        cookies:
          none: true
```

### Example 2 (typescript)

```typescript
import { HttpApiGateway, defineConfig } from 'stacktape';

export default defineConfig(() => {
const api = new HttpApiGateway({
  cdn: {
    enabled: true,
    forwardingOptions: {
      cookies: { none: true }
    }
  }
});
return { resources: { api } };
});
```

## Property: `indexDocument`

- Required: no
- Type: `string`
- Default: `/index.html`

Page served for requests to `/`.

### Example 1 (yaml)

```yaml
resources:
webapp:
  type: bucket
  properties:
    directoryUpload:
      directoryPath: ./dist
    cdn:
      enabled: true
      indexDocument: /index.html
```

### Example 2 (typescript)

```typescript
import { Bucket, defineConfig } from 'stacktape';

export default defineConfig(() => {
const webapp = new Bucket({
  directoryUpload: { directoryPath: './dist' },
  cdn: {
    enabled: true,
    indexDocument: '/index.html'
  }
});
return { resources: { webapp } };
});
```

## Property: `listenerPort`

- Required: no
- Type: `number`

Listener port for CDN traffic. Only needed if using custom listeners.

### Example 1 (yaml)

```yaml
resources:
  webLoadBalancer:
    type: application-load-balancer
    properties:
      customDomains:
        - domainName: api.example.com
      listeners:
        - protocol: HTTPS
          port: 8443
      cdn:
        enabled: true
        listenerPort: 8443
  apiFunction:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/index.ts
      events:
        - type: application-load-balancer
          properties:
            loadBalancerName: webLoadBalancer
            listenerPort: 8443
            priority: 1
            paths:
              - /*
```

### Example 2 (typescript)

```typescript
import { ApplicationLoadBalancer, LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const webLoadBalancer = new ApplicationLoadBalancer({
    customDomains: [{ domainName: 'api.example.com' }],
    listeners: [{ protocol: 'HTTPS', port: 8443 }],
    cdn: {
      enabled: true,
      listenerPort: 8443
    }
  });

  const apiFunction = new LambdaFunction({
    packaging: {
      type: 'stacktape-lambda-buildpack',
      properties: { entryfilePath: 'src/index.ts' }
    },
    events: [
      {
        type: 'application-load-balancer',
        properties: {
          loadBalancerName: 'webLoadBalancer',
          listenerPort: 8443,
          priority: 1,
          paths: ['/*']
        }
      }
    ]
  });

  return { resources: { webLoadBalancer, apiFunction } };
});
```

## Property: `originDomainName`

- Required: no
- Type: `string`

Explicit origin domain. Only needed if the ALB has no `customDomains` and uses `customCertificateArns`.

### Example 1 (yaml)

```yaml
resources:
  webLoadBalancer:
    type: application-load-balancer
    properties:
      listeners:
        - protocol: HTTPS
          port: 443
          customCertificateArns:
            - arn:aws:acm:eu-west-1:123456789012:certificate/abcd1234-5678-90ef-ghij-klmnopqrstuv
      cdn:
        enabled: true
        originDomainName: alb.internal.example.com
  apiFunction:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/index.ts
      events:
        - type: application-load-balancer
          properties:
            loadBalancerName: webLoadBalancer
            listenerPort: 443
            priority: 1
            paths:
              - /*
```

### Example 2 (typescript)

```typescript
import { ApplicationLoadBalancer, LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const webLoadBalancer = new ApplicationLoadBalancer({
    listeners: [
      {
        protocol: 'HTTPS',
        port: 443,
        customCertificateArns: [
          'arn:aws:acm:eu-west-1:123456789012:certificate/abcd1234-5678-90ef-ghij-klmnopqrstuv'
        ]
      }
    ],
    cdn: {
      enabled: true,
      originDomainName: 'alb.internal.example.com'
    }
  });

  const apiFunction = new LambdaFunction({
    packaging: {
      type: 'stacktape-lambda-buildpack',
      properties: { entryfilePath: 'src/index.ts' }
    },
    events: [
      {
        type: 'application-load-balancer',
        properties: {
          loadBalancerName: 'webLoadBalancer',
          listenerPort: 443,
          priority: 1,
          paths: ['/*']
        }
      }
    ]
  });

  return { resources: { webLoadBalancer, apiFunction } };
});
```

## Property: `routeRewrites`

- Required: no
- Type: `Array<CdnRouteRewrite>`

Route specific URL patterns to different origins (e.g., `/api/*` → Lambda, `/assets/*` → S3).

Evaluated in order; first match wins. Unmatched requests go to the default origin.
Each route can have its own caching and forwarding settings.

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

## Property: `useFirewall`

- Required: no
- Type: `string`

Name of a `web-app-firewall` resource to protect this CDN from common web exploits.

### Example 1 (yaml)

```yaml
resources:
cdnFirewall:
  type: web-app-firewall
  properties:
    scope: cdn
api:
  type: http-api-gateway
  properties:
    cdn:
      enabled: true
      useFirewall: cdnFirewall
```

### Example 2 (typescript)

```typescript
import { HttpApiGateway, WebAppFirewall, defineConfig } from 'stacktape';

export default defineConfig(() => {
const cdnFirewall = new WebAppFirewall({ scope: 'cdn' });
const api = new HttpApiGateway({
  cdn: {
    enabled: true,
    useFirewall: 'cdnFirewall'
  }
});
return { resources: { cdnFirewall, api } };
});
```
