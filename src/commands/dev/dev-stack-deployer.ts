import { applicationManager } from '@application-services/application-manager';
import { eventManager } from '@application-services/event-manager';
import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { cloudformationRegistryManager } from '@domain-services/cloudformation-registry-manager';
import { stackManager } from '@domain-services/cloudformation-stack-manager';
import { configManager } from '@domain-services/config-manager';
import { deployedStackOverviewManager } from '@domain-services/deployed-stack-overview-manager';
import { deploymentArtifactManager } from '@domain-services/deployment-artifact-manager';
import { packagingManager } from '@domain-services/packaging-manager';
import { templateManager } from '@domain-services/template-manager';
import { stackMetadataNames } from '@shared/naming/metadata-names';
import { obfuscatedNamesStateHolder } from '@shared/naming/utils';
import { potentiallyPromptBeforeOperation } from '../_utils/common';

/**
 * Deploy a stripped-down dev stack.
 * This is similar to the regular deploy but:
 * 1. Excludes locally emulated resources (databases, redis, dynamodb)
 * 2. Excludes locally run resources (containers, frontends)
 * 3. Marks the stack as a dev stack in metadata
 */
export const deployDevStack = async (): Promise<void> => {
  tuiManager.info('Deploying dev stack...');

  eventManager.setPhase('BUILD_AND_PACKAGE');

  // Set dev stack metadata
  calculatedStackOverviewManager.addStackMetadata({
    metaName: stackMetadataNames.isDevStack(),
    metaValue: true,
    showDuringPrint: false
  });

  // Package workloads (only functions will actually be packaged since containers are excluded)
  await packagingManager.packageAllWorkloads({ commandCanUseCache: true });

  // Resolve resources (the config-manager should filter based on dev mode)
  await calculatedStackOverviewManager.resolveAllResources();

  if (obfuscatedNamesStateHolder.usingObfuscateNames) {
    tuiManager.warn('Stack name too long (project+stage). Some resource names will be obfuscated.');
  }

  await calculatedStackOverviewManager.populateStackMetadata();
  await templateManager.prepareForDeploy();

  // Register cloudformation private types if needed
  await cloudformationRegistryManager.registerLatestCfPrivateTypes(configManager.requiredCloudformationPrivateTypes);

  const cfTemplateDiff = templateManager.getOldTemplateDiff();
  const { abort } = await potentiallyPromptBeforeOperation({ cfTemplateDiff });

  if (abort) {
    await applicationManager.handleExitSignal('SIGINT');
    return;
  }

  // In dev mode, stackActionType is 'dev' not 'create', but we still need to create the initial stack
  // Check existingStackDetails to determine if this is a new stack
  if (!stackManager.existingStackDetails) {
    await stackManager.createResourcesForArtifacts();
  }

  // Upload artifacts
  eventManager.setPhase('UPLOAD');
  await deploymentArtifactManager.uploadAllArtifacts({ useHotswap: false });

  // Deploy the stack
  eventManager.setPhase('DEPLOY');
  try {
    const { warningMessages } = await stackManager.deployStack(deploymentArtifactManager.cloudformationTemplateUrl);
    warningMessages?.forEach((msg) => {
      tuiManager.warn(msg);
    });
  } catch (err) {
    // Cleanup in case error happened during deploy
    if (stackManager.isAutoRollbackEnabled && (err as ExpectedError).type !== 'STACK_MONITORING') {
      await deploymentArtifactManager.deleteArtifactsRollbackedDeploy();
    }
    throw err;
  }

  // If we have just fixed stack from UPDATE FAILED state, clean up artifacts
  if (stackManager.existingStackDetails?.StackStatus === 'UPDATE_FAILED') {
    await deploymentArtifactManager.deleteArtifactsFixedDeploy();
  }

  await deploymentArtifactManager.deleteAllObsoleteArtifacts();

  // Refresh stack details
  await stackManager.refetchStackDetails(globalStateManager.targetStack.stackName);
  await deployedStackOverviewManager.refreshStackInfoMap({
    stackDetails: stackManager.existingStackDetails,
    stackResources: stackManager.existingStackResources
  });

  tuiManager.success('Dev stack deployed successfully');
};

/**
 * Check if the current target stack is a dev stack.
 */
export const isCurrentStackDevStack = (): boolean => {
  return deployedStackOverviewManager.getStackMetadata(stackMetadataNames.isDevStack()) === true;
};

/**
 * Check if a dev stack needs to be deployed.
 * Returns true if:
 * 1. The stack doesn't exist yet
 * 2. The stack exists but is not a dev stack (error case - handled separately)
 */
export const devStackNeedsDeployment = (): boolean => {
  // If stack doesn't exist, we need to deploy
  if (!stackManager.existingStackDetails) {
    return true;
  }

  // If stack exists and is a dev stack, check if it needs updating
  // For now, always return false if stack exists (we'll use the existing stack)
  // In the future, we could compare config hashes to detect changes
  return false;
};
