// This file is auto-generated. Do not edit manually.
// Source: aws-sagemaker-modelqualityjobdefinition.json

/** Resource Type definition for AWS::SageMaker::ModelQualityJobDefinition */
export type AwsSagemakerModelqualityjobdefinition = {
  /**
   * The Amazon Resource Name (ARN) of job definition.
   * @minLength 1
   * @maxLength 256
   */
  JobDefinitionArn?: string;
  JobDefinitionName?: string;
  ModelQualityBaselineConfig?: {
    BaseliningJobName?: string;
    ConstraintsResource?: {
      /**
       * The Amazon S3 URI for baseline constraint file in Amazon S3 that the current monitoring job should
       * validated against.
       */
      S3Uri?: string;
    };
  };
  ModelQualityAppSpecification: {
    /**
     * An array of arguments for the container used to run the monitoring job.
     * @maxItems 50
     */
    ContainerArguments?: string[];
    /**
     * Specifies the entrypoint for a container used to run the monitoring job.
     * @maxItems 100
     */
    ContainerEntrypoint?: string[];
    /**
     * The container image to be run by the monitoring job.
     * @maxLength 255
     * @pattern .*
     */
    ImageUri: string;
    /**
     * An Amazon S3 URI to a script that is called after analysis has been performed. Applicable only for
     * the built-in (first party) containers.
     */
    PostAnalyticsProcessorSourceUri?: string;
    /**
     * An Amazon S3 URI to a script that is called per row prior to running analysis. It can base64 decode
     * the payload and convert it into a flatted json so that the built-in container can use the converted
     * data. Applicable only for the built-in (first party) containers
     */
    RecordPreprocessorSourceUri?: string;
    /** Sets the environment variables in the Docker container */
    Environment?: Record<string, string>;
    ProblemType: "BinaryClassification" | "MulticlassClassification" | "Regression";
  };
  ModelQualityJobInput: {
    EndpointInput?: {
      EndpointName: string;
      /**
       * Path to the filesystem where the endpoint data is available to the container.
       * @maxLength 256
       * @pattern .*
       */
      LocalPath: string;
      /**
       * Whether input data distributed in Amazon S3 is fully replicated or sharded by an S3 key. Defauts to
       * FullyReplicated
       * @enum ["FullyReplicated","ShardedByS3Key"]
       */
      S3DataDistributionType?: "FullyReplicated" | "ShardedByS3Key";
      /**
       * Whether the Pipe or File is used as the input mode for transfering data for the monitoring job.
       * Pipe mode is recommended for large datasets. File mode is useful for small files that fit in
       * memory. Defaults to File.
       * @enum ["Pipe","File"]
       */
      S3InputMode?: "Pipe" | "File";
      /** Monitoring start time offset, e.g. -PT1H */
      StartTimeOffset?: string;
      /** Monitoring end time offset, e.g. PT0H */
      EndTimeOffset?: string;
      /**
       * Index or JSONpath to locate predicted label(s)
       * @maxLength 256
       */
      InferenceAttribute?: string;
      /**
       * Index or JSONpath to locate probabilities
       * @maxLength 256
       */
      ProbabilityAttribute?: string;
      ProbabilityThresholdAttribute?: number;
    };
    BatchTransformInput?: {
      /**
       * A URI that identifies the Amazon S3 storage location where Batch Transform Job captures data.
       * @maxLength 512
       * @pattern ^(https|s3)://([^/]+)/?(.*)$
       */
      DataCapturedDestinationS3Uri: string;
      DatasetFormat: {
        Csv?: {
          /** A boolean flag indicating if given CSV has header */
          Header?: boolean;
        };
        Json?: {
          /** A boolean flag indicating if it is JSON line format */
          Line?: boolean;
        };
        Parquet?: boolean;
      };
      /**
       * Path to the filesystem where the endpoint data is available to the container.
       * @maxLength 256
       * @pattern .*
       */
      LocalPath: string;
      /**
       * Whether input data distributed in Amazon S3 is fully replicated or sharded by an S3 key. Defauts to
       * FullyReplicated
       * @enum ["FullyReplicated","ShardedByS3Key"]
       */
      S3DataDistributionType?: "FullyReplicated" | "ShardedByS3Key";
      /**
       * Whether the Pipe or File is used as the input mode for transfering data for the monitoring job.
       * Pipe mode is recommended for large datasets. File mode is useful for small files that fit in
       * memory. Defaults to File.
       * @enum ["Pipe","File"]
       */
      S3InputMode?: "Pipe" | "File";
      /** Monitoring start time offset, e.g. -PT1H */
      StartTimeOffset?: string;
      /** Monitoring end time offset, e.g. PT0H */
      EndTimeOffset?: string;
      /**
       * Index or JSONpath to locate predicted label(s)
       * @maxLength 256
       */
      InferenceAttribute?: string;
      /**
       * Index or JSONpath to locate probabilities
       * @maxLength 256
       */
      ProbabilityAttribute?: string;
      ProbabilityThresholdAttribute?: number;
    };
    GroundTruthS3Input: {
      /**
       * A URI that identifies the Amazon S3 storage location where Amazon SageMaker saves the results of a
       * monitoring job.
       * @maxLength 512
       * @pattern ^(https|s3)://([^/]+)/?(.*)$
       */
      S3Uri: string;
    };
  };
  ModelQualityJobOutputConfig: {
    /**
     * The AWS Key Management Service (AWS KMS) key that Amazon SageMaker uses to encrypt the model
     * artifacts at rest using Amazon S3 server-side encryption.
     * @maxLength 2048
     * @pattern .*
     */
    KmsKeyId?: string;
    /**
     * Monitoring outputs for monitoring jobs. This is where the output of the periodic monitoring jobs is
     * uploaded.
     * @minLength 1
     * @maxLength 1
     */
    MonitoringOutputs: ({
      S3Output: {
        /**
         * The local path to the Amazon S3 storage location where Amazon SageMaker saves the results of a
         * monitoring job. LocalPath is an absolute path for the output data.
         * @maxLength 256
         * @pattern .*
         */
        LocalPath: string;
        /**
         * Whether to upload the results of the monitoring job continuously or after the job completes.
         * @enum ["Continuous","EndOfJob"]
         */
        S3UploadMode?: "Continuous" | "EndOfJob";
        /**
         * A URI that identifies the Amazon S3 storage location where Amazon SageMaker saves the results of a
         * monitoring job.
         * @maxLength 512
         * @pattern ^(https|s3)://([^/]+)/?(.*)$
         */
        S3Uri: string;
      };
    })[];
  };
  JobResources: {
    ClusterConfig: {
      /**
       * The number of ML compute instances to use in the model monitoring job. For distributed processing
       * jobs, specify a value greater than 1. The default value is 1.
       * @minimum 1
       * @maximum 100
       */
      InstanceCount: number;
      /** The ML compute instance type for the processing job. */
      InstanceType: string;
      /**
       * The AWS Key Management Service (AWS KMS) key that Amazon SageMaker uses to encrypt data on the
       * storage volume attached to the ML compute instance(s) that run the model monitoring job.
       * @minimum 1
       * @maximum 2048
       */
      VolumeKmsKeyId?: string;
      /**
       * The size of the ML storage volume, in gigabytes, that you want to provision. You must specify
       * sufficient ML storage for your scenario.
       * @minimum 1
       * @maximum 16384
       */
      VolumeSizeInGB: number;
    };
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
       * The VPC security group IDs, in the form sg-xxxxxxxx. Specify the security groups for the VPC that
       * is specified in the Subnets field.
       * @minItems 1
       * @maxItems 5
       */
      SecurityGroupIds: string[];
      /**
       * The ID of the subnets in the VPC to which you want to connect to your monitoring jobs.
       * @minItems 1
       * @maxItems 16
       */
      Subnets: string[];
    };
  };
  EndpointName?: string;
  /**
   * The Amazon Resource Name (ARN) of an IAM role that Amazon SageMaker can assume to perform tasks on
   * your behalf.
   * @minLength 20
   * @maxLength 2048
   * @pattern ^arn:aws[a-z\-]*:iam::\d{12}:role/?[a-zA-Z_0-9+=,.@\-_/]+$
   */
  RoleArn: string;
  StoppingCondition?: {
    /**
     * The maximum runtime allowed in seconds.
     * @minimum 1
     * @maximum 86400
     */
    MaxRuntimeInSeconds: number;
  };
  /**
   * An array of key-value pairs to apply to this resource.
   * @maxItems 50
   */
  Tags?: {
    /**
     * The key name of the tag. You can specify a value that is 1 to 127 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 1
     * @maxLength 128
     * @pattern ^([\p{L}\p{Z}\p{N}_.:/=+\-@]*)$
     */
    Key: string;
    /**
     * The value for the tag. You can specify a value that is 1 to 255 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @maxLength 256
     * @pattern ^([\p{L}\p{Z}\p{N}_.:/=+\-@]*)$
     */
    Value: string;
  }[];
  /** The time at which the job definition was created. */
  CreationTime?: string;
};
