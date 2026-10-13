import { recordStackOperationInputSchema } from '@stacktape/console-api/api-key';
import { commandArgsForRecording } from './stacktape-trpc-api-manager/recorded-command-args';
import { describe, expect, test } from 'bun:test';
import {
  getForwardableOperationInvocationEnv,
  getMcpOperationInvocationEnv,
  getStacktapeOperationInvocationContext,
  withStacktapeOperationInvocationContext
} from './operation-invocation-context';

describe('operation invocation context', () => {
  test('builds MCP operation environment for child CLI execution', () => {
    expect(getMcpOperationInvocationEnv({ client: 'claude-code', tool: 'stacktape_cli' })).toEqual({
      STP_OPERATION_INITIATOR: 'ai-agent',
      STP_OPERATION_INTERFACE: 'mcp',
      STP_OPERATION_CLIENT: 'claude-code',
      STP_OPERATION_TOOL: 'stacktape_cli'
    });
  });

  test('records an operation without inventing a stage when no target is known', () => {
    const commandArgs = withStacktapeOperationInvocationContext(
      commandArgsForRecording({ args: { region: 'eu-west-1' }, stage: undefined }),
      getMcpOperationInvocationEnv({ client: 'claude-code', tool: 'stacktape_cli' })
    );
    const recorded = recordStackOperationInputSchema.parse(
      JSON.parse(JSON.stringify({ invocationId: 'untargeted-operation', command: 'project:list', commandArgs }))
    );
    expect(recorded.commandArgs).toEqual({
      region: 'eu-west-1',
      __stacktapeInvocation: { initiator: 'ai-agent', interface: 'mcp', client: 'claude-code', tool: 'stacktape_cli' }
    });
  });

  test('ignores non-MCP invocation environment', () => {
    expect(getStacktapeOperationInvocationContext({ STP_OPERATION_INITIATOR: 'human' })).toBeUndefined();
    expect(withStacktapeOperationInvocationContext({ stage: 'production' }, {})).toEqual({ stage: 'production' });
  });

  test('forwards only sanitized MCP operation environment', () => {
    expect(
      getForwardableOperationInvocationEnv({
        STP_OPERATION_INITIATOR: 'ai-agent',
        STP_OPERATION_INTERFACE: 'mcp',
        STP_OPERATION_CLIENT: 'claude-code; rm -rf',
        STP_OPERATION_TOOL: 'stacktape_cli'
      })
    ).toEqual({
      STP_OPERATION_INITIATOR: 'ai-agent',
      STP_OPERATION_INTERFACE: 'mcp',
      STP_OPERATION_CLIENT: 'claude-code rm -rf',
      STP_OPERATION_TOOL: 'stacktape_cli'
    });
  });
});
