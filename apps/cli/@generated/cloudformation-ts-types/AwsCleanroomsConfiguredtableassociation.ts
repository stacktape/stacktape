// This file is auto-generated. Do not edit manually.
// Source: aws-cleanrooms-configuredtableassociation.json

/** Represents a table that can be queried within a collaboration */
export type AwsCleanroomsConfiguredtableassociation = {
  /** @maxLength 256 */
  Arn?: string;
  /** An arbitrary set of tags (key-value pairs) for this cleanrooms collaboration. */
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
   * @minLength 36
   * @maxLength 36
   * @pattern [0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}
   */
  ConfiguredTableAssociationIdentifier?: string;
  /**
   * @minLength 36
   * @maxLength 36
   * @pattern [0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}
   */
  ConfiguredTableIdentifier: string;
  /**
   * @maxLength 255
   * @pattern ^[\u0020-\uD7FF\uE000-\uFFFD\uD800\uDBFF-\uDC00\uDFFF\t\r\n]*$
   */
  Description?: string;
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
  /**
   * @minLength 32
   * @maxLength 512
   */
  RoleArn: string;
  /**
   * @minItems 1
   * @maxItems 1
   */
  ConfiguredTableAssociationAnalysisRules?: ({
    Type: "AGGREGATION" | "LIST" | "CUSTOM";
    Policy: {
      V1: {
        List: {
          AllowedResultReceivers?: string[];
          AllowedAdditionalAnalyses?: string[];
        };
      } | {
        Aggregation: {
          AllowedResultReceivers?: string[];
          AllowedAdditionalAnalyses?: string[];
        };
      } | {
        Custom: {
          AllowedResultReceivers?: string[];
          AllowedAdditionalAnalyses?: string[];
        };
      };
    };
  })[];
};
