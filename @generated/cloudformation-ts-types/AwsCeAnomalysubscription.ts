// This file is auto-generated. Do not edit manually.
// Source: aws-ce-anomalysubscription.json

/**
 * AWS Cost Anomaly Detection leverages advanced Machine Learning technologies to identify anomalous
 * spend and root causes, so you can quickly take action. Create subscription to be notified
 */
export type AwsCeAnomalysubscription = {
  SubscriptionArn?: string;
  /**
   * The name of the subscription.
   * @minLength 0
   * @maxLength 1024
   * @pattern [\S\s]*
   */
  SubscriptionName: string;
  /**
   * The accountId
   * @minLength 0
   * @maxLength 1024
   */
  AccountId?: string;
  /** A list of cost anomaly monitors. */
  MonitorArnList: string[];
  /** A list of subscriber */
  Subscribers: ({
    /** @pattern (^[a-zA-Z0-9.!#$%&'*+=?^_‘{|}~-]+@[a-zA-Z0-9_-]+(\.[a-zA-Z0-9_-]+)+$)|(^arn:(aws[a-zA-Z-]*):sns:[a-zA-Z0-9-]+:[0-9]{12}:[a-zA-Z0-9_-]+(\.fifo)?$) */
    Address: string;
    /** @enum ["CONFIRMED","DECLINED"] */
    Status?: "CONFIRMED" | "DECLINED";
    /** @enum ["EMAIL","SNS"] */
    Type: "EMAIL" | "SNS";
  })[];
  /**
   * The dollar value that triggers a notification if the threshold is exceeded.
   * @minimum 0
   */
  Threshold?: number;
  /**
   * An Expression object in JSON String format used to specify the anomalies that you want to generate
   * alerts for.
   */
  ThresholdExpression?: string;
  /**
   * The frequency at which anomaly reports are sent over email.
   * @enum ["DAILY","IMMEDIATE","WEEKLY"]
   */
  Frequency: "DAILY" | "IMMEDIATE" | "WEEKLY";
  /**
   * Tags to assign to subscription.
   * @minItems 0
   * @maxItems 200
   */
  ResourceTags?: {
    /**
     * The key name for the tag.
     * @minLength 1
     * @maxLength 128
     * @pattern ^(?!aws:).*$
     */
    Key: string;
    /**
     * The value for the tag.
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
};
