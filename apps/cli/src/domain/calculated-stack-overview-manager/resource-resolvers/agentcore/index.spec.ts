import { describe, expect, test } from 'bun:test';
import {
  getBrowserRecordingS3BucketArn,
  getBrowserRecordingS3ObjectArn,
  getAgentCoreGatewayResource,
  getRuntimeEndpointVersion,
  transformJsonSchema
} from './index';

describe('AgentCore resource resolver', () => {
  test('transforms JSON schema to AgentCore tool schema shape', () => {
    expect(
      transformJsonSchema({
        type: 'object',
        properties: {
          priority: {
            type: 'string',
            enum: ['low', 'normal', 'high']
          }
        },
        required: ['priority'],
        additionalProperties: false
      })
    ).toEqual({
      Type: 'object',
      Properties: {
        priority: {
          Type: 'string'
        }
      },
      Required: ['priority']
    });
  });

  test('defaults runtime endpoints to the current runtime version', () => {
    expect(getRuntimeEndpointVersion('SupportAgentRuntime', { name: 'production' })).toEqual({
      'Fn::GetAtt': ['SupportAgentRuntime', 'AgentRuntimeVersion']
    });
  });

  test('preserves an explicitly pinned runtime endpoint version', () => {
    expect(getRuntimeEndpointVersion('SupportAgentRuntime', { name: 'production', runtimeVersion: '1' })).toBe('1');
  });

  test('synthesizes the supported gateway search mode without a narrowing assertion', () => {
    const gateway = getAgentCoreGatewayResource({
      gateway: {
        name: 'support',
        nameChain: ['support'],
        type: 'agentcore-gateway',
        configParentResourceType: 'agentcore-gateway',
        searchType: 'SEMANTIC'
      },
      roleLogicalName: 'SupportGatewayRole',
      stackName: 'support-production',
      tags: {}
    });

    expect(gateway).toMatchObject({
      Type: 'AWS::BedrockAgentCore::Gateway',
      Properties: {
        AuthorizerType: 'NONE',
        ProtocolConfiguration: { Mcp: { SearchType: 'SEMANTIC' } },
        ProtocolType: 'MCP',
        RoleArn: { 'Fn::GetAtt': ['SupportGatewayRole', 'Arn'] }
      }
    });
  });

  test('builds browser recording object ARN from a literal bucket name', () => {
    expect(getBrowserRecordingS3ObjectArn({ bucketName: 'recordings-bucket', prefix: 'sessions/' })).toBe(
      'arn:aws:s3:::recordings-bucket/sessions/*'
    );
  });

  test('builds browser recording object ARN from a referenced bucket name', () => {
    expect(
      getBrowserRecordingS3ObjectArn({
        bucketName: { Ref: 'RecordingBucket' } as any,
        prefix: 'sessions/'
      })
    ).toEqual({
      'Fn::Join': ['', ['arn:aws:s3:::', { Ref: 'RecordingBucket' }, '/', 'sessions/', '*']]
    });
  });

  test('builds browser recording ARNs from a resource-param bucket name directive', () => {
    const recording = {
      bucketName: "$ResourceParam('browserRecordingBucket', 'name')",
      prefix: 'sessions/'
    };

    expect(getBrowserRecordingS3BucketArn(recording)).toEqual({
      'Fn::Join': ['', ['arn:aws:s3:::', "$ResourceParam('browserRecordingBucket', 'name')"]]
    });
    expect(getBrowserRecordingS3ObjectArn(recording)).toEqual({
      'Fn::Join': ['', ['arn:aws:s3:::', "$ResourceParam('browserRecordingBucket', 'name')", '/', 'sessions/', '*']]
    });
  });
});
