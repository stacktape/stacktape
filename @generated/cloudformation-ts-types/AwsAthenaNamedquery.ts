// This file is auto-generated. Do not edit manually.
// Source: aws-athena-namedquery.json

/** Resource schema for AWS::Athena::NamedQuery */
export type AwsAthenaNamedquery = {
  /**
   * The query name.
   * @minLength 1
   * @maxLength 128
   */
  Name?: string;
  /**
   * The database to which the query belongs.
   * @minLength 1
   * @maxLength 255
   */
  Database: string;
  /**
   * The query description.
   * @minLength 1
   * @maxLength 1024
   */
  Description?: string;
  /**
   * The contents of the query with all query statements.
   * @minLength 1
   * @maxLength 262144
   */
  QueryString: string;
  /**
   * The name of the workgroup that contains the named query.
   * @minLength 1
   * @maxLength 128
   */
  WorkGroup?: string;
  /** The unique ID of the query. */
  NamedQueryId?: string;
};
