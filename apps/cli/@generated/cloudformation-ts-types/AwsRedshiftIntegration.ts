// This file is auto-generated. Do not edit manually.
// Source: aws-redshift-integration.json

/** Integration from a source AWS service to a Redshift cluster */
export type AwsRedshiftIntegration = {
  /** The Amazon Resource Name (ARN) of the integration. */
  IntegrationArn?: string;
  /**
   * The name of the integration.
   * @minLength 1
   * @maxLength 64
   */
  IntegrationName?: string;
  /** The Amazon Resource Name (ARN) of the database to use as the source for replication */
  SourceArn: string;
  /** The Amazon Resource Name (ARN) of the Redshift data warehouse to use as the target for replication */
  TargetArn: string;
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
  /** The time (UTC) when the integration was created. */
  CreateTime?: string;
  /**
   * An KMS key identifier for the key to use to encrypt the integration. If you don't specify an
   * encryption key, the default AWS owned KMS key is used.
   */
  KMSKeyId?: string;
  AdditionalEncryptionContext?: Record<string, string>;
};
