// This file is auto-generated. Do not edit manually.
// Source: aws-glue-integrationresourceproperty.json

/** Resource Type definition for AWS::Glue::IntegrationResourceProperty */
export type AwsGlueIntegrationresourceproperty = {
  /**
   * The connection ARN of the source, or the database ARN of the target.
   * @pattern arn:aws:.*:.*:[0-9]+:.*
   */
  ResourceArn: string;
  /**
   * The integration resource property ARN.
   * @pattern arn:aws:glue:.*:[0-9]+:.*
   */
  ResourcePropertyArn?: string;
  /** The resource properties associated with the integration source. */
  SourceProcessingProperties?: {
    /**
     * The IAM role to access the Glue connection.
     * @maxLength 128
     */
    RoleArn: string;
  };
  /** The resource properties associated with the integration target. */
  TargetProcessingProperties?: {
    /**
     * The IAM role to access the Glue database.
     * @maxLength 128
     * @pattern arn:aws:iam:.*:[0-9]+:.*
     */
    RoleArn: string;
    /**
     * The ARN of the KMS key used for encryption.
     * @maxLength 128
     * @pattern arn:aws:kms:.*:[0-9]+:.*
     */
    KmsArn?: string;
    /**
     * The Glue network connection to configure the Glue job running in the customer VPC.
     * @maxLength 128
     */
    ConnectionName?: string;
    /**
     * The ARN of an Eventbridge event bus to receive the integration status notification.
     * @maxLength 128
     */
    EventBusArn?: string;
  };
  /**
   * An array of key-value pairs to apply to this resource.
   * @maxItems 50
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
    Value?: string;
  }[];
};
