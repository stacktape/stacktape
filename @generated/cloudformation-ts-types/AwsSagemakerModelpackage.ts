// This file is auto-generated. Do not edit manually.
// Source: aws-sagemaker-modelpackage.json

/** Resource Type definition for AWS::SageMaker::ModelPackage */
export type AwsSagemakerModelpackage = {
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
  AdditionalInferenceSpecifications?: ({
    /**
     * The Amazon ECR registry path of the Docker image that contains the inference code.
     * @minItems 1
     * @maxItems 15
     */
    Containers: ({
      /**
       * The DNS host name for the Docker container.
       * @maxLength 63
       * @pattern ^[a-zA-Z0-9](-*[a-zA-Z0-9]){0,62}
       */
      ContainerHostname?: string;
      Environment?: Record<string, string>;
      ModelInput?: {
        /**
         * The input configuration object for the model.
         * @minLength 1
         * @maxLength 1024
         * @pattern [\S\s]+
         */
        DataInputConfig: string;
      };
      /**
       * The Amazon EC2 Container Registry (Amazon ECR) path where inference code is stored.
       * @minLength 1
       * @maxLength 255
       * @pattern [\S]{1,255}
       */
      Image: string;
      /**
       * An MD5 hash of the training algorithm that identifies the Docker image used for training.
       * @maxLength 72
       * @pattern ^[Ss][Hh][Aa]256:[0-9a-fA-F]{64}$
       */
      ImageDigest?: string;
      /**
       * A structure with Model Input details.
       * @maxLength 1024
       * @pattern ^(https|s3)://([^/]+)/?(.*)$
       */
      ModelDataUrl?: string;
      ModelDataSource?: {
        S3DataSource?: {
          /**
           * Specifies the type of ML model data to deploy.
           * @enum ["S3Prefix","S3Object"]
           */
          S3DataType: "S3Prefix" | "S3Object";
          /**
           * Specifies the S3 path of ML model data to deploy.
           * @maxLength 1024
           * @pattern ^(https|s3)://([^/]+)/?(.*)$
           */
          S3Uri: string;
          /**
           * Specifies how the ML model data is prepared.
           * @enum ["None","Gzip"]
           */
          CompressionType: "None" | "Gzip";
          ModelAccessConfig?: {
            /** Specifies agreement to the model end-user license agreement (EULA). */
            AcceptEula: boolean;
          };
        };
      };
      /** The machine learning framework of the model package container image. */
      Framework?: string;
      /**
       * The framework version of the Model Package Container Image.
       * @minLength 3
       * @maxLength 10
       * @pattern [0-9]\.[A-Za-z0-9.]+
       */
      FrameworkVersion?: string;
      /**
       * The name of a pre-trained machine learning benchmarked by Amazon SageMaker Inference Recommender
       * model that matches your model.
       */
      NearestModelName?: string;
    })[];
    /**
     * A description of the additional Inference specification.
     * @maxLength 1024
     * @pattern .*
     */
    Description?: string;
    /**
     * A unique name to identify the additional inference specification. The name must be unique within
     * the list of your additional inference specifications for a particular model package.
     * @minLength 1
     * @maxLength 63
     * @pattern ^[a-zA-Z0-9](-*[a-zA-Z0-9]){0,62}$
     */
    Name: string;
    /** The supported MIME types for the input data. */
    SupportedContentTypes?: string[];
    /** A list of the instance types that are used to generate inferences in real-time */
    SupportedRealtimeInferenceInstanceTypes?: string[];
    /** The supported MIME types for the output data. */
    SupportedResponseMIMETypes?: string[];
    /**
     * A list of the instance types on which a transformation job can be run or on which an endpoint can
     * be deployed.
     * @minItems 1
     */
    SupportedTransformInstanceTypes?: string[];
  })[];
  CertifyForMarketplace?: boolean;
  ClientToken?: string;
  CustomerMetadataProperties?: Record<string, string>;
  Domain?: string;
  DriftCheckBaselines?: {
    Bias?: {
      PostTrainingConstraints?: {
        /**
         * The digest of the metric source.
         * @maxLength 72
         * @pattern ^[Ss][Hh][Aa]256:[0-9a-fA-F]{64}$
         */
        ContentDigest?: string;
        /**
         * The type of content stored in the metric source.
         * @maxLength 256
         * @pattern .*
         */
        ContentType: string;
        /**
         * The Amazon S3 URI for the metric source.
         * @maxLength 1024
         * @pattern ^(https|s3)://([^/]+)/?(.*)$
         */
        S3Uri: string;
      };
      PreTrainingConstraints?: {
        /**
         * The digest of the metric source.
         * @maxLength 72
         * @pattern ^[Ss][Hh][Aa]256:[0-9a-fA-F]{64}$
         */
        ContentDigest?: string;
        /**
         * The type of content stored in the metric source.
         * @maxLength 256
         * @pattern .*
         */
        ContentType: string;
        /**
         * The Amazon S3 URI for the metric source.
         * @maxLength 1024
         * @pattern ^(https|s3)://([^/]+)/?(.*)$
         */
        S3Uri: string;
      };
      ConfigFile?: {
        /**
         * The digest of the file source.
         * @maxLength 72
         * @pattern ^[Ss][Hh][Aa]256:[0-9a-fA-F]{64}$
         */
        ContentDigest?: string;
        /**
         * The type of content stored in the file source.
         * @maxLength 256
         * @pattern .*
         */
        ContentType?: string;
        /**
         * The Amazon S3 URI for the file source.
         * @maxLength 1024
         * @pattern ^(https|s3)://([^/]+)/?(.*)$
         */
        S3Uri: string;
      };
    };
    Explainability?: {
      Constraints?: {
        /**
         * The digest of the metric source.
         * @maxLength 72
         * @pattern ^[Ss][Hh][Aa]256:[0-9a-fA-F]{64}$
         */
        ContentDigest?: string;
        /**
         * The type of content stored in the metric source.
         * @maxLength 256
         * @pattern .*
         */
        ContentType: string;
        /**
         * The Amazon S3 URI for the metric source.
         * @maxLength 1024
         * @pattern ^(https|s3)://([^/]+)/?(.*)$
         */
        S3Uri: string;
      };
      ConfigFile?: {
        /**
         * The digest of the file source.
         * @maxLength 72
         * @pattern ^[Ss][Hh][Aa]256:[0-9a-fA-F]{64}$
         */
        ContentDigest?: string;
        /**
         * The type of content stored in the file source.
         * @maxLength 256
         * @pattern .*
         */
        ContentType?: string;
        /**
         * The Amazon S3 URI for the file source.
         * @maxLength 1024
         * @pattern ^(https|s3)://([^/]+)/?(.*)$
         */
        S3Uri: string;
      };
    };
    ModelDataQuality?: {
      Constraints?: {
        /**
         * The digest of the metric source.
         * @maxLength 72
         * @pattern ^[Ss][Hh][Aa]256:[0-9a-fA-F]{64}$
         */
        ContentDigest?: string;
        /**
         * The type of content stored in the metric source.
         * @maxLength 256
         * @pattern .*
         */
        ContentType: string;
        /**
         * The Amazon S3 URI for the metric source.
         * @maxLength 1024
         * @pattern ^(https|s3)://([^/]+)/?(.*)$
         */
        S3Uri: string;
      };
      Statistics?: {
        /**
         * The digest of the metric source.
         * @maxLength 72
         * @pattern ^[Ss][Hh][Aa]256:[0-9a-fA-F]{64}$
         */
        ContentDigest?: string;
        /**
         * The type of content stored in the metric source.
         * @maxLength 256
         * @pattern .*
         */
        ContentType: string;
        /**
         * The Amazon S3 URI for the metric source.
         * @maxLength 1024
         * @pattern ^(https|s3)://([^/]+)/?(.*)$
         */
        S3Uri: string;
      };
    };
    ModelQuality?: {
      Constraints?: {
        /**
         * The digest of the metric source.
         * @maxLength 72
         * @pattern ^[Ss][Hh][Aa]256:[0-9a-fA-F]{64}$
         */
        ContentDigest?: string;
        /**
         * The type of content stored in the metric source.
         * @maxLength 256
         * @pattern .*
         */
        ContentType: string;
        /**
         * The Amazon S3 URI for the metric source.
         * @maxLength 1024
         * @pattern ^(https|s3)://([^/]+)/?(.*)$
         */
        S3Uri: string;
      };
      Statistics?: {
        /**
         * The digest of the metric source.
         * @maxLength 72
         * @pattern ^[Ss][Hh][Aa]256:[0-9a-fA-F]{64}$
         */
        ContentDigest?: string;
        /**
         * The type of content stored in the metric source.
         * @maxLength 256
         * @pattern .*
         */
        ContentType: string;
        /**
         * The Amazon S3 URI for the metric source.
         * @maxLength 1024
         * @pattern ^(https|s3)://([^/]+)/?(.*)$
         */
        S3Uri: string;
      };
    };
  };
  InferenceSpecification?: {
    /**
     * The Amazon ECR registry path of the Docker image that contains the inference code.
     * @minItems 1
     * @maxItems 15
     * @uniqueItems true
     */
    Containers: ({
      /**
       * The DNS host name for the Docker container.
       * @maxLength 63
       * @pattern ^[a-zA-Z0-9](-*[a-zA-Z0-9]){0,62}
       */
      ContainerHostname?: string;
      Environment?: Record<string, string>;
      ModelInput?: {
        /**
         * The input configuration object for the model.
         * @minLength 1
         * @maxLength 1024
         * @pattern [\S\s]+
         */
        DataInputConfig: string;
      };
      /**
       * The Amazon EC2 Container Registry (Amazon ECR) path where inference code is stored.
       * @minLength 1
       * @maxLength 255
       * @pattern [\S]{1,255}
       */
      Image: string;
      /**
       * An MD5 hash of the training algorithm that identifies the Docker image used for training.
       * @maxLength 72
       * @pattern ^[Ss][Hh][Aa]256:[0-9a-fA-F]{64}$
       */
      ImageDigest?: string;
      /**
       * A structure with Model Input details.
       * @maxLength 1024
       * @pattern ^(https|s3)://([^/]+)/?(.*)$
       */
      ModelDataUrl?: string;
      ModelDataSource?: {
        S3DataSource?: {
          /**
           * Specifies the type of ML model data to deploy.
           * @enum ["S3Prefix","S3Object"]
           */
          S3DataType: "S3Prefix" | "S3Object";
          /**
           * Specifies the S3 path of ML model data to deploy.
           * @maxLength 1024
           * @pattern ^(https|s3)://([^/]+)/?(.*)$
           */
          S3Uri: string;
          /**
           * Specifies how the ML model data is prepared.
           * @enum ["None","Gzip"]
           */
          CompressionType: "None" | "Gzip";
          ModelAccessConfig?: {
            /** Specifies agreement to the model end-user license agreement (EULA). */
            AcceptEula: boolean;
          };
        };
      };
      /** The machine learning framework of the model package container image. */
      Framework?: string;
      /**
       * The framework version of the Model Package Container Image.
       * @minLength 3
       * @maxLength 10
       * @pattern [0-9]\.[A-Za-z0-9.]+
       */
      FrameworkVersion?: string;
      /**
       * The name of a pre-trained machine learning benchmarked by Amazon SageMaker Inference Recommender
       * model that matches your model.
       */
      NearestModelName?: string;
    })[];
    /** The supported MIME types for the input data. */
    SupportedContentTypes: string[];
    /** A list of the instance types that are used to generate inferences in real-time */
    SupportedRealtimeInferenceInstanceTypes?: string[];
    /** The supported MIME types for the output data. */
    SupportedResponseMIMETypes: string[];
    /**
     * A list of the instance types on which a transformation job can be run or on which an endpoint can
     * be deployed.
     * @minItems 1
     */
    SupportedTransformInstanceTypes?: string[];
  };
  MetadataProperties?: {
    /**
     * The commit ID.
     * @maxLength 1024
     * @pattern .*
     */
    CommitId?: string;
    /**
     * The entity this entity was generated by.
     * @maxLength 1024
     * @pattern .*
     */
    GeneratedBy?: string;
    /**
     * The project ID metadata.
     * @maxLength 1024
     * @pattern .*
     */
    ProjectId?: string;
    /**
     * The repository metadata.
     * @maxLength 1024
     * @pattern .*
     */
    Repository?: string;
  };
  ModelApprovalStatus?: "Approved" | "Rejected" | "PendingManualApproval";
  ModelMetrics?: {
    Bias?: {
      Report?: {
        /**
         * The digest of the metric source.
         * @maxLength 72
         * @pattern ^[Ss][Hh][Aa]256:[0-9a-fA-F]{64}$
         */
        ContentDigest?: string;
        /**
         * The type of content stored in the metric source.
         * @maxLength 256
         * @pattern .*
         */
        ContentType: string;
        /**
         * The Amazon S3 URI for the metric source.
         * @maxLength 1024
         * @pattern ^(https|s3)://([^/]+)/?(.*)$
         */
        S3Uri: string;
      };
      PreTrainingReport?: {
        /**
         * The digest of the metric source.
         * @maxLength 72
         * @pattern ^[Ss][Hh][Aa]256:[0-9a-fA-F]{64}$
         */
        ContentDigest?: string;
        /**
         * The type of content stored in the metric source.
         * @maxLength 256
         * @pattern .*
         */
        ContentType: string;
        /**
         * The Amazon S3 URI for the metric source.
         * @maxLength 1024
         * @pattern ^(https|s3)://([^/]+)/?(.*)$
         */
        S3Uri: string;
      };
      PostTrainingReport?: {
        /**
         * The digest of the metric source.
         * @maxLength 72
         * @pattern ^[Ss][Hh][Aa]256:[0-9a-fA-F]{64}$
         */
        ContentDigest?: string;
        /**
         * The type of content stored in the metric source.
         * @maxLength 256
         * @pattern .*
         */
        ContentType: string;
        /**
         * The Amazon S3 URI for the metric source.
         * @maxLength 1024
         * @pattern ^(https|s3)://([^/]+)/?(.*)$
         */
        S3Uri: string;
      };
    };
    Explainability?: {
      Report?: {
        /**
         * The digest of the metric source.
         * @maxLength 72
         * @pattern ^[Ss][Hh][Aa]256:[0-9a-fA-F]{64}$
         */
        ContentDigest?: string;
        /**
         * The type of content stored in the metric source.
         * @maxLength 256
         * @pattern .*
         */
        ContentType: string;
        /**
         * The Amazon S3 URI for the metric source.
         * @maxLength 1024
         * @pattern ^(https|s3)://([^/]+)/?(.*)$
         */
        S3Uri: string;
      };
    };
    ModelDataQuality?: {
      Constraints?: {
        /**
         * The digest of the metric source.
         * @maxLength 72
         * @pattern ^[Ss][Hh][Aa]256:[0-9a-fA-F]{64}$
         */
        ContentDigest?: string;
        /**
         * The type of content stored in the metric source.
         * @maxLength 256
         * @pattern .*
         */
        ContentType: string;
        /**
         * The Amazon S3 URI for the metric source.
         * @maxLength 1024
         * @pattern ^(https|s3)://([^/]+)/?(.*)$
         */
        S3Uri: string;
      };
      Statistics?: {
        /**
         * The digest of the metric source.
         * @maxLength 72
         * @pattern ^[Ss][Hh][Aa]256:[0-9a-fA-F]{64}$
         */
        ContentDigest?: string;
        /**
         * The type of content stored in the metric source.
         * @maxLength 256
         * @pattern .*
         */
        ContentType: string;
        /**
         * The Amazon S3 URI for the metric source.
         * @maxLength 1024
         * @pattern ^(https|s3)://([^/]+)/?(.*)$
         */
        S3Uri: string;
      };
    };
    ModelQuality?: {
      Constraints?: {
        /**
         * The digest of the metric source.
         * @maxLength 72
         * @pattern ^[Ss][Hh][Aa]256:[0-9a-fA-F]{64}$
         */
        ContentDigest?: string;
        /**
         * The type of content stored in the metric source.
         * @maxLength 256
         * @pattern .*
         */
        ContentType: string;
        /**
         * The Amazon S3 URI for the metric source.
         * @maxLength 1024
         * @pattern ^(https|s3)://([^/]+)/?(.*)$
         */
        S3Uri: string;
      };
      Statistics?: {
        /**
         * The digest of the metric source.
         * @maxLength 72
         * @pattern ^[Ss][Hh][Aa]256:[0-9a-fA-F]{64}$
         */
        ContentDigest?: string;
        /**
         * The type of content stored in the metric source.
         * @maxLength 256
         * @pattern .*
         */
        ContentType: string;
        /**
         * The Amazon S3 URI for the metric source.
         * @maxLength 1024
         * @pattern ^(https|s3)://([^/]+)/?(.*)$
         */
        S3Uri: string;
      };
    };
  };
  ModelPackageDescription?: string;
  ModelPackageGroupName?: string;
  ModelPackageName?: string;
  SamplePayloadUrl?: string;
  SkipModelValidation?: "None" | "All";
  SourceAlgorithmSpecification?: {
    /**
     * A list of algorithms that were used to create a model package.
     * @minItems 1
     * @maxItems 1
     */
    SourceAlgorithms: {
      /**
       * The name of an algorithm that was used to create the model package. The algorithm must be either an
       * algorithm resource in your Amazon SageMaker account or an algorithm in AWS Marketplace that you are
       * subscribed to.
       * @minLength 1
       * @maxLength 170
       * @pattern (arn:aws[a-z\-]*:sagemaker:[a-z0-9\-]*:[0-9]{12}:[a-z\-]*\/)?([a-zA-Z0-9]([a-zA-Z0-9-]){0,62})(?<!-)$
       */
      AlgorithmName: string;
      /**
       * The Amazon S3 path where the model artifacts, which result from model training, are stored. This
       * path must point to a single gzip compressed tar archive (.tar.gz suffix).
       * @maxLength 1024
       * @pattern ^(https|s3)://([^/]+)/?(.*)$
       */
      ModelDataUrl?: string;
    }[];
  };
  Task?: string;
  ValidationSpecification?: {
    /**
     * @minItems 1
     * @maxItems 1
     */
    ValidationProfiles: ({
      TransformJobDefinition: {
        Environment?: Record<string, string>;
        /**
         * A string that determines the number of records included in a single mini-batch.
         * @enum ["MultiRecord","SingleRecord"]
         */
        BatchStrategy?: "MultiRecord" | "SingleRecord";
        /**
         * The maximum number of parallel requests that can be sent to each instance in a transform job. The
         * default value is 1.
         * @minimum 0
         */
        MaxConcurrentTransforms?: number;
        /**
         * The maximum payload size allowed, in MB. A payload is the data portion of a record (without
         * metadata).
         * @minimum 0
         */
        MaxPayloadInMB?: number;
        TransformInput: {
          /**
           * If your transform data is compressed, specify the compression type. Amazon SageMaker automatically
           * decompresses the data for the transform job accordingly. The default value is None.
           * @enum ["None","Gzip"]
           */
          CompressionType?: "None" | "Gzip";
          /**
           * The multipurpose internet mail extension (MIME) type of the data. Amazon SageMaker uses the MIME
           * type with each http call to transfer data to the transform job.
           * @maxLength 256
           * @pattern .*
           */
          ContentType?: string;
          DataSource: {
            S3DataSource: {
              /**
               * The S3 Data Source Type
               * @enum ["ManifestFile","S3Prefix","AugmentedManifestFile"]
               */
              S3DataType: "ManifestFile" | "S3Prefix" | "AugmentedManifestFile";
              /**
               * Depending on the value specified for the S3DataType, identifies either a key name prefix or a
               * manifest.
               * @maxLength 1024
               * @pattern ^(https|s3)://([^/]+)/?(.*)$
               */
              S3Uri: string;
            };
          };
          /**
           * The method to use to split the transform job's data files into smaller batches.
           * @enum ["None","TFRecord","Line","RecordIO"]
           */
          SplitType?: "None" | "TFRecord" | "Line" | "RecordIO";
        };
        TransformOutput: {
          /**
           * The MIME type used to specify the output data. Amazon SageMaker uses the MIME type with each http
           * call to transfer data from the transform job.
           * @maxLength 256
           * @pattern .*
           */
          Accept?: string;
          /**
           * The AWS Key Management Service (AWS KMS) key that Amazon SageMaker uses to encrypt the model
           * artifacts at rest using Amazon S3 server-side encryption.
           * @maxLength 2048
           * @pattern .*
           */
          KmsKeyId?: string;
          /**
           * The Amazon S3 path where you want Amazon SageMaker to store the results of the transform job.
           * @maxLength 1024
           * @pattern ^(https|s3)://([^/]+)/?(.*)$
           */
          S3OutputPath: string;
          /**
           * Defines how to assemble the results of the transform job as a single S3 object.
           * @enum ["None","Line"]
           */
          AssembleWith?: "None" | "Line";
        };
        TransformResources: {
          /**
           * The number of ML compute instances to use in the transform job. For distributed transform jobs,
           * specify a value greater than 1. The default value is 1.
           * @minimum 1
           */
          InstanceCount: number;
          /** The ML compute instance type for the transform job. */
          InstanceType: string;
          /**
           * The AWS Key Management Service (AWS KMS) key that Amazon SageMaker uses to encrypt model data on
           * the storage volume attached to the ML compute instance(s) that run the batch transform job.
           * @maxLength 2048
           * @pattern .*
           */
          VolumeKmsKeyId?: string;
        };
      };
      /**
       * The name of the profile for the model package.
       * @minLength 1
       * @maxLength 63
       * @pattern ^[a-zA-Z0-9](-*[a-zA-Z0-9]){0,62}$
       */
      ProfileName: string;
    })[];
    /**
     * The IAM roles to be used for the validation of the model package.
     * @minLength 20
     * @maxLength 2048
     * @pattern ^arn:aws[a-z\-]*:iam::\d{12}:role/?[a-zA-Z_0-9+=,.@\-_/]+$
     */
    ValidationRole: string;
  };
  ModelPackageArn?: string;
  ApprovalDescription?: string;
  CreationTime?: string;
  LastModifiedTime?: string;
  ModelPackageStatus?: "Pending" | "Deleting" | "InProgress" | "Completed" | "Failed";
  ModelPackageVersion?: number;
  AdditionalInferenceSpecificationsToAdd?: ({
    /**
     * The Amazon ECR registry path of the Docker image that contains the inference code.
     * @minItems 1
     * @maxItems 15
     */
    Containers: ({
      /**
       * The DNS host name for the Docker container.
       * @maxLength 63
       * @pattern ^[a-zA-Z0-9](-*[a-zA-Z0-9]){0,62}
       */
      ContainerHostname?: string;
      Environment?: Record<string, string>;
      ModelInput?: {
        /**
         * The input configuration object for the model.
         * @minLength 1
         * @maxLength 1024
         * @pattern [\S\s]+
         */
        DataInputConfig: string;
      };
      /**
       * The Amazon EC2 Container Registry (Amazon ECR) path where inference code is stored.
       * @minLength 1
       * @maxLength 255
       * @pattern [\S]{1,255}
       */
      Image: string;
      /**
       * An MD5 hash of the training algorithm that identifies the Docker image used for training.
       * @maxLength 72
       * @pattern ^[Ss][Hh][Aa]256:[0-9a-fA-F]{64}$
       */
      ImageDigest?: string;
      /**
       * A structure with Model Input details.
       * @maxLength 1024
       * @pattern ^(https|s3)://([^/]+)/?(.*)$
       */
      ModelDataUrl?: string;
      ModelDataSource?: {
        S3DataSource?: {
          /**
           * Specifies the type of ML model data to deploy.
           * @enum ["S3Prefix","S3Object"]
           */
          S3DataType: "S3Prefix" | "S3Object";
          /**
           * Specifies the S3 path of ML model data to deploy.
           * @maxLength 1024
           * @pattern ^(https|s3)://([^/]+)/?(.*)$
           */
          S3Uri: string;
          /**
           * Specifies how the ML model data is prepared.
           * @enum ["None","Gzip"]
           */
          CompressionType: "None" | "Gzip";
          ModelAccessConfig?: {
            /** Specifies agreement to the model end-user license agreement (EULA). */
            AcceptEula: boolean;
          };
        };
      };
      /** The machine learning framework of the model package container image. */
      Framework?: string;
      /**
       * The framework version of the Model Package Container Image.
       * @minLength 3
       * @maxLength 10
       * @pattern [0-9]\.[A-Za-z0-9.]+
       */
      FrameworkVersion?: string;
      /**
       * The name of a pre-trained machine learning benchmarked by Amazon SageMaker Inference Recommender
       * model that matches your model.
       */
      NearestModelName?: string;
    })[];
    /**
     * A description of the additional Inference specification.
     * @maxLength 1024
     * @pattern .*
     */
    Description?: string;
    /**
     * A unique name to identify the additional inference specification. The name must be unique within
     * the list of your additional inference specifications for a particular model package.
     * @minLength 1
     * @maxLength 63
     * @pattern ^[a-zA-Z0-9](-*[a-zA-Z0-9]){0,62}$
     */
    Name: string;
    /** The supported MIME types for the input data. */
    SupportedContentTypes?: string[];
    /** A list of the instance types that are used to generate inferences in real-time */
    SupportedRealtimeInferenceInstanceTypes?: string[];
    /** The supported MIME types for the output data. */
    SupportedResponseMIMETypes?: string[];
    /**
     * A list of the instance types on which a transformation job can be run or on which an endpoint can
     * be deployed.
     * @minItems 1
     */
    SupportedTransformInstanceTypes?: string[];
  })[];
  ModelPackageStatusDetails?: {
    ValidationStatuses?: ({
      /** If the overall status is Failed, the reason for the failure. */
      FailureReason?: string;
      /**
       * The name of the model package for which the overall status is being reported.
       * @minLength 1
       * @maxLength 63
       * @pattern ^[a-zA-Z0-9](-*[a-zA-Z0-9]){0,62}$
       */
      Name: string;
      /**
       * The current status.
       * @enum ["NotStarted","Failed","InProgress","Completed"]
       */
      Status: "NotStarted" | "Failed" | "InProgress" | "Completed";
    })[];
  };
  SourceUri?: string;
  ModelCard?: {
    /**
     * The content of the model card.
     * @minLength 0
     * @maxLength 100000
     * @pattern .*
     */
    ModelCardContent: string;
    /**
     * The approval status of the model card within your organization.
     * @enum ["Draft","PendingReview","Approved","Archived"]
     */
    ModelCardStatus: "Draft" | "PendingReview" | "Approved" | "Archived";
  };
  SecurityConfig?: {
    /**
     * The AWS KMS Key ID (KMSKeyId) used for encryption of model package information.
     * @maxLength 2048
     * @pattern ^[a-zA-Z0-9:/_-]*$
     */
    KmsKeyId: string;
  };
};
