# CdnLoadBalancerOrigin API Reference

Resource type: `cdn`

## TypeScript definition

```typescript
type CdnLoadBalancerOrigin = {
  /** Name of the application-load-balancer resource to route to. */
  loadBalancerName: string;
  /** Listener port on the load balancer. Only needed if using custom listeners. */
  listenerPort?: number;
  /** Explicit origin domain. Only needed if the ALB has no customDomains and uses customCertificateArns. */
  originDomainName?: string;
};
```

## Property: `loadBalancerName`

- Required: yes
- Type: `string`

Name of the `application-load-balancer` resource to route to.

### Example 1 (yaml)

```yaml
resources:
api:
  type: http-api-gateway
  properties:
    cdn:
      enabled: true
      routeRewrites:
        - path: /app/*
          routeTo:
            type: application-load-balancer
            properties:
              loadBalancerName: appLb
appLb:
  type: application-load-balancer
```

### Example 2 (typescript)

```typescript
import { ApplicationLoadBalancer, HttpApiGateway, defineConfig } from 'stacktape';

export default defineConfig(() => {
const appLb = new ApplicationLoadBalancer({});
const api = new HttpApiGateway({
  cdn: {
    enabled: true,
    routeRewrites: [
      {
        path: '/app/*',
        routeTo: {
          type: 'application-load-balancer',
          properties: {
            loadBalancerName: 'appLb'
          }
        }
      }
    ]
  }
});
return { resources: { appLb, api } };
});
```

## Property: `listenerPort`

- Required: no
- Type: `number`

Listener port on the load balancer. Only needed if using custom listeners.

### Example 1 (yaml)

```yaml
resources:
api:
  type: http-api-gateway
  properties:
    cdn:
      enabled: true
      routeRewrites:
        - path: /app/*
          routeTo:
            type: application-load-balancer
            properties:
              loadBalancerName: appLb
              listenerPort: 8080
appLb:
  type: application-load-balancer
  properties:
    listeners:
      - port: 8080
        protocol: HTTP
```

### Example 2 (typescript)

```typescript
import { ApplicationLoadBalancer, HttpApiGateway, defineConfig } from 'stacktape';

export default defineConfig(() => {
const appLb = new ApplicationLoadBalancer({
  listeners: [{ port: 8080, protocol: 'HTTP' }]
});
const api = new HttpApiGateway({
  cdn: {
    enabled: true,
    routeRewrites: [
      {
        path: '/app/*',
        routeTo: {
          type: 'application-load-balancer',
          properties: {
            loadBalancerName: 'appLb',
            listenerPort: 8080
          }
        }
      }
    ]
  }
});
return { resources: { appLb, api } };
});
```

## Property: `originDomainName`

- Required: no
- Type: `string`

Explicit origin domain. Only needed if the ALB has no `customDomains` and uses `customCertificateArns`.

### Example 1 (yaml)

```yaml
resources:
api:
  type: http-api-gateway
  properties:
    cdn:
      enabled: true
      routeRewrites:
        - path: /app/*
          routeTo:
            type: application-load-balancer
            properties:
              loadBalancerName: appLb
              originDomainName: app.internal.example.com
appLb:
  type: application-load-balancer
```

### Example 2 (typescript)

```typescript
import { ApplicationLoadBalancer, HttpApiGateway, defineConfig } from 'stacktape';

export default defineConfig(() => {
const appLb = new ApplicationLoadBalancer({});
const api = new HttpApiGateway({
  cdn: {
    enabled: true,
    routeRewrites: [
      {
        path: '/app/*',
        routeTo: {
          type: 'application-load-balancer',
          properties: {
            loadBalancerName: 'appLb',
            originDomainName: 'app.internal.example.com'
          }
        }
      }
    ]
  }
});
return { resources: { appLb, api } };
});
```
