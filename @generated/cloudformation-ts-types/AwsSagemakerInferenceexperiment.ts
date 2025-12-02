// This file is auto-generated. Do not edit manually.
// Source: aws-sagemaker-inferenceexperiment.json

/** Resource Type definition for AWS::SageMaker::InferenceExperiment */
export type AwsSagemakerInferenceexperiment = {
  /**
   * The Amazon Resource Name (ARN) of the inference experiment.
   * @minLength 20
   * @maxLength 256
   * @pattern ^arn:aws[a-z\-]*:sagemaker:[a-z0-9\-]*:[0-9]{12}:inference-experiment/[a-zA-Z_0-9+=,.@\-_/]+$
   */
  Arn?: string;
  /**
   * The name for the inference experiment.
   * @minLength 1
   * @maxLength 120
   */
  Name: string;
  /**
   * The type of the inference experiment that you want to run.
   * @enum ["ShadowMode"]
   */
  Type: "ShadowMode";
  /**
   * The description of the inference experiment.
   * @minLength 1
   * @maxLength 1024
   * @pattern .*
   */
  Description?: string;
  /**
   * The Amazon Resource Name (ARN) of an IAM role that Amazon SageMaker can assume to access model
   * artifacts and container images, and manage Amazon SageMaker Inference endpoints for model
   * deployment.
   * @minLength 20
   * @maxLength 2048
   * @pattern ^arn:aws[a-z\-]*:iam::\d{12}:role/?[a-zA-Z_0-9+=,.@\-_/]+$
   */
  RoleArn: string;
  EndpointName: string;
  EndpointMetadata?: {
    EndpointName: string;
    /**
     * The name of the endpoint configuration.
     * @maxLength 63
     * @pattern ^[a-zA-Z0-9](-*[a-zA-Z0-9])*
     */
    EndpointConfigName?: string;
    /**
     * The status of the endpoint. For possible values of the status of an endpoint.
     * @pattern ^[a-zA-Z0-9](-*[a-zA-Z0-9])*
     * @enum ["Creating","Updating","SystemUpdating","RollingBack","InService","OutOfService","Deleting","Failed"]
     */
    EndpointStatus?: "Creating" | "Updating" | "SystemUpdating" | "RollingBack" | "InService" | "OutOfService" | "Deleting" | "Failed";
  };
  Schedule?: {
    /** The timestamp at which the inference experiment started or will start. */
    StartTime?: string;
    /** The timestamp at which the inference experiment ended or will end. */
    EndTime?: string;
  };
  /**
   * The AWS Key Management Service (AWS KMS) key that Amazon SageMaker uses to encrypt data on the
   * storage volume attached to the ML compute instance that hosts the endpoint.
   * @maxLength 2048
   * @pattern .*
   */
  KmsKey?: string;
  DataStorageConfig?: {
    /**
     * The Amazon S3 bucket where the inference request and response data is stored.
     * @maxLength 512
     * @pattern ^(https|s3)://([^/])/?(.*)$
     */
    Destination: string;
    /**
     * The AWS Key Management Service key that Amazon SageMaker uses to encrypt captured data at rest
     * using Amazon S3 server-side encryption.
     * @maxLength 2048
     * @pattern .*
     */
    KmsKey?: string;
    ContentType?: {
      /**
       * The list of all content type headers that SageMaker will treat as CSV and capture accordingly.
       * @minItems 1
       * @maxItems 10
       */
      CsvContentTypes?: string[];
      /**
       * The list of all content type headers that SageMaker will treat as JSON and capture accordingly.
       * @minItems 1
       * @maxItems 10
       */
      JsonContentTypes?: string[];
    };
  };
  /**
   * An array of ModelVariantConfig objects. Each ModelVariantConfig object in the array describes the
   * infrastructure configuration for the corresponding variant.
   * @maxItems 2
   */
  ModelVariants: {
    /**
     * The name of the Amazon SageMaker Model entity.
     * @maxLength 63
     * @pattern ^[a-zA-Z0-9](-*[a-zA-Z0-9])*
     */
    ModelName: string;
    /**
     * The name of the variant.
     * @maxLength 63
     * @pattern ^[a-zA-Z0-9]([\-a-zA-Z0-9]*[a-zA-Z0-9])?
     */
    VariantName: string;
    InfrastructureConfig: {
      /**
       * The type of the inference experiment that you want to run.
       * @enum ["RealTimeInference"]
       */
      InfrastructureType: "RealTimeInference";
      RealTimeInferenceConfig: {
        /** The instance type the model is deployed to. */
        InstanceType: string;
        /** The number of instances of the type specified by InstanceType. */
        InstanceCount: number;
      };
    };
  }[];
  ShadowModeConfig?: {
    /**
     * The name of the production variant, which takes all the inference requests.
     * @maxLength 63
     * @pattern ^[a-zA-Z0-9]([\-a-zA-Z0-9]*[a-zA-Z0-9])?
     */
    SourceModelVariantName: string;
    /**
     * List of shadow variant configurations.
     * @minItems 1
     * @maxItems 1
     */
    ShadowModelVariants: {
      /**
       * The name of the shadow variant.
       * @maxLength 63
       * @pattern ^[a-zA-Z0-9]([\-a-zA-Z0-9]*[a-zA-Z0-9])?
       */
      ShadowModelVariantName: string;
      /**
       * The percentage of inference requests that Amazon SageMaker replicates from the production variant
       * to the shadow variant.
       * @maximum 100
       */
      SamplingPercentage: number;
    }[];
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
  /** The timestamp at which you created the inference experiment. */
  CreationTime?: string;
  /** The timestamp at which you last modified the inference experiment. */
  LastModifiedTime?: string;
  /**
   * The status of the inference experiment.
   * @enum ["Creating","Created","Updating","Starting","Stopping","Running","Completed","Cancelled"]
   */
  Status?: "Creating" | "Created" | "Updating" | "Starting" | "Stopping" | "Running" | "Completed" | "Cancelled";
  /**
   * The error message or client-specified reason from the StopInferenceExperiment API, that explains
   * the status of the inference experiment.
   * @minLength 1
   * @maxLength 1024
   * @pattern .*
   */
  StatusReason?: string;
  /**
   * The desired state of the experiment after starting or stopping operation.
   * @enum ["Running","Completed","Cancelled"]
   */
  DesiredState?: "Running" | "Completed" | "Cancelled";
};
