import type { SSMClient, StartSessionCommandInput, StartSessionResponse } from '@aws-sdk/client-ssm';
import { setTimeout as delay } from 'node:timers/promises';
import {
  DescribeInstanceInformationCommand,
  GetCommandInvocationCommand,
  ListCommandInvocationsCommand,
  SendCommandCommand,
  StartSessionCommand,
  TerminateSessionCommand
} from '@aws-sdk/client-ssm';

type ErrorHandlerFactory = (message: string) => (error: Error) => never;

export class AwsSystemsManager {
  readonly #createClient: () => SSMClient;
  readonly #getErrorHandler: ErrorHandlerFactory;

  constructor({
    createClient,
    getErrorHandler
  }: {
    createClient: () => SSMClient;
    getErrorHandler: ErrorHandlerFactory;
  }) {
    this.#createClient = createClient;
    this.#getErrorHandler = getErrorHandler;
  }

  startSession = async (startSessionInput: StartSessionCommandInput) => {
    const errorHandler = this.#getErrorHandler('Unable to start SSM session');
    const { SessionId, StreamUrl, TokenValue } = await this.#createClient()
      .send(new StartSessionCommand(startSessionInput))
      .catch(errorHandler);
    return { SessionId, StreamUrl, TokenValue } as StartSessionResponse;
  };

  /** Whether the instance's SSM agent is connected, so a session to it can start. */
  isInstanceOnline = async ({ instanceId }: { instanceId: string }) => {
    const errorHandler = this.#getErrorHandler(`Unable to read the SSM status of instance ${instanceId}`);
    const { InstanceInformationList } = await this.#createClient()
      .send(new DescribeInstanceInformationCommand({ Filters: [{ Key: 'InstanceIds', Values: [instanceId] }] }))
      .catch(errorHandler);
    return InstanceInformationList?.[0]?.PingStatus === 'Online';
  };

  terminateSession = async ({ sessionId }: { sessionId: string }) => {
    const errorHandler = this.#getErrorHandler('Unable to terminate SSM session');
    await this.#createClient()
      .send(new TerminateSessionCommand({ SessionId: sessionId }))
      .catch(errorHandler);
  };

  startShellScript = async ({
    instanceId,
    commands,
    cwd = '/'
  }: {
    instanceId: string;
    commands: string[];
    cwd?: string;
  }) => {
    const errorHandler = this.#getErrorHandler(`Unable to start shell script on instance ${instanceId}`);
    return this.#createClient()
      .send(
        new SendCommandCommand({
          DocumentName: 'AWS-RunShellScript',
          InstanceIds: [instanceId],
          Parameters: { commands, workingDirectory: [cwd] },
          CloudWatchOutputConfig: { CloudWatchOutputEnabled: true }
        })
      )
      .catch(errorHandler);
  };

  getShellScriptExecution = async ({ instanceId, commandId }: { instanceId: string; commandId: string }) => {
    const errorHandler = this.#getErrorHandler(
      `Error when fetching information about shell script execution on instance ${instanceId}`
    );
    const {
      CommandInvocations: [commandInvocationInfo]
    } = await this.#createClient()
      .send(new ListCommandInvocationsCommand({ CommandId: commandId, InstanceId: instanceId }))
      .catch(errorHandler);
    return commandInvocationInfo;
  };

  /**
   * Runs a shell script on an instance with Run Command and resolves once it succeeded. Its output goes nowhere but the
   * command's own record. Rejects when it fails, times out or does not end within `waitMs`, with the end of its errors.
   */
  runShellScriptAndWait = async ({
    instanceId,
    script,
    comment,
    timeoutSeconds = 60,
    waitMs = 120_000,
    pollMs = 1000
  }: {
    instanceId: string;
    script: string;
    /** Shown in the Run Command history; at most 100 characters. */
    comment: string;
    timeoutSeconds?: number;
    waitMs?: number;
    pollMs?: number;
  }) => {
    const client = this.#createClient();
    const { Command } = await client
      .send(
        new SendCommandCommand({
          DocumentName: 'AWS-RunShellScript',
          InstanceIds: [instanceId],
          Comment: comment.slice(0, 100),
          Parameters: { commands: script.split('\n'), executionTimeout: [String(timeoutSeconds)] }
        })
      )
      .catch(this.#getErrorHandler(`Unable to run a command on instance ${instanceId}`));
    const commandId = Command!.CommandId!;
    const deadline = Date.now() + waitMs;
    for (;;) {
      const invocation = await client
        .send(new GetCommandInvocationCommand({ CommandId: commandId, InstanceId: instanceId }))
        .catch((error: Error) => {
          // Run Command records the invocation a moment after it accepted the command.
          if (error.name === 'InvocationDoesNotExist') return undefined;
          throw error;
        });
      const status = invocation?.Status;
      if (status === 'Success') return;
      if (status && !['Pending', 'InProgress', 'Delayed'].includes(status)) {
        const errors = invocation?.StandardErrorContent?.trim().split('\n').slice(-5).join('\n');
        throw new Error(
          `The command ${commandId} on instance ${instanceId} ended with ${status}${errors ? `: ${errors}` : ''}.`
        );
      }
      if (Date.now() > deadline) {
        throw new Error(`The command ${commandId} on instance ${instanceId} did not end within ${waitMs / 1000} s.`);
      }
      await delay(pollMs);
    }
  };
}
