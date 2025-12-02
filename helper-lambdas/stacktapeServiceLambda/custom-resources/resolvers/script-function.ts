import { CloudFormationClient, DescribeStacksCommand, StackStatus } from '@aws-sdk/client-cloudformation';
import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda';
import { NodeHttpHandler } from '@aws-sdk/node-http-handler';
import { fromUtf8, toUtf8 } from '@aws-sdk/util-utf8-node';
import { awsResourceNames } from '@shared/naming/aws-resource-names';
import { consoleLinks } from '@shared/naming/console-links';

// In order to honor the overall maximum timeout set for the target process,
// the default 2 minutes from AWS SDK has to be overridden
const lambdaClient = new LambdaClient({ requestHandler: new NodeHttpHandler({ socketTimeout: 900000 }) });
const cfClient = new CloudFormationClient({});

export const scriptFunction: ServiceLambdaResolver<StpServiceCustomResourceProperties['scriptFunction']> = async (
  currentProps,
  _previousProps,
  operation
) => {
  if ((operation === 'Create' || operation === 'Update') && currentProps.triggerType === 'after:deploy') {
    await invokeScriptFunction({
      functionName: currentProps.functionName as string,
      parameters: currentProps.parameters
    });
  }
  if (operation === 'Delete' && currentProps.triggerType === 'before:delete') {
    const { StackStatus: CurrentStackStatus } = (
      await cfClient.send(new DescribeStacksCommand({ StackName: process.env.STACK_NAME }))
    ).Stacks[0];
    if (CurrentStackStatus === StackStatus.DELETE_IN_PROGRESS) {
      await invokeScriptFunction({
        functionName: currentProps.functionName as string,
        parameters: currentProps.parameters
      });
    }
  }
  return { data: {} };
};

const invokeScriptFunction = async ({
  functionName,
  parameters
}: {
  functionName: string;
  parameters: StpServiceCustomResourceProperties['scriptFunction']['parameters'];
}) => {
  console.info(`executing script function ${functionName} with parameters`, parameters);
  const response = await lambdaClient.send(
    new InvokeCommand({ FunctionName: functionName, Payload: fromUtf8(JSON.stringify(parameters)) })
  );
  if (response.FunctionError) {
    const jsonError = parseReturnedErrorPayload(response.Payload, functionName);
    console.info('execution failed with following error', jsonError);
    throw new Error(
      `[${jsonError.errorType}] ${
        jsonError.errorMessage || `Undefined error when executing script function ${functionName}.`
      }\n\n${scriptLogGroupReference(functionName)}`
    );
  }
};

const parseReturnedErrorPayload = (
  errorPayload: Uint8Array,
  functionName: string
): { errorType?: string; errorMessage?: string; trace?: string[] } => {
  if (!errorPayload) {
    return {};
  }
  const payloadText = toUtf8(errorPayload);
  try {
    return JSON.parse(payloadText) as { errorType: string; errorMessage: string; trace: string[] };
  } catch {
    throw new Error(
      `Returned error from script is not valid JSON object. Received: "${payloadText}"\n\n${scriptLogGroupReference(
        functionName
      )}`
    );
  }
};

const scriptLogGroupReference = (functionName: string) => {
  return `Script logs:\n${consoleLinks.logGroup(
    process.env.AWS_REGION,
    awsResourceNames.lambdaLogGroup({ lambdaAwsResourceName: functionName })
  )}`;
};
