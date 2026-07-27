// This file is auto-generated. Do not edit manually.
// Source: aws-qbusiness-index.json

/** Definition of AWS::QBusiness::Index Resource Type */
export type AwsQbusinessIndex = {
  /**
   * @minLength 36
   * @maxLength 36
   * @pattern ^[a-zA-Z0-9][a-zA-Z0-9-]{35}$
   */
  ApplicationId: string;
  CapacityConfiguration?: {
    /** @minimum 1 */
    Units?: number;
  };
  CreatedAt?: string;
  /**
   * @minLength 0
   * @maxLength 1000
   * @pattern ^[\s\S]*$
   */
  Description?: string;
  /**
   * @minLength 1
   * @maxLength 1000
   * @pattern ^[a-zA-Z0-9][a-zA-Z0-9_-]*$
   */
  DisplayName: string;
  /**
   * @minItems 1
   * @maxItems 500
   */
  DocumentAttributeConfigurations?: ({
    /**
     * @minLength 1
     * @maxLength 30
     * @pattern ^[a-zA-Z0-9_][a-zA-Z0-9_-]*$
     */
    Name?: string;
    Type?: "STRING" | "STRING_LIST" | "NUMBER" | "DATE";
    Search?: "ENABLED" | "DISABLED";
  })[];
  /**
   * @minLength 0
   * @maxLength 1284
   * @pattern ^arn:[a-z0-9-\.]{1,63}:[a-z0-9-\.]{0,63}:[a-z0-9-\.]{0,63}:[a-z0-9-\.]{0,63}:[^/].{0,1023}$
   */
  IndexArn?: string;
  /**
   * @minLength 36
   * @maxLength 36
   * @pattern ^[a-zA-Z0-9][a-zA-Z0-9-]{35}$
   */
  IndexId?: string;
  IndexStatistics?: {
    TextDocumentStatistics?: {
      /** @minimum 0 */
      IndexedTextBytes?: number;
      /** @minimum 0 */
      IndexedTextDocumentCount?: number;
    };
  };
  Type?: "ENTERPRISE" | "STARTER";
  Status?: "CREATING" | "ACTIVE" | "DELETING" | "FAILED" | "UPDATING";
  /**
   * @minItems 0
   * @maxItems 200
   */
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
  UpdatedAt?: string;
};
