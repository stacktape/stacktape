import { tuiManager } from '@application-services/tui-manager';
import { CliError } from '@utils/errors';
import { isAgentMode } from '../_utils/agent-mode';
import { initializeControlPlaneOperation } from '../_utils/initialization';

export const resolveInfoStackName = ({
  projectName,
  stackName,
  stage
}: {
  projectName?: string;
  stackName?: string;
  stage?: string;
}) => {
  if (stackName) {
    return stackName;
  }
  if (projectName && stage) {
    return `${projectName}-${stage}`;
  }
  throw new CliError({
    category: 'CLI',
    code: 'CLI_STACK_TARGET_REQUIRED',
    message: 'A stack target is required.',
    hints: 'Provide `--stackName`, or provide both `--projectName` and `--stage`.'
  });
};

export const commandInfoStack = async () => {
  const { apiClient, args } = await initializeControlPlaneOperation();
  const { stackName, projectName, stage, region, awsAccount } = args;

  const resolvedStackName = resolveInfoStackName({ stackName, projectName, stage });

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
