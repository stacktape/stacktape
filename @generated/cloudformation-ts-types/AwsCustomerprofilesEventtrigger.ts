// This file is auto-generated. Do not edit manually.
// Source: aws-customerprofiles-eventtrigger.json

/** An event trigger resource of Amazon Connect Customer Profiles */
export type AwsCustomerprofilesEventtrigger = {
  DomainName: string;
  EventTriggerName: string;
  ObjectTypeName: string;
  Description?: string;
  EventTriggerConditions: ({
    EventTriggerDimensions: ({
      ObjectAttributes: ({
        /**
         * An attribute contained within a source object.
         * @minLength 1
         * @maxLength 1000
         */
        Source?: string;
        /**
         * A field defined within an object type.
         * @minLength 1
         * @maxLength 64
         * @pattern ^[a-zA-Z0-9_.-]+$
         */
        FieldName?: string;
        /**
         * The operator used to compare an attribute against a list of values.
         * @enum ["INCLUSIVE","EXCLUSIVE","CONTAINS","BEGINS_WITH","ENDS_WITH","GREATER_THAN","LESS_THAN","GREATER_THAN_OR_EQUAL","LESS_THAN_OR_EQUAL","EQUAL","BEFORE","AFTER","ON","BETWEEN","NOT_BETWEEN"]
         */
        ComparisonOperator: "INCLUSIVE" | "EXCLUSIVE" | "CONTAINS" | "BEGINS_WITH" | "ENDS_WITH" | "GREATER_THAN" | "LESS_THAN" | "GREATER_THAN_OR_EQUAL" | "LESS_THAN_OR_EQUAL" | "EQUAL" | "BEFORE" | "AFTER" | "ON" | "BETWEEN" | "NOT_BETWEEN";
        /**
         * A list of attribute values used for comparison.
         * @minItems 1
         * @maxItems 10
         */
        Values: string[];
      })[];
    })[];
    LogicalOperator: "ANY" | "ALL" | "NONE";
  })[];
  EventTriggerLimits?: {
    EventExpiration?: number;
    Periods?: ({
      /**
       * The unit of time.
       * @enum ["HOURS","DAYS","WEEKS","MONTHS"]
       */
      Unit: "HOURS" | "DAYS" | "WEEKS" | "MONTHS";
      /**
       * The amount of time of the specified unit.
       * @minimum 1
       * @maximum 24
       */
      Value: number;
      /**
       * The maximum allowed number of destination invocations per profile.
       * @minimum 1
       * @maximum 1000
       */
      MaxInvocationsPerProfile?: number;
      /**
       * If set to true, there is no limit on the number of destination invocations per profile. The default
       * is false.
       */
      Unlimited?: boolean;
    })[];
  };
  SegmentFilter?: string;
  /** The timestamp of when the event trigger was created. */
  CreatedAt?: string;
  /** The timestamp of when the event trigger was most recently updated. */
  LastUpdatedAt?: string;
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
