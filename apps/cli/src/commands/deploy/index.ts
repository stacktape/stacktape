import type { ExpectedError } from '@utils/errors';
import type { PackageWorkloadOutput } from '@domain-services/packaging-manager/types';
import type { TemplateDiff } from '@aws-cdk/cloudformation-diff';
import { globalStateManager } from '@application-services/global-state-manager';
import { stpErrors } from '@errors';
import { stackMetadataNames } from '@stacktape/naming/stack-metadata-names';
import { fsPaths } from 'src/config/runtime-paths';
import { obfuscatedNamesStateHolder } from '@stacktape/naming/resource-names';
import {
  getCriticalResourcesPotentiallyEndangeredByOperation,
  getDetailedStackInfoMap
} from '@utils/stack-info-map-diff';
import {
  buildDeploymentChangePlan,
  formatDeploymentChangePlanSummary,
  getChangePlanProducerVersion,
  type DeploymentChangePlanV1
} from '@domain-services/deployment-change-plan';
import {
  injectEnvironmentToHostedHtmlFiles,
  potentiallyPromptBeforeOperation,
  saveDetailedStackInfoMap,
  writeEnvironmentDotenvFile
} from '../_utils/common';
import { getECSHotswapInformation, updateEcsService } from '../_utils/cw-deployment';
import { getLambdaFunctionHotswapInformation, updateFunctionCode } from '../_utils/fn-deployment';
import { initializeDeployOperation } from '../_utils/initialization';
import { promptCiCdSetupAfterDeploy } from '../_utils/cicd-setup';
import { deployConvexFunctions } from '../_utils/convex-post-deploy';
import { ensureMissingSecretsCreated } from '../_utils/secret-preflight';
import { ensureMissingSsmParamsCreated } from '../_utils/ssm-param-preflight';
import { deployWithCodebuildRunner } from './codebuild-runner';
import { deployWithEc2Runner } from './ec2-runner';
import { buildPreviewResourceChanges } from '../diff/utils';
import { ensureManagedEmailSenders } from '@domain-services/email-sender-manager';

type DeployOperation = Awaited<ReturnType<typeof initializeDeployOperation>>;

type FullDeployOperation = {
  deploymentArtifacts: {
    cloudformationTemplateUrl: string;
    deleteAllObsoleteArtifacts: () => Promise<unknown>;
    deleteArtifactsFixedDeploy: () => Promise<unknown>;
    deleteArtifactsRollbackedDeploy: () => Promise<unknown>;
  };
  stack: {
    deployStack: (templateUrl: string) => Promise<{ warningMessages?: string[] }>;
    existingStackDetails?: { StackStatus?: string };
    isAutoRollbackEnabled: boolean;
  };
  tui: Pick<DeployOperation['tui'], 'warn'>;
};

export const commandDeploy = async () => {
  const runner = globalStateManager.args.runner ?? 'local';
  if (runner === 'codebuild') {
    return deployWithCodebuildRunner();
  }
  if (runner === 'ec2') {
    return deployWithEc2Runner();
  }
  return deployLocally();
};

const deployLocally = async () => {
  const {
    args,
    application,
    budget,
    calculatedStackOverview,
    cloudformationRegistry,
    cloudfront,
    config,
    deployedStackOverview,
    deploymentArtifacts,
    event,
    notification,
    packaging,
    prepareTemplateForDeploy,
    stack,
    stackContext,
    stacktapeApi,
    template,
    tui
  } = await initializeDeployOperation();

  // Check if trying to deploy to an existing dev stack
  if (deployedStackOverview.getStackMetadata(stackMetadataNames.isDevStack())) {
    throw stpErrors.e141({
      stackName: stackContext.stackName,
      stage: stackContext.stage
    });
  }

  config.validateGuardrails({ hasConfig: true });

  const issueDetectionPolicy = config.issueDetectionPolicy;
  if (issueDetectionPolicy.enabled) {
    const issueHighVolumeProtection =
      issueDetectionPolicy.eventSamplingRate < 100
        ? `, processing ${issueDetectionPolicy.eventSamplingRate}% of matching events`
        : ', processing all matching events';
    tui.info(`Issues: enabled (${issueDetectionPolicy.reason}${issueHighVolumeProtection}).`);
  }

  await ensureMissingSecretsCreated();
  await ensureMissingSsmParamsCreated();

  event.setPhase('BUILD_AND_PACKAGE');
  const [{ packagedWorkloads, cfTemplateDiff: initialCfTemplateDiff }] = await Promise.all([
    prepareArtifactsForStackDeployment({
      calculatedStackOverview,
      packaging,
      prepareTemplateForDeploy,
      template,
      tui
    }),
    // @note this can take a long time, so we do it in parallel with other stack activities
    cloudformationRegistry.registerLatestCfPrivateTypes(config.requiredCloudformationPrivateTypes)
  ]);

  // here we decide if we will do hotswap(fast deploy) or full deploy
  let useHotswap = false;
  let cfTemplateDiff = initialCfTemplateDiff;
  if (args.hotSwap) {
    const { isHotswapPossible = false, hotSwappableWorkloadsWhoseCodeWillBeUpdatedByCloudformation = [] } =
      stack.stackActionType !== 'create' &&
      deployedStackOverview.analyzeCloudformationTemplateDiff({
        cfTemplateDiff
      });
    useHotswap = isHotswapPossible;
    if (!useHotswap) {
      // in this case we are falling back to standard Cloudformation deploy
      tui.warn('Hot-swap not possible; running full CloudFormation deploy.');
      // this means we might need to create new versions for some packages(jobs) that were previously skipped
      // otherwise Cloudformation might not detect the change
      // currently we are only able to create new versions by uploading new artifacts.
      // this can be skipped if we are creating new stack
      if (stack.stackActionType !== 'create') {
        await packaging.repackageSkippedPackagingJobsCurrentlyUsingHotSwapDeploy({
          ignoreWorkloads: hotSwappableWorkloadsWhoseCodeWillBeUpdatedByCloudformation.map(
            ({ stpResourceName }) => stpResourceName
          )
        });
        // after we repackaged some of the resources (potentially)
        // we must rerun prepare deploy to reflect changes in cloudformation template
        await prepareTemplateForDeploy();
        cfTemplateDiff = template.getOldTemplateDiff();
      }
    }
  }

  let changePlan: DeploymentChangePlanV1 | undefined;
  if (!useHotswap) {
    const dangerousResources = getCriticalResourcesPotentiallyEndangeredByOperation({
      calculatedStackInfoMap: calculatedStackOverview.stackInfoMap,
      deployedStackInfoMap: deployedStackOverview.stackInfoMap,
      cfTemplateDiff
    });
    const resourceChanges = buildPreviewResourceChanges({
      calculatedStackInfoMap: calculatedStackOverview.stackInfoMap,
      deployedStackInfoMap: deployedStackOverview.stackInfoMap,
      cfTemplateDiff,
      changes: []
    });
    changePlan = buildDeploymentChangePlan({
      cliVersion: getChangePlanProducerVersion(),
      target: {
        awsAccountId: stackContext.accountId,
        region: stackContext.region,
        projectName: stackContext.projectName,
        stage: stackContext.stage,
        stackName: stackContext.stackName
      },
      action: stack.stackActionType === 'create' ? 'create' : 'update',
      changeEvidence: 'local-template-diff',
      deploymentVersion: stack.nextVersion,
      stackId: stack.existingStackDetails?.StackId,
      previousDeploymentVersion: stack.lastVersion,
      previousTemplate: stack.stackActionType === 'update' ? template.oldTemplate : undefined,
      template: template.getTemplate(),
      artifacts: packagedWorkloads,
      resourceChanges,
      dangerousResources
    });
    tui.info(formatDeploymentChangePlanSummary(changePlan));

    // Approval must describe the last finalized template. A hotswap fallback can
    // repackage workloads and finalize again, so prompting during initial preparation
    // would approve a different change from the one that is uploaded below.
    const { abort } = await potentiallyPromptBeforeOperation({ cfTemplateDiff });
    if (abort) {
      await application.handleExitSignal('SIGINT');
      return;
    }
  }

  // A newly added/changed EmailSender changes StackInfo and therefore cannot enter the hotswap path. Existing
  // dependencies were already ensured by their full deployment, so keep routine code hotswaps free of this preflight.
  if (!useHotswap) {
    await ensureManagedEmailSenders();
  }
  if (stack.stackActionType === 'create') {
    await stack.createResourcesForArtifacts();
  }

  // deploy all artifacts - use versions depending on whether this is hotswap or not
  event.setPhase('UPLOAD');
  await deploymentArtifacts.uploadAllArtifacts({ useHotswap });

  await notification.sendDeploymentNotification({
    message: {
      text: 'Deployment started',
      type: 'progress',
      details: { deploymentMode: useHotswap ? 'Hotswap' : 'Full deployment' }
    }
  });

  event.setPhase('DEPLOY');
  if (useHotswap) {
    await performHotswapDeploy({ config, event });
  } else {
    await performFullDeploy({ deploymentArtifacts, stack, tui });
  }

  event.setPhase('POST_DEPLOY');

  // refreshing stack details is only useful if we used full deploy
  if (!useHotswap) {
    await Promise.all([
      stack.refetchStackDetails(stackContext.stackName),
      budget.loadBudgets(),
      stacktapeApi.deleteUndeployedStage()
    ]);
    await deployedStackOverview.refreshStackInfoMap({
      stackDetails: stack.existingStackDetails,
      stackResources: stack.existingStackResources,
      budgetInfo: budget.getBudgetInfoForSpecifiedStack({ stackName: stackContext.stackName })
    });
  }

  await deployConvexFunctions();

  if (config.allBucketsToSync.length) {
    await injectEnvironmentToHostedHtmlFiles();
    await deploymentArtifacts.syncBuckets();
    await deploymentArtifacts.saveBucketSyncManifest(stack.nextVersion);
    await writeEnvironmentDotenvFile();
  }

  if (config.allResourcesWithCdnsToInvalidate.length) {
    await cloudfront.invalidateCaches();
  }

  // we need two versions of detailed stack info (with and without sensitive values) - one for saving other for returning
  const detailedStackInfo = getDetailedStackInfoMap({
    deployedStackInfoMap: deployedStackOverview.stackInfoMap,
    showSensitiveValues: args.showSensitiveValues
  });
  const detailedStackInfoSensitive = getDetailedStackInfoMap({
    deployedStackInfoMap: deployedStackOverview.stackInfoMap,
    showSensitiveValues: true
  });
  if (config.stackInfoDirPath) {
    await saveDetailedStackInfoMap({
      detailedStackInfo,
      outFormat: 'json',
      filePath: fsPaths.stackInfoPath({
        dirPath: config.stackInfoDirPath,
        stackName: stackContext.stackName
      })
    });
  }
  event.addFinalAction(() => deployedStackOverview.printShortStackInfo());

  await notification.sendDeploymentNotification({
    message: {
      text: 'Deployment succeeded',
      type: 'success',
      details: { deploymentMode: useHotswap ? 'Hotswap' : 'Full deployment' }
    }
  });

  const consoleUrl = `https://console.stacktape.com/projects/${stackContext.projectName}/${stackContext.stage}/overview`;
  const resourceLinks = deployedStackOverview.getResourceLinks();

  // Store completion info - setComplete will be called after afterDeploy hooks finish
  tui.setPendingCompletion({
    success: true,
    message: 'DEPLOYMENT SUCCESSFUL',
    links: resourceLinks,
    consoleUrl
  });

  // Prompt for CI/CD setup after successful deploy (only for new stacks in TTY mode)
  if (stack.stackActionType === 'create') {
    event.addFinalAction(() => promptCiCdSetupAfterDeploy());
  }

  return {
    stackInfo: detailedStackInfoSensitive,
    packagedWorkloads,
    ...(changePlan ? { changePlan } : {})
  };
};

export const prepareArtifactsForStackDeployment = async ({
  calculatedStackOverview,
  packaging,
  prepareTemplateForDeploy,
  template,
  tui
}: Pick<
  DeployOperation,
  'calculatedStackOverview' | 'packaging' | 'prepareTemplateForDeploy' | 'template' | 'tui'
>): Promise<{
  packagedWorkloads: PackageWorkloadOutput[];
  cfTemplateDiff: TemplateDiff;
}> => {
  const packagedWorkloads = await packaging.packageAllWorkloads({ commandCanUseCache: true });
  await calculatedStackOverview.resolveAllResources();
  if (obfuscatedNamesStateHolder.usingObfuscateNames) {
    tui.warn('Stack name too long (project+stage). Some resource names will be obfuscated.');
  }

  await calculatedStackOverview.populateStackMetadata();
  await prepareTemplateForDeploy();

  const cfTemplateDiff = template.getOldTemplateDiff();
  return { packagedWorkloads, cfTemplateDiff };
};

export const performFullDeploy = async ({ deploymentArtifacts, stack, tui }: FullDeployOperation) => {
  try {
    const { warningMessages } = await stack.deployStack(deploymentArtifacts.cloudformationTemplateUrl);
    warningMessages?.forEach((msg) => {
      tui.warn(msg);
    });
  } catch (err) {
    // cleanup in case error happened during deploy
    // when only monitoring failed, we do not know if stack operation failed or succeeded.
    // in such case we should not delete artifacts as that could result in broken stack
    if (stack.isAutoRollbackEnabled && (err as ExpectedError).type !== 'STACK_MONITORING') {
      await deploymentArtifacts.deleteArtifactsRollbackedDeploy();
    }
    throw err;
  }
  // if we have just fixed stack from UPDATE FAILED state, there can be some artifacts created during multiple fixing attempts
  // these artifacts need cleaning up before we delete old versions with deleteAllObsoleteArtifacts
  if (stack.existingStackDetails?.StackStatus === 'UPDATE_FAILED') {
    await deploymentArtifacts.deleteArtifactsFixedDeploy();
  }

  await deploymentArtifacts.deleteAllObsoleteArtifacts();
};

const performHotswapDeploy = async ({ config, event }: Pick<DeployOperation, 'config' | 'event'>) => {
  // we need to invalidate directives, because we have previously resolved (and cached) them for usage with CF
  // directives in some resources(multi-container-workloads) need to be "resolved" again using the local resolve
  config.invalidatePotentiallyChangedDirectiveResults();

  await event.startEvent({
    eventType: 'HOTSWAP_UPDATE',
    description: 'Performing hotswap update'
  });

  await event.updateEvent({
    eventType: 'HOTSWAP_UPDATE',
    additionalMessage: 'Determining compute resources to update'
  });
  // this includes web-services, private-services and worker-services
  const containerWorkloadsToBeUpdated = (
    await Promise.all(config.allContainerWorkloads.map((workload) => getECSHotswapInformation({ workload })))
  ).filter(({ ecsTaskDefinition, ecsService }) => ecsTaskDefinition.needsUpdate || ecsService.needsUpdate);

  const lambdaFunctionsToBeUpdated = (
    await Promise.all(
      config.allLambdasEligibleForHotswap.map((lambdaProps) => getLambdaFunctionHotswapInformation({ lambdaProps }))
    )
  ).filter(({ needsUpdate }) => needsUpdate);

  await event.updateEvent({ eventType: 'HOTSWAP_UPDATE' });

  const results = await Promise.all([
    ...containerWorkloadsToBeUpdated.map(updateEcsService),
    ...lambdaFunctionsToBeUpdated.map(updateFunctionCode)
  ]);

  await event.finishEvent({
    eventType: 'HOTSWAP_UPDATE',
    finalMessage: !results.length && 'No changes detected, nothing to update.'
  });
};
