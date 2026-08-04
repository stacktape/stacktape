import type { CorsConfiguration, CorsRule } from '@stacktape/cloudformation/resources/aws-s3-bucket';
import type { Rule } from '@stacktape/cloudformation/resources/aws-s3-bucket';
import { cfnResource } from '@stacktape/cloudformation/resource';
import { getAtt, join } from '@stacktape/cloudformation/intrinsics';
import type { CloudformationIamRoleStatement } from '@domain-services/cloudformation-stack-manager/types';
import type { StpBucket } from '@domain-services/config-manager/resolved-types/buckets';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { configManager } from '@domain-services/config-manager';
import { awsResourceNames } from '@stacktape/naming/aws-resource-names';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { getFormattedRuleStatements } from '../_utils/role-helpers';
import type { BucketCorsConfig } from '@stacktape/config/buckets';

export const getBucketPolicy = (stpBucketName: string, bucketConfig: StpBucket) => {
  const bucketName = awsResourceNames.bucket(
    stpBucketName,
    calculatedStackOverviewManager.context.stackName,
    calculatedStackOverviewManager.context.globallyUniqueStackHash
  );
  const bucketPolicy = cfnResource('AWS::S3::BucketPolicy', {
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
            Resource: getAtt(cfLogicalNames.bucket(stpBucketName), 'Arn') as unknown as string
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
            Resource: join('', [getAtt(cfLogicalNames.bucket(stpBucketName), 'Arn'), '/*']) as unknown as string
          }
        ]
      : accessibility?.accessibilityMode === 'public-read'
        ? [
            {
              Sid: 'ListObjectsInBucket',
              Effect: 'Allow',
              Principal: { AWS: '*' },
              Action: ['s3:ListBucket'],
              Resource: getAtt(cfLogicalNames.bucket(stpBucketName), 'Arn') as unknown as string
            },
            {
              Sid: 'public-read',
              Effect: 'Allow',
              Principal: { AWS: '*' },
              Action: ['s3:GetObject', 's3:GetObjectVersion'],
              Resource: join('', [getAtt(cfLogicalNames.bucket(stpBucketName), 'Arn'), '/*']) as unknown as string
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
                CanonicalUser: getAtt(
                  cfLogicalNames.cloudfrontOriginAccessIdentity(cdnAttachedResourceName),
                  'S3CanonicalUserId'
                )
              },
              Sid: 'CloudfrontAccess',
              Resource: join('', [getAtt(cfLogicalNames.bucket(stpBucketName), 'Arn'), '/*']) as unknown as string
            },
            {
              Sid: 'CloudfrontAccessList',
              Effect: 'Allow',
              Principal: {
                CanonicalUser: getAtt(
                  cfLogicalNames.cloudfrontOriginAccessIdentity(cdnAttachedResourceName),
                  'S3CanonicalUserId'
                )
              },
              Action: ['s3:ListBucket'],
              Resource: getAtt(cfLogicalNames.bucket(stpBucketName), 'Arn') as unknown as string
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
  // Enable S3 versioning on buckets with directoryUpload to support rollback of synced content
  const enableVersioning = bucketConfig.versioning || !!bucketConfig.directoryUpload;

  const lifecycleRules = [...(bucketConfig.lifecycleRules || [])];
  // Auto-add non-current version expiration for buckets with directoryUpload versioning
  // to prevent unbounded storage growth from versioned objects
  const hasNoncurrentExpiration = lifecycleRules.some((r) => r.type === 'non-current-version-expiration');
  if (enableVersioning && bucketConfig.directoryUpload && !bucketConfig.versioning && !hasNoncurrentExpiration) {
    lifecycleRules.push({
      type: 'non-current-version-expiration',
      properties: { daysAfterVersioned: 30 }
    } as StpBucket['lifecycleRules'][number]);
  }

  return cfnResource('AWS::S3::Bucket', {
    BucketName: awsResourceNames.bucket(
      stpBucketName,
      calculatedStackOverviewManager.context.stackName,
      calculatedStackOverviewManager.context.globallyUniqueStackHash
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
    VersioningConfiguration: enableVersioning ? { Status: 'Enabled' } : undefined,
    AccelerateConfiguration: configManager.isS3TransferAccelerationAvailableInDeploymentRegion
      ? {
          AccelerationStatus: 'Enabled'
        }
      : undefined,
    LifecycleConfiguration: lifecycleRules.length ? { Rules: lifecycleRules.map(getLifecycleRule) } : undefined,
    PublicAccessBlockConfiguration: {
      BlockPublicAcls: false,
      BlockPublicPolicy: false,
      RestrictPublicBuckets: false,
      IgnorePublicAcls: false
    }
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
    ruleProps.ExpirationInDays = lifecycleRule.properties.daysAfterUpload;
  }

  return ruleProps;
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
