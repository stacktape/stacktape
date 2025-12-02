interface CdnConfiguration {
  /**
   * #### Enables the CDN.
   *
   * ---
   *
   * @default false
   */
  enabled: boolean;
  /**
   * #### Configures custom caching options.
   *
   * ---
   *
   * This property controls the caching behavior of your edge distribution, including what content is cached, for how long, and when it should be re-fetched from the origin.
   *
   * If a response from the origin does not include `Cache-Control` or `Expires` headers, a default caching behavior is used:
   * - **bucket**: Objects are cached for 6 months by default, or until the cache is invalidated.
   * - **http-api-gateway** and **application-load-balancer**: Responses are not cached by default.
   */
  cachingOptions?: CdnCachingOptions;
  /**
   * #### Configures which parts of the request are forwarded to the origin.
   *
   * ---
   *
   * This includes headers, query parameters, and cookies.
   */
  forwardingOptions?: CdnForwardingOptions;
  /**
   * #### Redirects specific requests to a different origin.
   *
   * ---
   *
   * Each incoming request to the CDN is evaluated against a list of route rewrites. If the request path matches a rewrite's path pattern, it is sent to the configured route.
   *
   * Route rewrites are evaluated in order, and the first match determines where the request will be sent.
   * If no match is found, the request is sent to the default origin (the resource the CDN is attached to).
   *
   * **Example Use Cases:**
   * - Serving static content from a bucket while routing dynamic paths to a Lambda function.
   * - Caching `.jpg` files for a longer duration than other file types.
   */
  routeRewrites?: CdnRouteRewrite[];
  /**
   * #### Attaches custom domains to this CDN.
   *
   * ---
   *
   * When you connect a custom domain, Stacktape automatically:
   *
   * - **Creates DNS records:** A DNS record is created to point your domain name to the resource.
   * - **Adds TLS certificates:** If the resource uses HTTPS, Stacktape issues and attaches a free, AWS-managed TLS certificate, handling TLS termination for you.
   *
   * > To manage a custom domain, it first needs to be added to your AWS account.
   * > This means that a [hosted zone](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/AboutHZWorkingWith.html)
   * > (collection of records managed together for a given domain)
   * > for your domain exists in your AWS account and your domain registrar's name servers are pointing to it.
   * > To learn more, refer to [Adding a domain guide](https://docs.stacktape.com/other-resources/domains-and-certificates/#adding-domain).
   */
  customDomains?: DomainConfiguration[];
  /**
   * #### Configures Edge function triggers.
   *
   * ---
   *
   * You can associate an `edge-lambda-function` with the CDN to be executed at different stages:
   *
   * - `onRequest`: Executed when the CDN receives a request from a client, before checking the cache.
   * - `onResponse`: Executed before returning a response to the client.
   *
   * **Potential Use Cases:**
   * - Generating an immediate HTTP response without checking the cache or forwarding to the origin.
   * - Modifying the request (e.g., rewriting the URL or headers) before forwarding to the origin.
   * - Inspecting cookies or validating authorization headers and tokens.
   */
  edgeFunctions?: EdgeFunctionsConfig;
  /**
   * #### Configures the locations from which the CDN serves traffic.
   *
   * ---
   *
   * A higher price class results in more edge locations serving your traffic, which can improve performance in some regions but is more costly.
   *
   * For example, if your users are primarily located in the US and Europe, you can save money by using `PriceClass_100`.
   *
   * For more details, see the [AWS documentation on price classes](https://aws.amazon.com/cloudfront/pricing/).
   *
   * @default PriceClass_All
   */
  cloudfrontPriceClass?: 'PriceClass_100' | 'PriceClass_200' | 'PriceClass_All';
  /**
   * #### Prefixes requests to the origin with a specified path.
   *
   * ---
   *
   * Incoming requests will be prefixed with `defaultRoutePrefix` before being forwarded to the origin.
   * For example, if the CDN receives a request for `/my/resource/url`, the request will be sent to the origin as `/your_prefix/my/resource/url`.
   */
  defaultRoutePrefix?: string;
  /**
   * #### The custom error document URL.
   *
   * ---
   *
   * This document is requested by the CDN if the original request to the origin returns a `404` error code.
   *
   * Example: `/error.html`
   *
   * @default /404.html
   */
  errorDocument?: string;
  /**
   * #### The custom index document served for requests to the root path (`/`).
   *
   * ---
   *
   * @default /index.html
   */
  indexDocument?: string;
  /**
   * #### Disables invalidation of the CDN cache after each deployment.
   *
   * ---
   *
   * By default, the cache is invalidated after every deployment to prevent serving outdated content.
   * When the cache is invalidated, the CDN flushes all cached content, and new requests are sent directly to the origin.
   *
   * @default false
   */
  disableInvalidationAfterDeploy?: boolean;
  /**
   * #### The name of the `web-app-firewall` resource to use with your CDN.
   *
   * ---
   *
   * A `web-app-firewall` can protect your resources from common web exploits that could affect availability, compromise security, or consume excessive resources.
   * The firewall works by filtering malicious requests before they reach your application.
   *
   * For more information, see the [firewall documentation](https://docs.stacktape.com/security-resources/web-app-firewalls/).
   */
  useFirewall?: string;
}

interface EdgeFunctionsConfig {
  /**
   * #### The name of the `edge-lambda-function` to be executed on request.
   *
   * ---
   *
   * The `onRequest` function is triggered when the CDN receives a request from a client. It allows you to:
   * - Modify the request before forwarding it to the origin.
   * - Return an immediate response to the client.
   * - Make network calls to external resources to confirm user credentials or fetch additional content.
   *
   * The body of the request is exposed to the function with some restrictions. For more details, see the [AWS documentation](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/edge-functions-restrictions.html#lambda-at-edge-restrictions-request-body).
   */
  onRequest?: string;
  /**
   * #### The name of the `edge-lambda-function` to be executed on response.
   *
   * ---
   *
   * The `onResponse` function is triggered before the CDN returns a response to the client, allowing you to modify the response (e.g., headers, cookies).
   *
   * This function does not execute if:
   * - The origin returns an HTTP status code of 400 or higher.
   * - The response was generated by a function triggered by a viewer request event (`onRequest`).
   */
  onResponse?: string;
  /**
   * #### The name of the `edge-lambda-function` to be executed on origin request.
   *
   * ---
   *
   * > **Warning:** Use this trigger only if you are an advanced user and understand the implications.
   * > Using this trigger can override the default behavior configured by Stacktape, which uses pre-configured Lambdas for this trigger when using a CDN with a bucket, web-service, http-api-gateway, or application-load-balancer.
   *
   * The `onOriginRequest` function is triggered after the CDN receives a request but before it is sent to the origin. This means the function is not triggered if the response is found in the cache.
   *
   * You can use this function to:
   * - Modify the request before forwarding it to the origin.
   * - Return an immediate response to the client, which will be cached as if it came from the origin.
   * - Make network calls to external resources.
   *
   * The body of the request is exposed with some restrictions. See the [AWS documentation](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/edge-functions-restrictions.html#lambda-at-edge-restrictions-request-body) for more details.
   */
  onOriginRequest?: string;
  /**
   * #### The name of the `edge-lambda-function` to be executed on origin response.
   *
   * ---
   *
   * The `onOriginResponse` function is triggered after the origin returns a response but before it is sent to the client.
   *
   * You can use this function to:
   * - Modify the response (e.g., headers, cookies), which will be cached as if it came from the origin.
   * - Update the response status.
   */
  onOriginResponse?: string;
}

interface CdnRouteRewrite {
  /**
   * #### The path pattern to be matched by this route rewrite.
   *
   * ---
   *
   * You can use wildcards (`*`) to match multiple paths.
   * For more details on path patterns, see the [AWS documentation](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/distribution-web-values-specify.html#DownloadDistValuesPathPattern).
   */
  path: string;
  /**
   * #### Prefixes every request to the origin with the specified path.
   *
   * ---
   *
   * All requests matching this route will be prefixed with `routePrefix` before being forwarded to the origin.
   * For example, if the CDN receives a request for `/my/resource/url`, it will be sent to the origin as `/your_prefix/my/resource/url`.
   */
  routePrefix?: string;
  /**
   * #### The origin to which the route rewrite forwards requests.
   *
   * ---
   *
   * If not set, the default origin (the one the CDN is attached to) is used.
   */
  routeTo?:
    | CdnLoadBalancerRoute
    | CdnHttpApiGatewayRoute
    | CdnBucketRoute
    | CdnCustomDomainRoute
    | CdnLambdaFunctionRoute; // | CdnWebServiceRoute;
  /**
   * #### Configures custom caching options for this route rewrite.
   *
   * ---
   *
   * This property controls the caching behavior for requests matching this route.
   * If a response from the origin does not include `Cache-Control` or `Expires` headers, a default caching behavior is used:
   * - **bucket**: Objects are cached for 6 months by default.
   * - **http-api-gateway** and **application-load-balancer**: Responses are not cached by default.
   */
  cachingOptions?: CdnCachingOptions;
  /**
   * #### Redirects specific requests to a different origin.
   *
   * ---
   *
   * Forwarding options allow you to specify which parts of the request (headers, query parameters, cookies, etc.) are forwarded to the origin.
   */
  forwardingOptions?: CdnForwardingOptions;
  /**
   * #### Configures Edge function triggers for this route.
   *
   * ---
   *
   * You can associate an `edge-lambda-function` with this route to be executed at different stages:
   *
   * - `onRequest`: Executed when the CDN receives a request from a client, before checking the cache.
   * - `onResponse`: Executed before returning a response to the client.
   *
   * **Potential Use Cases:**
   * - Generating an immediate HTTP response.
   * - Modifying the request before forwarding it to the origin.
   * - Inspecting cookies or validating authorization tokens.
   *
   * @beta
   */
  edgeFunctions?: EdgeFunctionsConfig;
}

interface CdnLoadBalancerRoute {
  type: 'application-load-balancer';
  properties: CdnLoadBalancerOrigin;
}

interface CdnLoadBalancerOrigin {
  /**
   * #### The name of the Load Balancer.
   */
  loadBalancerName: string;
  /**
   * #### The port of the Load Balancer listener.
   *
   * ---
   *
   * You must specify this if the Load Balancer you are routing to uses custom listeners.
   */
  listenerPort?: number;
  /**
   * #### Explicitly sets the origin domain name to use when forwarding to the Load Balancer.
   *
   * ---
   *
   * This is only required if the Load Balancer has no `customDomains` attached and the listener uses `customCertificateArns`.
   */
  originDomainName?: string;
}

interface CdnHttpApiGatewayRoute {
  type: 'http-api-gateway';
  properties: CdnHttpApiGatewayOrigin;
}

interface CdnHttpApiGatewayOrigin {
  /**
   * #### The name of the HTTP API Gateway.
   */
  httpApiGatewayName: string;
}

interface CdnLambdaFunctionRoute {
  type: 'function';
  properties: CdnLambdaFunctionOrigin;
}

interface CdnLambdaFunctionOrigin {
  /**
   * #### The name of the Web Service resource.
   */
  functionName: string;
}

interface CdnCustomDomainRoute {
  type: 'custom-origin';
  properties: CdnCustomOrigin;
}

interface CdnCustomOrigin {
  /**
   * #### The domain name of the custom origin.
   *
   * ---
   *
   * Example: `mydomain.com` or `domain.example.com`
   */
  domainName: string;
  /**
   * #### The protocol to use when connecting to the custom origin.
   *
   * ---
   *
   * @default HTTPS
   */
  protocol?: 'HTTP' | 'HTTPS';
  /**
   * #### The port of the custom origin.
   *
   * ---
   *
   * By default, port 443 is used for `HTTPS` origins, and port 80 is used for `HTTP` origins.
   *
   * @default 443
   */
  port?: number;
}

interface CdnBucketRoute {
  type: 'bucket';
  properties: CdnBucketOrigin;
}

interface CdnBucketOrigin {
  /**
   * #### The name of the bucket.
   */
  bucketName: string;
  /**
   * #### Disables URL normalization.
   *
   * ---
   *
   * URL normalization is enabled by default and is useful for serving HTML files from a bucket with clean URLs (without the `.html` extension).
   * When enabled, the CDN can fetch the correct HTML file even if the URL is incomplete (e.g., `/about` instead of `/about.html` or `/about/index.html`).
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
   * #### The HTTP methods for which responses will be cached.
   *
   * ---
   *
   * Possible values are:
   * - `['GET', 'HEAD']`
   * - `['GET', 'HEAD', 'OPTIONS']`
   */
  cacheMethods?: ('GET' | 'HEAD' | 'OPTIONS')[];
  /**
   * #### The minimum amount of time (in seconds) that objects will remain in the CDN cache.
   *
   * ---
   *
   * For more details on cache expiration, see the [AWS documentation](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Expiration.html).
   */
  minTTL?: number;
  /**
   * #### The maximum amount of time (in seconds) that objects will remain in the CDN cache.
   *
   * ---
   *
   * For more details on cache expiration, see the [AWS documentation](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Expiration.html).
   */
  maxTTL?: number;
  /**
   * #### The default amount of time (in seconds) that objects will remain in the CDN cache.
   *
   * ---
   *
   * For more details on cache expiration, see the [AWS documentation](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Expiration.html).
   */
  defaultTTL?: number;
  /**
   * #### Disables compression of objects served by the CDN.
   *
   * ---
   *
   * Compression is enabled by default and can significantly reduce the size of responses, improving performance and lowering transfer costs.
   * The CDN uses `Gzip` and `Brotli` compression methods. If the viewer supports both, Brotli is used.
   * The client must indicate that it accepts compressed files using the `Accept-Encoding` HTTP header.
   *
   * For more details on compression, see the [AWS documentation](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/ServingCompressedFiles.html).
   *
   * @default false
   */
  disableCompression?: boolean;
  /**
   * #### Configures the HTTP headers, cookies, and URL query strings to include in the cache key.
   *
   * ---
   *
   * By default, the cache key depends on the origin type:
   * - **bucket**: Only the URL path is included.
   * - **http-api-gateway** and **application-load-balancer**: The URL path and query string are included.
   *
   * The values included in the cache key are automatically forwarded in requests sent to the origin.
   */
  cacheKeyParameters?: CdnCacheKey;
  /**
   * #### The ID of a pre-created cache policy to use.
   *
   * ---
   *
   * Use this to apply a pre-configured cache policy instead of specifying `ttl`, `cacheKeyParameters`, and other options.
   */
  cachePolicyId?: string;
}

interface CdnCacheKey {
  /**
   * #### Configures which cookies are included in the cache key.
   *
   * ---
   *
   * Cookies included in the cache key are automatically forwarded in requests sent to the origin.
   * By default, no cookies are included in the cache key.
   */
  cookies?: CacheKeyCookies;
  /**
   * #### Configures which headers are included in the cache key.
   *
   * ---
   *
   * Headers included in the cache key are automatically forwarded in requests sent to the origin.
   * By default, no headers (except `Accept-Encoding` for compression) are included in the cache key.
   */
  headers?: CacheKeyHeaders;
  /**
   * #### Configures which query parameters are included in the cache key.
   *
   * ---
   *
   * Query parameters included in the cache key are automatically forwarded in requests sent to the origin.
   * By default, no query parameters are included in the cache key.
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
   * #### Adds static headers that the CDN will add to all requests sent to the origin.
   */
  customRequestHeaders?: CdnCustomRequestHeader[];
  /**
   * #### The HTTP methods that will be forwarded by the CDN to the origin.
   *
   * ---
   *
   * If not set, all methods are forwarded.
   */
  allowedMethods?: ('GET' | 'HEAD' | 'OPTIONS' | 'PUT' | 'PATCH' | 'POST' | 'DELETE')[];
  /**
   * #### The cookies that will be forwarded to the origin.
   *
   * ---
   *
   * If not set, all cookies are forwarded.
   * All cookies that are part of the cache key (see `cachingOptions`) are automatically forwarded to the origin.
   */
  cookies?: ForwardCookies;
  /**
   * #### The headers that will be forwarded to the origin.
   *
   * ---
   *
   * If not set, all headers are forwarded.
   * All headers that are part of the cache key (see `cachingOptions`) are automatically forwarded to the origin.
   *
   * > **Warning:** The `Authorization` header must be included as a cache key parameter in `cachingOptions` to be forwarded to the origin. This is to prevent unauthorized access to resources.
   */
  headers?: ForwardHeaders;
  /**
   * #### The query parameters that will be forwarded to the origin.
   *
   * ---
   *
   * If not set, all query string parameters are forwarded.
   * All query string parameters that are part of the cache key (see `cachingOptions`) are automatically forwarded to the origin.
   */
  queryString?: ForwardQueryString;
  /**
   * #### The ID of a pre-created origin request policy to use.
   *
   * ---
   *
   * Use this to apply a pre-configured origin request policy instead of specifying `cookies`, `headers`, and `queryString` options.
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
   * #### All viewer headers are forwarded to the origin.
   */
  allViewer?: boolean;
  /**
   * #### All viewer headers and the listed CDN headers are forwarded to the origin.
   */
  allViewerAndWhitelistCloudFront?: string[];
  /**
   * #### All viewer headers except the explicitly specified ones are forwarded to the origin.
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
