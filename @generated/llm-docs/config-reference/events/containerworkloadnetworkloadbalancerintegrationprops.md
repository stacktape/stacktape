# ContainerWorkloadNetworkLoadBalancerIntegrationProps API Reference

## TypeScript definition

```typescript
type ContainerWorkloadNetworkLoadBalancerIntegrationProps = {
  /** The container port that will receive traffic from the load balancer. */
  containerPort: number;
  /** The port of the listener that will forward traffic to this integration. */
  listenerPort: number;
  /** The name of the Network Load Balancer. */
  loadBalancerName: string;
};
```

## Property: `containerPort`

- Required: yes
- Type: `number`

The container port that will receive traffic from the load balancer.

### Example 1 (yaml)

```yaml
resources:
  tcpNlb:
    type: network-load-balancer
    properties:
      listeners:
        - port: 5432
          protocol: TCP
  proxyWorkload:
    type: multi-container-workload
    properties:
      resources:
        cpu: 0.25
        memory: 512
      containers:
        - name: proxy
          packaging:
            type: prebuilt-image
            properties:
              image: 'my-org/tcp-proxy:latest'
          events:
            - type: network-load-balancer
              properties:
                loadBalancerName: tcpNlb
                listenerPort: 5432
                containerPort: 5432
```

### Example 2 (typescript)

```typescript
import { MultiContainerWorkload, NetworkLoadBalancer, defineConfig } from 'stacktape';
export default defineConfig(() => {
  const tcpNlb = new NetworkLoadBalancer({ listeners: [{ port: 5432, protocol: 'TCP' }] });
  const proxyWorkload = new MultiContainerWorkload({
    resources: { cpu: 0.25, memory: 512 },
    containers: [
      {
        name: 'proxy',
        packaging: { type: 'prebuilt-image', properties: { image: 'my-org/tcp-proxy:latest' } },
        events: [
          {
            type: 'network-load-balancer',
            properties: {
              loadBalancerName: 'tcpNlb',
              listenerPort: 5432,
              containerPort: 5432
            }
          }
        ]
      }
    ]
  });
  return { resources: { tcpNlb, proxyWorkload } };
});
```

## Property: `listenerPort`

- Required: yes
- Type: `number`

The port of the listener that will forward traffic to this integration.

### Example 1 (yaml)

```yaml
resources:
  tcpNlb:
    type: network-load-balancer
    properties:
      listeners:
        - port: 5432
          protocol: TCP
  proxyWorkload:
    type: multi-container-workload
    properties:
      resources:
        cpu: 0.25
        memory: 512
      containers:
        - name: proxy
          packaging:
            type: prebuilt-image
            properties:
              image: 'my-org/tcp-proxy:latest'
          events:
            - type: network-load-balancer
              properties:
                loadBalancerName: tcpNlb
                listenerPort: 5432
                containerPort: 5432
```

### Example 2 (typescript)

```typescript
import { MultiContainerWorkload, NetworkLoadBalancer, defineConfig } from 'stacktape';
export default defineConfig(() => {
  const tcpNlb = new NetworkLoadBalancer({ listeners: [{ port: 5432, protocol: 'TCP' }] });
  const proxyWorkload = new MultiContainerWorkload({
    resources: { cpu: 0.25, memory: 512 },
    containers: [
      {
        name: 'proxy',
        packaging: { type: 'prebuilt-image', properties: { image: 'my-org/tcp-proxy:latest' } },
        events: [
          {
            type: 'network-load-balancer',
            properties: {
              loadBalancerName: 'tcpNlb',
              listenerPort: 5432,
              containerPort: 5432
            }
          }
        ]
      }
    ]
  });
  return { resources: { tcpNlb, proxyWorkload } };
});
```

## Property: `loadBalancerName`

- Required: yes
- Type: `string`

The name of the Network Load Balancer.

This must reference a load balancer defined in your Stacktape configuration.

### Example 1 (yaml)

```yaml
resources:
  tcpNlb:
    type: network-load-balancer
    properties:
      listeners:
        - port: 5432
          protocol: TCP
  proxyWorkload:
    type: multi-container-workload
    properties:
      resources:
        cpu: 0.25
        memory: 512
      containers:
        - name: proxy
          packaging:
            type: prebuilt-image
            properties:
              image: 'my-org/tcp-proxy:latest'
          events:
            - type: network-load-balancer
              properties:
                loadBalancerName: tcpNlb
                listenerPort: 5432
                containerPort: 5432
```

### Example 2 (typescript)

```typescript
import { MultiContainerWorkload, NetworkLoadBalancer, defineConfig } from 'stacktape';
export default defineConfig(() => {
  const tcpNlb = new NetworkLoadBalancer({ listeners: [{ port: 5432, protocol: 'TCP' }] });
  const proxyWorkload = new MultiContainerWorkload({
    resources: { cpu: 0.25, memory: 512 },
    containers: [
      {
        name: 'proxy',
        packaging: { type: 'prebuilt-image', properties: { image: 'my-org/tcp-proxy:latest' } },
        events: [
          {
            type: 'network-load-balancer',
            properties: {
              loadBalancerName: 'tcpNlb',
              listenerPort: 5432,
              containerPort: 5432
            }
          }
        ]
      }
    ]
  });
  return { resources: { tcpNlb, proxyWorkload } };
});
```
