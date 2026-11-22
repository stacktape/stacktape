# Network Load Balancer

A Network Load Balancer (AWS NLB) accepts TCP or TLS connections on the ports you list and passes them to container
workloads, without looking at HTTP. Use it for MQTT brokers, game servers, database proxies, gRPC with your own TLS or
any other non-HTTP protocol.

It costs $0.0225 an hour (about $16 a month in us-east-1) even with no traffic, plus $0.006 per capacity unit-hour as
connections and traffic grow ([Elastic Load Balancing pricing](https://aws.amazon.com/elasticloadbalancing/pricing/)).
For HTTP, an [Application Load Balancer](/resources/networking/application-load-balancer) routes by path and host and
takes a CDN and a firewall, which a Network Load Balancer can't.

## Basic example

A Network Load Balancer needs at least one listener; there is no default.


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


This load balancer is reachable from the internet (`interface: 'internet'` is the default) and accepts TCP on port
5432. A container receives the connections with a `network-load-balancer` event that names the load balancer
(`loadBalancerName`), the listener (`listenerPort`) and its own port (`containerPort`). A
[web service](/resources/compute/web-service) with `loadBalancing.type: 'network-load-balancer'` creates its own.

## Listeners

Each listener has a `protocol` and a `port`:

- **TCP** passes connections through as they are. Use it when your app handles TLS itself, including mutual TLS or
  when it needs the client certificate.
- **TLS** decrypts at the load balancer and passes plain traffic to the container, so your app needs no certificate.
  The certificate comes from `customDomains` or from the listener's `customCertificateArns`.


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


This load balancer takes plain MQTT on 1883 and MQTT over TLS on 8883. Each listener can have its own certificates and
IP allowlist.

Without `customDomains`, give a TLS listener your own ACM certificate:


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


A TLS listener with neither gets a `*.stacktape-app.com` domain from the
[Stacktape Console](/getting-started/add-the-console); without the Console connected, the deploy stops and asks for a
domain or certificate.

## Custom domains

[Set up the domain](/resources/networking/custom-domains#set-up-the-domain) with `stacktape domain add`, then list it.
The deploy uses the issued certificate for the TLS listeners and creates the DNS record.


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


To keep DNS at another provider, set `disableDnsRecordCreation: true` and `customCertificateArn`; see
[External DNS](/resources/networking/custom-domains#external-dns).

## Access control

### Internet vs internal

`interface: 'internal'` makes the load balancer reachable only from inside the VPC, for example for an internal gRPC
service.


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


### IP whitelisting

`whitelistIps` on a listener accepts connections only from the listed addresses and ranges. Each listener has its own
list.


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


A Network Load Balancer can't take a [firewall](/resources/security/web-application-firewall), so this allowlist is
the only filter at the load balancer. For rate limits or geo-blocking, use an Application Load Balancer.

## Configuration reference


### Definition: `NetworkLoadBalancerProps`

The complete property-level reference is included in `llms-api-reference.txt` and indexed under route `/config-reference/network-load-balancer` with definition name `NetworkLoadBalancerProps`.

| Property | Required | Type | Default |
| --- | --- | --- | --- |
| `listeners` | yes | `Array<NetworkLoadBalancerListener>` | - |
| `customDomains` | no | `option-1 \| option-2` | - |
| `interface` | no | `string: "internal" \| "internet"` | `internet` |


## Referenceable parameters


## Referenceable Parameters: `network-load-balancer`
These values can be referenced with `$ResourceParam("<<resource-name>>", "<<parameter-name>>")`.

| Parameter | Description | Usage |
| --- | --- | --- |
| `domain` | default domain name of load balancer | `$ResourceParam("<<resource-name>>", "domain")` |
| `customDomains` | Comma-separated list of custom domain names assigned to the Load balancer (only available if you use [custom domain names](/resources/networking/custom-domains/)) | `$ResourceParam("<<resource-name>>", "customDomains")` |
