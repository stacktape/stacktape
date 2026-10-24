import type { SSMClient, StartSessionCommandInput, StartSessionResponse } from '@aws-sdk/client-ssm';
import {
  DescribeInstanceInformationCommand,
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
}
