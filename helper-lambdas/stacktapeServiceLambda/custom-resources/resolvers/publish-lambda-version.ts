import { LambdaClient, PublishVersionCommand } from '@aws-sdk/client-lambda';

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
  // On Delete: Do NOT delete the Lambda version.
  // Deleting the version during CloudFormation rollback causes alias update failures because
  // the alias still references this version. Instead, let old versions accumulate - they are
  // lightweight (just metadata pointing to the same code) and Lambda handles version limits.
  // When the entire Lambda function is deleted, all versions are automatically cleaned up.
  if (operation === 'Delete') {
    console.info(
      `Skipping deletion of function version (${physicalResourceId}) to prevent rollback failures. Version will be cleaned up when the Lambda function is deleted.`
    );
    return { data: {}, physicalResourceId };
  }
};
