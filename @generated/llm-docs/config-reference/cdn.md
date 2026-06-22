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
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   assets:
 *     type: bucket
 *     properties:
 *       directoryUpload:
 *         directoryPath: ./public
 *       cdn:
 *         enabled: true
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { Bucket, defineConfig } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const assets = new Bucket({
 *     directoryUpload: { directoryPath: './public' },
 *     cdn: {
 *       enabled: true
 *     }
 *   });
 *   return { resources: { assets } };
 * });
 * ```
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
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   assets:
 *     type: bucket
 *     properties:
 *       directoryUpload:
 *         directoryPath: ./public
 *       cdn:
 *         enabled: true
 *         cachingOptions:
 *           defaultTTL: 86400
 *           maxTTL: 31536000
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { Bucket, defineConfig } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const assets = new Bucket({
 *     directoryUpload: { directoryPath: './public' },
 *     cdn: {
 *       enabled: true,
 *       cachingOptions: {
 *         defaultTTL: 86400,
 *         maxTTL: 31536000
 *       }
 *     }
 *   });
 *   return { resources: { assets } };
 * });
 * ```
   */
  cachingOptions?: CdnCachingOptions;
  /**
   * #### Control which headers, cookies, and query params are forwarded to your origin.
   *
   * ---
   *
   * By default, all headers/cookies/query params are forwarded. Use this to restrict
   * what reaches your app (e.g., strip cookies for static content).
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   api:
 *     type: http-api-gateway
 *     properties:
 *       cdn:
 *         enabled: true
 *         forwardingOptions:
 *           cookies:
 *             none: true
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { HttpApiGateway, defineConfig } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const api = new HttpApiGateway({
 *     cdn: {
 *       enabled: true,
 *       forwardingOptions: {
 *         cookies: { none: true }
 *       }
 *     }
 *   });
 *   return { resources: { api } };
 * });
 * ```
   */
  forwardingOptions?: CdnForwardingOptions;
  /**
   * #### Route specific URL patterns to different origins (e.g., `/api/*` → Lambda, `/assets/*` → S3).
   *
   * ---
   *
   * Evaluated in order; first match wins. Unmatched requests go to the default origin.
   * Each route can have its own caching and forwarding settings.
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   api:
 *     type: http-api-gateway
 *     properties:
 *       cdn:
 *         enabled: true
 *         routeRewrites:
 *           - path: /assets/*
 *             routeTo:
 *               type: bucket
 *               properties:
 *                 bucketName: assets
 *   assets:
 *     type: bucket
 *     properties:
 *       directoryUpload:
 *         directoryPath: ./public
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { Bucket, HttpApiGateway, defineConfig } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const assets = new Bucket({
 *     directoryUpload: { directoryPath: './public' }
 *   });
 *   const api = new HttpApiGateway({
 *     cdn: {
 *       enabled: true,
 *       routeRewrites: [
 *         {
 *           path: '/assets/*',
 *           routeTo: { type: 'bucket', properties: { bucketName: 'assets' } }
 *         }
 *       ]
 *     }
 *   });
 *   return { resources: { assets, api } };
 * });
 * ```
   */
  routeRewrites?: CdnRouteRewrite[];
  /**
   * #### Custom domains (e.g., `cdn.example.com`). Stacktape auto-creates DNS records and TLS certificates.
   *
   * ---
   *
   * Your domain must be added as a Route53 hosted zone in your AWS account first.
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   assets:
 *     type: bucket
 *     properties:
 *       directoryUpload:
 *         directoryPath: ./public
 *       cdn:
 *         enabled: true
 *         customDomains:
 *           - domainName: cdn.example.com
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { Bucket, defineConfig } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const assets = new Bucket({
 *     directoryUpload: { directoryPath: './public' },
 *     cdn: {
 *       enabled: true,
 *       customDomains: [{ domainName: 'cdn.example.com' }]
 *     }
 *   });
 *   return { resources: { assets } };
 * });
 * ```
   */
  customDomains?: DomainConfiguration[];
  /**
   * #### Run edge functions on CDN requests/responses (URL rewrites, auth, A/B testing).
   *
   * ---
   *
   * - `onRequest`: Before cache lookup — modify the request, add auth, or return early.
   * - `onResponse`: Before returning to the client — modify headers, add cookies.
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   authAtEdge:
 *     type: edge-lambda-function
 *     properties:
 *       packaging:
 *         type: stacktape-lambda-buildpack
 *         properties:
 *           entryfilePath: ./src/edge/auth.ts
 *   api:
 *     type: http-api-gateway
 *     properties:
 *       cdn:
 *         enabled: true
 *         edgeFunctions:
 *           onRequest: authAtEdge
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { EdgeLambdaFunction, HttpApiGateway, StacktapeLambdaBuildpackPackaging, defineConfig } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const authAtEdge = new EdgeLambdaFunction({
 *     packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/edge/auth.ts' })
 *   });
 *   const api = new HttpApiGateway({
 *     cdn: {
 *       enabled: true,
 *       edgeFunctions: {
 *         onRequest: 'authAtEdge'
 *       }
 *     }
 *   });
 *   return { resources: { authAtEdge, api } };
 * });
 * ```
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
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   assets:
 *     type: bucket
 *     properties:
 *       directoryUpload:
 *         directoryPath: ./public
 *       cdn:
 *         enabled: true
 *         cloudfrontPriceClass: PriceClass_100
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { Bucket, defineConfig } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const assets = new Bucket({
 *     directoryUpload: { directoryPath: './public' },
 *     cdn: {
 *       enabled: true,
 *       cloudfrontPriceClass: 'PriceClass_100'
 *     }
 *   });
 *   return { resources: { assets } };
 * });
 * ```
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
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   api:
 *     type: http-api-gateway
 *     properties:
 *       cdn:
 *         enabled: true
 *         defaultRoutePrefix: /v2
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { HttpApiGateway, defineConfig } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const api = new HttpApiGateway({
 *     cdn: {
 *       enabled: true,
 *       defaultRoutePrefix: '/v2'
 *     }
 *   });
 *   return { resources: { api } };
 * });
 * ```
   */
  defaultRoutePrefix?: string;
  /**
   * #### Page to show for 404 errors (e.g., `/error.html`).
 *
 * ---
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   webapp:
 *     type: bucket
 *     properties:
 *       directoryUpload:
 *         directoryPath: ./dist
 *       cdn:
 *         enabled: true
 *         errorDocument: /error.html
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { Bucket, defineConfig } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const webapp = new Bucket({
 *     directoryUpload: { directoryPath: './dist' },
 *     cdn: {
 *       enabled: true,
 *       errorDocument: '/error.html'
 *     }
 *   });
 *   return { resources: { webapp } };
 * });
 * ```
   *
   * @default /404.html
   */
  errorDocument?: string;
  /**
   * #### Page served for requests to `/`.
 *
 * ---
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   webapp:
 *     type: bucket
 *     properties:
 *       directoryUpload:
 *         directoryPath: ./dist
 *       cdn:
 *         enabled: true
 *         indexDocument: /index.html
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { Bucket, defineConfig } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const webapp = new Bucket({
 *     directoryUpload: { directoryPath: './dist' },
 *     cdn: {
 *       enabled: true,
 *       indexDocument: '/index.html'
 *     }
 *   });
 *   return { resources: { webapp } };
 * });
 * ```
   *
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
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   assets:
 *     type: bucket
 *     properties:
 *       directoryUpload:
 *         directoryPath: ./public
 *       cdn:
 *         enabled: true
 *         disableInvalidationAfterDeploy: true
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { Bucket, defineConfig } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const assets = new Bucket({
 *     directoryUpload: { directoryPath: './public' },
 *     cdn: {
 *       enabled: true,
 *       disableInvalidationAfterDeploy: true
 *     }
 *   });
 *   return { resources: { assets } };
 * });
 * ```
   *
   * @default false
   */
  disableInvalidationAfterDeploy?: boolean;
  /**
   * #### Name of a `web-app-firewall` resource to protect this CDN from common web exploits.
 *
 * ---
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   cdnFirewall:
 *     type: web-app-firewall
 *     properties:
 *       scope: cdn
 *   api:
 *     type: http-api-gateway
 *     properties:
 *       cdn:
 *         enabled: true
 *         useFirewall: cdnFirewall
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { HttpApiGateway, WebAppFirewall, defineConfig } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const cdnFirewall = new WebAppFirewall({ scope: 'cdn' });
 *   const api = new HttpApiGateway({
 *     cdn: {
 *       enabled: true,
 *       useFirewall: 'cdnFirewall'
 *     }
 *   });
 *   return { resources: { cdnFirewall, api } };
 * });
 * ```
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
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   authAtEdge:
 *     type: edge-lambda-function
 *     properties:
 *       packaging:
 *         type: stacktape-lambda-buildpack
 *         properties:
 *           entryfilePath: ./src/edge/auth.ts
 *   api:
 *     type: http-api-gateway
 *     properties:
 *       cdn:
 *         enabled: true
 *         edgeFunctions:
 *           onRequest: authAtEdge
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { EdgeLambdaFunction, HttpApiGateway, StacktapeLambdaBuildpackPackaging, defineConfig } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const authAtEdge = new EdgeLambdaFunction({
 *     packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/edge/auth.ts' })
 *   });
 *   const api = new HttpApiGateway({
 *     cdn: {
 *       enabled: true,
 *       edgeFunctions: {
 *         onRequest: 'authAtEdge'
 *       }
 *     }
 *   });
 *   return { resources: { authAtEdge, api } };
 * });
 * ```
   */
  onRequest?: string;
  /**
   * #### Name of an `edge-lambda-function` to run before returning the response to the client.
   *
   * ---
   *
   * Use to modify response headers, add security headers, or set cookies.
   * Does not run if the origin returned a 400+ error or if `onRequest` already generated a response.
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   securityHeaders:
 *     type: edge-lambda-function
 *     properties:
 *       packaging:
 *         type: stacktape-lambda-buildpack
 *         properties:
 *           entryfilePath: ./src/edge/headers.ts
 *   api:
 *     type: http-api-gateway
 *     properties:
 *       cdn:
 *         enabled: true
 *         edgeFunctions:
 *           onResponse: securityHeaders
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { EdgeLambdaFunction, HttpApiGateway, StacktapeLambdaBuildpackPackaging, defineConfig } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const securityHeaders = new EdgeLambdaFunction({
 *     packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/edge/headers.ts' })
 *   });
 *   const api = new HttpApiGateway({
 *     cdn: {
 *       enabled: true,
 *       edgeFunctions: {
 *         onResponse: 'securityHeaders'
 *       }
 *     }
 *   });
 *   return { resources: { securityHeaders, api } };
 * });
 * ```
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
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   rewriteOrigin:
 *     type: edge-lambda-function
 *     properties:
 *       packaging:
 *         type: stacktape-lambda-buildpack
 *         properties:
 *           entryfilePath: ./src/edge/origin-rewrite.ts
 *   api:
 *     type: http-api-gateway
 *     properties:
 *       cdn:
 *         enabled: true
 *         edgeFunctions:
 *           onOriginRequest: rewriteOrigin
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { EdgeLambdaFunction, HttpApiGateway, StacktapeLambdaBuildpackPackaging, defineConfig } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const rewriteOrigin = new EdgeLambdaFunction({
 *     packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/edge/origin-rewrite.ts' })
 *   });
 *   const api = new HttpApiGateway({
 *     cdn: {
 *       enabled: true,
 *       edgeFunctions: {
 *         onOriginRequest: 'rewriteOrigin'
 *       }
 *     }
 *   });
 *   return { resources: { rewriteOrigin, api } };
 * });
 * ```
   */
  onOriginRequest?: string;
  /**
   * #### Name of an `edge-lambda-function` to run after the origin responds (before caching).
   *
   * ---
   *
   * Modify the response before it's cached and returned. Changes are cached as if they came from the origin.
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   cacheTuner:
 *     type: edge-lambda-function
 *     properties:
 *       packaging:
 *         type: stacktape-lambda-buildpack
 *         properties:
 *           entryfilePath: ./src/edge/cache-tune.ts
 *   api:
 *     type: http-api-gateway
 *     properties:
 *       cdn:
 *         enabled: true
 *         edgeFunctions:
 *           onOriginResponse: cacheTuner
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { EdgeLambdaFunction, HttpApiGateway, StacktapeLambdaBuildpackPackaging, defineConfig } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const cacheTuner = new EdgeLambdaFunction({
 *     packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/edge/cache-tune.ts' })
 *   });
 *   const api = new HttpApiGateway({
 *     cdn: {
 *       enabled: true,
 *       edgeFunctions: {
 *         onOriginResponse: 'cacheTuner'
 *       }
 *     }
 *   });
 *   return { resources: { cacheTuner, api } };
 * });
 * ```
   */
  onOriginResponse?: string;
}

interface CdnRouteRewrite {
  /**
   * #### URL path pattern to match (e.g., `/api/*`, `*.jpg`, `/docs/v2/*`). Wildcards supported.
 *
 * ---
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   api:
 *     type: http-api-gateway
 *     properties:
 *       cdn:
 *         enabled: true
 *         routeRewrites:
 *           - path: /assets/*
 *             routeTo:
 *               type: bucket
 *               properties:
 *                 bucketName: assets
 *   assets:
 *     type: bucket
 *     properties:
 *       directoryUpload:
 *         directoryPath: ./public
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { Bucket, HttpApiGateway, defineConfig } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const assets = new Bucket({
 *     directoryUpload: { directoryPath: './public' }
 *   });
 *   const api = new HttpApiGateway({
 *     cdn: {
 *       enabled: true,
 *       routeRewrites: [
 *         {
 *           path: '/assets/*',
 *           routeTo: { type: 'bucket', properties: { bucketName: 'assets' } }
 *         }
 *       ]
 *     }
 *   });
 *   return { resources: { assets, api } };
 * });
 * ```
   */
  path: string;
  /**
   * #### Prepend a path prefix to requests before forwarding to the origin.
   *
   * ---
   *
   * E.g., with prefix `/v2`, a request for `/users` is forwarded as `/v2/users`.
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   api:
 *     type: http-api-gateway
 *     properties:
 *       cdn:
 *         enabled: true
 *         routeRewrites:
 *           - path: /api/*
 *             routePrefix: /v2
 *             routeTo:
 *               type: http-api-gateway
 *               properties:
 *                 httpApiGatewayName: backendApi
 *   backendApi:
 *     type: http-api-gateway
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { HttpApiGateway, defineConfig } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const backendApi = new HttpApiGateway({});
 *   const api = new HttpApiGateway({
 *     cdn: {
 *       enabled: true,
 *       routeRewrites: [
 *         {
 *           path: '/api/*',
 *           routePrefix: '/v2',
 *           routeTo: { type: 'http-api-gateway', properties: { httpApiGatewayName: 'backendApi' } }
 *         }
 *       ]
 *     }
 *   });
 *   return { resources: { backendApi, api } };
 * });
 * ```
   */
  routePrefix?: string;
  /**
   * #### Where to send matching requests. Can be a bucket, API Gateway, load balancer, Lambda, or external domain.
   *
   * ---
   *
   * If not set, requests go to the default origin (the resource this CDN is attached to).
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   api:
 *     type: http-api-gateway
 *     properties:
 *       cdn:
 *         enabled: true
 *         routeRewrites:
 *           - path: /static/*
 *             routeTo:
 *               type: bucket
 *               properties:
 *                 bucketName: assets
 *   assets:
 *     type: bucket
 *     properties:
 *       directoryUpload:
 *         directoryPath: ./public
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { Bucket, HttpApiGateway, defineConfig } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const assets = new Bucket({
 *     directoryUpload: { directoryPath: './public' }
 *   });
 *   const api = new HttpApiGateway({
 *     cdn: {
 *       enabled: true,
 *       routeRewrites: [
 *         {
 *           path: '/static/*',
 *           routeTo: { type: 'bucket', properties: { bucketName: 'assets' } }
 *         }
 *       ]
 *     }
 *   });
 *   return { resources: { assets, api } };
 * });
 * ```
   */
  routeTo?:
    | CdnLoadBalancerRoute
    | CdnHttpApiGatewayRoute
    | CdnBucketRoute
    | CdnCustomDomainRoute
    | CdnLambdaFunctionRoute; // | CdnWebServiceRoute;
  /**
   * #### Override caching behavior for requests matching this route.
 *
 * ---
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   api:
 *     type: http-api-gateway
 *     properties:
 *       cdn:
 *         enabled: true
 *         routeRewrites:
 *           - path: /assets/*
 *             routeTo:
 *               type: bucket
 *               properties:
 *                 bucketName: assets
 *             cachingOptions:
 *               defaultTTL: 604800
 *   assets:
 *     type: bucket
 *     properties:
 *       directoryUpload:
 *         directoryPath: ./public
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { Bucket, HttpApiGateway, defineConfig } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const assets = new Bucket({
 *     directoryUpload: { directoryPath: './public' }
 *   });
 *   const api = new HttpApiGateway({
 *     cdn: {
 *       enabled: true,
 *       routeRewrites: [
 *         {
 *           path: '/assets/*',
 *           routeTo: { type: 'bucket', properties: { bucketName: 'assets' } },
 *           cachingOptions: { defaultTTL: 604800 }
 *         }
 *       ]
 *     }
 *   });
 *   return { resources: { assets, api } };
 * });
 * ```
   */
  cachingOptions?: CdnCachingOptions;
  /**
   * #### Override which headers, cookies, and query params are forwarded for this route.
 *
 * ---
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   api:
 *     type: http-api-gateway
 *     properties:
 *       cdn:
 *         enabled: true
 *         routeRewrites:
 *           - path: /assets/*
 *             routeTo:
 *               type: bucket
 *               properties:
 *                 bucketName: assets
 *             forwardingOptions:
 *               cookies:
 *                 none: true
 *   assets:
 *     type: bucket
 *     properties:
 *       directoryUpload:
 *         directoryPath: ./public
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { Bucket, HttpApiGateway, defineConfig } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const assets = new Bucket({
 *     directoryUpload: { directoryPath: './public' }
 *   });
 *   const api = new HttpApiGateway({
 *     cdn: {
 *       enabled: true,
 *       routeRewrites: [
 *         {
 *           path: '/assets/*',
 *           routeTo: { type: 'bucket', properties: { bucketName: 'assets' } },
 *           forwardingOptions: { cookies: { none: true } }
 *         }
 *       ]
 *     }
 *   });
 *   return { resources: { assets, api } };
 * });
 * ```
   */
  forwardingOptions?: CdnForwardingOptions;
  /**
   * #### Run edge functions on requests/responses matching this route.
 *
 * ---
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   authAtEdge:
 *     type: edge-lambda-function
 *     properties:
 *       packaging:
 *         type: stacktape-lambda-buildpack
 *         properties:
 *           entryfilePath: ./src/edge/auth.ts
 *   api:
 *     type: http-api-gateway
 *     properties:
 *       cdn:
 *         enabled: true
 *         routeRewrites:
 *           - path: /private/*
 *             routeTo:
 *               type: bucket
 *               properties:
 *                 bucketName: assets
 *             edgeFunctions:
 *               onRequest: authAtEdge
 *   assets:
 *     type: bucket
 *     properties:
 *       directoryUpload:
 *         directoryPath: ./public
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { Bucket, EdgeLambdaFunction, HttpApiGateway, StacktapeLambdaBuildpackPackaging, defineConfig } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const authAtEdge = new EdgeLambdaFunction({
 *     packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/edge/auth.ts' })
 *   });
 *   const assets = new Bucket({
 *     directoryUpload: { directoryPath: './public' }
 *   });
 *   const api = new HttpApiGateway({
 *     cdn: {
 *       enabled: true,
 *       routeRewrites: [
 *         {
 *           path: '/private/*',
 *           routeTo: { type: 'bucket', properties: { bucketName: 'assets' } },
 *           edgeFunctions: { onRequest: 'authAtEdge' }
 *         }
 *       ]
 *     }
 *   });
 *   return { resources: { authAtEdge, assets, api } };
 * });
 * ```
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
 *
 * ---
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   api:
 *     type: http-api-gateway
 *     properties:
 *       cdn:
 *         enabled: true
 *         routeRewrites:
 *           - path: /app/*
 *             routeTo:
 *               type: application-load-balancer
 *               properties:
 *                 loadBalancerName: appLb
 *   appLb:
 *     type: application-load-balancer
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { ApplicationLoadBalancer, HttpApiGateway, defineConfig } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const appLb = new ApplicationLoadBalancer({});
 *   const api = new HttpApiGateway({
 *     cdn: {
 *       enabled: true,
 *       routeRewrites: [
 *         {
 *           path: '/app/*',
 *           routeTo: {
 *             type: 'application-load-balancer',
 *             properties: {
 *               loadBalancerName: 'appLb'
 *             }
 *           }
 *         }
 *       ]
 *     }
 *   });
 *   return { resources: { appLb, api } };
 * });
 * ```
   */
  loadBalancerName: string;
  /**
   * #### Listener port on the load balancer. Only needed if using custom listeners.
 *
 * ---
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   api:
 *     type: http-api-gateway
 *     properties:
 *       cdn:
 *         enabled: true
 *         routeRewrites:
 *           - path: /app/*
 *             routeTo:
 *               type: application-load-balancer
 *               properties:
 *                 loadBalancerName: appLb
 *                 listenerPort: 8080
 *   appLb:
 *     type: application-load-balancer
 *     properties:
 *       listeners:
 *         - port: 8080
 *           protocol: HTTP
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { ApplicationLoadBalancer, HttpApiGateway, defineConfig } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const appLb = new ApplicationLoadBalancer({
 *     listeners: [{ port: 8080, protocol: 'HTTP' }]
 *   });
 *   const api = new HttpApiGateway({
 *     cdn: {
 *       enabled: true,
 *       routeRewrites: [
 *         {
 *           path: '/app/*',
 *           routeTo: {
 *             type: 'application-load-balancer',
 *             properties: {
 *               loadBalancerName: 'appLb',
 *               listenerPort: 8080
 *             }
 *           }
 *         }
 *       ]
 *     }
 *   });
 *   return { resources: { appLb, api } };
 * });
 * ```
   */
  listenerPort?: number;
  /**
   * #### Explicit origin domain. Only needed if the ALB has no `customDomains` and uses `customCertificateArns`.
 *
 * ---
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   api:
 *     type: http-api-gateway
 *     properties:
 *       cdn:
 *         enabled: true
 *         routeRewrites:
 *           - path: /app/*
 *             routeTo:
 *               type: application-load-balancer
 *               properties:
 *                 loadBalancerName: appLb
 *                 originDomainName: app.internal.example.com
 *   appLb:
 *     type: application-load-balancer
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { ApplicationLoadBalancer, HttpApiGateway, defineConfig } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const appLb = new ApplicationLoadBalancer({});
 *   const api = new HttpApiGateway({
 *     cdn: {
 *       enabled: true,
 *       routeRewrites: [
 *         {
 *           path: '/app/*',
 *           routeTo: {
 *             type: 'application-load-balancer',
 *             properties: {
 *               loadBalancerName: 'appLb',
 *               originDomainName: 'app.internal.example.com'
 *             }
 *           }
 *         }
 *       ]
 *     }
 *   });
 *   return { resources: { appLb, api } };
 * });
 * ```
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
 *
 * ---
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   cdnApi:
 *     type: http-api-gateway
 *     properties:
 *       cdn:
 *         enabled: true
 *         routeRewrites:
 *           - path: /api/*
 *             routeTo:
 *               type: http-api-gateway
 *               properties:
 *                 httpApiGatewayName: backendApi
 *   backendApi:
 *     type: http-api-gateway
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { HttpApiGateway, defineConfig } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const backendApi = new HttpApiGateway({});
 *   const cdnApi = new HttpApiGateway({
 *     cdn: {
 *       enabled: true,
 *       routeRewrites: [
 *         {
 *           path: '/api/*',
 *           routeTo: {
 *             type: 'http-api-gateway',
 *             properties: {
 *               httpApiGatewayName: 'backendApi'
 *             }
 *           }
 *         }
 *       ]
 *     }
 *   });
 *   return { resources: { backendApi, cdnApi } };
 * });
 * ```
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
 *
 * ---
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   api:
 *     type: http-api-gateway
 *     properties:
 *       cdn:
 *         enabled: true
 *         routeRewrites:
 *           - path: /render/*
 *             routeTo:
 *               type: function
 *               properties:
 *                 functionName: renderer
 *   renderer:
 *     type: function
 *     properties:
 *       packaging:
 *         type: stacktape-lambda-buildpack
 *         properties:
 *           entryfilePath: ./src/render.ts
 *       url:
 *         enabled: true
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { HttpApiGateway, LambdaFunction, StacktapeLambdaBuildpackPackaging, defineConfig } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const renderer = new LambdaFunction({
 *     packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/render.ts' }),
 *     url: { enabled: true }
 *   });
 *   const api = new HttpApiGateway({
 *     cdn: {
 *       enabled: true,
 *       routeRewrites: [
 *         {
 *           path: '/render/*',
 *           routeTo: {
 *             type: 'function',
 *             properties: {
 *               functionName: 'renderer'
 *             }
 *           }
 *         }
 *       ]
 *     }
 *   });
 *   return { resources: { renderer, api } };
 * });
 * ```
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
 *
 * ---
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   api:
 *     type: http-api-gateway
 *     properties:
 *       cdn:
 *         enabled: true
 *         routeRewrites:
 *           - path: /legacy/*
 *             routeTo:
 *               type: custom-origin
 *               properties:
 *                 domainName: api.example.com
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { HttpApiGateway, defineConfig } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const api = new HttpApiGateway({
 *     cdn: {
 *       enabled: true,
 *       routeRewrites: [
 *         {
 *           path: '/legacy/*',
 *           routeTo: {
 *             type: 'custom-origin',
 *             properties: {
 *               domainName: 'api.example.com'
 *             }
 *           }
 *         }
 *       ]
 *     }
 *   });
 *   return { resources: { api } };
 * });
 * ```
   */
  domainName: string;
  /**
   * #### Protocol for connecting to the origin.
 *
 * ---
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   api:
 *     type: http-api-gateway
 *     properties:
 *       cdn:
 *         enabled: true
 *         routeRewrites:
 *           - path: /legacy/*
 *             routeTo:
 *               type: custom-origin
 *               properties:
 *                 domainName: api.example.com
 *                 protocol: HTTPS
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { HttpApiGateway, defineConfig } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const api = new HttpApiGateway({
 *     cdn: {
 *       enabled: true,
 *       routeRewrites: [
 *         {
 *           path: '/legacy/*',
 *           routeTo: {
 *             type: 'custom-origin',
 *             properties: {
 *               domainName: 'api.example.com',
 *               protocol: 'HTTPS'
 *             }
 *           }
 *         }
 *       ]
 *     }
 *   });
 *   return { resources: { api } };
 * });
 * ```
   *
   * @default HTTPS
   */
  protocol?: 'HTTP' | 'HTTPS';
  /**
   * #### Port on the origin. Defaults to 443 for HTTPS, 80 for HTTP.
 *
 * ---
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   api:
 *     type: http-api-gateway
 *     properties:
 *       cdn:
 *         enabled: true
 *         routeRewrites:
 *           - path: /legacy/*
 *             routeTo:
 *               type: custom-origin
 *               properties:
 *                 domainName: api.example.com
 *                 protocol: HTTP
 *                 port: 8080
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { HttpApiGateway, defineConfig } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const api = new HttpApiGateway({
 *     cdn: {
 *       enabled: true,
 *       routeRewrites: [
 *         {
 *           path: '/legacy/*',
 *           routeTo: {
 *             type: 'custom-origin',
 *             properties: {
 *               domainName: 'api.example.com',
 *               protocol: 'HTTP',
 *               port: 8080
 *             }
 *           }
 *         }
 *       ]
 *     }
 *   });
 *   return { resources: { api } };
 * });
 * ```
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
 *
 * ---
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   api:
 *     type: http-api-gateway
 *     properties:
 *       cdn:
 *         enabled: true
 *         routeRewrites:
 *           - path: /assets/*
 *             routeTo:
 *               type: bucket
 *               properties:
 *                 bucketName: assets
 *   assets:
 *     type: bucket
 *     properties:
 *       directoryUpload:
 *         directoryPath: ./public
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { Bucket, HttpApiGateway, defineConfig } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const assets = new Bucket({
 *     directoryUpload: { directoryPath: './public' }
 *   });
 *   const api = new HttpApiGateway({
 *     cdn: {
 *       enabled: true,
 *       routeRewrites: [
 *         {
 *           path: '/assets/*',
 *           routeTo: {
 *             type: 'bucket',
 *             properties: {
 *               bucketName: 'assets'
 *             }
 *           }
 *         }
 *       ]
 *     }
 *   });
 *   return { resources: { assets, api } };
 * });
 * ```
   */
  bucketName: string;
  /**
   * #### Disable clean URL normalization (e.g., `/about` → `/about.html`).
 *
 * ---
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   api:
 *     type: http-api-gateway
 *     properties:
 *       cdn:
 *         enabled: true
 *         routeRewrites:
 *           - path: /assets/*
 *             routeTo:
 *               type: bucket
 *               properties:
 *                 bucketName: assets
 *                 disableUrlNormalization: true
 *   assets:
 *     type: bucket
 *     properties:
 *       directoryUpload:
 *         directoryPath: ./public
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { Bucket, HttpApiGateway, defineConfig } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const assets = new Bucket({
 *     directoryUpload: { directoryPath: './public' }
 *   });
 *   const api = new HttpApiGateway({
 *     cdn: {
 *       enabled: true,
 *       routeRewrites: [
 *         {
 *           path: '/assets/*',
 *           routeTo: {
 *             type: 'bucket',
 *             properties: {
 *               bucketName: 'assets',
 *               disableUrlNormalization: true
 *             }
 *           }
 *         }
 *       ]
 *     }
 *   });
 *   return { resources: { assets, api } };
 * });
 * ```
   *
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
 *
 * ---
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   api:
 *     type: http-api-gateway
 *     properties:
 *       cdn:
 *         enabled: true
 *         cachingOptions:
 *           cacheMethods:
 *             - GET
 *             - HEAD
 *             - OPTIONS
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { HttpApiGateway, defineConfig } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const api = new HttpApiGateway({
 *     cdn: {
 *       enabled: true,
 *       cachingOptions: {
 *         cacheMethods: ['GET', 'HEAD', 'OPTIONS']
 *       }
 *     }
 *   });
 *   return { resources: { api } };
 * });
 * ```
   */
  cacheMethods?: ('GET' | 'HEAD' | 'OPTIONS')[];
  /**
   * #### Minimum cache time (seconds). Overrides `Cache-Control: max-age` if the origin sets a lower value.
 *
 * ---
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   api:
 *     type: http-api-gateway
 *     properties:
 *       cdn:
 *         enabled: true
 *         cachingOptions:
 *           minTTL: 60
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { HttpApiGateway, defineConfig } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const api = new HttpApiGateway({
 *     cdn: {
 *       enabled: true,
 *       cachingOptions: {
 *         minTTL: 60
 *       }
 *     }
 *   });
 *   return { resources: { api } };
 * });
 * ```
   */
  minTTL?: number;
  /**
   * #### Maximum cache time (seconds). Caps how long the CDN caches content, even if the origin says longer.
 *
 * ---
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   api:
 *     type: http-api-gateway
 *     properties:
 *       cdn:
 *         enabled: true
 *         cachingOptions:
 *           maxTTL: 31536000
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { HttpApiGateway, defineConfig } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const api = new HttpApiGateway({
 *     cdn: {
 *       enabled: true,
 *       cachingOptions: {
 *         maxTTL: 31536000
 *       }
 *     }
 *   });
 *   return { resources: { api } };
 * });
 * ```
   */
  maxTTL?: number;
  /**
   * #### Default cache time (seconds). Used when the origin response has no `Cache-Control` or `Expires` header.
 *
 * ---
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   api:
 *     type: http-api-gateway
 *     properties:
 *       cdn:
 *         enabled: true
 *         cachingOptions:
 *           defaultTTL: 86400
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { HttpApiGateway, defineConfig } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const api = new HttpApiGateway({
 *     cdn: {
 *       enabled: true,
 *       cachingOptions: {
 *         defaultTTL: 86400
 *       }
 *     }
 *   });
 *   return { resources: { api } };
 * });
 * ```
   */
  defaultTTL?: number;
  /**
   * #### Disable automatic Gzip/Brotli compression. Compression is on by default and reduces transfer size/cost.
 *
 * ---
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   api:
 *     type: http-api-gateway
 *     properties:
 *       cdn:
 *         enabled: true
 *         cachingOptions:
 *           disableCompression: true
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { HttpApiGateway, defineConfig } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const api = new HttpApiGateway({
 *     cdn: {
 *       enabled: true,
 *       cachingOptions: {
 *         disableCompression: true
 *       }
 *     }
 *   });
 *   return { resources: { api } };
 * });
 * ```
   *
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
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   api:
 *     type: http-api-gateway
 *     properties:
 *       cdn:
 *         enabled: true
 *         cachingOptions:
 *           cacheKeyParameters:
 *             queryString:
 *               whitelist:
 *                 - page
 *             headers:
 *               whitelist:
 *                 - Authorization
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { HttpApiGateway, defineConfig } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const api = new HttpApiGateway({
 *     cdn: {
 *       enabled: true,
 *       cachingOptions: {
 *         cacheKeyParameters: {
 *           queryString: { whitelist: ['page'] },
 *           headers: { whitelist: ['Authorization'] }
 *         }
 *       }
 *     }
 *   });
 *   return { resources: { api } };
 * });
 * ```
   */
  cacheKeyParameters?: CdnCacheKey;
  /**
   * #### Use a pre-existing AWS cache policy ID instead of configuring TTL and cache key options here.
 *
 * ---
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   api:
 *     type: http-api-gateway
 *     properties:
 *       cdn:
 *         enabled: true
 *         cachingOptions:
 *           cachePolicyId: 658327ea-f89d-4fab-a63d-7e88639e58f6
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { HttpApiGateway, defineConfig } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const api = new HttpApiGateway({
 *     cdn: {
 *       enabled: true,
 *       cachingOptions: {
 *         cachePolicyId: '658327ea-f89d-4fab-a63d-7e88639e58f6'
 *       }
 *     }
 *   });
 *   return { resources: { api } };
 * });
 * ```
   */
  cachePolicyId?: string;
}

interface CdnCacheKey {
  /**
   * #### Which cookies to include in the cache key. Different cookie values = different cached responses.
 *
 * ---
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   api:
 *     type: http-api-gateway
 *     properties:
 *       cdn:
 *         enabled: true
 *         cachingOptions:
 *           cacheKeyParameters:
 *             cookies:
 *               whitelist:
 *                 - sessionId
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { HttpApiGateway, defineConfig } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const api = new HttpApiGateway({
 *     cdn: {
 *       enabled: true,
 *       cachingOptions: {
 *         cacheKeyParameters: {
 *           cookies: { whitelist: ['sessionId'] }
 *         }
 *       }
 *     }
 *   });
 *   return { resources: { api } };
 * });
 * ```
   */
  cookies?: CacheKeyCookies;
  /**
   * #### Which headers to include in the cache key. Different header values = different cached responses.
 *
 * ---
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   api:
 *     type: http-api-gateway
 *     properties:
 *       cdn:
 *         enabled: true
 *         cachingOptions:
 *           cacheKeyParameters:
 *             headers:
 *               whitelist:
 *                 - Authorization
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { HttpApiGateway, defineConfig } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const api = new HttpApiGateway({
 *     cdn: {
 *       enabled: true,
 *       cachingOptions: {
 *         cacheKeyParameters: {
 *           headers: { whitelist: ['Authorization'] }
 *         }
 *       }
 *     }
 *   });
 *   return { resources: { api } };
 * });
 * ```
   */
  headers?: CacheKeyHeaders;
  /**
   * #### Which query params to include in the cache key. Different param values = different cached responses.
 *
 * ---
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   api:
 *     type: http-api-gateway
 *     properties:
 *       cdn:
 *         enabled: true
 *         cachingOptions:
 *           cacheKeyParameters:
 *             queryString:
 *               whitelist:
 *                 - lang
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { HttpApiGateway, defineConfig } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const api = new HttpApiGateway({
 *     cdn: {
 *       enabled: true,
 *       cachingOptions: {
 *         cacheKeyParameters: {
 *           queryString: { whitelist: ['lang'] }
 *         }
 *       }
 *     }
 *   });
 *   return { resources: { api } };
 * });
 * ```
   */
  queryString?: CacheKeyQueryString;
}

interface CacheKeyCookies {
  /**
   * #### No cookies are included in the cache key.
 *
 * ---
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   api:
 *     type: http-api-gateway
 *     properties:
 *       cdn:
 *         enabled: true
 *         cachingOptions:
 *           cacheKeyParameters:
 *             cookies:
 *               none: true
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { HttpApiGateway, defineConfig } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const api = new HttpApiGateway({
 *     cdn: {
 *       enabled: true,
 *       cachingOptions: {
 *         cacheKeyParameters: {
 *           cookies: {
 *             none: true
 *           }
 *         }
 *       }
 *     }
 *   });
 *   return { resources: { api } };
 * });
 * ```
   */
  none?: boolean;
  /**
   * #### Only the listed cookies are included in the cache key.
 *
 * ---
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   api:
 *     type: http-api-gateway
 *     properties:
 *       cdn:
 *         enabled: true
 *         cachingOptions:
 *           cacheKeyParameters:
 *             cookies:
 *               whitelist:
 *                 - sessionId
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { HttpApiGateway, defineConfig } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const api = new HttpApiGateway({
 *     cdn: {
 *       enabled: true,
 *       cachingOptions: {
 *         cacheKeyParameters: {
 *           cookies: {
 *             whitelist: ['sessionId']
 *           }
 *         }
 *       }
 *     }
 *   });
 *   return { resources: { api } };
 * });
 * ```
   */
  whitelist?: string[];
  /**
   * #### All cookies except the listed ones are included in the cache key.
 *
 * ---
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   api:
 *     type: http-api-gateway
 *     properties:
 *       cdn:
 *         enabled: true
 *         cachingOptions:
 *           cacheKeyParameters:
 *             cookies:
 *               allExcept:
 *                 - tracking
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { HttpApiGateway, defineConfig } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const api = new HttpApiGateway({
 *     cdn: {
 *       enabled: true,
 *       cachingOptions: {
 *         cacheKeyParameters: {
 *           cookies: {
 *             allExcept: ['tracking']
 *           }
 *         }
 *       }
 *     }
 *   });
 *   return { resources: { api } };
 * });
 * ```
   */
  allExcept?: string[];
  /**
   * #### All cookies are included in the cache key.
 *
 * ---
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   api:
 *     type: http-api-gateway
 *     properties:
 *       cdn:
 *         enabled: true
 *         cachingOptions:
 *           cacheKeyParameters:
 *             cookies:
 *               all: true
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { HttpApiGateway, defineConfig } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const api = new HttpApiGateway({
 *     cdn: {
 *       enabled: true,
 *       cachingOptions: {
 *         cacheKeyParameters: {
 *           cookies: {
 *             all: true
 *           }
 *         }
 *       }
 *     }
 *   });
 *   return { resources: { api } };
 * });
 * ```
   */
  all?: boolean;
}

interface CacheKeyHeaders {
  /**
   * #### No headers are included in the cache key.
 *
 * ---
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   api:
 *     type: http-api-gateway
 *     properties:
 *       cdn:
 *         enabled: true
 *         cachingOptions:
 *           cacheKeyParameters:
 *             headers:
 *               none: true
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { HttpApiGateway, defineConfig } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const api = new HttpApiGateway({
 *     cdn: {
 *       enabled: true,
 *       cachingOptions: {
 *         cacheKeyParameters: {
 *           headers: {
 *             none: true
 *           }
 *         }
 *       }
 *     }
 *   });
 *   return { resources: { api } };
 * });
 * ```
   */
  none?: boolean;
  /**
   * #### Only the listed headers are included in the cache key.
 *
 * ---
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   api:
 *     type: http-api-gateway
 *     properties:
 *       cdn:
 *         enabled: true
 *         cachingOptions:
 *           cacheKeyParameters:
 *             headers:
 *               whitelist:
 *                 - Authorization
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { HttpApiGateway, defineConfig } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const api = new HttpApiGateway({
 *     cdn: {
 *       enabled: true,
 *       cachingOptions: {
 *         cacheKeyParameters: {
 *           headers: {
 *             whitelist: ['Authorization']
 *           }
 *         }
 *       }
 *     }
 *   });
 *   return { resources: { api } };
 * });
 * ```
   */
  whitelist?: string[];
}

interface CacheKeyQueryString {
  /**
   * #### All query parameters are included in the cache key.
 *
 * ---
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   api:
 *     type: http-api-gateway
 *     properties:
 *       cdn:
 *         enabled: true
 *         cachingOptions:
 *           cacheKeyParameters:
 *             queryString:
 *               all: true
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { HttpApiGateway, defineConfig } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const api = new HttpApiGateway({
 *     cdn: {
 *       enabled: true,
 *       cachingOptions: {
 *         cacheKeyParameters: {
 *           queryString: {
 *             all: true
 *           }
 *         }
 *       }
 *     }
 *   });
 *   return { resources: { api } };
 * });
 * ```
   */
  all?: boolean;
  /**
   * #### No query parameters are included in the cache key.
 *
 * ---
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   api:
 *     type: http-api-gateway
 *     properties:
 *       cdn:
 *         enabled: true
 *         cachingOptions:
 *           cacheKeyParameters:
 *             queryString:
 *               none: true
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { HttpApiGateway, defineConfig } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const api = new HttpApiGateway({
 *     cdn: {
 *       enabled: true,
 *       cachingOptions: {
 *         cacheKeyParameters: {
 *           queryString: {
 *             none: true
 *           }
 *         }
 *       }
 *     }
 *   });
 *   return { resources: { api } };
 * });
 * ```
   */
  none?: boolean;
  /**
   * #### Only the listed query parameters are included in the cache key.
 *
 * ---
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   api:
 *     type: http-api-gateway
 *     properties:
 *       cdn:
 *         enabled: true
 *         cachingOptions:
 *           cacheKeyParameters:
 *             queryString:
 *               whitelist:
 *                 - page
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { HttpApiGateway, defineConfig } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const api = new HttpApiGateway({
 *     cdn: {
 *       enabled: true,
 *       cachingOptions: {
 *         cacheKeyParameters: {
 *           queryString: {
 *             whitelist: ['page']
 *           }
 *         }
 *       }
 *     }
 *   });
 *   return { resources: { api } };
 * });
 * ```
   */
  whitelist?: string[];
}

interface CdnCustomRequestHeader {
  /**
   * #### Name of the header
 *
 * ---
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   api:
 *     type: http-api-gateway
 *     properties:
 *       cdn:
 *         enabled: true
 *         forwardingOptions:
 *           customRequestHeaders:
 *             - headerName: X-Api-Key
 *               value: $Secret('cdn-origin-key')
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { HttpApiGateway, defineConfig, $Secret } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const api = new HttpApiGateway({
 *     cdn: {
 *       enabled: true,
 *       forwardingOptions: {
 *         customRequestHeaders: [
 *           {
 *             headerName: 'X-Api-Key',
 *             value: $Secret('cdn-origin-key')
 *           }
 *         ]
 *       }
 *     }
 *   });
 *   return { resources: { api } };
 * });
 * ```
   */
  headerName: string;
  /**
   * #### Value of the header
 *
 * ---
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   api:
 *     type: http-api-gateway
 *     properties:
 *       cdn:
 *         enabled: true
 *         forwardingOptions:
 *           customRequestHeaders:
 *             - headerName: X-Api-Key
 *               value: $Secret('cdn-origin-key')
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { HttpApiGateway, defineConfig, $Secret } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const api = new HttpApiGateway({
 *     cdn: {
 *       enabled: true,
 *       forwardingOptions: {
 *         customRequestHeaders: [
 *           {
 *             headerName: 'X-Api-Key',
 *             value: $Secret('cdn-origin-key')
 *           }
 *         ]
 *       }
 *     }
 *   });
 *   return { resources: { api } };
 * });
 * ```
   */
  value: string;
}

interface CdnForwardingOptions {
  /**
   * #### Static headers the CDN adds to every request sent to the origin (e.g., API keys, custom identifiers).
 *
 * ---
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   api:
 *     type: http-api-gateway
 *     properties:
 *       cdn:
 *         enabled: true
 *         forwardingOptions:
 *           customRequestHeaders:
 *             - headerName: X-Forwarded-By
 *               value: stacktape-cdn
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { HttpApiGateway, defineConfig } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const api = new HttpApiGateway({
 *     cdn: {
 *       enabled: true,
 *       forwardingOptions: {
 *         customRequestHeaders: [{ headerName: 'X-Forwarded-By', value: 'stacktape-cdn' }]
 *       }
 *     }
 *   });
 *   return { resources: { api } };
 * });
 * ```
   */
  customRequestHeaders?: CdnCustomRequestHeader[];
  /**
   * #### HTTP methods forwarded to the origin. Default: all methods.
 *
 * ---
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   api:
 *     type: http-api-gateway
 *     properties:
 *       cdn:
 *         enabled: true
 *         forwardingOptions:
 *           allowedMethods:
 *             - GET
 *             - HEAD
 *             - OPTIONS
 *             - POST
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { HttpApiGateway, defineConfig } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const api = new HttpApiGateway({
 *     cdn: {
 *       enabled: true,
 *       forwardingOptions: {
 *         allowedMethods: ['GET', 'HEAD', 'OPTIONS', 'POST']
 *       }
 *     }
 *   });
 *   return { resources: { api } };
 * });
 * ```
   */
  allowedMethods?: ('GET' | 'HEAD' | 'OPTIONS' | 'PUT' | 'PATCH' | 'POST' | 'DELETE')[];
  /**
   * #### Which cookies to forward to the origin. Default: all cookies.
   *
   * ---
   *
   * Cookies in the cache key (see `cachingOptions`) are always forwarded regardless of this setting.
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   api:
 *     type: http-api-gateway
 *     properties:
 *       cdn:
 *         enabled: true
 *         forwardingOptions:
 *           cookies:
 *             whitelist:
 *               - sessionId
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { HttpApiGateway, defineConfig } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const api = new HttpApiGateway({
 *     cdn: {
 *       enabled: true,
 *       forwardingOptions: {
 *         cookies: { whitelist: ['sessionId'] }
 *       }
 *     }
 *   });
 *   return { resources: { api } };
 * });
 * ```
   */
  cookies?: ForwardCookies;
  /**
   * #### Which headers to forward to the origin. Default: all headers.
   *
   * ---
   *
   * > The `Authorization` header must be added to `cachingOptions.cacheKeyParameters` to be forwarded.
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   api:
 *     type: http-api-gateway
 *     properties:
 *       cdn:
 *         enabled: true
 *         forwardingOptions:
 *           headers:
 *             whitelist:
 *               - User-Agent
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { HttpApiGateway, defineConfig } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const api = new HttpApiGateway({
 *     cdn: {
 *       enabled: true,
 *       forwardingOptions: {
 *         headers: { whitelist: ['User-Agent'] }
 *       }
 *     }
 *   });
 *   return { resources: { api } };
 * });
 * ```
   */
  headers?: ForwardHeaders;
  /**
   * #### Which query params to forward to the origin. Default: all query params.
 *
 * ---
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   api:
 *     type: http-api-gateway
 *     properties:
 *       cdn:
 *         enabled: true
 *         forwardingOptions:
 *           queryString:
 *             whitelist:
 *               - page
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { HttpApiGateway, defineConfig } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const api = new HttpApiGateway({
 *     cdn: {
 *       enabled: true,
 *       forwardingOptions: {
 *         queryString: { whitelist: ['page'] }
 *       }
 *     }
 *   });
 *   return { resources: { api } };
 * });
 * ```
   */
  queryString?: ForwardQueryString;
  /**
   * #### Use a pre-existing AWS origin request policy ID instead of configuring forwarding options here.
 *
 * ---
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   api:
 *     type: http-api-gateway
 *     properties:
 *       cdn:
 *         enabled: true
 *         forwardingOptions:
 *           originRequestPolicyId: 88a5eaf4-2fd4-4709-b370-b4c650ea3fcf
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { HttpApiGateway, defineConfig } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const api = new HttpApiGateway({
 *     cdn: {
 *       enabled: true,
 *       forwardingOptions: {
 *         originRequestPolicyId: '88a5eaf4-2fd4-4709-b370-b4c650ea3fcf'
 *       }
 *     }
 *   });
 *   return { resources: { api } };
 * });
 * ```
   */
  originRequestPolicyId?: string;
}

interface ForwardCookies {
  /**
   * #### No cookies are forwarded to the origin.
 *
 * ---
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   api:
 *     type: http-api-gateway
 *     properties:
 *       cdn:
 *         enabled: true
 *         forwardingOptions:
 *           cookies:
 *             none: true
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { HttpApiGateway, defineConfig } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const api = new HttpApiGateway({
 *     cdn: { enabled: true, forwardingOptions: { cookies: {
 *       none: true
 *     } } }
 *   });
 *   return { resources: { api } };
 * });
 * ```
   */
  none?: boolean;
  /**
   * #### Only the listed cookies are forwarded to the origin.
 *
 * ---
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   api:
 *     type: http-api-gateway
 *     properties:
 *       cdn:
 *         enabled: true
 *         forwardingOptions:
 *           cookies:
 *             whitelist:
 *               - sessionId
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { HttpApiGateway, defineConfig } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const api = new HttpApiGateway({
 *     cdn: { enabled: true, forwardingOptions: { cookies: {
 *       whitelist: ['sessionId']
 *     } } }
 *   });
 *   return { resources: { api } };
 * });
 * ```
   */
  whitelist?: string[];
  /**
   * #### All cookies are forwarded to the origin.
 *
 * ---
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   api:
 *     type: http-api-gateway
 *     properties:
 *       cdn:
 *         enabled: true
 *         forwardingOptions:
 *           cookies:
 *             all: true
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { HttpApiGateway, defineConfig } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const api = new HttpApiGateway({
 *     cdn: { enabled: true, forwardingOptions: { cookies: {
 *       all: true
 *     } } }
 *   });
 *   return { resources: { api } };
 * });
 * ```
   */
  all?: boolean;
}

interface ForwardHeaders {
  /**
   * #### No headers are forwarded to the origin.
 *
 * ---
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   api:
 *     type: http-api-gateway
 *     properties:
 *       cdn:
 *         enabled: true
 *         forwardingOptions:
 *           headers:
 *             none: true
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { HttpApiGateway, defineConfig } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const api = new HttpApiGateway({
 *     cdn: { enabled: true, forwardingOptions: { headers: {
 *       none: true
 *     } } }
 *   });
 *   return { resources: { api } };
 * });
 * ```
   */
  none?: boolean;
  /**
   * #### Only the listed headers are forwarded to the origin.
 *
 * ---
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   api:
 *     type: http-api-gateway
 *     properties:
 *       cdn:
 *         enabled: true
 *         forwardingOptions:
 *           headers:
 *             whitelist:
 *               - User-Agent
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { HttpApiGateway, defineConfig } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const api = new HttpApiGateway({
 *     cdn: { enabled: true, forwardingOptions: { headers: {
 *       whitelist: ['User-Agent']
 *     } } }
 *   });
 *   return { resources: { api } };
 * });
 * ```
   */
  whitelist?: string[];
  /**
   * #### Forward all headers from the viewer's request.
 *
 * ---
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   api:
 *     type: http-api-gateway
 *     properties:
 *       cdn:
 *         enabled: true
 *         forwardingOptions:
 *           headers:
 *             allViewer: true
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { HttpApiGateway, defineConfig } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const api = new HttpApiGateway({
 *     cdn: { enabled: true, forwardingOptions: { headers: {
 *       allViewer: true
 *     } } }
 *   });
 *   return { resources: { api } };
 * });
 * ```
   */
  allViewer?: boolean;
  /**
   * #### Forward all viewer headers plus the listed CloudFront-specific headers (e.g., `CloudFront-Viewer-Country`).
 *
 * ---
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   api:
 *     type: http-api-gateway
 *     properties:
 *       cdn:
 *         enabled: true
 *         forwardingOptions:
 *           headers:
 *             allViewerAndWhitelistCloudFront:
 *               - CloudFront-Viewer-Country
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { HttpApiGateway, defineConfig } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const api = new HttpApiGateway({
 *     cdn: { enabled: true, forwardingOptions: { headers: {
 *       allViewerAndWhitelistCloudFront: ['CloudFront-Viewer-Country']
 *     } } }
 *   });
 *   return { resources: { api } };
 * });
 * ```
   */
  allViewerAndWhitelistCloudFront?: string[];
  /**
   * #### Forward all viewer headers except the listed ones.
 *
 * ---
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   api:
 *     type: http-api-gateway
 *     properties:
 *       cdn:
 *         enabled: true
 *         forwardingOptions:
 *           headers:
 *             allExcept:
 *               - Host
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { HttpApiGateway, defineConfig } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const api = new HttpApiGateway({
 *     cdn: { enabled: true, forwardingOptions: { headers: {
 *       allExcept: ['Host']
 *     } } }
 *   });
 *   return { resources: { api } };
 * });
 * ```
   */
  allExcept?: string[];
}

interface ForwardQueryString {
  /**
   * #### All query parameters are forwarded to the origin.
 *
 * ---
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   api:
 *     type: http-api-gateway
 *     properties:
 *       cdn:
 *         enabled: true
 *         forwardingOptions:
 *           queryString:
 *             all: true
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { HttpApiGateway, defineConfig } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const api = new HttpApiGateway({
 *     cdn: { enabled: true, forwardingOptions: { queryString: {
 *       all: true
 *     } } }
 *   });
 *   return { resources: { api } };
 * });
 * ```
   */
  all?: boolean;
  /**
   * #### No query parameters are forwarded to the origin.
 *
 * ---
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   api:
 *     type: http-api-gateway
 *     properties:
 *       cdn:
 *         enabled: true
 *         forwardingOptions:
 *           queryString:
 *             none: true
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { HttpApiGateway, defineConfig } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const api = new HttpApiGateway({
 *     cdn: { enabled: true, forwardingOptions: { queryString: {
 *       none: true
 *     } } }
 *   });
 *   return { resources: { api } };
 * });
 * ```
   */
  none?: boolean;
  /**
   * #### Only the listed query parameters are forwarded to the origin.
 *
 * ---
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   api:
 *     type: http-api-gateway
 *     properties:
 *       cdn:
 *         enabled: true
 *         forwardingOptions:
 *           queryString:
 *             whitelist:
 *               - page
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { HttpApiGateway, defineConfig } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const api = new HttpApiGateway({
 *     cdn: { enabled: true, forwardingOptions: { queryString: {
 *       whitelist: ['page']
 *     } } }
 *   });
 *   return { resources: { api } };
 * });
 * ```
   */
  whitelist?: string[];
}

type CdnReferenceableParam =
  | 'cdnDomain'
  | 'cdnCustomDomains'
  | 'cdnUrl'
  | 'cdnCustomDomainUrls'
  | 'cdnCanonicalDomain'
  | 'cdnCanonicalUrl';
```
