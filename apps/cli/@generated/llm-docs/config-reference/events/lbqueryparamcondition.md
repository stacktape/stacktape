# LbQueryParamCondition API Reference

## TypeScript definition

```typescript
type LbQueryParamCondition = {
  /** The name of the query parameter. */
  paramName: string;
  /** A list of allowed values for the query parameter. */
  values: Array<string>;
};
```

## Property: `paramName`

- Required: yes
- Type: `string`

The name of the query parameter.

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
            queryParams:
              -
                paramName: version
                values:
                  - v2
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
          queryParams: [
            {
              paramName: 'version',
              values: ['v2']
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

A list of allowed values for the query parameter.

The condition is met if the query parameter's value in the incoming request matches any of the values in this list. The comparison is case-insensitive.

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
            queryParams:
              - paramName: version
                values:
                  - v2
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
          queryParams: [
            {
              paramName: 'version',
              values: ['v2']
            }
          ]
        }
      }
    ]
  });
  return { resources: { publicAlb, apiFunction } };
});
```
