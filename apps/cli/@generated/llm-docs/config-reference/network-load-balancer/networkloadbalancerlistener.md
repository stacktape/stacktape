# NetworkLoadBalancerListener API Reference

Resource type: `network-load-balancer`

## TypeScript definition

```typescript
type NetworkLoadBalancerListener = {
  /** Port this listener accepts traffic on. */
  port: number;
  /** TCP (raw) or TLS (encrypted). TLS requires a certificate (auto-created with customDomains or via customCertificateArns). */
  protocol: "TCP" | "TLS";
  /** ARNs of your own ACM certificates. Not needed if using customDomains or TCP protocol. */
  customCertificateArns?: Array<string>;
  /** Restrict access to specific IP addresses/CIDRs. Default: all IPs allowed. */
  whitelistIps?: Array<string>;
};
```

## Property: `port`

- Required: yes
- Type: `number`

Port this listener accepts traffic on.

### Example 1 (yaml)

```yaml
resources:
  tcpLb:
    type: network-load-balancer
    properties:
      listeners:
        - protocol: TCP
          port: 7777

  gameServer:
    type: multi-container-workload
    properties:
      resources:
        cpu: 0.5
        memory: 1024
      containers:
        - name: game-server
          packaging:
            type: stacktape-image-buildpack
            properties:
              entryfilePath: src/server.ts
          environment:
            - name: PORT
              value: 7777
          events:
            - type: network-load-balancer
              properties:
                containerPort: 7777
                loadBalancerName: tcpLb
                listenerPort: 7777
```

### Example 2 (typescript)

```typescript
import { NetworkLoadBalancer, MultiContainerWorkload, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const tcpLb = new NetworkLoadBalancer({
    listeners: [
      {
        protocol: 'TCP',
        port: 7777
      }
    ]
  });

  const gameServer = new MultiContainerWorkload({
    resources: { cpu: 0.5, memory: 1024 },
    containers: [
      {
        name: 'game-server',
        packaging: { type: 'stacktape-image-buildpack', properties: { entryfilePath: 'src/server.ts' } },
        environment: { PORT: 7777 },
        events: [
          {
            type: 'network-load-balancer',
            properties: { containerPort: 7777, loadBalancerName: 'tcpLb', listenerPort: 7777 }
          }
        ]
      }
    ]
  });

  return { resources: { tcpLb, gameServer } };
});
```

## Property: `protocol`

- Required: yes
- Type: `string: "TCP" | "TLS"`

`TCP` (raw) or `TLS` (encrypted). TLS requires a certificate (auto-created with `customDomains` or via `customCertificateArns`).

### Example 1 (yaml)

```yaml
resources:
  tlsLb:
    type: network-load-balancer
    properties:
      customDomains:
        - domainName: mqtt.mydomain.com
      listeners:
        - protocol: TLS
          port: 8883

  mqttBroker:
    type: multi-container-workload
    properties:
      resources:
        cpu: 0.25
        memory: 512
      containers:
        - name: broker
          packaging:
            type: stacktape-image-buildpack
            properties:
              entryfilePath: src/broker.ts
          environment:
            - name: PORT
              value: 8883
          events:
            - type: network-load-balancer
              properties:
                containerPort: 8883
                loadBalancerName: tlsLb
                listenerPort: 8883
```

### Example 2 (typescript)

```typescript
import { NetworkLoadBalancer, MultiContainerWorkload, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const tlsLb = new NetworkLoadBalancer({
    customDomains: [{ domainName: 'mqtt.mydomain.com' }],
    listeners: [
      { protocol: 'TLS', port: 8883 }
    ]
  });

  const mqttBroker = new MultiContainerWorkload({
    resources: { cpu: 0.25, memory: 512 },
    containers: [
      {
        name: 'broker',
        packaging: { type: 'stacktape-image-buildpack', properties: { entryfilePath: 'src/broker.ts' } },
        environment: { PORT: 8883 },
        events: [
          {
            type: 'network-load-balancer',
            properties: { containerPort: 8883, loadBalancerName: 'tlsLb', listenerPort: 8883 }
          }
        ]
      }
    ]
  });

  return { resources: { tlsLb, mqttBroker } };
});
```

## Property: `customCertificateArns`

- Required: no
- Type: `Array<string>`

ARNs of your own ACM certificates. Not needed if using `customDomains` or TCP protocol.

### Example 1 (yaml)

```yaml
resources:
  byoCertLb:
    type: network-load-balancer
    properties:
      listeners:
        - protocol: TLS
          port: 8883
          customCertificateArns:
            - arn:aws:acm:eu-west-1:123456789012:certificate/2b8f1c3e-4a5d-6e7f-8a9b-0c1d2e3f4a5b

  mqttBroker:
    type: multi-container-workload
    properties:
      resources:
        cpu: 0.25
        memory: 512
      containers:
        - name: broker
          packaging:
            type: stacktape-image-buildpack
            properties:
              entryfilePath: src/broker.ts
          environment:
            - name: PORT
              value: 8883
          events:
            - type: network-load-balancer
              properties:
                containerPort: 8883
                loadBalancerName: byoCertLb
                listenerPort: 8883
```

### Example 2 (typescript)

```typescript
import { NetworkLoadBalancer, MultiContainerWorkload, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const byoCertLb = new NetworkLoadBalancer({
    listeners: [
      {
        protocol: 'TLS',
        port: 8883,
        customCertificateArns: [
          'arn:aws:acm:eu-west-1:123456789012:certificate/2b8f1c3e-4a5d-6e7f-8a9b-0c1d2e3f4a5b'
        ]
      }
    ]
  });

  const mqttBroker = new MultiContainerWorkload({
    resources: { cpu: 0.25, memory: 512 },
    containers: [
      {
        name: 'broker',
        packaging: { type: 'stacktape-image-buildpack', properties: { entryfilePath: 'src/broker.ts' } },
        environment: { PORT: 8883 },
        events: [
          {
            type: 'network-load-balancer',
            properties: { containerPort: 8883, loadBalancerName: 'byoCertLb', listenerPort: 8883 }
          }
        ]
      }
    ]
  });

  return { resources: { byoCertLb, mqttBroker } };
});
```

## Property: `whitelistIps`

- Required: no
- Type: `Array<string>`

Restrict access to specific IP addresses/CIDRs. Default: all IPs allowed.

### Example 1 (yaml)

```yaml
resources:
  restrictedLb:
    type: network-load-balancer
    properties:
      listeners:
        - protocol: TCP
          port: 5432
          whitelistIps:
            - 203.0.113.0/24
            - 198.51.100.42/32

  tcpProxy:
    type: multi-container-workload
    properties:
      resources:
        cpu: 0.25
        memory: 512
      containers:
        - name: proxy
          packaging:
            type: stacktape-image-buildpack
            properties:
              entryfilePath: src/proxy.ts
          environment:
            - name: PORT
              value: 5432
          events:
            - type: network-load-balancer
              properties:
                containerPort: 5432
                loadBalancerName: restrictedLb
                listenerPort: 5432
```

### Example 2 (typescript)

```typescript
import { NetworkLoadBalancer, MultiContainerWorkload, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const restrictedLb = new NetworkLoadBalancer({
    listeners: [
      {
        protocol: 'TCP',
        port: 5432,
        whitelistIps: ['203.0.113.0/24', '198.51.100.42/32']
      }
    ]
  });

  const tcpProxy = new MultiContainerWorkload({
    resources: { cpu: 0.25, memory: 512 },
    containers: [
      {
        name: 'proxy',
        packaging: { type: 'stacktape-image-buildpack', properties: { entryfilePath: 'src/proxy.ts' } },
        environment: { PORT: 5432 },
        events: [
          {
            type: 'network-load-balancer',
            properties: { containerPort: 5432, loadBalancerName: 'restrictedLb', listenerPort: 5432 }
          }
        ]
      }
    ]
  });

  return { resources: { restrictedLb, tcpProxy } };
});
```
