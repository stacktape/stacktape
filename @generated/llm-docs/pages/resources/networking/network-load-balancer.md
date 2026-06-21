# Network Load Balancer

A Stacktape Network Load Balancer creates a managed TCP/TLS entry point that routes connections to container workloads at the transport layer (Layer 4). It uses AWS Network Load Balancer — ultra-low latency, millions of concurrent connections, and no HTTP-level processing overhead. Use it for non-HTTP protocols like MQTT, gRPC, database proxies, or game servers.

## When to use

Network Load Balancer is the right choice when your workload speaks a non-HTTP protocol or when you need raw TCP/TLS pass-through without HTTP-level processing. AWS NLB forwards connections directly to your containers with minimal latency overhead.

Common patterns that fit well:

- **MQTT brokers** — IoT devices connecting over TCP or TLS on port 8883
- **Game servers** — multiplayer backends using custom binary protocols over TCP
- **gRPC services** — use a TCP listener for application-side TLS termination, or a TLS listener when you want the load balancer to handle certificates via ACM
- **Database proxies** — exposing a proxy like PgBouncer or ProxySQL behind a load balancer
- **Custom TCP protocols** — any service that doesn't use HTTP (message brokers, streaming protocols, proprietary wire protocols)

## When NOT to use

- **HTTP/HTTPS APIs or web apps** — use an [Application Load Balancer](/resources/networking/application-load-balancer) for HTTP-aware routing by paths, hosts, headers, query params, and source IPs. For Lambda-backed HTTP APIs, use an [HTTP API Gateway](/resources/networking/http-api-gateway) with method and path routing.
- **Serverless APIs** — use an [HTTP API Gateway](/resources/networking/http-api-gateway) for Lambda-backed APIs with pay-per-request pricing.
- **Content-based routing** — NLB routes by port and IP, not by HTTP path, headers, or query parameters. If you need path-based routing, use an [Application Load Balancer](/resources/networking/application-load-balancer).
- **CDN, WAF, or gradual deployments** — NLB does not support attaching a [CDN](/resources/networking/cdn), [web application firewall](/resources/security/web-application-firewall), or gradual deployment strategies. Use an [Application Load Balancer](/resources/networking/application-load-balancer) for workloads that need any of these.


## Feature Comparison

| Feature | Network Load Balancer | Application Load Balancer |
| --- | --- | --- |
| OSI layer | Layer 4 (TCP/TLS) | Layer 7 (HTTP/HTTPS) |
| Best for | Non-HTTP protocols | HTTP APIs and web apps |
| Routing | Port-based only | Path, host, headers, query params, source IPs |
| TLS termination | Optional (TLS listeners) | Always (HTTPS) |
| CDN support | no | yes |
| Firewall (WAF) | no | yes |
| Latency | Ultra-low (no HTTP parsing) | Low (HTTP processing) |


## Basic example

A Network Load Balancer defines one or more listeners that accept TCP or TLS connections on specific ports. Container workloads then register themselves as targets by declaring a `network-load-balancer` integration in their `events` array, specifying which listener port to bind to and which container port receives the traffic.


Example (TypeScript):

```typescript
import { defineConfig, NetworkLoadBalancer } from 'stacktape';
export default defineConfig(() => {
  const tcpLb = new NetworkLoadBalancer({
    listeners: [{ protocol: 'TCP', port: 5432 }]
  });

  return {
    resources: { tcpLb }
  };
});
```


This creates a public-facing NLB with a single TCP listener on port 5432. The `interface` defaults to `internet`, making the load balancer publicly accessible. Container workloads connect to this NLB by adding a `network-load-balancer` integration to their events with `loadBalancerName`, `listenerPort`, and `containerPort`.

## Listeners

Listeners define which ports and protocols the Network Load Balancer accepts traffic on. Each listener specifies a `protocol` (TCP or TLS) and a `port`. You must define at least one listener — there is no default listener created automatically.

**TCP listeners** forward raw TCP connections with no encryption at the load balancer level. Use TCP when your application handles its own encryption, or when the traffic is on a private network and TLS overhead is unnecessary.

**TLS listeners** terminate TLS at the load balancer and forward decrypted traffic to the container. This offloads certificate management from your application. TLS requires a certificate — either auto-provisioned through `customDomains` on the NLB, or explicitly provided via `customCertificateArns` on the listener.

**Choosing between TCP and TLS:** TCP is simpler and avoids double-encryption if your application already terminates TLS. TLS at the NLB offloads certificate management and works well when the backend doesn't need to inspect the TLS handshake. For mutual TLS (mTLS) or when the application needs access to client certificates, use TCP and terminate TLS inside the container.


Example (TypeScript):

```typescript
import { defineConfig, NetworkLoadBalancer } from 'stacktape';
export default defineConfig(() => {
  const mqttBroker = new NetworkLoadBalancer({
    customDomains: [{ domainName: 'mqtt.example.com' }],
    listeners: [
      { protocol: 'TCP', port: 1883 },
      { protocol: 'TLS', port: 8883 }
    ]
  });

  return {
    resources: { mqttBroker }
  };
});
```


This NLB exposes two listeners — unencrypted MQTT on port 1883 and TLS-encrypted MQTT on port 8883. TLS listeners require a certificate; Stacktape can create one from `customDomains`, or you can provide `customCertificateArns` on the listener. A single NLB can have multiple listeners, each on a different port with its own protocol, certificates, and IP restrictions.

If you don't use `customDomains` but still need TLS, provide `customCertificateArns` on the listener with the ARN of an ACM certificate from your AWS account:


Example (TypeScript):

```typescript
import { defineConfig, NetworkLoadBalancer } from 'stacktape';
export default defineConfig(() => {
  const grpcLb = new NetworkLoadBalancer({
    listeners: [
      {
        protocol: 'TLS',
        port: 443,
        customCertificateArns: ['arn:aws:acm:us-east-1:123456789:certificate/abc-123']
      }
    ]
  });

  return {
    resources: { grpcLb }
  };
});
```


> **Tip:** Use `customDomains` for Stacktape-managed certificates, or `customCertificateArns` on the listener when you want to attach your own ACM certificate.


## Custom domains

Stacktape can attach your own domain (e.g., `mqtt.example.com`) to a Network Load Balancer. Stacktape automatically provisions a free TLS certificate and creates a DNS record in Route53. Your domain must have a [Route53 hosted zone](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/hosted-zones-working-with.html) in your AWS account — use [`stacktape domain:add`](/cli/domain-add) to set one up.


Example (TypeScript):

```typescript
import { defineConfig, NetworkLoadBalancer } from 'stacktape';
export default defineConfig(() => {
  const tcpLb = new NetworkLoadBalancer({
    customDomains: [{ domainName: 'tcp.example.com' }, { domainName: 'mqtt.example.com' }],
    listeners: [{ protocol: 'TLS', port: 8883 }]
  });

  return {
    resources: { tcpLb }
  };
});
```


You can attach multiple domains to a single NLB. Each domain gets its own TLS certificate, managed and auto-renewed by AWS. Custom domains are particularly useful with TLS listeners because TLS requires a certificate, and Stacktape can create that certificate from `customDomains`.

By default, Stacktape creates DNS records and TLS certificates for each domain. If you manage DNS yourself (e.g., through Cloudflare or another DNS provider), set `disableDnsRecordCreation: true` and provide `customCertificateArn` with an ACM certificate ARN.

For full details on domain management, see [Custom domains](/resources/networking/custom-domains).

## Access control

### Internet vs internal

The `interface` property controls whether the NLB is publicly accessible or reachable only from within your VPC. The default is `internet` (publicly accessible).

**When to use `internal`:** Set `interface` to `internal` when the NLB should only be reachable from other resources within the same VPC — for example, an internal gRPC service that other container workloads call but that should never be exposed to the public internet.

**When `internet` (default) is fine:** Most NLBs that serve external clients (IoT devices, game clients, third-party integrations) need to be internet-facing.


Example (TypeScript):

```typescript
import { defineConfig, NetworkLoadBalancer } from 'stacktape';
export default defineConfig(() => {
  const internalLb = new NetworkLoadBalancer({
    interface: 'internal',
    listeners: [{ protocol: 'TCP', port: 50051 }]
  });

  return {
    resources: { internalLb }
  };
});
```


Setting `interface: 'internal'` makes the Network Load Balancer VPC-only — it is unreachable from outside the VPC. The default `interface: 'internet'` makes it publicly accessible.

### IP whitelisting

Each listener can restrict access to specific IP addresses or CIDR ranges using `whitelistIps`. When `whitelistIps` is set, access is restricted to the listed IP addresses or CIDR ranges. By default (when `whitelistIps` is not set), all IPs are allowed.


Example (TypeScript):

```typescript
import { defineConfig, NetworkLoadBalancer } from 'stacktape';
export default defineConfig(() => {
  const dbProxy = new NetworkLoadBalancer({
    listeners: [
      {
        protocol: 'TCP',
        port: 5432,
        whitelistIps: ['203.0.113.0/24', '198.51.100.42/32']
      }
    ]
  });

  return {
    resources: { dbProxy }
  };
});
```


IP whitelisting is configured per listener, so different ports can have different IP restrictions on the same NLB. Use CIDR notation — `/32` for a single IP address, `/24` for a 256-address range. This is useful for restricting access to known office IPs, partner networks, or other trusted sources.


> **Info:** NLB does not support attaching a [web application firewall](/resources/security/web-application-firewall). IP whitelisting on listeners is the primary mechanism for restricting access at the load balancer level. For more advanced filtering (rate limiting, geo-blocking, bot protection), place your workload behind an [Application Load Balancer](/resources/networking/application-load-balancer) instead.


## Referenceable parameters


## Referenceable Parameters: `network-load-balancer`
These values can be referenced with `$ResourceParam("<<resource-name>>", "<<parameter-name>>")`.

| Parameter | Description | Usage |
| --- | --- | --- |
| `domain` | default domain name of load balancer | `$ResourceParam("<<resource-name>>", "domain")` |
| `customDomains` | Comma-separated list of custom domain names assigned to the Load balancer (only available if you use [custom domain names](#custom-domain-names)) | `$ResourceParam("<<resource-name>>", "customDomains")` |


## API Reference


## API Reference: `NetworkLoadBalancerProps`
```typescript
import type { NetworkLoadBalancerListener } from 'stacktape';

type NetworkLoadBalancerProps = {
  /** Listeners define which ports and protocols (TCP/TLS) this load balancer accepts traffic on. */
  listeners: Array<NetworkLoadBalancerListener>;
  /** Custom domains. */
  customDomains?: NetworkLoadBalancerCustomDomains;
  /** internet (public) or internal (VPC-only). */
  interface?: "internal" | "internet";
};

/** Union choices used by the properties above. */
type NetworkLoadBalancerCustomDomains =
  | "option-1"
  | "option-2";
```

| Property | Required | Type | Description | Default |
| --- | --- | --- | --- | --- |
| `listeners` | yes | `Array<NetworkLoadBalancerListener>` | Listeners define which ports and protocols (TCP/TLS) this load balancer accepts traffic on. | - |
| `customDomains` | no | `option-1 \| option-2` | Custom domains. By default, Stacktape creates DNS records and TLS certificates for each domain.
If you manage DNS yourself, set `disableDnsRecordCreation` and provide `customCertificateArn`.

Backward compatible format `string[]` is still supported. | - |
| `interface` | no | `string: "internal" \| "internet"` | `internet` (public) or `internal` (VPC-only). | `internet` |


## FAQ

### What protocols does a Stacktape Network Load Balancer support?

A Stacktape Network Load Balancer supports TCP and TLS protocols. TCP forwards raw connections without encryption. TLS terminates encryption at the load balancer and forwards decrypted traffic to your container. HTTP/HTTPS traffic should use an [Application Load Balancer](/resources/networking/application-load-balancer) or [HTTP API Gateway](/resources/networking/http-api-gateway) instead, as those provide HTTP-aware routing and features.

### How much does AWS Network Load Balancer cost?

AWS NLB pricing has two components: a flat hourly charge (varying by region) and a per-LCU (Load Balancer Capacity Unit) charge based on new connections, active connections, and processed bytes. Unlike [HTTP API Gateway](/resources/networking/http-api-gateway), NLB has an always-on cost even with zero traffic. For low-traffic workloads, consider whether a dedicated load balancer is cost-justified.

### When should I use a Network Load Balancer vs an Application Load Balancer?

Use a Network Load Balancer for non-HTTP protocols (MQTT, gRPC with TLS pass-through, custom TCP protocols, game servers). Use an [Application Load Balancer](/resources/networking/application-load-balancer) for HTTP/HTTPS workloads — it offers path-based routing, host-based routing, header matching, CDN attachment, and WAF integration that NLB does not support. If your workload speaks HTTP, ALB is almost always the better choice.

### Can I use a custom domain with a Network Load Balancer?

Yes. Add a `customDomains` array to the NLB configuration with your domain name. Stacktape provisions a free TLS certificate via ACM and creates a DNS record in Route53 automatically. Your domain must have a Route53 hosted zone — set one up with [`stacktape domain:add`](/cli/domain-add). See [Custom domains](/resources/networking/custom-domains) for full details.

### Does Network Load Balancer support health checks?

The Network Load Balancer resource does not expose health-check settings in its configuration type. For container-level replacement behavior, use the workload health-check settings on the target workload when that workload type exposes them.

### Can I attach a CDN or WAF to a Network Load Balancer?

No. Network Load Balancer does not support [CDN](/resources/networking/cdn) (CloudFront) attachment or [web application firewall](/resources/security/web-application-firewall) (WAF) integration. These features require HTTP-level processing that NLB does not perform. For IP-based access control, use `whitelistIps` on individual listeners. If you need CDN or WAF, use an [Application Load Balancer](/resources/networking/application-load-balancer) instead.

### Can I expose multiple ports on a single Network Load Balancer?

Yes. Define multiple entries in the `listeners` array, each with its own port, protocol, certificate configuration, and IP whitelist. For example, an MQTT broker might expose port 1883 (TCP, unencrypted) and port 8883 (TLS, encrypted) on the same NLB. A target integration chooses the listener by setting `listenerPort`.

### How do container workloads connect to a Network Load Balancer?

Container workloads add a `network-load-balancer` integration (type `network-load-balancer`) to their events array. The integration specifies `loadBalancerName` (the NLB resource name), `listenerPort` (which NLB listener to bind to), and `containerPort` (the port inside the container that receives traffic).

### What is the difference between internet and internal interface?

Setting `interface: 'internet'` (default) makes the NLB publicly accessible from the internet. Setting `interface: 'internal'` makes it reachable only from within the VPC — useful for internal services like gRPC backends or database proxies that other workloads call but should not be publicly exposed. Choose `internal` when the NLB is part of a service-to-service communication layer.

### Does Network Load Balancer support gradual deployments?

No. Network Load Balancer does not support gradual (canary or linear) deployment strategies. For deployment strategies that shift traffic incrementally between old and new versions, use container workloads behind an [Application Load Balancer](/resources/networking/application-load-balancer), which integrates with CodeDeploy for gradual deployments.
