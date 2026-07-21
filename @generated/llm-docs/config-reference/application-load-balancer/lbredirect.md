# LbRedirect API Reference

Resource type: `application-load-balancer`

## TypeScript definition

```typescript
import type { LbRedirectProperties } from 'stacktape';

type LbRedirect = {
  /** Configures where to redirect the request. */
  properties: LbRedirectProperties;
};
```

## Property: `properties`

- Required: yes
- Type: `LbRedirectProperties`

Configures where to redirect the request.

A redirect changes the URI, which has the format: `protocol://hostname:port/path?query`.
Unmodified URI components will retain their original values.

To avoid redirect loops, ensure that you sufficiently modify the URI.
You can reuse URI components with the following keywords: `#{protocol}`, `#{host}`, `#{port}`, `#{path}` (the leading `/` is removed), and `#{query}`.

For example, you can change the path to `/new/#{path}`, the hostname to `example.#{host}`, or the query to `#{query}&value=xyz`.

### Example 1 (yaml)

```yaml
resources:
  webLoadBalancer:
    type: application-load-balancer
    properties:
      customDomains:
        - domainName: example.com
        - domainName: www.example.com
      listeners:
        - protocol: HTTPS
          port: 443
          defaultAction:
            type: redirect
            properties:
              host: www.example.com
              path: /#{path}
              query: '#{query}'
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
              - www.example.com
            paths:
              - /*
```

### Example 2 (typescript)

```typescript
import { ApplicationLoadBalancer, LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const webLoadBalancer = new ApplicationLoadBalancer({
    customDomains: [{ domainName: 'example.com' }, { domainName: 'www.example.com' }],
    listeners: [
      {
        protocol: 'HTTPS',
        port: 443,
        defaultAction: {
          type: 'redirect',
          properties: {
            host: 'www.example.com',
            path: '/#{path}',
            query: '#{query}',
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
          hosts: ['www.example.com'],
          paths: ['/*']
        }
      }
    ]
  });

  return { resources: { webLoadBalancer, apiFunction } };
});
```
