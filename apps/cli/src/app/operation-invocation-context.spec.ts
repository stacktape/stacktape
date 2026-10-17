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
