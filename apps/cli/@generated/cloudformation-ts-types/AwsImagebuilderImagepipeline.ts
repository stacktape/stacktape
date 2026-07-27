// This file is auto-generated. Do not edit manually.
// Source: aws-imagebuilder-imagepipeline.json

/** Resource schema for AWS::ImageBuilder::ImagePipeline */
export type AwsImagebuilderImagepipeline = {
  /** The Amazon Resource Name (ARN) of the image pipeline. */
  Arn?: string;
  /** The name of the image pipeline. */
  Name?: string;
  /** The description of the image pipeline. */
  Description?: string;
  /** The image tests configuration of the image pipeline. */
  ImageTestsConfiguration?: {
    /** Defines if tests should be executed when building this image. */
    ImageTestsEnabled?: boolean;
    /**
     * The maximum time in minutes that tests are permitted to run.
     * @minimum 60
     * @maximum 1440
     */
    TimeoutMinutes?: number;
  };
  /**
   * The status of the image pipeline.
   * @enum ["DISABLED","ENABLED"]
   */
  Status?: "DISABLED" | "ENABLED";
  /** The schedule of the image pipeline. */
  Schedule?: {
    /**
     * The expression determines how often EC2 Image Builder evaluates your
     * pipelineExecutionStartCondition.
     */
    ScheduleExpression?: string;
    /**
     * The condition configures when the pipeline should trigger a new image build.
     * @enum ["EXPRESSION_MATCH_ONLY","EXPRESSION_MATCH_AND_DEPENDENCY_UPDATES_AVAILABLE"]
     */
    PipelineExecutionStartCondition?: "EXPRESSION_MATCH_ONLY" | "EXPRESSION_MATCH_AND_DEPENDENCY_UPDATES_AVAILABLE";
    /** The auto-disable policy for the image pipeline. */
    AutoDisablePolicy?: {
      /**
       * The number of consecutive failures after which the pipeline should be automatically disabled.
       * @minimum 1
       */
      FailureCount: number;
    };
  };
  /**
   * The Amazon Resource Name (ARN) of the image recipe that defines how images are configured, tested,
   * and assessed.
   */
  ImageRecipeArn?: string;
  /**
   * The Amazon Resource Name (ARN) of the container recipe that defines how images are configured and
   * tested.
   */
  ContainerRecipeArn?: string;
  /**
   * The Amazon Resource Name (ARN) of the distribution configuration associated with this image
   * pipeline.
   */
  DistributionConfigurationArn?: string;
  /**
   * The Amazon Resource Name (ARN) of the infrastructure configuration associated with this image
   * pipeline.
   */
  InfrastructureConfigurationArn?: string;
  /** Workflows to define the image build process */
  Workflows?: ({
    /** The Amazon Resource Name (ARN) of the workflow */
    WorkflowArn?: string;
    /** The parameters associated with the workflow */
    Parameters?: {
      Name?: string;
      Value?: string[];
    }[];
    /** The parallel group name */
    ParallelGroup?: string;
    /**
     * Define execution decision in case of workflow failure
     * @enum ["CONTINUE","ABORT"]
     */
    OnFailure?: "CONTINUE" | "ABORT";
  })[];
  /**
   * Collects additional information about the image being created, including the operating system (OS)
   * version and package list.
   */
  EnhancedImageMetadataEnabled?: boolean;
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
       * container images. The name includes the path for the repository location. If you don't provide this
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
  /** The execution role name/ARN for the image build, if provided */
  ExecutionRole?: string;
  /** The logging configuration settings for the image pipeline. */
  LoggingConfiguration?: {
    /** The name of the log group for image build logs. */
    ImageLogGroupName?: string;
    /** The name of the log group for pipeline execution logs. */
    PipelineLogGroupName?: string;
  };
  /** The tags of this image pipeline. */
  Tags?: Record<string, string>;
  /** The deployment ID of the pipeline, used for resource create/update triggers. */
  DeploymentId?: string;
};
