// This file is auto-generated. Do not edit manually.
// Source: aws-events-endpoint.json

/** Resource Type definition for AWS::Events::Endpoint. */
export type AwsEventsEndpoint = {
  /**
   * @minLength 1
   * @maxLength 64
   * @pattern ^[\.\-_A-Za-z0-9]+$
   */
  Name?: string;
  /**
   * @minLength 1
   * @maxLength 1600
   * @pattern ^arn:aws([a-z]|\-)*:events:([a-z]|\d|\-)*:([0-9]{12})?:endpoint\/[/\.\-_A-Za-z0-9]+$
   */
  Arn?: string;
  /**
   * @minLength 1
   * @maxLength 256
   * @pattern ^arn:aws[a-z-]*:iam::\d{12}:role\/[\w+=,.@/-]+$
   */
  RoleArn?: string;
  /**
   * @maxLength 512
   * @pattern .*
   */
  Description?: string;
  RoutingConfig: {
    FailoverConfig: {
      Primary: {
        HealthCheck: string;
      };
      Secondary: {
        Route: string;
      };
    };
  };
  ReplicationConfig?: {
    State: "ENABLED" | "DISABLED";
  };
  EventBuses: {
    EventBusArn: string;
  }[];
  /**
   * @minLength 1
   * @maxLength 50
   * @pattern ^[A-Za-z0-9\-]+[\.][A-Za-z0-9\-]+$
   */
  EndpointId?: string;
  /**
   * @minLength 1
   * @maxLength 256
   * @pattern ^(https://)?[\.\-a-z0-9]+$
   */
  EndpointUrl?: string;
  /** @enum ["ACTIVE","CREATING","UPDATING","DELETING","CREATE_FAILED","UPDATE_FAILED"] */
  State?: "ACTIVE" | "CREATING" | "UPDATING" | "DELETING" | "CREATE_FAILED" | "UPDATE_FAILED";
  /**
   * @minLength 1
   * @maxLength 512
   * @pattern ^.*$
   */
  StateReason?: string;
};
