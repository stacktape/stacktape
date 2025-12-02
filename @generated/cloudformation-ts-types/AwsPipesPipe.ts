// This file is auto-generated. Do not edit manually.
// Source: aws-pipes-pipe.json

/** Definition of AWS::Pipes::Pipe Resource Type */
export type AwsPipesPipe = {
  /**
   * @minLength 1
   * @maxLength 1600
   * @pattern ^arn:aws([a-z]|\-)*:([a-zA-Z0-9\-]+):([a-z]|\d|\-)*:([0-9]{12})?:(.+)$
   */
  Arn?: string;
  CreationTime?: string;
  CurrentState?: "RUNNING" | "STOPPED" | "CREATING" | "UPDATING" | "DELETING" | "STARTING" | "STOPPING" | "CREATE_FAILED" | "UPDATE_FAILED" | "START_FAILED" | "STOP_FAILED" | "DELETE_FAILED" | "CREATE_ROLLBACK_FAILED" | "DELETE_ROLLBACK_FAILED" | "UPDATE_ROLLBACK_FAILED";
  /**
   * @minLength 0
   * @maxLength 512
   * @pattern ^.*$
   */
  Description?: string;
  DesiredState?: "RUNNING" | "STOPPED";
  /**
   * @minLength 0
   * @maxLength 1600
   * @pattern ^$|arn:(aws[a-zA-Z0-9-]*):([a-zA-Z0-9\-]+):([a-z]{2}((-gov)|(-iso([a-z]?)))?-[a-z]+-\d{1})?:(\d{12})?:(.+)$
   */
  Enrichment?: string;
  EnrichmentParameters?: {
    /**
     * @minLength 0
     * @maxLength 8192
     */
    InputTemplate?: string;
    HttpParameters?: {
      PathParameterValues?: string[];
      HeaderParameters?: Record<string, string>;
      QueryStringParameters?: Record<string, string>;
    };
  };
  /**
   * @minLength 0
   * @maxLength 2048
   */
  KmsKeyIdentifier?: string;
  LastModifiedTime?: string;
  LogConfiguration?: {
    S3LogDestination?: {
      BucketName?: string;
      Prefix?: string;
      BucketOwner?: string;
      OutputFormat?: "json" | "plain" | "w3c";
    };
    FirehoseLogDestination?: {
      /**
       * @minLength 1
       * @maxLength 1600
       * @pattern ^(^arn:aws([a-z]|\-)*:firehose:([a-z]{2}((-gov)|(-iso([a-z]?)))?-[a-z]+-\d{1}):(\d{12}):deliverystream/.+)$
       */
      DeliveryStreamArn?: string;
    };
    CloudwatchLogsLogDestination?: {
      /**
       * @minLength 1
       * @maxLength 1600
       * @pattern ^(^arn:aws([a-z]|\-)*:logs:([a-z]{2}((-gov)|(-iso([a-z]?)))?-[a-z]+-\d{1}):(\d{12}):log-group:.+)$
       */
      LogGroupArn?: string;
    };
    Level?: "OFF" | "ERROR" | "INFO" | "TRACE";
    /** @uniqueItems true */
    IncludeExecutionData?: "ALL"[];
  };
  /**
   * @minLength 1
   * @maxLength 64
   * @pattern ^[\.\-_A-Za-z0-9]+$
   */
  Name?: string;
  /**
   * @minLength 1
   * @maxLength 1600
   * @pattern ^arn:(aws[a-zA-Z-]*)?:iam::\d{12}:role/?[a-zA-Z0-9+=,.@\-_/]+$
   */
  RoleArn: string;
  /**
   * @minLength 1
   * @maxLength 1600
   * @pattern ^smk://(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\-]*[A-Za-z0-9]):[0-9]{1,5}|arn:(aws[a-zA-Z0-9-]*):([a-zA-Z0-9\-]+):([a-z]{2}((-gov)|(-iso([a-z]?)))?-[a-z]+-\d{1})?:(\d{12})?:(.+)$
   */
  Source: string;
  SourceParameters?: {
    FilterCriteria?: {
      /**
       * @minItems 0
       * @maxItems 5
       */
      Filters?: {
        /**
         * @minLength 0
         * @maxLength 4096
         */
        Pattern?: string;
      }[];
    };
    KinesisStreamParameters?: {
      /**
       * @minimum 1
       * @maximum 10000
       */
      BatchSize?: number;
      DeadLetterConfig?: {
        /**
         * @minLength 1
         * @maxLength 1600
         * @pattern ^arn:(aws[a-zA-Z0-9-]*):([a-zA-Z0-9\-]+):([a-z]{2}((-gov)|(-iso([a-z]?)))?-[a-z]+-\d{1})?:(\d{12})?:(.+)$
         */
        Arn?: string;
      };
      OnPartialBatchItemFailure?: "AUTOMATIC_BISECT";
      /**
       * @minimum 0
       * @maximum 300
       */
      MaximumBatchingWindowInSeconds?: number;
      /**
       * @minimum -1
       * @maximum 604800
       */
      MaximumRecordAgeInSeconds?: number;
      /**
       * @minimum -1
       * @maximum 10000
       */
      MaximumRetryAttempts?: number;
      /**
       * @minimum 1
       * @maximum 10
       */
      ParallelizationFactor?: number;
      StartingPosition: "TRIM_HORIZON" | "LATEST" | "AT_TIMESTAMP";
      StartingPositionTimestamp?: string;
    };
    DynamoDBStreamParameters?: {
      /**
       * @minimum 1
       * @maximum 10000
       */
      BatchSize?: number;
      DeadLetterConfig?: {
        /**
         * @minLength 1
         * @maxLength 1600
         * @pattern ^arn:(aws[a-zA-Z0-9-]*):([a-zA-Z0-9\-]+):([a-z]{2}((-gov)|(-iso([a-z]?)))?-[a-z]+-\d{1})?:(\d{12})?:(.+)$
         */
        Arn?: string;
      };
      OnPartialBatchItemFailure?: "AUTOMATIC_BISECT";
      /**
       * @minimum 0
       * @maximum 300
       */
      MaximumBatchingWindowInSeconds?: number;
      /**
       * @minimum -1
       * @maximum 604800
       */
      MaximumRecordAgeInSeconds?: number;
      /**
       * @minimum -1
       * @maximum 10000
       */
      MaximumRetryAttempts?: number;
      /**
       * @minimum 1
       * @maximum 10
       */
      ParallelizationFactor?: number;
      StartingPosition: "TRIM_HORIZON" | "LATEST";
    };
    SqsQueueParameters?: {
      /**
       * @minimum 1
       * @maximum 10000
       */
      BatchSize?: number;
      /**
       * @minimum 0
       * @maximum 300
       */
      MaximumBatchingWindowInSeconds?: number;
    };
    ActiveMQBrokerParameters?: {
      Credentials: {
        /**
         * Optional SecretManager ARN which stores the database credentials
         * @minLength 1
         * @maxLength 1600
         * @pattern ^(^arn:aws([a-z]|\-)*:secretsmanager:([a-z]{2}((-gov)|(-iso([a-z]?)))?-[a-z]+-\d{1}):(\d{12}):secret:.+)$
         */
        BasicAuth: string;
      };
      /**
       * @minLength 1
       * @maxLength 1000
       * @pattern ^[\s\S]*$
       */
      QueueName: string;
      /**
       * @minimum 1
       * @maximum 10000
       */
      BatchSize?: number;
      /**
       * @minimum 0
       * @maximum 300
       */
      MaximumBatchingWindowInSeconds?: number;
    };
    RabbitMQBrokerParameters?: {
      Credentials: {
        /**
         * Optional SecretManager ARN which stores the database credentials
         * @minLength 1
         * @maxLength 1600
         * @pattern ^(^arn:aws([a-z]|\-)*:secretsmanager:([a-z]{2}((-gov)|(-iso([a-z]?)))?-[a-z]+-\d{1}):(\d{12}):secret:.+)$
         */
        BasicAuth: string;
      };
      /**
       * @minLength 1
       * @maxLength 1000
       * @pattern ^[\s\S]*$
       */
      QueueName: string;
      /**
       * @minLength 1
       * @maxLength 200
       * @pattern ^[a-zA-Z0-9-\/*:_+=.@-]*$
       */
      VirtualHost?: string;
      /**
       * @minimum 1
       * @maximum 10000
       */
      BatchSize?: number;
      /**
       * @minimum 0
       * @maximum 300
       */
      MaximumBatchingWindowInSeconds?: number;
    };
    ManagedStreamingKafkaParameters?: {
      /**
       * @minLength 1
       * @maxLength 249
       * @pattern ^[^.]([a-zA-Z0-9\-_.]+)$
       */
      TopicName: string;
      StartingPosition?: "TRIM_HORIZON" | "LATEST";
      /**
       * @minimum 1
       * @maximum 10000
       */
      BatchSize?: number;
      /**
       * @minimum 0
       * @maximum 300
       */
      MaximumBatchingWindowInSeconds?: number;
      /**
       * @minLength 1
       * @maxLength 200
       * @pattern ^[a-zA-Z0-9-\/*:_+=.@-]*$
       */
      ConsumerGroupID?: string;
      Credentials?: {
        /**
         * Optional SecretManager ARN which stores the database credentials
         * @minLength 1
         * @maxLength 1600
         * @pattern ^(^arn:aws([a-z]|\-)*:secretsmanager:([a-z]{2}((-gov)|(-iso([a-z]?)))?-[a-z]+-\d{1}):(\d{12}):secret:.+)$
         */
        SaslScram512Auth: string;
      } | {
        /**
         * Optional SecretManager ARN which stores the database credentials
         * @minLength 1
         * @maxLength 1600
         * @pattern ^(^arn:aws([a-z]|\-)*:secretsmanager:([a-z]{2}((-gov)|(-iso([a-z]?)))?-[a-z]+-\d{1}):(\d{12}):secret:.+)$
         */
        ClientCertificateTlsAuth: string;
      };
    };
    SelfManagedKafkaParameters?: {
      /**
       * @minLength 1
       * @maxLength 249
       * @pattern ^[^.]([a-zA-Z0-9\-_.]+)$
       */
      TopicName: string;
      StartingPosition?: "TRIM_HORIZON" | "LATEST";
      /**
       * @minItems 0
       * @maxItems 2
       */
      AdditionalBootstrapServers?: string[];
      /**
       * @minimum 1
       * @maximum 10000
       */
      BatchSize?: number;
      /**
       * @minimum 0
       * @maximum 300
       */
      MaximumBatchingWindowInSeconds?: number;
      /**
       * @minLength 1
       * @maxLength 200
       * @pattern ^[a-zA-Z0-9-\/*:_+=.@-]*$
       */
      ConsumerGroupID?: string;
      Credentials?: {
        /**
         * Optional SecretManager ARN which stores the database credentials
         * @minLength 1
         * @maxLength 1600
         * @pattern ^(^arn:aws([a-z]|\-)*:secretsmanager:([a-z]{2}((-gov)|(-iso([a-z]?)))?-[a-z]+-\d{1}):(\d{12}):secret:.+)$
         */
        BasicAuth: string;
      } | {
        /**
         * Optional SecretManager ARN which stores the database credentials
         * @minLength 1
         * @maxLength 1600
         * @pattern ^(^arn:aws([a-z]|\-)*:secretsmanager:([a-z]{2}((-gov)|(-iso([a-z]?)))?-[a-z]+-\d{1}):(\d{12}):secret:.+)$
         */
        SaslScram512Auth: string;
      } | {
        /**
         * Optional SecretManager ARN which stores the database credentials
         * @minLength 1
         * @maxLength 1600
         * @pattern ^(^arn:aws([a-z]|\-)*:secretsmanager:([a-z]{2}((-gov)|(-iso([a-z]?)))?-[a-z]+-\d{1}):(\d{12}):secret:.+)$
         */
        SaslScram256Auth: string;
      } | {
        /**
         * Optional SecretManager ARN which stores the database credentials
         * @minLength 1
         * @maxLength 1600
         * @pattern ^(^arn:aws([a-z]|\-)*:secretsmanager:([a-z]{2}((-gov)|(-iso([a-z]?)))?-[a-z]+-\d{1}):(\d{12}):secret:.+)$
         */
        ClientCertificateTlsAuth: string;
      };
      /**
       * Optional SecretManager ARN which stores the database credentials
       * @minLength 1
       * @maxLength 1600
       * @pattern ^(^arn:aws([a-z]|\-)*:secretsmanager:([a-z]{2}((-gov)|(-iso([a-z]?)))?-[a-z]+-\d{1}):(\d{12}):secret:.+)$
       */
      ServerRootCaCertificate?: string;
      Vpc?: {
        /**
         * List of SubnetId.
         * @minItems 0
         * @maxItems 16
         */
        Subnets?: string[];
        /**
         * List of SecurityGroupId.
         * @minItems 0
         * @maxItems 5
         */
        SecurityGroup?: string[];
      };
    };
  };
  /**
   * @minLength 0
   * @maxLength 512
   * @pattern ^.*$
   */
  StateReason?: string;
  Tags?: Record<string, string>;
  /**
   * @minLength 1
   * @maxLength 1600
   * @pattern ^arn:(aws[a-zA-Z0-9-]*):([a-zA-Z0-9\-]+):([a-z]{2}((-gov)|(-iso([a-z]?)))?-[a-z]+-\d{1})?:(\d{12})?:(.+)$
   */
  Target: string;
  TargetParameters?: {
    /**
     * @minLength 0
     * @maxLength 8192
     */
    InputTemplate?: string;
    LambdaFunctionParameters?: {
      InvocationType?: "REQUEST_RESPONSE" | "FIRE_AND_FORGET";
    };
    StepFunctionStateMachineParameters?: {
      InvocationType?: "REQUEST_RESPONSE" | "FIRE_AND_FORGET";
    };
    KinesisStreamParameters?: {
      /**
       * @minLength 0
       * @maxLength 256
       */
      PartitionKey: string;
    };
    EcsTaskParameters?: {
      /**
       * @minLength 1
       * @maxLength 1600
       * @pattern ^arn:(aws[a-zA-Z0-9-]*):([a-zA-Z0-9\-]+):([a-z]{2}((-gov)|(-iso([a-z]?)))?-[a-z]+-\d{1})?:(\d{12})?:(.+)|(\$(\.[\w/_-]+(\[(\d+|\*)\])*)*)$
       */
      TaskDefinitionArn: string;
      /** @minimum 1 */
      TaskCount?: number;
      LaunchType?: "EC2" | "FARGATE" | "EXTERNAL";
      NetworkConfiguration?: {
        AwsvpcConfiguration?: {
          /**
           * @minItems 0
           * @maxItems 16
           */
          Subnets: string[];
          /**
           * @minItems 0
           * @maxItems 5
           */
          SecurityGroups?: string[];
          AssignPublicIp?: "ENABLED" | "DISABLED";
        };
      };
      PlatformVersion?: string;
      Group?: string;
      /**
       * @minItems 0
       * @maxItems 6
       */
      CapacityProviderStrategy?: {
        /**
         * @minLength 1
         * @maxLength 255
         */
        CapacityProvider: string;
        /**
         * @default 0
         * @minimum 0
         * @maximum 1000
         */
        Weight?: number;
        /**
         * @default 0
         * @minimum 0
         * @maximum 100000
         */
        Base?: number;
      }[];
      /** @default false */
      EnableECSManagedTags?: boolean;
      /** @default false */
      EnableExecuteCommand?: boolean;
      /**
       * @minItems 0
       * @maxItems 10
       */
      PlacementConstraints?: ({
        Type?: "distinctInstance" | "memberOf";
        /**
         * @minLength 0
         * @maxLength 2000
         */
        Expression?: string;
      })[];
      /**
       * @minItems 0
       * @maxItems 5
       */
      PlacementStrategy?: ({
        Type?: "random" | "spread" | "binpack";
        /**
         * @minLength 0
         * @maxLength 255
         */
        Field?: string;
      })[];
      PropagateTags?: "TASK_DEFINITION";
      /**
       * @minLength 0
       * @maxLength 1024
       */
      ReferenceId?: string;
      Overrides?: {
        ContainerOverrides?: ({
          Command?: string[];
          Cpu?: number;
          Environment?: {
            Name?: string;
            Value?: string;
          }[];
          EnvironmentFiles?: {
            Type: "s3";
            Value: string;
          }[];
          Memory?: number;
          MemoryReservation?: number;
          Name?: string;
          ResourceRequirements?: ({
            Type: "GPU" | "InferenceAccelerator";
            Value: string;
          })[];
        })[];
        Cpu?: string;
        EphemeralStorage?: {
          /**
           * @default 0
           * @minimum 21
           * @maximum 200
           */
          SizeInGiB: number;
        };
        /**
         * @minLength 1
         * @maxLength 1600
         * @pattern ^arn:(aws[a-zA-Z0-9-]*):([a-zA-Z0-9\-]+):([a-z]{2}((-gov)|(-iso([a-z]?)))?-[a-z]+-\d{1})?:(\d{12})?:(.+)|(\$(\.[\w/_-]+(\[(\d+|\*)\])*)*)$
         */
        ExecutionRoleArn?: string;
        InferenceAcceleratorOverrides?: {
          DeviceName?: string;
          DeviceType?: string;
        }[];
        Memory?: string;
        /**
         * @minLength 1
         * @maxLength 1600
         * @pattern ^arn:(aws[a-zA-Z0-9-]*):([a-zA-Z0-9\-]+):([a-z]{2}((-gov)|(-iso([a-z]?)))?-[a-z]+-\d{1})?:(\d{12})?:(.+)|(\$(\.[\w/_-]+(\[(\d+|\*)\])*)*)$
         */
        TaskRoleArn?: string;
      };
      Tags?: {
        /**
         * @minLength 1
         * @maxLength 128
         */
        Key: string;
        /**
         * @minLength 0
         * @maxLength 256
         */
        Value: string;
      }[];
    };
    BatchJobParameters?: {
      JobDefinition: string;
      JobName: string;
      ArrayProperties?: {
        /**
         * @default 0
         * @minimum 2
         * @maximum 10000
         */
        Size?: number;
      };
      RetryStrategy?: {
        /**
         * @default 0
         * @minimum 1
         * @maximum 10
         */
        Attempts?: number;
      };
      ContainerOverrides?: {
        Command?: string[];
        Environment?: {
          Name?: string;
          Value?: string;
        }[];
        InstanceType?: string;
        ResourceRequirements?: ({
          Type: "GPU" | "MEMORY" | "VCPU";
          Value: string;
        })[];
      };
      /**
       * @minItems 0
       * @maxItems 20
       */
      DependsOn?: ({
        JobId?: string;
        Type?: "N_TO_N" | "SEQUENTIAL";
      })[];
      Parameters?: Record<string, string>;
    };
    SqsQueueParameters?: {
      /**
       * @minLength 0
       * @maxLength 100
       */
      MessageGroupId?: string;
      /**
       * @minLength 0
       * @maxLength 100
       */
      MessageDeduplicationId?: string;
    };
    HttpParameters?: {
      PathParameterValues?: string[];
      HeaderParameters?: Record<string, string>;
      QueryStringParameters?: Record<string, string>;
    };
    RedshiftDataParameters?: {
      /**
       * Optional SecretManager ARN which stores the database credentials
       * @minLength 1
       * @maxLength 1600
       * @pattern ^(^arn:aws([a-z]|\-)*:secretsmanager:([a-z]{2}((-gov)|(-iso([a-z]?)))?-[a-z]+-\d{1}):(\d{12}):secret:.+)|(\$(\.[\w/_-]+(\[(\d+|\*)\])*)*)$
       */
      SecretManagerArn?: string;
      /**
       * Redshift Database
       * @minLength 1
       * @maxLength 64
       */
      Database: string;
      /**
       * Database user name
       * @minLength 1
       * @maxLength 128
       */
      DbUser?: string;
      /**
       * A name for Redshift DataAPI statement which can be used as filter of ListStatement.
       * @minLength 1
       * @maxLength 500
       */
      StatementName?: string;
      /** @default false */
      WithEvent?: boolean;
      /**
       * A list of SQLs.
       * @minItems 1
       * @maxItems 40
       */
      Sqls: string[];
    };
    SageMakerPipelineParameters?: {
      /**
       * @minItems 0
       * @maxItems 200
       */
      PipelineParameterList?: {
        /**
         * @minLength 1
         * @maxLength 256
         * @pattern ^[a-zA-Z0-9](-*[a-zA-Z0-9])*|(\$(\.[\w/_-]+(\[(\d+|\*)\])*)*)$
         */
        Name: string;
        /**
         * @minLength 0
         * @maxLength 1024
         */
        Value: string;
      }[];
    };
    EventBridgeEventBusParameters?: {
      /**
       * @minLength 1
       * @maxLength 50
       * @pattern ^[A-Za-z0-9\-]+[\.][A-Za-z0-9\-]+$
       */
      EndpointId?: string;
      /**
       * @minLength 1
       * @maxLength 128
       */
      DetailType?: string;
      /**
       * @minLength 1
       * @maxLength 256
       * @pattern (?=[/\.\-_A-Za-z0-9]+)((?!aws\.).*)|(\$(\.[\w/_-]+(\[(\d+|\*)\])*)*)
       */
      Source?: string;
      /**
       * @minItems 0
       * @maxItems 10
       */
      Resources?: string[];
      /**
       * @minLength 1
       * @maxLength 256
       * @pattern ^\$(\.[\w/_-]+(\[(\d+|\*)\])*)*$
       */
      Time?: string;
    };
    CloudWatchLogsParameters?: {
      /**
       * @minLength 1
       * @maxLength 256
       */
      LogStreamName?: string;
      /**
       * @minLength 1
       * @maxLength 256
       * @pattern ^\$(\.[\w_-]+(\[(\d+|\*)\])*)*$
       */
      Timestamp?: string;
    };
    TimestreamParameters?: {
      /**
       * @minLength 1
       * @maxLength 256
       */
      TimeValue: string;
      EpochTimeUnit?: "MILLISECONDS" | "SECONDS" | "MICROSECONDS" | "NANOSECONDS";
      TimeFieldType?: "EPOCH" | "TIMESTAMP_FORMAT";
      /**
       * @minLength 1
       * @maxLength 256
       */
      TimestampFormat?: string;
      /**
       * @minLength 1
       * @maxLength 256
       */
      VersionValue: string;
      /**
       * @minItems 1
       * @maxItems 128
       */
      DimensionMappings: {
        /**
         * @minLength 1
         * @maxLength 2048
         */
        DimensionValue: string;
        DimensionValueType: "VARCHAR";
        /**
         * @minLength 1
         * @maxLength 256
         */
        DimensionName: string;
      }[];
      /**
       * @minItems 0
       * @maxItems 8192
       */
      SingleMeasureMappings?: ({
        /**
         * @minLength 1
         * @maxLength 2048
         */
        MeasureValue: string;
        MeasureValueType: "DOUBLE" | "BIGINT" | "VARCHAR" | "BOOLEAN" | "TIMESTAMP";
        /**
         * @minLength 1
         * @maxLength 1024
         */
        MeasureName: string;
      })[];
      /**
       * @minItems 0
       * @maxItems 1024
       */
      MultiMeasureMappings?: ({
        /**
         * @minLength 1
         * @maxLength 256
         */
        MultiMeasureName: string;
        /**
         * @minItems 1
         * @maxItems 256
         */
        MultiMeasureAttributeMappings: ({
          /**
           * @minLength 1
           * @maxLength 2048
           */
          MeasureValue: string;
          MeasureValueType: "DOUBLE" | "BIGINT" | "VARCHAR" | "BOOLEAN" | "TIMESTAMP";
          /**
           * @minLength 1
           * @maxLength 256
           */
          MultiMeasureAttributeName: string;
        })[];
      })[];
    };
  };
};
