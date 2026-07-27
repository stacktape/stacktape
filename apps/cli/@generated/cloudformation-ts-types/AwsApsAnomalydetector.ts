// This file is auto-generated. Do not edit manually.
// Source: aws-aps-anomalydetector.json

/** AnomalyDetector schema for cloudformation. */
export type AwsApsAnomalydetector = {
  /**
   * Required to identify a specific APS Workspace associated with this Anomaly Detector.
   * @pattern ^arn:(aws|aws-us-gov|aws-cn):aps:[a-z0-9-]+:[0-9]+:workspace/[a-zA-Z0-9-]+$
   */
  Workspace: string;
  /**
   * The AnomalyDetector alias.
   * @minLength 1
   * @maxLength 128
   */
  Alias: string;
  /**
   * The AnomalyDetector period of detection and metric generation.
   * @default 60
   */
  EvaluationIntervalInSeconds?: number;
  /**
   * The AnomalyDetector ARN.
   * @pattern ^arn:(aws|aws-us-gov|aws-cn):aps:[a-z0-9-]+:[0-9]+:anomalydetector/[a-zA-Z0-9-]+/[0-9A-Za-z][-.0-9A-Z_a-z]*$
   */
  Arn?: string;
  /**
   * An array of key-value pairs to provide meta-data.
   * @uniqueItems true
   */
  Labels?: {
    /**
     * The key name of the tag. You can specify a value that is 1 to 128 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 1
     * @maxLength 128
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
  /** The action to perform when running the expression returns no data. */
  MissingDataAction?: unknown | unknown;
  /** Determines the anomaly detector's algorithm and its configuration. */
  Configuration: {
    RandomCutForest: {
      /** @minLength 1 */
      Query: string;
      /**
       * @default 8
       * @minimum 2
       * @maximum 1024
       */
      ShingleSize?: number;
      /**
       * @default 256
       * @minimum 256
       * @maximum 1024
       */
      SampleSize?: number;
      IgnoreNearExpectedFromAbove?: unknown | unknown;
      IgnoreNearExpectedFromBelow?: unknown | unknown;
    };
  };
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
