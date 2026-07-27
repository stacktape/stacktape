import { describe, expect, test } from 'bun:test';
import {
  getBrowserRecordingS3BucketArn,
  getBrowserRecordingS3ObjectArn,
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
    expect(getRuntimeEndpointVersion('SupportAgentRuntime', { name: 'production' })).toMatchObject({
      name: 'Fn::GetAtt',
      payload: ['SupportAgentRuntime', 'AgentRuntimeVersion']
    });
  });

  test('preserves an explicitly pinned runtime endpoint version', () => {
    expect(getRuntimeEndpointVersion('SupportAgentRuntime', { name: 'production', runtimeVersion: '1' })).toBe('1');
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
    ).toMatchObject({
      name: 'Fn::Join',
      payload: ['', ['arn:aws:s3:::', { Ref: 'RecordingBucket' }, '/', 'sessions/', '*']]
    });
  });

  test('builds browser recording ARNs from a resource-param bucket name directive', () => {
    const recording = {
      bucketName: "$ResourceParam('browserRecordingBucket', 'name')",
      prefix: 'sessions/'
    };

    expect(getBrowserRecordingS3BucketArn(recording)).toMatchObject({
      name: 'Fn::Join',
      payload: ['', ['arn:aws:s3:::', "$ResourceParam('browserRecordingBucket', 'name')"]]
    });
    expect(getBrowserRecordingS3ObjectArn(recording)).toMatchObject({
      name: 'Fn::Join',
      payload: ['', ['arn:aws:s3:::', "$ResourceParam('browserRecordingBucket', 'name')", '/', 'sessions/', '*']]
    });
  });
});
