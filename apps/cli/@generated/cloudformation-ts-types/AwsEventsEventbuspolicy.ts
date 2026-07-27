// This file is auto-generated. Do not edit manually.
// Source: aws-events-eventbuspolicy.json

/** Resource Type definition for AWS::Events::EventBusPolicy */
export type AwsEventsEventbuspolicy = {
  /**
   * The name of the event bus associated with the rule. If you omit this, the default event bus is
   * used.
   * @minLength 1
   * @maxLength 256
   * @pattern [\.\-_A-Za-z0-9]+
   */
  EventBusName?: string;
  Condition?: {
    /** Specifies the key for the condition. Currently the only supported key is aws:PrincipalOrgID. */
    Value?: string;
    /** Specifies the type of condition. Currently the only supported value is StringEquals. */
    Type?: string;
    /** Specifies the value for the key. Currently, this must be the ID of the organization. */
    Key?: string;
  };
  /**
   * The action that you are enabling the other account to perform.
   * @minLength 1
   * @maxLength 64
   * @pattern events:[a-zA-Z]+
   */
  Action?: string;
  /**
   * An identifier string for the external account that you are granting permissions to
   * @minLength 1
   * @maxLength 64
   * @pattern [a-zA-Z0-9-_]+
   */
  StatementId: string;
  /**
   * A JSON string that describes the permission policy statement. You can include a Policy parameter in
   * the request instead of using the StatementId, Action, Principal, or Condition parameters.
   */
  Statement?: Record<string, unknown>;
  /**
   * The 12-digit AWS account ID that you are permitting to put events to your default event bus.
   * Specify "*" to permit any account to put events to your default event bus.
   * @minLength 1
   * @maxLength 12
   * @pattern (\d{12}|\*)
   */
  Principal?: string;
};
