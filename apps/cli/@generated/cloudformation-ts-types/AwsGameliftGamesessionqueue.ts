// This file is auto-generated. Do not edit manually.
// Source: aws-gamelift-gamesessionqueue.json

/**
 * The AWS::GameLift::GameSessionQueue resource creates an Amazon GameLift (GameLift) game session
 * queue.
 */
export type AwsGameliftGamesessionqueue = {
  /**
   * A descriptive label that is associated with game session queue. Queue names must be unique within
   * each Region.
   * @minLength 1
   * @maxLength 128
   * @pattern [a-zA-Z0-9-]+
   */
  Name: string;
  /**
   * The maximum time, in seconds, that a new game session placement request remains in the queue.
   * @minimum 0
   */
  TimeoutInSeconds?: number;
  /**
   * A list of fleets and/or fleet aliases that can be used to fulfill game session placement requests
   * in the queue.
   */
  Destinations?: {
    /**
     * @minLength 1
     * @maxLength 256
     * @pattern [a-zA-Z0-9:/-]+
     */
    DestinationArn?: string;
  }[];
  /** A set of policies that act as a sliding cap on player latency. */
  PlayerLatencyPolicies?: {
    /**
     * The maximum latency value that is allowed for any player, in milliseconds. All policies must have a
     * value set for this property.
     * @minimum 0
     */
    MaximumIndividualPlayerLatencyMilliseconds?: number;
    /**
     * The length of time, in seconds, that the policy is enforced while placing a new game session.
     * @minimum 0
     */
    PolicyDurationSeconds?: number;
  }[];
  /**
   * Information that is added to all events that are related to this game session queue.
   * @minLength 1
   * @maxLength 256
   * @pattern [\s\S]*
   */
  CustomEventData?: string;
  /**
   * An SNS topic ARN that is set up to receive game session placement notifications.
   * @minLength 1
   * @maxLength 300
   * @pattern [a-zA-Z0-9:_-]*(\.fifo)?
   */
  NotificationTarget?: string;
  /** A list of locations where a queue is allowed to place new game sessions. */
  FilterConfiguration?: {
    AllowedLocations?: string[];
  };
  /** Custom settings to use when prioritizing destinations and locations for game session placements. */
  PriorityConfiguration?: {
    LocationOrder?: string[];
    PriorityOrder?: ("LATENCY" | "COST" | "DESTINATION" | "LOCATION")[];
  };
  /**
   * The Amazon Resource Name (ARN) that is assigned to a Amazon GameLift game session queue resource
   * and uniquely identifies it.
   * @minLength 1
   * @maxLength 256
   * @pattern ^arn:.*:gamesessionqueue\/[a-zA-Z0-9-]+
   */
  Arn?: string;
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
     * The value for the tag. You can specify a value that is 1 to 256 Unicode characters in length.
     * @minLength 1
     * @maxLength 256
     */
    Value: string;
  }[];
};
