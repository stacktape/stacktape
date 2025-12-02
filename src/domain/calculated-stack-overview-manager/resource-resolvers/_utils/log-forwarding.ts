import { globalStateManager } from '@application-services/global-state-manager';
import { GetAtt, Ref, Sub } from '@cloudform/functions';
import Role from '@cloudform/iam/role';
import DeliveryStream from '@cloudform/kinesisFirehose/deliveryStream';
import SubscriptionFilter from '@cloudform/logs/subscriptionFilter';
import Bucket from '@cloudform/s3/bucket';
import { awsResourceNames } from '@shared/naming/aws-resource-names';
import { cfLogicalNames } from '@shared/naming/logical-names';
import { SubWithoutMapping } from '@utils/cloudformation';

export const getResourcesNeededForLogForwarding = ({
  resource,
  logGroupCfLogicalName,
  logForwardingConfig
}: {
  resource: ResourcePropsFromConfig<StpResourceType>;
  logGroupCfLogicalName: string;
  logForwardingConfig: LogForwardingBase['logForwarding'];
}) => {
  const resources: { cfLogicalName: string; cfResource: CloudformationResource }[] = [];
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
  return new Role({
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
            // eslint-disable-next-line no-template-curly-in-string
            'sts:ExternalId': SubWithoutMapping('${AWS::AccountId}')
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
              GetAtt(cfLogicalNames.logForwardingFailedEventsBucket(resource.name), 'Arn'),
              // eslint-disable-next-line no-template-curly-in-string
              Sub('${bucketName}/*', {
                bucketName: GetAtt(cfLogicalNames.logForwardingFailedEventsBucket(resource.name), 'Arn')
              })
            ]
          }
        }
      }
    ]
  });
};

const getCloudwatchToFirehoseRole = ({ logGroupCfLogicalName }: { logGroupCfLogicalName: string }) => {
  return new Role({
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
            // eslint-disable-next-line no-template-curly-in-string
            'aws:SourceArn': SubWithoutMapping('arn:aws:logs:${AWS::Region}:${AWS::AccountId}:*')
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
            Resource: [GetAtt(cfLogicalNames.logForwardingFirehoseDeliveryStream({ logGroupCfLogicalName }), 'Arn')]
          }
        }
      }
    ]
  });
};

const getFailedEventsBucket = ({ resource }: { resource: ResourcePropsFromConfig<StpResourceType> }) => {
  return new Bucket({
    BucketName: awsResourceNames.logForwardingFailedEventsBucket(
      resource.name,
      globalStateManager.targetStack.stackName,
      globalStateManager.targetStack.globallyUniqueStackHash
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
  return new SubscriptionFilter({
    LogGroupName: Ref(logGroupCfLogicalName),
    DestinationArn: GetAtt(cfLogicalNames.logForwardingFirehoseDeliveryStream({ logGroupCfLogicalName }), 'Arn'),
    FilterPattern: '',
    RoleArn: GetAtt(cfLogicalNames.logForwardingCwToFirehoseRole({ logGroupCfLogicalName }), 'Arn')
  });
};

const getFirehoseGenericHttpEndpointDeliveryStream = ({
  resource,
  logForwardingConfig
}: {
  resource: ResourcePropsFromConfig<StpResourceType>;
  logForwardingConfig: HttpEndpointLogForwarding;
}) => {
  return new DeliveryStream({
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
        BucketARN: GetAtt(cfLogicalNames.logForwardingFailedEventsBucket(resource.name), 'Arn'),
        RoleARN: GetAtt(cfLogicalNames.logForwardingFirehoseToS3Role(resource.name), 'Arn'),
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
  return new DeliveryStream({
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
        BucketARN: GetAtt(cfLogicalNames.logForwardingFailedEventsBucket(resource.name), 'Arn'),
        RoleARN: GetAtt(cfLogicalNames.logForwardingFirehoseToS3Role(resource.name), 'Arn'),
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
  return new DeliveryStream({
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
        BucketARN: GetAtt(cfLogicalNames.logForwardingFailedEventsBucket(resource.name), 'Arn'),
        RoleARN: GetAtt(cfLogicalNames.logForwardingFirehoseToS3Role(resource.name), 'Arn'),
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
