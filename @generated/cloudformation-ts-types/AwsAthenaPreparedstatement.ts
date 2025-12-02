// This file is auto-generated. Do not edit manually.
// Source: aws-athena-preparedstatement.json

/** Resource schema for AWS::Athena::PreparedStatement */
export type AwsAthenaPreparedstatement = {
  /**
   * The name of the prepared statement.
   * @minLength 1
   * @maxLength 256
   */
  StatementName: string;
  /**
   * The name of the workgroup to which the prepared statement belongs.
   * @minLength 1
   * @maxLength 128
   */
  WorkGroup: string;
  /**
   * The description of the prepared statement.
   * @minLength 1
   * @maxLength 1024
   */
  Description?: string;
  /**
   * The query string for the prepared statement.
   * @minLength 1
   * @maxLength 262144
   */
  QueryStatement: string;
};
