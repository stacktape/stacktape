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
 *         # stp-focus
 *         enabled: true
 *         # stp-end-focus
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
 *       // stp-focus
 *       enabled: true
 *       // stp-end-focus
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
 *         # stp-focus
 *         cachingOptions:
 *           defaultTTL: 86400
 *           maxTTL: 31536000
 *         # stp-end-focus
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
 *       // stp-focus
 *       cachingOptions: {
 *         defaultTTL: 86400,
 *         maxTTL: 31536000
 *       }
 *       // stp-end-focus
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
 *         # stp-focus
 *         forwardingOptions:
 *           cookies:
 *             none: true
 *         # stp-end-focus
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
 *       // stp-focus
 *       forwardingOptions: {
 *         cookies: { none: true }
 *       }
 *       // stp-end-focus
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
 *         # stp-focus
 *         routeRewrites:
 *           - path: /assets/*
 *             routeTo:
 *               type: bucket
 *               properties:
 *                 bucketName: assets
 *         # stp-end-focus
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
 *       // stp-focus
 *       routeRewrites: [
 *         {
 *           path: '/assets/*',
 *           routeTo: { type: 'bucket', properties: { bucketName: 'assets' } }
 *         }
 *       ]
 *       // stp-end-focus
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
 *         # stp-focus
 *         customDomains:
 *           - domainName: cdn.example.com
 *         # stp-end-focus
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
 *       // stp-focus
 *       customDomains: [{ domainName: 'cdn.example.com' }]
 *       // stp-end-focus
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
 *         # stp-focus
 *         edgeFunctions:
 *           onRequest: authAtEdge
 *         # stp-end-focus
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
 *       // stp-focus
 *       edgeFunctions: {
 *         onRequest: 'authAtEdge'
 *       }
 *       // stp-end-focus
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
 *         # stp-focus
 *         cloudfrontPriceClass: PriceClass_100
 *         # stp-end-focus
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
 *       // stp-focus
 *       cloudfrontPriceClass: 'PriceClass_100'
 *       // stp-end-focus
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
 *         # stp-focus
 *         defaultRoutePrefix: /v2
 *         # stp-end-focus
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
 *       // stp-focus
 *       defaultRoutePrefix: '/v2'
 *       // stp-end-focus
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
 *         # stp-focus
 *         errorDocument: /error.html
 *         # stp-end-focus
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
 *       // stp-focus
 *       errorDocument: '/error.html'
 *       // stp-end-focus
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
 *         # stp-focus
 *         indexDocument: /index.html
 *         # stp-end-focus
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
 *       // stp-focus
 *       indexDocument: '/index.html'
 *       // stp-end-focus
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
 *         # stp-focus
 *         disableInvalidationAfterDeploy: true
 *         # stp-end-focus
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
 *       // stp-focus
 *       disableInvalidationAfterDeploy: true
 *       // stp-end-focus
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
 *         # stp-focus
 *         useFirewall: cdnFirewall
 *         # stp-end-focus
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
 *       // stp-focus
 *       useFirewall: 'cdnFirewall'
 *       // stp-end-focus
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
 *           # stp-focus
 *           onRequest: authAtEdge
 *           # stp-end-focus
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
 *         // stp-focus
 *         onRequest: 'authAtEdge'
 *         // stp-end-focus
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
 *           # stp-focus
 *           onResponse: securityHeaders
 *           # stp-end-focus
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
 *         // stp-focus
 *         onResponse: 'securityHeaders'
 *         // stp-end-focus
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
 *           # stp-focus
 *           onOriginRequest: rewriteOrigin
 *           # stp-end-focus
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
 *         // stp-focus
 *         onOriginRequest: 'rewriteOrigin'
 *         // stp-end-focus
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
 *           # stp-focus
 *           onOriginResponse: cacheTuner
 *           # stp-end-focus
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
 *         // stp-focus
 *         onOriginResponse: 'cacheTuner'
 *         // stp-end-focus
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
 *           # stp-focus
 *           - path: /assets/*
 *           # stp-end-focus
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
 *           // stp-focus
 *           path: '/assets/*',
 *           // stp-end-focus
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
 *             # stp-focus
 *             routePrefix: /v2
 *             # stp-end-focus
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
 *           // stp-focus
 *           routePrefix: '/v2',
 *           // stp-end-focus
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
 *             # stp-focus
 *             routeTo:
 *               type: bucket
 *               properties:
 *                 bucketName: assets
 *             # stp-end-focus
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
 *           // stp-focus
 *           routeTo: { type: 'bucket', properties: { bucketName: 'assets' } }
 *           // stp-end-focus
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
 *             # stp-focus
 *             cachingOptions:
 *               defaultTTL: 604800
 *             # stp-end-focus
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
 *           // stp-focus
 *           cachingOptions: { defaultTTL: 604800 }
 *           // stp-end-focus
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
 *             # stp-focus
 *             forwardingOptions:
 *               cookies:
 *                 none: true
 *             # stp-end-focus
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
 *           // stp-focus
 *           forwardingOptions: { cookies: { none: true } }
 *           // stp-end-focus
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
 *             # stp-focus
 *             edgeFunctions:
 *               onRequest: authAtEdge
 *             # stp-end-focus
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
 *           // stp-focus
 *           edgeFunctions: { onRequest: 'authAtEdge' }
 *           // stp-end-focus
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
 *                 # stp-focus
 *                 loadBalancerName: appLb
 *                 # stp-end-focus
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
 *               // stp-focus
 *               loadBalancerName: 'appLb'
 *               // stp-end-focus
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
 *                 # stp-focus
 *                 listenerPort: 8080
 *                 # stp-end-focus
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
 *               // stp-focus
 *               listenerPort: 8080
 *               // stp-end-focus
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
 *                 # stp-focus
 *                 originDomainName: app.internal.example.com
 *                 # stp-end-focus
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
 *               // stp-focus
 *               originDomainName: 'app.internal.example.com'
 *               // stp-end-focus
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
 *                 # stp-focus
 *                 httpApiGatewayName: backendApi
 *                 # stp-end-focus
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
 *               // stp-focus
 *               httpApiGatewayName: 'backendApi'
 *               // stp-end-focus
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
 *                 # stp-focus
 *                 functionName: renderer
 *                 # stp-end-focus
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
 *               // stp-focus
 *               functionName: 'renderer'
 *               // stp-end-focus
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
 *                 # stp-focus
 *                 domainName: api.example.com
 *                 # stp-end-focus
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
 *               // stp-focus
 *               domainName: 'api.example.com'
 *               // stp-end-focus
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
 *                 # stp-focus
 *                 protocol: HTTPS
 *                 # stp-end-focus
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
 *               // stp-focus
 *               protocol: 'HTTPS'
 *               // stp-end-focus
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
 *                 # stp-focus
 *                 port: 8080
 *                 # stp-end-focus
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
 *               // stp-focus
 *               port: 8080
 *               // stp-end-focus
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
 *                 # stp-focus
 *                 bucketName: assets
 *                 # stp-end-focus
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
 *               // stp-focus
 *               bucketName: 'assets'
 *               // stp-end-focus
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
 *                 # stp-focus
 *                 disableUrlNormalization: true
 *                 # stp-end-focus
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
 *               // stp-focus
 *               disableUrlNormalization: true
 *               // stp-end-focus
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
 *           # stp-focus
 *           cacheMethods:
 *             - GET
 *             - HEAD
 *             - OPTIONS
 *           # stp-end-focus
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
 *         // stp-focus
 *         cacheMethods: ['GET', 'HEAD', 'OPTIONS']
 *         // stp-end-focus
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
 *           # stp-focus
 *           minTTL: 60
 *           # stp-end-focus
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
 *         // stp-focus
 *         minTTL: 60
 *         // stp-end-focus
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
 *           # stp-focus
 *           maxTTL: 31536000
 *           # stp-end-focus
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
 *         // stp-focus
 *         maxTTL: 31536000
 *         // stp-end-focus
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
 *           # stp-focus
 *           defaultTTL: 86400
 *           # stp-end-focus
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
 *         // stp-focus
 *         defaultTTL: 86400
 *         // stp-end-focus
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
 *           # stp-focus
 *           disableCompression: true
 *           # stp-end-focus
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
 *         // stp-focus
 *         disableCompression: true
 *         // stp-end-focus
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
 *           # stp-focus
 *           cacheKeyParameters:
 *             queryString:
 *               whitelist:
 *                 - page
 *             headers:
 *               whitelist:
 *                 - Authorization
 *           # stp-end-focus
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
 *         // stp-focus
 *         cacheKeyParameters: {
 *           queryString: { whitelist: ['page'] },
 *           headers: { whitelist: ['Authorization'] }
 *         }
 *         // stp-end-focus
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
 *           # stp-focus
 *           cachePolicyId: 658327ea-f89d-4fab-a63d-7e88639e58f6
 *           # stp-end-focus
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
 *         // stp-focus
 *         cachePolicyId: '658327ea-f89d-4fab-a63d-7e88639e58f6'
 *         // stp-end-focus
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
 *             # stp-focus
 *             cookies:
 *               whitelist:
 *                 - sessionId
 *             # stp-end-focus
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
 *           // stp-focus
 *           cookies: { whitelist: ['sessionId'] }
 *           // stp-end-focus
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
 *             # stp-focus
 *             headers:
 *               whitelist:
 *                 - Authorization
 *             # stp-end-focus
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
 *           // stp-focus
 *           headers: { whitelist: ['Authorization'] }
 *           // stp-end-focus
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
 *             # stp-focus
 *             queryString:
 *               whitelist:
 *                 - lang
 *             # stp-end-focus
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
 *           // stp-focus
 *           queryString: { whitelist: ['lang'] }
 *           // stp-end-focus
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
 *               # stp-focus
 *               none: true
 *               # stp-end-focus
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
 *             // stp-focus
 *             none: true
 *             // stp-end-focus
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
 *               # stp-focus
 *               whitelist:
 *                 - sessionId
 *               # stp-end-focus
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
 *             // stp-focus
 *             whitelist: ['sessionId']
 *             // stp-end-focus
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
 *               # stp-focus
 *               allExcept:
 *                 - tracking
 *               # stp-end-focus
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
 *             // stp-focus
 *             allExcept: ['tracking']
 *             // stp-end-focus
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
 *               # stp-focus
 *               all: true
 *               # stp-end-focus
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
 *             // stp-focus
 *             all: true
 *             // stp-end-focus
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
 *               # stp-focus
 *               none: true
 *               # stp-end-focus
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
 *             // stp-focus
 *             none: true
 *             // stp-end-focus
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
 *               # stp-focus
 *               whitelist:
 *                 - Authorization
 *               # stp-end-focus
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
 *             // stp-focus
 *             whitelist: ['Authorization']
 *             // stp-end-focus
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
 *               # stp-focus
 *               all: true
 *               # stp-end-focus
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
 *             // stp-focus
 *             all: true
 *             // stp-end-focus
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
 *               # stp-focus
 *               none: true
 *               # stp-end-focus
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
 *             // stp-focus
 *             none: true
 *             // stp-end-focus
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
 *               # stp-focus
 *               whitelist:
 *                 - page
 *               # stp-end-focus
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
 *             // stp-focus
 *             whitelist: ['page']
 *             // stp-end-focus
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
 *             # stp-focus
 *             - headerName: X-Api-Key
 *             # stp-end-focus
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
 *             // stp-focus
 *             headerName: 'X-Api-Key',
 *             // stp-end-focus
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
 *               # stp-focus
 *               value: $Secret('cdn-origin-key')
 *               # stp-end-focus
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
 *             // stp-focus
 *             value: $Secret('cdn-origin-key')
 *             // stp-end-focus
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
 *           # stp-focus
 *           customRequestHeaders:
 *             - headerName: X-Forwarded-By
 *               value: stacktape-cdn
 *           # stp-end-focus
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
 *         // stp-focus
 *         customRequestHeaders: [{ headerName: 'X-Forwarded-By', value: 'stacktape-cdn' }]
 *         // stp-end-focus
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
 *           # stp-focus
 *           allowedMethods:
 *             - GET
 *             - HEAD
 *             - OPTIONS
 *             - POST
 *           # stp-end-focus
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
 *         // stp-focus
 *         allowedMethods: ['GET', 'HEAD', 'OPTIONS', 'POST']
 *         // stp-end-focus
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
 *           # stp-focus
 *           cookies:
 *             whitelist:
 *               - sessionId
 *           # stp-end-focus
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
 *         // stp-focus
 *         cookies: { whitelist: ['sessionId'] }
 *         // stp-end-focus
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
 *           # stp-focus
 *           headers:
 *             whitelist:
 *               - User-Agent
 *           # stp-end-focus
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
 *         // stp-focus
 *         headers: { whitelist: ['User-Agent'] }
 *         // stp-end-focus
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
 *           # stp-focus
 *           queryString:
 *             whitelist:
 *               - page
 *           # stp-end-focus
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
 *         // stp-focus
 *         queryString: { whitelist: ['page'] }
 *         // stp-end-focus
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
 *           # stp-focus
 *           originRequestPolicyId: 88a5eaf4-2fd4-4709-b370-b4c650ea3fcf
 *           # stp-end-focus
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
 *         // stp-focus
 *         originRequestPolicyId: '88a5eaf4-2fd4-4709-b370-b4c650ea3fcf'
 *         // stp-end-focus
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
 *             # stp-focus
 *             none: true
 *             # stp-end-focus
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
 *       // stp-focus
 *       none: true
 *       // stp-end-focus
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
 *             # stp-focus
 *             whitelist:
 *               - sessionId
 *             # stp-end-focus
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
 *       // stp-focus
 *       whitelist: ['sessionId']
 *       // stp-end-focus
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
 *             # stp-focus
 *             all: true
 *             # stp-end-focus
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
 *       // stp-focus
 *       all: true
 *       // stp-end-focus
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
 *             # stp-focus
 *             none: true
 *             # stp-end-focus
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
 *       // stp-focus
 *       none: true
 *       // stp-end-focus
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
 *             # stp-focus
 *             whitelist:
 *               - User-Agent
 *             # stp-end-focus
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
 *       // stp-focus
 *       whitelist: ['User-Agent']
 *       // stp-end-focus
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
 *             # stp-focus
 *             allViewer: true
 *             # stp-end-focus
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
 *       // stp-focus
 *       allViewer: true
 *       // stp-end-focus
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
 *             # stp-focus
 *             allViewerAndWhitelistCloudFront:
 *               - CloudFront-Viewer-Country
 *             # stp-end-focus
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
 *       // stp-focus
 *       allViewerAndWhitelistCloudFront: ['CloudFront-Viewer-Country']
 *       // stp-end-focus
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
 *             # stp-focus
 *             allExcept:
 *               - Host
 *             # stp-end-focus
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
 *       // stp-focus
 *       allExcept: ['Host']
 *       // stp-end-focus
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
 *             # stp-focus
 *             all: true
 *             # stp-end-focus
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
 *       // stp-focus
 *       all: true
 *       // stp-end-focus
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
 *             # stp-focus
 *             none: true
 *             # stp-end-focus
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
 *       // stp-focus
 *       none: true
 *       // stp-end-focus
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
 *             # stp-focus
 *             whitelist:
 *               - page
 *             # stp-end-focus
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
 *       // stp-focus
 *       whitelist: ['page']
 *       // stp-end-focus
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
