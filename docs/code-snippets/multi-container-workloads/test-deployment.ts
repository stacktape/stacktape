import { CodeDeployClient, PutLifecycleEventHookExecutionStatusCommand } from '@aws-sdk/client-codedeploy';
import fetch from 'node-fetch';

const client = new CodeDeployClient({});

export default async (event: { DeploymentId: string; LifecycleEventHookExecutionId: string }) => {
  const { DeploymentId: deploymentId, LifecycleEventHookExecutionId: lifecycleEventHookExecutionId } = event;
  try {
    // test new version by using test listener port
    await fetch(`http://${process.env.LB_DOMAIN}:${process.env.TEST_LISTENER_PORT}`);
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
