// This file is auto-generated. Do not edit manually.
// Source: aws-timestream-database.json

/** The AWS::Timestream::Database resource creates a Timestream database. */
export type AwsTimestreamDatabase = {
  Arn?: string;
  /**
   * The name for the database. If you don't specify a name, AWS CloudFormation generates a unique
   * physical ID and uses that ID for the database name.
   * @pattern ^[a-zA-Z0-9_.-]{3,256}$
   */
  DatabaseName?: string;
  /**
   * The KMS key for the database. If the KMS key is not specified, the database will be encrypted with
   * a Timestream managed KMS key located in your account.
   * @minLength 1
   * @maxLength 2048
   */
  KmsKeyId?: string;
  /**
   * An array of key-value pairs to apply to this resource.
   * @maxItems 200
   */
  Tags?: {
    /**
     * @minLength 1
     * @maxLength 128
     */
    Key?: string;
    /**
     * @minLength 0
     * @maxLength 256
     */
    Value?: string;
  }[];
};
