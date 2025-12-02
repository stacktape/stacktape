# Hook functions

You can use hook functions to run checks before, during, or after a deployment.

```yaml
resources:
  webService:
    type: web-service
    properties:
      packaging:
        type: stacktape-image-buildpack
        properties:
          entryfilePath: src/main.ts
      resources:
        cpu: 2
        memory: 2048
      loadBalancing:
        type: application-load-balancer
      # {start-highlight}
      deployment:
        strategy: Canary10Percent5Minutes
        afterTrafficShiftFunction: validateDeployment
      # {stop-highlight}

  validateDeployment:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/validate-deployment.ts
```

```typescript
import { CodeDeployClient, PutLifecycleEventHookExecutionStatusCommand } from '@aws-sdk/client-codedeploy';

const client = new CodeDeployClient({});

export default async (event) => {
  // read DeploymentId and LifecycleEventHookExecutionId from payload
  const { DeploymentId, LifecycleEventHookExecutionId } = event;

  // performing validations here

  await client.send(
    new PutLifecycleEventHookExecutionStatusCommand({
      deploymentId: DeploymentId,
      lifecycleEventHookExecutionId: LifecycleEventHookExecutionId,
      status: 'Succeeded' // status can be 'Succeeded' or 'Failed'
    })
  );
};
```

> Code for the `validateDeployment` function.

### Test traffic listener

When using the `beforeAllowTraffic` hook, you can use a test listener to send traffic to the new version of your service before it receives production traffic. By default, the test listener is created on port `8080`.

```yaml
resources:
  webService:
    type: web-service
    properties:
      packaging:
        type: stacktape-image-buildpack
        properties:
          entryfilePath: src/main.ts
      resources:
        cpu: 2
        memory: 2048
      loadBalancing:
        type: application-load-balancer
      # {start-highlight}
      deployment:
        strategy: Canary10Percent5Minutes
        beforeAllowTrafficFunction: testDeployment
      # {stop-highlight}

  testDeployment:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/test-deployment.ts
      environment:
        - name: WEB_SERVICE_URL
          value: $ResourceParam('webService', 'url')
        - name: TEST_LISTENER_PORT
          value: 8080
```

```typescript
import { CodeDeployClient, PutLifecycleEventHookExecutionStatusCommand } from '@aws-sdk/client-codedeploy';
import fetch from 'node-fetch';

const client = new CodeDeployClient({});

export default async (event: { DeploymentId: string; LifecycleEventHookExecutionId: string }) => {
  const { DeploymentId: deploymentId, LifecycleEventHookExecutionId: lifecycleEventHookExecutionId } = event;
  try {
    // test new version by using test listener port
    await fetch(`${process.env.WEB_SERVICE_URL}:${process.env.TEST_LISTENER_PORT}`);
    // validate result
    // do some other tests ...
  } catch (err) {
    // send FAILED status if error occurred
    await client.send(
      new PutLifecycleEventHookExecutionStatusCommand({
        deploymentId,
        lifecycleEventHookExecutionId,
        status: 'Failed'
      })
    );
    throw err;
  }
  // send SUCCEEDED status after successful testing
  await client.send(
    new PutLifecycleEventHookExecutionStatusCommand({
      deploymentId,
      lifecycleEventHookExecutionId,
      status: 'Succeeded'
    })
  );
};
```

> Code for the `testDeployment` function.