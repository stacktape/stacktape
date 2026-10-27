import { cfnResource } from '@stacktape/cloudformation/resource';
import { join, ref } from '@stacktape/cloudformation/intrinsics';

import { configManager } from '@domain-services/config-manager';
import { getAwsPartition } from '@domain-services/config-manager/utils/lambdas';

// The CLI creates the deployment bucket of a new stack itself (see `deploymentArtifactManager.createArtifactStore`).
// Older stacks have it as a CloudFormation resource. Both get these settings.

export const DEPLOYMENT_BUCKET_CORS_RULES = [{ AllowedHeaders: ['*'], AllowedMethods: ['GET'], AllowedOrigins: ['*'] }];

/** Denies every request to the bucket's objects that does not use TLS. */
const getDeploymentBucketPolicyDocument = (objectsArn: unknown) => ({
  Statement: [
    {
      Action: 's3:*',
      Effect: 'Deny',
      Principal: '*',
      Resource: [objectsArn],
      Condition: { Bool: { 'aws:SecureTransport': false } }
    }
  ]
});

export const getDeploymentBucketPolicy = ({ bucketName, region }: { bucketName: string; region: string }) => ({
  Version: '2012-10-17',
  ...getDeploymentBucketPolicyDocument(`arn:${getAwsPartition(region)}:s3:::${bucketName}/*`)
});

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
    CorsConfiguration: { CorsRules: DEPLOYMENT_BUCKET_CORS_RULES }
  });
};

export const deploymentBucketPolicyResource = (deploymentBucketLogicalName: string) => {
  return cfnResource('AWS::S3::BucketPolicy', {
    Bucket: ref(deploymentBucketLogicalName),
    PolicyDocument: getDeploymentBucketPolicyDocument(
      join('', ['arn:', { Ref: 'AWS::Partition' }, ':s3:::', { Ref: deploymentBucketLogicalName }, '/*'])
    )
  });
};
