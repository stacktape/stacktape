# CDN

A CDN puts an Amazon CloudFront distribution in front of a [bucket](/resources/storage/s3-bucket), an
[HTTP API Gateway](/resources/networking/http-api-gateway), an
[Application Load Balancer](/resources/networking/application-load-balancer) or a
[Lambda function](/resources/compute/lambda-function). It's not a resource of its own: you turn it on with the `cdn`
property of that resource. CloudFront serves cached responses from locations near your users, routes paths to several
backends from one domain, runs [edge functions](/resources/compute/edge-function) and takes a
[firewall](/resources/security/web-application-firewall).

It has no monthly fee. The first 1 TB of transfer and 10 million requests each month are free, then North America costs
$0.085 per GB and $0.01 per 10,000 HTTPS requests
([CloudFront pricing](https://aws.amazon.com/cloudfront/pricing/pay-as-you-go/)). A CDN in front of an API whose
responses are all personalized adds cost without caching anything.

## Basic example

Set `cdn.enabled: true` on the parent resource. By default CloudFront serves from all its locations, compresses
responses with Gzip and Brotli, and Stacktape clears the cache on every deploy.

### API-backed CDN


Example (TypeScript):

```typescript
import { defineConfig, HttpApiGateway } from 'stacktape';
export default defineConfig(() => {
  const myApi = new HttpApiGateway({
    cdn: {
      enabled: true
    }
  });

  return {
    resources: { myApi }
  };
});
```


CloudFront caches API Gateway and load balancer responses only when your API sends `Cache-Control` headers or you set
`cachingOptions.defaultTTL`. The deploy prints the distribution URL (`cdnUrl`).

### Bucket-backed CDN

Static files from a [bucket](/resources/storage/s3-bucket) are the most common case. Files without a `Cache-Control`
header stay cached for six months, and each deploy clears the cache.


Example (TypeScript):

```typescript
import { defineConfig, Bucket } from 'stacktape';
export default defineConfig(() => {
  const staticAssets = new Bucket({
    cdn: {
      enabled: true,
      cloudfrontPriceClass: 'PriceClass_100'
    }
  });

  return {
    resources: { staticAssets }
  };
});
```


`PriceClass_100` limits CloudFront to its North American and European locations, the cheapest option; see
[Price class](#price-class). `$ResourceParam('staticAssets', 'cdnUrl')` gives the URL, using the parent resource's name.

## Examples

### Static site with custom domain

A bucket behind a CDN with your own domain, for a static site or single-page app:


Example (TypeScript):

```typescript
import { defineConfig, Bucket } from 'stacktape';
export default defineConfig(() => {
  const frontend = new Bucket({
    cdn: {
      enabled: true,
      cloudfrontPriceClass: 'PriceClass_100',
      customDomains: [{ domainName: 'app.example.com' }]
    }
  });

  return {
    resources: { frontend },
    stackConfig: {
      outputs: [{ name: 'siteUrl', value: "$ResourceParam('frontend', 'cdnCanonicalUrl')" }]
    }
  };
});
```


CloudFront needs the certificate in `us-east-1`. `stacktape domain add` creates it there, so
[set up the domain](/resources/networking/custom-domains#set-up-the-domain) before the first deploy.

### Multi-origin API with WAF

One domain for an API and its static assets, with a firewall in front of both:


Example (TypeScript):

```typescript
import { defineConfig, HttpApiGateway, Bucket, WebAppFirewall } from 'stacktape';
export default defineConfig(() => {
  const assets = new Bucket({});

  const waf = new WebAppFirewall({
    scope: 'cdn'
  });

  const api = new HttpApiGateway({
    cdn: {
      enabled: true,
      useFirewall: 'waf',
      routeRewrites: [
        {
          path: '/assets/*',
          routeTo: {
            type: 'bucket',
            properties: { bucketName: 'assets' }
          },
          cachingOptions: { defaultTTL: 86400 }
        }
      ]
    }
  });

  return {
    resources: { assets, waf, api }
  };
});
```


`/assets/*` comes from the bucket and is cached for 24 hours; every other path goes to the API uncached. `useFirewall`
names a [web application firewall](/resources/security/web-application-firewall) with `scope: 'cdn'`.

## Caching

CDN caching controls how long CloudFront stores responses at edge locations before requesting fresh content from your origin. Proper caching reduces latency, lowers origin load, and saves on data transfer costs.

The default caching behavior depends on the origin type:

- **Bucket origins**: cached for 6 months when the origin has no `Cache-Control` header. Stacktape automatically invalidates all cached content on each deploy.
- **API Gateway / ALB origins**: not cached by default. Responses are only cached if your origin sends `Cache-Control` headers or you set a `defaultTTL`.


Example (TypeScript):

```typescript
import { defineConfig, HttpApiGateway } from 'stacktape';

export default defineConfig(() => {
  const myApi = new HttpApiGateway({
    cdn: {
      enabled: true,
      cachingOptions: {
        defaultTTL: 300,
        maxTTL: 86400,
        minTTL: 60,
        cacheMethods: ['GET', 'HEAD', 'OPTIONS']
      }
    }
  });

  return {
    resources: { myApi }
  };
});
```


The `defaultTTL` (in seconds) is used when the origin response has no `Cache-Control` or `Expires` header — here, 300 seconds (5 minutes). The `maxTTL` caps how long CloudFront caches content even if the origin sends a higher `max-age`. The `minTTL` overrides the origin's `max-age` if the origin sets a lower value. Adding `OPTIONS` to `cacheMethods` is useful when your API serves CORS preflight requests.

Automatic Gzip and Brotli compression is enabled by default, reducing transfer size and cost. Set `disableCompression: true` to turn it off — rarely needed unless your origin handles compression itself.

If you have a pre-existing CloudFront cache policy, pass its ID via `cachePolicyId` instead of configuring TTL and cache key options manually.

### Cache key

The cache key determines what makes each cached response unique. By default, bucket origins use the URL path only, while API/ALB origins use the URL path plus query string. You can include specific headers, cookies, and query parameters in the cache key — different values produce different cached entries. Values included in the cache key are always forwarded to the origin.


Example (TypeScript):

```typescript
import { defineConfig, HttpApiGateway } from 'stacktape';

export default defineConfig(() => {
  const myApi = new HttpApiGateway({
    cdn: {
      enabled: true,
      cachingOptions: {
        defaultTTL: 600,
        cacheKeyParameters: {
          queryString: { whitelist: ['page', 'limit'] },
          headers: { whitelist: ['Accept-Language'] },
          cookies: { none: true }
        }
      }
    }
  });

  return {
    resources: { myApi }
  };
});
```


In this example, only the `page` and `limit` query parameters and the `Accept-Language` header affect the cache key. No cookies are included. Requests with different values for these produce different cached responses.

For cookies, the options are `none` (no cookies), `all` (all cookies), `whitelist` (specific cookies), or `allExcept` (all except listed). For headers: `none` or `whitelist`. For query strings: `none`, `all`, or `whitelist`.


> **Tip:** Keep the cache key as narrow as possible. Including all cookies or headers effectively disables caching for most APIs since every request has unique cookie values.


## Route rewrites

Route rewrites let a single CDN distribution serve requests from multiple backends. Each rewrite matches a URL path pattern and routes matching requests to a different origin. Unmatched requests go to the default origin (the parent resource the CDN is attached to). Rewrites are evaluated in order — the first match wins.

Path patterns support wildcards, for example `/api/*`, `*.jpg`, and `/docs/v2/*`.


Example (TypeScript):

```typescript
import { defineConfig, HttpApiGateway, Bucket } from 'stacktape';

export default defineConfig(() => {
  const assetsBucket = new Bucket({});
  const myApi = new HttpApiGateway({
    cdn: {
      enabled: true,
      routeRewrites: [
        {
          path: '/assets/*',
          routeTo: {
            type: 'bucket',
            properties: { bucketName: 'assetsBucket' }
          },
          cachingOptions: {
            defaultTTL: 86400
          }
        }
      ]
    }
  });

  return {
    resources: { assetsBucket, myApi }
  };
});
```


Requests to `/assets/*` are served from the `assetsBucket` bucket with a 24-hour default cache TTL, while all other requests go to the API gateway. This is a common pattern for SPAs: serve static assets from a bucket and proxy API calls to a backend through the same domain.

In `routeTo.properties`, the names `bucketName`, `httpApiGatewayName`, `loadBalancerName`, and `functionName` refer to Stacktape resource names defined in `resources`, not generated AWS physical names. The name must match the key used when returning the resource from `defineConfig`.

Each route rewrite can independently override `cachingOptions`, `forwardingOptions`, and `edgeFunctions`, so you can cache static assets aggressively while passing API requests through uncached.

Route rewrites support five origin types:

| Origin type | `type` value | Routes to |
|---|---|---|
| S3 bucket | `bucket` | A `bucket` resource in your stack |
| HTTP API Gateway | `http-api-gateway` | An `http-api-gateway` resource |
| Application Load Balancer | `application-load-balancer` | An `application-load-balancer` resource |
| Lambda function | `function` | A `function` resource (must have `url.enabled: true`) |
| External domain | `custom-origin` | Any external domain (e.g., `api.example.com`) |

For the `custom-origin` type, you specify a `domainName`, optional `protocol` (`HTTP` or `HTTPS`, default `HTTPS`), and optional `port`. This is useful for routing part of your traffic to a legacy API or third-party service while keeping everything behind one CDN domain.

Bucket route targets support `disableUrlNormalization` (disables clean URL normalization like `/about` to `/about.html`, defaults to `false`). ALB route targets support `listenerPort` (for custom listener setups) and `originDomainName` (when the ALB has no custom domains and uses `customCertificateArns`).

### Route prefixes

A `routePrefix` on a rewrite prepends a path prefix before forwarding to the origin. For example, with `routePrefix: '/v2'`, a request for `/users` is forwarded to the origin as `/v2/users`.

The top-level `defaultRoutePrefix` prepends a path prefix to all requests forwarded to the default origin. This is useful for versioned APIs or when your origin serves content from a sub-path. For example, setting `defaultRoutePrefix: '/v2'` on the CDN forwards all unmatched requests with `/v2` prepended to the path.

## Forwarding

Forwarding options control which headers, cookies, and query parameters the CDN passes through to your origin. By default, all headers, cookies, and query parameters are forwarded. Restricting forwarding strips unnecessary data from reaching your backend. Cache hit rate is primarily controlled by `cachingOptions.cacheKeyParameters`; forwarded values only affect cache variants when they are also included in the cache key.


Example (TypeScript):

```typescript
import { defineConfig, HttpApiGateway } from 'stacktape';

export default defineConfig(() => {
  const myApi = new HttpApiGateway({
    cdn: {
      enabled: true,
      forwardingOptions: {
        cookies: { none: true },
        headers: { whitelist: ['Accept', 'Accept-Language'] },
        queryString: { all: true },
        customRequestHeaders: [{ headerName: 'X-Forwarded-By', value: 'cdn' }]
      }
    }
  });

  return {
    resources: { myApi }
  };
});
```


This configuration strips all cookies, forwards only the `Accept` and `Accept-Language` headers, passes all query parameters, and injects a custom `X-Forwarded-By` header on every request sent to the origin. The `customRequestHeaders` property is useful for identifying CDN-routed traffic, injecting API keys, or passing custom identifiers.


> **Warning:** The `Authorization` header requires special handling. To forward it, you must add it to `cachingOptions.cacheKeyParameters.headers` — forwarding options alone do not cover `Authorization`.


For cookie forwarding, the supported modes are `none` (strip all cookies), `whitelist` (forward specific cookies), and `all` (forward all cookies). For query string forwarding: `all`, `none`, and `whitelist`. For header forwarding, several strategies are available: `none` (strip all), `whitelist` (specific headers), `allViewer` (all viewer headers), `allViewerAndWhitelistCloudFront` (viewer headers plus specific CloudFront headers like `CloudFront-Viewer-Country`), and `allExcept` (all viewer headers except listed ones). The CloudFront-specific headers are useful for geo-based routing or content localization. Keep forwarded values narrow — unnecessary cookies or query parameters add overhead, and if they are also part of the cache key, they reduce cache hit rates.

By default, all HTTP methods are forwarded. Use `allowedMethods` to restrict which methods reach the origin, for example `['GET', 'HEAD']` for read-only bucket content or `['GET', 'HEAD', 'OPTIONS', 'PUT', 'PATCH', 'POST', 'DELETE']` to explicitly allow all methods.

If you have a pre-existing CloudFront origin request policy, pass its ID via `originRequestPolicyId` instead of configuring forwarding options manually.

## Custom domains

[Set up the domain](/resources/networking/custom-domains#set-up-the-domain) with `stacktape domain add`, which also
creates the `us-east-1` certificate CloudFront needs. The deploy then attaches the certificate and creates the DNS
record. Without a custom domain, a CDN on a bucket, API Gateway or function uses its `*.cloudfront.net` URL. A CDN on
an Application Load Balancer needs a custom domain, or a `*.stacktape-app.com` domain from the
[Stacktape Console](/getting-started/add-the-console); without the Console connected, the deploy stops and asks for one.


Example (TypeScript):

```typescript
import { defineConfig, HttpApiGateway } from 'stacktape';

export default defineConfig(() => {
  const myApi = new HttpApiGateway({
    cdn: {
      enabled: true,
      customDomains: [{ domainName: 'api.example.com' }]
    }
  });

  return {
    resources: { myApi }
  };
});
```


`disableDnsRecordCreation: true` skips the DNS record when DNS is elsewhere. A `customCertificateArn` must be in
`us-east-1`. `$ResourceParam('myApi', 'cdnCustomDomainUrls')` gives the domain URLs. See
[Custom domains](/resources/networking/custom-domains).

## Edge functions

`edgeFunctions` runs [edge functions](/resources/compute/edge-function), defined as their own resources, at four points
of a request:

| Hook | Runs | Typical use |
|---|---|---|
| `onRequest` | When CloudFront receives the request, before the cache | Auth checks, redirects, URL rewrites, A/B tests |
| `onResponse` | Before the response goes to the client (not after an origin error of 400 or more, or when `onRequest` answered) | Security headers, cookies |
| `onOriginRequest` | Before a cache miss goes to the origin | Change the origin path or headers |
| `onOriginResponse` | After the origin answers, before caching | Change the response that gets cached |

`onRequest` can answer by itself, for example with a 401, so the request never reaches the cache or the origin. Keep
business logic and database access in the origin: edge functions deploy to every location and are harder to debug.


Example (TypeScript):

```typescript
import {
  defineConfig,
  HttpApiGateway,
  EdgeLambdaFunction,
  JsBundleLambdaPackaging
} from 'stacktape';
export default defineConfig(() => {
  const authAtEdge = new EdgeLambdaFunction({
    packaging: new JsBundleLambdaPackaging({
      entryfilePath: './src/edge/auth.ts'
    })
  });

  const securityHeaders = new EdgeLambdaFunction({
    packaging: new JsBundleLambdaPackaging({
      entryfilePath: './src/edge/headers.ts'
    })
  });

  const myApi = new HttpApiGateway({
    cdn: {
      enabled: true,
      edgeFunctions: {
        onRequest: 'authAtEdge',
        onResponse: 'securityHeaders'
      }
    }
  });

  return {
    resources: { authAtEdge, securityHeaders, myApi }
  };
});
```


> **Warning:** Stacktape uses `onOriginRequest` itself for bucket and API Gateway origins. Setting your own can break that
behavior.


Each route rewrite can run its own edge functions.

## Price class

`cloudfrontPriceClass` picks the CloudFront locations that serve your users. Fewer locations cost less per request and
are slower for users far from them.

| Price class | Locations |
|---|---|
| `PriceClass_100` | North America and Europe |
| `PriceClass_200` | Also Asia, the Middle East and Africa |
| `PriceClass_All` (default) | Everywhere, including South America and Oceania |

For users in North America and Europe, `PriceClass_100` is the cheapest with no latency cost for them.


Example (TypeScript):

```typescript
import { defineConfig, HttpApiGateway } from 'stacktape';

export default defineConfig(() => {
  const myApi = new HttpApiGateway({
    cdn: {
      enabled: true,
      cloudfrontPriceClass: 'PriceClass_100'
    }
  });

  return {
    resources: { myApi }
  };
});
```


## Firewall

`useFirewall` names a [web application firewall](/resources/security/web-application-firewall) with `scope: 'cdn'` and
attaches it to the distribution, so blocked requests stop at CloudFront. A firewall costs about $7 a month with the
default rules plus $0.60 per million requests.


Example (TypeScript):

```typescript
import { defineConfig, HttpApiGateway, WebAppFirewall } from 'stacktape';
export default defineConfig(() => {
  const myFirewall = new WebAppFirewall({
    scope: 'cdn'
  });

  const myApi = new HttpApiGateway({
    cdn: {
      enabled: true,
      useFirewall: 'myFirewall'
    }
  });

  return {
    resources: { myFirewall, myApi }
  };
});
```


## Cache invalidation

Stacktape clears the whole CDN cache on every deploy, so users see the new version at once. If your file names contain
a content hash, set `disableInvalidationAfterDeploy: true` to keep old files cached between deploys.


Example (TypeScript):

```typescript
import { defineConfig, HttpApiGateway } from 'stacktape';

export default defineConfig(() => {
  const myApi = new HttpApiGateway({
    cdn: {
      enabled: true,
      disableInvalidationAfterDeploy: true
    }
  });

  return {
    resources: { myApi }
  };
});
```


## Document defaults

The `indexDocument` and `errorDocument` properties control which files are served for root requests and error responses. The `indexDocument` defaults to `/index.html` — requests to `/` serve this file. The `errorDocument` defaults to `/404.html` — requests for missing paths return this page. These defaults are most relevant for bucket-backed CDN distributions serving static sites and SPAs.

## Configuration reference
Because CDN is configured as a nested property on a parent resource, the API reference below documents `CdnConfiguration`, not a standalone resource props type. The full configuration reference for `CdnConfiguration` and all nested types is below.


### Definition: `CdnConfiguration`

The complete property-level reference is included in `llms-api-reference.txt` and indexed under route `/config-reference/cdn` with definition name `CdnConfiguration`.

| Property | Required | Type | Default |
| --- | --- | --- | --- |
| `enabled` | yes | `boolean` | `false` |
| `cachingOptions` | no | `CdnCachingOptions` | - |
| `cloudfrontPriceClass` | no | `string: "PriceClass_100" \| "PriceClass_200" \| "PriceClass_All"` | `PriceClass_All` |
| `customDomains` | no | `Array<DomainConfiguration>` | - |
| `defaultRoutePrefix` | no | `string` | - |
| `disableInvalidationAfterDeploy` | no | `boolean` | `false` |
| `edgeFunctions` | no | `EdgeFunctionsConfig` | - |
| `errorDocument` | no | `string` | `/404.html` |
| `forwardingOptions` | no | `CdnForwardingOptions` | - |
| `indexDocument` | no | `string` | `/index.html` |
| `routeRewrites` | no | `Array<CdnRouteRewrite>` | - |
| `useFirewall` | no | `string` | - |


## Referenceable parameters

CDN parameters are accessed through the parent resource using `$ResourceParam()`. Since CDN is a sub-property (not a standalone resource), you reference CDN values using the parent resource name. For example, if your HTTP API Gateway is named `myApi`, use `$ResourceParam('myApi', 'cdnUrl')` to get the CDN URL.

Available CDN parameters:

| Parameter | Description |
|---|---|
| `cdnDomain` | The CloudFront distribution domain name |
| `cdnUrl` | The CloudFront distribution URL |
| `cdnCustomDomains` | Custom domain value(s) for the CDN |
| `cdnCustomDomainUrls` | Custom domain URL value(s) for the CDN |
| `cdnCanonicalDomain` | The primary domain for the CDN |
| `cdnCanonicalUrl` | The primary URL for the CDN |

## Next steps

- [Static hosting](/resources/frontend/static-hosting): host a frontend behind the CDN.
- [Edge function](/resources/compute/edge-function): run code on requests at the edge.
- [Web application firewall](/resources/security/web-application-firewall): block malicious requests before they reach your origin.
