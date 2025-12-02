// This file is auto-generated. Do not edit manually.
// Source: aws-cleanrooms-configuredtable.json

/** Represents a table that can be associated with collaborations */
export type AwsCleanroomsConfiguredtable = {
  /** @maxLength 100 */
  Arn?: string;
  /**
   * An arbitrary set of tags (key-value pairs) for this cleanrooms collaboration.
   * @uniqueItems true
   */
  Tags?: {
    /**
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * @minLength 1
     * @maxLength 256
     */
    Value: string;
  }[];
  /**
   * @minItems 1
   * @maxItems 100
   */
  AllowedColumns: string[];
  AnalysisMethod: "DIRECT_QUERY" | "DIRECT_JOB" | "MULTIPLE";
  SelectedAnalysisMethods?: ("DIRECT_QUERY" | "DIRECT_JOB")[];
  /**
   * @minLength 36
   * @maxLength 36
   * @pattern [0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}
   */
  ConfiguredTableIdentifier?: string;
  /**
   * @maxLength 255
   * @pattern ^[\u0020-\uD7FF\uE000-\uFFFD\uD800\uDBFF-\uDC00\uDFFF\t\r\n]*$
   */
  Description?: string;
  /**
   * @minLength 1
   * @maxLength 100
   * @pattern ^(?!\s*$)[\u0020-\uD7FF\uE000-\uFFFD\uD800\uDBFF-\uDC00\uDFFF\t]*$
   */
  Name: string;
  /**
   * @minItems 1
   * @maxItems 1
   */
  AnalysisRules?: ({
    Type: "AGGREGATION" | "LIST" | "CUSTOM";
    Policy: {
      V1: {
        List: {
          /** @minItems 1 */
          JoinColumns: string[];
          /** @maxItems 2 */
          AllowedJoinOperators?: ("OR" | "AND")[];
          ListColumns: string[];
          AdditionalAnalyses?: "ALLOWED" | "REQUIRED" | "NOT_ALLOWED";
        };
      } | {
        Aggregation: {
          /** @minItems 1 */
          AggregateColumns: ({
            /** @minItems 1 */
            ColumnNames: string[];
            Function: "SUM" | "SUM_DISTINCT" | "COUNT" | "COUNT_DISTINCT" | "AVG";
          })[];
          JoinColumns: string[];
          /** @maxItems 2 */
          AllowedJoinOperators?: ("OR" | "AND")[];
          JoinRequired?: "QUERY_RUNNER";
          DimensionColumns: string[];
          ScalarFunctions: ("TRUNC" | "ABS" | "CEILING" | "FLOOR" | "LN" | "LOG" | "ROUND" | "SQRT" | "CAST" | "LOWER" | "RTRIM" | "UPPER" | "COALESCE" | "CONVERT" | "CURRENT_DATE" | "DATEADD" | "EXTRACT" | "GETDATE" | "SUBSTRING" | "TO_CHAR" | "TO_DATE" | "TO_NUMBER" | "TO_TIMESTAMP" | "TRIM")[];
          /** @minItems 1 */
          OutputConstraints: {
            ColumnName: string;
            /**
             * @minimum 2
             * @maximum 100000
             */
            Minimum: number;
            Type: "COUNT_DISTINCT";
          }[];
          AdditionalAnalyses?: "ALLOWED" | "REQUIRED" | "NOT_ALLOWED";
        };
      } | {
        Custom: {
          AllowedAnalyses: string[];
          AllowedAnalysisProviders?: string[];
          DifferentialPrivacy?: {
            /** @minItems 1 */
            Columns: {
              Name: string;
            }[];
          };
          DisallowedOutputColumns?: string[];
          AdditionalAnalyses?: "ALLOWED" | "REQUIRED" | "NOT_ALLOWED";
        };
      };
    };
  })[];
  TableReference: {
    Glue: {
      /**
       * @maxLength 128
       * @pattern ^[a-zA-Z0-9_](([a-zA-Z0-9_ ]+-)*([a-zA-Z0-9_ ]+))?$
       */
      TableName: string;
      /**
       * @maxLength 128
       * @pattern ^[a-zA-Z0-9_](([a-zA-Z0-9_ ]+-)*([a-zA-Z0-9_ ]+))?$
       */
      DatabaseName: string;
      Region?: "us-west-1" | "us-west-2" | "us-east-1" | "us-east-2" | "af-south-1" | "ap-east-1" | "ap-south-2" | "ap-southeast-1" | "ap-southeast-2" | "ap-southeast-5" | "ap-southeast-4" | "ap-southeast-7" | "ap-south-1" | "ap-northeast-3" | "ap-northeast-1" | "ap-northeast-2" | "ca-central-1" | "ca-west-1" | "eu-south-1" | "eu-west-3" | "eu-south-2" | "eu-central-2" | "eu-central-1" | "eu-north-1" | "eu-west-1" | "eu-west-2" | "me-south-1" | "me-central-1" | "il-central-1" | "sa-east-1" | "mx-central-1" | "ap-east-2";
    };
  } | {
    Snowflake: {
      /** @maxLength 256 */
      SecretArn: string;
      /**
       * @minLength 3
       * @maxLength 256
       */
      AccountIdentifier: string;
      /**
       * @minLength 1
       * @maxLength 256
       */
      DatabaseName: string;
      /**
       * @minLength 1
       * @maxLength 256
       */
      TableName: string;
      /**
       * @minLength 1
       * @maxLength 256
       */
      SchemaName: string;
      TableSchema: {
        /**
         * @minItems 1
         * @maxItems 250
         */
        V1: {
          /** @maxLength 128 */
          ColumnName: string;
          /** @maxLength 255 */
          ColumnType: string;
        }[];
      };
    };
  } | {
    Athena: {
      /**
       * @minLength 1
       * @maxLength 128
       */
      WorkGroup: string;
      /**
       * @minLength 8
       * @maxLength 1024
       */
      OutputLocation?: string;
      /** @maxLength 128 */
      DatabaseName: string;
      /** @maxLength 128 */
      TableName: string;
      Region?: "us-west-1" | "us-west-2" | "us-east-1" | "us-east-2" | "af-south-1" | "ap-east-1" | "ap-south-2" | "ap-southeast-1" | "ap-southeast-2" | "ap-southeast-5" | "ap-southeast-4" | "ap-southeast-7" | "ap-south-1" | "ap-northeast-3" | "ap-northeast-1" | "ap-northeast-2" | "ca-central-1" | "ca-west-1" | "eu-south-1" | "eu-west-3" | "eu-south-2" | "eu-central-2" | "eu-central-1" | "eu-north-1" | "eu-west-1" | "eu-west-2" | "me-south-1" | "me-central-1" | "il-central-1" | "sa-east-1" | "mx-central-1" | "ap-east-2";
    };
  };
};
