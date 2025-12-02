// This file is auto-generated. Do not edit manually.
// Source: aws-deadline-monitor.json

/** Definition of AWS::Deadline::Monitor Resource Type */
export type AwsDeadlineMonitor = {
  /**
   * @minLength 1
   * @maxLength 100
   */
  DisplayName: string;
  IdentityCenterApplicationArn?: string;
  /** @pattern ^arn:(aws|aws-us-gov|aws-cn|aws-iso|aws-iso-b):sso:::instance/(sso)?ins-[a-zA-Z0-9-.]{16}$ */
  IdentityCenterInstanceArn: string;
  /** @pattern ^monitor-[0-9a-f]{32}$ */
  MonitorId?: string;
  /** @pattern ^arn:(aws[a-zA-Z-]*):iam::\d{12}:role(/[!-.0-~]+)*/[\w+=,.@-]+$ */
  RoleArn: string;
  /** @pattern ^[a-z0-9-]{1,100}$ */
  Subdomain: string;
  /**
   * An array of key-value pairs to apply to this resource.
   * @maxItems 50
   * @uniqueItems true
   */
  Tags?: {
    /**
     * The key name of the tag. You can specify a value that is 1 to 127 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 1
     * @maxLength 127
     */
    Key: string;
    /**
     * The value for the tag. You can specify a value that is 1 to 255 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 1
     * @maxLength 255
     */
    Value: string;
  }[];
  Url?: string;
  /** @pattern ^arn:(aws[a-zA-Z-]*):deadline:[a-z0-9-]+:[0-9]+:monitor/monitor-[0-9a-z]{32}$ */
  Arn?: string;
};
