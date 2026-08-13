import type { AnyCloudFormationResource } from '@stacktape/cloudformation/resource';
import { cfnResource } from '@stacktape/cloudformation/resource';
import { getAtt, ref, sub } from '@stacktape/cloudformation/intrinsics';
import type { ResourcePropsFromConfig } from '@domain-services/stack-info/types';
import type { StpResourceType } from '@domain-services/config-manager/resolved-types/resources';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { awsResourceNames } from '@stacktape/naming/aws-resource-names';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { assertLogClassSupportsForwarding } from './log-groups';

import type {
  DatadogLogForwarding,
  HighlightLogForwarding,
  HttpEndpointLogForwarding,
  LogForwardingBase
} from '@stacktape/config/log-forwarding';

export const getResourcesNeededForLogForwarding = ({
  resource,
  logGroupCfLogicalName,
  logForwardingConfig,
  logClass
}: {
  resource: ResourcePropsFromConfig<StpResourceType>;
  logGroupCfLogicalName: string;
  logForwardingConfig: LogForwardingBase['logForwarding'];
  logClass?: LogForwardingBase['logClass'];
}) => {
  assertLogClassSupportsForwarding({ logClass, logForwarding: logForwardingConfig });
  const resources: { cfLogicalName: string; cfResource: AnyCloudFormationResource }[] = [];
  if (logForwardingConfig.type === 'http-endpoint') {
    resources.push(...getResourcesCommonForHttpEndpoints({ resource, logGroupCfLogicalName }), {
      cfLogicalName: cfLogicalNames.logForwardingFirehoseDeliveryStream({ logGroupCfLogicalName }),
      cfResource: getFirehoseGenericHttpEndpointDeliveryStream({ resource, logForwardingConfig })
    });
  } else if (logForwardingConfig.type === 'highlight') {
    resources.push(...getResourcesCommonForHttpEndpoints({ resource, logGroupCfLogicalName }), {
      cfLogicalName: cfLogicalNames.logForwardingFirehoseDeliveryStream({ logGroupCfLogicalName }),
      cfResource: getFirehoseHighlightDeliveryStream({ resource, logForwardingConfig })
    });
  } else if (logForwardingConfig.type === 'datadog') {
    resources.push(...getResourcesCommonForHttpEndpoints({ resource, logGroupCfLogicalName }), {
      cfLogicalName: cfLogicalNames.logForwardingFirehoseDeliveryStream({ logGroupCfLogicalName }),
      cfResource: getFirehoseDatadogDeliveryStream({ resource, logForwardingConfig })
    });
  }
  return resources;
};

const getResourcesCommonForHttpEndpoints = ({
  resource,
  logGroupCfLogicalName
}: {
  resource: ResourcePropsFromConfig<StpResourceType>;
  logGroupCfLogicalName: string;
}) => {
  return [
    {
      cfLogicalName: cfLogicalNames.logForwardingFirehoseToS3Role(resource.name),
      cfResource: getFirehoseToS3Role({ resource })
    },
    {
      cfLogicalName: cfLogicalNames.logForwardingFailedEventsBucket(resource.name),
      cfResource: getFailedEventsBucket({ resource })
    },
    {
      cfLogicalName: cfLogicalNames.logForwardingCwToFirehoseRole({ logGroupCfLogicalName }),
      cfResource: getCloudwatchToFirehoseRole({ logGroupCfLogicalName })
    },
    {
      cfLogicalName: cfLogicalNames.logForwardingSubscriptionFilter({ logGroupCfLogicalName }),
      cfResource: getLogSubscriptionFilter({ logGroupCfLogicalName })
    }
  ];
};

const getFirehoseToS3Role = ({ resource }: { resource: ResourcePropsFromConfig<StpResourceType> }) => {
  return cfnResource('AWS::IAM::Role', {
    AssumeRolePolicyDocument: {
      Version: '2012-10-17',
      Statement: {
        Action: 'sts:AssumeRole',
        Effect: 'Allow',
        Principal: {
          Service: 'firehose.amazonaws.com'
        },
        Condition: {
          StringEquals: {
            'sts:ExternalId': sub('${AWS::AccountId}')
          }
        }
      }
    },
    Policies: [
      {
        PolicyName: 'logs-to-s3',
        PolicyDocument: {
          Statement: {
            Effect: 'Allow',
            Action: [
              's3:AbortMultipartUpload',
              's3:GetBucketLocation',
              's3:GetObject',
              's3:ListBucket',
              's3:ListBucketMultipartUploads',
              's3:PutObject'
            ],
            Resource: [
              getAtt(cfLogicalNames.logForwardingFailedEventsBucket(resource.name), 'Arn'),
              sub('${bucketName}/*', {
                bucketName: getAtt(cfLogicalNames.logForwardingFailedEventsBucket(resource.name), 'Arn')
              })
            ]
          }
        }
      }
    ]
  });
};

const getCloudwatchToFirehoseRole = ({ logGroupCfLogicalName }: { logGroupCfLogicalName: string }) => {
  return cfnResource('AWS::IAM::Role', {
    AssumeRolePolicyDocument: {
      Version: '2012-10-17',
      Statement: {
        Action: 'sts:AssumeRole',
        Effect: 'Allow',
        Principal: {
          Service: 'logs.amazonaws.com'
        },
        Condition: {
          StringLike: {
            'aws:SourceArn': sub('arn:aws:logs:${AWS::Region}:${AWS::AccountId}:*')
          }
        }
      }
    },
    Policies: [
      {
        PolicyName: 'logs-to-s3',
        PolicyDocument: {
          Statement: {
            Effect: 'Allow',
            Action: ['firehose:PutRecord'],
            Resource: [getAtt(cfLogicalNames.logForwardingFirehoseDeliveryStream({ logGroupCfLogicalName }), 'Arn')]
          }
        }
      }
    ]
  });
};

const getFailedEventsBucket = ({ resource }: { resource: ResourcePropsFromConfig<StpResourceType> }) => {
  return cfnResource('AWS::S3::Bucket', {
    BucketName: awsResourceNames.logForwardingFailedEventsBucket(
      resource.name,
      calculatedStackOverviewManager.context.stackName,
      calculatedStackOverviewManager.context.globallyUniqueStackHash
    ),
    BucketEncryption: {
      ServerSideEncryptionConfiguration: [
        {
          ServerSideEncryptionByDefault: {
            SSEAlgorithm: 'AES256'
          }
        }
      ]
    }
  });
};

const getLogSubscriptionFilter = ({ logGroupCfLogicalName }: { logGroupCfLogicalName: string }) => {
  return cfnResource('AWS::Logs::SubscriptionFilter', {
    LogGroupName: ref(logGroupCfLogicalName),
    DestinationArn: getAtt(cfLogicalNames.logForwardingFirehoseDeliveryStream({ logGroupCfLogicalName }), 'Arn'),
    FilterPattern: '',
    RoleArn: getAtt(cfLogicalNames.logForwardingCwToFirehoseRole({ logGroupCfLogicalName }), 'Arn')
  });
};

const getFirehoseGenericHttpEndpointDeliveryStream = ({
  resource,
  logForwardingConfig
}: {
  resource: ResourcePropsFromConfig<StpResourceType>;
  logForwardingConfig: HttpEndpointLogForwarding;
}) => {
  return cfnResource('AWS::KinesisFirehose::DeliveryStream', {
    DeliveryStreamType: 'DirectPut',
    HttpEndpointDestinationConfiguration: {
      BufferingHints: {
        SizeInMBs: 1,
        IntervalInSeconds: 60
      },
      EndpointConfiguration: {
        Url: logForwardingConfig.properties.endpointUrl,
        AccessKey: logForwardingConfig.properties.accessKey,
        Name: logForwardingConfig.properties.endpointUrl.replace('https://', '')
      },
      S3Configuration: {
        BucketARN: getAtt(cfLogicalNames.logForwardingFailedEventsBucket(resource.name), 'Arn'),
        RoleARN: getAtt(cfLogicalNames.logForwardingFirehoseToS3Role(resource.name), 'Arn'),
        BufferingHints: {
          SizeInMBs: 5,
          IntervalInSeconds: 300
        }
      },
      RequestConfiguration: {
        CommonAttributes: Object.entries(logForwardingConfig.properties.parameters).map(
          ([AttributeName, AttributeValue]) => ({ AttributeName, AttributeValue })
        ),
        ContentEncoding: logForwardingConfig.properties.gzipEncodingEnabled ? 'GZIP' : 'NONE'
      },
      S3BackupMode: 'FailedDataOnly',
      RetryOptions: {
        DurationInSeconds: logForwardingConfig.properties.retryDuration || 300
      }
    }
  });
};

const getFirehoseHighlightDeliveryStream = ({
  resource,
  logForwardingConfig
}: {
  resource: ResourcePropsFromConfig<StpResourceType>;
  logForwardingConfig: HighlightLogForwarding;
}) => {
  const endpoint = logForwardingConfig.properties.endpointUrl || 'https://pub.highlight.io/v1/logs/firehose';
  return cfnResource('AWS::KinesisFirehose::DeliveryStream', {
    DeliveryStreamType: 'DirectPut',
    HttpEndpointDestinationConfiguration: {
      BufferingHints: {
        SizeInMBs: 1,
        IntervalInSeconds: 60
      },
      EndpointConfiguration: {
        Url: endpoint,
        Name: endpoint.replace('https://', '')
      },
      S3Configuration: {
        BucketARN: getAtt(cfLogicalNames.logForwardingFailedEventsBucket(resource.name), 'Arn'),
        RoleARN: getAtt(cfLogicalNames.logForwardingFirehoseToS3Role(resource.name), 'Arn'),
        BufferingHints: {
          SizeInMBs: 5,
          IntervalInSeconds: 300
        }
      },
      RequestConfiguration: {
        CommonAttributes: [
          { AttributeName: 'x-highlight-project', AttributeValue: logForwardingConfig.properties.projectId }
        ],
        ContentEncoding: 'GZIP'
      },
      S3BackupMode: 'FailedDataOnly',
      RetryOptions: {
        DurationInSeconds: 300
      }
    }
  });
};

const getFirehoseDatadogDeliveryStream = ({
  resource,
  logForwardingConfig
}: {
  resource: ResourcePropsFromConfig<StpResourceType>;
  logForwardingConfig: DatadogLogForwarding;
}) => {
  const endpoint =
    logForwardingConfig.properties.endpointUrl || 'https://aws-kinesis-http-intake.logs.datadoghq.com/v1/input';
  return cfnResource('AWS::KinesisFirehose::DeliveryStream', {
    DeliveryStreamType: 'DirectPut',
    HttpEndpointDestinationConfiguration: {
      BufferingHints: {
        SizeInMBs: 4,
        IntervalInSeconds: 60
      },
      EndpointConfiguration: {
        Url: endpoint,
        Name: endpoint.replace('https://', ''),
        AccessKey: logForwardingConfig.properties.apiKey
      },
      S3Configuration: {
        BucketARN: getAtt(cfLogicalNames.logForwardingFailedEventsBucket(resource.name), 'Arn'),
        RoleARN: getAtt(cfLogicalNames.logForwardingFirehoseToS3Role(resource.name), 'Arn'),
        BufferingHints: {
          SizeInMBs: 5,
          IntervalInSeconds: 300
        }
      },
      RequestConfiguration: {
        ContentEncoding: 'GZIP'
      },
      S3BackupMode: 'FailedDataOnly',
      RetryOptions: {
        DurationInSeconds: 60
      }
    }
  });
};
