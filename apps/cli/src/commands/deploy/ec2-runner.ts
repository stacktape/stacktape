import type { FilteredLogEvent } from '@aws-sdk/client-cloudwatch-logs';
import { CommandInvocationStatus } from '@aws-sdk/client-ssm';
import { commandLifecycle } from '@application-services/command-lifecycle';
import { operationReporter } from '@application-services/operation-manager';
import { stacktapeTrpcApiManager } from '@application-services/stacktape-trpc-api-manager';
import { tuiManager } from '@application-services/tui-manager';
import { budgetManager } from '@domain-services/budget-manager';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { stackManager } from '@domain-services/cloudformation-stack-manager';
import { configManager } from '@domain-services/config-manager';
import { deployedStackOverviewManager } from '@domain-services/deployed-stack-overview-manager';
import { templateManager } from '@domain-services/template-manager';
import { fsPaths } from 'src/config/runtime-paths';
import { wait } from '@utils/misc';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import { ExpectedError } from '@utils/errors';
import { getGitVariable } from '@utils/git';
import { gitInfoManager } from '@utils/git-info-manager';
import { getDetailedStackInfoMap } from '@utils/stack-info-map-diff';
import { getAwsSynchronizedTime } from '@utils/time';
import { SsmExecuteScriptCloudwatchLogPrinter } from '@utils/cloudwatch-logs';
import { potentiallyPromptBeforeOperation, saveDetailedStackInfoMap } from '../_utils/common';
import { initializeRemoteDeployOperation } from '../_utils/initialization';
import { ensureMissingSecretsCreated } from '../_utils/secret-preflight';
import { ensureMissingSsmParamsCreated } from '../_utils/ssm-param-preflight';
import { resolveEc2RunnerConfigPath } from './ec2-runner-config-path';

export const deployWithEc2Runner = async () => {
  tuiManager.setPhasePreset('remote-deploy');
  const operation = await initializeRemoteDeployOperation();
  const { args, runner, stackContext } = operation;

  configManager.validateGuardrails({ hasConfig: true });
  await ensureMissingSecretsCreated();
  await ensureMissingSsmParamsCreated();
  await calculatedStackOverviewManager.resolveAllResources();

  const cfTemplateDiff = templateManager.getOldTemplateDiff();
  const { abort } = await potentiallyPromptBeforeOperation({ cfTemplateDiff });
  if (abort) {
    return;
  }

  const gitInfo = await gitInfoManager.gitInfo;
  if (!gitInfo.gitUrl || !gitInfo.commit || !gitInfo.branch) {
    throw new ExpectedError(
      'CLI',
      'Deploy runner "ec2" requires a git repository with a remote URL, branch, and commit.',
      'Commit your project and make sure the repository remote is available to Stacktape Console.'
    );
  }
  if (gitInfo.hasUncommitedChanges) {
    tuiManager.warn('EC2 runner deploys the current git commit. Uncommitted local changes will not be included.');
  }

  let gitCommitMessage: string | undefined;
  try {
    gitCommitMessage = await getGitVariable('message');
  } catch {
    gitCommitMessage = undefined;
  }

  let configPath: string | undefined;
  if (runner.configPath) {
    try {
      configPath = resolveEc2RunnerConfigPath({
        configPath: runner.configPath,
        repositoryRoot: await getGitVariable('repositoryRoot')
      });
    } catch {
      throw new ExpectedError(
        'CLI',
        'EC2 runner deploys require the Stacktape config file to be inside the current Git repository.',
        'Move the config into the repository or deploy without the EC2 runner.'
      );
    }
  }

  operationReporter.setPhase('UPLOAD');
  await operationReporter.startEvent({ eventType: 'START_DEPLOYMENT', description: 'Starting EC2 runner deployment' });
  const { invocationId } = await stacktapeTrpcApiManager.apiClient.ec2DeployFromCli({
    invocationId: stackContext.invocationId,
    projectName: stackContext.projectName,
    accountConnectionId: runner.accountConnectionId,
    awsAccountId: stackContext.accountId,
    region: stackContext.region,
    stage: stackContext.stage,
    gitUrl: gitInfo.gitUrl,
    gitBranch: gitInfo.branch,
    gitCommit: gitInfo.commit,
    gitCommitMessage,
    configPath,
    templateId: args.templateId || null,
    hotSwap: Boolean(args.hotSwap)
  });
  await operationReporter.finishEvent({ eventType: 'START_DEPLOYMENT' });

  operationReporter.setPhase('DEPLOY');
  await operationReporter.startEvent({ eventType: 'DEPLOY', description: 'Deploying using EC2 runner' });

  tuiManager.printLines([
    '',
    `${tuiManager.makeBold('PHASE 3')} • ${tuiManager.makeBold('Deploy')}`,
    tuiManager.colorize('gray', '-'.repeat(54))
  ]);
  await monitorEc2RunnerDeployment({ invocationId });

  await operationReporter.finishEvent({ eventType: 'DEPLOY' });

  await Promise.all([stackManager.refetchStackDetails(stackContext.stackName), budgetManager.loadBudgets()]);
  await deployedStackOverviewManager.refreshStackInfoMap({
    stackDetails: stackManager.existingStackDetails,
    stackResources: stackManager.existingStackResources,
    budgetInfo: budgetManager.getBudgetInfoForSpecifiedStack({ stackName: stackContext.stackName })
  });

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
  commandLifecycle.addFinalAction(() => deployedStackOverviewManager.printShortStackInfo());

  const consoleUrl = `https://console.stacktape.com/projects/${stackContext.projectName}/${stackContext.stage}/overview`;

  tuiManager.setPendingCompletion({
    success: true,
    message: 'DEPLOYMENT SUCCESSFUL',
    links: [],
    consoleUrl
  });

  return {
    invocationId,
    stackInfo: detailedStackInfoSensitive
  };
};

const monitorEc2RunnerDeployment = async ({ invocationId }: { invocationId: string }) => {
  const fetchSince = (await getAwsSynchronizedTime()).getTime() - 30000;
  let provisioningLogPrinter: CloudwatchLogStreamPrinter | undefined;
  let commandLogPrinter: SsmExecuteScriptCloudwatchLogPrinter | undefined;

  while (true) {
    await wait(2000);
    const status = await stacktapeTrpcApiManager.apiClient.ec2DeployStatusFromCli({ invocationId });

    if (!commandLogPrinter && status.logGroupName && status.logStreamName) {
      provisioningLogPrinter ||= new CloudwatchLogStreamPrinter({
        fetchSince,
        logGroupName: status.logGroupName,
        logStreamName: status.logStreamName
      });
      await provisioningLogPrinter.printLogs();
    }

    if (status.ssmCommandId && status.ec2InstanceId && status.logGroupName) {
      commandLogPrinter ||= new SsmExecuteScriptCloudwatchLogPrinter({
        fetchSince,
        logGroupName: status.logGroupName,
        commandId: status.ssmCommandId,
        instanceId: status.ec2InstanceId
      });
      await commandLogPrinter.printLogs();

      const commandInvocation = await awsSdkManager.systemsManager
        .getShellScriptExecution({
          instanceId: status.ec2InstanceId,
          commandId: status.ssmCommandId
        })
        .catch(() => undefined);

      if (commandInvocation?.Status && isTerminalSsmStatus(commandInvocation.Status)) {
        await commandLogPrinter.printLogs();
        if (commandInvocation.Status === CommandInvocationStatus.SUCCESS) {
          return;
        }
        throw new ExpectedError(
          'DEPLOYMENT',
          `EC2 runner deployment failed with SSM status ${commandInvocation.Status}.`,
          'Inspect the runner logs above for the failing Stacktape command output.'
        );
      }
    }

    if (status.inProgress === false) {
      if (commandLogPrinter) {
        await commandLogPrinter.printLogs();
      } else if (provisioningLogPrinter) {
        await provisioningLogPrinter.printLogs();
      }
      if (status.success) {
        return;
      }
      throw new ExpectedError(
        'DEPLOYMENT',
        status.description || 'EC2 runner deployment failed.',
        'Inspect the deployment logs in Stacktape Console for more details.'
      );
    }
  }
};

const isTerminalSsmStatus = (status: string) =>
  (
    [
      CommandInvocationStatus.SUCCESS,
      CommandInvocationStatus.FAILED,
      CommandInvocationStatus.CANCELLED,
      CommandInvocationStatus.TIMED_OUT,
      CommandInvocationStatus.CANCELLING
    ] as CommandInvocationStatus[]
  ).includes(status as CommandInvocationStatus);

class CloudwatchLogStreamPrinter {
  logGroupName: string;
  logStreamName: string;
  fetchSince: number;
  handledEvents = new Set<string>();

  constructor({
    fetchSince,
    logGroupName,
    logStreamName
  }: {
    fetchSince: number;
    logGroupName: string;
    logStreamName: string;
  }) {
    this.fetchSince = fetchSince;
    this.logGroupName = logGroupName;
    this.logStreamName = logStreamName;
  }

  printLogs = async () => {
    const events = await awsSdkManager.observability.getLogEvents({
      logGroupName: this.logGroupName,
      logStreamNames: [this.logStreamName],
      startTime: this.fetchSince
    });
    if (!events.length) {
      return;
    }
    this.fetchSince = events[events.length - 1].timestamp;
    events
      .filter((event) => !this.handledEvents.has(event.eventId))
      .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))
      .forEach((event) => this.printEvent(event));
    events.forEach((event) => this.handledEvents.add(event.eventId));
  };

  private printEvent = (event: FilteredLogEvent) => {
    const message = event.message?.trim();
    if (!message) {
      return;
    }
    const renderedLine = `${tuiManager.colorize(
      'gray',
      `[${new Date(event.timestamp || Date.now()).toLocaleTimeString()}]:`
    )} ${message}`;
    if (tuiManager.mode !== 'jsonl') {
      console.info(renderedLine);
    }
    tuiManager.emitCollectorLog({ level: 'info', source: 'ec2-runner-log', message: renderedLine });
  };
}
