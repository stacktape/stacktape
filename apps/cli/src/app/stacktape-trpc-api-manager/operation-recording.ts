import { scrubSensitiveText } from '@stacktape/console-api/sensitive-text';
import { stacktapeTrpcApiManager } from './index';
import { withStacktapeOperationInvocationContext } from '@application-services/operation-invocation-context';
import type { SecurityPostureAssessment } from '@domain-services/config-manager/utils/security-posture';
import type { SecurityInventoryPointer } from '@stacktape/console-api/security';
import { SECURITY_RULE_CATALOG_VERSION } from '@stacktape/console-api/security';
import { gitInfoManager } from '../../utils/git-info-manager';
import { getStacktapeVersion } from '../../utils/versioning';
import { globalStateManager } from '../global-state-manager';
import { commandArgsForRecording } from './recorded-command-args';

// Historical API name kept for console compatibility. These methods record
// Stacktape CLI operations, not only commands that directly mutate a stack.
export const recordStackOperationProgress = async ({
  stackName,
  projectName,
  logStreamName
}: {
  stackName: string;
  projectName: string;
  logStreamName?: string;
}) => {
  const gitInfo = await gitInfoManager.getGitInfo(globalStateManager.workingDir);

  return stacktapeTrpcApiManager.apiClient.recordStackOperation({
    invocationId: globalStateManager.invocationId,
    commandArgs: withStacktapeOperationInvocationContext(
      commandArgsForRecording({ args: globalStateManager.args, stage: globalStateManager.stage })
    ),
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

export const recordStackOperationEnd = async ({
  success,
  interrupted,
  error,
  stackName,
  logStreamName,
  issuesEnabled
}: {
  success: boolean;
  interrupted: boolean;
  error?: Error;
  stackName?: string;
  logStreamName?: string;
  /** Whether a deploy wired Issues for its stack; omitted for other commands and when no configuration was loaded. */
  issuesEnabled?: boolean;
}) => {
  return stacktapeTrpcApiManager.apiClient.recordStackOperation({
    invocationId: globalStateManager.invocationId,
    endTime: Date.now(),
    success,
    interrupted,
    ...(issuesEnabled === undefined ? {} : { issuesEnabled }),
    description: error ? scrubSensitiveText(`${error}`) : interrupted ? 'Operation was interrupted' : undefined,
    commandArgs: withStacktapeOperationInvocationContext(
      commandArgsForRecording({ args: globalStateManager.args, stage: globalStateManager.stage })
    ),
    region: globalStateManager.region,
    stackName,
    logStreamName,
    command: globalStateManager.command,
    inProgress: false,
    stacktapeVersion: getStacktapeVersion()
  });
};

/**
 * Reports the security posture evaluated for this deployment. The Console binds the report to the recorded
 * operation, so only the invocation id travels with the findings.
 */
export const recordSecurityReport = async ({
  findings,
  exposure,
  inventory
}: Pick<SecurityPostureAssessment, 'findings' | 'exposure'> & { inventory?: SecurityInventoryPointer }) => {
  return stacktapeTrpcApiManager.apiClient.recordSecurityReport({
    invocationId: globalStateManager.invocationId,
    catalogVersion: SECURITY_RULE_CATALOG_VERSION,
    stacktapeVersion: getStacktapeVersion(),
    coveredKinds: ['POSTURE', 'SECRET'],
    findings,
    exposure,
    ...(inventory ? { inventory } : {})
  });
};

export const recordStackOperationStart = async () => {
  const gitInfo = await gitInfoManager.getGitInfo(globalStateManager.workingDir);
  return stacktapeTrpcApiManager.apiClient.recordStackOperation({
    // global state manager information
    invocationId: globalStateManager.invocationId,
    command: globalStateManager.command,
    startTime: globalStateManager.operationStart.getTime(),
    awsAccessKeyId: globalStateManager.credentials.accessKeyId,
    awsAccountId: globalStateManager.targetAwsAccount.awsAccountId || undefined,
    accountConnectionId: globalStateManager.targetAwsAccount.id || undefined,
    region: globalStateManager.region,
    commandArgs: withStacktapeOperationInvocationContext(
      commandArgsForRecording({ args: globalStateManager.args, stage: globalStateManager.stage })
    ),
    // git information
    gitBranch: gitInfo.branch,
    gitCommit: gitInfo.commit,
    gitUrl: gitInfo.gitUrl,
    // other information
    inProgress: true,
    stacktapeVersion: getStacktapeVersion()
  });
};

export const deleteUndeployedStage = async () => {
  return stacktapeTrpcApiManager.apiClient.deleteUndeployedStage({
    projectName: globalStateManager.targetStack.projectName,
    stageName: globalStateManager.targetStack.stage
  });
};
