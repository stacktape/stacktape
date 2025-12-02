// This file is auto-generated. Do not edit manually.
// Source: aws-gamelift-alias.json

/**
 * The AWS::GameLift::Alias resource creates an alias for an Amazon GameLift (GameLift) fleet
 * destination.
 */
export type AwsGameliftAlias = {
  /**
   * A human-readable description of the alias.
   * @minLength 1
   * @maxLength 1024
   */
  Description?: string;
  /**
   * A descriptive label that is associated with an alias. Alias names do not need to be unique.
   * @minLength 1
   * @maxLength 1024
   * @pattern .*\S.*
   */
  Name: string;
  /**
   * A routing configuration that specifies where traffic is directed for this alias, such as to a fleet
   * or to a message.
   */
  RoutingStrategy: unknown | unknown;
  /** Unique alias ID */
  AliasId?: string;
  /**
   * The Amazon Resource Name (ARN) that is assigned to a Amazon GameLift Alias resource and uniquely
   * identifies it. ARNs are unique across all Regions. In a GameLift Alias ARN, the resource ID matches
   * the AliasId value.
   * @pattern ^arn:.*:alias\/alias-\S+
   */
  AliasArn?: string;
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
