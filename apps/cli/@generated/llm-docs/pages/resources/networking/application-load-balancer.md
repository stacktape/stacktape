# Application Load Balancer

An Application Load Balancer (AWS ALB) receives HTTP and HTTPS traffic and routes it to container workloads and
[Lambda functions](/resources/compute/lambda-function) by path, host, header, query string or source IP. It keeps
WebSocket connections open to containers, takes a [firewall](/resources/security/web-application-firewall) directly and
is required for [gradual deployments](/deployment-and-lifecycle/gradual-deployments) of containers.

It costs $0.0225 an hour (about $16 a month in us-east-1) even with no traffic, plus capacity units as traffic grows.
For Lambda APIs with modest traffic, an [HTTP API Gateway](/resources/networking/http-api-gateway) costs less; see
[the cost comparison](/resources/networking/http-api-gateway#choosing-between-http-api-gateway-and-a-load-balancer).

## Basic example

The load balancer holds listeners and domains. Routes live on the functions and containers that use it.


Example (TypeScript):

```typescript
import { defineConfig, ApplicationLoadBalancer } from 'stacktape';
export default defineConfig(() => {
  const myAlb = new ApplicationLoadBalancer({
    customDomains: [{ domainName: 'app.example.com' }]
  });

  return {
    resources: { myAlb }
  };
});
```


By default the load balancer listens on HTTPS (443) and redirects HTTP (80) to HTTPS. The certificate comes from the
custom domain, so [set up the domain](/resources/networking/custom-domains#set-up-the-domain) before the first deploy.
Without `customDomains`, the load balancer is served on a `*.stacktape-app.com` domain that the
[Stacktape Console](/getting-started/add-the-console) provides; without the Console connected, the deploy stops and
asks for a custom domain.

Functions attach with an `ApplicationLoadBalancerIntegration` event. Containers use an `application-load-balancer`
event with a `containerPort`, or a [web service](/resources/compute/web-service) creates its own load balancer.

## Routing

Each integration has a `priority` and conditions. Rules are checked from the lowest priority up, and the first match
wins:

| Condition | Example | Matches |
|---|---|---|
| `paths` | `['/api/*', '/health']` | URL path, with `*` and `?` wildcards, case-sensitive |
| `methods` | `['GET', 'POST']` | HTTP method |
| `hosts` | `['api.example.com', '*.myapp.com']` | `Host` header, with wildcards |
| `headers` | `[{ headerName: 'X-Tenant', values: ['acme'] }]` | Header value |
| `queryParams` | `[{ paramName: 'version', values: ['v2'] }]` | Query parameter value |
| `sourceIps` | `['10.0.0.0/8']` | Client IP range |

All conditions of one integration must match; any value in a list matches. Leave gaps between priorities (10, 20,
30) so you can add rules later. See [HTTP triggers](/resources/triggers/http-triggers) for the integration options.

### Several services behind one load balancer


Example (TypeScript):

```typescript
import {
  defineConfig,
  ApplicationLoadBalancer,
  LambdaFunction,
  ApplicationLoadBalancerIntegration,
  JsBundleLambdaPackaging
} from 'stacktape';
export default defineConfig(() => {
  const myAlb = new ApplicationLoadBalancer({});

  const usersApi = new LambdaFunction({
    packaging: new JsBundleLambdaPackaging({
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
    packaging: new JsBundleLambdaPackaging({
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


`/users/123` goes to `usersApi` (priority 10) and `/orders/456` to `ordersApi` (priority 20).

## Listeners

Set `listeners` to change ports, allow only some IP addresses or redirect unmatched requests. Each listener needs a
`protocol` (`HTTP` or `HTTPS`) and a `port`. An HTTPS listener uses the certificates of `customDomains`, or the ACM
certificates in its `customCertificateArns`.


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


`whitelistIps` rejects requests from other addresses at the load balancer. `defaultAction` redirects requests that
match no rule, with `HTTP_301` or `HTTP_302`, and can reuse parts of the URL with `#{protocol}`, `#{host}`, `#{port}`,
`#{path}` and `#{query}`.

## Custom domains


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


Each domain needs an issued certificate in the stack's region; [Custom domains](/resources/networking/custom-domains)
covers the setup and DNS hosted elsewhere. The object form takes the certificate and DNS options; the plain list of
names (`['api.example.com']`) also works.

## CDN

`cdn.enabled: true` puts CloudFront in front of the load balancer. It helps with cacheable public content and users far
from your region; for personalized responses it only adds cost. With custom listeners, `listenerPort` tells CloudFront
which one to use. See [CDN](/resources/networking/cdn) for cache rules.


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


## Firewall

`useFirewall` names a [web application firewall](/resources/security/web-application-firewall) resource with
`scope: 'regional'` and attaches it to the load balancer.


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


With a CDN in front, attach the firewall to the CDN instead (`cdn.useFirewall`, a firewall with `cdn` scope), so bad
requests stop at CloudFront.

## Internal load balancer

`interface: 'internal'` makes the load balancer reachable only from inside the VPC, for HTTP services your other
services call.


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


## WebSockets and health checks

The load balancer keeps WebSocket connections open after the HTTP upgrade, which suits Socket.IO or `ws` servers in
containers. For WebSocket routes on Lambda, use a [WebSocket API Gateway](/resources/networking/websocket-api-gateway).

Health checks belong to the targets: set them on the [web service](/resources/compute/web-service#health-checks) or
container workload behind the load balancer.

## Alarms

Load balancer alarms use the `application-load-balancer-error-rate` (share of 4xx and 5xx responses),
`application-load-balancer-unhealthy-targets` and `application-load-balancer-custom` triggers.


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


The unhealthy-targets alarm fires when any target group passes the threshold; `onlyIncludeTargets` narrows it to some
services. See [Alarms](/observability/alarms) for `evaluation` settings, comparison operators and channels.

## Configuration reference


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


## Referenceable parameters


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


## Next steps

- [Web service](/resources/compute/web-service): put containers behind the load balancer.
- [Gradual deployments](/deployment-and-lifecycle/gradual-deployments): shift traffic to a new release step by step.
- [Web application firewall](/resources/security/web-application-firewall): block malicious requests.
