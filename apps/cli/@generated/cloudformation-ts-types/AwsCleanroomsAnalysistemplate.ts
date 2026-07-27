// This file is auto-generated. Do not edit manually.
// Source: aws-cleanrooms-analysistemplate.json

/** Represents a stored analysis within a collaboration */
export type AwsCleanroomsAnalysistemplate = {
  /** @maxLength 200 */
  Arn?: string;
  /** @maxLength 100 */
  CollaborationArn?: string;
  /**
   * @minLength 36
   * @maxLength 36
   * @pattern [0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}
   */
  CollaborationIdentifier?: string;
  /** An arbitrary set of tags (key-value pairs) for this cleanrooms analysis template. */
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
   * The member who can query can provide this placeholder for a literal data value in an analysis
   * template
   * @minItems 0
   * @maxItems 10
   */
  AnalysisParameters?: ({
    /**
     * @minLength 0
     * @maxLength 250
     */
    DefaultValue?: string;
    /**
     * @minLength 1
     * @maxLength 100
     * @pattern [0-9a-zA-Z_]+
     */
    Name: string;
    /** @enum ["SMALLINT","INTEGER","BIGINT","DECIMAL","REAL","DOUBLE_PRECISION","BOOLEAN","CHAR","VARCHAR","DATE","TIMESTAMP","TIMESTAMPTZ","TIME","TIMETZ","VARBYTE","BINARY","BYTE","CHARACTER","DOUBLE","FLOAT","INT","LONG","NUMERIC","SHORT","STRING","TIMESTAMP_LTZ","TIMESTAMP_NTZ","TINYINT"] */
    Type: "SMALLINT" | "INTEGER" | "BIGINT" | "DECIMAL" | "REAL" | "DOUBLE_PRECISION" | "BOOLEAN" | "CHAR" | "VARCHAR" | "DATE" | "TIMESTAMP" | "TIMESTAMPTZ" | "TIME" | "TIMETZ" | "VARBYTE" | "BINARY" | "BYTE" | "CHARACTER" | "DOUBLE" | "FLOAT" | "INT" | "LONG" | "NUMERIC" | "SHORT" | "STRING" | "TIMESTAMP_LTZ" | "TIMESTAMP_NTZ" | "TINYINT";
  })[];
  /**
   * @minLength 36
   * @maxLength 36
   * @pattern [0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}
   */
  AnalysisTemplateIdentifier?: string;
  /**
   * @maxLength 255
   * @pattern ^[\u0020-\uD7FF\uE000-\uFFFD\uD800\uDBFF-\uDC00\uDFFF\t\r\n]*$
   */
  Description?: string;
  /** @maxLength 100 */
  MembershipArn?: string;
  /**
   * @minLength 36
   * @maxLength 36
   * @pattern [0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}
   */
  MembershipIdentifier: string;
  /**
   * @maxLength 128
   * @pattern ^[a-zA-Z0-9_](([a-zA-Z0-9_ ]+-)*([a-zA-Z0-9_ ]+))?$
   */
  Name: string;
  Schema?: {
    ReferencedTables: string[];
  };
  Source: {
    /**
     * @minLength 0
     * @maxLength 90000
     */
    Text: string;
  } | {
    Artifacts: {
      EntryPoint: {
        Location: {
          /**
           * @minLength 3
           * @maxLength 63
           */
          Bucket: string;
          Key: string;
        };
      };
      /**
       * @minItems 1
       * @maxItems 1
       */
      AdditionalArtifacts?: {
        Location: {
          /**
           * @minLength 3
           * @maxLength 63
           */
          Bucket: string;
          Key: string;
        };
      }[];
      /**
       * @minLength 32
       * @maxLength 512
       */
      RoleArn: string;
    };
  };
  SourceMetadata?: {
    Artifacts: {
      EntryPointHash: {
        Sha256?: string;
      };
      AdditionalArtifactHashes?: {
        Sha256?: string;
      }[];
    };
  };
  /** @enum ["SQL","PYSPARK_1_0"] */
  Format: "SQL" | "PYSPARK_1_0";
  ErrorMessageConfiguration?: {
    /** @enum ["DETAILED"] */
    Type: "DETAILED";
  };
};
