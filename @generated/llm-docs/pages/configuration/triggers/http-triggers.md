# HTTP Triggers

HTTP triggers route incoming web requests to your Stacktape [Lambda functions](/resources/compute/lambda-function) and [container workloads](/resources/compute/multi-container-workload). Two integration types are available: [HTTP API Gateway](/resources/networking/http-api-gateway) for serverless routing by method and path, and [Application Load Balancer](/resources/networking/application-load-balancer) for routing based on paths, methods, hosts, headers, query parameters, and source IP addresses. [Web services](/resources/compute/web-service) and [private services](/resources/compute/private-service) handle HTTP traffic through their own resource-level configuration rather than event triggers.

Each incoming HTTP request triggers exactly one function or container invocation — there is no batching. For an overview of all trigger types (including non-HTTP sources like queues, schedules, and streams), see [Triggers overview](/configuration/triggers/overview).

## Choosing a trigger type

Stacktape offers two ways to route HTTP traffic to your compute resources. The right choice depends on your routing complexity, cost model, and whether you need built-in authorization at the gateway level.


## Feature Comparison

| Feature | HTTP API Gateway | Application Load Balancer |
| --- | --- | --- |
| Best for | Serverless APIs, simple routing | Complex routing, container workloads |
| Route dimensions | Method + path | Method, path, headers, query params, hosts, source IPs |
| Route evaluation | Specificity-based (most specific wins) | Priority-based (lowest number wins) |
| Built-in authorization | yes | no |
| Payload format options | 1.0 and 2.0 | ALB event format only |
| Works with Lambda functions | yes | yes |
| Works with container workloads | yes | yes |
| Pricing model | Per-request, no idle cost | Hourly + capacity units |


**Use HTTP API Gateway** when you want pay-per-request pricing and your routing needs are limited to method and path matching. This is the standard choice for most serverless APIs — you pay nothing at zero traffic, and per-request costs stay low until you reach high volumes.

**Use an Application Load Balancer** when you need to route based on headers, query parameters, hostnames, or source IP addresses. ALBs are also the right choice when you want to serve both Lambda functions and container workloads behind a single endpoint. ALBs charge hourly regardless of traffic, making them better suited to workloads with steady request volumes.


> **Info:** Stacktape also supports [Network Load Balancers](/resources/networking/network-load-balancer) for TCP and TLS (Layer 4) traffic. NLB integrations work with container workloads only and are not covered on this page.


## HTTP API Gateway integration

An HTTP API Gateway integration triggers a [Lambda function](/resources/compute/lambda-function) or container workload when an incoming request matches a specified HTTP method and URL path. You define the [HTTP API Gateway](/resources/networking/http-api-gateway) as a separate resource and reference it by name in the integration. Routes are matched by specificity — exact paths take priority over wildcard paths.


Example (TypeScript):

```typescript
import {
  defineConfig,
  LambdaFunction,
  HttpApiGateway,
  HttpApiIntegration,
  StacktapeLambdaBuildpackPackaging
} from 'stacktape';
export default defineConfig(() => {
  const apiGateway = new HttpApiGateway({});

  const api = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/handler.ts'
    }),
    events: [
      new HttpApiIntegration({
        httpApiGatewayName: 'apiGateway',
        method: '*',
        path: '/{proxy+}'
      })
    ]
  });

  return {
    resources: { apiGateway, api }
  };
});
```


In this example, `method: '*'` matches any HTTP method and `path: '/{proxy+}'` is a greedy path that catches all incoming requests. The `httpApiGatewayName` must reference the HTTP API Gateway resource defined in the same Stacktape configuration — here, `'apiGateway'`. This is the most common pattern: a single catch-all Lambda function that uses a framework like Hono, Express, or Fastify to handle routing internally.

### Route matching

HTTP API Gateway supports three path shapes with increasing specificity:

1. **Exact paths** (`/users`) — match a single URL exactly.
2. **Parameterized paths** (`/users/{id}`) — match a URL segment as a named parameter. The value is available in the Lambda event at `event.pathParameters.id`.
3. **Greedy paths** (`/users/{proxy+}`) — match all sub-paths. `/users/123`, `/users/123/posts`, and any deeper path all match.

The `method` property accepts `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, `OPTIONS`, or `*` (any method). Each HTTP API integration specifies its own `method` and `path`, so you can define separate integrations for `GET /users` and `POST /users` — each pointing to a different Lambda function.

To route different paths to different functions, create multiple Lambda functions each with their own `HttpApiIntegration` pointing to the same gateway. Alternatively, use a single catch-all route (`/{proxy+}` with method `*`) and handle routing inside your application code.

### Payload format

The `payloadFormat` property controls the shape of the event object your Lambda function receives. Two versions are available:

- **`'1.0'`** (default) — the original API Gateway payload format. Wraps the request in a detailed event envelope with `requestContext`, `headers`, `multiValueHeaders`, and `queryStringParameters`. For details on the differences between formats, see the [AWS documentation](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations-lambda.html).
- **`'2.0'`** — a simplified format with a flatter structure. Merges cookies into a dedicated field and simplifies header and query parameter handling.

Set `payloadFormat` on the HTTP API integration when a Lambda handler needs a specific API Gateway event shape. If omitted, Stacktape uses `'1.0'`. Most web frameworks (Hono, Express, Fastify) handle both formats transparently, so this choice mainly matters when writing raw Lambda handlers. If you are starting a new project and writing raw handlers, `'2.0'` has a simpler structure.

### Authorization

HTTP API Gateway integrations support an optional `authorizer` to protect individual routes. When configured, unauthorized requests are rejected with a `401 Unauthorized` response before they reach your function — saving invocation costs and reducing attack surface. For details on setting up authorizers, see [User auth pools](/resources/security/user-auth-pool).

Application Load Balancer integrations do not support built-in authorizers. If you use an ALB, handle authentication in your application code or a middleware layer.

## ALB integration

An [Application Load Balancer](/resources/networking/application-load-balancer) integration triggers a Lambda function or container workload when a request matches a combination of routing conditions: paths, HTTP methods, hostnames, headers, query parameters, and source IP addresses. Unlike HTTP API Gateway, ALB routes are evaluated by an explicit numeric `priority` — the lowest number is evaluated first, and the first matching rule handles the request. Lambda functions use the `ApplicationLoadBalancerIntegration` class to define ALB trigger rules. Container workloads use a `ContainerWorkloadLoadBalancerIntegration` (type `'application-load-balancer'`), which extends the same routing properties with a required `containerPort`.


Example (TypeScript):

```typescript
import {
  defineConfig,
  LambdaFunction,
  ApplicationLoadBalancer,
  ApplicationLoadBalancerIntegration,
  StacktapeLambdaBuildpackPackaging
} from 'stacktape';
export default defineConfig(() => {
  const alb = new ApplicationLoadBalancer({});

  const usersApi = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/users.ts'
    }),
    events: [
      new ApplicationLoadBalancerIntegration({
        loadBalancerName: 'alb',
        priority: 10,
        paths: ['/users', '/users/*'],
        methods: ['GET', 'POST', 'PUT', 'DELETE']
      })
    ]
  });

  return {
    resources: { alb, usersApi }
  };
});
```


In this example, the `usersApi` function handles GET, POST, PUT, and DELETE requests to `/users` and any path under `/users/*`. The `methods` property is optional — include it when the route should accept only specific HTTP methods, or omit it to leave method matching unconstrained. The `loadBalancerName` must reference the Application Load Balancer resource defined in the same Stacktape configuration — here, `'alb'`. The `priority: 10` determines where this rule sits in the evaluation order relative to other rules on the same load balancer.

### Routing conditions

ALB integrations support six routing conditions. All configured conditions must be met for the request to be routed. For list properties such as `paths` and `methods`, any listed value can match — for example, `paths: ['/users', '/posts']` matches requests to either path. For `headers` and `queryParams`, each condition has a `values` list where any listed value satisfies that condition.

| Condition | Description | Matching behavior |
|-----------|-------------|-------------------|
| `paths` | URL paths (e.g., `/users`, `/api/*`) | Case-sensitive. Supports `*` and `?` wildcards. |
| `methods` | HTTP methods (e.g., `GET`, `POST`) | Exact match. |
| `hosts` | Hostnames from the `Host` header | Supports `*` and `?` wildcards (e.g., `*.example.com`). |
| `headers` | HTTP header name + allowed values | Case-insensitive value comparison. |
| `queryParams` | Query parameter name + allowed values | Case-insensitive value comparison. |
| `sourceIps` | Client IP addresses in CIDR notation | Matches the proxy IP if the client is behind a proxy. |

Header conditions use the `headerName` and `values` fields. Query parameter conditions use `paramName` and `values`. This lets you build precise routing rules like "match `/api/*` with an `X-Tenant` header of `acme` or `globex`".

### Rule priority

The `priority` property is required for every ALB integration. Load balancer rules are evaluated from the lowest priority number to the highest — the first rule that matches an incoming request handles the request. As an AWS ALB constraint, priority values must be unique across all rules on the same listener.

When designing priority assignments, leave gaps between numbers (e.g., 10, 20, 30) so you can insert new rules later without renumbering existing ones. Specify `listenerPort` only when the load balancer uses custom listeners.

## Container workloads

[Container workloads](/resources/compute/multi-container-workload) can receive HTTP traffic through `http-api-gateway` and `application-load-balancer` integrations. For [web service](/resources/compute/web-service) and [private service](/resources/compute/private-service) HTTP traffic configuration, see their dedicated resource pages.

Container workloads use per-container `events` arrays. A `ContainerWorkloadHttpApiIntegration` (type `'http-api-gateway'`) routes matching gateway requests to a `containerPort` on the container, and a `ContainerWorkloadLoadBalancerIntegration` (type `'application-load-balancer'`) routes matching ALB requests to a `containerPort`. Both integration types expose the same routing properties as their Lambda counterparts (`method`, `path`, `priority`, `paths`, `methods`, `hosts`, `headers`, `queryParams`, `sourceIps`) plus the required `containerPort`.

Container workloads also support three additional integration types for internal networking:

- **`service-connect`** — opens a container port for connections from other compute resources in the same stack. Other resources in the stack can connect using `protocol://alias:port` (e.g., `http://my-service:8080`); by default, the alias is derived from the resource and container names. Supports a `protocol` declaration (`http`, `http2`, or `grpc`) for protocol-specific metrics.
- **`workload-internal`** — opens a container port for connections from other containers within the same workload only.
- **`network-load-balancer`** — routes TCP/TLS traffic from a [Network Load Balancer](/resources/networking/network-load-balancer) to a container port. Operates at Layer 4, not HTTP.


## API Reference: `HttpApiIntegrationProps`
```typescript
import type { CognitoAuthorizer, LambdaAuthorizer } from 'stacktape';

type HttpApiIntegrationProps = {
  /** The name of the HTTP API Gateway. */
  httpApiGatewayName: string;
  /** The HTTP method that will trigger this integration. */
  method: "*" | "DELETE" | "GET" | "HEAD" | "OPTIONS" | "PATCH" | "POST" | "PUT";
  /** The URL path that will trigger this integration. */
  path: string;
  /** An authorizer to protect this route. */
  authorizer?: HttpApiIntegrationAuthorizer;
  /** The payload format version for the Lambda integration. */
  payloadFormat?: "1.0" | "2.0";
};

/** Union choices used by the properties above. */
type HttpApiIntegrationAuthorizer =
  | CognitoAuthorizer
  | LambdaAuthorizer;
```

| Property | Required | Type | Description | Default |
| --- | --- | --- | --- | --- |
| `httpApiGatewayName` | yes | `string` | The name of the HTTP API Gateway. | - |
| `method` | yes | `string: "*" \| "DELETE" \| "GET" \| "HEAD" \| "OPTIONS" \| "PATCH" \| "POST" \| "PUT"` | The HTTP method that will trigger this integration. You can specify an exact method (e.g., `GET`) or use `*` to match any method. | - |
| `path` | yes | `string` | The URL path that will trigger this integration. **Exact path**: `/users`
**Path with parameter**: `/users/{id}`. The `id` will be available in `event.pathParameters.id`.
**Greedy path**: `/files/{proxy+}`. This will match any path starting with `/files/`. | - |
| `authorizer` | no | `cognito \| lambda` | An authorizer to protect this route. Unauthorized requests will be rejected with a `401 Unauthorized` response. | - |
| `payloadFormat` | no | `string: "1.0" \| "2.0"` | The payload format version for the Lambda integration. For details on the differences between formats, see the [AWS documentation](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations-lambda.html). | `'1.0'` |


The API reference above covers HTTP API Gateway integration properties. For ALB integration properties (`ApplicationLoadBalancerIntegrationProps`), see the [Application Load Balancer](/resources/networking/application-load-balancer) resource page.

## FAQ

### Can I use both HTTP API Gateway and ALB in the same stack?

Yes. HTTP API Gateways and Application Load Balancers are independent resources. You can define multiple gateways and load balancers in the same stack, routing different functions or workloads through each. This is useful when some routes benefit from pay-per-request pricing (API Gateway) while others need advanced routing capabilities (ALB).

### How do I route different URL paths to different Lambda functions?

Create multiple Lambda functions, each with its own HTTP trigger integration pointing to the same gateway or load balancer. With HTTP API Gateway, each function specifies a unique `method` and `path` combination. With ALB, each function specifies different `paths` and a unique `priority` value. See [Lambda functions](/resources/compute/lambda-function) for configuration details.

### What is the difference between payload format 1.0 and 2.0?

Payload format `'1.0'` wraps the HTTP request in a detailed event envelope with `requestContext`, `multiValueHeaders`, and `multiValueQueryStringParameters`. Payload format `'2.0'` uses a flatter structure with simpler header and query parameter handling. The default is `'1.0'`. Most web frameworks handle both transparently, so this mainly matters for raw Lambda handlers. See the [AWS documentation](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations-lambda.html) for a full comparison.

### How much does AWS HTTP API Gateway cost?

AWS HTTP API Gateway uses pay-per-request pricing with no minimum fees or idle costs. This makes it cost-effective for low-traffic, bursty, or early-stage APIs where you want to avoid paying for capacity you don't use. AWS also offers a free tier for API Gateway. For exact pricing by region, check the [AWS API Gateway pricing page](https://aws.amazon.com/api-gateway/pricing/).

### When should I use HTTP API Gateway instead of an Application Load Balancer?

Choose HTTP API Gateway for serverless APIs where you route by method and path and want per-request pricing with zero idle cost. Choose an Application Load Balancer when you need routing by headers, query parameters, hostnames, or source IPs, or when you run persistent container workloads with steady traffic. ALBs charge hourly regardless of traffic, making them more economical at high, consistent request volumes.

### Can I add authentication to my HTTP trigger routes?

HTTP API Gateway integrations support an `authorizer` property that rejects unauthorized requests at the gateway level before they reach your function. ALB integrations do not have built-in authorizer support — implement authentication in your application code instead. See [User auth pools](/resources/security/user-auth-pool) for setting up authorization with API Gateway.

### What is the maximum request payload size for HTTP API Gateway?

AWS HTTP API Gateway accepts request and response payloads up to 10 MB. For larger payloads, upload files directly to an [S3 bucket](/resources/storage/s3-bucket) using presigned URLs, or route traffic through an Application Load Balancer. Most REST and GraphQL APIs stay well within the 10 MB boundary.

### Can I use a custom domain with HTTP triggers?

Custom domains are configured on the gateway or load balancer resource, not on individual trigger integrations. See [Custom domains](/resources/networking/custom-domains) for setup details.

### What is the difference between an Application Load Balancer and a Network Load Balancer?

An ALB operates at Layer 7 (HTTP/HTTPS) and can route based on request content — paths, headers, query parameters, hostnames, and source IPs. A [Network Load Balancer](/resources/networking/network-load-balancer) operates at Layer 4 (TCP/TLS) and routes raw connections without inspecting request content. In Stacktape, NLB integrations work with container workloads only, not Lambda functions. Use an NLB for non-HTTP protocols or raw TCP/TLS services.

### How do I view logs for my HTTP-triggered functions?

Use [`stacktape debug:logs`](/cli/debug-logs) to stream or tail logs for Lambda functions and container workloads. You can also view logs in the [Stacktape Console](/stacktape-console/console-overview). Gateway-level access logging is configured on the [HTTP API Gateway resource](/resources/networking/http-api-gateway); see that page for details.
