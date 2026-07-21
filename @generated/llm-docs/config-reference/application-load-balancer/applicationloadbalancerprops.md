# ApplicationLoadBalancerProps API Reference

Resource type: `application-load-balancer`

## TypeScript definition

```typescript
import type { ApplicationLoadBalancerAlarm, ApplicationLoadBalancerCdnConfiguration, ApplicationLoadBalancerListener } from 'stacktape';

type ApplicationLoadBalancerProps = {
  /** Alarms for this load balancer (merged with global alarms from the Stacktape Console). */
  alarms?: Array<ApplicationLoadBalancerAlarm>;
  /** Put a CDN (CloudFront) in front of this load balancer for caching and lower latency worldwide. */
  cdn?: ApplicationLoadBalancerCdnConfiguration;
  /** Custom domains. */
  customDomains?: ApplicationLoadBalancerCustomDomains;
  /** Global alarm names to exclude from this load balancer. */
  disabledGlobalAlarms?: Array<string>;
  /** internet (public) or internal (VPC-only). Internal ALBs are not reachable from the internet. */
  interface?: "internal" | "internet";
  /** Custom listeners (port + protocol). Defaults to HTTPS on 443 + HTTP on 80 (redirecting to HTTPS). */
  listeners?: Array<ApplicationLoadBalancerListener>;
  /** Name of a web-app-firewall resource to protect this load balancer from common web exploits. */
  useFirewall?: string;
};

/** Union choices used by the properties above. */
type ApplicationLoadBalancerCustomDomains =
  | "option-1"
  | "option-2";
```

## Property: `alarms`

- Required: no
- Type: `Array<ApplicationLoadBalancerAlarm>`

Alarms for this load balancer (merged with global alarms from the Stacktape Console).

### Example 1 (yaml)

```yaml
resources:
  webLoadBalancer:
    type: application-load-balancer
    properties:
      customDomains:
        - domainName: api.example.com
      alarms:
        - trigger:
            type: application-load-balancer-error-rate
            properties:
              thresholdPercent: 5
          notificationTargets:
            - type: email
              properties:
                sender: alerts@example.com
                recipient: oncall@example.com
        - trigger:
            type: application-load-balancer-unhealthy-targets
            properties:
              thresholdPercent: 20
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
    alarms: [
      {
        trigger: {
          type: 'application-load-balancer-error-rate',
          properties: { thresholdPercent: 5 }
        },
        notificationTargets: [
          {
            type: 'email',
            properties: { sender: 'alerts@example.com', recipient: 'oncall@example.com' }
          }
        ]
      },
      {
        trigger: {
          type: 'application-load-balancer-unhealthy-targets',
          properties: { thresholdPercent: 20 }
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
          priority: 1,
          paths: ['/*']
        }
      }
    ]
  });

  return { resources: { webLoadBalancer, apiFunction } };
});
```

## Property: `cdn`

- Required: no
- Type: `ApplicationLoadBalancerCdnConfiguration`

Put a CDN (CloudFront) in front of this load balancer for caching and lower latency worldwide.

### Example 1 (yaml)

```yaml
resources:
  webLoadBalancer:
    type: application-load-balancer
    properties:
      customDomains:
        - domainName: api.example.com
      cdn:
        enabled: true
        cloudfrontPriceClass: PriceClass_100
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
    cdn: {
      enabled: true,
      cloudfrontPriceClass: 'PriceClass_100'
    }
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
          priority: 1,
          paths: ['/*']
        }
      }
    ]
  });

  return { resources: { webLoadBalancer, apiFunction } };
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
  webLoadBalancer:
    type: application-load-balancer
    properties:
      customDomains:
        - domainName: api.example.com
        - domainName: legacy.example.com
          disableDnsRecordCreation: true
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
            priority: 1
            paths:
              - /*
```

### Example 2 (typescript)

```typescript
import { ApplicationLoadBalancer, LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const webLoadBalancer = new ApplicationLoadBalancer({
    customDomains: [
      { domainName: 'api.example.com' },
      { domainName: 'legacy.example.com', disableDnsRecordCreation: true }
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
          priority: 1,
          paths: ['/*']
        }
      }
    ]
  });

  return { resources: { webLoadBalancer, apiFunction } };
});
```

## Property: `disabledGlobalAlarms`

- Required: no
- Type: `Array<string>`

Global alarm names to exclude from this load balancer.

### Example 1 (yaml)

```yaml
resources:
  webLoadBalancer:
    type: application-load-balancer
    properties:
      customDomains:
        - domainName: api.example.com
      disabledGlobalAlarms:
        - high-error-rate
        - unhealthy-targets
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
    disabledGlobalAlarms: ['high-error-rate', 'unhealthy-targets']
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
          priority: 1,
          paths: ['/*']
        }
      }
    ]
  });

  return { resources: { webLoadBalancer, apiFunction } };
});
```

## Property: `interface`

- Required: no
- Type: `string: "internal" | "internet"`
- Default: `internet`

`internet` (public) or `internal` (VPC-only). Internal ALBs are not reachable from the internet.

### Example 1 (yaml)

```yaml
resources:
  webLoadBalancer:
    type: application-load-balancer
    properties:
      interface: internal
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
            priority: 1
            paths:
              - /api/*
```

### Example 2 (typescript)

```typescript
import { ApplicationLoadBalancer, LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const webLoadBalancer = new ApplicationLoadBalancer({
    interface: 'internal'
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
          priority: 1,
          paths: ['/api/*']
        }
      }
    ]
  });

  return { resources: { webLoadBalancer, apiFunction } };
});
```

## Property: `listeners`

- Required: no
- Type: `Array<ApplicationLoadBalancerListener>`

Custom listeners (port + protocol). Defaults to HTTPS on 443 + HTTP on 80 (redirecting to HTTPS).

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
          port: 8080
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
      { protocol: 'HTTP', port: 8080 }
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

## Property: `useFirewall`

- Required: no
- Type: `string`

Name of a `web-app-firewall` resource to protect this load balancer from common web exploits.

### Example 1 (yaml)

```yaml
resources:
  apiFirewall:
    type: web-app-firewall
    properties:
      scope: regional
  webLoadBalancer:
    type: application-load-balancer
    properties:
      customDomains:
        - domainName: api.example.com
      useFirewall: apiFirewall
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
            priority: 1
            paths:
              - /*
```

### Example 2 (typescript)

```typescript
import { ApplicationLoadBalancer, LambdaFunction, WebAppFirewall, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const apiFirewall = new WebAppFirewall({ scope: 'regional' });

  const webLoadBalancer = new ApplicationLoadBalancer({
    customDomains: [{ domainName: 'api.example.com' }],
    useFirewall: 'apiFirewall'
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
          priority: 1,
          paths: ['/*']
        }
      }
    ]
  });

  return { resources: { apiFirewall, webLoadBalancer, apiFunction } };
});
```
