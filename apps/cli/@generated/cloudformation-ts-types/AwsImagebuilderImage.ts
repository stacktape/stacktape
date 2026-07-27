// This file is auto-generated. Do not edit manually.
// Source: aws-imagebuilder-image.json

/** Resource schema for AWS::ImageBuilder::Image */
export type AwsImagebuilderImage = {
  /** Contains settings for vulnerability scans. */
  ImageScanningConfiguration?: {
    /** Contains ECR settings for vulnerability scans. */
    EcrConfiguration?: {
      /**
       * Tags for Image Builder to apply the output container image that is scanned. Tags can help you
       * identify and manage your scanned images.
       */
      ContainerTags?: string[];
      /**
       * The name of the container repository that Amazon Inspector scans to identify findings for your
       * container images. The name includes the path for the repository location. If you don’t provide this
       * information, Image Builder creates a repository in your account named
       * image-builder-image-scanning-repository to use for vulnerability scans for your output container
       * images.
       */
      RepositoryName?: string;
    };
    /**
     * This sets whether Image Builder keeps a snapshot of the vulnerability scans that Amazon Inspector
     * runs against the build instance when you create a new image.
     */
    ImageScanningEnabled?: boolean;
  };
  /**
   * The Amazon Resource Name (ARN) of the container recipe that defines how images are configured and
   * tested.
   */
  ContainerRecipeArn?: string;
  /** Workflows to define the image build process */
  Workflows?: ({
    /** The parallel group name */
    ParallelGroup?: string;
    /** The parameters associated with the workflow */
    Parameters?: {
      Value?: string[];
      Name?: string;
    }[];
    /** The Amazon Resource Name (ARN) of the workflow */
    WorkflowArn?: string;
    /**
     * Define execution decision in case of workflow failure
     * @enum ["CONTINUE","ABORT"]
     */
    OnFailure?: "CONTINUE" | "ABORT";
  })[];
  /** The image pipeline execution settings of the image. */
  ImagePipelineExecutionSettings?: {
    /** The deployment ID of the pipeline, used to trigger new image pipeline executions. */
    DeploymentId?: string;
    /** Whether to trigger the image pipeline when the pipeline is updated. False by default. */
    OnUpdate?: boolean;
  };
  /**
   * The deletion settings of the image, indicating whether to delete the underlying resources in
   * addition to the image.
   */
  DeletionSettings?: {
    /** The execution role to use for deleting the image, as well as underlying resources. */
    ExecutionRole: string;
  };
  /** URI for containers created in current Region with default ECR image tag */
  ImageUri?: string;
  /** The name of the image. */
  Name?: string;
  /** The Amazon Resource Name (ARN) of the infrastructure configuration. */
  InfrastructureConfigurationArn?: string;
  /**
   * The Amazon Resource Name (ARN) of the image recipe that defines how images are configured, tested,
   * and assessed.
   */
  ImageRecipeArn?: string;
  /** The Amazon Resource Name (ARN) of the distribution configuration. */
  DistributionConfigurationArn?: string;
  /** The latest version references of the image. */
  LatestVersion?: {
    /** The latest version ARN of the created image, with the same major version. */
    Major?: string;
    /** The latest version ARN of the created image, with the same minor version. */
    Minor?: string;
    /** The latest version ARN of the created image. */
    Arn?: string;
    /** The latest version ARN of the created image, with the same patch version. */
    Patch?: string;
  };
  /** The logging configuration settings for the image. */
  LoggingConfiguration?: {
    /** The name of the log group for image build logs. */
    LogGroupName?: string;
  };
  /** The AMI ID of the EC2 AMI in current region. */
  ImageId?: string;
  /** The image tests configuration used when creating this image. */
  ImageTestsConfiguration?: {
    /**
     * TimeoutMinutes
     * @minimum 60
     * @maximum 1440
     */
    TimeoutMinutes?: number;
    /** ImageTestsEnabled */
    ImageTestsEnabled?: boolean;
  };
  /** The Amazon Resource Name (ARN) of the image. */
  Arn?: string;
  /**
   * Collects additional information about the image being created, including the operating system (OS)
   * version and package list.
   */
  EnhancedImageMetadataEnabled?: boolean;
  /** The execution role name/ARN for the image build, if provided */
  ExecutionRole?: string;
  /** The tags associated with the image. */
  Tags?: Record<string, string>;
};
