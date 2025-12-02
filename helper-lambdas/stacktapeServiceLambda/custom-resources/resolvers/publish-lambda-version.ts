import {
  DeleteFunctionCommand,
  LambdaClient,
  PublishVersionCommand,
  ResourceNotFoundException
} from '@aws-sdk/client-lambda';

const lambdaClient = new LambdaClient({});

export const publishLambdaVersion: ServiceLambdaResolver<
  StpServiceCustomResourceProperties['publishLambdaVersion']
> = async (currentProps, _previousProps, operation, physicalResourceId) => {
  let FunctionArn: string;
  let Version: string;
  if (operation !== 'Delete') {
    console.info(`Calling publish function method (${currentProps.functionName})...`);
    ({ Version, FunctionArn } = await lambdaClient.send(
      new PublishVersionCommand({ FunctionName: currentProps.functionName as string })
    ));
    console.info(`Calling publish function method (${currentProps.functionName}) - SUCCESS`);
    return { data: { arn: FunctionArn, version: Version }, physicalResourceId: FunctionArn };
  }
  if (operation === 'Delete') {
    console.info(`Removing old function version (${currentProps.functionName})...`);
    await lambdaClient.send(new DeleteFunctionCommand({ FunctionName: physicalResourceId })).catch((err) => {
      if (err instanceof ResourceNotFoundException) {
        console.info(`Function version with arn ${physicalResourceId} does NOT exist.`);
        return;
      }
      throw err;
    });
    console.info(`Removing old function version (${currentProps.functionName}) - SUCCESS`);
    return { data: {}, physicalResourceId };
  }
};
