# Application Load Balancer

A Stacktape Application Load Balancer routes HTTP/HTTPS requests to container workloads and [Lambda functions](/resources/compute/lambda-function) based on path, host, headers, query parameters, and source IPs. It uses AWS ALB underneath — flat ~$18/month pricing (AWS Free Tier eligible), WebSocket support, [firewall](/resources/security/web-application-firewall) attachment, and [gradual deployments](/deployment-and-lifecycle/gradual-deployments).

## When to use

Application Load Balancer is the right choice when you need advanced HTTP routing, WebSocket support, or a flat-cost alternative to pay-per-request API Gateway. It becomes more cost-effective than [HTTP API Gateway](/resources/networking/http-api-gateway) above roughly 500k requests per day (~15 million/month).

Common patterns that fit well:

- **Container-based web services** — [web services](/resources/compute/web-service) and [private services](/resources/compute/private-service) that stay running and serve HTTP traffic
- **Multiple services behind one endpoint** — route `/api/*` to one service, `/admin/*` to another, using priority-based rules
- **WebSocket applications** — Stacktape's Application Load Balancer is the documented path for WebSocket connections; the [HTTP API Gateway](/resources/networking/http-api-gateway) integration source documents HTTP method/path routing, not WebSocket routes
- **Firewall-protected APIs** — attach a [web application firewall](/resources/security/web-application-firewall) directly to the ALB to protect against common web exploits
- **Gradual deployments** — canary and linear deployment strategies require an ALB
- **Sustained high traffic** — flat pricing is cheaper than pay-per-request above moderate volume

## When NOT to use

- **Lambda-only APIs with variable traffic** — use an [HTTP API Gateway](/resources/networking/http-api-gateway) instead. Pay-per-request scales to zero cost and is cheaper at low-to-moderate volume.
- **Low-traffic or spiky APIs** — the ALB's ~$18/month base cost runs even with zero requests. HTTP API Gateway charges nothing when idle.
- **TCP/TLS (non-HTTP) protocols** — use a [Network Load Balancer](/resources/networking/network-load-balancer) for raw TCP or TLS passthrough.
- **Simple single-function APIs** — if your entire backend is one Lambda behind `/{proxy+}`, HTTP API Gateway is simpler and cheaper.


## Feature Comparison

| Feature | Application Load Balancer | HTTP API Gateway |
| --- | --- | --- |
| Pricing model | Flat ~$18/month + LCU-based | Pay-per-request |
| Best for | Container workloads | Lambda functions |
| Scales to zero cost | No | Yes |
| Routing options | Path, method, host, headers, query params, source IPs | Method + path |
| WebSocket support | Yes | No |
| Direct WAF attachment | Yes | No |
| Gradual deployments | Yes | No |
| CDN attachable | Yes | Yes |


For full [HTTP API Gateway](/resources/networking/http-api-gateway) capabilities and feature details, see the dedicated HTTP API Gateway page.

## Basic example

An Application Load Balancer resource defines the load balancer itself — listeners, domains, and optional features. Routes are defined on the compute resources ([Lambda functions](/resources/compute/lambda-function), [web services](/resources/compute/web-service), [multi-container workloads](/resources/compute/multi-container-workload)) that reference the ALB by name through their integrations.


Example (TypeScript):

```typescript
import { defineConfig, ApplicationLoadBalancer } from 'stacktape';
export default defineConfig(() => {
  const myAlb = new ApplicationLoadBalancer({});

  return {
    resources: { myAlb }
  };
});
```


The ALB `myAlb` has no explicit configuration because its listener defaults handle the common case. [Lambda functions](/resources/compute/lambda-function) attach to the ALB through an `ApplicationLoadBalancerIntegration` event, while container workloads use the container ALB integration (type `application-load-balancer`) and must additionally specify `containerPort` to identify which container port receives the traffic.

You can reference the deployed ALB domain with `$ResourceParam('myAlb', 'domain')` in your config or retrieve it via [`stacktape param:get`](/cli/param-get).

## Routing

Routes are not defined on the Application Load Balancer resource itself. Instead, each compute resource declares which ALB it connects to and what conditions trigger routing. This keeps routing co-located with the code that serves each route.

A single ALB can serve routes from many Lambda functions and container workloads. Each integration specifies a `priority` (rules are evaluated from lowest to highest — first match wins) and one or more matching conditions:

| Condition | Example | Behavior |
|-----------|---------|----------|
| `paths` | `['/api/*', '/health']` | Match URL path. Supports `*` and `?` wildcards. Case-sensitive. |
| `methods` | `['GET', 'POST']` | Match HTTP method |
| `hosts` | `['api.example.com', '*.myapp.com']` | Match `Host` header. Supports wildcards. |
| `headers` | `[{ headerName: 'X-Tenant', values: ['acme'] }]` | Match header name and value (case-insensitive) |
| `queryParams` | `[{ paramName: 'version', values: ['v2'] }]` | Match query parameter (case-insensitive) |
| `sourceIps` | `['10.0.0.0/8']` | Match client IP in CIDR format |

When multiple conditions are specified on a single integration, all conditions must match for the rule to fire (AND logic). Within a condition's value array, any match is sufficient (OR logic).


> **Tip:** Leave gaps between priority values — e.g., 10, 20, 30 — so you can insert rules later without reassigning all priorities.


For container workloads, the integration also requires `containerPort` to specify which container port receives the traffic. See [HTTP triggers](/resources/triggers/http-triggers) for the full integration API.

### Multi-service routing

A common pattern is routing different URL prefixes to different backend services through the same ALB:


Example (TypeScript):

```typescript
import {
  defineConfig,
  ApplicationLoadBalancer,
  LambdaFunction,
  StacktapeLambdaBuildpackPackaging,
  ApplicationLoadBalancerIntegration
} from 'stacktape';
export default defineConfig(() => {
  const myAlb = new ApplicationLoadBalancer({});

  const usersApi = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/users.ts'
    }),
    events: [
      new ApplicationLoadBalancerIntegration({
        loadBalancerName: 'myAlb',
        priority: 10,
        paths: ['/users', '/users/*']
      })
    ]
  });

  const ordersApi = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/orders.ts'
    }),
    events: [
      new ApplicationLoadBalancerIntegration({
        loadBalancerName: 'myAlb',
        priority: 20,
        paths: ['/orders', '/orders/*']
      })
    ]
  });

  return {
    resources: { myAlb, usersApi, ordersApi }
  };
});
```


The `priority` values determine evaluation order. Requests to `/users/123` match `usersApi` (priority 10), and `/orders/456` match `ordersApi` (priority 20). If a listener has a `defaultAction` configured, requests that don't match any rule receive that redirect.

## Listeners

When `listeners` is omitted, an Application Load Balancer creates two default listeners: HTTPS on port 443 and HTTP on port 80 (redirecting to HTTPS). Custom listeners let you change ports, add IP restrictions, or define redirect behavior for unmatched requests.

When you provide custom listener objects, each requires an explicit `protocol` (`HTTP` or `HTTPS`) and `port`. Any HTTPS listener requires a TLS certificate: Stacktape provisions one automatically when you configure `customDomains`, or you supply your own ACM certificates via the listener's `customCertificateArns`. If neither is set, an HTTPS listener cannot be created.

**When to configure custom listeners:** You need a non-standard port, want to restrict access by IP address, or need a custom redirect for unmatched requests.


> **Tip:** Most applications work fine with default listeners (HTTPS 443 + HTTP 80 redirect). Configure custom listeners only if you need a non-standard port, IP allowlisting, or a custom redirect behavior.


Example (TypeScript):

```typescript
import { defineConfig, ApplicationLoadBalancer } from 'stacktape';
export default defineConfig(() => {
  const myAlb = new ApplicationLoadBalancer({
    customDomains: [{ domainName: 'api.example.com' }],
    listeners: [
      {
        protocol: 'HTTPS',
        port: 443,
        whitelistIps: ['10.0.0.0/8', '192.168.1.0/24']
      },
      {
        protocol: 'HTTP',
        port: 80
      }
    ]
  });

  return {
    resources: { myAlb }
  };
});
```


The `protocol` is either `HTTP` or `HTTPS`. HTTPS listeners require a TLS certificate — Stacktape provisions one automatically when you use `customDomains`, or you can supply your own via `customCertificateArns`.

The `whitelistIps` property restricts access to specific IP addresses or CIDR ranges. When set, requests from other IPs are rejected at the load balancer level before reaching your application.

The optional `defaultAction` property on a custom listener configures a redirect for requests that don't match any integration rule. The `statusCode` is either `HTTP_301` (permanent) or `HTTP_302` (temporary). Redirect targets can reuse parts of the original URL with placeholders: `#{protocol}`, `#{host}`, `#{port}`, `#{path}`, and `#{query}`.

## Custom domains

Stacktape can attach your own domain (e.g., `api.example.com`) to an Application Load Balancer. By default, Stacktape creates DNS records and TLS certificates for each domain. The domain must have a [Route53 hosted zone](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/hosted-zones-working-with.html) in your AWS account — use [`stacktape domain:add`](/cli/domain-add) to set one up.


Example (TypeScript):

```typescript
import { defineConfig, ApplicationLoadBalancer } from 'stacktape';
export default defineConfig(() => {
  const myAlb = new ApplicationLoadBalancer({
    customDomains: [{ domainName: 'api.example.com' }, { domainName: 'api-v2.example.com' }]
  });

  return {
    resources: { myAlb }
  };
});
```


You can list multiple domain configurations. By default, Stacktape creates DNS records and TLS certificates for the configured domains. These options can be configured independently: set `disableDnsRecordCreation: true` if you manage DNS records yourself (Stacktape still provisions the TLS certificate), or provide `customCertificateArn` to use your own ACM certificate instead of the auto-generated one.

Prefer the object form (`{ domainName: 'api.example.com' }`) because it also supports certificate and DNS options; Stacktape still accepts the backward-compatible `string[]` form for domain names.

For full details on domain management, see [Custom domains](/resources/networking/custom-domains).

## CDN

The `cdn` property puts CloudFront in front of the load balancer for caching and lower latency worldwide. See the [CDN page](/resources/networking/cdn) for cache policy and forwarding details.

**When to enable CDN:** Your API serves cacheable public data (product catalogs, static assets, content APIs), or your users are spread across continents and you need lower global latency.

**When to skip CDN:** Most APIs behind an ALB return dynamic, user-specific data that isn't cacheable. Adding a CDN to a fully dynamic API adds CloudFront request and data-transfer charges without meaningful benefit. For APIs serving only authenticated, personalized responses, the default direct ALB endpoint is sufficient.


Example (TypeScript):

```typescript
import { defineConfig, ApplicationLoadBalancer } from 'stacktape';
export default defineConfig(() => {
  const myAlb = new ApplicationLoadBalancer({
    customDomains: [{ domainName: 'api.example.com' }],
    cdn: {
      enabled: true,
      cloudfrontPriceClass: 'PriceClass_100'
    }
  });

  return {
    resources: { myAlb }
  };
});
```


Setting `enabled: true` activates the CDN. The `cloudfrontPriceClass` controls which edge regions are used — `PriceClass_100` (North America + Europe, cheapest), `PriceClass_200` (adds Asia, Middle East, Africa), or `PriceClass_All` (all regions worldwide). See the [CDN page](/resources/networking/cdn) for default values and cache behavior details.

When the ALB uses custom listeners, set `listenerPort` to tell CloudFront which listener to target. You can also attach a [web application firewall](/resources/security/web-application-firewall) to the CDN using the CDN's own `useFirewall` property.


> **Tip:** Most APIs serving only authenticated or personalized responses don't benefit from CDN. The extra CloudFront charges and caching complexity aren't worth it for fully dynamic traffic. Enable CDN when you serve cacheable public content or need lower global latency.


See [CDN](/resources/networking/cdn) for the full CDN configuration surface.

## Firewall

The `useFirewall` property attaches a [web application firewall](/resources/security/web-application-firewall) directly to the Application Load Balancer, protecting it from common web exploits.

**When to enable firewall:** Your ALB is internet-facing and you want to protect it from common web exploits. See [Web application firewall](/resources/security/web-application-firewall) for the full range of WAF capabilities including rate limiting, IP-based blocking, geo-restriction, and managed rule groups.

**When to skip firewall:** Internal ALBs or development stages where the overhead and cost of WAF rules aren't justified. The ALB itself provides basic network-level security through security groups.


Example (TypeScript):

```typescript
import { defineConfig, ApplicationLoadBalancer, WebAppFirewall } from 'stacktape';
export default defineConfig(() => {
  const apiFirewall = new WebAppFirewall({
    scope: 'regional'
  });

  const myAlb = new ApplicationLoadBalancer({
    useFirewall: 'apiFirewall'
  });

  return {
    resources: { apiFirewall, myAlb }
  };
});
```


The `useFirewall` value is the resource name of a `web-app-firewall` resource defined in your stack. The firewall attached to an ALB must use a regional scope (not a CloudFront/CDN scope). See [Web application firewall](/resources/security/web-application-firewall) for the full WAF configuration surface, including the exact accepted scope values.


> **Info:** The ALB-level `useFirewall` and the CDN-level `cdn.useFirewall` are separate. The ALB firewall protects direct ALB traffic; the CDN firewall protects the CloudFront distribution. If you use both a CDN and a firewall, attach the firewall to the CDN for best coverage — edge-level filtering blocks attacks before they reach your origin.


## Internal load balancer

By default, an Application Load Balancer is internet-facing. Setting `interface` to `'internal'` makes the ALB VPC-only and not reachable from the internet.

**When to use an internal ALB:** You have microservices that communicate with each other over HTTP but should not be exposed to the internet. For example, an internal API consumed by other services in the same stack, or a backend service accessed through a VPN.


Example (TypeScript):

```typescript
import { defineConfig, ApplicationLoadBalancer } from 'stacktape';
export default defineConfig(() => {
  const internalAlb = new ApplicationLoadBalancer({
    interface: 'internal'
  });

  return {
    resources: { internalAlb }
  };
});
```


The `interface` property accepts `'internet'` (default) or `'internal'`. Internal ALBs still support all the same routing, listeners, and alarm features — they simply aren't reachable from outside the VPC.

## Alarms

Stacktape supports three alarm trigger types for Application Load Balancer: **error rate** (`application-load-balancer-error-rate`, percentage of 4xx/5xx responses), **unhealthy targets** (`application-load-balancer-unhealthy-targets`, percentage of targets failing health checks), and **custom** (`application-load-balancer-custom`). Alarm notification targets are configured per-alarm — supported targets include Slack, Microsoft Teams, email, Discord, and webhook. Alarms defined on the resource are merged with any global alarms configured in the Stacktape Console.


Example (TypeScript):

```typescript
import { defineConfig, ApplicationLoadBalancer } from 'stacktape';
export default defineConfig(() => {
  const myAlb = new ApplicationLoadBalancer({
    alarms: [
      {
        trigger: {
          type: 'application-load-balancer-error-rate',
          properties: { thresholdPercent: 5 }
        }
      },
      {
        trigger: {
          type: 'application-load-balancer-unhealthy-targets',
          properties: { thresholdPercent: 50 }
        }
      }
    ]
  });

  return {
    resources: { myAlb }
  };
});
```


The error-rate alarm fires when the percentage of 4xx/5xx responses exceeds `thresholdPercent`. The unhealthy-targets alarm fires when the percentage of targets failing health checks exceeds `thresholdPercent`. If the ALB has multiple target groups, the unhealthy-targets alarm fires if *any* group breaches the threshold. You can narrow it to specific services with `onlyIncludeTargets`.

A third trigger type, `application-load-balancer-custom`, exists for alarming on additional ALB metrics. See [Alarms](/observability/alarms) for its configuration surface.

The error-rate and unhealthy-targets triggers support a custom `comparisonOperator`: `GreaterThanThreshold` (default), `GreaterThanOrEqualToThreshold`, `LessThanThreshold`, and `LessThanOrEqualToThreshold`.

You can fine-tune alarm sensitivity with the `evaluation` property: set the evaluation `period` (default 60 seconds), `evaluationPeriods` (how many recent periods to examine), and `breachedPeriods` (how many must breach to fire). This prevents alarms from firing on brief spikes.

To exclude specific global alarms from this ALB, list their names in `disabledGlobalAlarms`. For more on alarm configuration, see [Alarms](/observability/alarms).

## Referenceable parameters

Use `$ResourceParam('myAlb', 'paramName')` in your config to reference ALB values after deployment.


## Referenceable Parameters: `application-load-balancer`
These values can be referenced with `$ResourceParam("<<resource-name>>", "<<parameter-name>>")`.

| Parameter | Description | Usage |
| --- | --- | --- |
| `domain` | default domain name of load balancer | `$ResourceParam("<<resource-name>>", "domain")` |
| `customDomains` | Comma-separated list of custom domain names assigned to the Load balancer (only available if you use [custom domain names](/resources/networking/custom-domains/)) | `$ResourceParam("<<resource-name>>", "customDomains")` |
| `cdnDomain` | Default domain of the [CDN distribution](/resources/networking/cdn/) (only available if you DO NOT configure custom domain names for the CDN). | `$ResourceParam("<<resource-name>>", "cdnDomain")` |
| `cdnUrl` | Default url of the [CDN distribution](/resources/networking/cdn/) (only available if you DO NOT configure custom domain names for the CDN). | `$ResourceParam("<<resource-name>>", "cdnUrl")` |
| `cdnCustomDomains` | Comma-separated list of custom domain names assigned to the [CDN](/resources/networking/cdn/) (only available if you configure custom domain names for the CDN). | `$ResourceParam("<<resource-name>>", "cdnCustomDomains")` |
| `cdnCustomDomainUrls` | Comma-separated list of custom domain name URLs of the [CDN](/resources/networking/cdn/) (only available if you configure custom domain names for the CDN). | `$ResourceParam("<<resource-name>>", "cdnCustomDomainUrls")` |


## API Reference


### Definition: `ApplicationLoadBalancerProps`

The complete property-level reference is included in `llms-api-reference.txt` and indexed under route `/config-reference/application-load-balancer` with definition name `ApplicationLoadBalancerProps`.

| Property | Required | Type | Default |
| --- | --- | --- | --- |
| `alarms` | no | `Array<ApplicationLoadBalancerAlarm>` | - |
| `cdn` | no | `ApplicationLoadBalancerCdnConfiguration` | - |
| `customDomains` | no | `option-1 \| option-2` | - |
| `disabledGlobalAlarms` | no | `Array<string>` | - |
| `interface` | no | `string: "internal" \| "internet"` | `internet` |
| `listeners` | no | `Array<ApplicationLoadBalancerListener>` | - |
| `useFirewall` | no | `string` | - |


## FAQ

### How much does an Application Load Balancer cost?

AWS ALB has a flat base charge of roughly $18/month plus a variable component based on Load Balancer Capacity Units (LCUs). LCUs measure active connections, new connections, bandwidth, and rule evaluations — most moderate-traffic apps stay near the base cost. ALB is AWS Free Tier eligible. Note the base cost runs even at zero traffic, so a pay-per-request [HTTP API Gateway](/resources/networking/http-api-gateway) is cheaper for low or spiky volume.

### How do I route traffic to multiple services through one ALB?

Routes live on the compute resources, not on the ALB. Give each Lambda function or container workload its own `ApplicationLoadBalancerIntegration` event referencing the same ALB by name, with a `priority` (rules are evaluated lowest-first, first match wins) and matching conditions like `paths`, `methods`, or `hosts`. Leave gaps between priority values (10, 20, 30) so you can insert rules later without renumbering. See [HTTP triggers](/resources/triggers/http-triggers) for the full integration API.

### What's the difference between an Application Load Balancer and a Network Load Balancer?

An [Application Load Balancer](/resources/networking/application-load-balancer) operates at the HTTP layer (Layer 7) and can route based on URL path, headers, query params, and host. A [Network Load Balancer](/resources/networking/network-load-balancer) operates at the TCP/TLS layer (Layer 4) and handles non-HTTP traffic. Use an ALB for web APIs and HTTP services; see the [Network Load Balancer](/resources/networking/network-load-balancer) page for NLB-specific capabilities and when to choose it.

### When should I use an ALB vs HTTP API Gateway?

Use an [HTTP API Gateway](/resources/networking/http-api-gateway) for Lambda-based APIs with variable or low traffic — pay-per-request scales to zero cost. Use an Application Load Balancer for container-based services, WebSocket applications, or when you need advanced routing (headers, query params, source IPs). ALB's flat pricing is cheaper above roughly 500k requests per day. ALB also supports [gradual deployments](/deployment-and-lifecycle/gradual-deployments) and direct [WAF attachment](/resources/security/web-application-firewall).

### Does the Application Load Balancer support WebSockets?

Yes. AWS ALB natively supports WebSocket connections over HTTP/HTTPS listeners. Once the initial HTTP upgrade handshake completes, the ALB maintains the persistent bidirectional connection between client and backend. This makes ALB the right networking choice for real-time applications using Socket.io, ws, or similar WebSocket libraries. Stacktape's Application Load Balancer is the documented path for WebSocket connections.

### Why isn't my health check configured on the Application Load Balancer resource?

The ALB resource itself does not define health-check settings — they live on the target. AWS ALB continuously probes registered targets and removes unhealthy ones from the routing pool, but the health-check path and thresholds are configured on the container workload or service that receives the traffic. See [web service](/resources/compute/web-service) or [multi-container workload](/resources/compute/multi-container-workload) for health-check settings, and use the `application-load-balancer-unhealthy-targets` alarm to be notified when targets fail.
