# ApplicationLoadBalancerListener API Reference

Resource type: `application-load-balancer`

## TypeScript definition

```typescript
import type { LbRedirect } from 'stacktape';

type ApplicationLoadBalancerListener = {
  /** Port this listener accepts traffic on (e.g., 443 for HTTPS, 80 for HTTP). */
  port: number;
  /** Listener protocol. HTTPS requires a TLS certificate (auto-created with customDomains or via customCertificateArns). */
  protocol: "HTTP" | "HTTPS";
  /** ARNs of your own ACM certificates. Not needed if using customDomains (Stacktape creates certs automatically). */
  customCertificateArns?: Array<string>;
  /** Action for requests that don&#39;t match any integration. Currently supports redirect only. */
  defaultAction?: LbRedirect;
  /** Restrict access to specific IP addresses/CIDRs. Default: all IPs allowed. */
  whitelistIps?: Array<string>;
};
```

## Property: `port`

- Required: yes
- Type: `number`

Port this listener accepts traffic on (e.g., 443 for HTTPS, 80 for HTTP).

### Example 1 (yaml)

```yaml
resources:
  webLoadBalancer:
    type: application-load-balancer
    properties:
      customDomains:
        - domainName: api.example.com
      listeners:
        - protocol: HTTPS
          port: 8443
  apiFunction:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/index.ts
      events:
        - type: application-load-balancer
          properties:
            loadBalancerName: webLoadBalancer
            listenerPort: 8443
            priority: 1
            paths:
              - /*
```

### Example 2 (typescript)

```typescript
import { ApplicationLoadBalancer, LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const webLoadBalancer = new ApplicationLoadBalancer({
    customDomains: [{ domainName: 'api.example.com' }],
    listeners: [
      {
        protocol: 'HTTPS',
        port: 8443
      }
    ]
  });

  const apiFunction = new LambdaFunction({
    packaging: {
      type: 'stacktape-lambda-buildpack',
      properties: { entryfilePath: 'src/index.ts' }
    },
    events: [
      {
        type: 'application-load-balancer',
        properties: {
          loadBalancerName: 'webLoadBalancer',
          listenerPort: 8443,
          priority: 1,
          paths: ['/*']
        }
      }
    ]
  });

  return { resources: { webLoadBalancer, apiFunction } };
});
```

## Property: `protocol`

- Required: yes
- Type: `string: "HTTP" | "HTTPS"`

Listener protocol. `HTTPS` requires a TLS certificate (auto-created with `customDomains` or via `customCertificateArns`).

### Example 1 (yaml)

```yaml
resources:
  webLoadBalancer:
    type: application-load-balancer
    properties:
      customDomains:
        - domainName: api.example.com
      listeners:
        - protocol: HTTPS
          port: 443
  apiFunction:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/index.ts
      events:
        - type: application-load-balancer
          properties:
            loadBalancerName: webLoadBalancer
            listenerPort: 443
            priority: 1
            paths:
              - /*
```

### Example 2 (typescript)

```typescript
import { ApplicationLoadBalancer, LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const webLoadBalancer = new ApplicationLoadBalancer({
    customDomains: [{ domainName: 'api.example.com' }],
    listeners: [
      { protocol: 'HTTPS', port: 443 }
    ]
  });

  const apiFunction = new LambdaFunction({
    packaging: {
      type: 'stacktape-lambda-buildpack',
      properties: { entryfilePath: 'src/index.ts' }
    },
    events: [
      {
        type: 'application-load-balancer',
        properties: {
          loadBalancerName: 'webLoadBalancer',
          listenerPort: 443,
          priority: 1,
          paths: ['/*']
        }
      }
    ]
  });

  return { resources: { webLoadBalancer, apiFunction } };
});
```

## Property: `customCertificateArns`

- Required: no
- Type: `Array<string>`

ARNs of your own ACM certificates. Not needed if using `customDomains` (Stacktape creates certs automatically).

### Example 1 (yaml)

```yaml
resources:
  webLoadBalancer:
    type: application-load-balancer
    properties:
      listeners:
        - protocol: HTTPS
          port: 443
          customCertificateArns:
            - arn:aws:acm:eu-west-1:123456789012:certificate/abcd1234-5678-90ef-ghij-klmnopqrstuv
  apiFunction:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/index.ts
      events:
        - type: application-load-balancer
          properties:
            loadBalancerName: webLoadBalancer
            listenerPort: 443
            priority: 1
            paths:
              - /*
```

### Example 2 (typescript)

```typescript
import { ApplicationLoadBalancer, LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const webLoadBalancer = new ApplicationLoadBalancer({
    listeners: [
      {
        protocol: 'HTTPS',
        port: 443,
        customCertificateArns: [
          'arn:aws:acm:eu-west-1:123456789012:certificate/abcd1234-5678-90ef-ghij-klmnopqrstuv'
        ]
      }
    ]
  });

  const apiFunction = new LambdaFunction({
    packaging: {
      type: 'stacktape-lambda-buildpack',
      properties: { entryfilePath: 'src/index.ts' }
    },
    events: [
      {
        type: 'application-load-balancer',
        properties: {
          loadBalancerName: 'webLoadBalancer',
          listenerPort: 443,
          priority: 1,
          paths: ['/*']
        }
      }
    ]
  });

  return { resources: { webLoadBalancer, apiFunction } };
});
```

## Property: `defaultAction`

- Required: no
- Type: `LbRedirect`

Action for requests that don't match any integration. Currently supports `redirect` only.

### Example 1 (yaml)

```yaml
resources:
  webLoadBalancer:
    type: application-load-balancer
    properties:
      customDomains:
        - domainName: api.example.com
      listeners:
        - protocol: HTTPS
          port: 443
        - protocol: HTTP
          port: 80
          defaultAction:
            type: redirect
            properties:
              protocol: HTTPS
              port: 443
              statusCode: HTTP_301
  apiFunction:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/index.ts
      events:
        - type: application-load-balancer
          properties:
            loadBalancerName: webLoadBalancer
            listenerPort: 443
            priority: 1
            paths:
              - /*
```

### Example 2 (typescript)

```typescript
import { ApplicationLoadBalancer, LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const webLoadBalancer = new ApplicationLoadBalancer({
    customDomains: [{ domainName: 'api.example.com' }],
    listeners: [
      { protocol: 'HTTPS', port: 443 },
      {
        protocol: 'HTTP',
        port: 80,
        defaultAction: {
          type: 'redirect',
          properties: {
            protocol: 'HTTPS',
            port: 443,
            statusCode: 'HTTP_301'
          }
        }
      }
    ]
  });

  const apiFunction = new LambdaFunction({
    packaging: {
      type: 'stacktape-lambda-buildpack',
      properties: { entryfilePath: 'src/index.ts' }
    },
    events: [
      {
        type: 'application-load-balancer',
        properties: {
          loadBalancerName: 'webLoadBalancer',
          listenerPort: 443,
          priority: 1,
          paths: ['/*']
        }
      }
    ]
  });

  return { resources: { webLoadBalancer, apiFunction } };
});
```

## Property: `whitelistIps`

- Required: no
- Type: `Array<string>`

Restrict access to specific IP addresses/CIDRs. Default: all IPs allowed.

### Example 1 (yaml)

```yaml
resources:
  webLoadBalancer:
    type: application-load-balancer
    properties:
      interface: internal
      listeners:
        - protocol: HTTP
          port: 80
          whitelistIps:
            - 10.0.0.0/8
            - 203.0.113.42/32
  apiFunction:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/index.ts
      events:
        - type: application-load-balancer
          properties:
            loadBalancerName: webLoadBalancer
            listenerPort: 80
            priority: 1
            paths:
              - /*
```

### Example 2 (typescript)

```typescript
import { ApplicationLoadBalancer, LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const webLoadBalancer = new ApplicationLoadBalancer({
    interface: 'internal',
    listeners: [
      {
        protocol: 'HTTP',
        port: 80,
        whitelistIps: ['10.0.0.0/8', '203.0.113.42/32']
      }
    ]
  });

  const apiFunction = new LambdaFunction({
    packaging: {
      type: 'stacktape-lambda-buildpack',
      properties: { entryfilePath: 'src/index.ts' }
    },
    events: [
      {
        type: 'application-load-balancer',
        properties: {
          loadBalancerName: 'webLoadBalancer',
          listenerPort: 80,
          priority: 1,
          paths: ['/*']
        }
      }
    ]
  });

  return { resources: { webLoadBalancer, apiFunction } };
});
```
