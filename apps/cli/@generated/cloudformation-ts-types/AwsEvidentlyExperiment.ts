// This file is auto-generated. Do not edit manually.
// Source: aws-evidently-experiment.json

/** Resource Type definition for AWS::Evidently::Experiment. */
export type AwsEvidentlyExperiment = {
  /** @pattern arn:[^:]*:[^:]*:[^:]*:[^:]*:project/[-a-zA-Z0-9._]*/experiment/[-a-zA-Z0-9._]* */
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
  /** Start Experiment. Default is False */
  RunningStatus?: unknown | unknown;
  /**
   * @minLength 0
   * @maxLength 127
   * @pattern .*
   */
  RandomizationSalt?: string;
  /**
   * @minItems 2
   * @maxItems 5
   * @uniqueItems true
   */
  Treatments: {
    /**
     * @minLength 1
     * @maxLength 127
     * @pattern [-a-zA-Z0-9._]*
     */
    TreatmentName: string;
    Description?: string;
    /** @pattern ([-a-zA-Z0-9._]*)|(arn:[^:]*:[^:]*:[^:]*:[^:]*:.*) */
    Feature: string;
    /**
     * @minLength 1
     * @maxLength 255
     * @pattern [-a-zA-Z0-9._]*
     */
    Variation: string;
  }[];
  /**
   * @minItems 1
   * @maxItems 3
   * @uniqueItems true
   */
  MetricGoals: ({
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
    /** @enum ["INCREASE","DECREASE"] */
    DesiredChange: "INCREASE" | "DECREASE";
  })[];
  /**
   * @minimum 0
   * @maximum 100000
   */
  SamplingRate?: number;
  OnlineAbConfig: {
    /**
     * @minLength 1
     * @maxLength 127
     * @pattern [-a-zA-Z0-9._]*
     */
    ControlTreatmentName?: string;
    /** @uniqueItems true */
    TreatmentWeights?: {
      /**
       * @minLength 1
       * @maxLength 127
       * @pattern [-a-zA-Z0-9._]*
       */
      Treatment: string;
      /**
       * @minimum 0
       * @maximum 100000
       */
      SplitWeight: number;
    }[];
  };
  /**
   * @minLength 0
   * @maxLength 2048
   * @pattern ([-a-zA-Z0-9._]*)|(arn:[^:]*:[^:]*:[^:]*:[^:]*:segment/[-a-zA-Z0-9._]*)
   */
  Segment?: string;
  RemoveSegment?: boolean;
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
};
