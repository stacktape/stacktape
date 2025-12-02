// This file is auto-generated. Do not edit manually.
// Source: aws-sns-topic.json

/**
 * The ``AWS::SNS::Topic`` resource creates a topic to which notifications can be published.
 * One account can create a maximum of 100,000 standard topics and 1,000 FIFO topics. For more
 * information, see [endpoints and quotas](https://docs.aws.amazon.com/general/latest/gr/sns.html) in
 * the *General Reference*.
 * The structure of ``AUTHPARAMS`` depends on the .signature of the API request. For more
 * information, see [Examples of the complete Signature Version 4 signing
 * process](https://docs.aws.amazon.com/general/latest/gr/sigv4-signed-request-examples.html) in the
 * *General Reference*.
 */
export type AwsSnsTopic = {
  /**
   * The display name to use for an SNS topic with SMS subscriptions. The display name must be maximum
   * 100 characters long, including hyphens (-), underscores (_), spaces, and tabs.
   */
  DisplayName?: string;
  /**
   * The ID of an AWS managed customer master key (CMK) for SNS or a custom CMK. For more information,
   * see [Key
   * terms](https://docs.aws.amazon.com/sns/latest/dg/sns-server-side-encryption.html#sse-key-terms).
   * For more examples, see ``KeyId`` in the *API Reference*.
   * This property applies only to
   * [server-side-encryption](https://docs.aws.amazon.com/sns/latest/dg/sns-server-side-encryption.html).
   */
  KmsMasterKeyId?: string;
  /**
   * The body of the policy document you want to use for this topic.
   * You can only add one policy per topic.
   * The policy must be in JSON string format.
   * Length Constraints: Maximum length of 30,720.
   */
  DataProtectionPolicy?: Record<string, unknown>;
  /**
   * The SNS subscriptions (endpoints) for this topic.
   * If you specify the ``Subscription`` property in the ``AWS::SNS::Topic`` resource and it creates
   * an associated subscription resource, the associated subscription is not deleted when the
   * ``AWS::SNS::Topic`` resource is deleted.
   * @uniqueItems false
   */
  Subscription?: {
    /**
     * The endpoint that receives notifications from the SNS topic. The endpoint value depends on the
     * protocol that you specify. For more information, see the ``Endpoint`` parameter of the
     * ``Subscribe`` action in the *API Reference*.
     */
    Endpoint: string;
    /**
     * The subscription's protocol. For more information, see the ``Protocol`` parameter of the
     * ``Subscribe`` action in the *API Reference*.
     */
    Protocol: string;
  }[];
  /** Set to true to create a FIFO topic. */
  FifoTopic?: boolean;
  /**
   * Enables content-based deduplication for FIFO topics.
   * +  By default, ``ContentBasedDeduplication`` is set to ``false``. If you create a FIFO topic and
   * this attribute is ``false``, you must specify a value for the ``MessageDeduplicationId`` parameter
   * for the [Publish](https://docs.aws.amazon.com/sns/latest/api/API_Publish.html) action.
   * +  When you set ``ContentBasedDeduplication`` to ``true``, SNS uses a SHA-256 hash to generate
   * the ``MessageDeduplicationId`` using the body of the message (but not the attributes of the
   * message).
   * (Optional) To override the generated value, you can specify a value for the the
   * ``MessageDeduplicationId`` parameter for the ``Publish`` action.
   */
  ContentBasedDeduplication?: boolean;
  /**
   * The archive policy determines the number of days SNS retains messages. You can set a retention
   * period from 1 to 365 days.
   */
  ArchivePolicy?: Record<string, unknown>;
  FifoThroughputScope?: string;
  /**
   * The list of tags to add to a new topic.
   * To be able to tag a topic on creation, you must have the ``sns:CreateTopic`` and
   * ``sns:TagResource`` permissions.
   * @uniqueItems false
   */
  Tags?: {
    /** The required key portion of the tag. */
    Key: string;
    /** The optional value portion of the tag. */
    Value: string;
  }[];
  /**
   * The name of the topic you want to create. Topic names must include only uppercase and lowercase
   * ASCII letters, numbers, underscores, and hyphens, and must be between 1 and 256 characters long.
   * FIFO topic names must end with ``.fifo``.
   * If you don't specify a name, CFN generates a unique physical ID and uses that ID for the topic
   * name. For more information, see [Name
   * type](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-name.html).
   * If you specify a name, you can't perform updates that require replacement of this resource. You
   * can perform updates that require no or some interruption. If you must replace the resource, specify
   * a new name.
   */
  TopicName?: string;
  TopicArn?: string;
  /**
   * The signature version corresponds to the hashing algorithm used while creating the signature of the
   * notifications, subscription confirmations, or unsubscribe confirmation messages sent by Amazon SNS.
   * By default, ``SignatureVersion`` is set to ``1``.
   */
  SignatureVersion?: string;
  /**
   * Tracing mode of an SNS topic. By default ``TracingConfig`` is set to ``PassThrough``, and the topic
   * passes through the tracing header it receives from an SNS publisher to its subscriptions. If set to
   * ``Active``, SNS will vend X-Ray segment data to topic owner account if the sampled flag in the
   * tracing header is true.
   */
  TracingConfig?: string;
  /**
   * The ``DeliveryStatusLogging`` configuration enables you to log the delivery status of messages sent
   * from your Amazon SNS topic to subscribed endpoints with the following supported delivery protocols:
   * +  HTTP
   * +  Amazon Kinesis Data Firehose
   * +   AWS Lambda
   * +  Platform application endpoint
   * +  Amazon Simple Queue Service
   * Once configured, log entries are sent to Amazon CloudWatch Logs.
   * @uniqueItems true
   */
  DeliveryStatusLogging?: ({
    /**
     * Indicates one of the supported protocols for the Amazon SNS topic.
     * At least one of the other three ``LoggingConfig`` properties is recommend along with
     * ``Protocol``.
     * @enum ["http/s","sqs","lambda","firehose","application"]
     */
    Protocol: "http/s" | "sqs" | "lambda" | "firehose" | "application";
    /** The IAM role ARN to be used when logging successful message deliveries in Amazon CloudWatch. */
    SuccessFeedbackRoleArn?: string;
    /**
     * The percentage of successful message deliveries to be logged in Amazon CloudWatch. Valid percentage
     * values range from 0 to 100.
     */
    SuccessFeedbackSampleRate?: string;
    /** The IAM role ARN to be used when logging failed message deliveries in Amazon CloudWatch. */
    FailureFeedbackRoleArn?: string;
  })[];
};
