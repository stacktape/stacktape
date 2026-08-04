import type { StacktapeArgs, StacktapeCliArgs } from 'src/config/cli/types';
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
import { deployedStackOverviewManager } from '@domain-services/deployed-stack-overview-manager';
import { templateManager } from '@domain-services/template-manager';
import { stpErrors } from '@errors';
import {
  getCodebuildLogStreamNameFromBuildInfo,
  preparePipelineResources,
  startCodebuildDeployment
} from 'src/aws/codebuild-deployment';
import { fsPaths } from 'src/config/runtime-paths';
import { serialize, wait } from '@utils/misc';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import { CodebuildDeploymentCloudwatchLogPrinter } from '@utils/cloudwatch-logs';
import { gitCreateZipArchive } from '@utils/git';
import { gitInfoManager } from '@utils/git-info-manager';
import { getDetailedStackInfoMap } from '@utils/stack-info-map-diff';
import { ensureTempFolder } from '@utils/temp-files';
import { getAwsSynchronizedTime } from '@utils/time';
import { getStacktapeVersion } from '@utils/versioning';
import { potentiallyPromptBeforeOperation, saveDetailedStackInfoMap } from '../_utils/common';
import { initializeRemoteDeployOperation } from '../_utils/initialization';
import { ensureMissingSecretsCreated } from '../_utils/secret-preflight';
import { ensureMissingSsmParamsCreated } from '../_utils/ssm-param-preflight';

export const deployWithCodebuildRunner = async () => {
  // Codebuild runner skips local Build & Package: Initialize, Prepare Pipeline, Deploy
  tuiManager.setPhasePreset('codebuild-deploy');

  let operation: Awaited<ReturnType<typeof initializeRemoteDeployOperation>>;
  let build: Build;
  try {
    // we need to initialize most of the services as we are also doing resource resolving
    operation = await initializeRemoteDeployOperation();
    const { args, runner, stackContext } = operation;

    configManager.validateGuardrails({ hasConfig: true });

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

    const awsAccountId = stackContext.accountId;

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
      invocationId: stackContext.invocationId
    })}/archive.zip`;
    await ensureTempFolder();
    await gitCreateZipArchive({
      directory: stackContext.workingDir,
      outputPath: projectZipPath
    });
    await eventManager.finishEvent({ eventType: 'ZIP_PROJECT' });

    // upload zipped project
    await eventManager.startEvent({ eventType: 'UPLOAD_PROJECT', description: 'Uploading project' });
    const projectZipS3Key = `${stackContext.stackName}/${stackContext.invocationId}/archive.zip`;
    await awsSdkManager.s3.uploadFile({
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
      projectName: stackContext.projectName,
      accountConnectionId: runner.accountConnectionId,
      awsAccountId,
      invocationId: stackContext.invocationId,
      templateId: args.templateId
    });
    build = await startCodebuildDeployment({
      awsSdkManager,
      awsAccountId,
      codebuildPipeline,
      commandArgs: adjustArguments({
        cliArguments: args,
        configPath: runner.configPath,
        stackContext
      }),
      gitInfo: await gitInfoManager.gitInfo,
      invocationId: stackContext.invocationId,
      systemId: runner.systemId,
      stacktapeUserInfo: {
        id: runner.userId,
        apiKey: deploymentApiKey
      },
      projectZipS3Key,
      projectName: stackContext.projectName,
      stacktapeVersion: process.env.STP_CODEBUILD_VERSION || getStacktapeVersion(),
      stacktapeTrpcEndpoint: STACKTAPE_TRPC_API_ENDPOINT,
      callbackAfterBuildStart: async (buildInfo) => {
        return stacktapeTrpcApiManager.recordStackOperationProgress({
          stackName: stackContext.stackName,
          codebuildBuildArn: buildInfo.arn,
          logStreamName: getCodebuildLogStreamNameFromBuildInfo({ buildInfo }),
          projectName: stackContext.projectName
        });
      }
    });
    await eventManager.finishEvent({ eventType: 'START_DEPLOYMENT' });
  } catch (err) {
    await stacktapeTrpcApiManager.recordStackOperationEnd({
      stackName: operation?.stackContext.stackName || globalStateManager.targetStack?.stackName,
      error: err,
      success: false,
      interrupted: false
    });
    throw err;
  }

  const { args, stackContext } = operation;

  const cloudwatchLogPrinter = new CodebuildDeploymentCloudwatchLogPrinter({
    fetchSince: (await getAwsSynchronizedTime()).getTime() - 30000,
    logGroupName: build.logs.groupName,
    logStreamName: build.logs.streamName
  });

  // Switch to DEPLOY phase for codebuild monitoring
  eventManager.setPhase('DEPLOY');

  await eventManager.startEvent({ eventType: 'DEPLOY', description: 'Deploying using codebuild' });
  stacktapeTrpcApiManager.recordStackOperationProgress({
    stackName: stackContext.stackName,
    codebuildBuildArn: build.arn,
    logStreamName: build.logs?.streamName,
    projectName: stackContext.projectName
  });

  tuiManager.printLines([
    '',
    `${tuiManager.makeBold('PHASE 3')} • ${tuiManager.makeBold('Deploy')}`,
    tuiManager.colorize('gray', '─'.repeat(54))
  ]);

  do {
    await wait(1000);
    build = await awsSdkManager.codeBuild.getBuild({ buildId: build.id });
    if (
      [StatusType.FAILED, StatusType.FAULT, StatusType.STOPPED, StatusType.TIMED_OUT].includes(
        build.buildStatus as StatusType as any
      )
    ) {
      // wait for logs to come to cloudwatch
      await wait(10000);
      await cloudwatchLogPrinter.printLogs();
      throw stpErrors.e64({
        stackName: stackContext.stackName,
        projectName: stackContext.projectName,
        invocationId: stackContext.invocationId,
        buildId: build.id,
        stage: stackContext.stage
      });
    }
    await cloudwatchLogPrinter.printLogs();
  } while (build.buildStatus !== StatusType.SUCCEEDED);

  await eventManager.finishEvent({ eventType: 'DEPLOY' });

  // refreshing stack details to return to user and pretty print
  await Promise.all([stackManager.refetchStackDetails(stackContext.stackName), budgetManager.loadBudgets()]);
  await deployedStackOverviewManager.refreshStackInfoMap({
    stackDetails: stackManager.existingStackDetails,
    stackResources: stackManager.existingStackResources,
    budgetInfo: budgetManager.getBudgetInfoForSpecifiedStack({ stackName: stackContext.stackName })
  });

  // we need two versions of detailed stack info (with and without sensitive values) - one for saving other for returning
  // @todo - this entire section is copied from deploy command - maybe unify it (I repeated it here to honor WET principle to not abstract when not needed)

  const detailedStackInfo = getDetailedStackInfoMap({
    deployedStackInfoMap: deployedStackOverviewManager.stackInfoMap,
    showSensitiveValues: args.showSensitiveValues
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
        stackName: stackContext.stackName
      })
    });
  }
  eventManager.addFinalAction(() => deployedStackOverviewManager.printShortStackInfo());
  // @todo end

  const consoleUrl = `https://console.stacktape.com/projects/${stackContext.projectName}/${stackContext.stage}/overview`;

  tuiManager.setPendingCompletion({
    success: true,
    message: 'DEPLOYMENT SUCCESSFUL',
    links: [],
    consoleUrl
  });

  return { stackInfo: detailedStackInfoSensitive };
};

const adjustArguments = ({
  cliArguments,
  configPath,
  stackContext
}: {
  cliArguments: StacktapeArgs;
  configPath: string;
  stackContext: Awaited<ReturnType<typeof initializeRemoteDeployOperation>>['stackContext'];
}) => {
  const finalArgs: StacktapeCliArgs = serialize(cliArguments);
  if (cliArguments.configPath) {
    // we need to adjust the config path, after unpacking in the codebuild job, stacktape config can have different location relative to STARTING cwd
    finalArgs.configPath = relative(resolve(stackContext.workingDir), resolve(configPath)).replaceAll('\\', '/');
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
  finalArgs.projectName = stackContext.projectName;
  finalArgs.stage = stackContext.stage;

  return finalArgs;
};
