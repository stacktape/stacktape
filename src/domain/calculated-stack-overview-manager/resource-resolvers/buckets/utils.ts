import type { CorsConfiguration, CorsRule } from '@cloudform/s3/bucket';
import { globalStateManager } from '@application-services/global-state-manager';
import { GetAtt, Join } from '@cloudform/functions';
import S3Bucket, { Rule } from '@cloudform/s3/bucket';
import S3BucketPolicy from '@cloudform/s3/bucketPolicy';
import { configManager } from '@domain-services/config-manager';
import { awsResourceNames } from '@shared/naming/aws-resource-names';
import { cfLogicalNames } from '@shared/naming/logical-names';
import { getFormattedRuleStatements } from '../_utils/role-helpers';

export const getBucketPolicy = (stpBucketName: string, bucketConfig: StpBucket) => {
  const bucketName = awsResourceNames.bucket(
    stpBucketName,
    globalStateManager.targetStack.stackName,
    globalStateManager.targetStack.globallyUniqueStackHash
  );
  const bucketPolicy = new S3BucketPolicy({
    Bucket: bucketName,
    PolicyDocument: {
      Statement: getPolicyDocumentStatements({ bucketConfig })
    }
  });
  bucketPolicy.DependsOn = [cfLogicalNames.bucket(stpBucketName)];
  return bucketPolicy;
};

const getPolicyDocumentStatements = ({ bucketConfig }: { bucketConfig: StpBucket }) => {
  const stpBucketName = bucketConfig.name;
  const accessibility = bucketConfig.accessibility;
  const finalPolicyStatements: CloudformationIamRoleStatement[] =
    accessibility?.accessibilityMode === 'public-read-write'
      ? [
          {
            Sid: 'ListObjectsInBucket',
            Effect: 'Allow',
            Principal: { AWS: '*' },
            Action: ['s3:ListBucket'],
            Resource: GetAtt(cfLogicalNames.bucket(stpBucketName), 'Arn') as unknown as string
          },
          {
            Sid: 'AllObjectActions',
            Effect: 'Allow',
            Principal: { AWS: '*' },
            Action: [
              's3:*Object',
              's3:*ObjectTagging',
              's3:*ObjectVersion',
              's3:*ObjectVersionTagging',
              's3:*MultipartUpload*'
            ],
            Resource: Join('', [GetAtt(cfLogicalNames.bucket(stpBucketName), 'Arn'), '/*']) as unknown as string
          }
        ]
      : accessibility?.accessibilityMode === 'public-read'
        ? [
            {
              Sid: 'ListObjectsInBucket',
              Effect: 'Allow',
              Principal: { AWS: '*' },
              Action: ['s3:ListBucket'],
              Resource: GetAtt(cfLogicalNames.bucket(stpBucketName), 'Arn') as unknown as string
            },
            {
              Sid: 'public-read',
              Effect: 'Allow',
              Principal: { AWS: '*' },
              Action: ['s3:GetObject', 's3:GetObjectVersion'],
              Resource: Join('', [GetAtt(cfLogicalNames.bucket(stpBucketName), 'Arn'), '/*']) as unknown as string
            }
          ]
        : [];

  if (configManager.simplifiedCdnAssociations.bucket[stpBucketName]?.length) {
    finalPolicyStatements.push(
      ...configManager.simplifiedCdnAssociations.bucket[stpBucketName]
        .map((cdnAttachedResourceName) => {
          const requirePutObject = configManager.allCdnAssociations.bucket[stpBucketName]
            .filter(({ cdnAttachedResource: { name } }) => name === cdnAttachedResourceName)
            .some(({ customForwardingOptions }) => customForwardingOptions?.allowedMethods?.includes('PUT'));
          const requireDeleteObject = configManager.allCdnAssociations.bucket[stpBucketName]
            .filter(({ cdnAttachedResource: { name } }) => name === cdnAttachedResourceName)
            .some(({ customForwardingOptions }) => customForwardingOptions?.allowedMethods?.includes('DELETE'));
          return [
            {
              Action: [
                's3:GetObject',
                ...(requirePutObject ? ['s3:PutObject'] : []),
                ...(requireDeleteObject ? ['s3:DeleteObject'] : [])
              ],
              Effect: 'Allow',
              Principal: {
                CanonicalUser: GetAtt(
                  cfLogicalNames.cloudfrontOriginAccessIdentity(cdnAttachedResourceName),
                  'S3CanonicalUserId'
                )
              },
              Sid: 'CloudfrontAccess',
              Resource: Join('', [GetAtt(cfLogicalNames.bucket(stpBucketName), 'Arn'), '/*']) as unknown as string
            },
            {
              Sid: 'CloudfrontAccessList',
              Effect: 'Allow',
              Principal: {
                CanonicalUser: GetAtt(
                  cfLogicalNames.cloudfrontOriginAccessIdentity(cdnAttachedResourceName),
                  'S3CanonicalUserId'
                )
              },
              Action: ['s3:ListBucket'],
              Resource: GetAtt(cfLogicalNames.bucket(stpBucketName), 'Arn') as unknown as string
            }
          ];
        })
        .flat()
    );
  }
  finalPolicyStatements.push(...getFormattedRuleStatements(accessibility?.accessPolicyStatements || []));
  return finalPolicyStatements;
};

export const getBucketResource = (stpBucketName: string, bucketConfig: StpBucket) => {
  return new S3Bucket({
    BucketName: awsResourceNames.bucket(
      stpBucketName,
      globalStateManager.targetStack.stackName,
      globalStateManager.targetStack.globallyUniqueStackHash
    ),
    NotificationConfiguration: bucketConfig.enableEventBusNotifications
      ? {
          EventBridgeConfiguration: {
            EventBridgeEnabled: bucketConfig.enableEventBusNotifications
          }
        }
      : undefined,
    BucketEncryption: bucketConfig.encryption
      ? { ServerSideEncryptionConfiguration: [{ ServerSideEncryptionByDefault: { SSEAlgorithm: 'AES256' } }] }
      : undefined,
    CorsConfiguration: bucketConfig.cors ? getCorsConfiguration(bucketConfig.cors) : undefined,
    VersioningConfiguration: bucketConfig.versioning ? { Status: 'Enabled' } : undefined,
    AccelerateConfiguration: configManager.isS3TransferAccelerationAvailableInDeploymentRegion
      ? {
          AccelerationStatus: 'Enabled'
        }
      : undefined,
    LifecycleConfiguration: bucketConfig.lifecycleRules
      ? { Rules: bucketConfig.lifecycleRules.map(getLifecycleRule) }
      : undefined,
    PublicAccessBlockConfiguration: {
      BlockPublicAcls: false,
      BlockPublicPolicy: false,
      RestrictPublicBuckets: false,
      IgnorePublicAcls: false
    }
    // LoggingConfiguration: bucketConfig.loggingConfiguration,
    // InventoryConfigurations: bucketConfig.inventoryConfigurations,
    // MetricsConfigurations: bucketConfig.metricsConfigurations,
    // ReplicationConfiguration: bucketConfig.replicationConfiguration
  });
};

const getLifecycleRule = (lifecycleRule: StpBucket['lifecycleRules'][number]) => {
  const ruleProps: Rule = {
    Status: 'Enabled',
    Prefix: lifecycleRule.properties.prefix,
    TagFilters: lifecycleRule.properties.tags?.length
      ? lifecycleRule.properties.tags.map(({ key: Key, value: Value }) => ({
          Key,
          Value
        }))
      : undefined
  };
  if (lifecycleRule.type === 'abort-incomplete-multipart-upload') {
    ruleProps.AbortIncompleteMultipartUpload = {
      DaysAfterInitiation: lifecycleRule.properties.daysAfterInitiation
    };
  }
  if (lifecycleRule.type === 'non-current-version-class-transition') {
    ruleProps.NoncurrentVersionTransitions = [
      {
        StorageClass: lifecycleRule.properties.storageClass,
        TransitionInDays: lifecycleRule.properties.daysAfterVersioned
      }
    ];
  }
  if (lifecycleRule.type === 'class-transition') {
    ruleProps.Transitions = [
      {
        StorageClass: lifecycleRule.properties.storageClass,
        TransitionInDays: lifecycleRule.properties.daysAfterUpload
      }
    ];
  }
  if (lifecycleRule.type === 'non-current-version-expiration') {
    ruleProps.NoncurrentVersionExpirationInDays = lifecycleRule.properties.daysAfterVersioned;
  }
  if (lifecycleRule.type === 'expiration') {
    ruleProps.NoncurrentVersionExpirationInDays = lifecycleRule.properties.daysAfterUpload;
  }

  return new Rule(ruleProps);
};

const getCorsConfiguration = (corsConfig: BucketCorsConfig): CorsConfiguration => {
  const defaultCorsRule = getBucketsDefaultCorsRule();
  if (!corsConfig?.enabled) {
    return;
  }
  if (corsConfig?.enabled === true && !corsConfig?.corsRules?.length) {
    return { CorsRules: [defaultCorsRule] };
  }
  if (corsConfig.corsRules?.length) {
    return {
      CorsRules: corsConfig.corsRules.map((corsConfigRule) => ({
        AllowedMethods: corsConfigRule.allowedMethods || defaultCorsRule.AllowedMethods,
        AllowedOrigins: corsConfigRule.allowedOrigins || defaultCorsRule.AllowedOrigins,
        AllowedHeaders: corsConfigRule.allowedHeaders,
        ExposedHeaders: corsConfigRule.exposedResponseHeaders,
        MaxAge: corsConfigRule.maxAge
      }))
    };
  }
};

const getBucketsDefaultCorsRule = (): CorsRule => {
  return {
    AllowedMethods: ['GET', 'PUT', 'HEAD', 'POST', 'DELETE'],
    AllowedOrigins: ['*'],
    AllowedHeaders: [
      'Authorization',
      'Content-Length',
      'Content-Type',
      'Content-MD5',
      'Date',
      'Expect',
      'Host',
      'x-amz-content-sha256',
      'x-amz-date',
      'x-amz-security-token'
    ]
  };
};
