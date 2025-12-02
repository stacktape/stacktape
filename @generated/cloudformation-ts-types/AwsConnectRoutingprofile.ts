// This file is auto-generated. Do not edit manually.
// Source: aws-connect-routingprofile.json

/** Resource Type definition for AWS::Connect::RoutingProfile */
export type AwsConnectRoutingprofile = {
  /**
   * The identifier of the Amazon Connect instance.
   * @pattern ^arn:aws[-a-z0-9]*:connect:[-a-z0-9]*:[0-9]{12}:instance/[-a-zA-Z0-9]*$
   */
  InstanceArn: string;
  /**
   * The name of the routing profile.
   * @minLength 1
   * @maxLength 127
   */
  Name: string;
  /**
   * The description of the routing profile.
   * @minLength 1
   * @maxLength 250
   */
  Description: string;
  /** The channels agents can handle in the Contact Control Panel (CCP) for this routing profile. */
  MediaConcurrencies: ({
    Channel: "VOICE" | "CHAT" | "TASK" | "EMAIL";
    Concurrency: number;
    CrossChannelBehavior?: {
      BehaviorType: "ROUTE_CURRENT_CHANNEL_ONLY" | "ROUTE_ANY_CHANNEL";
    };
  })[];
  /**
   * The identifier of the default outbound queue for this routing profile.
   * @pattern ^arn:aws[-a-z0-9]*:connect:[-a-z0-9]*:[0-9]{12}:instance/[-a-zA-Z0-9]*/queue/[-a-zA-Z0-9]*$
   */
  DefaultOutboundQueueArn: string;
  /**
   * The Amazon Resource Name (ARN) of the routing profile.
   * @pattern ^arn:aws[-a-z0-9]*:connect:[-a-z0-9]*:[0-9]{12}:instance/[-a-zA-Z0-9]*/routing-profile/[-a-zA-Z0-9]*$
   */
  RoutingProfileArn?: string;
  /**
   * The queues to associate with this routing profile.
   * @minItems 1
   */
  QueueConfigs?: ({
    Delay: number;
    Priority: number;
    QueueReference: {
      Channel: "VOICE" | "CHAT" | "TASK" | "EMAIL";
      QueueArn: string;
    };
  })[];
  /**
   * The manual assignment queues to associate with this routing profile.
   * @minItems 1
   * @maxItems 10
   */
  ManualAssignmentQueueConfigs?: ({
    QueueReference: {
      Channel: "VOICE" | "CHAT" | "TASK" | "EMAIL";
      QueueArn: string;
    };
  })[];
  /**
   * An array of key-value pairs to apply to this resource.
   * @maxItems 50
   * @uniqueItems true
   */
  Tags?: {
    /**
     * The key name of the tag. You can specify a value that is 1 to 128 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 1
     * @maxLength 128
     * @pattern ^(?!aws:)[a-zA-Z+-=._:/]+$
     */
    Key: string;
    /**
     * The value for the tag. You can specify a value that is 0 to 256 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @maxLength 256
     */
    Value: string;
  }[];
  /**
   * Whether agents with this routing profile will have their routing order calculated based on longest
   * idle time or time since their last inbound contact.
   * @enum ["TIME_SINCE_LAST_ACTIVITY","TIME_SINCE_LAST_INBOUND"]
   */
  AgentAvailabilityTimer?: "TIME_SINCE_LAST_ACTIVITY" | "TIME_SINCE_LAST_INBOUND";
};
