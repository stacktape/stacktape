import { globalStateManager } from '@application-services/global-state-manager';
import { GetFunctionConfigurationCommand, LambdaClient, ResourceNotFoundException } from '@aws-sdk/client-lambda';
import { createFetchHandler } from 'src/aws/fetch-handler';

/**
 * The environment of a deployed dev function, as AWS has it. Returns null if the function does not exist or no region
 * is configured.
 */
export const getLambdaEnvVars = async (stpResourceName: string): Promise<Record<string, string> | null> => {
  const region = globalStateManager.region || process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION;
  if (!region) return null;
  const client = new LambdaClient({ region, requestHandler: createFetchHandler() });
  try {
    const config = await client.send(
      new GetFunctionConfigurationCommand({
        FunctionName: `${globalStateManager.targetStack.stackName}-${stpResourceName}`
      })
    );
    return config.Environment?.Variables || {};
  } catch (err) {
    if (err instanceof ResourceNotFoundException) return null;
    throw err;
  } finally {
    client.destroy();
  }
};
