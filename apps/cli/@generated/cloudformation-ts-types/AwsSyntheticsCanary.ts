// This file is auto-generated. Do not edit manually.
// Source: aws-synthetics-canary.json

/** Resource Type definition for AWS::Synthetics::Canary */
export type AwsSyntheticsCanary = {
  /**
   * Name of the canary.
   * @pattern ^[0-9a-z_\-]{1,255}$
   */
  Name: string;
  /** Id of the canary */
  Id?: string;
  /** State of the canary */
  State?: string;
  /** Provide the canary script source */
  Code: unknown | unknown | unknown | unknown;
  /**
   * Provide the s3 bucket output location for test results
   * @pattern ^(s3|S3)://
   */
  ArtifactS3Location: string;
  /** Provide artifact configuration */
  ArtifactConfig?: {
    /** Encryption configuration for uploading artifacts to S3 */
    S3Encryption?: {
      /** Encryption mode for encrypting artifacts when uploading to S3. Valid values: SSE_S3 and SSE_KMS. */
      EncryptionMode?: string;
      /**
       * KMS key Arn for encrypting artifacts when uploading to S3. You must specify KMS key Arn for SSE_KMS
       * encryption mode only.
       */
      KmsKeyArn?: string;
    };
  };
  /** Frequency to run your canaries */
  Schedule: {
    Expression: string;
    DurationInSeconds?: string;
    /** Provide canary auto retry configuration */
    RetryConfig?: {
      /** maximum times the canary will be retried upon the scheduled run failure */
      MaxRetries: number;
    };
  };
  /** Lambda Execution role used to run your canaries */
  ExecutionRoleArn: string;
  /** Runtime version of Synthetics Library */
  RuntimeVersion: string;
  /** Retention period of successful canary runs represented in number of days */
  SuccessRetentionPeriod?: number;
  /** Retention period of failed canary runs represented in number of days */
  FailureRetentionPeriod?: number;
  /** @uniqueItems false */
  Tags?: {
    /**
     * The key name of the tag. You can specify a value that is 1 to 127 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * The value for the tag. You can specify a value that is 1 to 255 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
  /** Provide VPC Configuration if enabled. */
  VPCConfig?: {
    VpcId?: string;
    SubnetIds: string[];
    SecurityGroupIds: string[];
    /** Allow outbound IPv6 traffic on VPC canaries that are connected to dual-stack subnets if set to true */
    Ipv6AllowedForDualStack?: boolean;
  };
  /** Provide canary run configuration */
  RunConfig?: {
    /** Provide maximum canary timeout per run in seconds */
    TimeoutInSeconds?: number;
    /** Provide maximum memory available for canary in MB */
    MemoryInMB?: number;
    /** Provide ephemeralStorage available for canary in MB */
    EphemeralStorage?: number;
    /** Enable active tracing if set to true */
    ActiveTracing?: boolean;
    /** Environment variable key-value pairs. */
    EnvironmentVariables?: Record<string, string>;
  };
  /** Runs canary if set to True. Default is False */
  StartCanaryAfterCreation?: boolean;
  /** Visual reference configuration for visual testing */
  VisualReference?: {
    /** Canary run id to be used as base reference for visual testing */
    BaseCanaryRunId: string;
    /** List of screenshots used as base reference for visual testing */
    BaseScreenshots?: {
      /** Name of the screenshot to be used as base reference for visual testing */
      ScreenshotName: string;
      /** List of coordinates of rectangles to be ignored during visual testing */
      IgnoreCoordinates?: string[];
    }[];
    BrowserType?: "CHROME" | "FIREFOX";
  };
  /** Deletes associated lambda resources created by Synthetics if set to True. Default is False */
  DeleteLambdaResourcesOnCanaryDeletion?: boolean;
  /**
   * List of resources which canary tags should be replicated to.
   * @uniqueItems true
   */
  ResourcesToReplicateTags?: "lambda-function"[];
  /**
   * Setting to control if provisioned resources created by Synthetics are deleted alongside the canary.
   * Default is AUTOMATIC.
   * @enum ["AUTOMATIC","OFF"]
   */
  ProvisionedResourceCleanup?: "AUTOMATIC" | "OFF";
  /**
   * Setting to control if UpdateCanary will perform a DryRun and validate it is PASSING before
   * performing the Update. Default is FALSE.
   */
  DryRunAndUpdate?: boolean;
  /**
   * List of browser configurations for the canary
   * @minItems 1
   * @maxItems 2
   */
  BrowserConfigs?: ({
    BrowserType: "CHROME" | "FIREFOX";
  })[];
  /**
   * List of visual references for the canary
   * @minItems 1
   * @maxItems 2
   */
  VisualReferences?: ({
    /** Canary run id to be used as base reference for visual testing */
    BaseCanaryRunId: string;
    /** List of screenshots used as base reference for visual testing */
    BaseScreenshots?: {
      /** Name of the screenshot to be used as base reference for visual testing */
      ScreenshotName: string;
      /** List of coordinates of rectangles to be ignored during visual testing */
      IgnoreCoordinates?: string[];
    }[];
    BrowserType?: "CHROME" | "FIREFOX";
  })[];
};
