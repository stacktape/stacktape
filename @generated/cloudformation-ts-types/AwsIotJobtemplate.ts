// This file is auto-generated. Do not edit manually.
// Source: aws-iot-jobtemplate.json

/**
 * Resource Type definition for AWS::IoT::JobTemplate. Job templates enable you to preconfigure jobs
 * so that you can deploy them to multiple sets of target devices.
 */
export type AwsIotJobtemplate = {
  Arn?: string;
  /** Optional for copying a JobTemplate from a pre-existing Job configuration. */
  JobArn?: string;
  /**
   * @minLength 1
   * @maxLength 64
   * @pattern [a-zA-Z0-9_-]+
   */
  JobTemplateId: string;
  /**
   * A description of the Job Template.
   * @maxLength 2028
   * @pattern [^\p{C}]+
   */
  Description: string;
  /**
   * The job document. Required if you don't specify a value for documentSource.
   * @maxLength 32768
   */
  Document?: string;
  /**
   * An S3 link to the job document to use in the template. Required if you don't specify a value for
   * document.
   * @minLength 1
   * @maxLength 1350
   */
  DocumentSource?: string;
  /** Specifies the amount of time each device has to finish its execution of the job. */
  TimeoutConfig?: {
    InProgressTimeoutInMinutes: number;
  };
  /** Allows you to create a staged rollout of a job. */
  JobExecutionsRolloutConfig?: {
    /**
     * The rate of increase for a job rollout. This parameter allows you to define an exponential rate for
     * a job rollout.
     */
    ExponentialRolloutRate?: {
      /**
       * The minimum number of things that will be notified of a pending job, per minute at the start of job
       * rollout. This parameter allows you to define the initial rate of rollout.
       */
      BaseRatePerMinute: number;
      /** The exponential factor to increase the rate of rollout for a job. */
      IncrementFactor: number;
      /** The criteria to initiate the increase in rate of rollout for a job. */
      RateIncreaseCriteria: {
        NumberOfNotifiedThings?: number;
        NumberOfSucceededThings?: number;
      };
    };
    /**
     * The maximum number of things that will be notified of a pending job, per minute. This parameter
     * allows you to create a staged rollout.
     */
    MaximumPerMinute?: number;
  };
  /** The criteria that determine when and how a job abort takes place. */
  AbortConfig?: {
    /** @minItems 1 */
    CriteriaList: ({
      /** The type of job action to take to initiate the job abort. */
      Action: "CANCEL";
      /** The type of job execution failures that can initiate a job abort. */
      FailureType: "FAILED" | "REJECTED" | "TIMED_OUT" | "ALL";
      /**
       * The minimum number of things which must receive job execution notifications before the job can be
       * aborted.
       */
      MinNumberOfExecutedThings: number;
      /** The minimum percentage of job execution failures that must occur to initiate the job abort. */
      ThresholdPercentage: number;
    })[];
  };
  /** Configuration for pre-signed S3 URLs. */
  PresignedUrlConfig?: {
    RoleArn: string;
    ExpiresInSec?: number;
  };
  JobExecutionsRetryConfig?: {
    /**
     * @minItems 1
     * @maxItems 2
     */
    RetryCriteriaList?: ({
      /**
       * @minimum 0
       * @maximum 10
       */
      NumberOfRetries?: number;
      FailureType?: "FAILED" | "TIMED_OUT" | "ALL";
    })[];
  };
  MaintenanceWindows?: {
    /**
     * @minLength 1
     * @maxLength 256
     */
    StartTime?: string;
    /**
     * @minimum 1
     * @maximum 1430
     */
    DurationInMinutes?: number;
  }[];
  DestinationPackageVersions?: string[];
  /**
   * Metadata that can be used to manage the JobTemplate.
   * @maxItems 50
   * @uniqueItems true
   */
  Tags?: {
    /**
     * The tag's key.
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * The tag's value.
     * @minLength 1
     * @maxLength 256
     */
    Value: string;
  }[];
};
