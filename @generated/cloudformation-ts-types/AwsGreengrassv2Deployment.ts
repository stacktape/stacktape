// This file is auto-generated. Do not edit manually.
// Source: aws-greengrassv2-deployment.json

/** Resource for Greengrass V2 deployment. */
export type AwsGreengrassv2Deployment = {
  /** @pattern arn:[^:]*:iot:[^:]*:[0-9]+:(thing|thinggroup)/.+ */
  TargetArn: string;
  /** @pattern arn:[^:]*:iot:[^:]*:[0-9]+:thinggroup/.+ */
  ParentTargetArn?: string;
  /** @pattern .+ */
  DeploymentId?: string;
  /**
   * @minLength 1
   * @maxLength 256
   */
  DeploymentName?: string;
  Components?: Record<string, {
    /**
     * @minLength 1
     * @maxLength 64
     */
    ComponentVersion?: string;
    ConfigurationUpdate?: {
      /**
       * @minLength 1
       * @maxLength 10485760
       */
      Merge?: string;
      Reset?: string[];
    };
    RunWith?: {
      /** @minLength 1 */
      PosixUser?: string;
      SystemResourceLimits?: {
        /**
         * @minimum 0
         * @maximum 9223372036854772000
         */
        Memory?: number;
        /** @minimum 0 */
        Cpus?: number;
      };
      /** @minLength 1 */
      WindowsUser?: string;
    };
  }>;
  IotJobConfiguration?: {
    JobExecutionsRolloutConfig?: {
      ExponentialRate?: {
        /**
         * @minimum 1
         * @maximum 1000
         */
        BaseRatePerMinute: number;
        /**
         * @minimum 1
         * @maximum 5
         */
        IncrementFactor: number;
        RateIncreaseCriteria: {
          NumberOfNotifiedThings?: number;
        } | {
          NumberOfSucceededThings?: number;
        };
      };
      /**
       * @minimum 1
       * @maximum 1000
       */
      MaximumPerMinute?: number;
    };
    AbortConfig?: {
      /** @minItems 1 */
      CriteriaList: ({
        /** @enum ["FAILED","REJECTED","TIMED_OUT","ALL"] */
        FailureType: "FAILED" | "REJECTED" | "TIMED_OUT" | "ALL";
        /** @enum ["CANCEL"] */
        Action: "CANCEL";
        /**
         * @minimum 0
         * @maximum 100
         */
        ThresholdPercentage: number;
        /**
         * @minimum 1
         * @maximum 2147483647
         */
        MinNumberOfExecutedThings: number;
      })[];
    };
    TimeoutConfig?: {
      /**
       * @minimum 0
       * @maximum 2147483647
       */
      InProgressTimeoutInMinutes?: number;
    };
  };
  DeploymentPolicies?: {
    /** @enum ["ROLLBACK","DO_NOTHING"] */
    FailureHandlingPolicy?: "ROLLBACK" | "DO_NOTHING";
    ComponentUpdatePolicy?: {
      /**
       * @minimum 1
       * @maximum 2147483647
       */
      TimeoutInSeconds?: number;
      /** @enum ["NOTIFY_COMPONENTS","SKIP_NOTIFY_COMPONENTS"] */
      Action?: "NOTIFY_COMPONENTS" | "SKIP_NOTIFY_COMPONENTS";
    };
    ConfigurationValidationPolicy?: {
      /**
       * @minimum 1
       * @maximum 2147483647
       */
      TimeoutInSeconds?: number;
    };
  };
  Tags?: Record<string, string>;
};
