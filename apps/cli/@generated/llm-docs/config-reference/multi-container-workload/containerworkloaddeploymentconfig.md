# ContainerWorkloadDeploymentConfig API Reference

Resource type: `multi-container-workload`

## TypeScript definition

```typescript
type ContainerWorkloadDeploymentConfig = {
  /** How traffic shifts to the new version during deployment. */
  strategy: "AllAtOnce" | "Canary10Percent15Minutes" | "Canary10Percent5Minutes" | "Linear10PercentEvery1Minutes" | "Linear10PercentEvery3Minutes";
  /** Lambda function to run after all traffic has shifted (for post-deployment checks). */
  afterTrafficShiftFunction?: string;
  /** Lambda function to run before traffic shifts to the new version (for validation/smoke tests). */
  beforeAllowTrafficFunction?: string;
  /** ALB listener port for test traffic. Only needed with beforeAllowTrafficFunction and custom listeners. */
  testListenerPort?: number;
};
```

## Property: `strategy`

- Required: yes
- Type: `string: "AllAtOnce" | "Canary10Percent15Minutes" | "Canary10Percent5Minutes" | "Linear10PercentEvery1Minutes" | "Linear10PercentEvery3Minutes"`

How traffic shifts to the new version during deployment.

`Canary10Percent5Minutes`: 10% first, then all after 5 min.
`Canary10Percent15Minutes`: 10% first, then all after 15 min.
`Linear10PercentEvery1Minutes`: 10% more every minute.
`Linear10PercentEvery3Minutes`: 10% more every 3 minutes.
`AllAtOnce`: Instant switch.

### Example 1 (yaml)

```yaml
resources:
  app:
    type: multi-container-workload
    properties:
      containers:
        - name: web
          packaging:
            type: stacktape-image-buildpack
            properties:
              entryfilePath: src/index.ts
          events:
            - type: application-load-balancer
              properties:
                loadBalancerName: appLb
                priority: 1
                containerPort: 3000
      resources:
        cpu: 0.5
        memory: 1024
      deployment:
        strategy: Linear10PercentEvery3Minutes
  appLb:
    type: application-load-balancer
  smokeTest:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/smoke-test.ts
```

### Example 2 (typescript)

```typescript
import { MultiContainerWorkload, ApplicationLoadBalancer, LambdaFunction, StacktapeImageBuildpackPackaging, StacktapeLambdaBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const appLb = new ApplicationLoadBalancer({});
  const smokeTest = new LambdaFunction({ packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: 'src/smoke-test.ts' }) });
  const app = new MultiContainerWorkload({
    containers: [
      {
        name: 'web',
        packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/index.ts' }),
        events: [
          { type: 'application-load-balancer', properties: { loadBalancerName: 'appLb', priority: 1, containerPort: 3000 } }
        ]
      }
    ],
    resources: { cpu: 0.5, memory: 1024 },
    deployment: {
      strategy: 'Linear10PercentEvery3Minutes'
    }
  });
  return { resources: { app, appLb, smokeTest } };
});
```

## Property: `afterTrafficShiftFunction`

- Required: no
- Type: `string`

Lambda function to run after all traffic has shifted (for post-deployment checks).

### Example 1 (yaml)

```yaml
resources:
  app:
    type: multi-container-workload
    properties:
      containers:
        - name: web
          packaging:
            type: stacktape-image-buildpack
            properties:
              entryfilePath: src/index.ts
          events:
            - type: application-load-balancer
              properties:
                loadBalancerName: appLb
                priority: 1
                containerPort: 3000
      resources:
        cpu: 0.5
        memory: 1024
      deployment:
        strategy: Canary10Percent5Minutes
        afterTrafficShiftFunction: smokeTest
  appLb:
    type: application-load-balancer
  smokeTest:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/smoke-test.ts
```

### Example 2 (typescript)

```typescript
import { MultiContainerWorkload, ApplicationLoadBalancer, LambdaFunction, StacktapeImageBuildpackPackaging, StacktapeLambdaBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const appLb = new ApplicationLoadBalancer({});
  const smokeTest = new LambdaFunction({ packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: 'src/smoke-test.ts' }) });
  const app = new MultiContainerWorkload({
    containers: [
      {
        name: 'web',
        packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/index.ts' }),
        events: [
          { type: 'application-load-balancer', properties: { loadBalancerName: 'appLb', priority: 1, containerPort: 3000 } }
        ]
      }
    ],
    resources: { cpu: 0.5, memory: 1024 },
    deployment: {
      strategy: 'Canary10Percent5Minutes',
      afterTrafficShiftFunction: 'smokeTest'
    }
  });
  return { resources: { app, appLb, smokeTest } };
});
```

## Property: `beforeAllowTrafficFunction`

- Required: no
- Type: `string`

Lambda function to run before traffic shifts to the new version (for validation/smoke tests).

### Example 1 (yaml)

```yaml
resources:
  app:
    type: multi-container-workload
    properties:
      containers:
        - name: web
          packaging:
            type: stacktape-image-buildpack
            properties:
              entryfilePath: src/index.ts
          events:
            - type: application-load-balancer
              properties:
                loadBalancerName: appLb
                priority: 1
                containerPort: 3000
      resources:
        cpu: 0.5
        memory: 1024
      deployment:
        strategy: Canary10Percent5Minutes
        beforeAllowTrafficFunction: smokeTest
  appLb:
    type: application-load-balancer
  smokeTest:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/smoke-test.ts
```

### Example 2 (typescript)

```typescript
import { MultiContainerWorkload, ApplicationLoadBalancer, LambdaFunction, StacktapeImageBuildpackPackaging, StacktapeLambdaBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const appLb = new ApplicationLoadBalancer({});
  const smokeTest = new LambdaFunction({ packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: 'src/smoke-test.ts' }) });
  const app = new MultiContainerWorkload({
    containers: [
      {
        name: 'web',
        packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/index.ts' }),
        events: [
          { type: 'application-load-balancer', properties: { loadBalancerName: 'appLb', priority: 1, containerPort: 3000 } }
        ]
      }
    ],
    resources: { cpu: 0.5, memory: 1024 },
    deployment: {
      strategy: 'Canary10Percent5Minutes',
      beforeAllowTrafficFunction: 'smokeTest'
    }
  });
  return { resources: { app, appLb, smokeTest } };
});
```

## Property: `testListenerPort`

- Required: no
- Type: `number`

ALB listener port for test traffic. Only needed with `beforeAllowTrafficFunction` and custom listeners.

### Example 1 (yaml)

```yaml
resources:
  app:
    type: multi-container-workload
    properties:
      containers:
        - name: web
          packaging:
            type: stacktape-image-buildpack
            properties:
              entryfilePath: src/index.ts
          events:
            - type: application-load-balancer
              properties:
                loadBalancerName: appLb
                priority: 1
                containerPort: 3000
      resources:
        cpu: 0.5
        memory: 1024
      deployment:
        strategy: Canary10Percent5Minutes
        beforeAllowTrafficFunction: smokeTest
        testListenerPort: 8443
  appLb:
    type: application-load-balancer
  smokeTest:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/smoke-test.ts
```

### Example 2 (typescript)

```typescript
import { MultiContainerWorkload, ApplicationLoadBalancer, LambdaFunction, StacktapeImageBuildpackPackaging, StacktapeLambdaBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const appLb = new ApplicationLoadBalancer({});
  const smokeTest = new LambdaFunction({ packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: 'src/smoke-test.ts' }) });
  const app = new MultiContainerWorkload({
    containers: [
      {
        name: 'web',
        packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/index.ts' }),
        events: [
          { type: 'application-load-balancer', properties: { loadBalancerName: 'appLb', priority: 1, containerPort: 3000 } }
        ]
      }
    ],
    resources: { cpu: 0.5, memory: 1024 },
    deployment: {
      strategy: 'Canary10Percent5Minutes',
      beforeAllowTrafficFunction: 'smokeTest',
      testListenerPort: 8443
    }
  });
  return { resources: { app, appLb, smokeTest } };
});
```
