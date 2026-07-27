# LbRedirectProperties API Reference

Resource type: `application-load-balancer`

## TypeScript definition

```typescript
type LbRedirectProperties = {
  /** HTTP_301 (permanent) or HTTP_302 (temporary) redirect. */
  statusCode: "HTTP_301" | "HTTP_302";
  /** Redirect hostname. Use #{host} to keep the original. */
  host?: string;
  /** Redirect path (must start with /). Use #{path} to reuse the original path. */
  path?: string;
  /** Redirect port (1-65535). Use #{port} to keep the original. */
  port?: number;
  /** Redirect protocol. Cannot redirect HTTPS to HTTP. */
  protocol?: "HTTP" | "HTTPS";
  /** Query string for the redirect (without leading ?). Use #{query} to preserve the original. */
  query?: string;
};
```

## Property: `statusCode`

- Required: yes
- Type: `string: "HTTP_301" | "HTTP_302"`

`HTTP_301` (permanent) or `HTTP_302` (temporary) redirect.

### Example 1 (yaml)

```yaml
resources:
  webLoadBalancer:
    type: application-load-balancer
    properties:
      customDomains:
        - domainName: example.com
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
    customDomains: [{ domainName: 'example.com' }],
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

## Property: `host`

- Required: no
- Type: `string`

Redirect hostname. Use `#{host}` to keep the original.

### Example 1 (yaml)

```yaml
resources:
  webLoadBalancer:
    type: application-load-balancer
    properties:
      customDomains:
        - domainName: old.example.com
        - domainName: new.example.com
      listeners:
        - protocol: HTTPS
          port: 443
          defaultAction:
            type: redirect
            properties:
              host: new.example.com
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
            hosts:
              - new.example.com
            paths:
              - /*
```

### Example 2 (typescript)

```typescript
import { ApplicationLoadBalancer, LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const webLoadBalancer = new ApplicationLoadBalancer({
    customDomains: [{ domainName: 'old.example.com' }, { domainName: 'new.example.com' }],
    listeners: [
      {
        protocol: 'HTTPS',
        port: 443,
        defaultAction: {
          type: 'redirect',
          properties: {
            host: 'new.example.com',
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
          hosts: ['new.example.com'],
          paths: ['/*']
        }
      }
    ]
  });

  return { resources: { webLoadBalancer, apiFunction } };
});
```

## Property: `path`

- Required: no
- Type: `string`

Redirect path (must start with `/`). Use `#{path}` to reuse the original path.

### Example 1 (yaml)

```yaml
resources:
  webLoadBalancer:
    type: application-load-balancer
    properties:
      customDomains:
        - domainName: example.com
      listeners:
        - protocol: HTTPS
          port: 443
          defaultAction:
            type: redirect
            properties:
              path: /new/#{path}
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
              - /new/*
```

### Example 2 (typescript)

```typescript
import { ApplicationLoadBalancer, LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const webLoadBalancer = new ApplicationLoadBalancer({
    customDomains: [{ domainName: 'example.com' }],
    listeners: [
      {
        protocol: 'HTTPS',
        port: 443,
        defaultAction: {
          type: 'redirect',
          properties: {
            path: '/new/#{path}',
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
          paths: ['/new/*']
        }
      }
    ]
  });

  return { resources: { webLoadBalancer, apiFunction } };
});
```

## Property: `port`

- Required: no
- Type: `number`

Redirect port (1-65535). Use `#{port}` to keep the original.

### Example 1 (yaml)

```yaml
resources:
  webLoadBalancer:
    type: application-load-balancer
    properties:
      customDomains:
        - domainName: example.com
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
    customDomains: [{ domainName: 'example.com' }],
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

## Property: `protocol`

- Required: no
- Type: `string: "HTTP" | "HTTPS"`

Redirect protocol. Cannot redirect HTTPS to HTTP.

### Example 1 (yaml)

```yaml
resources:
  webLoadBalancer:
    type: application-load-balancer
    properties:
      customDomains:
        - domainName: example.com
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
    customDomains: [{ domainName: 'example.com' }],
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

## Property: `query`

- Required: no
- Type: `string`

Query string for the redirect (without leading `?`). Use `#{query}` to preserve the original.

### Example 1 (yaml)

```yaml
resources:
  webLoadBalancer:
    type: application-load-balancer
    properties:
      customDomains:
        - domainName: example.com
      listeners:
        - protocol: HTTPS
          port: 443
          defaultAction:
            type: redirect
            properties:
              query: '#{query}&source=redirect'
              statusCode: HTTP_302
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
    customDomains: [{ domainName: 'example.com' }],
    listeners: [
      {
        protocol: 'HTTPS',
        port: 443,
        defaultAction: {
          type: 'redirect',
          properties: {
            query: '#{query}&source=redirect',
            statusCode: 'HTTP_302'
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
