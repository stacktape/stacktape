// This file is auto-generated. Do not edit manually.
// Source: aws-glue-integration.json

/** Resource Type definition for AWS::Glue::Integration */
export type AwsGlueIntegration = {
  /** @maxLength 2048 */
  DataFilter?: string;
  /** The status of the integration. */
  Status?: string;
  /**
   * The Amazon Resource Name (ARN) of the integration.
   * @pattern arn:aws:.*:.*:[0-9]+:.*
   */
  IntegrationArn?: string;
  /**
   * The name of the integration.
   * @minLength 1
   * @maxLength 128
   */
  IntegrationName: string;
  /** @maxLength 1000 */
  Description?: string;
  /**
   * The Amazon Resource Name (ARN) of the database to use as the source for replication
   * @maxLength 512
   * @pattern arn:aws:.*:.*:[0-9]+:.*
   */
  SourceArn: string;
  IntegrationConfig?: {
    /** Enables continuous synchronization for on-demand data extractions. */
    ContinuousSync?: boolean;
    /**
     * Specifies the frequency at which CDC (Change Data Capture) pulls or incremental loads should occur.
     * @maxLength 128
     */
    RefreshInterval?: string;
    SourceProperties?: Record<string, string>;
  };
  /**
   * An KMS key identifier for the key to use to encrypt the integration. If you don't specify an
   * encryption key, the default AWS owned KMS key is used.
   */
  KmsKeyId?: string;
  /** The time (UTC) when the integration was created. */
  CreateTime?: string;
  /**
   * The Amazon Resource Name (ARN) of the Glue data warehouse to use as the target for replication
   * @maxLength 512
   * @pattern arn:aws:.*:.*:[0-9]+:.*
   */
  TargetArn: string;
  AdditionalEncryptionContext?: Record<string, string>;
  /**
   * An array of key-value pairs to apply to this resource.
   * @maxItems 50
   * @uniqueItems true
   */
  Tags?: {
    /**
     * The value for the tag. You can specify a value that is 0 to 256 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 0
     * @maxLength 256
     */
    Value?: string;
    /**
     * The key name of the tag. You can specify a value that is 1 to 128 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
  }[];
};
