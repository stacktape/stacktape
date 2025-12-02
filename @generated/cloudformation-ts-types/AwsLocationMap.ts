// This file is auto-generated. Do not edit manually.
// Source: aws-location-map.json

/** Definition of AWS::Location::Map Resource Type */
export type AwsLocationMap = {
  Configuration: {
    /**
     * @minLength 1
     * @maxLength 100
     * @pattern ^[-._\w]+$
     */
    Style: string;
    /**
     * @minLength 3
     * @maxLength 3
     * @pattern ^[A-Z]{3}$
     */
    PoliticalView?: string;
    /** @maxItems 10 */
    CustomLayers?: string[];
  };
  CreateTime?: string;
  /**
   * @minLength 0
   * @maxLength 1000
   */
  Description?: string;
  /**
   * @maxLength 1600
   * @pattern ^arn(:[a-z0-9]+([.-][a-z0-9]+)*):geo(:([a-z0-9]+([.-][a-z0-9]+)*))(:[0-9]+):((\*)|([-a-z]+[/][*-._\w]+))$
   */
  MapArn?: string;
  /**
   * @minLength 1
   * @maxLength 100
   * @pattern ^[-._\w]+$
   */
  MapName: string;
  PricingPlan?: "RequestBasedUsage";
  /**
   * An array of key-value pairs to apply to this resource.
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
     * @pattern ^[a-zA-Z+-=._:/]+$
     */
    Key: string;
    /**
     * The value for the tag. You can specify a value that is 0 to 256 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 0
     * @maxLength 256
     * @pattern ^[A-Za-z0-9 _=@:.+-/]*$
     */
    Value: string;
  }[];
  UpdateTime?: string;
  /**
   * @maxLength 1600
   * @pattern ^arn(:[a-z0-9]+([.-][a-z0-9]+)*){2}(:([a-z0-9]+([.-][a-z0-9]+)*)?){2}:([^/].*)?$
   */
  Arn?: string;
};
