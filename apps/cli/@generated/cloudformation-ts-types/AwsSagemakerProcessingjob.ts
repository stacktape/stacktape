// This file is auto-generated. Do not edit manually.
// Source: aws-sagemaker-processingjob.json

/** Resource Type definition for AWS::SageMaker::ProcessingJob */
export type AwsSagemakerProcessingjob = {
  AppSpecification: {
    /**
     * The arguments for a container used to run a processing job.
     * @minItems 0
     * @maxItems 100
     * @uniqueItems false
     */
    ContainerArguments?: string[];
    /**
     * The entrypoint for a container used to run a processing job.
     * @minItems 0
     * @maxItems 100
     * @uniqueItems false
     */
    ContainerEntrypoint?: string[];
    /**
     * The container image to be run by the processing job.
     * @minLength 0
     * @maxLength 256
     * @pattern .*
     */
    ImageUri: string;
  };
  Environment?: Record<string, string>;
  ExperimentConfig?: {
    /**
     * The name of an existing experiment to associate with the trial component.
     * @maxLength 120
     * @pattern [a-zA-Z0-9](-*[a-zA-Z0-9]){0,119}
     */
    ExperimentName?: string;
    /**
     * The name of an existing trial to associate the trial component with. If not specified, a new trial
     * is created.
     * @maxLength 120
     * @pattern [a-zA-Z0-9](-*[a-zA-Z0-9]){0,119}
     */
    TrialName?: string;
    /**
     * The display name for the trial component. If this key isn't specified, the display name is the
     * trial component name.
     * @maxLength 120
     * @pattern [a-zA-Z0-9](-*[a-zA-Z0-9]){0,119}
     */
    TrialComponentDisplayName?: string;
    /**
     * The name of the experiment run to associate with the trial component.
     * @maxLength 120
     * @pattern [a-zA-Z0-9](-*[a-zA-Z0-9]){0,119}
     */
    RunName?: string;
  };
  NetworkConfig?: {
    /**
     * Whether to encrypt all communications between distributed processing jobs. Choose True to encrypt
     * communications. Encryption provides greater security for distributed processing jobs, but the
     * processing might take longer.
     */
    EnableInterContainerTrafficEncryption?: boolean;
    /**
     * Whether to allow inbound and outbound network calls to and from the containers used for the
     * processing job.
     */
    EnableNetworkIsolation?: boolean;
    VpcConfig?: {
      /**
       * The VPC security group IDs, in the form 'sg-xxxxxxxx'. Specify the security groups for the VPC that
       * is specified in the 'Subnets' field.
       * @minItems 0
       * @maxItems 5
       * @uniqueItems false
       */
      SecurityGroupIds: string[];
      /**
       * The ID of the subnets in the VPC to which you want to connect your training job or model. For
       * information about the availability of specific instance types, see
       * https://docs.aws.amazon.com/sagemaker/latest/dg/regions-quotas.html
       * @minItems 0
       * @maxItems 16
       * @uniqueItems false
       */
      Subnets: string[];
    };
  };
  /**
   * An array of inputs configuring the data to download into the processing container.
   * @minItems 0
   * @maxItems 10
   * @uniqueItems false
   */
  ProcessingInputs?: ({
    S3Input?: {
      /**
       * The local path in your container where you want Amazon SageMaker to write input data to.
       * `LocalPath` is an absolute path to the input data and must begin with `/opt/ml/processing/`.
       * LocalPath is a required parameter when `AppManaged` is `False` (default).
       * @minLength 0
       * @maxLength 256
       * @pattern .*
       */
      LocalPath?: string;
      /**
       * Whether to GZIP-decompress the data in Amazon S3 as it is streamed into the processing container.
       * `Gzip` can only be used when `Pipe` mode is specified as the `S3InputMode`. In `Pipe` mode, Amazon
       * SageMaker streams input data from the source directly to your container without using the EBS
       * volume.
       * @enum ["None","Gzip"]
       */
      S3CompressionType?: "None" | "Gzip";
      /**
       * Whether to distribute the data from Amazon S3 to all processing instances with `FullyReplicated`,
       * or whether the data from Amazon S3 is shared by Amazon S3 key, downloading one shard of data to
       * each processing instance.
       * @enum ["FullyReplicated","ShardedByS3Key"]
       */
      S3DataDistributionType?: "FullyReplicated" | "ShardedByS3Key";
      /**
       * Whether you use an S3Prefix or a ManifestFile for the data type. If you choose S3Prefix, S3Uri
       * identifies a key name prefix. Amazon SageMaker uses all objects with the specified key name prefix
       * for the processing job. If you choose ManifestFile, S3Uri identifies an object that is a manifest
       * file containing a list of object keys that you want Amazon SageMaker to use for the processing job.
       * @enum ["ManifestFile","S3Prefix"]
       */
      S3DataType: "ManifestFile" | "S3Prefix";
      /**
       * Whether to use File or Pipe input mode. In File mode, Amazon SageMaker copies the data from the
       * input source onto the local ML storage volume before starting your processing container. This is
       * the most commonly used input mode. In Pipe mode, Amazon SageMaker streams input data from the
       * source directly to your processing container into named pipes without using the ML storage volume.
       * @enum ["File","Pipe"]
       */
      S3InputMode?: "File" | "Pipe";
      /**
       * The URI of the Amazon S3 prefix Amazon SageMaker downloads data required to run a processing job.
       * @minLength 0
       * @maxLength 1024
       * @pattern (https|s3)://([^/]+)/?(.*)
       */
      S3Uri: string;
    };
    DatasetDefinition?: {
      AthenaDatasetDefinition?: {
        /**
         * The name of the data catalog used in Athena query execution.
         * @maxLength 256
         */
        Catalog: string;
        /**
         * The name of the database used in the Athena query execution.
         * @maxLength 255
         * @pattern .*
         */
        Database: string;
        /**
         * The location in Amazon S3 where Athena query results are stored.
         * @minLength 0
         * @maxLength 1024
         * @pattern (https|s3)://([^/]+)/?(.*)
         */
        OutputS3Uri: string;
        /**
         * The SQL query statements, to be executed.
         * @maxLength 4096
         * @pattern [\s\S]+
         */
        QueryString: string;
        /**
         * The name of the workgroup in which the Athena query is being started.
         * @maxLength 128
         * @pattern [a-zA-Z0-9._-]+
         */
        WorkGroup?: string;
        /**
         * The data storage format for Athena query results.
         * @enum ["PARQUET","AVRO","ORC","JSON","TEXTFILE"]
         */
        OutputFormat: "PARQUET" | "AVRO" | "ORC" | "JSON" | "TEXTFILE";
        /**
         * The AWS Key Management Service (AWS KMS) key that Amazon SageMaker uses to encrypt data generated
         * from an Athena query execution.
         * @minLength 0
         * @maxLength 2048
         * @pattern [a-zA-Z0-9:/_-]*
         */
        KmsKeyId?: string;
        /**
         * The compression used for Athena query results.
         * @enum ["GZIP","SNAPPY","ZLIB"]
         */
        OutputCompression?: "GZIP" | "SNAPPY" | "ZLIB";
      };
      RedshiftDatasetDefinition?: {
        /**
         * The name of the Redshift database used in Redshift query execution.
         * @maxLength 64
         * @pattern .*
         */
        Database: string;
        /**
         * The database user name used in Redshift query execution.
         * @maxLength 128
         * @pattern .*
         */
        DbUser: string;
        /**
         * The SQL query statements to be executed.
         * @maxLength 4096
         * @pattern [\s\S]+
         */
        QueryString: string;
        /**
         * The Redshift cluster Identifier.
         * @maxLength 63
         * @pattern .*
         */
        ClusterId: string;
        /**
         * The IAM role attached to your Redshift cluster that Amazon SageMaker uses to generate datasets.
         * @minLength 20
         * @maxLength 2048
         * @pattern arn:aws[a-z\-]*:iam::\d{12}:role/?[a-zA-Z_0-9+=,.@\-_/]+
         */
        ClusterRoleArn: string;
        /**
         * The location in Amazon S3 where the Redshift query results are stored.
         * @minLength 0
         * @maxLength 1024
         * @pattern (https|s3)://([^/]+)/?(.*)
         */
        OutputS3Uri: string;
        /**
         * The data storage format for Redshift query results.
         * @enum ["PARQUET","CSV"]
         */
        OutputFormat: "PARQUET" | "CSV";
        /**
         * The AWS Key Management Service (AWS KMS) key that Amazon SageMaker uses to encrypt data from a
         * Redshift execution.
         * @minLength 0
         * @maxLength 2048
         * @pattern [a-zA-Z0-9:/_-]*
         */
        KmsKeyId?: string;
        /**
         * The compression used for Redshift query results.
         * @enum ["None","GZIP","SNAPPY","ZSTD","BZIP2"]
         */
        OutputCompression?: "None" | "GZIP" | "SNAPPY" | "ZSTD" | "BZIP2";
      };
      /**
       * Whether the generated dataset is FullyReplicated or ShardedByS3Key (default).
       * @enum ["FullyReplicated","ShardedByS3Key"]
       */
      DataDistributionType?: "FullyReplicated" | "ShardedByS3Key";
      /**
       * Whether to use File or Pipe input mode. In File (default) mode, Amazon SageMaker copies the data
       * from the input source onto the local Amazon Elastic Block Store (Amazon EBS) volumes before
       * starting your training algorithm. This is the most commonly used input mode. In Pipe mode, Amazon
       * SageMaker streams input data from the source directly to your algorithm without using the EBS
       * volume.
       * @enum ["File","Pipe"]
       */
      InputMode?: "File" | "Pipe";
      /**
       * The local path where you want Amazon SageMaker to download the Dataset Definition inputs to run a
       * processing job. LocalPath is an absolute path to the input data. This is a required parameter when
       * AppManaged is False (default).
       * @minLength 0
       * @maxLength 256
       * @pattern .*
       */
      LocalPath?: string;
    };
    /** The name for the processing job input. */
    InputName: string;
    /**
     * When True, input operations such as data download are managed natively by the processing job
     * application. When False (default), input operations are managed by Amazon SageMaker.
     */
    AppManaged?: boolean;
  })[];
  /**
   * The name of the processing job. The name must be unique within an AWS Region in the AWS account.
   * @minLength 1
   * @maxLength 63
   * @pattern [a-zA-Z0-9](-*[a-zA-Z0-9]){0,62}
   */
  ProcessingJobName?: string;
  ProcessingOutputConfig?: {
    /**
     * The AWS Key Management Service (AWS KMS) key that Amazon SageMaker uses to encrypt the processing
     * job output. KmsKeyId can be an ID of a KMS key, ARN of a KMS key, or alias of a KMS key. The
     * KmsKeyId is applied to all outputs.
     * @maxLength 2048
     * @pattern [a-zA-Z0-9:/_-]*
     */
    KmsKeyId?: string;
    /**
     * An array of outputs configuring the data to upload from the processing container.
     * @maxItems 10
     */
    Outputs: ({
      /** The name for the processing job output. */
      OutputName: string;
      /**
       * When True, output operations such as data upload are managed natively by the processing job
       * application. When False (default), output operations are managed by Amazon SageMaker.
       */
      AppManaged?: boolean;
      S3Output?: {
        /**
         * The local path of a directory where you want Amazon SageMaker to upload its contents to Amazon S3.
         * LocalPath is an absolute path to a directory containing output files. This directory will be
         * created by the platform and exist when your container's entrypoint is invoked.
         * @minLength 0
         * @maxLength 256
         * @pattern .*
         */
        LocalPath?: string;
        /**
         * Whether to upload the results of the processing job continuously or after the job completes.
         * @enum ["Continuous","EndOfJob"]
         */
        S3UploadMode: "Continuous" | "EndOfJob";
        /**
         * A URI that identifies the Amazon S3 bucket where you want Amazon SageMaker to save the results of a
         * processing job.
         * @minLength 0
         * @maxLength 1024
         * @pattern (https|s3)://([^/]+)/?(.*)
         */
        S3Uri: string;
      };
      FeatureStoreOutput?: {
        /**
         * The name of the Amazon SageMaker FeatureGroup to use as the destination for processing job output.
         * Note that your processing script is responsible for putting records into your Feature Store.
         * @maxLength 64
         * @pattern [a-zA-Z0-9]([_-]*[a-zA-Z0-9]){0,63}
         */
        FeatureGroupName: string;
      };
    })[];
  };
  ProcessingResources: {
    ClusterConfig: {
      /**
       * The number of ML compute instances to use in the processing job. For distributed processing jobs,
       * specify a value greater than 1. The default value is 1.
       * @minimum 1
       * @maximum 100
       */
      InstanceCount: number;
      /**
       * The ML compute instance type for the processing job.
       * @enum ["ml.t3.medium","ml.t3.large","ml.t3.xlarge","ml.t3.2xlarge","ml.m4.xlarge","ml.m4.2xlarge","ml.m4.4xlarge","ml.m4.10xlarge","ml.m4.16xlarge","ml.c4.xlarge","ml.c4.2xlarge","ml.c4.4xlarge","ml.c4.8xlarge","ml.c5.xlarge","ml.c5.2xlarge","ml.c5.4xlarge","ml.c5.9xlarge","ml.c5.18xlarge","ml.m5.large","ml.m5.xlarge","ml.m5.2xlarge","ml.m5.4xlarge","ml.m5.12xlarge","ml.m5.24xlarge","ml.r5.large","ml.r5.xlarge","ml.r5.2xlarge","ml.r5.4xlarge","ml.r5.8xlarge","ml.r5.12xlarge","ml.r5.16xlarge","ml.r5.24xlarge","ml.g4dn.xlarge","ml.g4dn.2xlarge","ml.g4dn.4xlarge","ml.g4dn.8xlarge","ml.g4dn.12xlarge","ml.g4dn.16xlarge","ml.g5.xlarge","ml.g5.2xlarge","ml.g5.4xlarge","ml.g5.8xlarge","ml.g5.16xlarge","ml.g5.12xlarge","ml.g5.24xlarge","ml.g5.48xlarge","ml.r5d.large","ml.r5d.xlarge","ml.r5d.2xlarge","ml.r5d.4xlarge","ml.r5d.8xlarge","ml.r5d.12xlarge","ml.r5d.16xlarge","ml.r5d.24xlarge","ml.g6.xlarge","ml.g6.2xlarge","ml.g6.4xlarge","ml.g6.8xlarge","ml.g6.12xlarge","ml.g6.16xlarge","ml.g6.24xlarge","ml.g6.48xlarge","ml.g6e.xlarge","ml.g6e.2xlarge","ml.g6e.4xlarge","ml.g6e.8xlarge","ml.g6e.12xlarge","ml.g6e.16xlarge","ml.g6e.24xlarge","ml.g6e.48xlarge","ml.m6i.large","ml.m6i.xlarge","ml.m6i.2xlarge","ml.m6i.4xlarge","ml.m6i.8xlarge","ml.m6i.12xlarge","ml.m6i.16xlarge","ml.m6i.24xlarge","ml.m6i.32xlarge","ml.c6i.xlarge","ml.c6i.2xlarge","ml.c6i.4xlarge","ml.c6i.8xlarge","ml.c6i.12xlarge","ml.c6i.16xlarge","ml.c6i.24xlarge","ml.c6i.32xlarge","ml.m7i.large","ml.m7i.xlarge","ml.m7i.2xlarge","ml.m7i.4xlarge","ml.m7i.8xlarge","ml.m7i.12xlarge","ml.m7i.16xlarge","ml.m7i.24xlarge","ml.m7i.48xlarge","ml.c7i.large","ml.c7i.xlarge","ml.c7i.2xlarge","ml.c7i.4xlarge","ml.c7i.8xlarge","ml.c7i.12xlarge","ml.c7i.16xlarge","ml.c7i.24xlarge","ml.c7i.48xlarge","ml.r7i.large","ml.r7i.xlarge","ml.r7i.2xlarge","ml.r7i.4xlarge","ml.r7i.8xlarge","ml.r7i.12xlarge","ml.r7i.16xlarge","ml.r7i.24xlarge","ml.r7i.48xlarge"]
       */
      InstanceType: "ml.t3.medium" | "ml.t3.large" | "ml.t3.xlarge" | "ml.t3.2xlarge" | "ml.m4.xlarge" | "ml.m4.2xlarge" | "ml.m4.4xlarge" | "ml.m4.10xlarge" | "ml.m4.16xlarge" | "ml.c4.xlarge" | "ml.c4.2xlarge" | "ml.c4.4xlarge" | "ml.c4.8xlarge" | "ml.c5.xlarge" | "ml.c5.2xlarge" | "ml.c5.4xlarge" | "ml.c5.9xlarge" | "ml.c5.18xlarge" | "ml.m5.large" | "ml.m5.xlarge" | "ml.m5.2xlarge" | "ml.m5.4xlarge" | "ml.m5.12xlarge" | "ml.m5.24xlarge" | "ml.r5.large" | "ml.r5.xlarge" | "ml.r5.2xlarge" | "ml.r5.4xlarge" | "ml.r5.8xlarge" | "ml.r5.12xlarge" | "ml.r5.16xlarge" | "ml.r5.24xlarge" | "ml.g4dn.xlarge" | "ml.g4dn.2xlarge" | "ml.g4dn.4xlarge" | "ml.g4dn.8xlarge" | "ml.g4dn.12xlarge" | "ml.g4dn.16xlarge" | "ml.g5.xlarge" | "ml.g5.2xlarge" | "ml.g5.4xlarge" | "ml.g5.8xlarge" | "ml.g5.16xlarge" | "ml.g5.12xlarge" | "ml.g5.24xlarge" | "ml.g5.48xlarge" | "ml.r5d.large" | "ml.r5d.xlarge" | "ml.r5d.2xlarge" | "ml.r5d.4xlarge" | "ml.r5d.8xlarge" | "ml.r5d.12xlarge" | "ml.r5d.16xlarge" | "ml.r5d.24xlarge" | "ml.g6.xlarge" | "ml.g6.2xlarge" | "ml.g6.4xlarge" | "ml.g6.8xlarge" | "ml.g6.12xlarge" | "ml.g6.16xlarge" | "ml.g6.24xlarge" | "ml.g6.48xlarge" | "ml.g6e.xlarge" | "ml.g6e.2xlarge" | "ml.g6e.4xlarge" | "ml.g6e.8xlarge" | "ml.g6e.12xlarge" | "ml.g6e.16xlarge" | "ml.g6e.24xlarge" | "ml.g6e.48xlarge" | "ml.m6i.large" | "ml.m6i.xlarge" | "ml.m6i.2xlarge" | "ml.m6i.4xlarge" | "ml.m6i.8xlarge" | "ml.m6i.12xlarge" | "ml.m6i.16xlarge" | "ml.m6i.24xlarge" | "ml.m6i.32xlarge" | "ml.c6i.xlarge" | "ml.c6i.2xlarge" | "ml.c6i.4xlarge" | "ml.c6i.8xlarge" | "ml.c6i.12xlarge" | "ml.c6i.16xlarge" | "ml.c6i.24xlarge" | "ml.c6i.32xlarge" | "ml.m7i.large" | "ml.m7i.xlarge" | "ml.m7i.2xlarge" | "ml.m7i.4xlarge" | "ml.m7i.8xlarge" | "ml.m7i.12xlarge" | "ml.m7i.16xlarge" | "ml.m7i.24xlarge" | "ml.m7i.48xlarge" | "ml.c7i.large" | "ml.c7i.xlarge" | "ml.c7i.2xlarge" | "ml.c7i.4xlarge" | "ml.c7i.8xlarge" | "ml.c7i.12xlarge" | "ml.c7i.16xlarge" | "ml.c7i.24xlarge" | "ml.c7i.48xlarge" | "ml.r7i.large" | "ml.r7i.xlarge" | "ml.r7i.2xlarge" | "ml.r7i.4xlarge" | "ml.r7i.8xlarge" | "ml.r7i.12xlarge" | "ml.r7i.16xlarge" | "ml.r7i.24xlarge" | "ml.r7i.48xlarge";
      /**
       * The size of the ML storage volume in gigabytes that you want to provision. You must specify
       * sufficient ML storage for your scenario.
       * @minimum 1
       * @maximum 16384
       */
      VolumeSizeInGB: number;
      /**
       * The AWS Key Management Service (AWS KMS) key that Amazon SageMaker uses to encrypt data on the
       * storage volume attached to the ML compute instance(s) that run the processing job.
       * @minLength 0
       * @maxLength 2048
       * @pattern [a-zA-Z0-9:/_-]*
       */
      VolumeKmsKeyId?: string;
    };
  };
  /**
   * The Amazon Resource Name (ARN) of an IAM role that Amazon SageMaker can assume to perform tasks on
   * your behalf.
   * @minLength 20
   * @maxLength 2048
   * @pattern arn:aws[a-z\-]*:iam::\d{12}:role/?[a-zA-Z_0-9+=,.@\-_/]+
   */
  RoleArn: string;
  StoppingCondition?: {
    /**
     * Specifies the maximum runtime in seconds.
     * @minimum 1
     * @maximum 777600
     */
    MaxRuntimeInSeconds: number;
  };
  /**
   * (Optional) An array of key-value pairs. For more information, see Using Cost Allocation
   * Tags(https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/cost-alloc-tags.html#allocation-whatURL)
   * in the AWS Billing and Cost Management User Guide.
   * @maxItems 50
   * @uniqueItems false
   */
  Tags?: {
    /**
     * The tag value.
     * @maxLength 256
     * @pattern ([\p{L}\p{Z}\p{N}_.:/=+\-@]*)
     */
    Value: string;
    /**
     * The tag key. Tag keys must be unique per resource.
     * @maxLength 128
     * @pattern ([\p{L}\p{Z}\p{N}_.:/=+\-@]*)
     */
    Key: string;
  }[];
  /**
   * The Amazon Resource Name (ARN) of the processing job.
   * @minLength 0
   * @maxLength 256
   * @pattern arn:aws[a-z\-]*:sagemaker:[a-z0-9\-]*:[0-9]{12}:processing-job/.*
   */
  ProcessingJobArn?: string;
  /**
   * The ARN of an AutoML job associated with this processing job.
   * @maxLength 256
   */
  AutoMLJobArn?: string;
  /**
   * An optional string, up to one KB in size, that contains metadata from the processing container when
   * the processing job exits.
   * @maxLength 1024
   * @pattern [\S\s]*
   */
  ExitMessage?: string;
  /**
   * A string, up to one KB in size, that contains the reason a processing job failed, if it failed.
   * @maxLength 1024
   */
  FailureReason?: string;
  /**
   * The ARN of a monitoring schedule for an endpoint associated with this processing job.
   * @maxLength 256
   */
  MonitoringScheduleArn?: string;
  /**
   * The ARN of a training job associated with this processing job
   * @maxLength 256
   */
  TrainingJobArn?: string;
  /**
   * Provides the status of a processing job.
   * @enum ["Completed","InProgress","Stopping","Stopped","Failed"]
   */
  ProcessingJobStatus?: "Completed" | "InProgress" | "Stopping" | "Stopped" | "Failed";
  /** The time at which the processing job was created. */
  CreationTime?: string;
  /** The time at which the processing job was last modified. */
  LastModifiedTime?: string;
  /** The time at which the processing job started. */
  ProcessingStartTime?: string;
  /** The time at which the processing job completed. */
  ProcessingEndTime?: string;
};
