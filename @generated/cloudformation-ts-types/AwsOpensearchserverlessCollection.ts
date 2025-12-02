// This file is auto-generated. Do not edit manually.
// Source: aws-opensearchserverless-collection.json

/** Amazon OpenSearchServerless collection resource */
export type AwsOpensearchserverlessCollection = {
  Type?: "SEARCH" | "TIMESERIES" | "VECTORSEARCH";
  /**
   * The description of the collection
   * @maxLength 1000
   */
  Description?: string;
  /** The ARN of the AWS KMS key used to encrypt the collection. */
  KmsKeyArn?: string;
  StandbyReplicas?: "ENABLED" | "DISABLED";
  /** The endpoint for the collection. */
  CollectionEndpoint?: string;
  /**
   * The identifier of the collection
   * @minLength 3
   * @maxLength 40
   */
  Id?: string;
  /** The Amazon Resource Name (ARN) of the collection. */
  Arn?: string;
  /**
   * List of tags to be added to the resource
   * @minItems 0
   * @maxItems 50
   */
  Tags?: {
    /**
     * The value in the key-value pair
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
    /**
     * The key in the key-value pair
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
  }[];
  /**
   * The name of the collection.
   * The name must meet the following criteria:
   * Unique to your account and AWS Region
   * Starts with a lowercase letter
   * Contains only lowercase letters a-z, the numbers 0-9 and the hyphen (-)
   * Contains between 3 and 32 characters
   * @minLength 3
   * @maxLength 32
   * @pattern ^[a-z][a-z0-9-]{2,31}$
   */
  Name: string;
  /** The OpenSearch Dashboards endpoint for the collection. */
  DashboardEndpoint?: string;
};
