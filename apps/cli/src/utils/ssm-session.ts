import type { ResolvedRemoteTarget } from '@domain-services/config-manager/resolved-types/resources';
import type { Task as ECSTask, ExecuteCommandCommandInput } from '@aws-sdk/client-ecs';
import { DesiredStatus } from '@aws-sdk/client-ecs';
import type { StartSessionCommandInput } from '@aws-sdk/client-ssm';
import type { ResultPromise } from 'execa';
import readline from 'node:readline';
import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { CommandInvocationStatus } from '@aws-sdk/client-ssm';
import { stpErrors } from '@errors';
import { CliError } from '@utils/errors';
import { fsPaths } from 'src/config/runtime-paths';
import { injectedParameterEnvVarName } from '@stacktape/naming/workload-names';
import { wait } from '@utils/misc';
import { isPortInUse } from '@utils/ports';
import { execa } from 'execa';
import findFreePorts from 'find-free-ports';
import { chmod } from 'fs-extra';
import pRetry from 'p-retry';
import { awsSdkManager } from './aws-sdk-manager';
import { SsmExecuteScriptCloudwatchLogPrinter } from './cloudwatch-logs';
import type { EnvironmentVar } from '@stacktape/config/shared';

let sessionManagerPluginPrepared = false;

const ensureSessionManagerPluginExecutable = async () => {
  if (sessionManagerPluginPrepared || process.platform === 'win32') {
    return;
  }
  await chmod(fsPaths.sessionManagerPath(), 0o755);
  sessionManagerPluginPrepared = true;
};

export class SsmPortForwardingTunnel {
  #instanceId: string;
  #region: string;
  #remoteHost: string;
  #remotePort: number;
  #localPort: number;
  #ssmSessionId: string | undefined;
  #tunnelProcess: ResultPromise;
  #tunnelExited: Promise<void>;
  #killPromise: Promise<boolean> | undefined;
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
    const startSessionResponse = await pRetry(
      () => awsSdkManager.systemsManager.startSession(startSessionCommandInput),
      {
        retries: 5,
        onFailedAttempt: ({ error }) => {
          if (!`${error}`.includes('TargetNotConnected')) throw error;
          tuiManager.debug(`Tunnel via ${this.#instanceId} failed. Reconnecting...`);
        }
      }
    );
    this.#ssmSessionId = startSessionResponse.SessionId;
    await ensureSessionManagerPluginExecutable();
    this.#tunnelProcess = execa(fsPaths.sessionManagerPath(), [
      JSON.stringify(startSessionResponse),
      this.#region,
      'StartSession',
      '',
      JSON.stringify(startSessionCommandInput)
    ]);
    // Execa failures contain argv, including the SSM token. Never propagate that error or retain it as a cause.
    this.#tunnelExited = this.#tunnelProcess.then(
      () => undefined,
      () => undefined
    );

    await new Promise<void>((resolve, reject) => {
      const lines = readline.createInterface({ input: this.#tunnelProcess.stdout, crlfDelay: Infinity });
      const timeout = setTimeout(() => {
        lines.close();
        reject(
          new CliError({
            category: 'AWS',
            code: 'SSM_TUNNEL_START_TIMEOUT',
            message: `Opening tunnel connection to ${this.#remoteHost}:${this.#remotePort} timed out.`,
            hints: 'Check the bastion connection and retry the command.'
          })
        );
      }, 10000);
      lines.on('line', (line) => {
        if (line.includes('Waiting for connections')) {
          clearTimeout(timeout);
          lines.close();
          resolve();
        }
      });
      void this.#tunnelExited.then(() => {
        clearTimeout(timeout);
        lines.close();
        reject(
          new CliError({
            category: 'AWS',
            code: 'SSM_TUNNEL_START_FAILED',
            message: `The SSM tunnel to ${this.#remoteHost}:${this.#remotePort} closed before it was ready.`,
            hints: 'Check the bastion connection and retry the command.'
          })
        );
      });
    });
    return true;
  };

  /** Settles on any plugin exit, including a successful exit after the server closes an idle session. */
  waitForExit = async () => {
    await this.#tunnelExited;
  };

  kill = async () => {
    this.#killPromise ??= (async () => {
      if (this.#tunnelProcess?.nodeChildProcess.exitCode === null) {
        this.#tunnelProcess.kill();
        await Promise.race([this.#tunnelExited, wait(2000)]);
        if (this.#tunnelProcess.nodeChildProcess.exitCode === null) this.#tunnelProcess.kill('SIGKILL');
        await this.#tunnelExited;
      }
      // Terminate the server session even if the plugin has already exited or could not start.
      if (this.#ssmSessionId) {
        await awsSdkManager.systemsManager.terminateSession({ sessionId: this.#ssmSessionId });
        this.#ssmSessionId = undefined;
      }
      return true;
    })();
    return this.#killPromise;
  };
}

export const runBastionSsmShellSession = async ({ instanceId, region }: { instanceId: string; region: string }) => {
  const startSessionCommandInput: StartSessionCommandInput = {
    Target: instanceId,
    Reason: `user ${globalStateManager.userData.id} session`
  };

  const startSessionResponse = await awsSdkManager.systemsManager.startSession(startSessionCommandInput);

  try {
    await ensureSessionManagerPluginExecutable();
    await execa(
      fsPaths.sessionManagerPath(),
      [JSON.stringify(startSessionResponse), region, 'StartSession', '', JSON.stringify(startSessionCommandInput)],
      { stdio: 'inherit' }
    );
  } finally {
    await awsSdkManager.systemsManager.terminateSession({ sessionId: startSessionResponse.SessionId });
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

  const startSessionResponse = await awsSdkManager.ecs.startExecSession(executeCommandCommandInput);

  const clusterName = task.clusterArn.split('/').pop();
  const taskId = task.taskArn.split('/').pop();
  const targetContainerRuntimeId = task.containers.find(({ name }) => name === containerName)?.runtimeId;
  const startSessionTargetParams = { Target: `ecs:${clusterName}_${taskId}_${targetContainerRuntimeId}` };

  try {
    await ensureSessionManagerPluginExecutable();
    await execa(
      fsPaths.sessionManagerPath(),
      [JSON.stringify(startSessionResponse), region, 'StartSession', '', JSON.stringify(startSessionTargetParams)],
      { stdio: 'inherit' }
    );
  } finally {
    await awsSdkManager.systemsManager.terminateSession({ sessionId: startSessionResponse.SessionId });
  }
  return startSessionResponse.SessionId;
};

/**
 * Execute a command in a container and capture output (non-interactive)
 */
export const runEcsExecCommand = async ({
  clusterArn,
  taskArn,
  containerName,
  command
}: {
  clusterArn: string;
  taskArn: string;
  containerName: string;
  command: string;
}): Promise<{ output: string; exitCode: number }> => {
  const executeCommandCommandInput: ExecuteCommandCommandInput = {
    command,
    interactive: true, // ECS Exec requires interactive=true even for non-interactive commands
    task: taskArn,
    cluster: clusterArn,
    container: containerName
  };

  const startSessionResponse = await awsSdkManager.ecs.startExecSession(executeCommandCommandInput);

  const clusterName = clusterArn.split('/').pop();
  const taskId = taskArn.split('/').pop();

  // Get task details to find container runtime ID
  const tasks = await awsSdkManager.ecs.listTasks({
    ecsClusterName: clusterArn,
    desiredStatus: DesiredStatus.RUNNING
  });
  const task = tasks.find((t) => t.taskArn === taskArn);
  const targetContainerRuntimeId = task?.containers?.find(({ name }) => name === containerName)?.runtimeId;

  const startSessionTargetParams = { Target: `ecs:${clusterName}_${taskId}_${targetContainerRuntimeId}` };

  try {
    await ensureSessionManagerPluginExecutable();
    const result = await execa(
      fsPaths.sessionManagerPath(),
      [
        JSON.stringify(startSessionResponse),
        globalStateManager.region,
        'StartSession',
        '',
        JSON.stringify(startSessionTargetParams)
      ],
      {
        timeout: 60000, // 60 second timeout
        reject: false // Don't throw on non-zero exit
      }
    );

    return {
      output: result.stdout || result.stderr || '',
      exitCode: result.exitCode ?? 1
    };
  } finally {
    await awsSdkManager.systemsManager.terminateSession({ sessionId: startSessionResponse.SessionId });
  }
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
  const startShellScriptResponse = await awsSdkManager.systemsManager.startShellScript({
    instanceId,
    commands: [...setEnvVarsCommands, 'set -e', ...commands],
    cwd
  });

  await wait(2000);

  let executionInfo = await awsSdkManager.systemsManager.getShellScriptExecution({
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
    executionInfo = await awsSdkManager.systemsManager.getShellScriptExecution({
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

export type TunneledEnvironmentVariableReference = {
  envName: string;
  targetStpName: string;
  paramName: string;
};

/** Retain which unresolved application variable came from which tunneled resource parameter. */
export const getTunneledEnvironmentVariableReferences = ({
  tunnels,
  env
}: {
  tunnels: SsmPortForwardingTunnel[];
  env: EnvironmentVar[];
}): TunneledEnvironmentVariableReference[] =>
  env.flatMap((envVar) =>
    tunnels.flatMap((tunnel) =>
      tunnel.targetInfo.affectedReferencableParams
        .filter((paramName) => envVar.value === `$ResourceParam('${tunnel.targetInfo.targetStpName}', '${paramName}')`)
        .map((paramName) => ({
          envName: envVar.name,
          targetStpName: tunnel.targetInfo.targetStpName,
          paramName
        }))
    )
  );

export const substituteTunneledEndpointsInEnvironmentVars = ({
  tunnels = [],
  env = [],
  host = '127.0.0.1',
  references = []
}: {
  tunnels: SsmPortForwardingTunnel[];
  env: EnvironmentVar[];
  host?: string;
  /** Origins retained from unresolved `$ResourceParam` values for application-named variables. */
  references?: TunneledEnvironmentVariableReference[];
}): EnvironmentVar[] => {
  const substituted = env.map((envVar) => {
    let value = envVar.value;
    for (const tunnel of tunnels) {
      const original = `${value}`;
      const injectedParam = tunnel.targetInfo.affectedReferencableParams.find(
        (paramName) => envVar.name === injectedParameterEnvVarName(tunnel.targetInfo.targetStpName, paramName)
      );
      const explicitParam = references.find(
        (reference) =>
          reference.envName === envVar.name &&
          reference.targetStpName === tunnel.targetInfo.targetStpName &&
          tunnel.targetInfo.affectedReferencableParams.some((paramName) => paramName === reference.paramName)
      )?.paramName;
      const refersToTunnel =
        injectedParam !== undefined || explicitParam !== undefined || original.includes(`${tunnel.remoteHost}`);
      if (!refersToTunnel) continue;
      if (original.includes(`${tunnel.remoteHost}`)) {
        value = original
          .replaceAll(`${tunnel.remoteHost}:${tunnel.remotePort}`, `${host}:${tunnel.localPort}`)
          .replaceAll(`${tunnel.remoteHost}`, host);
      } else if ((injectedParam === 'port' || explicitParam === 'port') && original === `${tunnel.remotePort}`) {
        value = `${tunnel.localPort}`;
      }
    }
    return { ...envVar, value };
  });

  // A tunneled connection still presents the target's real TLS certificate, so a client verifying
  // TLS against the substituted tunnel host fails the hostname check. Publishing the original host
  // under the established `STP_<RESOURCE>_TLS_SERVER_NAME` contract lets clients keep strict
  // verification (SNI + altname) while dialing the tunnel. Values the caller set for these names
  // were host-substituted above like everything else, so the authoritative entries are appended
  // last and win the merge into the final environment object.
  const tlsServerNameVars = tunnels.map((tunnel) => ({
    name: injectedParameterEnvVarName(tunnel.targetInfo.targetStpName, 'tlsServerName'),
    value: tunnel.remoteHost
  }));
  return [
    ...substituted.filter((envVar) => !tlsServerNameVars.some(({ name }) => name === envVar.name)),
    ...tlsServerNameVars
  ];
};
