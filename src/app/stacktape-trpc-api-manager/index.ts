import { tuiManager } from '@application-services/tui-manager';
import { ApiKeyProtectedClient } from '../../../shared/trpc/api-key-protected';
import { stpErrors } from '../../config/error-messages';
import { IS_DEV } from '../../config/random';
import { gitInfoManager } from '../../utils/git-info-manager';
import { getStacktapeVersion } from '../../utils/versioning';
import { globalStateManager } from '../global-state-manager';

class StacktapeTrpcApiManager {
  apiClient = new ApiKeyProtectedClient();

  init = async ({ apiKey }: { apiKey: string }) => {
    await this.apiClient.init({ apiKey });
    for (const prop in this.apiClient) {
      if (prop !== 'init' && prop !== '#client') {
        const oldMethod = this.apiClient[prop];
        this.apiClient[prop] = async (...args) => {
          const start = Date.now();
          try {
            tuiManager.debug(`TRPC ${prop}: start.`);
            const res = await oldMethod(...args);
            tuiManager.debug(`TRPC ${prop}: ${Date.now() - start}ms.`);
            return res;
          } catch (err) {
            if (IS_DEV) {
              tuiManager.warn(`Stacktape API request failed:\n${err}`);
            }
            tuiManager.debug(`TRPC API ${prop}: ${Date.now() - start}ms.`);
            const errCode = err?.shape?.data.code;
            if (errCode === 'UNAUTHORIZED' && apiKey) {
              throw stpErrors.e503({ message: 'Invalid API key.' });
            }
            if (errCode === 'UNAUTHORIZED' && !apiKey) {
              throw stpErrors.e503({ message: 'Invalid API key or no API key specified.' });
            }
            throw stpErrors.e503({ message: err?.shape?.message || 'Unknown error' });
          }
        };
      }
    }
  };

  recordStackOperationProgress = async ({
    stackName,
    projectName,
    codebuildBuildArn,
    logStreamName
  }: {
    stackName: string;
    projectName: string;
    codebuildBuildArn?: string;
    logStreamName?: string;
  }) => {
    const gitInfo = await gitInfoManager.gitInfo;

    return this.apiClient.recordStackOperation({
      invocationId: globalStateManager.invocationId,
      commandArgs: globalStateManager.args,
      command: globalStateManager.command,
      region: globalStateManager.region,
      stackName,
      serviceName: projectName,
      accountConnectionId: globalStateManager.targetAwsAccount.id || undefined,
      codebuildBuildArn,
      logStreamName,
      inProgress: true,
      stacktapeVersion: getStacktapeVersion(),
      // git information
      gitBranch: gitInfo.branch,
      gitCommit: gitInfo.commit,
      gitUrl: gitInfo.gitUrl
    });
  };

  recordStackOperationEnd = async ({
    success,
    interrupted,
    error,
    stackName,
    codebuildBuildArn,
    logStreamName
  }: {
    success: boolean;
    interrupted: boolean;
    error?: Error;
    stackName?: string;
    codebuildBuildArn?: string;
    logStreamName?: string;
  }) => {
    return this.apiClient.recordStackOperation({
      invocationId: globalStateManager.invocationId,
      endTime: Date.now(),
      success,
      interrupted,
      description: error ? `${error}` : interrupted ? 'Operation was interrupted' : undefined,
      region: globalStateManager.region,
      stackName,
      codebuildBuildArn,
      logStreamName,
      command: globalStateManager.isExecutingInsideCodebuild
        ? `codebuild:${globalStateManager.command}`
        : globalStateManager.command,
      inProgress: false,
      stacktapeVersion: getStacktapeVersion()
    });
  };

  recordStackOperationStart = async ({
    startingCodebuildOperation = false
  }: {
    startingCodebuildOperation?: boolean;
  }) => {
    const gitInfo = await gitInfoManager.gitInfo;
    return this.apiClient.recordStackOperation({
      // global state manager information
      invocationId: globalStateManager.invocationId,
      command: globalStateManager.command,
      startTime: globalStateManager.operationStart.getTime(),
      awsAccessKeyId: globalStateManager.credentials.accessKeyId,
      awsAccountId: globalStateManager.targetAwsAccount.awsAccountId || undefined,
      accountConnectionId: globalStateManager.targetAwsAccount.id || undefined,
      region: globalStateManager.region,
      commandArgs: globalStateManager.args,
      // git information
      gitBranch: gitInfo.branch,
      gitCommit: gitInfo.commit,
      gitUrl: gitInfo.gitUrl,
      // other information
      isCodebuildOperation: startingCodebuildOperation,
      inProgress: true,
      stacktapeVersion: getStacktapeVersion(),
      logStreamName: globalStateManager.isExecutingInsideCodebuild ? process.env.CODEBUILD_LOG_PATH : undefined
    });
  };

  deleteUndeployedStage = async () => {
    return this.apiClient.deleteUndeployedStage({
      projectName: globalStateManager.targetStack.projectName,
      stageName: globalStateManager.targetStack.stage
    });
  };
}

export const stacktapeTrpcApiManager = new StacktapeTrpcApiManager();
