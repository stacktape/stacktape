/** Command-only half of the init deploy-target check. Kept away from the pure browser contract. */

import { globalStateManager } from '@application-services/global-state-manager';
import { getStackName } from '@stacktape/naming/stacks';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import { CliError } from '@utils/errors';
import {
  classifyDeployTarget,
  readDeployConfigSha256,
  type DeployTargetObservation
} from '../../init/deploy/stack-expectation';
import { loadUserCredentials } from '../_utils/initialization';

/**
 * Probe using the credential/account resolver used by deploy, not the ambient Node provider chain.
 * Runs in its own child process so it cannot share the init command's global service singletons.
 */
export const inspectDeployTargetWithDeployCredentials = async (): Promise<DeployTargetObservation> => {
  const { args, region } = await loadUserCredentials();
  if (typeof args.projectName !== 'string' || typeof args.stage !== 'string' || typeof args.configPath !== 'string') {
    throw new CliError({
      category: 'CLI',
      code: 'CLI_STACK_TARGET_REQUIRED',
      message: 'A project, stage, and configuration path are required to check the deploy target.'
    });
  }
  const stackName = getStackName(args.projectName, args.stage);
  const [stack, configSha256] = await Promise.all([
    awsSdkManager.cloudFormation.getDetails(stackName),
    readDeployConfigSha256(args.configPath)
  ]);
  return classifyDeployTarget({
    accountId: globalStateManager.targetAwsAccount.awsAccountId,
    projectName: args.projectName,
    stage: args.stage,
    region,
    configSha256,
    stack
  });
};
