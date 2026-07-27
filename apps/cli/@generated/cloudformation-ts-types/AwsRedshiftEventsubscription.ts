// This file is auto-generated. Do not edit manually.
// Source: aws-redshift-eventsubscription.json

/** The `AWS::Redshift::EventSubscription` resource creates an Amazon Redshift Event Subscription. */
export type AwsRedshiftEventsubscription = {
  /**
   * The status of the Amazon Redshift event notification subscription.
   * @enum ["active","no-permission","topic-not-exist"]
   */
  Status?: "active" | "no-permission" | "topic-not-exist";
  /** The name of the Amazon Redshift event notification subscription. */
  CustSubscriptionId?: string;
  /**
   * The list of Amazon Redshift event categories specified in the event notification subscription.
   * @uniqueItems true
   */
  EventCategoriesList?: string[];
  /**
   * The type of source that will be generating the events.
   * @enum ["cluster","cluster-parameter-group","cluster-security-group","cluster-snapshot","scheduled-action"]
   */
  SourceType?: "cluster" | "cluster-parameter-group" | "cluster-security-group" | "cluster-snapshot" | "scheduled-action";
  /**
   * Specifies the Amazon Redshift event categories to be published by the event notification
   * subscription.
   * @uniqueItems true
   */
  EventCategories?: ("configuration" | "management" | "monitoring" | "security" | "pending")[];
  /**
   * A boolean value; set to true to activate the subscription, and set to false to create the
   * subscription but not activate it.
   */
  Enabled?: boolean;
  /**
   * Specifies the Amazon Redshift event severity to be published by the event notification
   * subscription.
   * @enum ["ERROR","INFO"]
   */
  Severity?: "ERROR" | "INFO";
  /**
   * The name of the Amazon Redshift event notification subscription
   * @pattern ^(?=^[a-zA-Z][a-zA-Z0-9]*(-[a-zA-Z0-9]+)*$).{1,255}$
   */
  SubscriptionName: string;
  /** A list of one or more identifiers of Amazon Redshift source objects. */
  SourceIds?: string[];
  /** The AWS account associated with the Amazon Redshift event notification subscription. */
  CustomerAwsId?: string;
  /** A list of the sources that publish events to the Amazon Redshift event notification subscription. */
  SourceIdsList?: string[];
  /** The Amazon Resource Name (ARN) of the Amazon SNS topic used to transmit the event notifications. */
  SnsTopicArn?: string;
  /** The date and time the Amazon Redshift event notification subscription was created. */
  SubscriptionCreationTime?: string;
  /** An array of key-value pairs to apply to this resource. */
  Tags?: {
    /**
     * The value for the tag. You can specify a value that is 0 to 256 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
    /**
     * The key name of the tag. You can specify a value that is 1 to 128 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
  }[];
};
