import { tuiManager } from '@application-services/tui-manager';
import { ExpectedError } from '@utils/errors';
import { isAgentMode } from '../_utils/agent-mode';
import { initializeControlPlaneOperation } from '../_utils/initialization';

export const commandInfoStack = async () => {
  const { apiClient, args } = await initializeControlPlaneOperation();
  const { stackName, projectName, stage, region, awsAccount } = args;

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

  const details = await apiClient.stackDetails({
    stackName: resolvedStackName,
    region: region!,
    awsAccountName: awsAccount
  });

  if (isAgentMode(args)) {
    tuiManager.info(JSON.stringify({ stackName: resolvedStackName, region: region!, ...details }, null, 2));
  } else {
    tuiManager.printStackDetails({ stackName: resolvedStackName, region: region!, details });
  }

  return details;
};
