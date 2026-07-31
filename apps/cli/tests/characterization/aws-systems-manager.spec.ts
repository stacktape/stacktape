import { describe, expect, test } from 'bun:test';
import type { SSMClient } from '@aws-sdk/client-ssm';
import {
  ListCommandInvocationsCommand,
  SendCommandCommand,
  StartSessionCommand,
  TerminateSessionCommand
} from '@aws-sdk/client-ssm';
import { AwsSystemsManager } from '../../src/aws/systems-manager';

type Send = SSMClient['send'];

const systemsManagerWith = (send: Send) =>
  new AwsSystemsManager({
    createClient: () => ({ send }) as SSMClient,
    getErrorHandler: (message) => (error) => {
      throw new Error(message, { cause: error });
    }
  });

describe('AWS Systems Manager operations', () => {
  test('starts and terminates a Session Manager session without changing its wire contract', async () => {
    const requests: (StartSessionCommand | TerminateSessionCommand)[] = [];
    const systemsManager = systemsManagerWith((async (command: StartSessionCommand | TerminateSessionCommand) => {
      requests.push(command);
      return command instanceof StartSessionCommand
        ? {
            SessionId: 'session-1',
            StreamUrl: 'wss://ssmmessages.example/session-1',
            TokenValue: 'session-token',
            ignoredField: 'not part of the public response'
          }
        : {};
    }) as Send);

    await expect(
      systemsManager.startSession({
        DocumentName: 'AWS-StartInteractiveCommand',
        Parameters: { command: ['bash'] },
        Target: 'i-0123456789abcdef0'
      })
    ).resolves.toEqual({
      SessionId: 'session-1',
      StreamUrl: 'wss://ssmmessages.example/session-1',
      TokenValue: 'session-token'
    });
    await systemsManager.terminateSession({ sessionId: 'session-1' });

    expect(requests[0]).toBeInstanceOf(StartSessionCommand);
    expect(requests[0].input).toEqual({
      DocumentName: 'AWS-StartInteractiveCommand',
      Parameters: { command: ['bash'] },
      Target: 'i-0123456789abcdef0'
    });
    expect(requests[1]).toBeInstanceOf(TerminateSessionCommand);
    expect(requests[1].input).toEqual({ SessionId: 'session-1' });
  });

  test('runs a shell script with the established document, working directory, and CloudWatch output', async () => {
    const requests: SendCommandCommand[] = [];
    const systemsManager = systemsManagerWith((async (command: SendCommandCommand) => {
      requests.push(command);
      return { Command: { CommandId: 'command-1' } };
    }) as Send);

    await systemsManager.startShellScript({
      commands: ['echo ready', 'pwd'],
      instanceId: 'i-0123456789abcdef0'
    });
    await systemsManager.startShellScript({
      commands: ['pnpm test'],
      cwd: '/srv/application',
      instanceId: 'i-0123456789abcdef0'
    });

    expect(requests.map(({ input }) => input)).toEqual([
      {
        CloudWatchOutputConfig: { CloudWatchOutputEnabled: true },
        DocumentName: 'AWS-RunShellScript',
        InstanceIds: ['i-0123456789abcdef0'],
        Parameters: { commands: ['echo ready', 'pwd'], workingDirectory: ['/'] }
      },
      {
        CloudWatchOutputConfig: { CloudWatchOutputEnabled: true },
        DocumentName: 'AWS-RunShellScript',
        InstanceIds: ['i-0123456789abcdef0'],
        Parameters: { commands: ['pnpm test'], workingDirectory: ['/srv/application'] }
      }
    ]);
  });

  test('looks up a command for one instance and returns its first invocation', async () => {
    let request: ListCommandInvocationsCommand | undefined;
    const systemsManager = systemsManagerWith((async (command: ListCommandInvocationsCommand) => {
      request = command;
      return {
        CommandInvocations: [
          { CommandId: 'command-1', InstanceId: 'i-0123456789abcdef0', Status: 'Success' },
          { CommandId: 'command-1', InstanceId: 'ignored-instance', Status: 'Failed' }
        ]
      };
    }) as Send);

    await expect(
      systemsManager.getShellScriptExecution({
        commandId: 'command-1',
        instanceId: 'i-0123456789abcdef0'
      })
    ).resolves.toEqual({
      CommandId: 'command-1',
      InstanceId: 'i-0123456789abcdef0',
      Status: 'Success'
    });
    expect(request).toBeInstanceOf(ListCommandInvocationsCommand);
    expect(request?.input).toEqual({
      CommandId: 'command-1',
      InstanceId: 'i-0123456789abcdef0'
    });
  });
});
