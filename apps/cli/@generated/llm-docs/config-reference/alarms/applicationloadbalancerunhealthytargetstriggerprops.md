# ApplicationLoadBalancerUnhealthyTargetsTriggerProps API Reference

## TypeScript definition

```typescript
type ApplicationLoadBalancerUnhealthyTargetsTriggerProps = {
  /** Fires when the percentage of unhealthy targets exceeds this value. */
  thresholdPercent: number;
  /** How to compare the metric value against the threshold. */
  comparisonOperator?: "GreaterThanOrEqualToThreshold" | "GreaterThanThreshold" | "LessThanOrEqualToThreshold" | "LessThanThreshold";
  /** Only monitor health of these target container services. If omitted, monitors all targets. */
  onlyIncludeTargets?: Array<string>;
};
```

## Property: `thresholdPercent`

- Required: yes
- Type: `number`

Fires when the percentage of unhealthy targets exceeds this value.

If the load balancer has multiple target groups, the alarm fires if *any* group breaches the threshold.

### Example 1 (yaml)

```yaml
resources:
  loadBalancer:
    type: application-load-balancer
    properties:
      alarms:
        - description: Too many unhealthy targets behind the load balancer
          trigger:
            type: application-load-balancer-unhealthy-targets
            properties:
              thresholdPercent: 50
  apiService:
    type: multi-container-workload
    properties:
      resources:
        cpu: 0.5
        memory: 1024
      containers:
        - name: api
          packaging:
            type: prebuilt-image
            properties:
              image: my-org/api:latest
          events:
            - type: application-load-balancer
              properties:
                loadBalancerName: loadBalancer
                priority: 1
                containerPort: 3000
                paths:
                  - '*'
```

### Example 2 (typescript)

```typescript
import { ApplicationLoadBalancer, MultiContainerWorkload, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const loadBalancer = new ApplicationLoadBalancer({
    alarms: [
      {
        description: 'Too many unhealthy targets behind the load balancer',
        trigger: {
          type: 'application-load-balancer-unhealthy-targets',
          properties: {
            thresholdPercent: 50
          }
        }
      }
    ]
  });

  const apiService = new MultiContainerWorkload({
    resources: { cpu: 0.5, memory: 1024 },
    containers: [
      {
        name: 'api',
        packaging: { type: 'prebuilt-image', properties: { image: 'my-org/api:latest' } },
        events: [
          {
            type: 'application-load-balancer',
            properties: {
              loadBalancerName: 'loadBalancer',
              priority: 1,
              containerPort: 3000,
              paths: ['*']
            }
          }
        ]
      }
    ]
  });

  return { resources: { loadBalancer, apiService } };
});
```

## Property: `comparisonOperator`

- Required: no
- Type: `string: "GreaterThanOrEqualToThreshold" | "GreaterThanThreshold" | "LessThanOrEqualToThreshold" | "LessThanThreshold"`
- Default: `GreaterThanThreshold`

How to compare the metric value against the threshold.

### Example 1 (yaml)

```yaml
resources:
  mainDatabase:
    type: relational-database
    properties:
      credentials:
        masterUserName: admin
        masterUserPassword: $Secret('db-password')
      engine:
        type: postgres
        properties:
          version: '16.2'
          primaryInstance:
            instanceSize: db.t3.micro
      alarms:
        - description: Database free memory dropped below threshold
          trigger:
            type: database-free-memory
            properties:
              thresholdMB: 512
              comparisonOperator: LessThanThreshold
```

### Example 2 (typescript)

```typescript
import { RelationalDatabase, defineConfig, $Secret } from 'stacktape';

export default defineConfig(() => {
  const mainDatabase = new RelationalDatabase({
    credentials: {
      masterUserName: 'admin',
      masterUserPassword: $Secret('db-password')
    },
    engine: {
      type: 'postgres',
      properties: {
        version: '16.2',
        primaryInstance: { instanceSize: 'db.t3.micro' }
      }
    },
    alarms: [
      {
        description: 'Database free memory dropped below threshold',
        trigger: {
          type: 'database-free-memory',
          properties: {
            thresholdMB: 512,
            comparisonOperator: 'LessThanThreshold'
          }
        }
      }
    ]
  });

  return { resources: { mainDatabase } };
});
```

## Property: `onlyIncludeTargets`

- Required: no
- Type: `Array<string>`

Only monitor health of these target container services. If omitted, monitors all targets.

Only services actually targeted by the load balancer can be listed.

### Example 1 (yaml)

```yaml
resources:
  loadBalancer:
    type: application-load-balancer
    properties:
      alarms:
        - description: Critical service has unhealthy targets
          trigger:
            type: application-load-balancer-unhealthy-targets
            properties:
              thresholdPercent: 25
              onlyIncludeTargets:
                - apiService
  apiService:
    type: multi-container-workload
    properties:
      resources:
        cpu: 0.5
        memory: 1024
      containers:
        - name: api
          packaging:
            type: prebuilt-image
            properties:
              image: my-org/api:latest
          events:
            - type: application-load-balancer
              properties:
                loadBalancerName: loadBalancer
                priority: 1
                containerPort: 3000
                paths:
                  - '*'
```

### Example 2 (typescript)

```typescript
import { ApplicationLoadBalancer, MultiContainerWorkload, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const loadBalancer = new ApplicationLoadBalancer({
    alarms: [
      {
        description: 'Critical service has unhealthy targets',
        trigger: {
          type: 'application-load-balancer-unhealthy-targets',
          properties: {
            thresholdPercent: 25,
            onlyIncludeTargets: ['apiService']
          }
        }
      }
    ]
  });

  const apiService = new MultiContainerWorkload({
    resources: { cpu: 0.5, memory: 1024 },
    containers: [
      {
        name: 'api',
        packaging: { type: 'prebuilt-image', properties: { image: 'my-org/api:latest' } },
        events: [
          {
            type: 'application-load-balancer',
            properties: {
              loadBalancerName: 'loadBalancer',
              priority: 1,
              containerPort: 3000,
              paths: ['*']
            }
          }
        ]
      }
    ]
  });

  return { resources: { loadBalancer, apiService } };
});
```
