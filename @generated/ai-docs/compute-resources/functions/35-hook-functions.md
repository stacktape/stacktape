# Hook functions

You can use hook functions to perform checks during deployment.

```yaml
resources:
  myLambda:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: path/to/my-lambda.ts
      # {start-highlight}
      deployment:
        strategy: Linear10PercentEvery1Minute
        beforeAllowTrafficFunction: validateDeployment
      # {stop-highlight}

  validateDeployment:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: validate.ts
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