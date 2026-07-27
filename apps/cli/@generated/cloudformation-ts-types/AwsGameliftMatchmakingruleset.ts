// This file is auto-generated. Do not edit manually.
// Source: aws-gamelift-matchmakingruleset.json

/**
 * The AWS::GameLift::MatchmakingRuleSet resource creates an Amazon GameLift (GameLift) matchmaking
 * rule set.
 */
export type AwsGameliftMatchmakingruleset = {
  /**
   * A unique identifier for the matchmaking rule set.
   * @maxLength 128
   * @pattern [a-zA-Z0-9-\.]*
   */
  Name: string;
  /**
   * A collection of matchmaking rules, formatted as a JSON string.
   * @minLength 1
   * @maxLength 65535
   */
  RuleSetBody: string;
  /**
   * A time stamp indicating when this data object was created. Format is a number expressed in Unix
   * time as milliseconds.
   */
  CreationTime?: string;
  /**
   * The Amazon Resource Name (ARN) that is assigned to a Amazon GameLift matchmaking rule set resource
   * and uniquely identifies it.
   * @pattern ^arn:.*:matchmakingruleset\/[a-zA-Z0-9-\.]*
   */
  Arn?: string;
  /**
   * An array of key-value pairs to apply to this resource.
   * @minItems 1
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
     * The value for the tag. You can specify a value that is 1 to 256 Unicode characters in length.
     * @minLength 1
     * @maxLength 256
     */
    Value: string;
  }[];
};
