import type { Build } from '@aws-sdk/client-codebuild';
import { relative, resolve } from 'node:path';
import { eventManager } from '@application-services/event-manager';
import { globalStateManager } from '@application-services/global-state-manager';
import { stacktapeTrpcApiManager } from '@application-services/stacktape-trpc-api-manager';
import { tuiManager } from '@application-services/tui-manager';
import { StatusType } from '@aws-sdk/client-codebuild';
import { STACKTAPE_TRPC_API_ENDPOINT } from '../../config/params';
import { budgetManager } from '@domain-services/budget-manager';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { stackManager } from '@domain-services/cloudformation-stack-manager';
import { configManager } from '@domain-services/config-manager';
import { validateGuardrails } from '@domain-services/config-manager/utils/validation';
import { deployedStackOverviewManager } from '@domain-services/deployed-stack-overview-manager';
import { templateManager } from '@domain-services/template-manager';
import { stpErrors } from '@errors';
import {
  getCodebuildLogStreamNameFromBuildInfo,
  preparePipelineResources,
  startCodebuildDeployment
} from '@shared/aws/codebuild';
import { fsPaths } from '@shared/naming/fs-paths';
import { serialize, wait } from '@shared/utils/misc';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import { CodebuildDeploymentCloudwatchLogPrinter } from '@utils/cloudwatch-logs';
import { gitCreateZipArchive } from '@utils/git';
import { gitInfoManager } from '@utils/git-info-manager';
import { getDetailedStackInfoMap } from '@utils/stack-info-map-diff';
import { ensureTempFolder } from '@utils/temp-files';
import { getAwsSynchronizedTime } from '@utils/time';
import { getStacktapeVersion } from '@utils/versioning';
import { potentiallyPromptBeforeOperation, saveDetailedStackInfoMap } from '../_utils/common';
import { initializeAllStackServices } from '../_utils/initialization';
import { ensureMissingSecretsCreated } from '../_utils/secret-preflight';
import { ensureMissingSsmParamsCreated } from '../_utils/ssm-param-preflight';

export const deployWithCodebuildRunner = async () => {
  // Configure TUI for codebuild deploy (Initialize, Prepare Pipeline, Deploy - no Build & Package)
  tuiManager.configureForCodebuildDeploy();

  let build: Build;
  try {
    // we need to initialize most of the services as we are also doing resource resolving
    await initializeAllStackServices({
      commandRequiresDeployedStack: false,
      commandModifiesStack: true,
      loadGlobalConfig: true,
      requiresSubscription: true
    });

    validateGuardrails({ guardrails: configManager.guardrails, hasConfig: true });

    await ensureMissingSecretsCreated();
    await ensureMissingSsmParamsCreated();

    // it is faster to do resource resolving here and get error immediately
    // compared to waiting for entire codebuild deploy to provision and then get the error
    await calculatedStackOverviewManager.resolveAllResources();

    const cfTemplateDiff = templateManager.getOldTemplateDiff();
    const { abort } = await potentiallyPromptBeforeOperation({ cfTemplateDiff });

    if (abort) {
      return;
    }

    // Switch to UPLOAD phase for preparation work (zip, upload, start codebuild)
    eventManager.setPhase('UPLOAD');

    await eventManager.startEvent({ eventType: 'PREPARE_PIPELINE', description: 'Preparing deployment pipeline' });

    const { awsAccountId } = globalStateManager.targetAwsAccount;

    // prepare codebuild pipeline resources
    const codebuildPipeline = await preparePipelineResources({
      awsSdkManager,
      awsAccountId,
      deploymentBucketTransferAccelerationEnabled: configManager.isS3TransferAccelerationAvailableInDeploymentRegion
    });

    await eventManager.finishEvent({ eventType: 'PREPARE_PIPELINE' });

    // zip artifact (project)
    await eventManager.startEvent({ eventType: 'ZIP_PROJECT', description: 'Zipping project' });
    const projectZipPath = `${fsPaths.absoluteTempFolderPath({
      invocationId: globalStateManager.invocationId
    })}/archive.zip`;
    await ensureTempFolder();
    await gitCreateZipArchive({
      directory: globalStateManager.workingDir,
      outputPath: projectZipPath
    });
    await eventManager.finishEvent({ eventType: 'ZIP_PROJECT' });

    // upload zipped project
    await eventManager.startEvent({ eventType: 'UPLOAD_PROJECT', description: 'Uploading project' });
    const projectZipS3Key = `${globalStateManager.targetStack.stackName}/${globalStateManager.invocationId}/archive.zip`;
    await awsSdkManager.uploadToBucket({
      bucketName: codebuildPipeline.bucketName,
      contentType: 'application/zip',
      filePath: projectZipPath,
      s3Key: projectZipS3Key,
      useS3Acceleration: configManager.isS3TransferAccelerationAvailableInDeploymentRegion
    });
    await eventManager.finishEvent({ eventType: 'UPLOAD_PROJECT' });

    // start codebuild deployment
    await eventManager.startEvent({ eventType: 'START_DEPLOYMENT', description: 'Starting codebuild deployment' });
    const { apiKey: deploymentApiKey } = await stacktapeTrpcApiManager.apiClient.createDeploymentTokenFromCli({
      projectName: globalStateManager.targetStack.projectName,
      accountConnectionId: globalStateManager.targetAwsAccount.id,
      awsAccountId,
      invocationId: globalStateManager.invocationId,
      templateId: globalStateManager.args.templateId
    });
    build = await startCodebuildDeployment({
      awsSdkManager,
      awsAccountId,
      codebuildPipeline,
      commandArgs: adjustArguments({ cliArguments: globalStateManager.rawArgs }),
      gitInfo: await gitInfoManager.gitInfo,
      invocationId: globalStateManager.invocationId,
      systemId: globalStateManager.systemId,
      stacktapeUserInfo: {
        id: globalStateManager.userData.id,
        apiKey: deploymentApiKey
      },
      projectZipS3Key,
      projectName: globalStateManager.targetStack.projectName,
      stacktapeVersion: process.env.STP_CODEBUILD_VERSION || getStacktapeVersion(),
      stacktapeTrpcEndpoint: STACKTAPE_TRPC_API_ENDPOINT,
      callbackAfterBuildStart: async (buildInfo) => {
        return stacktapeTrpcApiManager.recordStackOperationProgress({
          stackName: globalStateManager.targetStack?.stackName,
          codebuildBuildArn: buildInfo.arn,
          logStreamName: getCodebuildLogStreamNameFromBuildInfo({ buildInfo }),
          projectName: globalStateManager.targetStack.projectName
        });
      }
    });
    await eventManager.finishEvent({ eventType: 'START_DEPLOYMENT' });
  } catch (err) {
    await stacktapeTrpcApiManager.recordStackOperationEnd({
      stackName: globalStateManager.targetStack?.stackName,
      error: err,
      success: false,
      interrupted: false
    });
    throw err;
  }

  const cloudwatchLogPrinter = new CodebuildDeploymentCloudwatchLogPrinter({
    fetchSince: (await getAwsSynchronizedTime()).getTime() - 30000,
    logGroupName: build.logs.groupName,
    logStreamName: build.logs.streamName
  });

  // Switch to DEPLOY phase for codebuild monitoring
  eventManager.setPhase('DEPLOY');

  await eventManager.startEvent({ eventType: 'DEPLOY', description: 'Deploying using codebuild' });
  stacktapeTrpcApiManager.recordStackOperationProgress({
    stackName: globalStateManager.targetStack.stackName,
    codebuildBuildArn: build.arn,
    logStreamName: build.logs?.streamName,
    projectName: globalStateManager.targetStack.projectName
  });

  tuiManager.printLines([
    '',
    `${tuiManager.makeBold('PHASE 3')} • ${tuiManager.makeBold('Deploy')}`,
    tuiManager.colorize('gray', '─'.repeat(54))
  ]);

  do {
    await wait(1000);
    build = await awsSdkManager.getCodebuildDeployment({ buildId: build.id });
    if (
      [StatusType.FAILED, StatusType.FAULT, StatusType.STOPPED, StatusType.TIMED_OUT].includes(
        build.buildStatus as StatusType as any
      )
    ) {
      // wait for logs to come to cloudwatch
      await wait(10000);
      await cloudwatchLogPrinter.printLogs();
      throw stpErrors.e64({
        stackName: globalStateManager.targetStack.stackName,
        projectName: globalStateManager.targetStack.projectName,
        invocationId: globalStateManager.invocationId,
        buildId: build.id,
        stage: globalStateManager.targetStack.stage
      });
    }
    await cloudwatchLogPrinter.printLogs();
  } while (build.buildStatus !== StatusType.SUCCEEDED);

  await eventManager.finishEvent({ eventType: 'DEPLOY' });

  // refreshing stack details to return to user and pretty print
  await Promise.all([
    stackManager.refetchStackDetails(globalStateManager.targetStack.stackName),
    budgetManager.loadBudgets()
  ]);
  await deployedStackOverviewManager.refreshStackInfoMap({
    stackDetails: stackManager.existingStackDetails,
    stackResources: stackManager.existingStackResources,
    budgetInfo: budgetManager.getBudgetInfoForSpecifiedStack({ stackName: globalStateManager.targetStack.stackName })
  });

  // we need two versions of detailed stack info (with and without sensitive values) - one for saving other for returning
  // @todo - this entire section is copied from deploy command - maybe unify it (I repeated it here to honor WET principle to not abstract when not needed)

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
  // @todo end

  const consoleUrl = `https://console.stacktape.com/projects/${globalStateManager.targetStack.projectName}/${globalStateManager.targetStack.stage}/overview`;

  tuiManager.setPendingCompletion({
    success: true,
    message: 'DEPLOYMENT SUCCESSFUL',
    links: [],
    consoleUrl
  });

  return { stackInfo: detailedStackInfoSensitive };
};

const adjustArguments = ({ cliArguments }: { cliArguments: StacktapeArgs }) => {
  const finalArgs: StacktapeCliArgs = serialize(cliArguments);
  if (cliArguments.configPath) {
    // we need to adjust the config path, after unpacking in the codebuild job, stacktape config can have different location relative to STARTING cwd
    finalArgs.configPath = relative(
      resolve(globalStateManager.workingDir),
      resolve(globalStateManager.configPath)
    ).replaceAll('\\', '/');
  }
  // setting auto confirm operation to skip potential prompt
  // if we have gotten here, than we were already prompted before, so this should be fine
  finalArgs.autoConfirmOperation = true;
  // setting show sensitive values to false in any case to avoid leaking credentials into logs
  // if user uses this setting, sensitive values will be printed to him anyway during final colorized stack info print
  // const dummy: string = 5;
  finalArgs.showSensitiveValues = false;
  delete finalArgs.runner;
  // The project archive is extracted into CodeBuild's working directory. A local
  // path here is both invalid remotely and may expose the caller's filesystem layout.
  delete finalArgs.currentWorkingDirectory;
  finalArgs.projectName = globalStateManager.targetStack.projectName;
  finalArgs.stage = globalStateManager.targetStack.stage;

  return finalArgs;
};
