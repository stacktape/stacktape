// This file is auto-generated. Do not edit manually.
// Source: aws-logs-querydefinition.json

/** The resource schema for AWSLogs QueryDefinition */
export type AwsLogsQuerydefinition = {
  /**
   * A name for the saved query definition
   * @minLength 1
   * @maxLength 255
   */
  Name: string;
  /**
   * The query string to use for this definition
   * @minLength 1
   * @maxLength 10000
   */
  QueryString: string;
  /** Optionally define specific log groups as part of your query definition */
  LogGroupNames?: string[];
  /**
   * Unique identifier of a query definition
   * @minLength 0
   * @maxLength 256
   */
  QueryDefinitionId?: string;
  /**
   * Query language of the query string. Possible values are CWLI, SQL, PPL, with CWLI being the
   * default.
   * @default "CWLI"
   * @enum ["CWLI","SQL","PPL"]
   */
  QueryLanguage?: "CWLI" | "SQL" | "PPL";
};
