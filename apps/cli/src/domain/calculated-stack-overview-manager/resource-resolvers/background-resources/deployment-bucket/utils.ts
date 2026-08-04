import { cfnResource } from '@stacktape/cloudformation/resource';
import { join, ref } from '@stacktape/cloudformation/intrinsics';

import { configManager } from '@domain-services/config-manager';

export const getDeploymentBucketResource = (bucketName: string) => {
  return cfnResource('AWS::S3::Bucket', {
    BucketName: bucketName,
    AccelerateConfiguration: configManager.isS3TransferAccelerationAvailableInDeploymentRegion
      ? {
          AccelerationStatus: 'Enabled'
        }
      : undefined,
    BucketEncryption: {
      ServerSideEncryptionConfiguration: [{ ServerSideEncryptionByDefault: { SSEAlgorithm: 'AES256' } }]
    },
    CorsConfiguration: {
      CorsRules: [
        {
          AllowedHeaders: ['*'],
          AllowedMethods: ['GET'],
          AllowedOrigins: ['*']
        }
      ]
    }
  });
};

export const deploymentBucketPolicyResource = (deploymentBucketLogicalName: string) => {
  return cfnResource('AWS::S3::BucketPolicy', {
    Bucket: ref(deploymentBucketLogicalName),
    PolicyDocument: {
      Statement: [
        {
          Action: 's3:*',
          Effect: 'Deny',
          Principal: '*',
          Resource: [
            join('', ['arn:', { Ref: 'AWS::Partition' }, ':s3:::', { Ref: deploymentBucketLogicalName }, '/*'])
          ],
          Condition: { Bool: { 'aws:SecureTransport': false } }
        }
      ]
    }
  });
};
