import { describe, expect, test } from 'bun:test';
import { buildInfoStackAgentResult, INFO_STACK_AGENT_SCHEMA_VERSION } from './agent-contract';

describe('info:stack agent contract', () => {
  test('builds a self-identifying result with the stack target and details', () => {
    expect(
      buildInfoStackAgentResult({
        stackName: 'orders-production',
        region: 'eu-west-1',
        details: {
          description: 'Orders API',
          stackOutput: { ApiUrl: 'https://example.com' },
          stackInfoMap: { api: { resourceType: 'function' } },
          resources: [{ LogicalResourceId: 'ApiFunction', ResourceType: 'AWS::Lambda::Function' }]
        }
      })
    ).toEqual({
      schemaVersion: INFO_STACK_AGENT_SCHEMA_VERSION,
      stackName: 'orders-production',
      region: 'eu-west-1',
      description: 'Orders API',
      stackOutput: { ApiUrl: 'https://example.com' },
      stackInfoMap: { api: { resourceType: 'function' } },
      resources: [{ LogicalResourceId: 'ApiFunction', ResourceType: 'AWS::Lambda::Function' }]
    });
  });

  test('normalizes missing optional Console fields', () => {
    expect(buildInfoStackAgentResult({ stackName: 'orders-dev', region: 'us-east-1', details: {} })).toEqual({
      schemaVersion: 'stacktape.info-stack.v1',
      stackName: 'orders-dev',
      region: 'us-east-1',
      description: null,
      stackOutput: {},
      stackInfoMap: null,
      resources: []
    });
  });
});
