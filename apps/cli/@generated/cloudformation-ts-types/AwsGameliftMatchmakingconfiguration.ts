// This file is auto-generated. Do not edit manually.
// Source: aws-gamelift-matchmakingconfiguration.json

/**
 * The AWS::GameLift::MatchmakingConfiguration resource creates an Amazon GameLift (GameLift)
 * matchmaking configuration.
 */
export type AwsGameliftMatchmakingconfiguration = {
  /**
   * A flag that indicates whether a match that was created with this configuration must be accepted by
   * the matched players
   */
  AcceptanceRequired: boolean;
  /**
   * The length of time (in seconds) to wait for players to accept a proposed match, if acceptance is
   * required.
   * @minimum 1
   * @maximum 600
   */
  AcceptanceTimeoutSeconds?: number;
  /**
   * The number of player slots in a match to keep open for future players.
   * @minimum 0
   */
  AdditionalPlayerCount?: number;
  /**
   * The method used to backfill game sessions created with this matchmaking configuration.
   * @enum ["AUTOMATIC","MANUAL"]
   */
  BackfillMode?: "AUTOMATIC" | "MANUAL";
  /**
   * The Amazon Resource Name (ARN) that is assigned to a Amazon GameLift matchmaking configuration
   * resource and uniquely identifies it.
   * @pattern ^arn:.*:matchmakingconfiguration\/[a-zA-Z0-9-\.]*
   */
  Arn?: string;
  /** A time stamp indicating when this data object was created. */
  CreationTime?: string;
  /**
   * Information to attach to all events related to the matchmaking configuration.
   * @minLength 0
   * @maxLength 256
   */
  CustomEventData?: string;
  /**
   * A descriptive label that is associated with matchmaking configuration.
   * @minLength 1
   * @maxLength 1024
   */
  Description?: string;
  /**
   * Indicates whether this matchmaking configuration is being used with Amazon GameLift hosting or as a
   * standalone matchmaking solution.
   * @enum ["STANDALONE","WITH_QUEUE"]
   */
  FlexMatchMode?: "STANDALONE" | "WITH_QUEUE";
  /**
   * A set of custom properties for a game session, formatted as key:value pairs.
   * @maxItems 16
   * @uniqueItems true
   */
  GameProperties?: {
    /**
     * The game property identifier.
     * @maxLength 32
     */
    Key: string;
    /**
     * The game property value.
     * @maxLength 96
     */
    Value: string;
  }[];
  /**
   * A set of custom game session properties, formatted as a single string value.
   * @minLength 1
   * @maxLength 4096
   */
  GameSessionData?: string;
  /**
   * The Amazon Resource Name (ARN) that is assigned to a Amazon GameLift game session queue resource
   * and uniquely identifies it.
   */
  GameSessionQueueArns?: string[];
  /**
   * A unique identifier for the matchmaking configuration.
   * @maxLength 128
   * @pattern [a-zA-Z0-9-\.]*
   */
  Name: string;
  /**
   * An SNS topic ARN that is set up to receive matchmaking notifications.
   * @minLength 0
   * @maxLength 300
   * @pattern [a-zA-Z0-9:_/-]*(.fifo)?
   */
  NotificationTarget?: string;
  /**
   * The maximum duration, in seconds, that a matchmaking ticket can remain in process before timing
   * out.
   * @minimum 1
   * @maximum 43200
   */
  RequestTimeoutSeconds: number;
  /**
   * The Amazon Resource Name (ARN) associated with the GameLift matchmaking rule set resource that this
   * configuration uses.
   * @pattern ^arn:.*:matchmakingruleset\/[a-zA-Z0-9-\.]*
   */
  RuleSetArn?: string;
  /**
   * A unique identifier for the matchmaking rule set to use with this configuration.
   * @maxLength 128
   * @pattern [a-zA-Z0-9-\.]*
   */
  RuleSetName: string;
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
