# HTTP API Gateway

An HTTP API Gateway is a public HTTPS endpoint, run by AWS API Gateway (HTTP API), that routes requests to
[Lambda functions](/resources/compute/lambda-function) and container workloads. It costs $1 per million requests in
us-east-1 and nothing when idle, which makes it the default entry point for APIs. [Web services](/resources/compute/web-service)
use one by default too.

An integration must answer within 30 seconds and a request or response can be at most 10 MB. For long-lived
connections use a [WebSocket API Gateway](/resources/networking/websocket-api-gateway), and for TCP use a
[Network Load Balancer](/resources/networking/network-load-balancer).

## Basic example

The gateway itself holds no routes. Each function or container declares the method and path it serves, with an
[HTTP trigger](/resources/triggers/http-triggers) that names the gateway.


Example (TypeScript):

```typescript
import {
  defineConfig,
  HttpApiGateway,
  LambdaFunction,
  HttpApiIntegration,
  JsBundleLambdaPackaging
} from 'stacktape';
export default defineConfig(() => {
  const myApi = new HttpApiGateway({});

  const getUsers = new LambdaFunction({
    packaging: new JsBundleLambdaPackaging({
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


The deploy prints the gateway URL (`https://<api-id>.execute-api.<region>.amazonaws.com`). `GET /users` on it now
invokes `getUsers`. In the config, `$ResourceParam('myApi', 'url')` gives the same URL.

## Routing

A gateway serves routes from any number of functions and containers. Each integration sets a `method` (`GET`, `POST`,
`PUT`, `PATCH`, `DELETE`, `HEAD`, `OPTIONS` or `*` for any) and a `path`:

| Pattern | Example | Matches |
|---|---|---|
| Exact | `/users` | Only `/users` |
| Parameter | `/users/{id}` | `/users/123`, with `id` in `event.pathParameters` |
| Greedy | `/api/{proxy+}` | Everything under `/api/` |

The most specific route wins, so exact paths beat greedy ones. A container integration also needs `containerPort`.
Each integration can have its own authorizer (a Cognito user pool, a Lambda function or IAM), which runs before your code. See
[HTTP triggers](/resources/triggers/http-triggers) for integration and authorizer options.

### One function for all routes

When a framework such as Hono, Express or FastAPI does the routing, send every request to one function:


Example (TypeScript):

```typescript
import {
  defineConfig,
  HttpApiGateway,
  LambdaFunction,
  HttpApiIntegration,
  JsBundleLambdaPackaging
} from 'stacktape';

export default defineConfig(() => {
  const myApi = new HttpApiGateway({});

  const api = new LambdaFunction({
    packaging: new JsBundleLambdaPackaging({
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


## Choosing between HTTP API Gateway and a load balancer

An [Application Load Balancer](/resources/networking/application-load-balancer) costs a fixed $0.0225 an hour (about
$16 a month) plus load balancer capacity units (LCUs, $0.008 each per hour) that grow with new connections, active
connections, traffic and rule evaluations. An HTTP API Gateway costs $1 per million requests. Monthly cost in
us-east-1 for small (2 KB) requests at a steady rate, each on a new connection
([API Gateway pricing](https://aws.amazon.com/api-gateway/pricing/),
[Elastic Load Balancing pricing](https://aws.amazon.com/elasticloadbalancing/pricing/)):

| Requests per month | HTTP API Gateway | Application Load Balancer |
|---|---|---|
| 1 million | $1 | about $17 |
| 10 million | $10 | about $17 |
| 50 million | $50 | about $21 |
| 200 million | $200 | about $34 |

The load balancer gets cheaper from about 20 million requests a month. Bursty traffic and large responses add LCUs, and
connections that clients reuse remove them. Cost isn't the only difference: a load balancer also routes by header,
query string and source IP, keeps WebSocket connections to containers and has no 30-second limit, while the gateway
has per-route authorizers and scales to zero cost.

## CORS

CORS lets a browser app on another origin call your API. With CORS on, the gateway answers preflight `OPTIONS`
requests itself and replaces any CORS headers your code sets.


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


`enabled: true` alone allows every origin. Allowed methods come from the routes on the gateway, so you rarely set them.
`allowCredentials: true` is needed when the browser sends cookies or an `Authorization` header, and then you must list
the origins instead of using `*`. `maxAge` sets how long browsers cache the preflight answer, in seconds.

Server-side callers, mobile apps and same-origin frontends don't need CORS.

## Custom domains

After you [set up the domain](/resources/networking/custom-domains#set-up-the-domain) with `stacktape domain add`,
attach it to the gateway:


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


The deploy uses the issued certificate that covers `api.example.com` and creates the DNS record. To keep DNS at
another provider, see [External DNS](/resources/networking/custom-domains#external-dns).

## CDN

`cdn.enabled: true` puts a CloudFront distribution in front of the gateway. It helps when the API returns cacheable
public data or users are far from your region. For personalized responses it only adds CloudFront charges.


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


`cloudfrontPriceClass` picks the CloudFront locations: `PriceClass_100` (North America and Europe, the cheapest),
`PriceClass_200` or `PriceClass_All`. See [CDN](/resources/networking/cdn) for caching and routing options.

## Firewall

The gateway has no firewall setting of its own. Enable `cdn` and attach a
[web application firewall](/resources/security/web-application-firewall) to the CDN, or use an Application Load
Balancer with `useFirewall`.

## Access logging

The gateway logs every request (request ID, client IP, method, path, status, response size) and keeps the logs for 30
days. Read them with [`stacktape logs`](/cli/logs).


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


`format` is `JSON` by default; `CLF`, `XML` and `CSV` are also accepted. `retentionDays` takes the CloudWatch values (1,
3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1827 or 3653). `logging.disabled: true` turns logging off,
and [log forwarding](/observability/log-forwarding) sends logs to another service.

## Payload format

The payload format is the shape of the event a function receives. Integrations use `1.0` unless you set `payloadFormat`
on the gateway or on the integration. `2.0` has a flatter event and is what AWS recommends for new code; Hono's Lambda
adapter handles both. All HTTP events of one function must use the same format.


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


## Alarms

Gateway alarms use the `http-api-gateway-error-rate` (share of 4xx and 5xx responses) and `http-api-gateway-latency`
triggers.


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


The error-rate alarm fires above 5%, the latency alarm when p95 latency is above 3,000 ms. `statistic` applies to
latency only (`avg` by default). See [Alarms](/observability/alarms) for `evaluation` settings, comparison operators
and notification channels.

## Configuration reference


### Definition: `HttpApiGatewayProps`

The complete property-level reference is included in `llms-api-reference.txt` and indexed under route `/config-reference/http-api-gateway` with definition name `HttpApiGatewayProps`.

| Property | Required | Type | Default |
| --- | --- | --- | --- |
| `alarms` | no | `Array<HttpApiGatewayAlarm>` | - |
| `cdn` | no | `CdnConfiguration` | - |
| `cors` | no | `HttpApiCorsConfig` | - |
| `customDomains` | no | `Array<DomainConfiguration>` | - |
| `disabledGlobalAlarms` | no | `Array<string>` | - |
| `logging` | no | `HttpApiAccessLogsConfig` | - |
| `payloadFormat` | no | `string: "1.0" \| "2.0"` | - |


## Referenceable parameters


## Referenceable Parameters: `http-api-gateway`
These values can be referenced with `$ResourceParam("<<resource-name>>", "<<parameter-name>>")`.

| Parameter | Description | Usage |
| --- | --- | --- |
| `domain` | Default domain name | `$ResourceParam("<<resource-name>>", "domain")` |
| `url` | Default URL | `$ResourceParam("<<resource-name>>", "url")` |
| `customDomains` | Comma-separated list of custom domain names assigned to the HTTP Api Gateway (only available if you use [custom domain names](/resources/networking/custom-domains/)) | `$ResourceParam("<<resource-name>>", "customDomains")` |
| `customDomainUrls` | Comma-separated list of custom domain name URLs (only available if you use [custom domain names](/resources/networking/custom-domains/)) | `$ResourceParam("<<resource-name>>", "customDomainUrls")` |
| `customDomainUrl` | URL of the first custom domain name connected to this resource (only available if you use [custom domain names](/resources/networking/custom-domains/)) | `$ResourceParam("<<resource-name>>", "customDomainUrl")` |
| `cdnDomain` | Default domain of the [CDN distribution](/resources/networking/cdn/) (only available if you DO NOT configure custom domain names for the CDN). | `$ResourceParam("<<resource-name>>", "cdnDomain")` |
| `cdnUrl` | Default url of the [CDN distribution](/resources/networking/cdn/) (only available if you DO NOT configure custom domain names for the CDN). | `$ResourceParam("<<resource-name>>", "cdnUrl")` |
| `cdnCustomDomains` | Comma-separated list of custom domain names assigned to the [CDN](/resources/networking/cdn/) (only available if you configure custom domain names for the CDN). | `$ResourceParam("<<resource-name>>", "cdnCustomDomains")` |
| `cdnCustomDomainUrls` | Comma-separated list of custom domain name URLs of the [CDN](/resources/networking/cdn/) (only available if you configure custom domain names for the CDN). | `$ResourceParam("<<resource-name>>", "cdnCustomDomainUrls")` |


## Next steps

- [HTTP triggers](/resources/triggers/http-triggers): route requests to Lambda functions.
- [User auth pool](/resources/security/user-auth-pool): require sign-in on routes.
- [CDN](/resources/networking/cdn): cache responses close to your users.
