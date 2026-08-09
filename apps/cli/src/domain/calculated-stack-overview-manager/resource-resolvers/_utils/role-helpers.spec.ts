import { describe, expect, test } from 'bun:test';
import { getStatementsForAccessingAgentCoreResource, type StpAgentCoreConnectToTarget } from './role-helpers';

const baseResource = {
  name: 'target',
  nameChain: ['target']
};

describe('AgentCore connectTo IAM permissions', () => {
  test('allows invoking a runtime and each configured endpoint', () => {
    const [statement] = getStatementsForAccessingAgentCoreResource({
      ...baseResource,
      type: 'agentcore-runtime',
      configParentResourceType: 'agentcore-runtime',
      jobName: 'target',
      packaging: { type: 'prebuilt-image', properties: { image: 'example.invalid/image:tag' } },
      endpoints: ['default', { name: 'stable', runtimeVersion: '1' }],
      connectTo: []
    });

    expect(statement.Action).toContain('bedrock-agentcore:InvokeAgentRuntime');
    expect(statement.Resource as unknown).toEqual([
      { 'Fn::GetAtt': ['TargetRuntime', 'AgentRuntimeArn'] },
      { Ref: 'TargetDefaultRuntimeEndpoint' },
      { Ref: 'TargetStableRuntimeEndpoint' }
    ]);
  });

  test.each([
    ['agentcore-memory', 'bedrock-agentcore:RetrieveMemoryRecords', { Ref: 'TargetMemory' }],
    ['agentcore-gateway', 'bedrock-agentcore:InvokeGateway', { 'Fn::GetAtt': ['TargetGateway', 'GatewayArn'] }],
    [
      'agentcore-browser',
      'bedrock-agentcore:StartBrowserSession',
      { 'Fn::GetAtt': ['TargetBrowserCustom', 'BrowserArn'] }
    ],
    [
      'agentcore-code-interpreter',
      'bedrock-agentcore:InvokeCodeInterpreter',
      { 'Fn::GetAtt': ['TargetCodeInterpreterCustom', 'CodeInterpreterArn'] }
    ]
  ] as const)('uses scoped data-plane access for %s', (type, action, resourceArn) => {
    const resource = { ...baseResource, type, configParentResourceType: type } as StpAgentCoreConnectToTarget;
    const [statement] = getStatementsForAccessingAgentCoreResource(resource);

    expect(statement.Action).toContain(action);
    expect(statement.Resource as unknown).toEqual([resourceArn]);
  });
});
