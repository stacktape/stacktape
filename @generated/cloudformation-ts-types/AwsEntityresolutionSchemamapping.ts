// This file is auto-generated. Do not edit manually.
// Source: aws-entityresolution-schemamapping.json

/** SchemaMapping defined in AWS Entity Resolution service */
export type AwsEntityresolutionSchemamapping = {
  /** The name of the SchemaMapping */
  SchemaName: string;
  /** The description of the SchemaMapping */
  Description?: string;
  /** The SchemaMapping attributes input */
  MappedInputFields: ({
    FieldName: string;
    Type: "NAME" | "NAME_FIRST" | "NAME_MIDDLE" | "NAME_LAST" | "ADDRESS" | "ADDRESS_STREET1" | "ADDRESS_STREET2" | "ADDRESS_STREET3" | "ADDRESS_CITY" | "ADDRESS_STATE" | "ADDRESS_COUNTRY" | "ADDRESS_POSTALCODE" | "PHONE" | "PHONE_NUMBER" | "PHONE_COUNTRYCODE" | "EMAIL_ADDRESS" | "UNIQUE_ID" | "DATE" | "STRING" | "PROVIDER_ID";
    /** The subtype of the Attribute. Would be required only when type is PROVIDER_ID */
    SubType?: string;
    GroupName?: string;
    MatchKey?: string;
    Hashed?: boolean;
  })[];
  /**
   * @minItems 0
   * @maxItems 200
   * @uniqueItems true
   */
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
  SchemaArn?: string;
  CreatedAt?: string;
  UpdatedAt?: string;
  HasWorkflows?: boolean;
};
