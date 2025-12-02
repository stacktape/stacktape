// This file is auto-generated. Do not edit manually.
// Source: aws-customerprofiles-calculatedattributedefinition.json

/** A calculated attribute definition for Customer Profiles */
export type AwsCustomerprofilesCalculatedattributedefinition = {
  DomainName: string;
  CalculatedAttributeName: string;
  DisplayName?: string;
  Description?: string;
  AttributeDetails: {
    Attributes: {
      Name: string;
    }[];
    Expression: string;
  };
  Conditions?: {
    Range?: {
      Value?: number;
      Unit: "DAYS";
      ValueRange?: {
        /**
         * The starting point for this range. Positive numbers indicate how many days in the past data should
         * be included, and negative numbers indicate how many days in the future.
         * @minimum -2147483648
         * @maximum 2147483647
         */
        Start: number;
        /**
         * The ending point for this range. Positive numbers indicate how many days in the past data should be
         * included, and negative numbers indicate how many days in the future.
         * @minimum -2147483648
         * @maximum 2147483647
         */
        End: number;
      };
      /**
       * An expression specifying the field in your JSON object from which the date should be parsed. The
       * expression should follow the structure of \"{ObjectTypeName.<Location of timestamp field in JSON
       * pointer format>}\". E.g. if your object type is MyType and source JSON is {"generatedAt":
       * {"timestamp": "1737587945945"}}, then TimestampSource should be "{MyType.generatedAt.timestamp}".
       * @minLength 1
       * @maxLength 255
       */
      TimestampSource?: string;
      /**
       * The format the timestamp field in your JSON object is specified. This value should be one of
       * EPOCHMILLI or ISO_8601. E.g. if your object type is MyType and source JSON is {"generatedAt":
       * {"timestamp": "2001-07-04T12:08:56.235Z"}}, then TimestampFormat should be "ISO_8601".
       * @minLength 1
       * @maxLength 255
       */
      TimestampFormat?: string;
    };
    ObjectCount?: number;
    Threshold?: {
      Value: string;
      Operator: "EQUAL_TO" | "GREATER_THAN" | "LESS_THAN" | "NOT_EQUAL_TO";
    };
  };
  Statistic: "FIRST_OCCURRENCE" | "LAST_OCCURRENCE" | "COUNT" | "SUM" | "MINIMUM" | "MAXIMUM" | "AVERAGE" | "MAX_OCCURRENCE";
  /** Whether to use historical data for the calculated attribute. */
  UseHistoricalData?: boolean;
  /** The timestamp of when the calculated attribute definition was created. */
  CreatedAt?: string;
  /** The timestamp of when the calculated attribute definition was most recently edited. */
  LastUpdatedAt?: string;
  /**
   * The status of the calculated attribute definition.
   * @enum ["IN_PROGRESS","PREPARING","COMPLETED","FAILED"]
   */
  Status?: "IN_PROGRESS" | "PREPARING" | "COMPLETED" | "FAILED";
  Readiness?: {
    /**
     * The progress percentage for including historical data in your calculated attribute.
     * @minimum 0
     * @maximum 100
     */
    ProgressPercentage?: number;
    /** Any information pertaining to the status of the calculated attribute if required. */
    Message?: string;
  };
  Tags?: {
    /**
     * The key name of the tag. You can specify a value that is 1 to 128 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * The value for the tag. You can specify a value that is 0 to 256 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
};
