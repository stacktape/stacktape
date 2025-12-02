// This file is auto-generated. Do not edit manually.
// Source: aws-gamelift-location.json

/** The AWS::GameLift::Location resource creates an Amazon GameLift (GameLift) custom location. */
export type AwsGameliftLocation = {
  /**
   * @minLength 8
   * @maxLength 64
   * @pattern ^custom-[A-Za-z0-9\-]+
   */
  LocationName: string;
  /** @pattern ^arn:.*:location/custom-\S+ */
  LocationArn?: string;
  /**
   * An array of key-value pairs to apply to this resource.
   * @maxItems 200
   * @uniqueItems true
   */
  Tags?: {
    /**
     * The key name of the tag. You can specify a value that is 1 to 128 Unicode characters in length.
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * The value for the tag. You can specify a value that is 0 to 256 Unicode characters in length.
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
};
