// This file is auto-generated. Do not edit manually.
// Source: aws-iot-topicrule.json

/** Resource Type definition for AWS::IoT::TopicRule */
export type AwsIotTopicrule = {
  Arn?: string;
  RuleName?: string;
  TopicRulePayload: {
    RuleDisabled?: boolean;
    ErrorAction?: {
      CloudwatchAlarm?: {
        StateValue: string;
        AlarmName: string;
        StateReason: string;
        RoleArn: string;
      };
      CloudwatchLogs?: {
        LogGroupName: string;
        RoleArn: string;
        BatchMode?: boolean;
      };
      CloudwatchMetric?: {
        MetricName: string;
        MetricValue: string;
        MetricNamespace: string;
        MetricUnit: string;
        RoleArn: string;
        MetricTimestamp?: string;
      };
      DynamoDB?: {
        TableName: string;
        PayloadField?: string;
        RangeKeyField?: string;
        HashKeyField: string;
        RangeKeyValue?: string;
        RangeKeyType?: string;
        HashKeyType?: string;
        HashKeyValue: string;
        RoleArn: string;
      };
      DynamoDBv2?: {
        PutItem?: {
          TableName: string;
        };
        RoleArn?: string;
      };
      Elasticsearch?: {
        Type: string;
        Index: string;
        Id: string;
        Endpoint: string;
        RoleArn: string;
      };
      Firehose?: {
        DeliveryStreamName: string;
        RoleArn: string;
        Separator?: string;
        BatchMode?: boolean;
      };
      Http?: {
        ConfirmationUrl?: string;
        /** @uniqueItems true */
        Headers?: {
          Value: string;
          Key: string;
        }[];
        Url: string;
        Auth?: {
          Sigv4?: {
            ServiceName: string;
            SigningRegion: string;
            RoleArn: string;
          };
        };
      };
      IotAnalytics?: {
        RoleArn: string;
        ChannelName: string;
        BatchMode?: boolean;
      };
      IotEvents?: {
        InputName: string;
        RoleArn: string;
        MessageId?: string;
        BatchMode?: boolean;
      };
      IotSiteWise?: {
        RoleArn: string;
        /** @uniqueItems true */
        PutAssetPropertyValueEntries: {
          PropertyAlias?: string;
          /** @uniqueItems true */
          PropertyValues: {
            Value: {
              StringValue?: string;
              DoubleValue?: string;
              BooleanValue?: string;
              IntegerValue?: string;
            };
            Timestamp: {
              TimeInSeconds: string;
              OffsetInNanos?: string;
            };
            Quality?: string;
          }[];
          AssetId?: string;
          EntryId?: string;
          PropertyId?: string;
        }[];
      };
      Kafka?: {
        DestinationArn: string;
        Topic: string;
        Key?: string;
        Partition?: string;
        ClientProperties: Record<string, string>;
        /** @uniqueItems true */
        Headers?: {
          Value: string;
          Key: string;
        }[];
      };
      Kinesis?: {
        PartitionKey?: string;
        StreamName: string;
        RoleArn: string;
      };
      Lambda?: {
        FunctionArn?: string;
      };
      Location?: {
        RoleArn: string;
        TrackerName: string;
        DeviceId: string;
        Latitude: string;
        Longitude: string;
        Timestamp?: {
          Value: string;
          Unit?: string;
        };
      };
      OpenSearch?: {
        Type: string;
        Index: string;
        Id: string;
        Endpoint: string;
        RoleArn: string;
      };
      Republish?: {
        Qos?: number;
        Topic: string;
        RoleArn: string;
        Headers?: {
          /**
           * @minLength 0
           * @maxLength 1024
           */
          PayloadFormatIndicator?: string;
          /**
           * @minLength 0
           * @maxLength 1024
           */
          ContentType?: string;
          /**
           * @minLength 0
           * @maxLength 1024
           */
          ResponseTopic?: string;
          /**
           * @minLength 0
           * @maxLength 1024
           */
          CorrelationData?: string;
          /**
           * @minLength 0
           * @maxLength 1024
           */
          MessageExpiry?: string;
          UserProperties?: {
            /**
             * @minLength 0
             * @maxLength 1024
             */
            Key: string;
            /**
             * @minLength 0
             * @maxLength 1024
             */
            Value: string;
          }[];
        };
      };
      S3?: {
        BucketName: string;
        Key: string;
        RoleArn: string;
        CannedAcl?: "private" | "public-read" | "public-read-write" | "aws-exec-read" | "authenticated-read" | "bucket-owner-read" | "bucket-owner-full-control" | "log-delivery-write";
      };
      Sns?: {
        TargetArn: string;
        MessageFormat?: string;
        RoleArn: string;
      };
      Sqs?: {
        RoleArn: string;
        UseBase64?: boolean;
        QueueUrl: string;
      };
      StepFunctions?: {
        ExecutionNamePrefix?: string;
        StateMachineName: string;
        RoleArn: string;
      };
      Timestream?: {
        RoleArn: string;
        DatabaseName: string;
        TableName: string;
        Dimensions: {
          Name: string;
          Value: string;
        }[];
        Timestamp?: {
          Value: string;
          Unit: string;
        };
      };
    };
    Description?: string;
    AwsIotSqlVersion?: string;
    Actions: ({
      CloudwatchAlarm?: {
        StateValue: string;
        AlarmName: string;
        StateReason: string;
        RoleArn: string;
      };
      CloudwatchLogs?: {
        LogGroupName: string;
        RoleArn: string;
        BatchMode?: boolean;
      };
      CloudwatchMetric?: {
        MetricName: string;
        MetricValue: string;
        MetricNamespace: string;
        MetricUnit: string;
        RoleArn: string;
        MetricTimestamp?: string;
      };
      DynamoDB?: {
        TableName: string;
        PayloadField?: string;
        RangeKeyField?: string;
        HashKeyField: string;
        RangeKeyValue?: string;
        RangeKeyType?: string;
        HashKeyType?: string;
        HashKeyValue: string;
        RoleArn: string;
      };
      DynamoDBv2?: {
        PutItem?: {
          TableName: string;
        };
        RoleArn?: string;
      };
      Elasticsearch?: {
        Type: string;
        Index: string;
        Id: string;
        Endpoint: string;
        RoleArn: string;
      };
      Firehose?: {
        DeliveryStreamName: string;
        RoleArn: string;
        Separator?: string;
        BatchMode?: boolean;
      };
      Http?: {
        ConfirmationUrl?: string;
        /** @uniqueItems true */
        Headers?: {
          Value: string;
          Key: string;
        }[];
        Url: string;
        Auth?: {
          Sigv4?: {
            ServiceName: string;
            SigningRegion: string;
            RoleArn: string;
          };
        };
      };
      IotAnalytics?: {
        RoleArn: string;
        ChannelName: string;
        BatchMode?: boolean;
      };
      IotEvents?: {
        InputName: string;
        RoleArn: string;
        MessageId?: string;
        BatchMode?: boolean;
      };
      IotSiteWise?: {
        RoleArn: string;
        /** @uniqueItems true */
        PutAssetPropertyValueEntries: {
          PropertyAlias?: string;
          /** @uniqueItems true */
          PropertyValues: {
            Value: {
              StringValue?: string;
              DoubleValue?: string;
              BooleanValue?: string;
              IntegerValue?: string;
            };
            Timestamp: {
              TimeInSeconds: string;
              OffsetInNanos?: string;
            };
            Quality?: string;
          }[];
          AssetId?: string;
          EntryId?: string;
          PropertyId?: string;
        }[];
      };
      Kafka?: {
        DestinationArn: string;
        Topic: string;
        Key?: string;
        Partition?: string;
        ClientProperties: Record<string, string>;
        /** @uniqueItems true */
        Headers?: {
          Value: string;
          Key: string;
        }[];
      };
      Kinesis?: {
        PartitionKey?: string;
        StreamName: string;
        RoleArn: string;
      };
      Lambda?: {
        FunctionArn?: string;
      };
      Location?: {
        RoleArn: string;
        TrackerName: string;
        DeviceId: string;
        Latitude: string;
        Longitude: string;
        Timestamp?: {
          Value: string;
          Unit?: string;
        };
      };
      OpenSearch?: {
        Type: string;
        Index: string;
        Id: string;
        Endpoint: string;
        RoleArn: string;
      };
      Republish?: {
        Qos?: number;
        Topic: string;
        RoleArn: string;
        Headers?: {
          /**
           * @minLength 0
           * @maxLength 1024
           */
          PayloadFormatIndicator?: string;
          /**
           * @minLength 0
           * @maxLength 1024
           */
          ContentType?: string;
          /**
           * @minLength 0
           * @maxLength 1024
           */
          ResponseTopic?: string;
          /**
           * @minLength 0
           * @maxLength 1024
           */
          CorrelationData?: string;
          /**
           * @minLength 0
           * @maxLength 1024
           */
          MessageExpiry?: string;
          UserProperties?: {
            /**
             * @minLength 0
             * @maxLength 1024
             */
            Key: string;
            /**
             * @minLength 0
             * @maxLength 1024
             */
            Value: string;
          }[];
        };
      };
      S3?: {
        BucketName: string;
        Key: string;
        RoleArn: string;
        CannedAcl?: "private" | "public-read" | "public-read-write" | "aws-exec-read" | "authenticated-read" | "bucket-owner-read" | "bucket-owner-full-control" | "log-delivery-write";
      };
      Sns?: {
        TargetArn: string;
        MessageFormat?: string;
        RoleArn: string;
      };
      Sqs?: {
        RoleArn: string;
        UseBase64?: boolean;
        QueueUrl: string;
      };
      StepFunctions?: {
        ExecutionNamePrefix?: string;
        StateMachineName: string;
        RoleArn: string;
      };
      Timestream?: {
        RoleArn: string;
        DatabaseName: string;
        TableName: string;
        Dimensions: {
          Name: string;
          Value: string;
        }[];
        Timestamp?: {
          Value: string;
          Unit: string;
        };
      };
    })[];
    Sql: string;
  };
  Tags?: {
    Key: string;
    Value: string;
  }[];
};
