import type { ScriptFn } from '@utils/scripts';
import type { SsmPortForwardingTunnel } from '@utils/ssm-session';
import { join, resolve } from 'node:path';
import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { configManager } from '@domain-services/config-manager';
import { deployedStackOverviewManager } from '@domain-services/deployed-stack-overview-manager';
import { ExpectedError } from '@utils/errors';
import { executeCommandHook, executeScriptHook, getScriptEnv } from '@utils/scripts';
import {
  runSsmShellScript,
  startPortForwardingSessions,
  substituteTunneledEndpointsInEnvironmentVars
} from '@utils/ssm-session';
import { validateScript } from '@utils/validator';
import { getLocalInvokeAwsCredentials } from '../_utils/assume-role';

export const getExecutableScriptFunction = (props: { scriptDefinition: Script; hookTrigger?: string }) => {
  const { scriptDefinition } = props;
  validateScript(scriptDefinition);
  if (scriptDefinition.type === 'local-script' || scriptDefinition.type === 'local-script-with-bastion-tunneling') {
    return getLocalScriptExecutionFn({
      ...props,
      scriptDefinition: scriptDefinition as (LocalScript | LocalScriptWithBastionTunneling) & { scriptName: string }
    });
  }
  return getBastionScriptExecutionFn({
    ...props,
    scriptDefinition: scriptDefinition as BastionScript & { scriptName: string }
  });
};

const getBastionScriptExecutionFn = ({
  scriptDefinition,
  hookTrigger
}: {
  scriptDefinition: BastionScript & { scriptName: string };
  hookTrigger?: string;
}) => {
  return async ({ errorData, hookType }: ScriptFn) => {
    const resolvedScriptDefinition = (await configManager.resolveDirectives({
      itemToResolve: scriptDefinition,
      resolveRuntime: true,
      useLocalResolve: true
    })) as BastionScript & {
      scriptName: string;
    };

    const executeSequence = [
      resolvedScriptDefinition.properties.executeCommand,
      ...(resolvedScriptDefinition.properties.executeCommands || [])
    ].filter(Boolean);

    let assumedRoleAWSEnvVars: EnvironmentVar[] = [];

    if (resolvedScriptDefinition.properties.assumeRoleOfResource) {
      assumedRoleAWSEnvVars = Object.entries(
        await getLocalInvokeAwsCredentials({
          assumeRoleOfWorkload: resolvedScriptDefinition.properties.assumeRoleOfResource
        })
      ).map(([name, value]) => ({ name, value }));
    }

    const connectToEnvVars: EnvironmentVar[] = Object.entries(
      deployedStackOverviewManager.locallyResolveEnvVariablesFromConnectTo(
        resolvedScriptDefinition.properties.connectTo
      )
    ).map(([name, value]) => ({ name, value }));

    const { bastionResourceStpName, bastionInstanceId } = deployedStackOverviewManager.resolveBastionInstanceInfo(
      resolvedScriptDefinition.properties.bastionResource
    );

    const scriptDescription = `${hookTrigger ? `(${hookTrigger} hook) ` : ''}${resolvedScriptDefinition.scriptName}`;
    const eventInstanceId = `${hookTrigger || 'manual'}-${resolvedScriptDefinition.scriptName}`;

    tuiManager.startEvent({
      eventType: 'RUN_SCRIPT',
      description: `Running script ${scriptDescription} on bastion ${bastionResourceStpName}`,
      instanceId: eventInstanceId
    });
    try {
      const env = getScriptEnv({
        userDefinedEnv: resolvedScriptDefinition.properties.environment,
        connectToEnv: connectToEnvVars,
        command: globalStateManager.command,
        fullHookTrigger: hookTrigger,
        errorData,
        hookType,
        assumedRoleAWSEnvVars
      });

      await runSsmShellScript({
        commands: executeSequence,
        env,
        instanceId: bastionInstanceId,
        cwd: resolvedScriptDefinition.properties.cwd
      });
      tuiManager.finishEvent({
        eventType: 'RUN_SCRIPT',
        instanceId: eventInstanceId
      });
    } catch (err) {
      tuiManager.finishEvent({
        eventType: 'RUN_SCRIPT',
        instanceId: eventInstanceId,
        status: 'error'
      });
      throw new ExpectedError(
        'SCRIPT',
        `Failed to execute ${hookTrigger ? `(${hookTrigger} hook) ` : ''}script ${tuiManager.colorize(
          'blue',
          resolvedScriptDefinition.scriptName
        )} on bastion ${tuiManager.makeBold(bastionResourceStpName)}. Error:\n${err}`
      );
    }
  };
};

const getLocalScriptExecutionFn = ({
  scriptDefinition,
  hookTrigger
}: {
  scriptDefinition: (LocalScript | LocalScriptWithBastionTunneling) & { scriptName: string };
  hookTrigger?: string;
}) => {
  return async ({ errorData, hookType }: ScriptFn) => {
    const resolvedScriptDefinition = (await configManager.resolveDirectives({
      itemToResolve: scriptDefinition,
      resolveRuntime: true,
      useLocalResolve: true
    })) as (LocalScript | LocalScriptWithBastionTunneling) & { scriptName: string };
    const commandOrScript =
      resolvedScriptDefinition.properties.executeCommand || resolvedScriptDefinition.properties.executeCommands
        ? 'command'
        : 'script';
    const executeSequence = [
      resolvedScriptDefinition.properties.executeScript,
      ...(resolvedScriptDefinition.properties.executeScripts || []),
      resolvedScriptDefinition.properties.executeCommand,
      ...(resolvedScriptDefinition.properties.executeCommands || [])
    ].filter(Boolean);

    let assumedRoleAWSEnvVars: EnvironmentVar[] = [];

    if (resolvedScriptDefinition.properties.assumeRoleOfResource) {
      assumedRoleAWSEnvVars = Object.entries(
        await getLocalInvokeAwsCredentials({
          assumeRoleOfWorkload: resolvedScriptDefinition.properties.assumeRoleOfResource
        })
      ).map(([name, value]) => ({ name, value }));
    }

    let connectToEnvVars: EnvironmentVar[] = Object.entries(
      deployedStackOverviewManager.locallyResolveEnvVariablesFromConnectTo(
        resolvedScriptDefinition.properties.connectTo
      )
    ).map(([name, value]) => ({ name, value }));

    let tunnels: SsmPortForwardingTunnel[] = [];
    if (resolvedScriptDefinition.type === 'local-script-with-bastion-tunneling') {
      const allTunnelTargets =
        (resolvedScriptDefinition.properties.connectTo || [])
          .map((target) => {
            return deployedStackOverviewManager.resolveBastionTunnelsForTarget({
              targetStpName: target,
              bastionStpName: resolvedScriptDefinition.properties.bastionResource
            });
          })
          .flat() || [];
      tunnels = await startPortForwardingSessions({ targets: allTunnelTargets });

      connectToEnvVars = substituteTunneledEndpointsInEnvironmentVars({
        tunnels,
        env: connectToEnvVars
      });
    }

    const pipeStdio =
      resolvedScriptDefinition.properties.pipeStdio !== undefined
        ? resolvedScriptDefinition.properties.pipeStdio
        : true;

    const scriptDisplayName = `${hookTrigger ? `(${hookTrigger} hook) ` : ''}${resolvedScriptDefinition.scriptName}`;
    const eventInstanceId = `${hookTrigger || 'manual'}-${resolvedScriptDefinition.scriptName}`;

    tuiManager.startEvent({
      eventType: 'RUN_SCRIPT',
      description: `Running script ${scriptDisplayName}`,
      instanceId: eventInstanceId
    });

    // Callback to capture script output and send to TUI
    // This avoids piping directly to stdout while streaming
    const onOutputLine = pipeStdio
      ? (line: string) => {
          tuiManager.appendEventOutput({
            eventType: 'RUN_SCRIPT',
            instanceId: eventInstanceId,
            lines: [line]
          });
        }
      : undefined;

    for (const commandOrScriptToExecute of executeSequence) {
      const currentDescription =
        commandOrScript === 'script'
          ? `script at ${join(globalStateManager.workingDir, commandOrScriptToExecute)}`
          : `command '${commandOrScriptToExecute}'`;

      tuiManager.updateEvent({
        eventType: 'RUN_SCRIPT',
        instanceId: eventInstanceId,
        additionalMessage: `Running ${currentDescription}`
      });

      try {
        const env = getScriptEnv({
          userDefinedEnv: resolvedScriptDefinition.properties.environment,
          connectToEnv: connectToEnvVars,
          command: globalStateManager.command,
          fullHookTrigger: hookTrigger,
          errorData,
          hookType,
          assumedRoleAWSEnvVars
        });
        const cwd = getScriptCwd(resolvedScriptDefinition);
        if (commandOrScript === 'command') {
          await executeCommandHook({
            command: commandOrScriptToExecute,
            env,
            cwd,
            pipeStdio,
            onOutputLine
          });
        } else {
          await executeScriptHook({
            env,
            filePath: commandOrScriptToExecute,
            cwd,
            pipeStdio,
            onOutputLine
          });
        }
      } catch (err) {
        tuiManager.finishEvent({
          eventType: 'RUN_SCRIPT',
          instanceId: eventInstanceId,
          status: 'error'
        });
        await Promise.all(tunnels.map((tunnel) => tunnel.kill()));
        throw new ExpectedError(
          'SCRIPT',
          `Failed to execute ${hookTrigger ? `(${hookTrigger} hook) ` : ''}${currentDescription}. Error:\n${err}`
        );
      }
    }

    tuiManager.finishEvent({
      eventType: 'RUN_SCRIPT',
      instanceId: eventInstanceId
    });
    await Promise.all(tunnels.map((tunnel) => tunnel.kill()));
  };
};

export const getScriptCwd = (script: LocalScript | LocalScriptWithBastionTunneling) => {
  return script.properties.cwd
    ? resolve(globalStateManager.workingDir, script.properties.cwd)
    : globalStateManager.workingDir;
};
