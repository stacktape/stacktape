import type { Build } from '@aws-sdk/client-codebuild';
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
import { deployedStackOverviewManager } from '@domain-services/deployed-stack-overview-manager';
import { templateManager } from '@domain-services/template-manager';
import { stpErrors } from '@errors';
import {
  getCodebuildLogStreamNameFromBuildInfo,
  preparePipelineResources,
  startCodebuildDeployment
} from '@shared/aws/codebuild';
import { fsPaths } from '@shared/naming/fs-paths';
import { getPathRelativeTo } from '@shared/utils/fs-utils';
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

export const commandCodebuildDeploy = async () => {
  // Configure TUI for codebuild deploy (Initialize, Prepare Pipeline, Deploy - no Build & Package)
  tuiManager.configureForCodebuildDeploy();

  let build: Build;
  try {
    // we need to initialize most of the services as we are also doing resource resolving
    await initializeAllStackServices({
      commandRequiresDeployedStack: false,
      commandModifiesStack: true,
      requiresSubscription: true
    });

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
        apiKey: globalStateManager.apiKey
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

  // Print phase header before streaming mode (so logs appear under correct phase)
  console.info('');
  console.info(`${tuiManager.makeBold('PHASE 3')} • ${tuiManager.makeBold('Deploy')}`);
  console.info(tuiManager.colorize('gray', '─'.repeat(54)));

  // Enable streaming mode to hide TUI during log streaming (prevents duplicate phase headers)
  tuiManager.setStreamingMode(true);

  try {
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
  } finally {
    tuiManager.setStreamingMode(false);
  }

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
    finalArgs.configPath = getPathRelativeTo(globalStateManager.configPath, globalStateManager.workingDir);
  }
  // setting auto confirm operation to skip potential prompt
  // if we have gotten here, than we were already prompted before, so this should be fine
  finalArgs.autoConfirmOperation = true;
  // setting show sensitive values to false in any case to avoid leaking credentials into logs
  // if user uses this setting, sensitive values will be printed to him anyway during final colorized stack info print
  // const dummy: string = 5;
  finalArgs.showSensitiveValues = false;
  finalArgs.projectName = globalStateManager.targetStack.projectName;
  finalArgs.stage = globalStateManager.targetStack.stage;

  return finalArgs;
};
