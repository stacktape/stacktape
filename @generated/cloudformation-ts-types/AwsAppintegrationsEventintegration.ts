// This file is auto-generated. Do not edit manually.
// Source: aws-appintegrations-eventintegration.json

/** Resource Type definition for AWS::AppIntegrations::EventIntegration */
export type AwsAppintegrationsEventintegration = {
  /**
   * The event integration description.
   * @minLength 1
   * @maxLength 1000
   */
  Description?: string;
  /**
   * The Amazon Resource Name (ARN) of the event integration.
   * @minLength 1
   * @maxLength 2048
   * @pattern ^arn:aws[-a-z]*:[A-Za-z0-9][A-Za-z0-9_/.-]{0,62}:[A-Za-z0-9_/.-]{0,63}:[A-Za-z0-9_/.-]{0,63}:[A-Za-z0-9][A-Za-z0-9:_/+=,@.-]{0,1023}$
   */
  EventIntegrationArn?: string;
  /**
   * The name of the event integration.
   * @minLength 1
   * @maxLength 255
   * @pattern ^[a-zA-Z0-9/\._\-]+$
   */
  Name: string;
  /**
   * The Amazon Eventbridge bus for the event integration.
   * @minLength 1
   * @maxLength 255
   * @pattern ^[a-zA-Z0-9/\._\-]+$
   */
  EventBridgeBus: string;
  /** The EventFilter (source) associated with the event integration. */
  EventFilter: {
    /**
     * The source of the events.
     * @minLength 1
     * @maxLength 256
     * @pattern ^aws\.(partner\/.*|cases)$
     */
    Source: string;
  };
  /**
   * The tags (keys and values) associated with the event integration.
   * @minItems 0
   * @maxItems 200
   */
  Tags?: {
    /**
     * A key to identify the tag.
     * @minLength 1
     * @maxLength 128
     * @pattern ^(?!aws:)[a-zA-Z+-=._:/]+$
     */
    Key: string;
    /**
     * Corresponding tag value for the key.
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
};
