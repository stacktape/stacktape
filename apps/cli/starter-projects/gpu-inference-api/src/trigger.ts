import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn';

const sfn = new SFNClient({});

const handler = async (event: { body: string }) => {
  const body = JSON.parse(event.body);
  const stateMachineArn = process.env.STP_INFERENCE_JOB_STATE_MACHINE_ARN!;

  const result = await sfn.send(
    new StartExecutionCommand({
      stateMachineArn,
      input: JSON.stringify(body)
    })
  );

  return {
    statusCode: 202,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'Inference job submitted', executionArn: result.executionArn })
  };
};

export default handler;
