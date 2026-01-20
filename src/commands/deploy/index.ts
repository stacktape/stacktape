import type { TemplateDiff } from '@aws-cdk/cloudformation-diff';
import { applicationManager } from '@application-services/application-manager';
import { eventManager } from '@application-services/event-manager';
import { globalStateManager } from '@application-services/global-state-manager';
import { stacktapeTrpcApiManager } from '@application-services/stacktape-trpc-api-manager';
import { tuiManager } from '@application-services/tui-manager';
import { budgetManager } from '@domain-services/budget-manager';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { cloudformationRegistryManager } from '@domain-services/cloudformation-registry-manager';
import { stackManager } from '@domain-services/cloudformation-stack-manager';
import { cloudfrontManager } from '@domain-services/cloudfront-manager';
import { configManager } from '@domain-services/config-manager';
import { validateGuardrails } from '@domain-services/config-manager/utils/validation';
import { deployedStackOverviewManager } from '@domain-services/deployed-stack-overview-manager';
import { stpErrors } from '@errors';
import { stackMetadataNames } from '@shared/naming/metadata-names';
import { deploymentArtifactManager } from '@domain-services/deployment-artifact-manager';
import { notificationManager } from '@domain-services/notification-manager';
import { packagingManager } from '@domain-services/packaging-manager';
import { templateManager } from '@domain-services/template-manager';
import { fsPaths } from '@shared/naming/fs-paths';
import { obfuscatedNamesStateHolder } from '@shared/naming/utils';
import { getDetailedStackInfoMap } from '@utils/stack-info-map-diff';
import {
  injectEnvironmentToHostedHtmlFiles,
  potentiallyPromptBeforeOperation,
  saveDetailedStackInfoMap,
  writeEnvironmentDotenvFile
} from '../_utils/common';
import { getECSHotswapInformation, updateEcsService } from '../_utils/cw-deployment';
import { getLambdaFunctionHotswapInformation, updateFunctionCode } from '../_utils/fn-deployment';
import { initializeAllStackServices } from '../_utils/initialization';

export const commandDeploy = async (): Promise<DeployReturnValue> => {
  await initializeAllStackServices({
    commandRequiresDeployedStack: false,
    commandModifiesStack: true,
    loadGlobalConfig: true,
    requiresSubscription: true
  });

  // Check if trying to deploy to an existing dev stack
  if (deployedStackOverviewManager.getStackMetadata(stackMetadataNames.isDevStack())) {
    throw stpErrors.e141({
      stackName: globalStateManager.targetStack.stackName,
      stage: globalStateManager.targetStack.stage
    });
  }

  validateGuardrails(configManager.guardrails);

  eventManager.setPhase('BUILD_AND_PACKAGE');
  const [{ packagedWorkloads, abort, cfTemplateDiff }] = await Promise.all([
    prepareArtifactsForStackDeployment(),
    // @note this can take a long time, so we do it in parallel with other stack activities
    cloudformationRegistryManager.registerLatestCfPrivateTypes(configManager.requiredCloudformationPrivateTypes)
  ]);

  if (abort) {
    await applicationManager.handleExitSignal('SIGINT');
    return;
  }

  if (stackManager.stackActionType === 'create') {
    await stackManager.createResourcesForArtifacts();
  }

  // here we decide if we will do hotswap(fast deploy) or full deploy
  let useHotswap = false;
  if (globalStateManager.args.hotSwap) {
    const { isHotswapPossible = false, hotSwappableWorkloadsWhoseCodeWillBeUpdatedByCloudformation = [] } =
      stackManager.stackActionType !== 'create' &&
      deployedStackOverviewManager.analyzeCloudformationTemplateDiff({
        cfTemplateDiff
      });
    useHotswap = isHotswapPossible;
    if (!useHotswap) {
      // in this case we are falling back to standard Cloudformation deploy
      tuiManager.warn('Hot-swap not possible; running full CloudFormation deploy.');
      // this means we might need to create new versions for some packages(jobs) that were previously skipped
      // otherwise Cloudformation might not detect the change
      // currently we are only able to create new versions by uploading new artifacts.
      // this can be skipped if we are creating new stack
      if (stackManager.stackActionType !== 'create') {
        await packagingManager.repackageSkippedPackagingJobsCurrentlyUsingHotSwapDeploy({
          ignoreWorkloads: hotSwappableWorkloadsWhoseCodeWillBeUpdatedByCloudformation.map(
            ({ stpResourceName }) => stpResourceName
          )
        });
        // after we repackaged some of the resources (potentially)
        // we must rerun prepare deploy to reflect changes in cloudformation template
        await templateManager.prepareForDeploy();
      }
    }
  }

  // deploy all artifacts - use versions depending on whether this is hotswap or not
  eventManager.setPhase('UPLOAD');
  await deploymentArtifactManager.uploadAllArtifacts({ useHotswap });

  await notificationManager.sendDeploymentNotification({
    message: {
      text: `Deploying stack ${globalStateManager.targetStack.stackName}${useHotswap ? ' (using hotswap)' : ''}.`,
      type: 'progress'
    }
  });

  eventManager.setPhase('DEPLOY');
  if (useHotswap) {
    await performHotswapDeploy();
  } else {
    await performFullDeploy();
  }

  // refreshing stack details is only useful if we used full deploy
  if (!useHotswap) {
    await Promise.all([
      stackManager.refetchStackDetails(globalStateManager.targetStack.stackName),
      budgetManager.loadBudgets(),
      stacktapeTrpcApiManager.deleteUndeployedStage()
    ]);
    await deployedStackOverviewManager.refreshStackInfoMap({
      stackDetails: stackManager.existingStackDetails,
      stackResources: stackManager.existingStackResources,
      budgetInfo: budgetManager.getBudgetInfoForSpecifiedStack({ stackName: globalStateManager.targetStack.stackName })
    });
  }

  if (configManager.allBucketsToSync.length) {
    await injectEnvironmentToHostedHtmlFiles();
    await deploymentArtifactManager.syncBuckets();
    await writeEnvironmentDotenvFile();
  }

  if (configManager.allResourcesWithCdnsToInvalidate.length) {
    await cloudfrontManager.invalidateCaches();
  }

  // we need two versions of detailed stack info (with and without sensitive values) - one for saving other for returning
  const detailedStackInfo = getDetailedStackInfoMap({
    deployedStackInfoMap: deployedStackOverviewManager.stackInfoMap,
    showSensitiveValues: globalStateManager.args.showSensitiveValues
  });
  const detailedStackInfoSensitive = getDetailedStackInfoMap({
    deployedStackInfoMap: deployedStackOverviewManager.stackInfoMap,
    showSensitiveValues: true
  });
  if (configManager.stackInfoDirPath) {
    await saveDetailedStackInfoMap({
      detailedStackInfo,
      outFormat: 'json',
      filePath: fsPaths.stackInfoPath({
        dirPath: configManager.stackInfoDirPath,
        stackName: globalStateManager.targetStack.stackName
      })
    });
  }
  if (globalStateManager.invokedFrom === 'cli') {
    eventManager.addFinalAction(() => deployedStackOverviewManager.printShortStackInfo());
  }

  await notificationManager.sendDeploymentNotification({
    message: {
      text: `Stack ${globalStateManager.targetStack.stackName} deployed successfully${useHotswap ? ' (using hotswap)' : ''}.`,
      type: 'success'
    }
  });

  const consoleUrl = `https://console.stacktape.com/projects/${globalStateManager.targetStack.projectName}/${globalStateManager.stage}/overview`;
  const resourceLinks = deployedStackOverviewManager.getResourceLinks();

  // Store completion info - setComplete will be called after afterDeploy hooks finish
  tuiManager.setPendingCompletion({
    success: true,
    message: 'DEPLOYMENT SUCCESSFUL',
    links: resourceLinks,
    consoleUrl
  });

  return { stackInfo: detailedStackInfoSensitive, packagedWorkloads };
};

export const prepareArtifactsForStackDeployment = async (): Promise<{
  packagedWorkloads: PackageWorkloadOutput[];
  cfTemplateDiff: TemplateDiff;
  abort: boolean;
}> => {
  const packagedWorkloads = await packagingManager.packageAllWorkloads({ commandCanUseCache: true });
  await calculatedStackOverviewManager.resolveAllResources();
  if (obfuscatedNamesStateHolder.usingObfuscateNames) {
    tuiManager.warn('Stack name too long (project+stage). Some resource names will be obfuscated.');
  }

  await calculatedStackOverviewManager.populateStackMetadata();
  await templateManager.prepareForDeploy();

  const cfTemplateDiff = templateManager.getOldTemplateDiff();
  const { abort } = await potentiallyPromptBeforeOperation({ cfTemplateDiff });

  return { abort, packagedWorkloads, cfTemplateDiff };
};

const performFullDeploy = async () => {
  try {
    const { warningMessages } = await stackManager.deployStack(deploymentArtifactManager.cloudformationTemplateUrl);
    warningMessages?.forEach((msg) => {
      tuiManager.warn(msg);
    });
  } catch (err) {
    // cleanup in case error happened during deploy
    // when only monitoring failed, we do not know if stack operation failed or succeeded.
    // in such case we should not delete artifacts as that could result in broken stack
    if (stackManager.isAutoRollbackEnabled && (err as ExpectedError).type !== 'STACK_MONITORING') {
      await deploymentArtifactManager.deleteArtifactsRollbackedDeploy();
    }
    throw err;
  }
  // if we have just fixed stack from UPDATE FAILED state, there can be some artifacts created during multiple fixing attempts
  // these artifacts need cleaning up before we delete old versions with deleteAllObsoleteArtifacts
  if (stackManager.existingStackDetails?.StackStatus === 'UPDATE_FAILED') {
    await deploymentArtifactManager.deleteArtifactsFixedDeploy();
  }

  await deploymentArtifactManager.deleteAllObsoleteArtifacts();
};

const performHotswapDeploy = async () => {
  // we need to invalidate directives, because we have previously resolved (and cached) them for usage with CF
  // directives in some resources(multi-container-workloads) need to be "resolved" again using the local resolve
  configManager.invalidatePotentiallyChangedDirectiveResults();

  await eventManager.startEvent({
    eventType: 'HOTSWAP_UPDATE',
    description: 'Performing hotswap update'
  });

  await eventManager.updateEvent({
    eventType: 'HOTSWAP_UPDATE',
    additionalMessage: 'Determining compute resources to update'
  });
  // this includes web-services, private-services and worker-services
  const containerWorkloadsToBeUpdated = (
    await Promise.all(configManager.allContainerWorkloads.map((workload) => getECSHotswapInformation({ workload })))
  ).filter(({ ecsTaskDefinition, ecsService }) => ecsTaskDefinition.needsUpdate || ecsService.needsUpdate);

  const lambdaFunctionsToBeUpdated = (
    await Promise.all(
      configManager.allLambdasEligibleForHotswap.map((lambdaProps) =>
        getLambdaFunctionHotswapInformation({ lambdaProps })
      )
    )
  ).filter(({ needsUpdate }) => needsUpdate);

  await eventManager.updateEvent({ eventType: 'HOTSWAP_UPDATE' });

  const results = await Promise.all([
    ...containerWorkloadsToBeUpdated.map(updateEcsService),
    ...lambdaFunctionsToBeUpdated.map(updateFunctionCode)
  ]);

  await eventManager.finishEvent({
    eventType: 'HOTSWAP_UPDATE',
    finalMessage: !results.length && 'No changes detected, nothing to update.'
  });
};
