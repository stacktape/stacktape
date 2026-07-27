// This file is auto-generated. Do not edit manually.
// Source: aws-athena-datacatalog.json

/** Resource schema for AWS::Athena::DataCatalog */
export type AwsAthenaDatacatalog = {
  /**
   * The name of the data catalog to create. The catalog name must be unique for the AWS account and can
   * use a maximum of 128 alphanumeric, underscore, at sign, or hyphen characters.
   * @minLength 1
   * @maxLength 256
   */
  Name: string;
  /**
   * A description of the data catalog to be created.
   * @minLength 1
   * @maxLength 1024
   */
  Description?: string;
  /**
   * Specifies the Lambda function or functions to use for creating the data catalog. This is a mapping
   * whose values depend on the catalog type.
   */
  Parameters?: Record<string, string>;
  /** A list of comma separated tags to add to the data catalog that is created. */
  Tags?: {
    /**
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
  /**
   * The type of data catalog to create: LAMBDA for a federated catalog, GLUE for AWS Glue Catalog, or
   * HIVE for an external hive metastore. FEDERATED is a federated catalog for which Athena creates the
   * connection and the Lambda function for you based on the parameters that you pass.
   * @enum ["LAMBDA","GLUE","HIVE","FEDERATED"]
   */
  Type: "LAMBDA" | "GLUE" | "HIVE" | "FEDERATED";
  /**
   * The status of the creation or deletion of the data catalog. LAMBDA, GLUE, and HIVE data catalog
   * types are created synchronously. Their status is either CREATE_COMPLETE or CREATE_FAILED. The
   * FEDERATED data catalog type is created asynchronously.
   * @enum ["CREATE_IN_PROGRESS","CREATE_COMPLETE","CREATE_FAILED","CREATE_FAILED_CLEANUP_IN_PROGRESS","CREATE_FAILED_CLEANUP_COMPLETE","CREATE_FAILED_CLEANUP_FAILED","DELETE_IN_PROGRESS","DELETE_COMPLETE","DELETE_FAILED"]
   */
  Status?: "CREATE_IN_PROGRESS" | "CREATE_COMPLETE" | "CREATE_FAILED" | "CREATE_FAILED_CLEANUP_IN_PROGRESS" | "CREATE_FAILED_CLEANUP_COMPLETE" | "CREATE_FAILED_CLEANUP_FAILED" | "DELETE_IN_PROGRESS" | "DELETE_COMPLETE" | "DELETE_FAILED";
  /** The type of connection for a FEDERATED data catalog */
  ConnectionType?: string;
  /** Text of the error that occurred during data catalog creation or deletion. */
  Error?: string;
};
