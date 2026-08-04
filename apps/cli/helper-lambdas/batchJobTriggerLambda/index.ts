import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn';

const sfnClient = new SFNClient({ apiVersion: '2016-11-23' });

export default async (event: any, context: { awsRequestId: any }) => {
  const batchJobName = `${process.env.BATCH_JOB_NAME_BASE}-${context.awsRequestId}`;
  console.info(`Starting state machine ${process.env.STATE_MACHINE_NAME} for batchJob ${batchJobName}`);
  // console.info('Trigger event:', event);
  const stateMachineName = `${process.env.BATCH_JOB_NAME_BASE.slice(0, 40)}-${context.awsRequestId}`;
  const { executionArn } = await sfnClient.send(
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
      message: `Successfully started batch job state machine with name ${process.env.STATE_MACHINE_NAME}-${context.awsRequestId}`,
      stateMachineName,
      stateMachineExecutionArn: executionArn
    }),
    isBase64Encoded: false,
    headers: {}
  };
};
