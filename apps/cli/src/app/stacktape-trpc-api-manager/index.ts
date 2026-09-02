import { tuiManager } from '@application-services/tui-manager';
import { withStacktapeOperationInvocationContext } from '@application-services/operation-invocation-context';
import { ApiKeyProtectedClient, type ApiKeyRequestExecutor } from '@stacktape-api/api-key-protected';
import { TRPCClientError } from '@trpc/client';
import { CliError } from '@utils/errors';
import { IS_DEV } from '../../config/random';
import { gitInfoManager } from '../../utils/git-info-manager';
import { getStacktapeVersion } from '../../utils/versioning';
import { globalStateManager } from '../global-state-manager';

const LOGIN_HINT = 'Run `stacktape login` to authenticate with a new API key.';

export const translateStacktapeApiError = ({ error, hasApiKey }: { error: unknown; hasApiKey: boolean }): CliError => {
  if (error instanceof CliError) {
    return error;
  }

  const errorCode = error instanceof TRPCClientError ? error.data?.code : undefined;
  const errorMessage = error instanceof Error && error.message ? error.message : 'Unknown error';
  const normalizedMessage = errorMessage.toLowerCase();

  if (errorCode === 'UNAUTHORIZED' && normalizedMessage.includes('revoked')) {
    return new CliError({
      category: 'API_KEY',
      code: 'STACKTAPE_API_KEY_REVOKED',
      message: 'API key has been revoked.',
      hints: LOGIN_HINT,
      cause: error
    });
  }
  if (errorCode === 'UNAUTHORIZED' && normalizedMessage.includes('expired')) {
    return new CliError({
      category: 'API_KEY',
      code: 'STACKTAPE_API_KEY_EXPIRED',
      message: 'API key has expired.',
      hints: LOGIN_HINT,
      cause: error
    });
  }
  if (errorCode === 'UNAUTHORIZED') {
    return new CliError({
      category: 'API_KEY',
      code: hasApiKey ? 'STACKTAPE_API_KEY_INVALID' : 'STACKTAPE_API_KEY_MISSING',
      message: hasApiKey ? 'Invalid API key.' : 'No Stacktape API key was specified.',
      hints: LOGIN_HINT,
      cause: error
    });
  }
  if (errorCode === 'FORBIDDEN') {
    return new CliError({
      category: 'API_SERVER',
      code: 'STACKTAPE_API_PERMISSION_DENIED',
      message: `Permission denied: ${errorMessage}`,
      hints: 'Check your role with `stacktape info:whoami`.',
      cause: error
    });
  }

  return new CliError({
    category: 'API_SERVER',
    code: 'STACKTAPE_API_REQUEST_FAILED',
    message: errorMessage,
    cause: error
  });
};

export class StacktapeTrpcApiManager {
  readonly apiClient: ApiKeyProtectedClient;
  #hasApiKey = false;

  constructor() {
    const executeRequest: ApiKeyRequestExecutor = async (procedure, request) => {
      const start = Date.now();
      tuiManager.debug(`TRPC ${procedure}: start.`);
      try {
        return await request();
      } catch (error) {
        if (IS_DEV) {
          tuiManager.warn(`Stacktape API request failed:\n${error}`);
        }
        throw translateStacktapeApiError({ error, hasApiKey: this.#hasApiKey });
      } finally {
        tuiManager.debug(`TRPC ${procedure}: ${Date.now() - start}ms.`);
      }
    };
    this.apiClient = new ApiKeyProtectedClient({ executeRequest });
  }

  init = async ({ apiKey }: { apiKey: string }) => {
    this.#hasApiKey = Boolean(apiKey);
    await this.apiClient.init({ apiKey });
  };

  // Historical API name kept for console compatibility. These methods record
  // Stacktape CLI operations, not only commands that directly mutate a stack.
  recordStackOperationProgress = async ({
    stackName,
    projectName,
    logStreamName
  }: {
    stackName: string;
    projectName: string;
    logStreamName?: string;
  }) => {
    const gitInfo = await gitInfoManager.gitInfo;

    return this.apiClient.recordStackOperation({
      invocationId: globalStateManager.invocationId,
      commandArgs: withStacktapeOperationInvocationContext(globalStateManager.args),
      command: globalStateManager.command,
      region: globalStateManager.region,
      stackName,
      projectName,
      accountConnectionId: globalStateManager.targetAwsAccount.id || undefined,
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
    logStreamName
  }: {
    success: boolean;
    interrupted: boolean;
    error?: Error;
    stackName?: string;
    logStreamName?: string;
  }) => {
    return this.apiClient.recordStackOperation({
      invocationId: globalStateManager.invocationId,
      endTime: Date.now(),
      success,
      interrupted,
      description: error ? `${error}` : interrupted ? 'Operation was interrupted' : undefined,
      commandArgs: withStacktapeOperationInvocationContext(globalStateManager.args),
      region: globalStateManager.region,
      stackName,
      logStreamName,
      command: globalStateManager.command,
      inProgress: false,
      stacktapeVersion: getStacktapeVersion()
    });
  };

  recordStackOperationStart = async () => {
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
      commandArgs: withStacktapeOperationInvocationContext(globalStateManager.args),
      // git information
      gitBranch: gitInfo.branch,
      gitCommit: gitInfo.commit,
      gitUrl: gitInfo.gitUrl,
      // other information
      inProgress: true,
      stacktapeVersion: getStacktapeVersion()
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
