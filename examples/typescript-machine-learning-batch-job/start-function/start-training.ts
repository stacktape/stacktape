import { ListExecutionsCommand, SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn';

const sfnClient = new SFNClient({ apiVersion: '2016-11-23' });

export default async (event: any, context: { awsRequestId: any }) => {
  const batchJobName = `mnist-training-${context.awsRequestId}`;
  const stateMachineName = `mnist-training-${context.awsRequestId}`;
  console.info('Starting state machine for training job');

  const { executions: currentExecutions } = await sfnClient.send(
    new ListExecutionsCommand({ stateMachineArn: process.env.STATE_MACHINE_ARN })
  );

  if (currentExecutions?.filter(({ status }) => status === 'RUNNING').length) {
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Training is in progress',
        trainingStatus: 'IN_PROGRESS'
      }),
      isBase64Encoded: false,
      headers: {}
    };
  }

  await sfnClient.send(
    new StartExecutionCommand({
      stateMachineArn: process.env.STATE_MACHINE_ARN,
      name: stateMachineName,
      input: JSON.stringify({
        triggerEvent: JSON.stringify(event),
        jobName: `${batchJobName}`
      })
    })
  );

  // @simon-todo is this correct for all events? (e.g. HTTP API might require result in other form... and all other synchronous invocations)
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Training successfully started',
      trainingStatus: 'IN_PROGRESS'
    }),
    isBase64Encoded: false,
    headers: {}
  };
};
