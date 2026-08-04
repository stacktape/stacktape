# LbHeaderCondition API Reference

## TypeScript definition

```typescript
type LbHeaderCondition = {
  /** The name of the HTTP header. */
  headerName: string;
  /** A list of allowed values for the header. */
  values: Array<string>;
};
```

## Property: `headerName`

- Required: yes
- Type: `string`

The name of the HTTP header.

### Example 1 (yaml)

```yaml
resources:
  publicAlb:
    type: application-load-balancer
    properties: {}
  apiFunction:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/api.ts
      events:
        - type: application-load-balancer
          properties:
            loadBalancerName: publicAlb
            priority: 1
            paths:
              - /api/users
            headers:
              -
                headerName: X-Tenant-Id
                values:
                  - acme-corp
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, ApplicationLoadBalancer, defineConfig } from 'stacktape';
export default defineConfig(() => {
  const publicAlb = new ApplicationLoadBalancer({});
  const apiFunction = new LambdaFunction({
    packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/api.ts' } },
    events: [
      {
        type: 'application-load-balancer',
        properties: {
          loadBalancerName: 'publicAlb',
          priority: 1,
          paths: ['/api/users'],
          headers: [
            {
              headerName: 'X-Tenant-Id',
              values: ['acme-corp']
            }
          ]
        }
      }
    ]
  });
  return { resources: { publicAlb, apiFunction } };
});
```

## Property: `values`

- Required: yes
- Type: `Array<string>`

A list of allowed values for the header.

The condition is met if the header's value in the incoming request matches any of the values in this list. The comparison is case-insensitive.

### Example 1 (yaml)

```yaml
resources:
  publicAlb:
    type: application-load-balancer
    properties: {}
  apiFunction:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/api.ts
      events:
        - type: application-load-balancer
          properties:
            loadBalancerName: publicAlb
            priority: 1
            paths:
              - /api/users
            headers:
              - headerName: X-Tenant-Id
                values:
                  - acme-corp
                  - globex
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, ApplicationLoadBalancer, defineConfig } from 'stacktape';
export default defineConfig(() => {
  const publicAlb = new ApplicationLoadBalancer({});
  const apiFunction = new LambdaFunction({
    packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/api.ts' } },
    events: [
      {
        type: 'application-load-balancer',
        properties: {
          loadBalancerName: 'publicAlb',
          priority: 1,
          paths: ['/api/users'],
          headers: [
            {
              headerName: 'X-Tenant-Id',
              values: ['acme-corp', 'globex']
            }
          ]
        }
      }
    ]
  });
  return { resources: { publicAlb, apiFunction } };
});
```
