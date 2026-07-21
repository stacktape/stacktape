# NetworkLoadBalancerProps API Reference

Resource type: `network-load-balancer`

## TypeScript definition

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

## Property: `listeners`

- Required: yes
- Type: `Array<NetworkLoadBalancerListener>`

Listeners define which ports and protocols (TCP/TLS) this load balancer accepts traffic on.

### Example 1 (yaml)

```yaml
resources:
  multiPortLb:
    type: network-load-balancer
    properties:
      listeners:
        - protocol: TCP
          port: 9000
        - protocol: TCP
          port: 9001

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
            - name: GAME_PORT
              value: 9000
            - name: ADMIN_PORT
              value: 9001
          events:
            - type: network-load-balancer
              properties:
                containerPort: 9000
                loadBalancerName: multiPortLb
                listenerPort: 9000
            - type: network-load-balancer
              properties:
                containerPort: 9001
                loadBalancerName: multiPortLb
                listenerPort: 9001
```

### Example 2 (typescript)

```typescript
import { NetworkLoadBalancer, MultiContainerWorkload, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const multiPortLb = new NetworkLoadBalancer({
    listeners: [
      { protocol: 'TCP', port: 9000 },
      { protocol: 'TCP', port: 9001 }
    ]
  });

  const gameServer = new MultiContainerWorkload({
    resources: { cpu: 0.5, memory: 1024 },
    containers: [
      {
        name: 'game-server',
        packaging: { type: 'stacktape-image-buildpack', properties: { entryfilePath: 'src/server.ts' } },
        environment: { GAME_PORT: 9000, ADMIN_PORT: 9001 },
        events: [
          {
            type: 'network-load-balancer',
            properties: { containerPort: 9000, loadBalancerName: 'multiPortLb', listenerPort: 9000 }
          },
          {
            type: 'network-load-balancer',
            properties: { containerPort: 9001, loadBalancerName: 'multiPortLb', listenerPort: 9001 }
          }
        ]
      }
    ]
  });

  return { resources: { multiPortLb, gameServer } };
});
```

## Property: `customDomains`

- Required: no
- Type: `option-1 | option-2`

Custom domains.

By default, Stacktape creates DNS records and TLS certificates for each domain.
If you manage DNS yourself, set `disableDnsRecordCreation` and provide `customCertificateArn`.

Backward compatible format `string[]` is still supported.

Choices:
- `option-1`
- `option-2`

### Example 1 (yaml)

```yaml
resources:
  secureLb:
    type: network-load-balancer
    properties:
      customDomains:
        - domainName: mqtt.mydomain.com
        - domainName: legacy.mydomain.com
          disableDnsRecordCreation: true
      listeners:
        - protocol: TLS
          port: 8883

  mqttBroker:
    type: multi-container-workload
    properties:
      resources:
        cpu: 0.5
        memory: 1024
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
                loadBalancerName: secureLb
                listenerPort: 8883
```

### Example 2 (typescript)

```typescript
import { NetworkLoadBalancer, MultiContainerWorkload, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const secureLb = new NetworkLoadBalancer({
    customDomains: [
      { domainName: 'mqtt.mydomain.com' },
      { domainName: 'legacy.mydomain.com', disableDnsRecordCreation: true }
    ],
    listeners: [{ protocol: 'TLS', port: 8883 }]
  });

  const mqttBroker = new MultiContainerWorkload({
    resources: { cpu: 0.5, memory: 1024 },
    containers: [
      {
        name: 'broker',
        packaging: { type: 'stacktape-image-buildpack', properties: { entryfilePath: 'src/broker.ts' } },
        environment: { PORT: 8883 },
        events: [
          {
            type: 'network-load-balancer',
            properties: { containerPort: 8883, loadBalancerName: 'secureLb', listenerPort: 8883 }
          }
        ]
      }
    ]
  });

  return { resources: { secureLb, mqttBroker } };
});
```

## Property: `interface`

- Required: no
- Type: `string: "internal" | "internet"`
- Default: `internet`

`internet` (public) or `internal` (VPC-only).

### Example 1 (yaml)

```yaml
resources:
  internalMqttLb:
    type: network-load-balancer
    properties:
      interface: internal
      listeners:
        - protocol: TCP
          port: 1883

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
              value: 1883
          events:
            - type: network-load-balancer
              properties:
                containerPort: 1883
                loadBalancerName: internalMqttLb
                listenerPort: 1883
```

### Example 2 (typescript)

```typescript
import { NetworkLoadBalancer, MultiContainerWorkload, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const internalMqttLb = new NetworkLoadBalancer({
    interface: 'internal',
    listeners: [{ protocol: 'TCP', port: 1883 }]
  });

  const mqttBroker = new MultiContainerWorkload({
    resources: { cpu: 0.25, memory: 512 },
    containers: [
      {
        name: 'broker',
        packaging: { type: 'stacktape-image-buildpack', properties: { entryfilePath: 'src/broker.ts' } },
        environment: { PORT: 1883 },
        events: [
          {
            type: 'network-load-balancer',
            properties: { containerPort: 1883, loadBalancerName: 'internalMqttLb', listenerPort: 1883 }
          }
        ]
      }
    ]
  });

  return { resources: { internalMqttLb, mqttBroker } };
});
```
