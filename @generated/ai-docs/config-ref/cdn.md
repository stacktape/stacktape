---
docType: config-ref
title: Cdn Configuration
resourceType: cdn
tags:
  - cdn
  - cloudfront
  - distribution
source: types/stacktape-config/cdn.d.ts
priority: 1
---

# Cdn Configuration

Resource type: `cdn`

## TypeScript Definition

```typescript
interface CdnConfiguration {
  /**
   * #### Enable CDN (CloudFront) for faster global delivery and lower bandwidth costs.
   *
   * ---
   *
   * Caches responses at edge locations worldwide so users get content from the nearest server.
   * The CDN itself has no monthly fee — you pay per request (~$0.01/10k) and per GB transferred.
   *
   * @default false
   */
  enabled: boolean;
  /**
   * #### Control how long and what gets cached at the CDN edge.
   *
   * ---
   *
   * When the origin response has no `Cache-Control` header, defaults apply:
   * - **Bucket origins**: cached for 6 months (or until invalidated on deploy).
   * - **API Gateway / Load Balancer origins**: not cached.
   */
  cachingOptions?: CdnCachingOptions;
  /**
   * #### Control which headers, cookies, and query params are forwarded to your origin.
   *
   * ---
   *
   * By default, all headers/cookies/query params are forwarded. Use this to restrict
   * what reaches your app (e.g., strip cookies for static content).
   */
  forwardingOptions?: CdnForwardingOptions;
  /**
   * #### Route specific URL patterns to different origins (e.g., `/api/*` → Lambda, `/assets/*` → S3).
   *
   * ---
   *
   * Evaluated in order; first match wins. Unmatched requests go to the default origin.
   * Each route can have its own caching and forwarding settings.
   */
  routeRewrites?: CdnRouteRewrite[];
  /**
   * #### Custom domains (e.g., `cdn.example.com`). Stacktape auto-creates DNS records and TLS certificates.
   *
   * ---
   *
   * Your domain must be added as a Route53 hosted zone in your AWS account first.
   */
  customDomains?: DomainConfiguration[];
  /**
   * #### Run edge functions on CDN requests/responses (URL rewrites, auth, A/B testing).
   *
   * ---
   *
   * - `onRequest`: Before cache lookup — modify the request, add auth, or return early.
   * - `onResponse`: Before returning to the client — modify headers, add cookies.
   */
  edgeFunctions?: EdgeFunctionsConfig;
  /**
   * #### Which regions the CDN serves from. Fewer regions = lower cost, but slower for distant users.
   *
   * ---
   *
   * - **`PriceClass_100`**: North America + Europe. Cheapest option. Good if your users are in the US/EU.
   * - **`PriceClass_200`**: Adds Asia, Middle East, Africa.
   * - **`PriceClass_All`** (default): All regions worldwide, including South America and Oceania.
   *
   * The CDN itself has no monthly base cost - you only pay per request and per GB transferred.
   * The price class controls which edge locations are used, and some regions cost more per request.
   *
   * @default PriceClass_All
   */
  cloudfrontPriceClass?: 'PriceClass_100' | 'PriceClass_200' | 'PriceClass_All';
  /**
   * #### Prepend a path prefix to all requests forwarded to the origin.
   *
   * ---
   *
   * E.g., with prefix `/v2`, a request for `/users` is forwarded to the origin as `/v2/users`.
   */
  defaultRoutePrefix?: string;
  /**
   * #### Page to show for 404 errors (e.g., `/error.html`).
   * @default /404.html
   */
  errorDocument?: string;
  /**
   * #### Page served for requests to `/`.
   * @default /index.html
   */
  indexDocument?: string;
  /**
   * #### Skip clearing the CDN cache after each deploy.
   *
   * ---
   *
   * By default, all cached content is flushed on every deploy so users see the latest version.
   * Set to `true` if you manage cache invalidation yourself or want to keep cached content between deploys.
   *
   * @default false
   */
  disableInvalidationAfterDeploy?: boolean;
  /**
   * #### Name of a `web-app-firewall` resource to protect this CDN from common web exploits.
   */
  useFirewall?: string;
}

interface EdgeFunctionsConfig {
  /**
   * #### Name of an `edge-lambda-function` to run when the CDN receives a request (before cache lookup).
   *
   * ---
   *
   * Use to modify the request, add auth checks, or return an immediate response without hitting the origin.
   */
  onRequest?: string;
  /**
   * #### Name of an `edge-lambda-function` to run before returning the response to the client.
   *
   * ---
   *
   * Use to modify response headers, add security headers, or set cookies.
   * Does not run if the origin returned a 400+ error or if `onRequest` already generated a response.
   */
  onResponse?: string;
  /**
   * #### Name of an `edge-lambda-function` to run before forwarding to the origin (after cache miss).
   *
   * ---
   *
   * Only runs on cache misses. Use to modify the request before it reaches your origin.
   *
   * > **Warning:** Stacktape uses this trigger internally for bucket/web-service/API Gateway CDN setups.
   * > Overriding it may break default behavior. Only use if you know what you're doing.
   */
  onOriginRequest?: string;
  /**
   * #### Name of an `edge-lambda-function` to run after the origin responds (before caching).
   *
   * ---
   *
   * Modify the response before it's cached and returned. Changes are cached as if they came from the origin.
   */
  onOriginResponse?: string;
}

interface CdnRouteRewrite {
  /**
   * #### URL path pattern to match (e.g., `/api/*`, `*.jpg`, `/docs/v2/*`). Wildcards supported.
   */
  path: string;
  /**
   * #### Prepend a path prefix to requests before forwarding to the origin.
   *
   * ---
   *
   * E.g., with prefix `/v2`, a request for `/users` is forwarded as `/v2/users`.
   */
  routePrefix?: string;
  /**
   * #### Where to send matching requests. Can be a bucket, API Gateway, load balancer, Lambda, or external domain.
   *
   * ---
   *
   * If not set, requests go to the default origin (the resource this CDN is attached to).
   */
  routeTo?:
    | CdnLoadBalancerRoute
    | CdnHttpApiGatewayRoute
    | CdnBucketRoute
    | CdnCustomDomainRoute
    | CdnLambdaFunctionRoute; // | CdnWebServiceRoute;
  /**
   * #### Override caching behavior for requests matching this route.
   */
  cachingOptions?: CdnCachingOptions;
  /**
   * #### Override which headers, cookies, and query params are forwarded for this route.
   */
  forwardingOptions?: CdnForwardingOptions;
  /**
   * #### Run edge functions on requests/responses matching this route.
   */
  edgeFunctions?: EdgeFunctionsConfig;
}

interface CdnLoadBalancerRoute {
  type: 'application-load-balancer';
  properties: CdnLoadBalancerOrigin;
}

interface CdnLoadBalancerOrigin {
  /**
   * #### Name of the `application-load-balancer` resource to route to.
   */
  loadBalancerName: string;
  /**
   * #### Listener port on the load balancer. Only needed if using custom listeners.
   */
  listenerPort?: number;
  /**
   * #### Explicit origin domain. Only needed if the ALB has no `customDomains` and uses `customCertificateArns`.
   */
  originDomainName?: string;
}

interface CdnHttpApiGatewayRoute {
  type: 'http-api-gateway';
  properties: CdnHttpApiGatewayOrigin;
}

interface CdnHttpApiGatewayOrigin {
  /**
   * #### Name of the `http-api-gateway` resource to route to.
   */
  httpApiGatewayName: string;
}

interface CdnLambdaFunctionRoute {
  type: 'function';
  properties: CdnLambdaFunctionOrigin;
}

interface CdnLambdaFunctionOrigin {
  /**
   * #### Name of the `function` resource to route to. The function must have `url.enabled: true`.
   */
  functionName: string;
}

interface CdnCustomDomainRoute {
  type: 'custom-origin';
  properties: CdnCustomOrigin;
}

interface CdnCustomOrigin {
  /**
   * #### Domain name of the external origin (e.g., `api.example.com`).
   */
  domainName: string;
  /**
   * #### Protocol for connecting to the origin.
   * @default HTTPS
   */
  protocol?: 'HTTP' | 'HTTPS';
  /**
   * #### Port on the origin. Defaults to 443 for HTTPS, 80 for HTTP.
   */
  port?: number;
}

interface CdnBucketRoute {
  type: 'bucket';
  properties: CdnBucketOrigin;
}

interface CdnBucketOrigin {
  /**
   * #### Name of the `bucket` resource to route to.
   */
  bucketName: string;
  /**
   * #### Disable clean URL normalization (e.g., `/about` → `/about.html`).
   * @default false
   */
  disableUrlNormalization?: boolean;
}

interface CdnResponseHeader {
  /**
   * #### Name of the header
   */
  headerName: string;
  /**
   * #### Value of the header
   */
  value: string;
}

interface CdnCachingOptions {
  /**
   * #### HTTP methods to cache. Use `['GET', 'HEAD', 'OPTIONS']` if your API uses CORS preflight.
   */
  cacheMethods?: ('GET' | 'HEAD' | 'OPTIONS')[];
  /**
   * #### Minimum cache time (seconds). Overrides `Cache-Control: max-age` if the origin sets a lower value.
   */
  minTTL?: number;
  /**
   * #### Maximum cache time (seconds). Caps how long the CDN caches content, even if the origin says longer.
   */
  maxTTL?: number;
  /**
   * #### Default cache time (seconds). Used when the origin response has no `Cache-Control` or `Expires` header.
   */
  defaultTTL?: number;
  /**
   * #### Disable automatic Gzip/Brotli compression. Compression is on by default and reduces transfer size/cost.
   * @default false
   */
  disableCompression?: boolean;
  /**
   * #### Which headers, cookies, and query params make responses unique in the cache.
   *
   * ---
   *
   * Defaults: **Bucket** = URL path only. **API/ALB** = URL path + query string.
   * Values included in the cache key are always forwarded to the origin.
   */
  cacheKeyParameters?: CdnCacheKey;
  /**
   * #### Use a pre-existing AWS cache policy ID instead of configuring TTL and cache key options here.
   */
  cachePolicyId?: string;
}

interface CdnCacheKey {
  /**
   * #### Which cookies to include in the cache key. Different cookie values = different cached responses.
   */
  cookies?: CacheKeyCookies;
  /**
   * #### Which headers to include in the cache key. Different header values = different cached responses.
   */
  headers?: CacheKeyHeaders;
  /**
   * #### Which query params to include in the cache key. Different param values = different cached responses.
   */
  queryString?: CacheKeyQueryString;
}

interface CacheKeyCookies {
  /**
   * #### No cookies are included in the cache key.
   */
  none?: boolean;
  /**
   * #### Only the listed cookies are included in the cache key.
   */
  whitelist?: string[];
  /**
   * #### All cookies except the listed ones are included in the cache key.
   */
  allExcept?: string[];
  /**
   * #### All cookies are included in the cache key.
   */
  all?: boolean;
}

interface CacheKeyHeaders {
  /**
   * #### No headers are included in the cache key.
   */
  none?: boolean;
  /**
   * #### Only the listed headers are included in the cache key.
   */
  whitelist?: string[];
}

interface CacheKeyQueryString {
  /**
   * #### All query parameters are included in the cache key.
   */
  all?: boolean;
  /**
   * #### No query parameters are included in the cache key.
   */
  none?: boolean;
  /**
   * #### Only the listed query parameters are included in the cache key.
   */
  whitelist?: string[];
}

interface CdnCustomRequestHeader {
  /**
   * #### Name of the header
   */
  headerName: string;
  /**
   * #### Value of the header
   */
  value: string;
}

interface CdnForwardingOptions {
  /**
   * #### Static headers the CDN adds to every request sent to the origin (e.g., API keys, custom identifiers).
   */
  customRequestHeaders?: CdnCustomRequestHeader[];
  /**
   * #### HTTP methods forwarded to the origin. Default: all methods.
   */
  allowedMethods?: ('GET' | 'HEAD' | 'OPTIONS' | 'PUT' | 'PATCH' | 'POST' | 'DELETE')[];
  /**
   * #### Which cookies to forward to the origin. Default: all cookies.
   *
   * ---
   *
   * Cookies in the cache key (see `cachingOptions`) are always forwarded regardless of this setting.
   */
  cookies?: ForwardCookies;
  /**
   * #### Which headers to forward to the origin. Default: all headers.
   *
   * ---
   *
   * > The `Authorization` header must be added to `cachingOptions.cacheKeyParameters` to be forwarded.
   */
  headers?: ForwardHeaders;
  /**
   * #### Which query params to forward to the origin. Default: all query params.
   */
  queryString?: ForwardQueryString;
  /**
   * #### Use a pre-existing AWS origin request policy ID instead of configuring forwarding options here.
   */
  originRequestPolicyId?: string;
}

interface ForwardCookies {
  /**
   * #### No cookies are forwarded to the origin.
   */
  none?: boolean;
  /**
   * #### Only the listed cookies are forwarded to the origin.
   */
  whitelist?: string[];
  /**
   * #### All cookies are forwarded to the origin.
   */
  all?: boolean;
}

interface ForwardHeaders {
  /**
   * #### No headers are forwarded to the origin.
   */
  none?: boolean;
  /**
   * #### Only the listed headers are forwarded to the origin.
   */
  whitelist?: string[];
  /**
   * #### Forward all headers from the viewer's request.
   */
  allViewer?: boolean;
  /**
   * #### Forward all viewer headers plus the listed CloudFront-specific headers (e.g., `CloudFront-Viewer-Country`).
   */
  allViewerAndWhitelistCloudFront?: string[];
  /**
   * #### Forward all viewer headers except the listed ones.
   */
  allExcept?: string[];
}

interface ForwardQueryString {
  /**
   * #### All query parameters are forwarded to the origin.
   */
  all?: boolean;
  /**
   * #### No query parameters are forwarded to the origin.
   */
  none?: boolean;
  /**
   * #### Only the listed query parameters are forwarded to the origin.
   */
  whitelist?: string[];
}

type CdnReferenceableParam = 'cdnDomain' | 'cdnCustomDomains' | 'cdnUrl' | 'cdnCustomDomainUrls' | 'cdnCanonicalDomain';
```
