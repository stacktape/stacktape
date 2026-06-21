# Gradual Deployments

Gradual deployments shift traffic from the old version of your code to the new version incrementally — canary or linear — instead of switching all at once. Stacktape supports gradual deployments for [Lambda functions](/resources/compute/lambda-function), [web services](/resources/compute/web-service), and [multi-container workloads](/resources/compute/multi-container-workload) that use an [application load balancer](/resources/networking/application-load-balancer). For Lambda functions, traffic rolls back to the previous version automatically if issues arise. Container workloads use the `deployment` property with an application load balancer for gradual traffic shifting.

## When to use

Enable gradual deployments when a broken release would cause visible user impact and you want an automated safety net. Typical scenarios:

- **Production APIs handling real traffic** — a canary catches errors from 10% of requests before they hit everyone.
- **Services with complex runtime behavior** — issues that unit tests and staging can't catch (memory leaks, performance regressions, third-party dependency failures).
- **Teams shipping frequently** — multiple deploys per day benefit from automated rollback more than manual verification.

## When NOT to use

Gradual deployments add deploy-time complexity and extend total deployment duration by at least the strategy's wait interval. Skip them when:

- **You're in early development** — fast iteration matters more than zero-downtime guarantees.
- **The service has no inbound traffic** — background workers, cron jobs, and internal batch jobs don't benefit from traffic shifting. [Worker services](/resources/compute/worker-service) and [private services](/resources/compute/private-service) without a load balancer don't expose the `deployment` property.
- **You need the fastest possible deploys** — canary strategies add 5–30 minutes to your deploy cycle depending on the strategy chosen.
- **You use a network load balancer or HTTP API Gateway** — gradual deployments for container-based resources require `loadBalancing.type` set to `application-load-balancer`. The default `http-api-gateway` and `network-load-balancer` types do not support traffic shifting.

## Lambda function strategies

Lambda functions support nine deployment strategies through the `deployment` property on [LambdaFunction](/resources/compute/lambda-function). Underneath, AWS CodeDeploy manages the traffic shift between versions. If issues arise during the shift, traffic rolls back to the previous version automatically.

### Strategy reference

| Strategy | Behavior |
|----------|----------|
| `Canary10Percent5Minutes` | 10% immediately, remaining 90% after 5 minutes |
| `Canary10Percent10Minutes` | 10% immediately, remaining 90% after 10 minutes |
| `Canary10Percent15Minutes` | 10% immediately, remaining 90% after 15 minutes |
| `Canary10Percent30Minutes` | 10% immediately, remaining 90% after 30 minutes |
| `Linear10PercentEvery1Minute` | 10% more traffic every minute (full rollout in ~10 minutes) |
| `Linear10PercentEvery2Minutes` | 10% more every 2 minutes (full rollout in ~20 minutes) |
| `Linear10PercentEvery3Minutes` | 10% more every 3 minutes (full rollout in ~30 minutes) |
| `Linear10PercentEvery10Minutes` | 10% more every 10 minutes (full rollout in ~100 minutes) |
| `AllAtOnce` | Instant switch — no gradual rollout, but lifecycle hooks still run |

**Canary** strategies are the most common choice. They expose a small slice of traffic (10%) to the new version for a fixed window, giving you time to observe error rates and latency before the remaining 90% shifts all at once.

**Linear** strategies provide a smoother ramp-up. Use them when your function has load-dependent behavior (memory pressure, connection pool exhaustion, third-party rate limits) that only surfaces at higher concurrency.

**AllAtOnce** switches traffic instantly but still runs lifecycle hooks (`beforeAllowTrafficFunction`, `afterTrafficShiftFunction`). Use it when you want pre-flight validation without the gradual ramp.

### Basic Lambda example


Example (TypeScript):

```typescript
import { defineConfig, LambdaFunction, StacktapeLambdaBuildpackPackaging } from 'stacktape';
export default defineConfig(() => {
  const api = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/handler.ts'
    }),
    memory: 1024,
    timeout: 30,
    deployment: {
      strategy: 'Canary10Percent5Minutes'
    }
  });

  return { resources: { api } };
});
```


The `memory` value (in MB) sets Lambda memory and proportional CPU allocation, while `timeout` (in seconds) caps execution time — tune both for your handler. The gradual deployment behavior depends only on the `deployment.strategy` block. With `Canary10Percent5Minutes`, 10% of invocations go to the new version immediately. After 5 minutes with no issues, the remaining 90% shifts over. If issues arise during the canary window, traffic rolls back to the previous version automatically. Configure [alarms](/observability/alarms) or a `beforeAllowTrafficFunction` hook to define the failure signals that trigger rollback.

### Lambda lifecycle hooks

You can run validation functions before and after traffic shifts. The `beforeAllowTrafficFunction` runs before any user traffic reaches the new version — if it fails, the deployment rolls back without exposing users to the new code. The `afterTrafficShiftFunction` runs after all traffic has moved, useful for cleanup or notifications.

Both properties take the resource name of another Lambda function in your config.


Example (TypeScript):

```typescript
import { defineConfig, LambdaFunction, StacktapeLambdaBuildpackPackaging } from 'stacktape';
export default defineConfig(() => {
  const smokeTest = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/smoke-test.ts'
    }),
    timeout: 60
  });

  const api = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/handler.ts'
    }),
    memory: 1024,
    timeout: 30,
    deployment: {
      strategy: 'Canary10Percent10Minutes',
      beforeAllowTrafficFunction: 'smokeTest'
    }
  });

  return { resources: { smokeTest, api } };
});
```


The `smokeTest` function runs before any traffic shifts. Use it for health checks, integration verification, or testing the new version against a staging database. If the function signals failure, the deployment rolls back — no user traffic ever reaches the broken version.

## Container workload strategies

[Web services](/resources/compute/web-service) and [multi-container workloads](/resources/compute/multi-container-workload) support gradual deployments through the `deployment` property. Container traffic shifting follows the same canary, linear, or all-at-once pattern as Lambda, but routes through the application load balancer instead of Lambda aliases. Container workloads support five strategies with fewer time-interval options than Lambda.


> **Warning:** Gradual deployments for container workloads require an [application load balancer](/resources/networking/application-load-balancer). Set `loadBalancing.type` to `application-load-balancer` on your web service. The default `http-api-gateway` type does not support traffic shifting.


### Strategy reference

| Strategy | Behavior |
|----------|----------|
| `Canary10Percent5Minutes` | 10% immediately, remaining 90% after 5 minutes |
| `Canary10Percent15Minutes` | 10% immediately, remaining 90% after 15 minutes |
| `Linear10PercentEvery1Minutes` | 10% more every minute (full rollout in ~10 minutes) |
| `Linear10PercentEvery3Minutes` | 10% more every 3 minutes (full rollout in ~30 minutes) |
| `AllAtOnce` | Instant switch with no gradual shift |


> **Info:** Container strategies use slightly different naming than Lambda strategies. Note that `Linear10PercentEvery1Minutes` (with an "s") is the correct value for container workloads, while Lambda uses `Linear10PercentEvery1Minute` (no "s"). Copy the exact string from the table above to avoid deployment failures.


### Basic web service example


Example (TypeScript):

```typescript
import { defineConfig, WebService, StacktapeImageBuildpackPackaging } from 'stacktape';
export default defineConfig(() => {
  const api = new WebService({
    packaging: new StacktapeImageBuildpackPackaging({
      entryfilePath: './src/server.ts'
    }),
    environment: [
      {
        name: 'PORT',
        value: '3000'
      }
    ],
    resources: { cpu: 0.25, memory: 512 },
    loadBalancing: {
      type: 'application-load-balancer'
    },
    deployment: {
      strategy: 'Canary10Percent5Minutes'
    }
  });

  return { resources: { api } };
});
```


The `loadBalancing.type` must be `application-load-balancer` for the `deployment` property to work. An ALB costs ~$18/month plus usage-based charges — if you're currently using the default `http-api-gateway` (pay-per-request), this is the main cost difference when enabling gradual deployments.

### Container lifecycle hooks and test listener

Container workloads support the same `beforeAllowTrafficFunction` and `afterTrafficShiftFunction` hooks as Lambda functions. Additionally, the `testListenerPort` property specifies an ALB listener port for test traffic — only needed when using `beforeAllowTrafficFunction` with custom listeners.


Example (TypeScript):

```typescript
import {
  defineConfig,
  WebService,
  LambdaFunction,
  StacktapeImageBuildpackPackaging,
  StacktapeLambdaBuildpackPackaging
} from 'stacktape';
export default defineConfig(() => {
  const validateDeploy = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/validate-deploy.ts'
    }),
    timeout: 120
  });

  const api = new WebService({
    packaging: new StacktapeImageBuildpackPackaging({
      entryfilePath: './src/server.ts'
    }),
    environment: [
      {
        name: 'PORT',
        value: '3000'
      }
    ],
    resources: { cpu: 0.5, memory: 1024 },
    loadBalancing: {
      type: 'application-load-balancer'
    },
    deployment: {
      strategy: 'Linear10PercentEvery3Minutes',
      beforeAllowTrafficFunction: 'validateDeploy',
      testListenerPort: 9000
    }
  });

  return { resources: { validateDeploy, api } };
});
```


The `testListenerPort` property specifies an ALB listener port for test traffic. It is only needed when using `beforeAllowTrafficFunction` with custom listeners. In most cases, the before-hook validates using other means (checking health endpoints, running integration tests against external dependencies) and `testListenerPort` is not required.

## Choosing a strategy


## Feature Comparison

| Feature | Canary | Linear | AllAtOnce |
| --- | --- | --- | --- |
| Blast radius | Low (10% max exposure) | Gradual increase | Full (100% immediate) |
| Best for | Most production APIs | Load-sensitive services | Hook-only validation |
| Rollback window | During wait period | At any step | Before-hook only |
| Lambda options | 4 (5/10/15/30 min) | 4 (1/2/3/10 min) | 1 |
| Container options | 2 (5/15 min) | 2 (1/3 min) | 1 |


**For most teams, start with `Canary10Percent5Minutes`.** It balances safety (only 10% of users affected if the new version is broken) with speed (adds roughly 5 minutes to deploy time). Move to a longer canary window if your monitoring needs more time to detect issues — Lambda functions support `10Minutes`, `15Minutes`, and `30Minutes`; container workloads support `15Minutes`.

Use **linear** strategies when you suspect that issues only appear under load. A linear ramp gives you time to observe metrics at each traffic level — useful for services with connection pools, caches, or memory-intensive workloads that behave differently at 50% load than at 10%.

Use **AllAtOnce** when you want lifecycle hooks (before/after functions) but don't need gradual traffic shifting. The switch is instant, but your hooks still run and can block the deployment if validation fails.

## Deploy time impact

Gradual deployments extend total deployment time. The minimum overhead equals the strategy's built-in wait interval — `Canary10Percent5Minutes` adds at least 5 minutes. For Lambda functions, the strategy interval dominates. For container workloads, new container instances must also start and pass health checks before traffic shifting begins, which adds variable time depending on image size and startup behavior.

| Strategy type | Lambda intervals | Container intervals |
|--------------|-----------------|-------------------|
| Canary | 5, 10, 15, or 30 minutes | 5 or 15 minutes |
| Linear | 1, 2, 3, or 10 minutes per step (10 steps total) | 1 or 3 minutes per step |
| AllAtOnce | Instant | Instant |

## Rollback behavior

Stacktape gradual deployment rollback operates at the traffic-routing layer — Lambda alias weights or ALB target group routing are updated to redirect all traffic back to the previous version without a full redeploy. For Lambda functions, if issues arise during traffic shifting, Lambda automatically rolls back by restoring the alias weights to point 100% of traffic to the previous version. The `beforeAllowTrafficFunction` hook can also trigger a rollback by signaling failure — the deployment stops before any user traffic reaches the new code.

Container workloads configure the same `beforeAllowTrafficFunction` hook through `ContainerWorkloadDeploymentConfig`. The hook runs a Lambda function before traffic shifts to the new version for validation — see the [web service](/resources/compute/web-service) and [multi-container workload](/resources/compute/multi-container-workload) pages for container-specific deployment details.

For rolling back completed deployments to an earlier version of your stack, see [`stacktape rollback`](/cli/rollback).

## Writing lifecycle hook functions

For Lambda functions, both `beforeAllowTrafficFunction` and `afterTrafficShiftFunction` must signal success or failure to AWS CodeDeploy. If the before-hook fails, the deployment rolls back. Follow the [AWS CodeDeploy lifecycle event hooks documentation](https://docs.aws.amazon.com/codedeploy/latest/userguide/reference-appspec-file-structure-hooks.html) for the Lambda handler payload and response contract.

Container workloads use the same named hook properties (`beforeAllowTrafficFunction`, `afterTrafficShiftFunction`) through `ContainerWorkloadDeploymentConfig`, plus `testListenerPort`. See the [web service](/resources/compute/web-service) and [multi-container workload](/resources/compute/multi-container-workload) pages for container-specific hook behavior.

Set a generous `timeout` on hook functions so your validation logic has time to complete.

## Cost considerations

Gradual deployments themselves don't add AWS costs beyond what you pay for the underlying resources. However, there are indirect cost factors to consider:

- **Application load balancer** is required for container gradual deployments. ALBs cost ~$18/month plus usage-based charges (LCU pricing). If you're currently using the default `http-api-gateway` (pay-per-request at ~$1/million requests), switching to ALB is the main cost addition. The web service type documentation describes ALBs as generally more cost-effective above ~500k requests/day, though the exact break-even depends on your request size and traffic pattern.
- **Container workloads** may run additional container instances during the traffic-shifting window as the new version receives traffic alongside the old version. Factor in the potential for temporary extra Fargate or EC2 capacity costs, especially for longer linear ramp strategies.
- **Lambda functions** have no meaningful cost overhead from gradual deployments. The alias-based traffic shifting doesn't create extra invocations — the same request count simply splits across two versions.

## Lambda vs container comparison

| Aspect | Lambda functions | Web services / multi-container workloads |
|--------|-----------------|------------------------------------------|
| Strategies available | 9 (finer time granularity) | 5 |
| Load balancer required | No | Yes (`application-load-balancer`) |
| Auto-rollback | On failure or hook failure | Via hook validation |
| Lifecycle hooks | `beforeAllowTrafficFunction`, `afterTrafficShiftFunction` | Same, plus `testListenerPort` |
| Cost overhead | None | Temporary extra capacity during shift |
| Linear naming | `Linear10PercentEvery1Minute` (no "s") | `Linear10PercentEvery1Minutes` (with "s") |


## API Reference: `LambdaDeploymentConfig`
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

| Property | Required | Type | Description | Default |
| --- | --- | --- | --- | --- |
| `strategy` | yes | `string: "AllAtOnce" \| "Canary10Percent10Minutes" \| "Canary10Percent15Minutes" \| "Canary10Percent30Minutes" \| "Canary10Percent5Minutes" \| "Linear10PercentEvery10Minutes" \| "Linear10PercentEvery1Minute" \| "Linear10PercentEvery2Minutes" \| "Linear10PercentEvery3Minutes"` | How traffic shifts from the old version to the new one. **Canary**: Send 10% of traffic first, then all traffic after a wait period.
**Linear**: Shift 10% of traffic at regular intervals.
**AllAtOnce**: Instant switch (no gradual rollout). | - |
| `afterTrafficShiftFunction` | no | `string` | Function to run after all traffic has shifted (e.g., post-deploy validation). Must signal success/failure to CodeDeploy. | - |
| `beforeAllowTrafficFunction` | no | `string` | Function to run before traffic shifting begins (e.g., smoke tests). Must signal success/failure to CodeDeploy. If it fails, the deployment rolls back. | - |


The API reference above covers **Lambda deployment configuration only**. Container workloads use `ContainerWorkloadDeploymentConfig`, which has the same `strategy`, `beforeAllowTrafficFunction`, and `afterTrafficShiftFunction` properties plus `testListenerPort`. For the container deployment API reference, see the [web service](/resources/compute/web-service) and [multi-container workload](/resources/compute/multi-container-workload) pages.

## FAQ

### What happens if my deployment fails during the canary window?

For Lambda functions, traffic automatically reverts to the previous version — AWS CodeDeploy restores the alias weights to point 100% of traffic to the previous version. For container workloads, the `beforeAllowTrafficFunction` hook can block traffic from shifting to the new version. Rollback operates at the traffic-routing layer (Lambda alias weights or ALB target group routing).

### Can I use gradual deployments with HTTP API Gateway?

No. Gradual deployments for container workloads require an [application load balancer](/resources/networking/application-load-balancer). The default `http-api-gateway` load balancing type routes to a single target and does not support weighted traffic splitting. Lambda functions don't have this restriction — they use alias-based shifting and work regardless of how the function is triggered.

### How do I monitor the canary during deployment?

Use [`stacktape debug:logs`](/cli/debug-logs) to tail logs from the function or container in real time. You can also configure [alarms](/observability/alarms) on your resources to surface issues as they happen. CloudWatch metrics are available directly in AWS CloudWatch. Stacktape also provides [observability pages](/observability/overview) for metrics and alarms.

### Does AllAtOnce provide any benefit over a normal deployment?

Yes. `AllAtOnce` still runs your `beforeAllowTrafficFunction` before traffic shifts, giving you a pre-flight check (smoke test, integration verification) that can block the deployment. The `beforeAllowTrafficFunction` and `afterTrafficShiftFunction` hooks are properties within the `deployment` block — they are only available when `deployment` is configured.

### Can I use gradual deployments for private services or worker services?

[Private services](/resources/compute/private-service) and [worker services](/resources/compute/worker-service) do not expose the `deployment` property. Private services don't have internet-facing load balancers, and worker services have no inbound traffic to shift. If you need gradual deployments for an internal service, consider using a [multi-container workload](/resources/compute/multi-container-workload) with an ALB integration instead.

### Why are the strategy names different between Lambda and container workloads?

Lambda and container workloads use different AWS CodeDeploy deployment group types under the hood, which have slightly different built-in configuration names. The most notable difference is `Linear10PercentEvery1Minute` (Lambda, singular) vs `Linear10PercentEvery1Minutes` (container workloads, plural). Lambda also has more options — 9 strategies vs 5 for containers. Always copy the exact strategy string from the documentation for your resource type.

### Can I customize the canary percentage or timing?

No. The strategies use fixed percentages and intervals. All canary strategies shift 10% initially, and all linear strategies increment by 10% per step. If you need custom percentages or intervals, you can use [CloudFormation overrides](/configuration/overrides-and-escape-hatches) to define a custom deployment configuration, but this requires understanding the underlying AWS CodeDeploy configuration resources.

### How much does a gradual deployment cost compared to a normal deployment?

For Lambda functions, there's no additional cost — the same invocations are split across two versions. For container workloads, additional capacity may run during the traffic-shifting window as both old and new container versions serve traffic. The cost depends on CPU, memory, instance mode, region, and strategy duration.

### How fast does rollback happen?

Rollback is handled at the traffic-routing layer — Lambda alias weights or ALB target group routing are updated to point all traffic back to the previous version. Exact propagation time depends on AWS service behavior and the number of active connections draining from the new version.

### When should I use a longer canary window (15 or 30 minutes)?

Use longer canary windows when your monitoring needs time to accumulate statistically significant data. A 5-minute window works for APIs with consistent traffic (hundreds of requests per minute). If your service handles fewer requests, a 15-minute window ensures enough requests hit the new version to surface latency regressions or elevated error rates. Lambda functions additionally support 30-minute canary windows for cases where issues tend to be delayed — memory leaks, connection exhaustion, or cache warming that takes time to manifest.
