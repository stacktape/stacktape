// This file is auto-generated. Do not edit manually.
// Source: aws-kinesisfirehose-deliverystream.json

/** Resource Type definition for AWS::KinesisFirehose::DeliveryStream */
export type AwsKinesisfirehoseDeliverystream = {
  DeliveryStreamEncryptionConfigurationInput?: {
    /** @enum ["AWS_OWNED_CMK","CUSTOMER_MANAGED_CMK"] */
    KeyType: "AWS_OWNED_CMK" | "CUSTOMER_MANAGED_CMK";
    /**
     * @minLength 1
     * @maxLength 512
     * @pattern arn:.*
     */
    KeyARN?: string;
  };
  HttpEndpointDestinationConfiguration?: {
    RequestConfiguration?: {
      /**
       * @minItems 0
       * @maxItems 50
       * @uniqueItems true
       */
      CommonAttributes?: {
        /**
         * @minLength 0
         * @maxLength 1024
         */
        AttributeValue: string;
        /**
         * @minLength 1
         * @maxLength 256
         */
        AttributeName: string;
      }[];
      /** @enum ["NONE","GZIP"] */
      ContentEncoding?: "NONE" | "GZIP";
    };
    S3Configuration: {
      /**
       * @minLength 0
       * @maxLength 1024
       */
      ErrorOutputPrefix?: string;
      /**
       * @minLength 1
       * @maxLength 2048
       * @pattern arn:.*
       */
      BucketARN: string;
      BufferingHints?: {
        IntervalInSeconds?: number;
        SizeInMBs?: number;
      };
      /** @enum ["UNCOMPRESSED","GZIP","ZIP","Snappy","HADOOP_SNAPPY"] */
      CompressionFormat?: "UNCOMPRESSED" | "GZIP" | "ZIP" | "Snappy" | "HADOOP_SNAPPY";
      EncryptionConfiguration?: {
        KMSEncryptionConfig?: {
          AWSKMSKeyARN: string;
        };
        /** @enum ["NoEncryption"] */
        NoEncryptionConfig?: "NoEncryption";
      };
      /**
       * @minLength 0
       * @maxLength 1024
       */
      Prefix?: string;
      CloudWatchLoggingOptions?: {
        LogStreamName?: string;
        Enabled?: boolean;
        LogGroupName?: string;
      };
      /**
       * @minLength 1
       * @maxLength 512
       * @pattern arn:.*
       */
      RoleARN: string;
    };
    BufferingHints?: {
      IntervalInSeconds?: number;
      SizeInMBs?: number;
    };
    RetryOptions?: {
      DurationInSeconds?: number;
    };
    SecretsManagerConfiguration?: {
      /**
       * @minLength 1
       * @maxLength 2048
       * @pattern arn:.*:secretsmanager:[a-zA-Z0-9\-]+:\d{12}:secret:[a-zA-Z0-9\-/_+=.@]+
       */
      SecretARN?: string;
      Enabled: boolean;
      /**
       * @minLength 1
       * @maxLength 512
       * @pattern arn:.*:iam::\d{12}:role/[a-zA-Z_0-9+=,.@\-_/]+
       */
      RoleARN?: string;
    };
    EndpointConfiguration: {
      /**
       * @minLength 0
       * @maxLength 4096
       */
      AccessKey?: string;
      /**
       * @minLength 1
       * @maxLength 1000
       */
      Url: string;
      /**
       * @minLength 1
       * @maxLength 256
       */
      Name?: string;
    };
    ProcessingConfiguration?: {
      Enabled?: boolean;
      /** @uniqueItems true */
      Processors?: ({
        /** @enum ["RecordDeAggregation","Decompression","CloudWatchLogProcessing","Lambda","MetadataExtraction","AppendDelimiterToRecord"] */
        Type: "RecordDeAggregation" | "Decompression" | "CloudWatchLogProcessing" | "Lambda" | "MetadataExtraction" | "AppendDelimiterToRecord";
        /** @uniqueItems true */
        Parameters?: ({
          ParameterValue: unknown | unknown | unknown;
          ParameterName: string;
        })[];
      })[];
    };
    /**
     * @minLength 1
     * @maxLength 512
     * @pattern arn:.*
     */
    RoleARN?: string;
    CloudWatchLoggingOptions?: {
      LogStreamName?: string;
      Enabled?: boolean;
      LogGroupName?: string;
    };
    S3BackupMode?: string;
  };
  KinesisStreamSourceConfiguration?: {
    /**
     * @minLength 1
     * @maxLength 512
     * @pattern arn:.*
     */
    KinesisStreamARN: string;
    /**
     * @minLength 1
     * @maxLength 512
     * @pattern arn:.*
     */
    RoleARN: string;
  };
  /** @enum ["DatabaseAsSource","DirectPut","KinesisStreamAsSource","MSKAsSource"] */
  DeliveryStreamType?: "DatabaseAsSource" | "DirectPut" | "KinesisStreamAsSource" | "MSKAsSource";
  IcebergDestinationConfiguration?: {
    CatalogConfiguration: {
      /**
       * @minLength 1
       * @maxLength 512
       * @pattern arn:.*
       */
      CatalogArn?: string;
      /**
       * @minLength 1
       * @maxLength 2048
       * @pattern s3:\/\/.*
       */
      WarehouseLocation?: string;
    };
    S3Configuration: {
      /**
       * @minLength 0
       * @maxLength 1024
       */
      ErrorOutputPrefix?: string;
      /**
       * @minLength 1
       * @maxLength 2048
       * @pattern arn:.*
       */
      BucketARN: string;
      BufferingHints?: {
        IntervalInSeconds?: number;
        SizeInMBs?: number;
      };
      /** @enum ["UNCOMPRESSED","GZIP","ZIP","Snappy","HADOOP_SNAPPY"] */
      CompressionFormat?: "UNCOMPRESSED" | "GZIP" | "ZIP" | "Snappy" | "HADOOP_SNAPPY";
      EncryptionConfiguration?: {
        KMSEncryptionConfig?: {
          AWSKMSKeyARN: string;
        };
        /** @enum ["NoEncryption"] */
        NoEncryptionConfig?: "NoEncryption";
      };
      /**
       * @minLength 0
       * @maxLength 1024
       */
      Prefix?: string;
      CloudWatchLoggingOptions?: {
        LogStreamName?: string;
        Enabled?: boolean;
        LogGroupName?: string;
      };
      /**
       * @minLength 1
       * @maxLength 512
       * @pattern arn:.*
       */
      RoleARN: string;
    };
    DestinationTableConfigurationList?: {
      /**
       * @minLength 1
       * @maxLength 512
       */
      DestinationDatabaseName: string;
      /**
       * @minLength 1
       * @maxLength 1024
       */
      S3ErrorOutputPrefix?: string;
      /**
       * @minLength 1
       * @maxLength 512
       */
      DestinationTableName: string;
      /** @uniqueItems true */
      UniqueKeys?: string[];
      PartitionSpec?: {
        /** @uniqueItems true */
        Identity?: {
          /**
           * @minLength 1
           * @maxLength 255
           */
          SourceName: string;
        }[];
      };
    }[];
    BufferingHints?: {
      IntervalInSeconds?: number;
      SizeInMBs?: number;
    };
    TableCreationConfiguration?: {
      Enabled?: boolean;
    };
    RetryOptions?: {
      DurationInSeconds?: number;
    };
    /** @enum ["AllData","FailedDataOnly"] */
    s3BackupMode?: "AllData" | "FailedDataOnly";
    ProcessingConfiguration?: {
      Enabled?: boolean;
      /** @uniqueItems true */
      Processors?: ({
        /** @enum ["RecordDeAggregation","Decompression","CloudWatchLogProcessing","Lambda","MetadataExtraction","AppendDelimiterToRecord"] */
        Type: "RecordDeAggregation" | "Decompression" | "CloudWatchLogProcessing" | "Lambda" | "MetadataExtraction" | "AppendDelimiterToRecord";
        /** @uniqueItems true */
        Parameters?: ({
          ParameterValue: unknown | unknown | unknown;
          ParameterName: string;
        })[];
      })[];
    };
    SchemaEvolutionConfiguration?: {
      Enabled?: boolean;
    };
    AppendOnly?: boolean;
    CloudWatchLoggingOptions?: {
      LogStreamName?: string;
      Enabled?: boolean;
      LogGroupName?: string;
    };
    /**
     * @minLength 1
     * @maxLength 512
     * @pattern arn:.*
     */
    RoleARN: string;
  };
  RedshiftDestinationConfiguration?: {
    S3BackupConfiguration?: {
      /**
       * @minLength 0
       * @maxLength 1024
       */
      ErrorOutputPrefix?: string;
      /**
       * @minLength 1
       * @maxLength 2048
       * @pattern arn:.*
       */
      BucketARN: string;
      BufferingHints?: {
        IntervalInSeconds?: number;
        SizeInMBs?: number;
      };
      /** @enum ["UNCOMPRESSED","GZIP","ZIP","Snappy","HADOOP_SNAPPY"] */
      CompressionFormat?: "UNCOMPRESSED" | "GZIP" | "ZIP" | "Snappy" | "HADOOP_SNAPPY";
      EncryptionConfiguration?: {
        KMSEncryptionConfig?: {
          AWSKMSKeyARN: string;
        };
        /** @enum ["NoEncryption"] */
        NoEncryptionConfig?: "NoEncryption";
      };
      /**
       * @minLength 0
       * @maxLength 1024
       */
      Prefix?: string;
      CloudWatchLoggingOptions?: {
        LogStreamName?: string;
        Enabled?: boolean;
        LogGroupName?: string;
      };
      /**
       * @minLength 1
       * @maxLength 512
       * @pattern arn:.*
       */
      RoleARN: string;
    };
    S3Configuration: {
      /**
       * @minLength 0
       * @maxLength 1024
       */
      ErrorOutputPrefix?: string;
      /**
       * @minLength 1
       * @maxLength 2048
       * @pattern arn:.*
       */
      BucketARN: string;
      BufferingHints?: {
        IntervalInSeconds?: number;
        SizeInMBs?: number;
      };
      /** @enum ["UNCOMPRESSED","GZIP","ZIP","Snappy","HADOOP_SNAPPY"] */
      CompressionFormat?: "UNCOMPRESSED" | "GZIP" | "ZIP" | "Snappy" | "HADOOP_SNAPPY";
      EncryptionConfiguration?: {
        KMSEncryptionConfig?: {
          AWSKMSKeyARN: string;
        };
        /** @enum ["NoEncryption"] */
        NoEncryptionConfig?: "NoEncryption";
      };
      /**
       * @minLength 0
       * @maxLength 1024
       */
      Prefix?: string;
      CloudWatchLoggingOptions?: {
        LogStreamName?: string;
        Enabled?: boolean;
        LogGroupName?: string;
      };
      /**
       * @minLength 1
       * @maxLength 512
       * @pattern arn:.*
       */
      RoleARN: string;
    };
    /**
     * @minLength 1
     * @maxLength 512
     */
    Username?: string;
    CopyCommand: {
      /**
       * @minLength 1
       * @maxLength 512
       */
      DataTableName: string;
      /**
       * @minLength 0
       * @maxLength 204800
       */
      CopyOptions?: string;
      /**
       * @minLength 0
       * @maxLength 204800
       */
      DataTableColumns?: string;
    };
    RetryOptions?: {
      DurationInSeconds?: number;
    };
    SecretsManagerConfiguration?: {
      /**
       * @minLength 1
       * @maxLength 2048
       * @pattern arn:.*:secretsmanager:[a-zA-Z0-9\-]+:\d{12}:secret:[a-zA-Z0-9\-/_+=.@]+
       */
      SecretARN?: string;
      Enabled: boolean;
      /**
       * @minLength 1
       * @maxLength 512
       * @pattern arn:.*:iam::\d{12}:role/[a-zA-Z_0-9+=,.@\-_/]+
       */
      RoleARN?: string;
    };
    ProcessingConfiguration?: {
      Enabled?: boolean;
      /** @uniqueItems true */
      Processors?: ({
        /** @enum ["RecordDeAggregation","Decompression","CloudWatchLogProcessing","Lambda","MetadataExtraction","AppendDelimiterToRecord"] */
        Type: "RecordDeAggregation" | "Decompression" | "CloudWatchLogProcessing" | "Lambda" | "MetadataExtraction" | "AppendDelimiterToRecord";
        /** @uniqueItems true */
        Parameters?: ({
          ParameterValue: unknown | unknown | unknown;
          ParameterName: string;
        })[];
      })[];
    };
    CloudWatchLoggingOptions?: {
      LogStreamName?: string;
      Enabled?: boolean;
      LogGroupName?: string;
    };
    /**
     * @minLength 1
     * @maxLength 512
     */
    ClusterJDBCURL: string;
    /**
     * @minLength 1
     * @maxLength 512
     * @pattern arn:.*
     */
    RoleARN: string;
    /**
     * @minLength 6
     * @maxLength 512
     */
    Password?: string;
    /** @enum ["Disabled","Enabled"] */
    S3BackupMode?: "Disabled" | "Enabled";
  };
  AmazonopensearchserviceDestinationConfiguration?: {
    /**
     * @minLength 0
     * @maxLength 100
     */
    TypeName?: string;
    /** @enum ["NoRotation","OneHour","OneDay","OneWeek","OneMonth"] */
    IndexRotationPeriod?: "NoRotation" | "OneHour" | "OneDay" | "OneWeek" | "OneMonth";
    ProcessingConfiguration?: {
      Enabled?: boolean;
      /** @uniqueItems true */
      Processors?: ({
        /** @enum ["RecordDeAggregation","Decompression","CloudWatchLogProcessing","Lambda","MetadataExtraction","AppendDelimiterToRecord"] */
        Type: "RecordDeAggregation" | "Decompression" | "CloudWatchLogProcessing" | "Lambda" | "MetadataExtraction" | "AppendDelimiterToRecord";
        /** @uniqueItems true */
        Parameters?: ({
          ParameterValue: unknown | unknown | unknown;
          ParameterName: string;
        })[];
      })[];
    };
    /**
     * @minLength 1
     * @maxLength 512
     * @pattern https:.*
     */
    ClusterEndpoint?: string;
    /**
     * @minLength 1
     * @maxLength 512
     * @pattern arn:.*
     */
    DomainARN?: string;
    /**
     * @minLength 1
     * @maxLength 512
     * @pattern arn:.*
     */
    RoleARN: string;
    /** @enum ["FailedDocumentsOnly","AllDocuments"] */
    S3BackupMode?: "FailedDocumentsOnly" | "AllDocuments";
    /**
     * @minLength 1
     * @maxLength 80
     */
    IndexName: string;
    DocumentIdOptions?: {
      /** @enum ["FIREHOSE_DEFAULT","NO_DOCUMENT_ID"] */
      DefaultDocumentIdFormat: "FIREHOSE_DEFAULT" | "NO_DOCUMENT_ID";
    };
    S3Configuration: {
      /**
       * @minLength 0
       * @maxLength 1024
       */
      ErrorOutputPrefix?: string;
      /**
       * @minLength 1
       * @maxLength 2048
       * @pattern arn:.*
       */
      BucketARN: string;
      BufferingHints?: {
        IntervalInSeconds?: number;
        SizeInMBs?: number;
      };
      /** @enum ["UNCOMPRESSED","GZIP","ZIP","Snappy","HADOOP_SNAPPY"] */
      CompressionFormat?: "UNCOMPRESSED" | "GZIP" | "ZIP" | "Snappy" | "HADOOP_SNAPPY";
      EncryptionConfiguration?: {
        KMSEncryptionConfig?: {
          AWSKMSKeyARN: string;
        };
        /** @enum ["NoEncryption"] */
        NoEncryptionConfig?: "NoEncryption";
      };
      /**
       * @minLength 0
       * @maxLength 1024
       */
      Prefix?: string;
      CloudWatchLoggingOptions?: {
        LogStreamName?: string;
        Enabled?: boolean;
        LogGroupName?: string;
      };
      /**
       * @minLength 1
       * @maxLength 512
       * @pattern arn:.*
       */
      RoleARN: string;
    };
    BufferingHints?: {
      IntervalInSeconds?: number;
      SizeInMBs?: number;
    };
    RetryOptions?: {
      DurationInSeconds?: number;
    };
    VpcConfiguration?: {
      /**
       * @minItems 1
       * @maxItems 16
       * @uniqueItems true
       */
      SubnetIds: string[];
      /**
       * @minItems 1
       * @maxItems 5
       * @uniqueItems true
       */
      SecurityGroupIds: string[];
      /**
       * @minLength 1
       * @maxLength 512
       * @pattern arn:.*
       */
      RoleARN: string;
    };
    CloudWatchLoggingOptions?: {
      LogStreamName?: string;
      Enabled?: boolean;
      LogGroupName?: string;
    };
  };
  MSKSourceConfiguration?: {
    AuthenticationConfiguration: {
      /** @enum ["PUBLIC","PRIVATE"] */
      Connectivity: "PUBLIC" | "PRIVATE";
      /**
       * @minLength 1
       * @maxLength 512
       * @pattern arn:.*
       */
      RoleARN: string;
    };
    ReadFromTimestamp?: string;
    /**
     * @minLength 1
     * @maxLength 512
     * @pattern arn:.*
     */
    MSKClusterARN: string;
    /**
     * @minLength 1
     * @maxLength 255
     * @pattern [a-zA-Z0-9\._\-]+
     */
    TopicName: string;
  };
  DirectPutSourceConfiguration?: {
    /**
     * @minimum 1
     * @maximum 100
     */
    ThroughputHintInMBs?: number;
  };
  SplunkDestinationConfiguration?: {
    /**
     * @minLength 0
     * @maxLength 2048
     */
    HECEndpoint: string;
    S3Configuration: {
      /**
       * @minLength 0
       * @maxLength 1024
       */
      ErrorOutputPrefix?: string;
      /**
       * @minLength 1
       * @maxLength 2048
       * @pattern arn:.*
       */
      BucketARN: string;
      BufferingHints?: {
        IntervalInSeconds?: number;
        SizeInMBs?: number;
      };
      /** @enum ["UNCOMPRESSED","GZIP","ZIP","Snappy","HADOOP_SNAPPY"] */
      CompressionFormat?: "UNCOMPRESSED" | "GZIP" | "ZIP" | "Snappy" | "HADOOP_SNAPPY";
      EncryptionConfiguration?: {
        KMSEncryptionConfig?: {
          AWSKMSKeyARN: string;
        };
        /** @enum ["NoEncryption"] */
        NoEncryptionConfig?: "NoEncryption";
      };
      /**
       * @minLength 0
       * @maxLength 1024
       */
      Prefix?: string;
      CloudWatchLoggingOptions?: {
        LogStreamName?: string;
        Enabled?: boolean;
        LogGroupName?: string;
      };
      /**
       * @minLength 1
       * @maxLength 512
       * @pattern arn:.*
       */
      RoleARN: string;
    };
    BufferingHints?: {
      IntervalInSeconds?: number;
      SizeInMBs?: number;
    };
    /**
     * @minLength 0
     * @maxLength 2048
     */
    HECToken?: string;
    RetryOptions?: {
      DurationInSeconds?: number;
    };
    /** @enum ["Raw","Event"] */
    HECEndpointType: "Raw" | "Event";
    SecretsManagerConfiguration?: {
      /**
       * @minLength 1
       * @maxLength 2048
       * @pattern arn:.*:secretsmanager:[a-zA-Z0-9\-]+:\d{12}:secret:[a-zA-Z0-9\-/_+=.@]+
       */
      SecretARN?: string;
      Enabled: boolean;
      /**
       * @minLength 1
       * @maxLength 512
       * @pattern arn:.*:iam::\d{12}:role/[a-zA-Z_0-9+=,.@\-_/]+
       */
      RoleARN?: string;
    };
    /**
     * @minimum 180
     * @maximum 600
     */
    HECAcknowledgmentTimeoutInSeconds?: number;
    ProcessingConfiguration?: {
      Enabled?: boolean;
      /** @uniqueItems true */
      Processors?: ({
        /** @enum ["RecordDeAggregation","Decompression","CloudWatchLogProcessing","Lambda","MetadataExtraction","AppendDelimiterToRecord"] */
        Type: "RecordDeAggregation" | "Decompression" | "CloudWatchLogProcessing" | "Lambda" | "MetadataExtraction" | "AppendDelimiterToRecord";
        /** @uniqueItems true */
        Parameters?: ({
          ParameterValue: unknown | unknown | unknown;
          ParameterName: string;
        })[];
      })[];
    };
    CloudWatchLoggingOptions?: {
      LogStreamName?: string;
      Enabled?: boolean;
      LogGroupName?: string;
    };
    S3BackupMode?: string;
  };
  ExtendedS3DestinationConfiguration?: {
    /**
     * @minLength 0
     * @maxLength 1024
     */
    ErrorOutputPrefix?: string;
    S3BackupConfiguration?: {
      /**
       * @minLength 0
       * @maxLength 1024
       */
      ErrorOutputPrefix?: string;
      /**
       * @minLength 1
       * @maxLength 2048
       * @pattern arn:.*
       */
      BucketARN: string;
      BufferingHints?: {
        IntervalInSeconds?: number;
        SizeInMBs?: number;
      };
      /** @enum ["UNCOMPRESSED","GZIP","ZIP","Snappy","HADOOP_SNAPPY"] */
      CompressionFormat?: "UNCOMPRESSED" | "GZIP" | "ZIP" | "Snappy" | "HADOOP_SNAPPY";
      EncryptionConfiguration?: {
        KMSEncryptionConfig?: {
          AWSKMSKeyARN: string;
        };
        /** @enum ["NoEncryption"] */
        NoEncryptionConfig?: "NoEncryption";
      };
      /**
       * @minLength 0
       * @maxLength 1024
       */
      Prefix?: string;
      CloudWatchLoggingOptions?: {
        LogStreamName?: string;
        Enabled?: boolean;
        LogGroupName?: string;
      };
      /**
       * @minLength 1
       * @maxLength 512
       * @pattern arn:.*
       */
      RoleARN: string;
    };
    /**
     * @minLength 1
     * @maxLength 2048
     * @pattern arn:.*
     */
    BucketARN: string;
    /** @enum ["UNCOMPRESSED","GZIP","ZIP","Snappy","HADOOP_SNAPPY"] */
    CompressionFormat?: "UNCOMPRESSED" | "GZIP" | "ZIP" | "Snappy" | "HADOOP_SNAPPY";
    DataFormatConversionConfiguration?: {
      InputFormatConfiguration?: {
        Deserializer?: {
          HiveJsonSerDe?: {
            /** @uniqueItems true */
            TimestampFormats?: string[];
          };
          OpenXJsonSerDe?: {
            ConvertDotsInJsonKeysToUnderscores?: boolean;
            ColumnToJsonKeyMappings?: Record<string, string>;
            CaseInsensitive?: boolean;
          };
        };
      };
      Enabled?: boolean;
      SchemaConfiguration?: {
        VersionId?: string;
        TableName?: string;
        DatabaseName?: string;
        Region?: string;
        CatalogId?: string;
        /**
         * @minLength 1
         * @maxLength 512
         * @pattern arn:.*
         */
        RoleARN?: string;
      };
      OutputFormatConfiguration?: {
        Serializer?: {
          OrcSerDe?: {
            PaddingTolerance?: number;
            Compression?: string;
            StripeSizeBytes?: number;
            /** @uniqueItems true */
            BloomFilterColumns?: string[];
            BloomFilterFalsePositiveProbability?: number;
            EnablePadding?: boolean;
            FormatVersion?: string;
            RowIndexStride?: number;
            BlockSizeBytes?: number;
            DictionaryKeyThreshold?: number;
          };
          ParquetSerDe?: {
            Compression?: string;
            BlockSizeBytes?: number;
            EnableDictionaryCompression?: boolean;
            PageSizeBytes?: number;
            MaxPaddingBytes?: number;
            WriterVersion?: string;
          };
        };
      };
    };
    EncryptionConfiguration?: {
      KMSEncryptionConfig?: {
        AWSKMSKeyARN: string;
      };
      /** @enum ["NoEncryption"] */
      NoEncryptionConfig?: "NoEncryption";
    };
    /**
     * @minLength 0
     * @maxLength 50
     */
    CustomTimeZone?: string;
    DynamicPartitioningConfiguration?: {
      Enabled?: boolean;
      RetryOptions?: {
        DurationInSeconds?: number;
      };
    };
    /**
     * @minLength 0
     * @maxLength 1024
     */
    Prefix?: string;
    ProcessingConfiguration?: {
      Enabled?: boolean;
      /** @uniqueItems true */
      Processors?: ({
        /** @enum ["RecordDeAggregation","Decompression","CloudWatchLogProcessing","Lambda","MetadataExtraction","AppendDelimiterToRecord"] */
        Type: "RecordDeAggregation" | "Decompression" | "CloudWatchLogProcessing" | "Lambda" | "MetadataExtraction" | "AppendDelimiterToRecord";
        /** @uniqueItems true */
        Parameters?: ({
          ParameterValue: unknown | unknown | unknown;
          ParameterName: string;
        })[];
      })[];
    };
    /**
     * @minLength 1
     * @maxLength 512
     * @pattern arn:.*
     */
    RoleARN: string;
    /** @enum ["Disabled","Enabled"] */
    S3BackupMode?: "Disabled" | "Enabled";
    BufferingHints?: {
      IntervalInSeconds?: number;
      SizeInMBs?: number;
    };
    /**
     * @minLength 0
     * @maxLength 128
     * @pattern ^$|\.[0-9a-z!\-_.*'()]+
     */
    FileExtension?: string;
    CloudWatchLoggingOptions?: {
      LogStreamName?: string;
      Enabled?: boolean;
      LogGroupName?: string;
    };
  };
  AmazonOpenSearchServerlessDestinationConfiguration?: {
    /**
     * @minLength 1
     * @maxLength 80
     */
    IndexName: string;
    S3Configuration: {
      /**
       * @minLength 0
       * @maxLength 1024
       */
      ErrorOutputPrefix?: string;
      /**
       * @minLength 1
       * @maxLength 2048
       * @pattern arn:.*
       */
      BucketARN: string;
      BufferingHints?: {
        IntervalInSeconds?: number;
        SizeInMBs?: number;
      };
      /** @enum ["UNCOMPRESSED","GZIP","ZIP","Snappy","HADOOP_SNAPPY"] */
      CompressionFormat?: "UNCOMPRESSED" | "GZIP" | "ZIP" | "Snappy" | "HADOOP_SNAPPY";
      EncryptionConfiguration?: {
        KMSEncryptionConfig?: {
          AWSKMSKeyARN: string;
        };
        /** @enum ["NoEncryption"] */
        NoEncryptionConfig?: "NoEncryption";
      };
      /**
       * @minLength 0
       * @maxLength 1024
       */
      Prefix?: string;
      CloudWatchLoggingOptions?: {
        LogStreamName?: string;
        Enabled?: boolean;
        LogGroupName?: string;
      };
      /**
       * @minLength 1
       * @maxLength 512
       * @pattern arn:.*
       */
      RoleARN: string;
    };
    BufferingHints?: {
      IntervalInSeconds?: number;
      SizeInMBs?: number;
    };
    RetryOptions?: {
      DurationInSeconds?: number;
    };
    /**
     * @minLength 1
     * @maxLength 512
     * @pattern https:.*
     */
    CollectionEndpoint?: string;
    VpcConfiguration?: {
      /**
       * @minItems 1
       * @maxItems 16
       * @uniqueItems true
       */
      SubnetIds: string[];
      /**
       * @minItems 1
       * @maxItems 5
       * @uniqueItems true
       */
      SecurityGroupIds: string[];
      /**
       * @minLength 1
       * @maxLength 512
       * @pattern arn:.*
       */
      RoleARN: string;
    };
    ProcessingConfiguration?: {
      Enabled?: boolean;
      /** @uniqueItems true */
      Processors?: ({
        /** @enum ["RecordDeAggregation","Decompression","CloudWatchLogProcessing","Lambda","MetadataExtraction","AppendDelimiterToRecord"] */
        Type: "RecordDeAggregation" | "Decompression" | "CloudWatchLogProcessing" | "Lambda" | "MetadataExtraction" | "AppendDelimiterToRecord";
        /** @uniqueItems true */
        Parameters?: ({
          ParameterValue: unknown | unknown | unknown;
          ParameterName: string;
        })[];
      })[];
    };
    CloudWatchLoggingOptions?: {
      LogStreamName?: string;
      Enabled?: boolean;
      LogGroupName?: string;
    };
    /**
     * @minLength 1
     * @maxLength 512
     * @pattern arn:.*
     */
    RoleARN: string;
    /** @enum ["FailedDocumentsOnly","AllDocuments"] */
    S3BackupMode?: "FailedDocumentsOnly" | "AllDocuments";
  };
  ElasticsearchDestinationConfiguration?: {
    /**
     * @minLength 0
     * @maxLength 100
     */
    TypeName?: string;
    /** @enum ["NoRotation","OneHour","OneDay","OneWeek","OneMonth"] */
    IndexRotationPeriod?: "NoRotation" | "OneHour" | "OneDay" | "OneWeek" | "OneMonth";
    ProcessingConfiguration?: {
      Enabled?: boolean;
      /** @uniqueItems true */
      Processors?: ({
        /** @enum ["RecordDeAggregation","Decompression","CloudWatchLogProcessing","Lambda","MetadataExtraction","AppendDelimiterToRecord"] */
        Type: "RecordDeAggregation" | "Decompression" | "CloudWatchLogProcessing" | "Lambda" | "MetadataExtraction" | "AppendDelimiterToRecord";
        /** @uniqueItems true */
        Parameters?: ({
          ParameterValue: unknown | unknown | unknown;
          ParameterName: string;
        })[];
      })[];
    };
    /**
     * @minLength 1
     * @maxLength 512
     * @pattern https:.*
     */
    ClusterEndpoint?: string;
    /**
     * @minLength 1
     * @maxLength 512
     * @pattern arn:.*
     */
    DomainARN?: unknown | unknown;
    /**
     * @minLength 1
     * @maxLength 512
     * @pattern arn:.*
     */
    RoleARN: string;
    /** @enum ["FailedDocumentsOnly","AllDocuments"] */
    S3BackupMode?: "FailedDocumentsOnly" | "AllDocuments";
    /**
     * @minLength 1
     * @maxLength 80
     */
    IndexName: string;
    DocumentIdOptions?: {
      /** @enum ["FIREHOSE_DEFAULT","NO_DOCUMENT_ID"] */
      DefaultDocumentIdFormat: "FIREHOSE_DEFAULT" | "NO_DOCUMENT_ID";
    };
    S3Configuration: {
      /**
       * @minLength 0
       * @maxLength 1024
       */
      ErrorOutputPrefix?: string;
      /**
       * @minLength 1
       * @maxLength 2048
       * @pattern arn:.*
       */
      BucketARN: string;
      BufferingHints?: {
        IntervalInSeconds?: number;
        SizeInMBs?: number;
      };
      /** @enum ["UNCOMPRESSED","GZIP","ZIP","Snappy","HADOOP_SNAPPY"] */
      CompressionFormat?: "UNCOMPRESSED" | "GZIP" | "ZIP" | "Snappy" | "HADOOP_SNAPPY";
      EncryptionConfiguration?: {
        KMSEncryptionConfig?: {
          AWSKMSKeyARN: string;
        };
        /** @enum ["NoEncryption"] */
        NoEncryptionConfig?: "NoEncryption";
      };
      /**
       * @minLength 0
       * @maxLength 1024
       */
      Prefix?: string;
      CloudWatchLoggingOptions?: {
        LogStreamName?: string;
        Enabled?: boolean;
        LogGroupName?: string;
      };
      /**
       * @minLength 1
       * @maxLength 512
       * @pattern arn:.*
       */
      RoleARN: string;
    };
    BufferingHints?: {
      IntervalInSeconds?: number;
      SizeInMBs?: number;
    };
    RetryOptions?: {
      DurationInSeconds?: number;
    };
    VpcConfiguration?: {
      /**
       * @minItems 1
       * @maxItems 16
       * @uniqueItems true
       */
      SubnetIds: string[];
      /**
       * @minItems 1
       * @maxItems 5
       * @uniqueItems true
       */
      SecurityGroupIds: string[];
      /**
       * @minLength 1
       * @maxLength 512
       * @pattern arn:.*
       */
      RoleARN: string;
    };
    CloudWatchLoggingOptions?: {
      LogStreamName?: string;
      Enabled?: boolean;
      LogGroupName?: string;
    };
  };
  SnowflakeDestinationConfiguration?: {
    /**
     * @minLength 256
     * @maxLength 4096
     * @pattern ^(?:[A-Za-z0-9+\/]{4})*(?:[A-Za-z0-9+\/]{2}==|[A-Za-z0-9+\/]{3}=)?$
     */
    PrivateKey?: string;
    /**
     * @minLength 1
     * @maxLength 255
     */
    User?: string;
    /**
     * @minLength 1
     * @maxLength 255
     */
    Table: string;
    SnowflakeVpcConfiguration?: {
      /**
       * @minLength 47
       * @maxLength 255
       * @pattern ([a-zA-Z0-9\-\_]+\.){2,3}vpce\.[a-zA-Z0-9\-]*\.vpce-svc\-[a-zA-Z0-9\-]{17}$
       */
      PrivateLinkVpceId: string;
    };
    /** @enum ["JSON_MAPPING","VARIANT_CONTENT_MAPPING","VARIANT_CONTENT_AND_METADATA_MAPPING"] */
    DataLoadingOption?: "JSON_MAPPING" | "VARIANT_CONTENT_MAPPING" | "VARIANT_CONTENT_AND_METADATA_MAPPING";
    /**
     * @minLength 1
     * @maxLength 255
     */
    Schema: string;
    /**
     * @minLength 1
     * @maxLength 255
     */
    ContentColumnName?: string;
    SecretsManagerConfiguration?: {
      /**
       * @minLength 1
       * @maxLength 2048
       * @pattern arn:.*:secretsmanager:[a-zA-Z0-9\-]+:\d{12}:secret:[a-zA-Z0-9\-/_+=.@]+
       */
      SecretARN?: string;
      Enabled: boolean;
      /**
       * @minLength 1
       * @maxLength 512
       * @pattern arn:.*:iam::\d{12}:role/[a-zA-Z_0-9+=,.@\-_/]+
       */
      RoleARN?: string;
    };
    SnowflakeRoleConfiguration?: {
      /**
       * @minLength 1
       * @maxLength 255
       */
      SnowflakeRole?: string;
      Enabled?: boolean;
    };
    ProcessingConfiguration?: {
      Enabled?: boolean;
      /** @uniqueItems true */
      Processors?: ({
        /** @enum ["RecordDeAggregation","Decompression","CloudWatchLogProcessing","Lambda","MetadataExtraction","AppendDelimiterToRecord"] */
        Type: "RecordDeAggregation" | "Decompression" | "CloudWatchLogProcessing" | "Lambda" | "MetadataExtraction" | "AppendDelimiterToRecord";
        /** @uniqueItems true */
        Parameters?: ({
          ParameterValue: unknown | unknown | unknown;
          ParameterName: string;
        })[];
      })[];
    };
    /**
     * @minLength 24
     * @maxLength 2048
     * @pattern .+?\.snowflakecomputing\.com
     */
    AccountUrl: string;
    /**
     * @minLength 1
     * @maxLength 512
     * @pattern arn:.*
     */
    RoleARN: string;
    /** @enum ["FailedDataOnly","AllData"] */
    S3BackupMode?: "FailedDataOnly" | "AllData";
    S3Configuration: {
      /**
       * @minLength 0
       * @maxLength 1024
       */
      ErrorOutputPrefix?: string;
      /**
       * @minLength 1
       * @maxLength 2048
       * @pattern arn:.*
       */
      BucketARN: string;
      BufferingHints?: {
        IntervalInSeconds?: number;
        SizeInMBs?: number;
      };
      /** @enum ["UNCOMPRESSED","GZIP","ZIP","Snappy","HADOOP_SNAPPY"] */
      CompressionFormat?: "UNCOMPRESSED" | "GZIP" | "ZIP" | "Snappy" | "HADOOP_SNAPPY";
      EncryptionConfiguration?: {
        KMSEncryptionConfig?: {
          AWSKMSKeyARN: string;
        };
        /** @enum ["NoEncryption"] */
        NoEncryptionConfig?: "NoEncryption";
      };
      /**
       * @minLength 0
       * @maxLength 1024
       */
      Prefix?: string;
      CloudWatchLoggingOptions?: {
        LogStreamName?: string;
        Enabled?: boolean;
        LogGroupName?: string;
      };
      /**
       * @minLength 1
       * @maxLength 512
       * @pattern arn:.*
       */
      RoleARN: string;
    };
    BufferingHints?: {
      IntervalInSeconds?: number;
      SizeInMBs?: number;
    };
    /**
     * @minLength 1
     * @maxLength 255
     */
    MetaDataColumnName?: string;
    /**
     * @minLength 1
     * @maxLength 255
     */
    Database: string;
    RetryOptions?: {
      DurationInSeconds?: number;
    };
    /**
     * @minLength 7
     * @maxLength 255
     */
    KeyPassphrase?: string;
    CloudWatchLoggingOptions?: {
      LogStreamName?: string;
      Enabled?: boolean;
      LogGroupName?: string;
    };
  };
  DatabaseSourceConfiguration?: {
    /**
     * @minLength 1
     * @maxLength 512
     * @pattern .*
     */
    Digest?: string;
    /**
     * @minimum 0
     * @maximum 65535
     */
    Port: number;
    /**
     * @minLength 1
     * @maxLength 4096
     * @pattern .*
     */
    PublicCertificate?: string;
    Columns?: {
      Exclude?: string[];
      Include?: string[];
    };
    /** @enum ["MySQL","PostgreSQL"] */
    Type: "MySQL" | "PostgreSQL";
    SurrogateKeys?: string[];
    Databases: {
      Exclude?: string[];
      Include?: string[];
    };
    /**
     * @minLength 1
     * @maxLength 255
     * @pattern ^(?!\s*$).+
     */
    Endpoint: string;
    /** @enum ["Disabled","Enabled"] */
    SSLMode?: "Disabled" | "Enabled";
    SnapshotWatermarkTable: string;
    DatabaseSourceAuthenticationConfiguration: {
      SecretsManagerConfiguration: {
        /**
         * @minLength 1
         * @maxLength 2048
         * @pattern arn:.*:secretsmanager:[a-zA-Z0-9\-]+:\d{12}:secret:[a-zA-Z0-9\-/_+=.@]+
         */
        SecretARN?: string;
        Enabled: boolean;
        /**
         * @minLength 1
         * @maxLength 512
         * @pattern arn:.*:iam::\d{12}:role/[a-zA-Z_0-9+=,.@\-_/]+
         */
        RoleARN?: string;
      };
    };
    Tables: {
      Exclude?: string[];
      Include?: string[];
    };
    DatabaseSourceVPCConfiguration: {
      VpcEndpointServiceName: string;
    };
  };
  S3DestinationConfiguration?: {
    /**
     * @minLength 0
     * @maxLength 1024
     */
    ErrorOutputPrefix?: string;
    /**
     * @minLength 1
     * @maxLength 2048
     * @pattern arn:.*
     */
    BucketARN: string;
    BufferingHints?: {
      IntervalInSeconds?: number;
      SizeInMBs?: number;
    };
    /** @enum ["UNCOMPRESSED","GZIP","ZIP","Snappy","HADOOP_SNAPPY"] */
    CompressionFormat?: "UNCOMPRESSED" | "GZIP" | "ZIP" | "Snappy" | "HADOOP_SNAPPY";
    EncryptionConfiguration?: {
      KMSEncryptionConfig?: {
        AWSKMSKeyARN: string;
      };
      /** @enum ["NoEncryption"] */
      NoEncryptionConfig?: "NoEncryption";
    };
    /**
     * @minLength 0
     * @maxLength 1024
     */
    Prefix?: string;
    CloudWatchLoggingOptions?: {
      LogStreamName?: string;
      Enabled?: boolean;
      LogGroupName?: string;
    };
    /**
     * @minLength 1
     * @maxLength 512
     * @pattern arn:.*
     */
    RoleARN: string;
  };
  /**
   * @minLength 1
   * @maxLength 64
   * @pattern [a-zA-Z0-9._-]+
   */
  DeliveryStreamName?: string;
  Arn?: string;
  /**
   * @minItems 1
   * @maxItems 50
   */
  Tags?: {
    /**
     * @minLength 0
     * @maxLength 256
     * @pattern ^[\p{L}\p{Z}\p{N}_.:\/=+\-@%]*$
     */
    Value?: string;
    /**
     * @minLength 1
     * @maxLength 128
     * @pattern ^(?!aws:)[\p{L}\p{Z}\p{N}_.:\/=+\-@%]*$
     */
    Key: string;
  }[];
};
