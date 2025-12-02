// This file is auto-generated. Do not edit manually.
// Source: aws-emrserverless-application.json

/** Resource schema for AWS::EMRServerless::Application Type */
export type AwsEmrserverlessApplication = {
  Architecture?: "ARM64" | "X86_64";
  /**
   * User friendly Application name.
   * @minLength 1
   * @maxLength 64
   * @pattern ^[A-Za-z0-9._\/#-]+$
   */
  Name?: string;
  /**
   * EMR release label.
   * @minLength 1
   * @maxLength 64
   * @pattern ^[A-Za-z0-9._/-]+$
   */
  ReleaseLabel: string;
  /** The type of the application */
  Type: string;
  /** Initial capacity initialized when an Application is started. */
  InitialCapacity?: {
    /**
     * Worker type for an analytics framework.
     * @minLength 1
     * @maxLength 50
     * @pattern ^[a-zA-Z]+[-_]*[a-zA-Z]+$
     */
    Key: string;
    Value: {
      /**
       * Initial count of workers to be initialized when an Application is started. This count will be
       * continued to be maintained until the Application is stopped
       * @minimum 1
       * @maximum 1000000
       */
      WorkerCount: number;
      WorkerConfiguration: {
        /** Per worker CPU resource. vCPU is the only supported unit and specifying vCPU is optional. */
        Cpu: string;
        /** Per worker memory resource. GB is the only supported unit and specifying GB is optional. */
        Memory: string;
        /** Per worker Disk resource. GB is the only supported unit and specifying GB is optional */
        Disk?: string;
        /**
         * Per worker DiskType resource. Shuffle optimized and Standard are only supported types and
         * specifying diskType is optional
         */
        DiskType?: string;
      };
    };
  }[];
  /**
   * Maximum allowed cumulative resources for an Application. No new resources will be created once the
   * limit is hit.
   */
  MaximumCapacity?: {
    /** Per worker CPU resource. vCPU is the only supported unit and specifying vCPU is optional. */
    Cpu: string;
    /** Per worker memory resource. GB is the only supported unit and specifying GB is optional. */
    Memory: string;
    /** Per worker Disk resource. GB is the only supported unit and specifying GB is optional */
    Disk?: string;
  };
  /**
   * Tag map with key and value
   * @uniqueItems true
   */
  Tags?: {
    /**
     * The value for the tag. You can specify a value that is 1 to 128 Unicode characters in length. You
     * can use any of the following characters: the set of Unicode letters, digits, whitespace, _, ., /,
     * =, +, and -.
     * @minLength 1
     * @maxLength 128
     * @pattern ^[A-Za-z0-9 /_.:=+@-]+$
     */
    Key: string;
    /**
     * The value for the tag. You can specify a value that is 0 to 256 Unicode characters in length. You
     * can use any of the following characters: the set of Unicode letters, digits, whitespace, _, ., /,
     * =, +, and -.
     * @minLength 0
     * @maxLength 256
     * @pattern ^[A-Za-z0-9 /_.:=+@-]*$
     */
    Value: string;
  }[];
  /** Configuration for Auto Start of Application. */
  AutoStartConfiguration?: {
    /**
     * If set to true, the Application will automatically start. Defaults to true.
     * @default true
     */
    Enabled?: boolean;
  };
  /** Configuration for Auto Stop of Application. */
  AutoStopConfiguration?: {
    /**
     * If set to true, the Application will automatically stop after being idle. Defaults to true.
     * @default true
     */
    Enabled?: boolean;
    /**
     * The amount of time [in minutes] to wait before auto stopping the Application when idle. Defaults to
     * 15 minutes.
     */
    IdleTimeoutMinutes?: number;
  };
  ImageConfiguration?: {
    /**
     * The URI of an image in the Amazon ECR registry. This field is required when you create a new
     * application. If you leave this field blank in an update, Amazon EMR will remove the image
     * configuration.
     * @minLength 1
     * @maxLength 1024
     * @pattern ^([a-z0-9]+[a-z0-9-.]*)\/((?:[a-z0-9]+(?:[._-][a-z0-9]+)*\/)*[a-z0-9]+(?:[._-][a-z0-9]+)*)(?:\:([a-zA-Z0-9_][a-zA-Z0-9-._]{0,299})|@(sha256:[0-9a-f]{64}))$
     */
    ImageUri?: string;
  };
  MonitoringConfiguration?: {
    /** S3 monitoring configurations for a JobRun. */
    S3MonitoringConfiguration?: unknown;
    /** Managed log persistence configurations for a JobRun. */
    ManagedPersistenceMonitoringConfiguration?: unknown;
    /** CloudWatch logging configurations for a JobRun. */
    CloudWatchLoggingConfiguration?: unknown;
    /** Prometheus monitoring configurations for a JobRun. */
    PrometheusMonitoringConfiguration?: unknown;
  };
  RuntimeConfiguration?: {
    /** String with a maximum length of 1024. */
    Classification: string;
    Properties?: Record<string, string>;
    /** @uniqueItems true */
    Configurations?: unknown[];
  }[];
  InteractiveConfiguration?: {
    /**
     * Enables an Apache Livy endpoint that you can connect to and run interactive jobs
     * @default false
     */
    LivyEndpointEnabled?: boolean;
    /**
     * Enabled you to connect an Application to Amazon EMR Studio to run interactive workloads in a
     * notebook
     * @default false
     */
    StudioEnabled?: boolean;
  };
  /** Network Configuration for customer VPC connectivity. */
  NetworkConfiguration?: {
    /**
     * The ID of the subnets in the VPC to which you want to connect your job or application.
     * @minItems 1
     * @maxItems 16
     * @uniqueItems true
     */
    SubnetIds?: string[];
    /**
     * The ID of the security groups in the VPC to which you want to connect your job or application.
     * @minItems 1
     * @maxItems 5
     * @uniqueItems true
     */
    SecurityGroupIds?: string[];
  };
  /**
   * The Amazon Resource Name (ARN) of the EMR Serverless Application.
   * @pattern ^arn:(aws[a-zA-Z0-9-]*):emr-serverless:.+:(\d{12}):\/applications\/[0-9a-zA-Z]+$
   */
  Arn?: string;
  /**
   * The ID of the EMR Serverless Application.
   * @minLength 1
   * @maxLength 64
   */
  ApplicationId?: string;
  /**
   * The key-value pairs that specify worker type to WorkerTypeSpecificationInput. This parameter must
   * contain all valid worker types for a Spark or Hive application. Valid worker types include Driver
   * and Executor for Spark applications and HiveDriver and TezTask for Hive applications. You can
   * either set image details in this parameter for each worker type, or in imageConfiguration for all
   * worker types.
   */
  WorkerTypeSpecifications?: Record<string, {
    ImageConfiguration?: {
      /**
       * The URI of an image in the Amazon ECR registry. This field is required when you create a new
       * application. If you leave this field blank in an update, Amazon EMR will remove the image
       * configuration.
       * @minLength 1
       * @maxLength 1024
       * @pattern ^([a-z0-9]+[a-z0-9-.]*)\/((?:[a-z0-9]+(?:[._-][a-z0-9]+)*\/)*[a-z0-9]+(?:[._-][a-z0-9]+)*)(?:\:([a-zA-Z0-9_][a-zA-Z0-9-._]{0,299})|@(sha256:[0-9a-f]{64}))$
       */
      ImageUri?: string;
    };
  }>;
  /**
   * The scheduler configuration for batch and streaming jobs running on this application. Supported
   * with release labels emr-7.0.0 and above.
   */
  SchedulerConfiguration?: {
    /**
     * The maximum duration in minutes for the job in QUEUED state. If scheduler configuration is enabled
     * on your application, the default value is 360 minutes (6 hours). The valid range is from 15 to 720.
     */
    QueueTimeoutMinutes?: number;
    /**
     * The maximum concurrent job runs on this application. If scheduler configuration is enabled on your
     * application, the default value is 15. The valid range is 1 to 1000.
     */
    MaxConcurrentRuns?: number;
  };
  /**
   * The IAM IdentityCenter configuration for trusted-identity-propagation on this application.
   * Supported with release labels emr-7.8.0 and above.
   */
  IdentityCenterConfiguration?: {
    /**
     * The IAM IdentityCenter instance arn
     * @minLength 1
     * @maxLength 1024
     * @pattern ^arn:(aws[a-zA-Z0-9-]*):sso:::instance/(sso)?ins-[a-zA-Z0-9-.]{16}$
     */
    IdentityCenterInstanceArn?: string;
  };
};
