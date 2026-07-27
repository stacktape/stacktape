// This file is auto-generated. Do not edit manually.
// Source: aws-aps-scraper.json

/** Resource Type definition for AWS::APS::Scraper */
export type AwsApsScraper = {
  /**
   * Required to identify a specific scraper.
   * @minLength 1
   * @maxLength 64
   * @pattern ^s-[a-z0-9]{8}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{12}$
   */
  ScraperId?: string;
  /**
   * Scraper alias.
   * @minLength 1
   * @maxLength 100
   * @pattern ^[0-9A-Za-z][-.0-9A-Z_a-z]*$
   */
  Alias?: string;
  /**
   * Scraper ARN.
   * @pattern ^arn:(aws|aws-us-gov|aws-cn):aps:[a-z0-9-]+:[0-9]+:scraper/s-[a-z0-9]{8}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{12}$
   */
  Arn?: string;
  /**
   * IAM role ARN for the scraper.
   * @minLength 20
   * @maxLength 2048
   * @pattern ^arn:(aws|aws-us-gov|aws-cn):iam::[0-9]{12}:role/[a-zA-Z0-9-]+$
   */
  RoleArn?: string;
  ScraperLoggingConfiguration?: {
    /**
     * @minItems 1
     * @uniqueItems true
     */
    ScraperComponents: ({
      Type: "SERVICE_DISCOVERY" | "COLLECTOR" | "EXPORTER";
      Config?: {
        Options?: Record<string, string>;
      };
    })[];
    LoggingDestination: {
      CloudWatchLogs?: {
        /**
         * ARN of the CloudWatch log group
         * @minLength 0
         * @maxLength 512
         */
        LogGroupArn?: string;
      };
    };
  };
  ScrapeConfiguration: unknown;
  RoleConfiguration?: {
    /** IAM Role in source account */
    SourceRoleArn?: string;
    /** IAM Role in the target account */
    TargetRoleArn?: string;
  };
  Source: unknown | unknown;
  Destination: unknown;
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
