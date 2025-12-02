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
