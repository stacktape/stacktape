# HTTP API Gateway

A Stacktape HTTP API Gateway creates a managed, serverless HTTP endpoint that routes requests to [Lambda functions](/resources/compute/lambda-function) and container workloads through HTTP API integrations. It uses AWS API Gateway V2 (HTTP API) — no servers to provision, automatic TLS, built-in throttling, and pay-per-request pricing at ~$1 per million requests.

## When to use

HTTP API Gateway is the default choice for building serverless APIs on Stacktape. Use it when your backend is one or more Lambda functions that need a public HTTPS URL with path-based routing. The pay-per-request model makes it cost-effective for APIs with variable or low-to-moderate traffic — you pay nothing when no requests arrive.

Common patterns that fit well:

- **REST or RPC APIs** backed by Lambda functions — each route maps to a function
- **Single-function catch-all** — one Lambda handles all routes (e.g., a Hono, Express, or FastAPI app) with a greedy path like `/{proxy+}`
- **Mixed backend** — some routes go to Lambda functions, others to container workloads through the same API endpoint
- **Spiky or unpredictable traffic** — pay-per-request scales from zero to thousands of requests per second without capacity planning

## When NOT to use

- **Container-based services that stay running** — an [Application Load Balancer](/resources/networking/application-load-balancer) is a better fit for [web services](/resources/compute/web-service). ALBs offer richer routing (headers, query params, source IPs) and a flat hourly cost that's cheaper at sustained high throughput.
- **Sustained high-volume APIs** (roughly above 50–100 million requests/month) — ALB's flat pricing becomes more economical than pay-per-request at that scale.
- **WebSocket or persistent connections** — HTTP API Gateway routes request-response HTTP traffic only. It does not support long-lived bidirectional connections.
- **TCP/TLS (non-HTTP) protocols** — use a [Network Load Balancer](/resources/networking/network-load-balancer) instead.


## Feature Comparison

| Feature | HTTP API Gateway | Application Load Balancer |
| --- | --- | --- |
| Pricing model | ~$1/million requests | Flat hourly charge + LCU-based |
| Best for | Lambda functions | Container workloads |
| Scales to zero cost | yes | no |
| Routing options | Method + path | Method, path, headers, query params, source IPs |
| Route-level authorizers | yes | no |
| CDN attachable | yes | yes |


## Basic example

An HTTP API Gateway resource on its own is just the entry point — it does not define routes. Routes are defined on the compute resources (Lambda functions or container workloads) that reference the gateway by name. The simplest setup is a gateway plus one or more Lambda functions with [HTTP triggers](/configuration/triggers/http-triggers).


Example (TypeScript):

```typescript
import {
  defineConfig,
  HttpApiGateway,
  LambdaFunction,
  StacktapeLambdaBuildpackPackaging,
  HttpApiIntegration
} from 'stacktape';
export default defineConfig(() => {
  const myApi = new HttpApiGateway({});

  const getUsers = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/handlers/users.ts'
    }),
    events: [
      new HttpApiIntegration({
        httpApiGatewayName: 'myApi',
        method: 'GET',
        path: '/users'
      })
    ]
  });

  return {
    resources: { myApi, getUsers }
  };
});
```


The gateway `myApi` has no configuration because TLS is included and access logging is enabled by default. The `getUsers` Lambda function registers a `GET /users` route on the gateway through its `HttpApiIntegration` event.

You can reference the deployed gateway URL with `$ResourceParam('myApi', 'url')` in your config. To surface the URL in terminal output after every deploy, add it to `stackConfig.outputs`.

## Routing

Routes are not defined on the HTTP API Gateway itself. Instead, each compute resource declares which gateway it connects to, which HTTP method to match, and which path pattern to handle. This keeps routing co-located with the code that serves each route.

A single gateway can serve routes from many Lambda functions and container workloads. Each integration specifies a `method` and a `path`. Supported methods are `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, `OPTIONS`, and `*` (any method). Paths support three patterns:

| Pattern | Example | Behavior |
|---------|---------|----------|
| Exact path | `/users` | Matches only `/users` |
| Path parameter | `/users/{id}` | Matches `/users/123`; `id` available in `event.pathParameters` |
| Greedy (catch-all) | `/api/{proxy+}` | Matches any path starting with `/api/` |

Routes are matched by specificity — exact paths take priority over wildcard paths. For container workloads, the HTTP API integration also requires `containerPort`, because API Gateway must know which container port receives the request. See [HTTP triggers](/configuration/triggers/http-triggers) for the full integration API, including the container workload integration shape.

### Catch-all pattern

For frameworks like Hono, Express, or FastAPI that handle routing internally, use a single Lambda with a greedy path:


Example (TypeScript):

```typescript
import {
  defineConfig,
  HttpApiGateway,
  LambdaFunction,
  StacktapeLambdaBuildpackPackaging,
  HttpApiIntegration
} from 'stacktape';
export default defineConfig(() => {
  const myApi = new HttpApiGateway({});

  const api = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/api.ts'
    }),
    events: [
      new HttpApiIntegration({
        httpApiGatewayName: 'myApi',
        method: '*',
        path: '/{proxy+}'
      })
    ]
  });

  return {
    resources: { myApi, api }
  };
});
```


This routes every request to a single Lambda. The framework inside the Lambda handles path matching, middleware, and responses. This is the most common pattern for building APIs with Stacktape.

### Route authorization

Each HTTP API integration can optionally define an authorizer. Unauthorized requests are rejected with `401 Unauthorized` before your function code runs. Authorization is configured per-route on the integration, not on the gateway itself. See [HTTP triggers](/configuration/triggers/http-triggers) for the supported authorizer types and configuration details.

## CORS

Cross-Origin Resource Sharing (CORS) controls which browser-based frontends can call your API from a different domain. When CORS is enabled on the gateway, API Gateway handles preflight `OPTIONS` requests automatically — this overrides any CORS headers your application code sets.


Example (TypeScript):

```typescript
import { defineConfig, HttpApiGateway } from 'stacktape';
export default defineConfig(() => {
  const myApi = new HttpApiGateway({
    cors: {
      enabled: true,
      allowedOrigins: ['https://myapp.com', 'https://staging.myapp.com'],
      allowCredentials: true,
      maxAge: 86400
    }
  });

  return {
    resources: { myApi }
  };
});
```


When `enabled` is `true` with no other options, the gateway uses permissive defaults: `*` for allowed origins and common headers. The `allowedMethods` are auto-detected from the integrations attached to the gateway, so you typically don't need to set them manually.

Set `allowCredentials: true` if your frontend sends cookies or `Authorization` headers in cross-origin requests — note that this requires listing specific origins rather than using `*`. The `maxAge` property (in seconds) controls how long browsers cache preflight responses; setting it to `86400` (24 hours) reduces preflight overhead for frequently-called APIs.


> **Tip:** If your API is called only by server-side code, mobile apps, or same-origin frontends, you don't need CORS at all — skip this setting.


## Custom domains

Stacktape can attach your own domain (e.g., `api.example.com`) to an HTTP API Gateway. Stacktape automatically provisions a free TLS certificate and creates a DNS record in Route53. Your domain must have a [Route53 hosted zone](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/hosted-zones-working-with.html) in your AWS account — use [`stacktape domain:add`](/cli/domain-add) to set one up.


Example (TypeScript):

```typescript
import { defineConfig, HttpApiGateway } from 'stacktape';
export default defineConfig(() => {
  const myApi = new HttpApiGateway({
    customDomains: [{ domainName: 'api.example.com' }]
  });

  return {
    resources: { myApi }
  };
});
```


You can attach multiple domains to a single gateway. Each domain gets its own certificate, managed and auto-renewed by AWS. If you manage DNS records yourself, set `disableDnsRecordCreation: true` and Stacktape will provision the TLS certificate but skip creating the DNS record in Route53. If you have specific certificate requirements, provide `customCertificateArn` with an ACM certificate ARN from your AWS account; otherwise Stacktape provisions and renews free certificates automatically.

For full details on domain management, see [Custom domains](/resources/networking/custom-domains).

## CDN

The `cdn` property attaches a CDN (CloudFront) in front of the HTTP API Gateway, placing a global caching and edge-delivery layer before your API. This reduces latency for geographically distributed users and offloads repeated requests from your backend.

**When to enable CDN:** Your API serves cacheable public data (product catalogs, configuration endpoints, public content), or your users are spread across multiple continents and you need lower global latency.

**When to skip CDN:** Most Lambda-backed APIs return dynamic, user-specific data that isn't cacheable. Adding a CDN to a fully dynamic API adds CloudFront request and data-transfer charges, and cached behavior adds invalidation and propagation considerations. For APIs serving only authenticated, personalized responses, the default direct API Gateway endpoint is sufficient.


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


Setting `enabled: true` activates the CDN. The `cloudfrontPriceClass` controls which CloudFront edge regions serve traffic — `PriceClass_100` (North America + Europe, cheapest), `PriceClass_200` (adds Asia, Middle East, Africa), or `PriceClass_All` (all regions worldwide). WAF protection for CDN-backed APIs is configured on the CDN layer — see [CDN](/resources/networking/cdn) and [Web Application Firewall](/resources/security/web-application-firewall) for details.

See [CDN](/resources/networking/cdn) for the full CDN configuration surface, including caching behavior, custom domains on the CDN itself, edge functions, and route rewrites.

## Access logging

HTTP API Gateway logs every request by default. Logs include request ID, client IP, HTTP method, status code, protocol, and response length. View logs with [`stacktape debug:logs`](/cli/debug-logs) or in the Stacktape Console.


Example (TypeScript):

```typescript
import { defineConfig, HttpApiGateway } from 'stacktape';
export default defineConfig(() => {
  const myApi = new HttpApiGateway({
    logging: {
      format: 'JSON',
      retentionDays: 90
    }
  });

  return {
    resources: { myApi }
  };
});
```


The `format` property controls the log output shape — `JSON` (default), `CLF` (Common Log Format), `XML`, or `CSV`. JSON is the most practical for programmatic analysis and integrates well with log forwarding. The `retentionDays` property defaults to `30`. Allowed values are: 1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1827, or 3653 days.

HTTP API access logs support the shared log-forwarding configuration surface for sending logs to external services. See [Log forwarding](/observability/log-forwarding) for setup details.

To disable access logging entirely (not recommended for production), set `disabled: true`.

## Payload format

The payload format controls the shape of the event object your Lambda function receives from API Gateway. There are two versions:

| Version | Best for |
|---------|----------|
| `1.0` | Legacy integrations, existing code expecting the v1 event shape |
| `2.0` | New projects — simpler, flatter event structure with less parsing code |

When not set at the gateway level, the effective default is determined by each integration — integrations default to `1.0` unless overridden. You can set the format at the gateway level (applies to all routes unless an individual integration overrides it) or set it per-route on individual integrations.


Example (TypeScript):

```typescript
import { defineConfig, HttpApiGateway } from 'stacktape';
export default defineConfig(() => {
  const myApi = new HttpApiGateway({
    payloadFormat: '2.0'
  });

  return {
    resources: { myApi }
  };
});
```


> **Tip:** For new projects, use `2.0`. The simplified event structure requires less parsing code and is the format AWS recommends going forward. Frameworks like Hono's AWS Lambda adapter handle both formats transparently.


## Alarms

Stacktape supports two alarm types for HTTP API Gateway: **error rate** (percentage of 4xx/5xx responses) and **latency** (request-to-response time). Alarm notification targets are configured per-alarm through the shared notification integrations — supported targets include Slack, Microsoft Teams, email, Discord, and webhook. Alarms defined on the resource are merged with any global alarms configured in the Stacktape Console.


Example (TypeScript):

```typescript
import { defineConfig, HttpApiGateway } from 'stacktape';
export default defineConfig(() => {
  const myApi = new HttpApiGateway({
    alarms: [
      {
        trigger: {
          type: 'http-api-gateway-error-rate',
          properties: { thresholdPercent: 5 }
        }
      },
      {
        trigger: {
          type: 'http-api-gateway-latency',
          properties: {
            thresholdMilliseconds: 3000,
            statistic: 'p95'
          }
        }
      }
    ]
  });

  return {
    resources: { myApi }
  };
});
```


With the example settings and the default comparison operator (`GreaterThanThreshold`), the error-rate alarm fires when 4xx/5xx error rate is greater than 5%, and the latency alarm fires when p95 latency is greater than 3000 ms. For the latency alarm, the `statistic` property controls how the metric is aggregated — `avg` (default), `p90`, `p95`, `p99`, `min`, `max`, or `sum`. The error rate alarm does not support `statistic`. Both alarm types support a custom `comparisonOperator`: `GreaterThanThreshold` (default), `GreaterThanOrEqualToThreshold`, `LessThanThreshold`, and `LessThanOrEqualToThreshold`.

You can fine-tune alarm sensitivity with the `evaluation` property: set the evaluation `period` (default 60 seconds), `evaluationPeriods` (how many recent periods to examine), and `breachedPeriods` (how many must breach to fire). This prevents alarms from firing on brief spikes.

To exclude specific global alarms from this gateway, list their names in `disabledGlobalAlarms`. For more on alarm configuration, see [Alarms](/observability/alarms).

## Referenceable parameters

Use `$ResourceParam('myApi', 'paramName')` in your config to reference gateway values after deployment.


## Referenceable Parameters: `http-api-gateway`
These values can be referenced with `$ResourceParam("<<resource-name>>", "<<parameter-name>>")`.

| Parameter | Description | Usage |
| --- | --- | --- |
| `domain` | Default domain name | `$ResourceParam("<<resource-name>>", "domain")` |
| `url` | Default URL | `$ResourceParam("<<resource-name>>", "url")` |
| `customDomains` | Comma-separated list of custom domain names assigned to the HTTP Api Gateway (only available if you use [custom domain names](#custom-domain-names)) | `$ResourceParam("<<resource-name>>", "customDomains")` |
| `customDomainUrls` | Comma-separated list of custom domain name URLs (only available if you use [custom domain names](#custom-domain-names)) | `$ResourceParam("<<resource-name>>", "customDomainUrls")` |
| `customDomainUrl` | URL of the first custom domain name connected to this resource (only available if you use [custom domain names](#custom-domain-names)) | `$ResourceParam("<<resource-name>>", "customDomainUrl")` |
| `cdnDomain` | Default domain of the [CDN distribution](#cdn) (only available if you DO NOT configure custom domain names for the CDN). | `$ResourceParam("<<resource-name>>", "cdnDomain")` |
| `cdnUrl` | Default url of the [CDN distribution](#cdn) (only available if you DO NOT configure custom domain names for the CDN). | `$ResourceParam("<<resource-name>>", "cdnUrl")` |
| `cdnCustomDomains` | Comma-separated list of custom domain names assigned to the [CDN](#cdn)
(only available if you configure custom domain names for the CDN). | `$ResourceParam("<<resource-name>>", "cdnCustomDomains")` |
| `cdnCustomDomainUrls` | Comma-separated list of custom domain name URLs of the [CDN](#cdn)
(only available if you configure custom domain names for the CDN). | `$ResourceParam("<<resource-name>>", "cdnCustomDomainUrls")` |


## API Reference


## API Reference: `HttpApiGatewayProps`
```typescript
import type { CdnConfiguration, DomainConfiguration, HttpApiAccessLogsConfig, HttpApiCorsConfig, HttpApiGatewayAlarm } from 'stacktape';

type HttpApiGatewayProps = {
  /** Alarms for this API Gateway (merged with global alarms from the Stacktape Console). */
  alarms?: Array<HttpApiGatewayAlarm>;
  /** Put a CDN (CloudFront) in front of this API for caching and lower latency worldwide. */
  cdn?: CdnConfiguration;
  /** CORS settings. Overrides any CORS headers from your application code. */
  cors?: HttpApiCorsConfig;
  /** Custom domains (e.g., api.example.com). Stacktape auto-creates DNS records and TLS certificates. */
  customDomains?: Array<DomainConfiguration>;
  /** Global alarm names to exclude from this API Gateway. */
  disabledGlobalAlarms?: Array<string>;
  /** Access logging (request ID, IP, method, status, etc.). Viewable with stacktape logs. */
  logging?: HttpApiAccessLogsConfig;
  /** Lambda event payload format. 2.0 is simpler and recommended for new projects. */
  payloadFormat?: "1.0" | "2.0";
};
```

| Property | Required | Type | Description | Default |
| --- | --- | --- | --- | --- |
| `alarms` | no | `Array<HttpApiGatewayAlarm>` | Alarms for this API Gateway (merged with global alarms from the Stacktape Console). | - |
| `cdn` | no | `CdnConfiguration` | Put a CDN (CloudFront) in front of this API for caching and lower latency worldwide. | - |
| `cors` | no | `HttpApiCorsConfig` | CORS settings. Overrides any CORS headers from your application code. | - |
| `customDomains` | no | `Array<DomainConfiguration>` | Custom domains (e.g., `api.example.com`). Stacktape auto-creates DNS records and TLS certificates. Your domain must be added as a Route53 hosted zone in your AWS account first. | - |
| `disabledGlobalAlarms` | no | `Array<string>` | Global alarm names to exclude from this API Gateway. | - |
| `logging` | no | `HttpApiAccessLogsConfig` | Access logging (request ID, IP, method, status, etc.). Viewable with `stacktape logs`. | - |
| `payloadFormat` | no | `string: "1.0" \| "2.0"` | Lambda event payload format. `2.0` is simpler and recommended for new projects. Only used if not overridden at the integration level. | - |


## FAQ

### How much does AWS API Gateway HTTP API cost?

AWS API Gateway V2 (HTTP API) costs ~$1 per million requests with no minimum fee or hourly charge. You pay only for the requests your API receives. Data transfer out is billed separately at standard AWS rates. There's a free tier of 1 million requests per month for the first 12 months.

### How do I add routes to my HTTP API Gateway?

Routes are not defined on the gateway resource. Instead, attach `HttpApiIntegration` events to your [Lambda functions](/resources/compute/lambda-function) or container workloads, referencing the gateway by its resource name. Each integration specifies an HTTP method and URL path. For container workloads, the integration also requires a `containerPort`. See [HTTP triggers](/configuration/triggers/http-triggers) for the full integration API.

### Can I use a custom domain with HTTP API Gateway?

Yes. Add a `customDomains` array to your gateway configuration with your domain name. Stacktape provisions a free TLS certificate and creates a DNS record in Route53 automatically. Your domain must have a Route53 hosted zone in your AWS account — set one up with [`stacktape domain:add`](/cli/domain-add). See [Custom domains](/resources/networking/custom-domains) for details.

### What's the difference between HTTP API and REST API on AWS?

AWS offers two API Gateway products: HTTP API (V2) and REST API (V1). HTTP API is cheaper (~$1/M vs ~$3.50/M requests), has lower latency, and supports JWT authorizers natively. REST API offers more features (API keys, usage plans, request validation, WAF integration, private endpoints). Stacktape uses HTTP API because it covers the majority of use cases at lower cost.

### When should I use HTTP API Gateway vs an Application Load Balancer?

Use HTTP API Gateway for Lambda-based APIs with variable traffic — you pay per request and scale to zero. Use an [Application Load Balancer](/resources/networking/application-load-balancer) for container-based [web services](/resources/compute/web-service) with sustained traffic — the flat hourly cost plus LCU-based pricing is cheaper above roughly 50–100 million requests per month. ALBs also support richer routing rules (headers, query params, source IPs).

### Does HTTP API Gateway support WebSockets?

No. HTTP API Gateway routes request-response HTTP traffic by method and path. It does not support WebSocket connections or other persistent bidirectional communication. If you need real-time bidirectional messaging, a container-based architecture running a WebSocket server (e.g., Socket.io, ws) behind an [Application Load Balancer](/resources/networking/application-load-balancer) is a common alternative.

### How do I enable CORS on my API Gateway?

Set `cors: { enabled: true }` on the gateway resource. With no other options, this uses permissive defaults (`*` origins, auto-detected methods). To restrict origins, provide `allowedOrigins` with specific domain URLs. CORS is handled at the gateway level and overrides any CORS headers your application code sets.

### What is the maximum payload size for HTTP API Gateway?

AWS API Gateway V2 (HTTP API) has a maximum payload size of 10 MB for both requests and responses. For larger payloads, use S3 presigned URLs to upload/download files directly, or use an [Application Load Balancer](/resources/networking/application-load-balancer) which does not have this limit.

### Can I protect my API Gateway with a firewall?

The `HttpApiGateway` resource does not expose a top-level `useFirewall` property. To add WAF protection, enable `cdn` on the gateway and attach a [WebAppFirewall](/resources/security/web-application-firewall) resource to the CDN distribution. This provides rate limiting, IP filtering, geo-blocking, and bot protection at the edge layer in front of your API. See the [CDN](/resources/networking/cdn) and [Web Application Firewall](/resources/security/web-application-firewall) pages for configuration details.

### How fast does API Gateway respond?

API Gateway itself adds roughly 10–30ms of overhead per request for routing, authorization, and TLS termination — it is always ready to accept requests and does not cold-start. The latency your users observe comes primarily from your Lambda function's cold start (typically 100–500ms for Node.js/Python, longer for Java/.NET). To reduce end-to-end latency, optimize your Lambda's cold start time or use provisioned concurrency.
