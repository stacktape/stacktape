# LambdaDeploymentConfig API Reference

Resource type: `function`

## TypeScript definition

```typescript
type LambdaDeploymentConfig = {
  /** How traffic shifts from the old version to the new one. */
  strategy: "AllAtOnce" | "Canary10Percent10Minutes" | "Canary10Percent15Minutes" | "Canary10Percent30Minutes" | "Canary10Percent5Minutes" | "Linear10PercentEvery10Minutes" | "Linear10PercentEvery1Minute" | "Linear10PercentEvery2Minutes" | "Linear10PercentEvery3Minutes";
  /** Function to run after all traffic has shifted (e.g., post-deploy validation). */
  afterTrafficShiftFunction?: string;
  /** Function to run before traffic shifting begins (e.g., smoke tests). */
  beforeAllowTrafficFunction?: string;
};
```

## Property: `strategy`

- Required: yes
- Type: `string: "AllAtOnce" | "Canary10Percent10Minutes" | "Canary10Percent15Minutes" | "Canary10Percent30Minutes" | "Canary10Percent5Minutes" | "Linear10PercentEvery10Minutes" | "Linear10PercentEvery1Minute" | "Linear10PercentEvery2Minutes" | "Linear10PercentEvery3Minutes"`

How traffic shifts from the old version to the new one.

**Canary**: Send 10% of traffic first, then all traffic after a wait period.
**Linear**: Shift 10% of traffic at regular intervals.
**AllAtOnce**: Instant switch (no gradual rollout).

### Example 1 (yaml)

```yaml
resources:
  paymentApi:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/payment.ts
      deployment:
        strategy: Linear10PercentEvery2Minutes
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const paymentApi = new LambdaFunction({
    packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/payment.ts' } },
    deployment: {
      strategy: 'Linear10PercentEvery2Minutes'
    }
  });
  return { resources: { paymentApi } };
});
```

## Property: `afterTrafficShiftFunction`

- Required: no
- Type: `string`

Function to run after all traffic has shifted (e.g., post-deploy validation).

Must signal success/failure to CodeDeploy.

### Example 1 (yaml)

```yaml
resources:
  paymentApi:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/payment.ts
      deployment:
        strategy: Canary10Percent5Minutes
        afterTrafficShiftFunction: postTrafficCheck
  postTrafficCheck:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/post-traffic.ts
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const paymentApi = new LambdaFunction({
    packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/payment.ts' } },
    deployment: {
      strategy: 'Canary10Percent5Minutes',
      afterTrafficShiftFunction: 'postTrafficCheck'
    }
  });
  const postTrafficCheck = new LambdaFunction({
    packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/post-traffic.ts' } }
  });
  return { resources: { paymentApi, postTrafficCheck } };
});
```

## Property: `beforeAllowTrafficFunction`

- Required: no
- Type: `string`

Function to run before traffic shifting begins (e.g., smoke tests).

Must signal success/failure to CodeDeploy. If it fails, the deployment rolls back.

### Example 1 (yaml)

```yaml
resources:
  paymentApi:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/payment.ts
      deployment:
        strategy: Canary10Percent5Minutes
        beforeAllowTrafficFunction: preTrafficCheck
  preTrafficCheck:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/pre-traffic.ts
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const paymentApi = new LambdaFunction({
    packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/payment.ts' } },
    deployment: {
      strategy: 'Canary10Percent5Minutes',
      beforeAllowTrafficFunction: 'preTrafficCheck'
    }
  });
  const preTrafficCheck = new LambdaFunction({
    packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/pre-traffic.ts' } }
  });
  return { resources: { paymentApi, preTrafficCheck } };
});
```
