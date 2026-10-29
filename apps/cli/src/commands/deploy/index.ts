import { isStackCreatedByDev } from '../dev/dev-stack-safety';
import { codeSwapBeginMutation, codeSwapOperation } from '@domain-services/code-swap/lifecycle-hooks';
import { codeSwapComplete, codeSwapUseImage } from '@domain-services/code-swap/runtime';
import {
  recordSecurityReport,
  deleteUndeployedStage
} from '@application-services/stacktape-trpc-api-manager/operation-recording';
import { resolveAllResources } from '@domain-services/calculated-stack-overview-manager/synthesize';
import { createHash } from 'node:crypto';
import { CliError, type ExpectedError } from '@utils/errors';
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
  findReplacedBatchComputeEnvironments,
  formatBatchComputeEnvironmentReplacementWarning,
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
import { initializeDeployOperation } from '../_utils/initialization';
import { hintCodingAgentSetupAfterFirstDeploy } from '../_utils/coding-agent-hint';
import { promptCiCdSetupAfterDeploy } from '../_utils/cicd-setup';
import { deployConvexFunctions } from '../_utils/convex-post-deploy';
import { resolveSlackAppChannels } from '@domain-services/config-manager/utils/slack-app-channels';
import { buildUptimeChecksSyncPayload, withSyncRetries } from '@domain-services/config-manager/utils/uptime-checks';
import { ensureMissingSecretsCreated } from '../_utils/secret-preflight';
import { startSecurityInventory, uploadSecurityInventory } from '../_utils/security-inventory-step';
import { assessAndPrintSecurityPosture, describeSecurityReportRejection } from '../_utils/security-posture-output';
import { ensureMissingSsmParamsCreated } from '../_utils/ssm-param-preflight';
import { deployWithEc2Runner } from './ec2-runner';
import { createSharedLayerPublication, type FastDeployPlan, performFastDeploy, planFastDeploy } from './fast-deploy';
import { buildPreviewResourceChanges } from '../diff/utils';
import { ensureApiGatewayCloudWatchRole } from '@domain-services/api-gateway-account';
import { ensureManagedEmailSenders } from '@domain-services/email-sender-manager';
import {
  assertDeployTargetExpectation,
  classifyDeployTarget,
  INIT_TARGET_CHECK_ENV,
  INIT_TARGET_EXPECTATION_ENV,
  parseDeployTargetExpectation,
  readDeployConfigSha256
} from '../../init/deploy/stack-expectation';
import { inspectDeployTargetWithDeployCredentials } from './init-target-check';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import { confirmSharedNetworkUnchanged, prepareStageNetwork } from '@domain-services/shared-network';
import { SHARED_NAT_INSTANCE_TYPE } from '@domain-services/shared-network/template';
import { getSharedNatStackName } from '@stacktape/naming/shared-stacks';
import { newDistributionInputs } from '@domain-services/cloudfront-manager/new-distribution-inputs';
import { recordSourceMapActivation, recordSourceMapsBeforeSwitch } from '../_utils/source-map-manifest';
import { deleteSupersededSharedLayerVersions, getSharedLayerHotswapInformation } from '../_utils/fn-deployment';

type DeployOperation = Awaited<ReturnType<typeof initializeDeployOperation>>;

type FullDeployOperation = {
  deploymentArtifacts: {
    cloudformationTemplateUrl: string;
    deleteAllObsoleteArtifacts: () => Promise<unknown>;
    deleteArtifactsFixedDeploy: () => Promise<unknown>;
    deleteArtifactsRollbackedDeploy: () => Promise<unknown>;
    uploadPreviewTemplate: (input: {
      body: string;
    }) => Promise<{ templateUrl: string; deleteTemplate: () => Promise<unknown> }>;
  };
  stack: {
    createStack: (
      templateUrl: string
    ) => Promise<{ warningMessages?: string[]; resourcesDeletedInBackground?: number }>;
    deployStack: (
      templateUrl: string,
      options: { finishWhenCleanupStarts: boolean; allowExpressMode?: boolean }
    ) => Promise<{ warningMessages?: string[]; resourcesDeletedInBackground?: number }>;
    /** CloudFormation rolls this deploy back when it fails. */
    rollsBackOnFailure: boolean;
    getTemplateBeforeReplacing: () => { template: object; removedResources: string[] } | undefined;
    stackActionType: string;
  };
  tui: Pick<DeployOperation['tui'], 'info' | 'warn'>;
};

export const commandDeploy = async () => {
  // The init wizard probes in a fresh child so the check uses the exact account/profile resolver a
  // deploy will use without sharing this command's global singletons. It returns before config,
  // packaging, secrets, artifact buckets, or any CloudFormation mutation.
  if (process.env[INIT_TARGET_CHECK_ENV] === '1') {
    return inspectDeployTargetWithDeployCredentials();
  }
  // Snapshot before authored TypeScript configuration executes. Config is allowed to run code, so
  // process.env is transport only and must not remain the authority for the approved target.
  const initTargetExpectation = parseDeployTargetExpectation(process.env[INIT_TARGET_EXPECTATION_ENV]);
  const runner = globalStateManager.args.runner ?? 'local';
  if (initTargetExpectation !== undefined && runner !== 'local') {
    throw new CliError({
      category: 'STACK',
      code: 'INIT_DEPLOY_RUNNER_UNSUPPORTED',
      message: 'The init wizard can deploy only with the local runner.',
      hints: 'Run the remote-runner deploy manually after reviewing its target and implications.'
    });
  }
  if (runner === 'ec2') {
    if (globalStateManager.args.recoverOperation) {
      throw new CliError({
        category: 'DEPLOYMENT',
        code: 'CODE_SWAP_RECOVERY_LOCAL_RUNNER_REQUIRED',
        message: 'Recover the code-swap operation with the local runner.',
        hints:
          'Stop the previous invocation, wait for its AWS changes to finish, then run again with --runner local and --recover-operation.'
      });
    }
    return deployWithEc2Runner();
  }
  return deployLocally(initTargetExpectation);
};

const deployLocally = async (initTargetExpectation: ReturnType<typeof parseDeployTargetExpectation>) => {
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
    lifecycle,
    notification,
    packaging,
    progress,
    prepareTemplateForDeploy,
    stack,
    stackContext,
    stacktapeApi,
    template,
    tui
  } = await initializeDeployOperation({
    ...(initTargetExpectation === undefined ? {} : { skipRawConfigForTarget: true }),
    ...(initTargetExpectation === undefined
      ? {}
      : {
          // This is the first gate. It runs after the deploy command has selected credentials and
          // its immutable stack context, but before loading/executing authored config or hooks.
          beforeConfigInit: async (target) => {
            const [existingStack, configSha256] = await Promise.all([
              awsSdkManager.cloudFormation.getDetails(target.stackName),
              readDeployConfigSha256(globalStateManager.configPath)
            ]);
            assertDeployTargetExpectation({
              expectation: initTargetExpectation,
              observation: classifyDeployTarget({
                accountId: target.accountId,
                projectName: target.projectName,
                stage: target.stage,
                region: target.region,
                configSha256,
                stack: existingStack
              })
            });
          }
        })
  });

  // Recheck after initialization as well. The first assertion prevents config/hooks/install from
  // running against an unapproved target; this one protects the first generated-secret mutation
  // from a target transition during read-only initialization.
  if (initTargetExpectation !== undefined) {
    assertDeployTargetExpectation({
      expectation: initTargetExpectation,
      observation: classifyDeployTarget({
        accountId: stackContext.accountId,
        projectName: stackContext.projectName,
        stage: stackContext.stage,
        region: stackContext.region,
        configSha256: await readDeployConfigSha256(globalStateManager.configPath),
        stack: stack.existingStackDetails
      })
    });
  }
  if (initTargetExpectation?.expected === 'update') {
    // CloudFormation accepts the physical StackId anywhere it accepts StackName. Keep the friendly
    // name for deterministic resource naming/tags, but send the approved ARN for stack mutations so
    // a same-name replacement after this check fails instead of receiving the update.
    stack.bindExistingStackMutationsToId(initTargetExpectation.stackId);
  } else if (initTargetExpectation && stack.existingStackDetails?.StackId) {
    // An approved first deploy over the artifact-only stack an earlier attempt left updates exactly the stack just
    // checked.
    stack.bindExistingStackMutationsToId(stack.existingStackDetails.StackId);
  }

  // Check if trying to deploy to an existing dev stack. A dev stack rolled back to its bootstrap template has only its
  // stack tag left.
  if (
    isStackCreatedByDev({
      isDevStack: deployedStackOverview.getStackMetadata(stackMetadataNames.isDevStack()),
      tags: stack.existingStackDetails?.Tags
    })
  ) {
    throw stpErrors.e141({
      stackName: stackContext.stackName,
      stage: stackContext.stage
    });
  }

  await codeSwapOperation('deploy');
  config.validateGuardrails({ hasConfig: true });
  // A new distribution's certificate is looked up and its Stacktape edge functions are created while the deploy
  // prepares and builds, so CloudFront does not wait for the service Lambda's custom resources. Best effort; see
  // `new-distribution-inputs.ts`.
  newDistributionInputs.start({ stackContext });
  // Evaluated before the build so the findings sit next to the other pre-deploy notes; reported only after the
  // deployment succeeds, because they describe the configuration that is then actually running.
  const securityAssessment = assessAndPrintSecurityPosture({ config, tui, command: 'deploy' });

  const issueDetectionPolicy = config.issueDetectionPolicy;
  tui.info(`Error tracking: ${issueDetectionPolicy.enabled ? 'on' : 'off'} (${issueDetectionPolicy.reason}).`);

  // Where the stage's networked resources run. In the shared network, its stacks are created or upgraded while the
  // workloads build; the template is built only once they are ready.
  const stageNetwork = await prepareStageNetwork({ stage: stackContext.stage, mode: 'deploy' });
  const inSharedNetwork = stageNetwork.decision.kind === 'shared';

  // A function in the VPC has no outbound internet until the stack has NAT; the failure otherwise only shows at
  // runtime, as a timeout on the first external call.
  const nat = config.natSettings;
  if (nat.configured && config.allResourcesRequiringPrivateSubnets.length && inSharedNetwork) {
    tui.info(
      `NAT: the shared NAT \`${getSharedNatStackName()}\` (one ${SHARED_NAT_INSTANCE_TYPE} instance for every non-production stage here, no failover).`
    );
  } else if (nat.configured && config.allResourcesRequiringPrivateSubnets.length && !config.reuseVpcConfig) {
    const description =
      nat.type === 'gateway'
        ? `${nat.availabilityZones} NAT Gateway${nat.availabilityZones === 1 ? '' : 's'} (~$32/month each plus $0.045/GB)`
        : nat.type === 'ec2'
          ? `1 NAT instance (${nat.instanceSize}, ~$7/month, no failover)`
          : `${nat.availabilityZones} NAT instances (${nat.instanceSize}, ~$7/month each, automatic failover)`;
    tui.info(`NAT: ${description}.`);
  } else if (!nat.configured && config.vpcLambdas.length) {
    const names = config.vpcLambdas.map(({ name }) => name);
    tui.warn(
      `${names.length === 1 ? 'Function' : 'Functions'} ${names.join(', ')} ${
        names.length === 1 ? 'joins' : 'join'
      } the VPC and ${names.length === 1 ? 'has' : 'have'} no outbound internet access (S3 and DynamoDB stay reachable). Calls to external APIs will fail. To give ${
        names.length === 1 ? 'it' : 'them'
      } internet access, set stackConfig.nat to ec2, ha-ec2 or gateway.`
    );
  }

  const uptimeChecks = config.uptimeChecks;
  if (uptimeChecks.length) {
    const probeRegions = [...new Set(uptimeChecks.flatMap(({ regions }) => regions))].join(', ');
    tui.info(`Uptime checks: ${uptimeChecks.length} configured (probing from ${probeRegions}).`);
  }

  const syntheticTests = config.syntheticTests;
  if (syntheticTests.length) {
    tui.info(
      `Synthetic tests: ${syntheticTests.length} configured (CloudWatch Synthetics charges per run — see the resource docs for cost guidance).`
    );
  }

  const tracingInstrumentations = config.lambdaTracingInstrumentations;
  const instrumentedCount = tracingInstrumentations.filter(({ instrumentation }) => instrumentation).length;
  const skippedTracingCount = tracingInstrumentations.length - instrumentedCount;
  const instrumentedWorkloadCount = config.instrumentedContainerWorkloads.length;
  if (instrumentedCount || instrumentedWorkloadCount) {
    const tracedParts = [
      ...(instrumentedCount ? [`${instrumentedCount} function${instrumentedCount === 1 ? '' : 's'}`] : []),
      ...(instrumentedWorkloadCount
        ? [`${instrumentedWorkloadCount} container service${instrumentedWorkloadCount === 1 ? '' : 's'}`]
        : [])
    ];
    tui.info(
      `Tracing: enabled for ${tracedParts.join(' and ')}${
        skippedTracingCount ? ` (${skippedTracingCount} skipped, see warnings)` : ''
      } (spans stored in this account via X-Ray Transaction Search).`
    );
  }

  await ensureMissingSecretsCreated({
    ...(initTargetExpectation === undefined ? {} : { generatedSecretDescription: 'Generated by stacktape init' })
  });
  await ensureMissingSsmParamsCreated();
  // `slack-app` notification channels name a Slack channel; the deploy turns the names into the stable IDs the
  // Console delivers to, before the template is built. Fails with every unresolvable name at once.
  await resolveSlackAppChannels({ rawConfig: config.config, apiClient: stacktapeApi.apiClient });

  // Both are derived from the current stack details, which the post-deploy refetch replaces. A stack an earlier first
  // deploy left with only its artifact resources is updated, but this is still the stage's first deploy.
  const createsStack = stack.stackActionType === 'create';
  const isFirstDeployment = stack.isFirstDeploy;

  progress.setPhase('BUILD_AND_PACKAGE');
  // A new stack's deployment bucket and image repository are created directly, while the workloads build; the upload
  // waits for them. The stack is then created in one CloudFormation operation. When the deploy fails and leaves no
  // stack, they are deleted again.
  const artifactStoreCreation = createsStack ? deploymentArtifacts.createArtifactStore() : undefined;
  if (artifactStoreCreation) {
    // A build failure is the error to report; this one is reported where the upload waits for it.
    artifactStoreCreation.catch(() => {});
    application.registerCleanUpHook(async ({ success, interrupted, err }) => {
      if (success) return;
      // Not after Ctrl+C, which leaves the creation running, or when monitoring failed and the outcome is unknown.
      const endCreation =
        !interrupted && stack.rollsBackOnFailure && (err as ExpectedError | undefined)?.type !== 'STACK_MONITORING';
      await deploymentArtifacts.deleteArtifactStoreOfFailedFirstDeploy(stackContext.stackName, { endCreation });
    });
  }
  // The registry login does not depend on the build, so it runs while the images are built. The upload waits for it
  // and reports its failure.
  if (config.allContainersRequiringPackaging.length || config.agentCoreRuntimesRequiringPackaging.length) {
    deploymentArtifacts.loginToEcr().catch(() => {});
  }
  const [{ packagedWorkloads, cfTemplateDiff }] = await Promise.all([
    prepareArtifactsForStackDeployment({
      calculatedStackOverview,
      packaging,
      prepareTemplateForDeploy,
      template,
      tui,
      networkReady: stageNetwork.ready
    }),
    // @note this can take a long time, so we do it in parallel with other stack activities
    cloudformationRegistry.registerLatestCfPrivateTypes(config.requiredCloudformationPrivateTypes)
  ]);

  // When only code changed, the changed functions and container services are updated directly instead of through
  // CloudFormation, which takes seconds instead of minutes.
  let fastDeployPlan: FastDeployPlan | undefined;
  if (stack.stackActionType !== 'create') {
    // A failed stack's last successful release tells which of its resources the failed deploys created.
    const lastReleaseTemplate =
      stack.continuesFailedStack && !stack.isFirstDeploy && stack.lastVersion
        ? await deploymentArtifacts.getTemplate({ version: stack.lastVersion }).catch((err) => {
            tui.debug(`Could not read the template of release ${stack.lastVersion}: ${err}`);
            return undefined;
          })
        : undefined;
    stack.planUpdate(cfTemplateDiff, { lastReleaseTemplate });
    const reason =
      stack.reasonToContinueFailedStack ??
      stack.findChangedStackSetting() ??
      deployedStackOverview.findReasonForFullDeployment({
        cfTemplateDiff,
        builtImageRepositoryUrl: deploymentArtifacts.repositoryUrl
      });
    if (args.fullDeploy) {
      // Even a forced full deployment changes nothing when nothing changed.
      if (!reason && !deployedStackOverview.hasTemplateChanges(cfTemplateDiff)) {
        fastDeployPlan = { functions: [], services: [], layers: [] };
      }
    } else {
      const planning = reason ? { reason } : await planFastDeploy({ config });
      if ('plan' in planning) {
        fastDeployPlan = planning.plan;
      } else {
        tui.info(`Deploying through CloudFormation: ${planning.reason}.`);
      }
    }
  }
  if (!fastDeployPlan) await codeSwapUseImage();
  // A fast deployment that changes nothing creates no release. Synced bucket content may have changed, and its restore
  // manifest belongs to a release of its own.
  const createsRelease =
    !fastDeployPlan ||
    fastDeployPlan.functions.length + fastDeployPlan.services.length > 0 ||
    config.allBucketsToSync.length > 0;
  const releaseVersion = createsRelease ? stack.nextVersion : stack.lastVersion;

  let changePlan: DeploymentChangePlanV1 | undefined;
  if (!fastDeployPlan) {
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
      deploymentVersion: releaseVersion,
      stackId: stack.existingStackDetails?.StackId,
      previousDeploymentVersion: stack.lastVersion,
      previousTemplate: stack.stackActionType === 'update' ? template.oldTemplate : undefined,
      template: template.getTemplate(),
      artifacts: packagedWorkloads,
      resourceChanges,
      dangerousResources
    });
    tui.info(formatDeploymentChangePlanSummary(changePlan));
    if (stack.reasonForRollbackOfUpdate) tui.info(stack.reasonForRollbackOfUpdate);
    const replacedComputeEnvironments =
      stack.stackActionType === 'update'
        ? findReplacedBatchComputeEnvironments({
            previousTemplate: template.oldTemplate,
            template: template.getTemplate()
          })
        : [];
    if (replacedComputeEnvironments.length) {
      tui.warn(formatBatchComputeEnvironmentReplacementWarning(replacedComputeEnvironments));
    }

    const { abort } = await potentiallyPromptBeforeOperation({ cfTemplateDiff });
    if (abort) {
      await application.handleExitSignal('SIGINT');
      return;
    }
  }

  // A newly added or changed EmailSender or API stage changes the template, so it never takes the fast path. Existing
  // ones were ensured by their full deployment, which keeps routine code updates free of these preflights.
  if (!fastDeployPlan) {
    await ensureManagedEmailSenders();
    await ensureApiGatewayCloudWatchRole(template.getTemplate());
  }
  await artifactStoreCreation;

  progress.setPhase('UPLOAD');
  const sharedLayerPublication = fastDeployPlan ? createSharedLayerPublication(fastDeployPlan) : undefined;
  try {
    await deploymentArtifacts.uploadAllArtifacts({
      includeTemplates: !fastDeployPlan,
      onSharedLayerUploaded: sharedLayerPublication?.onLayerUploaded
    });
  } catch (error) {
    // Publication may already be in flight. Settle it before reporting an upload failure; no workload was switched.
    await sharedLayerPublication?.settle();
    throw error;
  }
  const sourceMapManifest = await recordSourceMapsBeforeSwitch(template.getTemplate());

  // The dependency inventory (lockfiles plus the packages inside every image this deployment rebuilt) is read while
  // CloudFormation works; it is uploaded and reported only after the deployment succeeds. The AWS account's Console
  // setting can limit scanning to the configuration checks.
  const securityInventoryPromise =
    securityAssessment && config.securityScanningPolicy.dependencies
      ? startSecurityInventory({ deploymentArtifacts, stackContext, version: releaseVersion, tui })
      : null;

  // Release identity: stamped onto every event this operation reports, so the Console can associate
  // incidents and error-group resolutions with the release that produced them.
  notification.setReleaseContext({
    deploymentVersion: releaseVersion,
    configRevision: createHash('sha256').update(JSON.stringify(template.getTemplate())).digest('hex').slice(0, 24),
    // 'unset' tells the Console the config declares no classification, so a previously stored
    // explicit stageType is removed and name inference takes over again.
    stageType: config.stackConfig.stageType ?? 'unset'
  });

  // Sent while the deployment runs. Later events, the outcome included, are sent after it.
  notification.queueDeploymentNotification({
    message: {
      text: 'Deployment started',
      type: 'progress',
      details: { deploymentMode: fastDeployPlan ? 'Fast deployment' : 'Full deployment' }
    }
  });

  // Pre-announce the new uptime-check revisions to the Console. The custom resource writes them to
  // the prober manifests DURING the CloudFormation update, so on long deploys probers report the
  // new revision minutes before the post-deploy sync — without this, those reports are dropped.
  // Best-effort and update-only: on a first deploy nothing probes yet, and runtime directives can
  // only resolve against an existing stack. Fast deployments never run the custom resource, so announcing
  // a new revision under one would split the Console's definition from the manifests probers use.
  if (config.uptimeChecks.length && stack.existingStackDetails && !fastDeployPlan) {
    try {
      await stacktapeApi.apiClient.syncUptimeChecks(
        (await config.resolveDirectives({
          itemToResolve: buildUptimeChecksSyncPayload({
            checks: config.uptimeChecks,
            projectName: stackContext.projectName,
            stage: stackContext.stage
          }),
          resolveRuntime: true
        })) as ReturnType<typeof buildUptimeChecksSyncPayload>
      );
    } catch {
      // The authoritative sync after a successful deploy retries with warnings.
    }
  }

  // The delete of the last stage in the shared network may have removed it while this deploy built.
  if (!fastDeployPlan && inSharedNetwork) await confirmSharedNetworkUnchanged();

  progress.setPhase('DEPLOY');
  codeSwapBeginMutation();
  try {
    if (fastDeployPlan) {
      await performFastDeploy({
        plan: fastDeployPlan,
        recordRelease: createsRelease,
        deploymentArtifacts,
        progress,
        layerVersions: sharedLayerPublication?.wait()
      });
    } else {
      await performFullDeploy({ deploymentArtifacts, stack, tui });
    }
  } catch (error) {
    // Functions a partial deployment switched still need their maps. It never throws.
    await recordSourceMapActivation(sourceMapManifest);
    throw error;
  }
  // Recorded while the post-deploy steps run; nothing below depends on it. It never throws. A failing post-deploy step
  // still lets it finish before the command exits.
  const sourceMapActivation = recordSourceMapActivation(sourceMapManifest);
  application.registerCleanUpHook(() => sourceMapActivation);

  progress.setPhase('POST_DEPLOY');

  // Removing the artifacts of releases that are no longer kept runs alongside the bucket sync and the CDN invalidation.
  // Its failure still fails the deployment, before it is reported as successful.
  let obsoleteArtifactDeletion: Promise<unknown> | undefined;
  // A fast deployment leaves the stack unchanged.
  if (!fastDeployPlan) {
    // Read before the refetch replaces the details of the stack as it was before this deployment.
    const fixedFailedUpdate = stack.continuesFailedStack;
    await Promise.all([
      stack.refetchStackDetails(stackContext.stackName),
      budget.loadBudgets(),
      deleteUndeployedStage()
    ]);
    obsoleteArtifactDeletion = deleteObsoleteArtifacts({ deploymentArtifacts, fixedFailedUpdate });
    obsoleteArtifactDeletion.catch(() => {});
    await deployedStackOverview.refreshStackInfoMap({
      stackDetails: stack.existingStackDetails,
      stackResources: stack.existingStackResources,
      budgetInfo: budget.getBudgetInfoForSpecifiedStack({ stackName: stackContext.stackName })
    });
    // CloudFormation now owns every function's code and layers, whatever fast deployments changed before, so their
    // tags say so and the layer versions fast deployments published are no longer run.
    await deploymentArtifacts.repairFunctionTags(template.getTemplate());
    const sharedLayers = getSharedLayerHotswapInformation();
    if (sharedLayers.length) await deleteSupersededSharedLayerVersions({ layers: sharedLayers });
  } else if (args.fullDeploy) {
    // A forced no-op must also remove identity tags older rollbacks wrote outside the template.
    await deploymentArtifacts.repairFunctionTags(template.getTemplate());
  }

  await deployConvexFunctions();

  if (config.allBucketsToSync.length) {
    await injectEnvironmentToHostedHtmlFiles();
    await deploymentArtifacts.syncBuckets();
    await deploymentArtifacts.saveBucketSyncManifest(releaseVersion);
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
  lifecycle.addFinalAction(() => deployedStackOverview.printShortStackInfo());

  await obsoleteArtifactDeletion;

  // Sent while the remaining reporting runs; the command waits for it before it returns.
  notification.queueDeploymentNotification({
    message: {
      text: 'Deployment succeeded',
      type: 'success',
      details: { deploymentMode: fastDeployPlan ? 'Fast deployment' : 'Full deployment' }
    }
  });

  // Config is the source of truth for uptime checks; the Console keeps a read-only projection so it
  // can evaluate probe results and render history. A sync failure must not fail a finished deploy.
  // Fast deployments skip the sync: changed uptime definitions always change the template and therefore
  // force a full deploy, so a fast deployment could only re-announce unchanged definitions —
  // and must never announce anything the manifests (untouched by it) do not carry.
  const syncUptimeChecks = async () => {
    if (fastDeployPlan) return;
    try {
      // The revision hashes the authored (unresolved) definition, so it is computed BEFORE resolving
      // directives — it must stay byte-identical to the revision the prober manifests carry. The
      // payload the Console stores must carry real values, not `$ResourceParam`/`$Secret` source text.
      const uptimeChecksSyncPayload = (await config.resolveDirectives({
        itemToResolve: buildUptimeChecksSyncPayload({
          checks: config.uptimeChecks,
          projectName: stackContext.projectName,
          stage: stackContext.stage
        }),
        resolveRuntime: true
      })) as ReturnType<typeof buildUptimeChecksSyncPayload>;
      const { missingChannelNames } = await withSyncRetries(() =>
        stacktapeApi.apiClient.syncUptimeChecks(uptimeChecksSyncPayload)
      );
      missingChannelNames.forEach((channelName) => {
        tui.warn(
          `Notification channel \`${channelName}\` referenced by an uptime check does not exist in your organization's Console channels. Its notifications will not be delivered until it is created.`
        );
      });
    } catch (err) {
      tui.warn(`Could not sync uptime check definitions to the Stacktape Console: ${err}`);
    }
  };

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
  if (isFirstDeployment) {
    lifecycle.addFinalAction(() => promptCiCdSetupAfterDeploy());
    lifecycle.addFinalAction(() => hintCodingAgentSetupAfterFirstDeploy());
  }

  const reportSecurityFindings = async () => {
    if (!securityAssessment) return;
    const securityInventory = await uploadSecurityInventory({
      inventory: securityInventoryPromise ? await securityInventoryPromise : null,
      deploymentArtifacts,
      version: releaseVersion,
      tui
    });
    try {
      const receipt = await recordSecurityReport({
        findings: securityAssessment.findings,
        exposure: securityAssessment.exposure,
        ...(securityInventory ? { inventory: securityInventory } : {})
      });
      if (!receipt.accepted) {
        tui.warn(
          `The Stacktape Console did not store the security findings: ${describeSecurityReportRejection(receipt.reason)}.`
        );
      }
    } catch (err) {
      tui.warn(`Could not report the security findings to the Stacktape Console: ${err}`);
    }
  };

  // The Console syncs are independent of each other and of the remaining AWS work.
  await Promise.all([syncUptimeChecks(), reportSecurityFindings(), sourceMapActivation]);
  await notification.waitForQueuedEvents();
  await codeSwapComplete(createsRelease);

  return {
    stackInfo: detailedStackInfoSensitive,
    packagedWorkloads,
    ...(changePlan ? { changePlan } : {}),
    ...(securityAssessment ? { security: securityAssessment } : {})
  };
};

export const prepareArtifactsForStackDeployment = async ({
  calculatedStackOverview,
  packaging,
  prepareTemplateForDeploy,
  template,
  tui,
  networkReady
}: Pick<DeployOperation, 'calculatedStackOverview' | 'packaging' | 'prepareTemplateForDeploy' | 'template' | 'tui'> & {
  /** The shared network the stage runs in, created or upgraded while the workloads build. */
  networkReady?: Promise<void>;
}): Promise<{
  packagedWorkloads: PackageWorkloadOutput[];
  cfTemplateDiff: TemplateDiff;
}> => {
  const packagedWorkloads = await packaging.packageAllWorkloads({ commandCanUseCache: true });
  await networkReady;
  await resolveAllResources();
  if (obfuscatedNamesStateHolder.usingObfuscateNames) {
    tui.warn(
      'Project + stage name exceeds the AWS length limit, so some AWS resource names will be shortened with hashes. Everything works the same; only the names in the AWS console look less readable.'
    );
  }

  await calculatedStackOverview.populateStackMetadata();
  await prepareTemplateForDeploy();

  const cfTemplateDiff = template.getOldTemplateDiff();
  return { packagedWorkloads, cfTemplateDiff };
};

export const performFullDeploy = async ({ deploymentArtifacts, stack, tui }: FullDeployOperation) => {
  try {
    // Continuing a failed first deploy cannot replace resources, so the ones to replace are deleted first and the full
    // template then creates them again.
    const beforeReplacing = stack.getTemplateBeforeReplacing();
    if (beforeReplacing) {
      tui.info(
        `Continuing the failed deploy replaces resources, which CloudFormation cannot do in this state. Removing ${beforeReplacing.removedResources.join(', ')} first; the deploy then creates them again.`
      );
      const { templateUrl, deleteTemplate } = await deploymentArtifacts.uploadPreviewTemplate({
        body: JSON.stringify(beforeReplacing.template)
      });
      try {
        await stack.deployStack(templateUrl, { finishWhenCleanupStarts: false });
      } finally {
        await deleteTemplate();
      }
    }
    // The deploy is done once CloudFormation starts deleting the resources it removed or replaced. The next command
    // that modifies the stack waits for that cleanup and reports deletions that failed.
    const { warningMessages, resourcesDeletedInBackground } =
      stack.stackActionType === 'create'
        ? await stack.createStack(deploymentArtifacts.cloudformationTemplateUrl)
        : await stack.deployStack(deploymentArtifacts.cloudformationTemplateUrl, {
            finishWhenCleanupStarts: true,
            // The resources removed above make the deployed template unknown here.
            allowExpressMode: !beforeReplacing
          });
    warningMessages?.forEach((msg) => {
      tui.warn(msg);
    });
    if (resourcesDeletedInBackground) {
      tui.info(
        `AWS is still deleting ${resourcesDeletedInBackground === 1 ? '1 old resource' : `${resourcesDeletedInBackground} old resources`} in the background. The next deploy or delete waits for it to finish.`
      );
    }
  } catch (err) {
    // Cleanup in case the deploy was rolled back. When only monitoring failed, the outcome is unknown, and when the CLI
    // reported a failure while CloudFormation still runs (a container that cannot start), the stack still uses the new
    // artifacts. Deleting them then could break it.
    if (
      stack.rollsBackOnFailure &&
      (err as ExpectedError).type !== 'STACK_MONITORING' &&
      !(err as ExpectedError).metadata?.stackOperationStillRunning
    ) {
      await deploymentArtifacts.deleteArtifactsRollbackedDeploy();
    }
    throw err;
  }
};

/** Removes the artifacts a successful full deployment no longer needs. */
export const deleteObsoleteArtifacts = async ({
  deploymentArtifacts,
  fixedFailedUpdate
}: {
  deploymentArtifacts: FullDeployOperation['deploymentArtifacts'];
  /** The deployment continued a stack an earlier failed deploy left in CREATE_FAILED or UPDATE_FAILED. */
  fixedFailedUpdate: boolean;
}) => {
  // A deploy that continued a failed stack can leave artifacts of the earlier attempts with the same version. They are
  // cleaned up before old versions are deleted with deleteAllObsoleteArtifacts.
  if (fixedFailedUpdate) {
    await deploymentArtifacts.deleteArtifactsFixedDeploy();
  }
  await deploymentArtifacts.deleteAllObsoleteArtifacts();
};
