# ContainerWorkloadLoadBalancerIntegrationProps API Reference

## TypeScript definition

```typescript
import type { LbHeaderCondition, LbQueryParamCondition } from 'stacktape';

type ContainerWorkloadLoadBalancerIntegrationProps = {
  /** The container port that will receive traffic from the load balancer. */
  containerPort: number;
  /** The name of the Application Load Balancer. */
  loadBalancerName: string;
  /** The priority of this integration rule. */
  priority: number;
  /** A list of header conditions that the request must match. */
  headers?: Array<LbHeaderCondition>;
  /** A list of hostnames that will trigger this integration. */
  hosts?: Array<string>;
  /** The port of the load balancer listener to attach to. */
  listenerPort?: number;
  /** A list of HTTP methods that will trigger this integration. */
  methods?: Array<string>;
  /** A list of URL paths that will trigger this integration. */
  paths?: Array<string>;
  /** A list of query parameter conditions that the request must match. */
  queryParams?: Array<LbQueryParamCondition>;
  /** A list of source IP addresses (in CIDR format) that are allowed to trigger this integration. */
  sourceIps?: Array<string>;
};
```

## Property: `containerPort`

- Required: yes
- Type: `number`

The container port that will receive traffic from the load balancer.

### Example 1 (yaml)

```yaml
resources:
  publicAlb:
    type: application-load-balancer
    properties: {}
  appWorkload:
    type: multi-container-workload
    properties:
      resources:
        cpu: 0.5
        memory: 1024
      containers:
        - name: web
          packaging:
            type: prebuilt-image
            properties:
              image: 'my-org/web-app:latest'
          events:
            - type: application-load-balancer
              properties:
                loadBalancerName: publicAlb
                priority: 1
                paths:
                  - '/*'
                containerPort: 8080
```

### Example 2 (typescript)

```typescript
import { MultiContainerWorkload, ApplicationLoadBalancer, defineConfig } from 'stacktape';
export default defineConfig(() => {
  const publicAlb = new ApplicationLoadBalancer({});
  const appWorkload = new MultiContainerWorkload({
    resources: { cpu: 0.5, memory: 1024 },
    containers: [
      {
        name: 'web',
        packaging: { type: 'prebuilt-image', properties: { image: 'my-org/web-app:latest' } },
        events: [
          {
            type: 'application-load-balancer',
            properties: {
              loadBalancerName: 'publicAlb',
              priority: 1,
              paths: ['/*'],
              containerPort: 8080
            }
          }
        ]
      }
    ]
  });
  return { resources: { publicAlb, appWorkload } };
});
```

## Property: `loadBalancerName`

- Required: yes
- Type: `string`

The name of the Application Load Balancer.

This must reference a load balancer defined in your Stacktape configuration.

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
            listenerPort: 443
            priority: 1
            paths:
              - /api/users
              - '/api/articles/*'
            methods:
              - GET
              - POST
            hosts:
              - api.example.com
              - '*.myapp.com'
            headers:
              - headerName: X-Tenant-Id
                values:
                  - acme-corp
                  - globex
            queryParams:
              - paramName: version
                values:
                  - v2
            sourceIps:
              - 10.0.0.0/16
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
          listenerPort: 443,
          priority: 1,
          paths: ['/api/users', '/api/articles/*'],
          methods: ['GET', 'POST'],
          hosts: ['api.example.com', '*.myapp.com'],
          headers: [{ headerName: 'X-Tenant-Id', values: ['acme-corp', 'globex'] }],
          queryParams: [{ paramName: 'version', values: ['v2'] }],
          sourceIps: ['10.0.0.0/16']
        }
      }
    ]
  });
  return { resources: { publicAlb, apiFunction } };
});
```

## Property: `priority`

- Required: yes
- Type: `number`

The priority of this integration rule.

Load balancer rules are evaluated in order from the lowest priority to the highest.
The first rule that matches an incoming request will handle it.

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
          paths: ['/api/users']
        }
      }
    ]
  });
  return { resources: { publicAlb, apiFunction } };
});
```

## Property: `headers`

- Required: no
- Type: `Array<LbHeaderCondition>`

A list of header conditions that the request must match.

All header conditions must be met for the request to be routed.

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
          headers: [{ headerName: 'X-Tenant-Id', values: ['acme-corp', 'globex'] }]
        }
      }
    ]
  });
  return { resources: { publicAlb, apiFunction } };
});
```

## Property: `hosts`

- Required: no
- Type: `Array<string>`

A list of hostnames that will trigger this integration.

The hostname is parsed from the `Host` header of the request.
Wildcards (`*` and `?`) are supported.

Example: `api.example.com`, `*.myapp.com`

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
            hosts:
              - api.example.com
              - '*.myapp.com'
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
          hosts: ['api.example.com', '*.myapp.com']
        }
      }
    ]
  });
  return { resources: { publicAlb, apiFunction } };
});
```

## Property: `listenerPort`

- Required: no
- Type: `number`

The port of the load balancer listener to attach to.

You only need to specify this if the load balancer uses custom listeners.

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
            listenerPort: 443
            priority: 1
            paths:
              - /api/users
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
          listenerPort: 443,
          priority: 1,
          paths: ['/api/users']
        }
      }
    ]
  });
  return { resources: { publicAlb, apiFunction } };
});
```

## Property: `methods`

- Required: no
- Type: `Array<string>`

A list of HTTP methods that will trigger this integration.

Example: `GET`, `POST`, `DELETE`

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
            methods:
              - GET
              - POST
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
          methods: ['GET', 'POST']
        }
      }
    ]
  });
  return { resources: { publicAlb, apiFunction } };
});
```

## Property: `paths`

- Required: no
- Type: `Array<string>`

A list of URL paths that will trigger this integration.

The request will be routed if its path matches any of the paths in this list.
The comparison is case-sensitive and supports `*` and `?` wildcards.

Example: `/users`, `/articles/*`

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
              - '/api/articles/*'
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
          paths: ['/api/users', '/api/articles/*']
        }
      }
    ]
  });
  return { resources: { publicAlb, apiFunction } };
});
```

## Property: `queryParams`

- Required: no
- Type: `Array<LbQueryParamCondition>`

A list of query parameter conditions that the request must match.

All query parameter conditions must be met for the request to be routed.

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
          queryParams: [{ paramName: 'version', values: ['v2'] }]
        }
      }
    ]
  });
  return { resources: { publicAlb, apiFunction } };
});
```

## Property: `sourceIps`

- Required: no
- Type: `Array<string>`

A list of source IP addresses (in CIDR format) that are allowed to trigger this integration.

**Note:** If the client is behind a proxy, this will be the IP address of the proxy.

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
            sourceIps:
              - 10.0.0.0/16
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
          sourceIps: ['10.0.0.0/16']
        }
      }
    ]
  });
  return { resources: { publicAlb, apiFunction } };
});
```
