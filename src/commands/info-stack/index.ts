import { globalStateManager } from '@application-services/global-state-manager';
import { stacktapeTrpcApiManager } from '@application-services/stacktape-trpc-api-manager';
import { tuiManager } from '@application-services/tui-manager';
import { ExpectedError } from '@utils/errors';
import { isAgentMode } from '../_utils/agent-mode';

export const commandInfoStack = async () => {
  await stacktapeTrpcApiManager.init({ apiKey: globalStateManager.apiKey });

  const { stackName, projectName, stage, region, awsAccount } = globalStateManager.args;

  // Derive stackName from projectName-stage if not provided directly
  let resolvedStackName = stackName;
  if (!resolvedStackName) {
    if (projectName && stage) {
      resolvedStackName = `${projectName}-${stage}`;
    } else {
      throw new ExpectedError(
        'CLI',
        'Missing required arguments',
        'Provide either --stackName OR both --projectName and --stage'
      );
    }
  }

  const details = await stacktapeTrpcApiManager.apiClient.stackDetails({
    stackName: resolvedStackName,
    region: region!,
    awsAccountName: awsAccount
  });

  if (isAgentMode()) {
    tuiManager.info(JSON.stringify({ stackName: resolvedStackName, region: region!, ...details }, null, 2));
  } else {
    tuiManager.printStackDetails({ stackName: resolvedStackName, region: region!, details });
  }

  return details;
};
