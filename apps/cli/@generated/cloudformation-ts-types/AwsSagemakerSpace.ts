// This file is auto-generated. Do not edit manually.
// Source: aws-sagemaker-space.json

/** Resource Type definition for AWS::SageMaker::Space */
export type AwsSagemakerSpace = {
  /**
   * The space Amazon Resource Name (ARN).
   * @maxLength 256
   * @pattern arn:aws[a-z\-]*:sagemaker:[a-z0-9\-]*:[0-9]{12}:space/.*
   */
  SpaceArn?: string;
  /**
   * The ID of the associated Domain.
   * @minLength 1
   * @maxLength 63
   */
  DomainId: string;
  /**
   * A name for the Space.
   * @minLength 1
   * @maxLength 63
   */
  SpaceName: string;
  /**
   * A collection of settings.
   * @minItems 0
   * @maxItems 50
   * @uniqueItems false
   */
  SpaceSettings?: {
    /** The Jupyter server's app settings. */
    JupyterServerAppSettings?: {
      DefaultResourceSpec?: {
        /**
         * The instance type that the image version runs on.
         * @enum ["system","ml.t3.micro","ml.t3.small","ml.t3.medium","ml.t3.large","ml.t3.xlarge","ml.t3.2xlarge","ml.m5.large","ml.m5.xlarge","ml.m5.2xlarge","ml.m5.4xlarge","ml.m5.8xlarge","ml.m5.12xlarge","ml.m5.16xlarge","ml.m5.24xlarge","ml.c5.large","ml.c5.xlarge","ml.c5.2xlarge","ml.c5.4xlarge","ml.c5.9xlarge","ml.c5.12xlarge","ml.c5.18xlarge","ml.c5.24xlarge","ml.p3.2xlarge","ml.p3.8xlarge","ml.p3.16xlarge","ml.g4dn.xlarge","ml.g4dn.2xlarge","ml.g4dn.4xlarge","ml.g4dn.8xlarge","ml.g4dn.12xlarge","ml.g4dn.16xlarge","ml.r5.large","ml.r5.xlarge","ml.r5.2xlarge","ml.r5.4xlarge","ml.r5.8xlarge","ml.r5.12xlarge","ml.r5.16xlarge","ml.r5.24xlarge","ml.p3dn.24xlarge","ml.m5d.large","ml.m5d.xlarge","ml.m5d.2xlarge","ml.m5d.4xlarge","ml.m5d.8xlarge","ml.m5d.12xlarge","ml.m5d.16xlarge","ml.m5d.24xlarge","ml.g5.xlarge","ml.g5.2xlarge","ml.g5.4xlarge","ml.g5.8xlarge","ml.g5.12xlarge","ml.g5.16xlarge","ml.g5.24xlarge","ml.g5.48xlarge","ml.p4d.24xlarge","ml.p4de.24xlarge","ml.geospatial.interactive","ml.trn1.2xlarge","ml.trn1.32xlarge","ml.trn1n.32xlarge"]
         */
        InstanceType?: "system" | "ml.t3.micro" | "ml.t3.small" | "ml.t3.medium" | "ml.t3.large" | "ml.t3.xlarge" | "ml.t3.2xlarge" | "ml.m5.large" | "ml.m5.xlarge" | "ml.m5.2xlarge" | "ml.m5.4xlarge" | "ml.m5.8xlarge" | "ml.m5.12xlarge" | "ml.m5.16xlarge" | "ml.m5.24xlarge" | "ml.c5.large" | "ml.c5.xlarge" | "ml.c5.2xlarge" | "ml.c5.4xlarge" | "ml.c5.9xlarge" | "ml.c5.12xlarge" | "ml.c5.18xlarge" | "ml.c5.24xlarge" | "ml.p3.2xlarge" | "ml.p3.8xlarge" | "ml.p3.16xlarge" | "ml.g4dn.xlarge" | "ml.g4dn.2xlarge" | "ml.g4dn.4xlarge" | "ml.g4dn.8xlarge" | "ml.g4dn.12xlarge" | "ml.g4dn.16xlarge" | "ml.r5.large" | "ml.r5.xlarge" | "ml.r5.2xlarge" | "ml.r5.4xlarge" | "ml.r5.8xlarge" | "ml.r5.12xlarge" | "ml.r5.16xlarge" | "ml.r5.24xlarge" | "ml.p3dn.24xlarge" | "ml.m5d.large" | "ml.m5d.xlarge" | "ml.m5d.2xlarge" | "ml.m5d.4xlarge" | "ml.m5d.8xlarge" | "ml.m5d.12xlarge" | "ml.m5d.16xlarge" | "ml.m5d.24xlarge" | "ml.g5.xlarge" | "ml.g5.2xlarge" | "ml.g5.4xlarge" | "ml.g5.8xlarge" | "ml.g5.12xlarge" | "ml.g5.16xlarge" | "ml.g5.24xlarge" | "ml.g5.48xlarge" | "ml.p4d.24xlarge" | "ml.p4de.24xlarge" | "ml.geospatial.interactive" | "ml.trn1.2xlarge" | "ml.trn1.32xlarge" | "ml.trn1n.32xlarge";
        /**
         * The ARN of the SageMaker image that the image version belongs to.
         * @maxLength 256
         * @pattern ^arn:aws(-[\w]+)*:sagemaker:.+:[0-9]{12}:image/[a-z0-9]([-.]?[a-z0-9])*$
         */
        SageMakerImageArn?: string;
        /**
         * The ARN of the image version created on the instance.
         * @maxLength 256
         * @pattern ^arn:aws(-[\w]+)*:sagemaker:.+:[0-9]{12}:image-version/[a-z0-9]([-.]?[a-z0-9])*/[0-9]+$
         */
        SageMakerImageVersionArn?: string;
        /**
         * The Amazon Resource Name (ARN) of the Lifecycle Configuration to attach to the Resource.
         * @maxLength 256
         * @pattern arn:aws[a-z\-]*:sagemaker:[a-z0-9\-]*:[0-9]{12}:studio-lifecycle-config/.*
         */
        LifecycleConfigArn?: string;
      };
      /**
       * A list of LifecycleConfigArns available for use with JupyterServer apps.
       * @minItems 0
       * @maxItems 30
       * @uniqueItems false
       */
      LifecycleConfigArns?: string[];
    };
    /** The kernel gateway app settings. */
    KernelGatewayAppSettings?: {
      /**
       * A list of custom SageMaker images that are configured to run as a KernelGateway app.
       * @minItems 0
       * @maxItems 30
       * @uniqueItems false
       */
      CustomImages?: {
        /**
         * The Name of the AppImageConfig.
         * @maxLength 63
         * @pattern ^[a-zA-Z0-9](-*[a-zA-Z0-9]){0,62}
         */
        AppImageConfigName: string;
        /**
         * The name of the CustomImage. Must be unique to your account.
         * @maxLength 63
         * @pattern ^[a-zA-Z0-9]([-.]?[a-zA-Z0-9]){0,62}$
         */
        ImageName: string;
        /**
         * The version number of the CustomImage.
         * @minimum 0
         */
        ImageVersionNumber?: number;
      }[];
      /**
       * The default instance type and the Amazon Resource Name (ARN) of the default SageMaker image used by
       * the KernelGateway app.
       */
      DefaultResourceSpec?: {
        /**
         * The instance type that the image version runs on.
         * @enum ["system","ml.t3.micro","ml.t3.small","ml.t3.medium","ml.t3.large","ml.t3.xlarge","ml.t3.2xlarge","ml.m5.large","ml.m5.xlarge","ml.m5.2xlarge","ml.m5.4xlarge","ml.m5.8xlarge","ml.m5.12xlarge","ml.m5.16xlarge","ml.m5.24xlarge","ml.c5.large","ml.c5.xlarge","ml.c5.2xlarge","ml.c5.4xlarge","ml.c5.9xlarge","ml.c5.12xlarge","ml.c5.18xlarge","ml.c5.24xlarge","ml.p3.2xlarge","ml.p3.8xlarge","ml.p3.16xlarge","ml.g4dn.xlarge","ml.g4dn.2xlarge","ml.g4dn.4xlarge","ml.g4dn.8xlarge","ml.g4dn.12xlarge","ml.g4dn.16xlarge","ml.r5.large","ml.r5.xlarge","ml.r5.2xlarge","ml.r5.4xlarge","ml.r5.8xlarge","ml.r5.12xlarge","ml.r5.16xlarge","ml.r5.24xlarge","ml.p3dn.24xlarge","ml.m5d.large","ml.m5d.xlarge","ml.m5d.2xlarge","ml.m5d.4xlarge","ml.m5d.8xlarge","ml.m5d.12xlarge","ml.m5d.16xlarge","ml.m5d.24xlarge","ml.g5.xlarge","ml.g5.2xlarge","ml.g5.4xlarge","ml.g5.8xlarge","ml.g5.12xlarge","ml.g5.16xlarge","ml.g5.24xlarge","ml.g5.48xlarge","ml.p4d.24xlarge","ml.p4de.24xlarge","ml.geospatial.interactive","ml.trn1.2xlarge","ml.trn1.32xlarge","ml.trn1n.32xlarge"]
         */
        InstanceType?: "system" | "ml.t3.micro" | "ml.t3.small" | "ml.t3.medium" | "ml.t3.large" | "ml.t3.xlarge" | "ml.t3.2xlarge" | "ml.m5.large" | "ml.m5.xlarge" | "ml.m5.2xlarge" | "ml.m5.4xlarge" | "ml.m5.8xlarge" | "ml.m5.12xlarge" | "ml.m5.16xlarge" | "ml.m5.24xlarge" | "ml.c5.large" | "ml.c5.xlarge" | "ml.c5.2xlarge" | "ml.c5.4xlarge" | "ml.c5.9xlarge" | "ml.c5.12xlarge" | "ml.c5.18xlarge" | "ml.c5.24xlarge" | "ml.p3.2xlarge" | "ml.p3.8xlarge" | "ml.p3.16xlarge" | "ml.g4dn.xlarge" | "ml.g4dn.2xlarge" | "ml.g4dn.4xlarge" | "ml.g4dn.8xlarge" | "ml.g4dn.12xlarge" | "ml.g4dn.16xlarge" | "ml.r5.large" | "ml.r5.xlarge" | "ml.r5.2xlarge" | "ml.r5.4xlarge" | "ml.r5.8xlarge" | "ml.r5.12xlarge" | "ml.r5.16xlarge" | "ml.r5.24xlarge" | "ml.p3dn.24xlarge" | "ml.m5d.large" | "ml.m5d.xlarge" | "ml.m5d.2xlarge" | "ml.m5d.4xlarge" | "ml.m5d.8xlarge" | "ml.m5d.12xlarge" | "ml.m5d.16xlarge" | "ml.m5d.24xlarge" | "ml.g5.xlarge" | "ml.g5.2xlarge" | "ml.g5.4xlarge" | "ml.g5.8xlarge" | "ml.g5.12xlarge" | "ml.g5.16xlarge" | "ml.g5.24xlarge" | "ml.g5.48xlarge" | "ml.p4d.24xlarge" | "ml.p4de.24xlarge" | "ml.geospatial.interactive" | "ml.trn1.2xlarge" | "ml.trn1.32xlarge" | "ml.trn1n.32xlarge";
        /**
         * The ARN of the SageMaker image that the image version belongs to.
         * @maxLength 256
         * @pattern ^arn:aws(-[\w]+)*:sagemaker:.+:[0-9]{12}:image/[a-z0-9]([-.]?[a-z0-9])*$
         */
        SageMakerImageArn?: string;
        /**
         * The ARN of the image version created on the instance.
         * @maxLength 256
         * @pattern ^arn:aws(-[\w]+)*:sagemaker:.+:[0-9]{12}:image-version/[a-z0-9]([-.]?[a-z0-9])*/[0-9]+$
         */
        SageMakerImageVersionArn?: string;
        /**
         * The Amazon Resource Name (ARN) of the Lifecycle Configuration to attach to the Resource.
         * @maxLength 256
         * @pattern arn:aws[a-z\-]*:sagemaker:[a-z0-9\-]*:[0-9]{12}:studio-lifecycle-config/.*
         */
        LifecycleConfigArn?: string;
      };
      /**
       * A list of LifecycleConfigArns available for use with KernelGateway apps.
       * @minItems 0
       * @maxItems 30
       * @uniqueItems false
       */
      LifecycleConfigArns?: string[];
    };
    /** The JupyterLab app settings. */
    JupyterLabAppSettings?: {
      DefaultResourceSpec?: {
        /**
         * The instance type that the image version runs on.
         * @enum ["system","ml.t3.micro","ml.t3.small","ml.t3.medium","ml.t3.large","ml.t3.xlarge","ml.t3.2xlarge","ml.m5.large","ml.m5.xlarge","ml.m5.2xlarge","ml.m5.4xlarge","ml.m5.8xlarge","ml.m5.12xlarge","ml.m5.16xlarge","ml.m5.24xlarge","ml.c5.large","ml.c5.xlarge","ml.c5.2xlarge","ml.c5.4xlarge","ml.c5.9xlarge","ml.c5.12xlarge","ml.c5.18xlarge","ml.c5.24xlarge","ml.p3.2xlarge","ml.p3.8xlarge","ml.p3.16xlarge","ml.g4dn.xlarge","ml.g4dn.2xlarge","ml.g4dn.4xlarge","ml.g4dn.8xlarge","ml.g4dn.12xlarge","ml.g4dn.16xlarge","ml.r5.large","ml.r5.xlarge","ml.r5.2xlarge","ml.r5.4xlarge","ml.r5.8xlarge","ml.r5.12xlarge","ml.r5.16xlarge","ml.r5.24xlarge","ml.p3dn.24xlarge","ml.m5d.large","ml.m5d.xlarge","ml.m5d.2xlarge","ml.m5d.4xlarge","ml.m5d.8xlarge","ml.m5d.12xlarge","ml.m5d.16xlarge","ml.m5d.24xlarge","ml.g5.xlarge","ml.g5.2xlarge","ml.g5.4xlarge","ml.g5.8xlarge","ml.g5.12xlarge","ml.g5.16xlarge","ml.g5.24xlarge","ml.g5.48xlarge","ml.p4d.24xlarge","ml.p4de.24xlarge","ml.geospatial.interactive","ml.trn1.2xlarge","ml.trn1.32xlarge","ml.trn1n.32xlarge"]
         */
        InstanceType?: "system" | "ml.t3.micro" | "ml.t3.small" | "ml.t3.medium" | "ml.t3.large" | "ml.t3.xlarge" | "ml.t3.2xlarge" | "ml.m5.large" | "ml.m5.xlarge" | "ml.m5.2xlarge" | "ml.m5.4xlarge" | "ml.m5.8xlarge" | "ml.m5.12xlarge" | "ml.m5.16xlarge" | "ml.m5.24xlarge" | "ml.c5.large" | "ml.c5.xlarge" | "ml.c5.2xlarge" | "ml.c5.4xlarge" | "ml.c5.9xlarge" | "ml.c5.12xlarge" | "ml.c5.18xlarge" | "ml.c5.24xlarge" | "ml.p3.2xlarge" | "ml.p3.8xlarge" | "ml.p3.16xlarge" | "ml.g4dn.xlarge" | "ml.g4dn.2xlarge" | "ml.g4dn.4xlarge" | "ml.g4dn.8xlarge" | "ml.g4dn.12xlarge" | "ml.g4dn.16xlarge" | "ml.r5.large" | "ml.r5.xlarge" | "ml.r5.2xlarge" | "ml.r5.4xlarge" | "ml.r5.8xlarge" | "ml.r5.12xlarge" | "ml.r5.16xlarge" | "ml.r5.24xlarge" | "ml.p3dn.24xlarge" | "ml.m5d.large" | "ml.m5d.xlarge" | "ml.m5d.2xlarge" | "ml.m5d.4xlarge" | "ml.m5d.8xlarge" | "ml.m5d.12xlarge" | "ml.m5d.16xlarge" | "ml.m5d.24xlarge" | "ml.g5.xlarge" | "ml.g5.2xlarge" | "ml.g5.4xlarge" | "ml.g5.8xlarge" | "ml.g5.12xlarge" | "ml.g5.16xlarge" | "ml.g5.24xlarge" | "ml.g5.48xlarge" | "ml.p4d.24xlarge" | "ml.p4de.24xlarge" | "ml.geospatial.interactive" | "ml.trn1.2xlarge" | "ml.trn1.32xlarge" | "ml.trn1n.32xlarge";
        /**
         * The ARN of the SageMaker image that the image version belongs to.
         * @maxLength 256
         * @pattern ^arn:aws(-[\w]+)*:sagemaker:.+:[0-9]{12}:image/[a-z0-9]([-.]?[a-z0-9])*$
         */
        SageMakerImageArn?: string;
        /**
         * The ARN of the image version created on the instance.
         * @maxLength 256
         * @pattern ^arn:aws(-[\w]+)*:sagemaker:.+:[0-9]{12}:image-version/[a-z0-9]([-.]?[a-z0-9])*/[0-9]+$
         */
        SageMakerImageVersionArn?: string;
        /**
         * The Amazon Resource Name (ARN) of the Lifecycle Configuration to attach to the Resource.
         * @maxLength 256
         * @pattern arn:aws[a-z\-]*:sagemaker:[a-z0-9\-]*:[0-9]{12}:studio-lifecycle-config/.*
         */
        LifecycleConfigArn?: string;
      };
      AppLifecycleManagement?: {
        IdleSettings?: {
          /**
           * The space idle timeout value set in minutes
           * @minimum 60
           * @maximum 525600
           */
          IdleTimeoutInMinutes?: number;
        };
      };
      /**
       * A list of CodeRepositories available for use with JupyterLab apps.
       * @minItems 0
       * @maxItems 30
       * @uniqueItems false
       */
      CodeRepositories?: {
        /**
         * A CodeRepository (valid URL) to be used within Jupyter's Git extension.
         * @maxLength 256
         * @pattern ^https://([.\-_a-zA-Z0-9]+/?){3,1016}$
         */
        RepositoryUrl: string;
      }[];
    };
    /** The CodeEditor app settings. */
    CodeEditorAppSettings?: {
      DefaultResourceSpec?: {
        /**
         * The instance type that the image version runs on.
         * @enum ["system","ml.t3.micro","ml.t3.small","ml.t3.medium","ml.t3.large","ml.t3.xlarge","ml.t3.2xlarge","ml.m5.large","ml.m5.xlarge","ml.m5.2xlarge","ml.m5.4xlarge","ml.m5.8xlarge","ml.m5.12xlarge","ml.m5.16xlarge","ml.m5.24xlarge","ml.c5.large","ml.c5.xlarge","ml.c5.2xlarge","ml.c5.4xlarge","ml.c5.9xlarge","ml.c5.12xlarge","ml.c5.18xlarge","ml.c5.24xlarge","ml.p3.2xlarge","ml.p3.8xlarge","ml.p3.16xlarge","ml.g4dn.xlarge","ml.g4dn.2xlarge","ml.g4dn.4xlarge","ml.g4dn.8xlarge","ml.g4dn.12xlarge","ml.g4dn.16xlarge","ml.r5.large","ml.r5.xlarge","ml.r5.2xlarge","ml.r5.4xlarge","ml.r5.8xlarge","ml.r5.12xlarge","ml.r5.16xlarge","ml.r5.24xlarge","ml.p3dn.24xlarge","ml.m5d.large","ml.m5d.xlarge","ml.m5d.2xlarge","ml.m5d.4xlarge","ml.m5d.8xlarge","ml.m5d.12xlarge","ml.m5d.16xlarge","ml.m5d.24xlarge","ml.g5.xlarge","ml.g5.2xlarge","ml.g5.4xlarge","ml.g5.8xlarge","ml.g5.12xlarge","ml.g5.16xlarge","ml.g5.24xlarge","ml.g5.48xlarge","ml.p4d.24xlarge","ml.p4de.24xlarge","ml.geospatial.interactive","ml.trn1.2xlarge","ml.trn1.32xlarge","ml.trn1n.32xlarge"]
         */
        InstanceType?: "system" | "ml.t3.micro" | "ml.t3.small" | "ml.t3.medium" | "ml.t3.large" | "ml.t3.xlarge" | "ml.t3.2xlarge" | "ml.m5.large" | "ml.m5.xlarge" | "ml.m5.2xlarge" | "ml.m5.4xlarge" | "ml.m5.8xlarge" | "ml.m5.12xlarge" | "ml.m5.16xlarge" | "ml.m5.24xlarge" | "ml.c5.large" | "ml.c5.xlarge" | "ml.c5.2xlarge" | "ml.c5.4xlarge" | "ml.c5.9xlarge" | "ml.c5.12xlarge" | "ml.c5.18xlarge" | "ml.c5.24xlarge" | "ml.p3.2xlarge" | "ml.p3.8xlarge" | "ml.p3.16xlarge" | "ml.g4dn.xlarge" | "ml.g4dn.2xlarge" | "ml.g4dn.4xlarge" | "ml.g4dn.8xlarge" | "ml.g4dn.12xlarge" | "ml.g4dn.16xlarge" | "ml.r5.large" | "ml.r5.xlarge" | "ml.r5.2xlarge" | "ml.r5.4xlarge" | "ml.r5.8xlarge" | "ml.r5.12xlarge" | "ml.r5.16xlarge" | "ml.r5.24xlarge" | "ml.p3dn.24xlarge" | "ml.m5d.large" | "ml.m5d.xlarge" | "ml.m5d.2xlarge" | "ml.m5d.4xlarge" | "ml.m5d.8xlarge" | "ml.m5d.12xlarge" | "ml.m5d.16xlarge" | "ml.m5d.24xlarge" | "ml.g5.xlarge" | "ml.g5.2xlarge" | "ml.g5.4xlarge" | "ml.g5.8xlarge" | "ml.g5.12xlarge" | "ml.g5.16xlarge" | "ml.g5.24xlarge" | "ml.g5.48xlarge" | "ml.p4d.24xlarge" | "ml.p4de.24xlarge" | "ml.geospatial.interactive" | "ml.trn1.2xlarge" | "ml.trn1.32xlarge" | "ml.trn1n.32xlarge";
        /**
         * The ARN of the SageMaker image that the image version belongs to.
         * @maxLength 256
         * @pattern ^arn:aws(-[\w]+)*:sagemaker:.+:[0-9]{12}:image/[a-z0-9]([-.]?[a-z0-9])*$
         */
        SageMakerImageArn?: string;
        /**
         * The ARN of the image version created on the instance.
         * @maxLength 256
         * @pattern ^arn:aws(-[\w]+)*:sagemaker:.+:[0-9]{12}:image-version/[a-z0-9]([-.]?[a-z0-9])*/[0-9]+$
         */
        SageMakerImageVersionArn?: string;
        /**
         * The Amazon Resource Name (ARN) of the Lifecycle Configuration to attach to the Resource.
         * @maxLength 256
         * @pattern arn:aws[a-z\-]*:sagemaker:[a-z0-9\-]*:[0-9]{12}:studio-lifecycle-config/.*
         */
        LifecycleConfigArn?: string;
      };
      AppLifecycleManagement?: {
        IdleSettings?: {
          /**
           * The space idle timeout value set in minutes
           * @minimum 60
           * @maximum 525600
           */
          IdleTimeoutInMinutes?: number;
        };
      };
    };
    /** Default storage settings for a space. */
    SpaceStorageSettings?: {
      EbsStorageSettings?: {
        /** Size of the Amazon EBS volume in Gb */
        EbsVolumeSizeInGb: number;
      };
    };
    /** This is a flag used to indicate if space managed resources needs to be created. */
    SpaceManagedResources?: "ENABLED" | "DISABLED";
    /** This is a flag used to indicate if remote access is enabled. */
    RemoteAccess?: "ENABLED" | "DISABLED";
    AppType?: "JupyterServer" | "KernelGateway" | "TensorBoard" | "RStudioServerPro" | "RSessionGateway" | "JupyterLab" | "CodeEditor";
    CustomFileSystems?: {
      EFSFileSystem?: {
        /**
         * @minLength 11
         * @maxLength 21
         * @pattern ^(fs-[0-9a-f]{8,})$
         */
        FileSystemId: string;
      };
      FSxLustreFileSystem?: {
        /**
         * @minLength 11
         * @maxLength 21
         * @pattern ^(fs-[0-9a-f]{8,})$
         */
        FileSystemId: string;
      };
      S3FileSystem?: {
        /**
         * @minLength 0
         * @maxLength 1024
         * @pattern (s3)://([^/]+)/?(.*)
         */
        S3Uri?: string;
      };
    }[];
  };
  /**
   * A list of tags to apply to the space.
   * @minItems 0
   * @maxItems 50
   * @uniqueItems false
   */
  Tags?: {
    /**
     * @minLength 1
     * @maxLength 128
     */
    Value: string;
    /**
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
  }[];
  OwnershipSettings?: {
    /**
     * @maxLength 63
     * @pattern ^[a-zA-Z0-9](-*[a-zA-Z0-9]){0,62}
     */
    OwnerUserProfileName: string;
  };
  SpaceSharingSettings?: {
    /** @enum ["Private","Shared"] */
    SharingType: "Private" | "Shared";
  };
  /**
   * @maxLength 64
   * @pattern ^(?!\s*$).+
   */
  SpaceDisplayName?: string;
  /** @maxLength 1024 */
  Url?: string;
};
