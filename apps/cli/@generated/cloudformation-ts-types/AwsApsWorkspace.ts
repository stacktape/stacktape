// This file is auto-generated. Do not edit manually.
// Source: aws-aps-workspace.json

/** Resource Type definition for AWS::APS::Workspace */
export type AwsApsWorkspace = {
  /**
   * Required to identify a specific APS Workspace.
   * @minLength 1
   * @maxLength 100
   * @pattern ^[a-zA-Z0-9][a-zA-Z0-9_-]{1,99}$
   */
  WorkspaceId?: string;
  /**
   * AMP Workspace alias.
   * @minLength 0
   * @maxLength 100
   */
  Alias?: string;
  /**
   * Workspace arn.
   * @minLength 1
   * @maxLength 128
   * @pattern ^arn:(aws|aws-us-gov|aws-cn):aps:[a-z0-9-]+:[0-9]+:workspace/[a-zA-Z0-9-]+$
   */
  Arn?: string;
  /** The AMP Workspace alert manager definition data */
  AlertManagerDefinition?: string;
  /** AMP Workspace prometheus endpoint */
  PrometheusEndpoint?: string;
  LoggingConfiguration?: {
    /**
     * CloudWatch log group ARN
     * @minLength 0
     * @maxLength 512
     */
    LogGroupArn?: string;
  };
  WorkspaceConfiguration?: {
    /**
     * How many days that metrics are retained in the workspace
     * @minimum 1
     */
    RetentionPeriodInDays?: number;
    /**
     * An array of label set and associated limits
     * @minItems 0
     * @uniqueItems true
     */
    LimitsPerLabelSets?: {
      Limits: {
        /**
         * The maximum number of active series that can be ingested for this label set
         * @minimum 0
         */
        MaxSeries?: number;
      };
      /**
       * An array of series labels
       * @minItems 0
       * @uniqueItems true
       */
      LabelSet: {
        /**
         * Name of the label
         * @minLength 1
         * @pattern ^[a-zA-Z_][a-zA-Z0-9_]*$
         */
        Name: string;
        /**
         * Value of the label
         * @minLength 1
         */
        Value: string;
      }[];
    }[];
  };
  QueryLoggingConfiguration?: {
    /**
     * The destinations configuration for query logging
     * @minItems 1
     * @maxItems 1
     */
    Destinations: {
      CloudWatchLogs: {
        /**
         * The ARN of the CloudWatch Logs log group
         * @minLength 0
         * @maxLength 512
         */
        LogGroupArn: string;
      };
      Filters: {
        /**
         * Query logs with QSP above this limit are vended
         * @minimum 0
         */
        QspThreshold: number;
      };
    }[];
  };
  /**
   * KMS Key ARN used to encrypt and decrypt AMP workspace data.
   * @minLength 20
   * @maxLength 2048
   * @pattern ^arn:aws[-a-z]*:kms:[-a-z0-9]+:[0-9]{12}:key/.+$
   */
  KmsKeyArn?: string;
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
