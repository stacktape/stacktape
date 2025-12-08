import type { Task as ECSTask, ExecuteCommandCommandInput } from '@aws-sdk/client-ecs';
import type { StartSessionCommandInput } from '@aws-sdk/client-ssm';
import type { ExecaChildProcess } from 'execa';
import readline from 'node:readline';
import { globalStateManager } from '@application-services/global-state-manager';
import { CommandInvocationStatus } from '@aws-sdk/client-ssm';
import { stpErrors } from '@errors';
import { fsPaths } from '@shared/naming/fs-paths';
import { injectedParameterEnvVarName } from '@shared/naming/utils';
import { wait } from '@shared/utils/misc';
import { isPortInUse } from '@shared/utils/ports';
import execa from 'execa';
import findFreePorts from 'find-free-ports';
import pRetry from 'p-retry';
import { awsSdkManager } from './aws-sdk-manager';
import { SsmExecuteScriptCloudwatchLogPrinter } from './cloudwatch-logs';
import { printer } from './printer';

export class SsmPortForwardingTunnel {
  #instanceId: string;
  #region: string;
  #remoteHost: string;
  #remotePort: number;
  #localPort: number;
  #ssmSessionId: string;
  #tunnelProcess: ExecaChildProcess;
  #targetInfo: ResolvedRemoteTarget;

  constructor({ localPort, targetInfo }: { localPort: number; targetInfo: ResolvedRemoteTarget }) {
    this.#instanceId = targetInfo.bastionInstanceId;
    this.#region = globalStateManager.region;
    this.#remoteHost = targetInfo.remoteHost;
    this.#remotePort = targetInfo.remotePort;
    this.#localPort = localPort;
    this.#targetInfo = targetInfo;
  }

  get localPort() {
    return this.#localPort;
  }

  get remoteHost() {
    return this.#remoteHost;
  }

  get targetInfo() {
    return this.#targetInfo;
  }

  get remotePort() {
    return this.#remotePort;
  }

  connect = async () => {
    return new Promise((resolve, reject) => {
      const startSessionCommandInput: StartSessionCommandInput = {
        Target: this.#instanceId,
        DocumentName: 'AWS-StartPortForwardingSessionToRemoteHost',
        Parameters: {
          host: [this.#remoteHost],
          portNumber: [String(this.#remotePort)],
          localPortNumber: [String(this.localPort)]
        },
        Reason: `tunneling session to ${this.#remoteHost}:${this.#remotePort} (user ${globalStateManager.userData.id})`
      };
      pRetry(
        async () => {
          return awsSdkManager.startSsmSession(startSessionCommandInput).then((startSessionResponse) => {
            this.#ssmSessionId = startSessionResponse.SessionId;
            this.#tunnelProcess = execa(fsPaths.sessionManagerPath(), [
              JSON.stringify(startSessionResponse),
              this.#region,
              'StartSession',
              '',
              JSON.stringify(startSessionCommandInput)
            ]);

            readline
              .createInterface({
                input: this.#tunnelProcess.stdout,
                crlfDelay: Infinity
              })
              .on('line', (line) => {
                if (line.includes('Waiting for connections')) {
                  resolve(true);
                }
              });
          });
        },
        {
          retries: 5,
          onFailedAttempt: (error) => {
            if (!`${error}`.includes('TargetNotConnected')) {
              throw error;
            }
            printer.debug(`Tunneling through ${this.#instanceId} failed. Attempting reconnect`);
          }
        }
      ).catch((error) => reject(error));

      // automatically send reject after 10 seconds
      // if the Promise was already resolved, this will do nothing
      // otherwise this helps for process not to keep hanging
      // it is up to caller of this function to actually kill the process (if it is not dead already)
      setTimeout(() => {
        // if (this.#tunnelProcess.exitCode) {
        //   console.log('exit code', this.#tunnelProcess.exitCode);
        //   console.log('stderr', this.#tunnelProcess.);
        // }
        reject(new Error(`Opening tunnel connection to ${this.#remoteHost}:${this.#remotePort} timed out.`));
      }, 10000);
    });
  };

  kill = async () => {
    if (this.#tunnelProcess?.exitCode === null) {
      this.#tunnelProcess.kill();
      await wait(2000);
      if (this.#tunnelProcess.exitCode === null) {
        this.#tunnelProcess.kill('SIGKILL');
      }
      await awsSdkManager.terminateSsmSession({ sessionId: this.#ssmSessionId });
    }
    return true;
  };
}

export const runBastionSsmShellSession = async ({ instanceId, region }: { instanceId: string; region: string }) => {
  const startSessionCommandInput: StartSessionCommandInput = {
    Target: instanceId,
    Reason: `user ${globalStateManager.userData.id} session`
  };

  const startSessionResponse = await awsSdkManager.startSsmSession(startSessionCommandInput);

  try {
    await execa(
      fsPaths.sessionManagerPath(),
      [JSON.stringify(startSessionResponse), region, 'StartSession', '', JSON.stringify(startSessionCommandInput)],
      { stdio: 'inherit' }
    );
  } finally {
    await awsSdkManager.terminateSsmSession({ sessionId: startSessionResponse.SessionId });
  }
  return startSessionResponse.SessionId;
};

export const runEcsExecSsmShellSession = async ({
  task,
  containerName,
  command,
  region
}: {
  task: ECSTask;
  containerName: string;
  command?: string;
  region: string;
}) => {
  const executeCommandCommandInput: ExecuteCommandCommandInput = {
    command: command || '/bin/sh',
    interactive: true,
    task: task.taskArn,
    cluster: task.clusterArn,
    container: containerName
  };

  const startSessionResponse = await awsSdkManager.startEcsExecSsmSession(executeCommandCommandInput);

  const clusterName = task.clusterArn.split('/').pop();
  const taskId = task.taskArn.split('/').pop();
  const targetContainerRuntimeId = task.containers.find(({ name }) => name === containerName)?.runtimeId;
  const startSessionTargetParams = { Target: `ecs:${clusterName}_${taskId}_${targetContainerRuntimeId}` };

  try {
    await execa(
      fsPaths.sessionManagerPath(),
      [JSON.stringify(startSessionResponse), region, 'StartSession', '', JSON.stringify(startSessionTargetParams)],
      { stdio: 'inherit' }
    );
  } finally {
    await awsSdkManager.terminateSsmSession({ sessionId: startSessionResponse.SessionId });
  }
  return startSessionResponse.SessionId;
};

export const runSsmShellScript = async ({
  instanceId,
  commands,
  cwd,
  env
}: {
  instanceId: string;
  commands: string[];
  cwd?: string;
  env: Record<string, any>;
}) => {
  const setEnvVarsCommands = Object.entries(env).map(([name, value]) => `export ${name}="${value}"`);
  const startShellScriptResponse = await awsSdkManager.startSsmShellScript({
    instanceId,
    commands: [...setEnvVarsCommands, 'set -e', ...commands],
    cwd
  });

  await wait(2000);

  let executionInfo = await awsSdkManager.getSsmShellScriptExecution({
    instanceId,
    commandId: startShellScriptResponse.Command.CommandId
  });
  const commandFailureStatus = [
    CommandInvocationStatus.CANCELLED,
    CommandInvocationStatus.TIMED_OUT,
    CommandInvocationStatus.FAILED
  ] as const;
  const logGroupName = '/aws/ssm/AWS-RunShellScript';

  const logPrinter = new SsmExecuteScriptCloudwatchLogPrinter({
    logGroupName,
    fetchSince: new Date(executionInfo.RequestedDateTime).getTime(),
    commandId: executionInfo.CommandId,
    instanceId
  });

  while (executionInfo.Status !== CommandInvocationStatus.SUCCESS) {
    if (commandFailureStatus.includes(executionInfo.Status as any)) {
      await wait(1000);
      await logPrinter.printLogs();
      throw new Error('Command exited with non-zero status.');
    }
    await logPrinter.printLogs();
    await wait(2000);
    executionInfo = await awsSdkManager.getSsmShellScriptExecution({
      instanceId,
      commandId: startShellScriptResponse.Command.CommandId
    });
  }

  // after successful invocation wait for 2 seconds for the logs before returning
  await wait(2000);
  await logPrinter.printLogs();
};

export const startPortForwardingSessions = async ({
  targets,
  startAtPort
}: {
  targets: ResolvedRemoteTarget[];
  startAtPort?: number;
}) => {
  let localPortsToUse = [];
  if (startAtPort) {
    localPortsToUse = Array.from({ length: targets.length }, (_, i) => startAtPort + i);
    for (const localPort of localPortsToUse) {
      if (await isPortInUse(localPort)) {
        throw stpErrors.e130({ port: localPort });
      }
    }
  } else {
    localPortsToUse = await findFreePorts(targets.length, { jobCount: 1 });
  }
  const tunnels = targets.map((targetInfo, index) => {
    return new SsmPortForwardingTunnel({
      localPort: localPortsToUse[index],
      targetInfo
    });
  });
  const tunnelConnections = await Promise.allSettled(tunnels.map((tunnel) => tunnel.connect()));

  const unsuccessfulTunnel = tunnelConnections.find(({ status }) => status === 'rejected') as PromiseRejectedResult;
  if (unsuccessfulTunnel) {
    await Promise.all(tunnels.map((tunnel) => tunnel.kill()));
    throw stpErrors.e96({ err: new Error(unsuccessfulTunnel.reason) });
  }
  return tunnels;
};

export const substituteTunneledEndpointsInEnvironmentVars = ({
  tunnels = [],
  env = [],
  host = '127.0.0.1'
}: {
  tunnels: SsmPortForwardingTunnel[];
  env: EnvironmentVar[];
  host?: string;
}): EnvironmentVar[] => {
  env.forEach((envVar) => {
    tunnels.forEach((tunnel) => {
      tunnel.targetInfo.affectedReferencableParams.forEach((paramName) => {
        if (envVar.name === injectedParameterEnvVarName(tunnel.targetInfo.targetStpName, paramName)) {
          envVar.value = `${envVar.value}`.replaceAll(
            `${tunnel.remoteHost}:${tunnel.remotePort}`,
            `${host}:${tunnel.localPort}`
          );
        }
      });
    });
  });
  env.forEach((envVar) => {
    tunnels.forEach((tunnel) => {
      tunnel.targetInfo.affectedReferencableParams.forEach((paramName) => {
        if (envVar.name === injectedParameterEnvVarName(tunnel.targetInfo.targetStpName, paramName)) {
          envVar.value = `${envVar.value}`.replaceAll(`${tunnel.remoteHost}`, '127.0.0.1');
        }
      });
    });
  });
  env.forEach((envVar) => {
    tunnels.forEach((tunnel) => {
      tunnel.targetInfo.affectedReferencableParams.forEach((paramName) => {
        if (envVar.name === injectedParameterEnvVarName(tunnel.targetInfo.targetStpName, paramName)) {
          envVar.value = `${envVar.value}`.replaceAll(`${tunnel.remotePort}`, `${tunnel.localPort}`);
        }
      });
    });
  });

  return env;
};
