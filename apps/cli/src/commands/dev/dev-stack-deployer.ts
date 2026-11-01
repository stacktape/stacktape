import { resolveAllResources } from '@domain-services/calculated-stack-overview-manager/synthesize';
import { CliError, type ExpectedError } from '@utils/errors';
import {
  decideSkippedFunctionCode,
  findKeptFunctionsWithChangedConfiguration,
  type SkippedFunctionBuildReason
} from '@domain-services/deployment-artifact-manager/kept-function-code';
import {
  decideSkippedImages,
  findKeptImagesWithChangedConfiguration,
  type SkippedImageBuildReason
} from '@domain-services/deployment-artifact-manager/kept-image';
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
import {
  getCfResourceParamIntrinsic,
  getCfResourceParamOutput
} from '@domain-services/config-manager/built-in-directives';
import { potentiallyPromptBeforeOperation } from '../_utils/common';
import { assertNoLocalCfSecretReferences, findLocalCfResourceReferences } from './dev-stack-references';
import { findStartingStreamMappings, type StartingStreamMapping } from './stream-starting-position';

/** The images AWS pulls for the dev stack: batch jobs, AgentCore runtimes and the containers of Convex's workloads. */
const getRemoteImages = () => [
  ...configManager.containersToPackage.map(({ jobName, workloadName }) => ({ jobName, workloadName })),
  ...configManager.agentCoreRuntimesRequiringPackaging.map(({ jobName, name }) => ({ jobName, workloadName: name }))
];

/** The workloads whose images the dev stack keeps instead of building them (`decideSkippedImages`). */
const getKeptImageWorkloads = () => [
  ...new Set(
    getRemoteImages()
      .filter(({ jobName }) => deploymentArtifactManager.getKeptImage(jobName))
      .map(({ workloadName }) => workloadName)
  )
];

const SKIPPED_IMAGE_BUILD_CAUSES: Record<SkippedImageBuildReason, string> = {
  'not-deployed': 'the dev stack runs no image of it yet',
  'stored-image-missing': 'the image repository no longer holds the image it runs',
  'configuration-changed': 'its configuration changed, and its old image was never run with the new one'
};

/** Why the dev stack builds the image of a workload the session leaves out, which otherwise keeps the image it runs. */
export const describeSkippedImageBuild = (name: string, reason: SkippedImageBuildReason) =>
  `\`${name}\` runs in AWS and is not in this session, because the session leaves out functions, but ${SKIPPED_IMAGE_BUILD_CAUSES[reason]}, so the dev stack builds its image from your source. Later starts that leave out functions keep that image while its configuration stays the same.`;

/**
 * Builds the images that AWS pulls for the dev stack (batch jobs, AgentCore runtimes) and returns the resources whose
 * image the deployed dev stack does not run yet. A start skips the dev stack update when the configuration is unchanged,
 * so a changed image is what makes it update: the update pushes the image and points the job definition at it.
 * `deployDevStack` reuses these builds.
 *
 * A session that leaves out functions leaves these workloads out too (`configManager.devSkipsRemoteImages`): they keep
 * the image the dev stack runs and are not built, unless the dev stack has no stored image of them.
 */
export const packageDevStackImages = async (): Promise<string[]> => {
  const images = getRemoteImages();
  if (!images.length) return [];
  if (stackManager.existingStackDetails) {
    await deploymentArtifactManager.loadPreviousImages(deploymentArtifactManager.repositoryName, 'dev');
  }
  const decisions = configManager.devSkipsRemoteImages
    ? decideSkippedImages({
        images,
        deployedTemplate: stackManager.existingStackDetails ? templateManager.oldTemplate : undefined,
        repositoryUrl: deploymentArtifactManager.repositoryUrl,
        storedImageTags: new Set(deploymentArtifactManager.previousImages.map(({ tag }) => tag).filter(Boolean))
      })
    : [];
  deploymentArtifactManager.setKeptImages(
    new Map(decisions.flatMap((decision) => ('keep' in decision ? [...decision.keep] : [])))
  );
  const keptWorkloads = new Set(getKeptImageWorkloads());
  const imagesToBuild = images.filter(({ workloadName }) => !keptWorkloads.has(workloadName));
  if (!imagesToBuild.length) return [];
  await packageExplainingSkippedBuilds({
    skippedBuilds: decisions.flatMap((decision) =>
      'build' in decision ? [describeImageBuild(decision.workloadName, decision.build)] : []
    ),
    onlyWorkloads: [...new Set(imagesToBuild.map(({ workloadName }) => workloadName))]
  });
  const deployedTemplate = JSON.stringify(templateManager.oldTemplate ?? {});
  return [
    ...new Set(
      imagesToBuild
        .filter(({ jobName }) => {
          const image = deploymentArtifactManager.getImageUploadInfoForJob({ jobName })?.imageTagWithUrl;
          return !image || !deployedTemplate.includes(JSON.stringify(image));
        })
        .map(({ workloadName }) => workloadName)
    )
  ];
};

const SKIPPED_FUNCTION_BUILD_CAUSES: Record<SkippedFunctionBuildReason, string> = {
  'not-deployed': 'the dev stack has no code for it yet',
  'stored-code-missing': 'the deployment bucket no longer holds the code it runs',
  'code-unknown': 'an earlier update of its code did not finish, so the code it runs is unknown',
  'uses-shared-layers': 'it runs on shared layers that dev stacks no longer build',
  'configuration-changed': 'its configuration changed, and its old code was never run with the new one'
};

/** Why the dev stack builds a function the session leaves out, which otherwise keeps the code it runs. */
export const describeSkippedFunctionBuild = (name: string, reason: SkippedFunctionBuildReason) =>
  `\`${name}\` is not in this session, but ${SKIPPED_FUNCTION_BUILD_CAUSES[reason]}, so the dev stack builds it from your source. Later starts without it keep that code while its configuration stays the same.`;

/** A workload the session leaves out that the dev stack builds anyway, and why. */
type SkippedBuild = { description: string; isBuilt: () => boolean };

const describeFunctionBuild = (name: string, reason: SkippedFunctionBuildReason): SkippedBuild => ({
  description: describeSkippedFunctionBuild(name, reason),
  isBuilt: () => Boolean(packagingManager.getPackagingOutputForJob(name))
});

const describeImageBuild = (workloadName: string, reason: SkippedImageBuildReason): SkippedBuild => ({
  description: describeSkippedImageBuild(workloadName, reason),
  isBuilt: () =>
    getRemoteImages()
      .filter((image) => image.workloadName === workloadName)
      .every(({ jobName }) => packagingManager.getPackagingOutputForJob(jobName))
});

/**
 * Packages workloads; says first why each workload the session leaves out is built, and again when its build fails.
 */
const packageExplainingSkippedBuilds = async ({
  skippedBuilds,
  excludeWorkloads,
  onlyWorkloads
}: {
  skippedBuilds: SkippedBuild[];
  excludeWorkloads?: string[];
  onlyWorkloads?: string[];
}) => {
  skippedBuilds.forEach(({ description }) => tuiManager.info(description));
  try {
    await packagingManager.packageAllWorkloads({ commandCanUseCache: true, excludeWorkloads, onlyWorkloads });
  } catch (error) {
    const failedSkipped = skippedBuilds.filter(({ isBuilt }) => !isBuilt());
    if (error instanceof CliError && failedSkipped.length) {
      error.hints.push(...failedSkipped.map(({ description }) => `${description} Fix its build to start.`));
    }
    throw error;
  }
};

/**
 * Local containers, frontends and scripts read raw CloudFormation resources (`$CfResourceParam`) from the dev stack's
 * outputs. A deployment adds such an output when its template resolves the reference, but the dev template leaves those
 * workloads out, so the outputs are added here. A resource the dev stack does not deploy gets none: the workload's
 * environment then fails to resolve and names the variable.
 */
const addLocalCfResourceOutputs = () => {
  const resources = templateManager.template.Resources;
  const references = findLocalCfResourceReferences(configManager.config);
  // Raw resources were checked before any AWS work; the template also names the resources Stacktape synthesizes.
  assertNoLocalCfSecretReferences({
    references,
    resourceTypes: Object.fromEntries(Object.entries(resources).map(([name, { Type }]) => [name, Type]))
  });
  for (const { resourceName, property } of references) {
    if (!resources[resourceName]) continue;
    const value = getCfResourceParamIntrinsic({ resources, resourceName, property });
    templateManager.addStackOutput(getCfResourceParamOutput({ resourceName, property, value }));
  }
};

/**
 * Deploy a stripped-down dev stack.
 * This is similar to the regular deploy but:
 * 1. Excludes locally emulated resources (databases, redis, dynamodb)
 * 2. Excludes locally run resources (services, frontends); batch jobs and AgentCore runtimes run in AWS
 * 3. Marks the stack as a dev stack in metadata
 */
export const deployDevStack = async ({
  configFingerprint
}: {
  configFingerprint: string;
}): Promise<{ startingStreamMappings: StartingStreamMapping[] }> => {
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

  // Functions the session leaves out keep the code they run; only those the dev stack has no code for are built.
  const skippedFunctionCode = decideSkippedFunctionCode({
    functions: configManager.functions,
    skippedFunctionNames: configManager.devSkippedFunctionNames,
    deployedTemplate: stackManager.existingStackDetails ? templateManager.oldTemplate : undefined,
    deployedTags: (cfLogicalName) =>
      stackManager.existingStackResources.find(({ LogicalResourceId }) => LogicalResourceId === cfLogicalName)?.tags,
    storedObjects: deploymentArtifactManager.previousObjects
  });
  const keptFunctionCode = new Map(
    skippedFunctionCode.flatMap((decision) => ('keep' in decision ? [[decision.name, decision.keep]] : []))
  );
  deploymentArtifactManager.setKeptFunctionCode(keptFunctionCode);

  // Functions, and the images of what the dev stack deploys that `packageDevStackImages` has neither built nor kept.
  // Local services and frontends are built by the session itself.
  await packageExplainingSkippedBuilds({
    skippedBuilds: skippedFunctionCode.flatMap((decision) =>
      'build' in decision ? [describeFunctionBuild(decision.name, decision.build)] : []
    ),
    excludeWorkloads: [...keptFunctionCode.keys(), ...getKeptImageWorkloads()]
  });

  // Resolve resources (the config-manager should filter based on dev mode)
  await resolveAllResources();
  addLocalCfResourceOutputs();

  if (obfuscatedNamesStateHolder.usingObfuscateNames) {
    tuiManager.warn(
      'Project + stage name exceeds the AWS length limit, so some AWS resource names will be shortened with hashes. Everything works the same; only the names in the AWS console look less readable.'
    );
  }

  await calculatedStackOverviewManager.populateStackMetadata();
  await prepareTemplateForDeploy();

  // Old code and old images are kept only where nothing else about the workload changes. The others are built and the
  // template is finalized again, now naming their new code and images.
  const ownedLogicalNames = (name: string) => {
    try {
      return Object.keys(calculatedStackOverviewManager.getChildResourceList({ stpResourceName: name }));
    } catch {
      return [];
    }
  };
  const changedKeptFunctions = findKeptFunctionsWithChangedConfiguration({
    functions: configManager.functions.filter(({ name }) => keptFunctionCode.has(name)),
    ownedLogicalNames,
    template: templateManager.getTemplate(),
    deployedTemplate: templateManager.oldTemplate
  });
  const changedKeptImages = findKeptImagesWithChangedConfiguration({
    workloadNames: getKeptImageWorkloads(),
    ownedLogicalNames,
    template: templateManager.getTemplate(),
    deployedTemplate: templateManager.oldTemplate
  });
  if (changedKeptFunctions.length || changedKeptImages.length) {
    changedKeptFunctions.forEach((name) => keptFunctionCode.delete(name));
    deploymentArtifactManager.setKeptFunctionCode(keptFunctionCode);
    const changedImageJobs = new Set(
      getRemoteImages()
        .filter(({ workloadName }) => changedKeptImages.includes(workloadName))
        .map(({ jobName }) => jobName)
    );
    deploymentArtifactManager.setKeptImages(
      new Map(
        getRemoteImages().flatMap(({ jobName }) => {
          const kept = deploymentArtifactManager.getKeptImage(jobName);
          return kept && !changedImageJobs.has(jobName) ? [[jobName, kept] as const] : [];
        })
      )
    );
    await packageExplainingSkippedBuilds({
      skippedBuilds: [
        ...changedKeptFunctions.map((name) => describeFunctionBuild(name, 'configuration-changed')),
        ...changedKeptImages.map((name) => describeImageBuild(name, 'configuration-changed'))
      ],
      onlyWorkloads: [...changedKeptFunctions, ...changedKeptImages]
    });
    await prepareTemplateForDeploy();
  }

  // Register cloudformation private types if needed
  await cloudformationRegistryManager.registerLatestCfPrivateTypes(configManager.requiredCloudformationPrivateTypes);

  const cfTemplateDiff = templateManager.getOldTemplateDiff();
  const { abort } = await potentiallyPromptBeforeOperation({ cfTemplateDiff });

  if (abort) {
    await applicationManager.handleExitSignal('SIGINT');
    return { startingStreamMappings: [] };
  }
  const startingStreamMappings = findStartingStreamMappings({
    functions: configManager.functions,
    template: templateManager.getTemplate(),
    deployedTemplate: stackManager.existingStackDetails ? templateManager.oldTemplate : undefined
  });

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
  return { startingStreamMappings };
};
