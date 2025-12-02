import { Join, Ref } from '@cloudform/functions';
import Bucket from '@cloudform/s3/bucket';
import BucketPolicy from '@cloudform/s3/bucketPolicy';
import { configManager } from '@domain-services/config-manager';

export const getDeploymentBucketResource = (bucketName: string) => {
  return new Bucket({
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
  return new BucketPolicy({
    Bucket: Ref(deploymentBucketLogicalName),
    PolicyDocument: {
      Statement: [
        {
          Action: 's3:*',
          Effect: 'Deny',
          Principal: '*',
          Resource: [
            Join('', ['arn:', { Ref: 'AWS::Partition' }, ':s3:::', { Ref: deploymentBucketLogicalName }, '/*'])
          ],
          Condition: { Bool: { 'aws:SecureTransport': false } }
        }
      ]
    }
  });
};
