import { resolveAllResources } from '@domain-services/calculated-stack-overview-manager/synthesize';
import type { ExpectedError } from '@utils/errors';
import { applicationManager } from '@application-services/application-manager';
import { operationReporter } from '@application-services/operation-manager';
import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { cloudformationRegistryManager } from '@domain-services/cloudformation-registry-manager';
import { stackManager } from '@domain-services/cloudformation-stack-manager';
import { configManager } from '@domain-services/config-manager';
import { deployedStackOverviewManager } from '@domain-services/deployed-stack-overview-manager';
import { deploymentArtifactManager } from '@domain-services/deployment-artifact-manager';
import { ensureApiGatewayCloudWatchRole } from '@domain-services/api-gateway-account';
import { ensureManagedEmailSenders } from '@domain-services/email-sender-manager';
import { packagingManager } from '@domain-services/packaging-manager';
import { templateManager } from '@domain-services/template-manager';
import { prepareTemplateForDeploy } from '@domain-services/template-manager/finalize';
import { stackMetadataNames } from '@stacktape/naming/stack-metadata-names';
import { obfuscatedNamesStateHolder } from '@stacktape/naming/resource-names';
import { potentiallyPromptBeforeOperation } from '../_utils/common';

/**
 * Builds the images that AWS pulls for the dev stack (batch jobs, AgentCore runtimes) and returns the resources whose
 * image the deployed dev stack does not run yet. A start skips the dev stack update when the configuration is unchanged,
 * so a changed image is what makes it update: the update pushes the image and points the job definition at it.
 * `deployDevStack` reuses these builds.
 */
export const packageDevStackImages = async (): Promise<string[]> => {
  const images = [
    ...configManager.containersToPackage.map(({ jobName, workloadName }) => ({ jobName, workloadName })),
    ...configManager.agentCoreRuntimesRequiringPackaging.map(({ jobName, name }) => ({ jobName, workloadName: name }))
  ];
  if (!images.length) return [];
  if (stackManager.existingStackDetails) {
    await deploymentArtifactManager.loadPreviousImages(deploymentArtifactManager.repositoryName, 'dev');
  }
  await packagingManager.packageAllWorkloads({
    commandCanUseCache: true,
    onlyWorkloads: images.map(({ workloadName }) => workloadName)
  });
  const deployedTemplate = JSON.stringify(templateManager.oldTemplate ?? {});
  return [
    ...new Set(
      images
        .filter(({ jobName }) => {
          const image = deploymentArtifactManager.getImageUploadInfoForJob({ jobName })?.imageTagWithUrl;
          return !image || !deployedTemplate.includes(JSON.stringify(image));
        })
        .map(({ workloadName }) => workloadName)
    )
  ];
};

/**
 * Deploy a stripped-down dev stack.
 * This is similar to the regular deploy but:
 * 1. Excludes locally emulated resources (databases, redis, dynamodb)
 * 2. Excludes locally run resources (services, frontends); batch jobs and AgentCore runtimes run in AWS
 * 3. Marks the stack as a dev stack in metadata
 */
export const deployDevStack = async ({ configFingerprint }: { configFingerprint: string }): Promise<void> => {
  tuiManager.info('Deploying dev stack...');

  operationReporter.setPhase('BUILD_AND_PACKAGE');

  // Set dev stack metadata
  calculatedStackOverviewManager.addStackMetadata({
    metaName: stackMetadataNames.isDevStack(),
    metaValue: true,
    showDuringPrint: false
  });
  calculatedStackOverviewManager.addStackMetadata({
    metaName: stackMetadataNames.devStackConfigFingerprint(),
    metaValue: configFingerprint,
    showDuringPrint: false
  });

  // An update reuses the stored code of unchanged functions. Dev mode does not list the deployment bucket when it starts
  // (see `deploymentArtifactManager.init`); without that list, every function and helper Lambda got a new S3 key, and
  // CloudFormation updated all of them for any change to the configuration.
  if (stackManager.existingStackDetails) {
    await deploymentArtifactManager.loadPreviousBucketObjects(deploymentArtifactManager.deploymentBucketName, 'dev');
  }

  // Functions, and the images of what the dev stack deploys that `packageDevStackImages` has not built. Local services
  // and frontends are built by the session itself.
  await packagingManager.packageAllWorkloads({ commandCanUseCache: true });

  // Resolve resources (the config-manager should filter based on dev mode)
  await resolveAllResources();

  if (obfuscatedNamesStateHolder.usingObfuscateNames) {
    tuiManager.warn(
      'Project + stage name exceeds the AWS length limit, so some AWS resource names will be shortened with hashes. Everything works the same; only the names in the AWS console look less readable.'
    );
  }

  await calculatedStackOverviewManager.populateStackMetadata();
  await prepareTemplateForDeploy();

  // Register cloudformation private types if needed
  await cloudformationRegistryManager.registerLatestCfPrivateTypes(configManager.requiredCloudformationPrivateTypes);

  const cfTemplateDiff = templateManager.getOldTemplateDiff();
  const { abort } = await potentiallyPromptBeforeOperation({ cfTemplateDiff });

  if (abort) {
    await applicationManager.handleExitSignal('SIGINT');
    return;
  }

  // Shared email resources are an accepted dependency of this exact dev-stack update. Ensure them only after the
  // user approves the finalized template and before any artifact or project-stack mutation begins.
  await ensureManagedEmailSenders();
  // Dev stacks leave WebSocket access logs out; this covers logs that `cloudformationResources` turn on.
  await ensureApiGatewayCloudWatchRole(templateManager.getTemplate());

  // In dev mode, stackActionType is 'dev' not 'create', but we still need to create the initial stack
  // Check existingStackDetails to determine if this is a new stack
  if (!stackManager.existingStackDetails) {
    await stackManager.createResourcesForArtifacts();
  }

  // Upload artifacts
  operationReporter.setPhase('UPLOAD');
  await deploymentArtifactManager.uploadAllArtifacts({ includeTemplates: true });

  // Deploy the stack
  operationReporter.setPhase('DEPLOY');
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

  // Refresh stack details. The template just deployed is the deployed one for the rest of the session.
  templateManager.oldTemplate = templateManager.getTemplate();
  await stackManager.refetchStackDetails(globalStateManager.targetStack.stackName);
  await deployedStackOverviewManager.refreshStackInfoMap({
    stackDetails: stackManager.existingStackDetails,
    stackResources: stackManager.existingStackResources
  });

  tuiManager.success('Dev stack deployed successfully');
};
