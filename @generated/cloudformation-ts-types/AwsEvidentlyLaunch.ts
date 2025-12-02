// This file is auto-generated. Do not edit manually.
// Source: aws-evidently-launch.json

/** Resource Type definition for AWS::Evidently::Launch. */
export type AwsEvidentlyLaunch = {
  /** @pattern arn:[^:]*:[^:]*:[^:]*:[^:]*:project/[-a-zA-Z0-9._]*/launch/[-a-zA-Z0-9._]* */
  Arn?: string;
  /**
   * @minLength 1
   * @maxLength 127
   * @pattern [-a-zA-Z0-9._]*
   */
  Name: string;
  /**
   * @minLength 0
   * @maxLength 2048
   * @pattern ([-a-zA-Z0-9._]*)|(arn:[^:]*:[^:]*:[^:]*:[^:]*:project/[-a-zA-Z0-9._]*)
   */
  Project: string;
  /**
   * @minLength 0
   * @maxLength 160
   */
  Description?: string;
  /**
   * @minLength 0
   * @maxLength 127
   * @pattern .*
   */
  RandomizationSalt?: string;
  /**
   * @minItems 1
   * @maxItems 6
   * @uniqueItems true
   */
  ScheduledSplitsConfig: {
    StartTime: string;
    /** @uniqueItems true */
    GroupWeights: {
      /**
       * @minLength 1
       * @maxLength 127
       * @pattern [-a-zA-Z0-9._]*
       */
      GroupName: string;
      SplitWeight: number;
    }[];
    /** @uniqueItems true */
    SegmentOverrides?: {
      /**
       * @minLength 1
       * @maxLength 2048
       * @pattern ([-a-zA-Z0-9._]*)|(arn:[^:]*:[^:]*:[^:]*:[^:]*:segment/[-a-zA-Z0-9._]*)
       */
      Segment: string;
      EvaluationOrder: number;
      /** @uniqueItems true */
      Weights: {
        /**
         * @minLength 1
         * @maxLength 127
         * @pattern [-a-zA-Z0-9._]*
         */
        GroupName: string;
        SplitWeight: number;
      }[];
    }[];
  }[];
  /**
   * @minItems 1
   * @maxItems 5
   * @uniqueItems true
   */
  Groups: {
    /**
     * @minLength 1
     * @maxLength 127
     * @pattern [-a-zA-Z0-9._]*
     */
    GroupName: string;
    /**
     * @minLength 0
     * @maxLength 160
     */
    Description?: string;
    Feature: string;
    Variation: string;
  }[];
  /**
   * @minItems 0
   * @maxItems 3
   * @uniqueItems true
   */
  MetricMonitors?: {
    /**
     * @minLength 1
     * @maxLength 255
     * @pattern ^[\S]+$
     */
    MetricName: string;
    /** The JSON path to reference the entity id in the event. */
    EntityIdKey: string;
    /** The JSON path to reference the numerical metric value in the event. */
    ValueKey: string;
    /**
     * Event patterns have the same structure as the events they match. Rules use event patterns to select
     * events. An event pattern either matches an event or it doesn't.
     */
    EventPattern?: string;
    /**
     * @minLength 1
     * @maxLength 256
     * @pattern .*
     */
    UnitLabel?: string;
  }[];
  /**
   * An array of key-value pairs to apply to this resource.
   * @uniqueItems true
   */
  Tags?: {
    /**
     * The key name of the tag. You can specify a value that is 1 to 128 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 1
     * @maxLength 128
     * @pattern ^(?!aws:)[a-zA-Z+-=._:/]+$
     */
    Key: string;
    /**
     * The value for the tag. You can specify a value that is 0 to 256 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
  /** Start or Stop Launch Launch. Default is not started. */
  ExecutionStatus?: {
    /** Provide START or STOP action to apply on a launch */
    Status: string;
    /** Provide CANCELLED or COMPLETED as the launch desired state. Defaults to Completed if not provided. */
    DesiredState?: string;
    /** Provide a reason for stopping the launch. Defaults to empty if not provided. */
    Reason?: string;
  };
};
