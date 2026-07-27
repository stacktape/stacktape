// This file is auto-generated. Do not edit manually.
// Source: aws-location-geofencecollection.json

/** Definition of AWS::Location::GeofenceCollection Resource Type */
export type AwsLocationGeofencecollection = {
  /**
   * @maxLength 1600
   * @pattern ^arn(:[a-z0-9]+([.-][a-z0-9]+)*){2}(:([a-z0-9]+([.-][a-z0-9]+)*)?){2}:([^/].*)?$
   */
  CollectionArn?: string;
  /**
   * @minLength 1
   * @maxLength 100
   * @pattern ^[-._\w]+$
   */
  CollectionName: string;
  CreateTime?: string;
  /**
   * @minLength 0
   * @maxLength 1000
   */
  Description?: string;
  /**
   * @minLength 1
   * @maxLength 2048
   */
  KmsKeyId?: string;
  PricingPlan?: "RequestBasedUsage";
  /** This shape is deprecated since 2022-02-01: Deprecated. No longer allowed. */
  PricingPlanDataSource?: string;
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
