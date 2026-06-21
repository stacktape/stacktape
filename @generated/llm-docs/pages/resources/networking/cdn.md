# CDN

A Stacktape CDN attaches a CloudFront distribution to a parent resource — `bucket`, `http-api-gateway`, `application-load-balancer`, and `function` resources are supported. It caches content at edge locations worldwide so users hit the nearest server instead of your origin. Pay-per-use pricing: ~$0.01 per 10,000 requests plus data transfer, no monthly base cost. See [buckets](/resources/storage/s3-bucket), [HTTP API Gateways](/resources/networking/http-api-gateway), [Application Load Balancers](/resources/networking/application-load-balancer), and [Lambda functions](/resources/compute/lambda-function) for the parent resource pages.

## When to use

CDN is the right choice when your users are geographically distributed and you want lower latency, reduced origin load, or both. It also unlocks multi-origin routing, edge-level request manipulation, and WAF protection at the CloudFront layer.

Common patterns that fit well:

- **Static sites and SPAs** — HTML, CSS, JS, and images served from a bucket. Bucket origins default to a 6-month cache time when no `Cache-Control` header is present, reducing origin traffic for cacheable assets. Stacktape automatically invalidates cached content on each deploy.
- **Global APIs with cacheable responses** — product catalogs, config endpoints, public data. CDN caches GET responses at the edge so your API only handles cache misses. You control caching via `Cache-Control` headers from your origin or by setting `cachingOptions.defaultTTL`.
- **Multi-origin architectures** — a single CDN domain routes `/api/*` to an API gateway and `/assets/*` to a bucket. Simplifies CORS and gives your frontend a single domain.
- **Edge authentication and request manipulation** — use [edge functions](/resources/compute/edge-function) to verify JWTs, rewrite URLs, or run A/B tests before the request reaches your origin.
- **WAF protection at the edge** — attach a [web application firewall](/resources/security/web-application-firewall) to the CDN for protection against common web exploits.

## When NOT to use

- **Fully dynamic, user-specific APIs** — if every response is personalized and uncacheable, CDN adds CloudFront request charges and propagation complexity without caching benefit. The default direct endpoint is simpler.
- **Development and staging stages** — CDN can add distribution propagation and cache invalidation time; custom domains also add certificate provisioning and DNS setup. For non-production stages, skip CDN and iterate faster.
- **Low-traffic, single-region apps** — if your users are concentrated in one region and traffic is low, the latency improvement is negligible and CDN adds configuration complexity.
- **Traffic that should not be cached or transformed at the edge** — for traffic patterns where CloudFront behavior adds no value, use the direct [Application Load Balancer](/resources/networking/application-load-balancer) or [API Gateway](/resources/networking/http-api-gateway) endpoint.

## Basic example

CDN is not a standalone resource — it is a `cdn` property you add to a supported parent resource. Set `enabled: true` to attach a CloudFront distribution. The simplest configuration uses all defaults: all regions served (`PriceClass_All`), automatic cache invalidation on deploy, and automatic Gzip/Brotli compression.

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


With CDN enabled on an API gateway, requests go through CloudFront before reaching the origin. For API Gateway and ALB origins, responses are not cached by default unless your origin sends `Cache-Control` headers or you set a `defaultTTL`.

### Bucket-backed CDN

The most common CDN use case is serving static content from a [bucket](/resources/storage/s3-bucket). Bucket origins default to a 6-month cache time when no `Cache-Control` header is present, and Stacktape automatically invalidates all cached content on each deploy.


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


Setting `cloudfrontPriceClass` to `PriceClass_100` restricts edge locations to North America and Europe — the cheapest option. See [Price class](#price-class) for all three options.

CDN exposes `cdnUrl` as a referenceable parameter; reference it with `$ResourceParam('staticAssets', 'cdnUrl')` using the parent resource name. You can also retrieve parameters after deploy with [`stacktape param:get`](/cli/param-get). See [Referenceable parameters](#referenceable-parameters) for all available CDN parameters.

## Examples

These examples show common CDN patterns that combine multiple features. Each is a complete `defineConfig` you can copy as a starting point.

### Static site with custom domain

A bucket-backed CDN with a custom domain for a production static site. This is the typical setup for SPAs and marketing sites: all content cached at the edge, automatic invalidation on deploy, and a branded URL.


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


The `PriceClass_100` restricts edge locations to North America and Europe — the cheapest option. The custom domain requires a Route53 hosted zone in your AWS account; set one up with [`stacktape domain:add`](/cli/domain-add). See [Price class](#price-class) for region coverage options and [Custom domains](#custom-domains) for DNS and certificate details.

### Multi-origin API with WAF

An API gateway CDN that routes `/assets/*` to a bucket and protects the entire distribution with a web application firewall. This pattern gives your frontend a single domain for both API calls and static assets, with edge-level security.


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


Requests to `/assets/*` are served from the bucket with a 24-hour cache TTL, while all other requests pass through to the API gateway uncached. The `useFirewall` property attaches the named `web-app-firewall` resource to protect the CDN distribution — see the [web application firewall](/resources/security/web-application-firewall) page for rule and inspection details. See [Route rewrites](#route-rewrites) for all origin types.

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

Path patterns support wildcards — for example, `/api/*`, `*.jpg`, and `/docs/v2/*`.


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

By default, all HTTP methods are forwarded. Use `allowedMethods` to restrict which methods reach the origin — for example, `['GET', 'HEAD']` for read-only bucket content or `['GET', 'HEAD', 'OPTIONS', 'PUT', 'PATCH', 'POST', 'DELETE']` to explicitly allow all methods.

If you have a pre-existing CloudFront origin request policy, pass its ID via `originRequestPolicyId` instead of configuring forwarding options manually.

## Custom domains

Stacktape can attach your own domain (e.g., `cdn.example.com`) to the CDN distribution. Stacktape can automatically create DNS records and provision a free TLS certificate. Set `disableDnsRecordCreation: true` if you manage DNS records yourself, or provide `customCertificateArn` to use your own ACM certificate. Your domain must have a [Route53 hosted zone](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/hosted-zones-working-with.html) in your AWS account — use [`stacktape domain:add`](/cli/domain-add) to set one up.

**When to use a custom domain:** Production and customer-facing stages where a branded, stable URL matters (e.g., `api.yourproduct.com` or `app.yourproduct.com`). Custom domains also make it easier to switch infrastructure behind the scenes without breaking client integrations. **When the default CloudFront URL is fine:** Development stages, internal tools, and early validation where a generated `d1234.cloudfront.net` URL is acceptable. Custom domains add DNS propagation and certificate provisioning overhead that slows down initial deploys. For full domain management details, see [Custom domains](/resources/networking/custom-domains).


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


You can attach multiple domains to a single CDN distribution. Set `disableDnsRecordCreation: true` if you manage DNS records yourself — Stacktape will skip creating the DNS record. For specific certificate requirements, provide `customCertificateArn` with an ACM certificate ARN instead of relying on automatic certificate provisioning.


> **Warning:** AWS CloudFront requires that viewer certificates are provisioned in ACM `us-east-1`, regardless of where your origin resources are deployed. If you provide a `customCertificateArn`, ensure the certificate is in `us-east-1`.


After deployment, custom domain URLs are available via `$ResourceParam('myApi', 'cdnCustomDomainUrls')`. For full details on domain management, see [Custom domains](/resources/networking/custom-domains).

## Edge functions

Edge functions run custom code at CloudFront hook points on CDN requests and responses. `onRequest` can return early before the origin is contacted; origin hooks run around cache misses and origin responses. They use [edge Lambda functions](/resources/compute/edge-function) defined as separate resources in your stack. The `edgeFunctions` property references these resources by name.

**When to use edge functions:** Lightweight auth checks (JWT verification, API key validation), URL rewrites, header injection, redirects, and A/B test routing that must happen before the request reaches your origin. **When to keep logic in the origin:** Normal business logic, database access, and code that changes frequently. Edge functions deploy to all CloudFront edge locations, which adds deployment time and makes debugging harder than origin-side code. Most CDN setups work well without edge functions — add them only when you need to act on the request before it reaches the origin or cache.

Four hook points are available:

| Hook | Runs when | Common use cases |
|---|---|---|
| `onRequest` | CDN receives request (before cache lookup) | Auth checks, URL rewrites, A/B testing, early responses |
| `onResponse` | Before returning response to client (does not run if origin returned 400+ error or `onRequest` already generated a response) | Modify response headers, add security headers, set cookies |
| `onOriginRequest` | Before forwarding to origin (after cache miss) | Modify origin request path or headers |
| `onOriginResponse` | After origin responds (before caching) | Modify response before it enters cache |


Example (TypeScript):

```typescript
import {
  defineConfig,
  HttpApiGateway,
  EdgeLambdaFunction,
  StacktapeLambdaBuildpackPackaging
} from 'stacktape';
export default defineConfig(() => {
  const authAtEdge = new EdgeLambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/edge/auth.ts'
    })
  });

  const securityHeaders = new EdgeLambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
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


The `onRequest` function runs before the cache lookup, so it can short-circuit requests (return 401 for unauthorized users) without ever reaching the origin or cache. The `onResponse` function runs before the response reaches the client — use it to modify response headers, add security headers, or set cookies.


> **Warning:** Stacktape uses `onOriginRequest` internally for some CDN setups, including bucket and API Gateway origins. Overriding it may break default behavior. Only use `onOriginRequest` if you understand the implications for your specific parent resource type.


Edge functions can also be configured per-route in `routeRewrites`, so different URL patterns can run different edge logic.

## Price class

The `cloudfrontPriceClass` property controls which CloudFront edge regions serve your content. Fewer regions mean lower per-request costs but higher latency for users outside the covered areas.

| Price class | Regions covered | Relative cost |
|---|---|---|
| `PriceClass_100` | North America + Europe | Lowest |
| `PriceClass_200` | + Asia, Middle East, Africa | Mid-range |
| `PriceClass_All` (default) | All regions worldwide, including South America and Oceania | Highest |

The CDN has no monthly base cost — the price class only affects per-request rates, which vary by region. If your users are primarily in the US and Europe, `PriceClass_100` is the cheapest option with no practical latency penalty for those regions.


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


> **Tip:** Start with `PriceClass_100` for development and early-stage products. Upgrade to `PriceClass_200` or `PriceClass_All` when your user base grows beyond North America and Europe.


## Firewall

The `useFirewall` property references a [web application firewall](/resources/security/web-application-firewall) resource by name. When set, the named firewall is attached to the CDN distribution. See the [firewall page](/resources/security/web-application-firewall) for rule configuration and inspection behavior.


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


**When to enable:** Production APIs exposed to the public internet, especially those handling sensitive data or financial transactions. AWS WAF charges a monthly fee per web ACL and per rule, plus per-request inspection charges — budget for this in production.

**When to skip:** Internal tools, development stages, or APIs already behind other security layers. The per-rule and per-request costs add up for low-risk workloads.

## Cache invalidation

By default, Stacktape invalidates all cached CDN content on every deploy. This ensures users immediately see the latest version of your application after deployment. Set `disableInvalidationAfterDeploy: true` to skip automatic invalidation if you manage cache lifecycles yourself or use content-hashed filenames.


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


> **Tip:** Disabling automatic invalidation is usually a good fit when your deployment process uses content-hashed filenames and you intentionally keep old cached assets between deploys.


## Document defaults

The `indexDocument` and `errorDocument` properties control which files are served for root requests and error responses. The `indexDocument` defaults to `/index.html` — requests to `/` serve this file. The `errorDocument` defaults to `/404.html` — requests for missing paths return this page. These defaults are most relevant for bucket-backed CDN distributions serving static sites and SPAs.

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

## API Reference

Because CDN is configured as a nested property on a parent resource, the API reference below documents `CdnConfiguration`, not a standalone resource props type. The full configuration reference for `CdnConfiguration` and all nested types is below.


## API Reference: `CdnConfiguration`
```typescript
import type { CdnCachingOptions, CdnForwardingOptions, CdnRouteRewrite, DomainConfiguration, EdgeFunctionsConfig } from 'stacktape';

type CdnConfiguration = {
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
  /** Route specific URL patterns to different origins (e.g., /api/* → Lambda, /assets/* → S3). */
  routeRewrites?: Array<CdnRouteRewrite>;
  /** Name of a web-app-firewall resource to protect this CDN from common web exploits. */
  useFirewall?: string;
};
```

| Property | Required | Type | Description | Default |
| --- | --- | --- | --- | --- |
| `enabled` | yes | `boolean` | Enable CDN (CloudFront) for faster global delivery and lower bandwidth costs. Caches responses at edge locations worldwide so users get content from the nearest server.
The CDN itself has no monthly fee — you pay per request (~$0.01/10k) and per GB transferred. | `false` |
| `cachingOptions` | no | `CdnCachingOptions` | Control how long and what gets cached at the CDN edge. When the origin response has no `Cache-Control` header, defaults apply:

**Bucket origins**: cached for 6 months (or until invalidated on deploy).
**API Gateway / Load Balancer origins**: not cached. | - |
| `cloudfrontPriceClass` | no | `string: "PriceClass_100" \| "PriceClass_200" \| "PriceClass_All"` | Which regions the CDN serves from. Fewer regions = lower cost, but slower for distant users. **`PriceClass_100`**: North America + Europe. Cheapest option. Good if your users are in the US/EU.
**`PriceClass_200`**: Adds Asia, Middle East, Africa.
**`PriceClass_All`** (default): All regions worldwide, including South America and Oceania.

The CDN itself has no monthly base cost - you only pay per request and per GB transferred.
The price class controls which edge locations are used, and some regions cost more per request. | `PriceClass_All` |
| `customDomains` | no | `Array<DomainConfiguration>` | Custom domains (e.g., `cdn.example.com`). Stacktape auto-creates DNS records and TLS certificates. Your domain must be added as a Route53 hosted zone in your AWS account first. | - |
| `defaultRoutePrefix` | no | `string` | Prepend a path prefix to all requests forwarded to the origin. E.g., with prefix `/v2`, a request for `/users` is forwarded to the origin as `/v2/users`. | - |
| `disableInvalidationAfterDeploy` | no | `boolean` | Skip clearing the CDN cache after each deploy. By default, all cached content is flushed on every deploy so users see the latest version.
Set to `true` if you manage cache invalidation yourself or want to keep cached content between deploys. | `false` |
| `edgeFunctions` | no | `EdgeFunctionsConfig` | Run edge functions on CDN requests/responses (URL rewrites, auth, A/B testing). `onRequest`: Before cache lookup — modify the request, add auth, or return early.
`onResponse`: Before returning to the client — modify headers, add cookies. | - |
| `errorDocument` | no | `string` | Page to show for 404 errors (e.g., `/error.html`). | `/404.html` |
| `forwardingOptions` | no | `CdnForwardingOptions` | Control which headers, cookies, and query params are forwarded to your origin. By default, all headers/cookies/query params are forwarded. Use this to restrict
what reaches your app (e.g., strip cookies for static content). | - |
| `indexDocument` | no | `string` | Page served for requests to `/`. | `/index.html` |
| `routeRewrites` | no | `Array<CdnRouteRewrite>` | Route specific URL patterns to different origins (e.g., `/api/*` → Lambda, `/assets/*` → S3). Evaluated in order; first match wins. Unmatched requests go to the default origin.
Each route can have its own caching and forwarding settings. | - |
| `useFirewall` | no | `string` | Name of a `web-app-firewall` resource to protect this CDN from common web exploits. | - |


## FAQ

### How much does a CloudFront CDN cost?

CloudFront has no monthly base fee. You pay per request (~$0.01 per 10,000 requests) and per GB of data transferred out. The `cloudfrontPriceClass` setting controls which regions are used — `PriceClass_100` (North America + Europe) has the lowest per-request rates. CloudFront pricing varies by region, so your exact costs depend on where your users are located and how much data you transfer.

### How do I attach a CDN to my Stacktape resource?

Add a `cdn` property with `enabled: true` to any supported parent resource: `bucket`, `http-api-gateway`, `application-load-balancer`, or `function` (see [HTTP API Gateway](/resources/networking/http-api-gateway), [Application Load Balancer](/resources/networking/application-load-balancer), [bucket](/resources/storage/s3-bucket), and [Lambda function](/resources/compute/lambda-function)). The CDN is configured entirely through this sub-property — there is no separate CDN resource to define.

### Can I use a custom domain with CDN?

Yes. Add a `customDomains` array inside the `cdn` configuration with your domain name. Stacktape can automatically provision a free TLS certificate and create a DNS record in Route53. Your domain must have a Route53 hosted zone — set one up with [`stacktape domain:add`](/cli/domain-add). If you provide a `customCertificateArn`, the ACM certificate must be in `us-east-1` (an AWS CloudFront requirement). See [Custom domains](/resources/networking/custom-domains) for details.

### What happens to the CDN cache when I deploy?

By default, Stacktape invalidates all cached CDN content on every deploy so users immediately see the latest version. Set `disableInvalidationAfterDeploy: true` to skip this if you use content-hashed filenames or manage cache invalidation yourself. AWS CloudFront cache invalidations propagate asynchronously across all edge locations.

### Can I route different URL paths to different backends?

Yes, using `routeRewrites`. Each rewrite matches a URL path pattern (wildcards supported) and routes matching requests to a different origin — a bucket, API gateway, ALB, Lambda function, or external domain. Unmatched requests go to the default origin. Each rewrite can have its own caching, forwarding, and edge function settings.

### When should I add a CDN to my API?

Add a CDN to APIs that serve cacheable public data (product listings, config endpoints, public content) or need lower global latency. Also consider CDN for multi-origin routing (single domain for frontend + API). Skip CDN for fully dynamic, user-specific APIs where every response is unique — the CDN adds request charges without caching benefit. For development stages, the direct endpoint is simpler and faster to iterate with.

### How does CDN caching work with dynamic content?

For API Gateway and ALB origins, responses are not cached by default when no caching header is present. You can enable caching by having your origin send `Cache-Control` headers, or by setting `cachingOptions.defaultTTL` on the CDN configuration. Bucket origins have a 6-month default cache time when no `Cache-Control` header is present. Be careful caching personalized content: use cache key parameters to differentiate responses by user-specific headers or cookies.

### How fast does CloudFront propagate changes?

Cache invalidations and distribution changes are asynchronous and can take time to propagate across all edge locations globally. New distributions and configuration changes (custom domains, price class updates) also propagate asynchronously before becoming fully effective. Plan for this delay when deploying changes that users need to see immediately — automatic cache invalidation on deploy handles the most common case.

### Can I protect my CDN with a web application firewall?

Yes. Define a [web application firewall](/resources/security/web-application-firewall) resource with `scope: 'cdn'` and reference it by name from the `useFirewall` property in your CDN configuration. AWS WAF charges per web ACL, per rule, and per request inspected — see the [firewall page](/resources/security/web-application-firewall) for rule configuration details.

### What is the difference between CDN price classes?

The three price classes control which CloudFront edge locations serve your content. `PriceClass_100` covers North America and Europe with the lowest per-request rates. `PriceClass_200` adds Asia, Middle East, and Africa. `PriceClass_All` (the default) includes all regions worldwide including South America and Oceania. There is no monthly base fee for any class — only per-request and data transfer charges. Most teams start with `PriceClass_100` and upgrade as their user base grows geographically.
