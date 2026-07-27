// This file is auto-generated. Do not edit manually.
// Source: aws-rds-integration.json

/** A zero-ETL integration with Amazon Redshift. */
export type AwsRdsIntegration = {
  /**
   * The name of the integration.
   * @minLength 1
   * @maxLength 64
   */
  IntegrationName?: string;
  /**
   * A description of the integration.
   * @minLength 1
   * @maxLength 1000
   */
  Description?: string;
  /**
   * A list of tags. For more information, see [Tagging Amazon RDS
   * Resources](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_Tagging.html) in the *Amazon
   * RDS User Guide.*.
   * @maxItems 50
   * @uniqueItems true
   */
  Tags?: {
    /**
     * A key is the required name of the tag. The string value can be from 1 to 128 Unicode characters in
     * length and can't be prefixed with ``aws:`` or ``rds:``. The string can only contain only the set of
     * Unicode letters, digits, white-space, '_', '.', ':', '/', '=', '+', '-', '@' (Java regex:
     * "^([\\p{L}\\p{Z}\\p{N}_.:/=+\\-@]*)$").
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * A value is the optional value of the tag. The string value can be from 1 to 256 Unicode characters
     * in length and can't be prefixed with ``aws:`` or ``rds:``. The string can only contain only the set
     * of Unicode letters, digits, white-space, '_', '.', ':', '/', '=', '+', '-', '@' (Java regex:
     * "^([\\p{L}\\p{Z}\\p{N}_.:/=+\\-@]*)$").
     * @minLength 0
     * @maxLength 256
     */
    Value?: string;
  }[];
  /**
   * Data filters for the integration. These filters determine which tables from the source database are
   * sent to the target Amazon Redshift data warehouse.
   * @minLength 1
   * @maxLength 25600
   * @pattern [a-zA-Z0-9_ "\\\-$,*.:?+\/]*
   */
  DataFilter?: string;
  /** The Amazon Resource Name (ARN) of the database to use as the source for replication. */
  SourceArn: string;
  /** The ARN of the Redshift data warehouse to use as the target for replication. */
  TargetArn: string;
  IntegrationArn?: string;
  /**
   * The AWS Key Management System (AWS KMS) key identifier for the key to use to encrypt the
   * integration. If you don't specify an encryption key, RDS uses a default AWS owned key.
   */
  KMSKeyId?: string;
  /**
   * An optional set of non-secret key–value pairs that contains additional contextual information about
   * the data. For more information, see [Encryption
   * context](https://docs.aws.amazon.com/kms/latest/developerguide/concepts.html#encrypt_context) in
   * the *Key Management Service Developer Guide*.
   * You can only include this parameter if you specify the ``KMSKeyId`` parameter.
   */
  AdditionalEncryptionContext?: Record<string, string>;
  CreateTime?: string;
};
