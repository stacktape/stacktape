# Hook functions

You can use hook functions to perform checks during deployment, including sending test traffic to a new version before it receives production traffic.

```yaml
resources:
  myLoadBalancer:
    type: application-load-balancer

  myApp:
    type: multi-container-workload
    properties:
      containers:
        - name: api-container
          packaging:
            type: stacktape-image-buildpack
            properties:
              entryfilePath: src/index.ts
          events:
            - type: application-load-balancer
              properties:
                loadBalancerName: myLoadBalancer
                containerPort: 80
                priority: 1
                paths: ['*']
      resources:
        cpu: 2
        memory: 2048
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