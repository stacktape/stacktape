import { globalStateManager } from '@application-services/global-state-manager';
import { awsSdkManager } from '@utils/aws-sdk-manager';

/**
 * The environment of a deployed dev function, as AWS has it, read with the credentials and region this CLI selected.
 * Returns null if the function does not exist.
 */
export const getLambdaEnvVars = async (stpResourceName: string): Promise<Record<string, string> | null> => {
  try {
    const config = await awsSdkManager.lambda.getFunction({
      lambdaResourceName: `${globalStateManager.targetStack.stackName}-${stpResourceName}`
    });
    return config.Environment?.Variables || {};
  } catch (err) {
    const cause = (err as { cause?: unknown }).cause ?? err;
    if ((cause as Error).name === 'ResourceNotFoundException') return null;
    throw err;
  }
};
