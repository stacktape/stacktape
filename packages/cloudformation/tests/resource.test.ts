import { describe, expect, test } from 'bun:test';
import { cfnResource, cfnResourceUnchecked } from '../src/resource.ts';
import { getAtt, ref } from '../src/intrinsics.ts';

describe('CloudFormation resources', () => {
  test('creates a mutable plain resource with exact wire property names', () => {
    const resource = cfnResource('AWS::Lambda::Function', {
      Code: { S3Bucket: ref('ArtifactBucket'), S3Key: 'function.zip' },
      PackageType: 'Zip',
      Role: getAtt('ExecutionRole', 'Arn')
    });
    resource.DependsOn = ['ArtifactBucket', 'ExecutionRole'];
    resource.DeletionPolicy = 'Retain';

    expect(Object.getPrototypeOf(resource)).toBe(Object.prototype);
    expect(resource).toEqual({
      Type: 'AWS::Lambda::Function',
      Properties: {
        Code: { S3Bucket: { Ref: 'ArtifactBucket' }, S3Key: 'function.zip' },
        PackageType: 'Zip',
        Role: { 'Fn::GetAtt': ['ExecutionRole', 'Arn'] }
      },
      DependsOn: ['ArtifactBucket', 'ExecutionRole'],
      DeletionPolicy: 'Retain'
    });
  });

  test('keeps unsupported resource types behind an explicit escape hatch', () => {
    expect(cfnResourceUnchecked('Company::Service::Widget')).toEqual({ Type: 'Company::Service::Widget' });
    expect(cfnResourceUnchecked('Company::Service::Widget', { Size: 3 })).toEqual({
      Type: 'Company::Service::Widget',
      Properties: { Size: 3 }
    });
  });
});
