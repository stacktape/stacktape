// This file is auto-generated. Do not edit manually.
// Source: aws-lambda-eventsourcemapping.json

/**
 * The ``AWS::Lambda::EventSourceMapping`` resource creates a mapping between an event source and an
 * LAMlong function. LAM reads items from the event source and triggers the function.
 * For details about each event source type, see the following topics. In particular, each of the
 * topics describes the required and optional parameters for the specific event source.
 * +   [Configuring a Dynamo DB stream as an event
 * source](https://docs.aws.amazon.com/lambda/latest/dg/with-ddb.html#services-dynamodb-eventsourcemapping)
 * +   [Configuring a Kinesis stream as an event
 * source](https://docs.aws.amazon.com/lambda/latest/dg/with-kinesis.html#services-kinesis-eventsourcemapping)
 * +   [Configuring an SQS queue as an event
 * source](https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html#events-sqs-eventsource)
 * +   [Configuring an MQ broker as an event
 * source](https://docs.aws.amazon.com/lambda/latest/dg/with-mq.html#services-mq-eventsourcemapping)
 * +   [Configuring MSK as an event
 * source](https://docs.aws.amazon.com/lambda/latest/dg/with-msk.html)
 * +   [Configuring Self-Managed Apache Kafka as an event
 * source](https://docs.aws.amazon.com/lambda/latest/dg/kafka-smaa.html)
 * +   [Configuring Amazon DocumentDB as an event
 * source](https://docs.aws.amazon.com/lambda/latest/dg/with-documentdb.html)
 */
export type AwsLambdaEventsourcemapping = {
  /**
   * @minLength 36
   * @maxLength 36
   * @pattern [a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}
   */
  Id?: string;
  /**
   * The maximum number of records in each batch that Lambda pulls from your stream or queue and sends
   * to your function. Lambda passes all of the records in the batch to the function in a single call,
   * up to the payload limit for synchronous invocation (6 MB).
   * +  *Amazon Kinesis* – Default 100. Max 10,000.
   * +  *Amazon DynamoDB Streams* – Default 100. Max 10,000.
   * +  *Amazon Simple Queue Service* – Default 10. For standard queues the max is 10,000. For FIFO
   * queues the max is 10.
   * +  *Amazon Managed Streaming for Apache Kafka* – Default 100. Max 10,000.
   * +  *Self-managed Apache Kafka* – Default 100. Max 10,000.
   * +  *Amazon MQ (ActiveMQ and RabbitMQ)* – Default 100. Max 10,000.
   * +  *DocumentDB* – Default 100. Max 10,000.
   * @minimum 1
   * @maximum 10000
   */
  BatchSize?: number;
  /**
   * (Kinesis and DynamoDB Streams only) If the function returns an error, split the batch in two and
   * retry. The default value is false.
   * When using ``BisectBatchOnFunctionError``, check the ``BatchSize`` parameter in the ``OnFailure``
   * destination message's metadata. The ``BatchSize`` could be greater than 1 since LAM consolidates
   * failed messages metadata when writing to the ``OnFailure`` destination.
   */
  BisectBatchOnFunctionError?: boolean;
  /**
   * (Kinesis, DynamoDB Streams, Amazon MSK, and self-managed Apache Kafka event sources only) A
   * configuration object that specifies the destination of an event after Lambda processes it.
   */
  DestinationConfig?: {
    /** The destination configuration for failed invocations. */
    OnFailure?: {
      /**
       * The Amazon Resource Name (ARN) of the destination resource.
       * To retain records of unsuccessful [asynchronous
       * invocations](https://docs.aws.amazon.com/lambda/latest/dg/invocation-async.html#invocation-async-destinations),
       * you can configure an Amazon SNS topic, Amazon SQS queue, Amazon S3 bucket, Lambda function, or
       * Amazon EventBridge event bus as the destination.
       * Amazon SNS destinations have a message size limit of 256 KB. If the combined size of the function
       * request and response payload exceeds the limit, Lambda will drop the payload when sending
       * ``OnFailure`` event to the destination. For details on this behavior, refer to [Retaining records
       * of asynchronous
       * invocations](https://docs.aws.amazon.com/lambda/latest/dg/invocation-async-retain-records.html).
       * To retain records of failed invocations from
       * [Kinesis](https://docs.aws.amazon.com/lambda/latest/dg/with-kinesis.html),
       * [DynamoDB](https://docs.aws.amazon.com/lambda/latest/dg/with-ddb.html), [self-managed
       * Kafka](https://docs.aws.amazon.com/lambda/latest/dg/with-kafka.html#services-smaa-onfailure-destination)
       * or [Amazon
       * MSK](https://docs.aws.amazon.com/lambda/latest/dg/with-msk.html#services-msk-onfailure-destination),
       * you can configure an Amazon SNS topic, Amazon SQS queue, or Amazon S3 bucket as the destination.
       * @minLength 12
       * @maxLength 1024
       * @pattern ^$|kafka://([^.]([a-zA-Z0-9\-_.]{0,248}))|arn:(aws[a-zA-Z0-9-]*):([a-zA-Z0-9\-])+:((eusc-)?[a-z]{2}((-gov)|(-iso([a-z]?)))?-[a-z]+-\d{1})?:(\d{12})?:(.*)
       */
      Destination?: string;
    };
  };
  /**
   * When true, the event source mapping is active. When false, Lambda pauses polling and invocation.
   * Default: True
   */
  Enabled?: boolean;
  /**
   * The Amazon Resource Name (ARN) of the event source.
   * +  *Amazon Kinesis* – The ARN of the data stream or a stream consumer.
   * +  *Amazon DynamoDB Streams* – The ARN of the stream.
   * +  *Amazon Simple Queue Service* – The ARN of the queue.
   * +  *Amazon Managed Streaming for Apache Kafka* – The ARN of the cluster or the ARN of the VPC
   * connection (for [cross-account event source
   * mappings](https://docs.aws.amazon.com/lambda/latest/dg/with-msk.html#msk-multi-vpc)).
   * +  *Amazon MQ* – The ARN of the broker.
   * +  *Amazon DocumentDB* – The ARN of the DocumentDB change stream.
   * @minLength 12
   * @maxLength 1024
   * @pattern arn:(aws[a-zA-Z0-9-]*):([a-zA-Z0-9\-])+:((eusc-)?[a-z]{2}((-gov)|(-iso([a-z]?)))?-[a-z]+-\d{1})?:(\d{12})?:(.*)
   */
  EventSourceArn?: string;
  /**
   * @minLength 85
   * @maxLength 120
   * @pattern arn:(aws[a-zA-Z-]*)?:lambda:(eusc-)?[a-z]{2}((-gov)|(-iso([a-z]?)))?-[a-z]+-\d{1}:\d{12}:event-source-mapping:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}
   */
  EventSourceMappingArn?: string;
  /**
   * An object that defines the filter criteria that determine whether Lambda should process an event.
   * For more information, see [Lambda event
   * filtering](https://docs.aws.amazon.com/lambda/latest/dg/invocation-eventfiltering.html).
   */
  FilterCriteria?: {
    /**
     * A list of filters.
     * @minItems 1
     * @maxItems 20
     * @uniqueItems true
     */
    Filters?: {
      /**
       * A filter pattern. For more information on the syntax of a filter pattern, see [Filter rule
       * syntax](https://docs.aws.amazon.com/lambda/latest/dg/invocation-eventfiltering.html#filtering-syntax).
       * @minLength 0
       * @maxLength 4096
       * @pattern .*
       */
      Pattern?: string;
    }[];
  };
  /**
   * The ARN of the KMSlong (KMS) customer managed key that Lambda uses to encrypt your function's
   * [filter
   * criteria](https://docs.aws.amazon.com/lambda/latest/dg/invocation-eventfiltering.html#filtering-basics).
   * @minLength 12
   * @maxLength 2048
   * @pattern (arn:(aws[a-zA-Z-]*)?:[a-z0-9-.]+:.*)|()
   */
  KmsKeyArn?: string;
  /**
   * The name or ARN of the Lambda function.
   * **Name formats**
   * +  *Function name* – ``MyFunction``.
   * +  *Function ARN* – ``arn:aws:lambda:us-west-2:123456789012:function:MyFunction``.
   * +  *Version or Alias ARN* – ``arn:aws:lambda:us-west-2:123456789012:function:MyFunction:PROD``.
   * +  *Partial ARN* – ``123456789012:function:MyFunction``.
   * The length constraint applies only to the full ARN. If you specify only the function name, it's
   * limited to 64 characters in length.
   * @minLength 1
   * @maxLength 140
   * @pattern (arn:(aws[a-zA-Z-]*)?:lambda:)?((eusc-)?[a-z]{2}((-gov)|(-iso([a-z]?)))?-[a-z]+-\d{1}:)?(\d{12}:)?(function:)?([a-zA-Z0-9-_]+)(:(\$LATEST|[a-zA-Z0-9-_]+))?
   */
  FunctionName: string;
  /**
   * The maximum amount of time, in seconds, that Lambda spends gathering records before invoking the
   * function.
   * *Default (, , event sources)*: 0
   * *Default (, Kafka, , event sources)*: 500 ms
   * *Related setting:* For SQS event sources, when you set ``BatchSize`` to a value greater than 10,
   * you must set ``MaximumBatchingWindowInSeconds`` to at least 1.
   * @minimum 0
   * @maximum 300
   */
  MaximumBatchingWindowInSeconds?: number;
  /**
   * (Kinesis and DynamoDB Streams only) Discard records older than the specified age. The default value
   * is -1, which sets the maximum age to infinite. When the value is set to infinite, Lambda never
   * discards old records.
   * The minimum valid value for maximum record age is 60s. Although values less than 60 and greater
   * than -1 fall within the parameter's absolute range, they are not allowed
   * @minimum -1
   * @maximum 604800
   */
  MaximumRecordAgeInSeconds?: number;
  /**
   * (Kinesis and DynamoDB Streams only) Discard records after the specified number of retries. The
   * default value is -1, which sets the maximum number of retries to infinite. When
   * MaximumRetryAttempts is infinite, Lambda retries failed records until the record expires in the
   * event source.
   * @minimum -1
   * @maximum 10000
   */
  MaximumRetryAttempts?: number;
  /**
   * (Kinesis and DynamoDB Streams only) The number of batches to process concurrently from each shard.
   * The default value is 1.
   * @minimum 1
   * @maximum 10
   */
  ParallelizationFactor?: number;
  /**
   * The position in a stream from which to start reading. Required for Amazon Kinesis and Amazon
   * DynamoDB.
   * +  *LATEST* - Read only new records.
   * +  *TRIM_HORIZON* - Process all available records.
   * +  *AT_TIMESTAMP* - Specify a time from which to start reading records.
   * @minLength 6
   * @maxLength 12
   * @pattern (LATEST|TRIM_HORIZON|AT_TIMESTAMP)+
   */
  StartingPosition?: string;
  /**
   * With ``StartingPosition`` set to ``AT_TIMESTAMP``, the time from which to start reading, in Unix
   * time seconds. ``StartingPositionTimestamp`` cannot be in the future.
   */
  StartingPositionTimestamp?: number;
  /**
   * A list of tags to add to the event source mapping.
   * You must have the ``lambda:TagResource``, ``lambda:UntagResource``, and ``lambda:ListTags``
   * permissions for your
   * [principal](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_terms-and-concepts.html) to
   * manage the CFN stack. If you don't have these permissions, there might be unexpected behavior with
   * stack-level tags propagating to the resource during resource creation and update.
   * @uniqueItems true
   */
  Tags?: {
    /**
     * The key for this tag.
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * The value for this tag.
     * @minLength 0
     * @maxLength 256
     */
    Value?: string;
  }[];
  /**
   * The name of the Kafka topic.
   * @minItems 1
   * @maxItems 1
   * @uniqueItems true
   */
  Topics?: string[];
  /**
   * (Amazon MQ) The name of the Amazon MQ broker destination queue to consume.
   * @minItems 1
   * @maxItems 1
   * @uniqueItems true
   */
  Queues?: string[];
  /**
   * An array of the authentication protocol, VPC components, or virtual host to secure and define your
   * event source.
   * @minItems 1
   * @maxItems 22
   * @uniqueItems true
   */
  SourceAccessConfigurations?: ({
    /**
     * The type of authentication protocol, VPC components, or virtual host for your event source. For
     * example: ``"Type":"SASL_SCRAM_512_AUTH"``.
     * +  ``BASIC_AUTH`` – (Amazon MQ) The ASMlong secret that stores your broker credentials.
     * +  ``BASIC_AUTH`` – (Self-managed Apache Kafka) The Secrets Manager ARN of your secret key used
     * for SASL/PLAIN authentication of your Apache Kafka brokers.
     * +  ``VPC_SUBNET`` – (Self-managed Apache Kafka) The subnets associated with your VPC. Lambda
     * connects to these subnets to fetch data from your self-managed Apache Kafka cluster.
     * +  ``VPC_SECURITY_GROUP`` – (Self-managed Apache Kafka) The VPC security group used to manage
     * access to your self-managed Apache Kafka brokers.
     * +  ``SASL_SCRAM_256_AUTH`` – (Self-managed Apache Kafka) The Secrets Manager ARN of your secret
     * key used for SASL SCRAM-256 authentication of your self-managed Apache Kafka brokers.
     * +  ``SASL_SCRAM_512_AUTH`` – (Amazon MSK, Self-managed Apache Kafka) The Secrets Manager ARN of
     * your secret key used for SASL SCRAM-512 authentication of your self-managed Apache Kafka brokers.
     * +  ``VIRTUAL_HOST`` –- (RabbitMQ) The name of the virtual host in your RabbitMQ broker. Lambda
     * uses this RabbitMQ host as the event source. This property cannot be specified in an
     * UpdateEventSourceMapping API call.
     * +  ``CLIENT_CERTIFICATE_TLS_AUTH`` – (Amazon MSK, self-managed Apache Kafka) The Secrets Manager
     * ARN of your secret key containing the certificate chain (X.509 PEM), private key (PKCS#8 PEM), and
     * private key password (optional) used for mutual TLS authentication of your MSK/Apache Kafka
     * brokers.
     * +  ``SERVER_ROOT_CA_CERTIFICATE`` – (Self-managed Apache Kafka) The Secrets Manager ARN of your
     * secret key containing the root CA certificate (X.509 PEM) used for TLS encryption of your Apache
     * Kafka brokers.
     * @enum ["BASIC_AUTH","VPC_SUBNET","VPC_SECURITY_GROUP","SASL_SCRAM_512_AUTH","SASL_SCRAM_256_AUTH","VIRTUAL_HOST","CLIENT_CERTIFICATE_TLS_AUTH","SERVER_ROOT_CA_CERTIFICATE"]
     */
    Type?: "BASIC_AUTH" | "VPC_SUBNET" | "VPC_SECURITY_GROUP" | "SASL_SCRAM_512_AUTH" | "SASL_SCRAM_256_AUTH" | "VIRTUAL_HOST" | "CLIENT_CERTIFICATE_TLS_AUTH" | "SERVER_ROOT_CA_CERTIFICATE";
    /**
     * The value for your chosen configuration in ``Type``. For example: ``"URI":
     * "arn:aws:secretsmanager:us-east-1:01234567890:secret:MyBrokerSecretName"``.
     * @minLength 1
     * @maxLength 200
     * @pattern [a-zA-Z0-9-\/*:_+=.@-]*
     */
    URI?: string;
  })[];
  /**
   * (Kinesis and DynamoDB Streams only) The duration in seconds of a processing window for DynamoDB and
   * Kinesis Streams event sources. A value of 0 seconds indicates no tumbling window.
   * @minimum 0
   * @maximum 900
   */
  TumblingWindowInSeconds?: number;
  /**
   * (Kinesis, DynamoDB Streams, and SQS) A list of current response type enums applied to the event
   * source mapping.
   * Valid Values: ``ReportBatchItemFailures``
   * @minLength 0
   * @maxLength 1
   * @uniqueItems true
   */
  FunctionResponseTypes?: "ReportBatchItemFailures"[];
  /** The self-managed Apache Kafka cluster for your event source. */
  SelfManagedEventSource?: {
    /**
     * The list of bootstrap servers for your Kafka brokers in the following format:
     * ``"KafkaBootstrapServers": ["abc.xyz.com:xxxx","abc2.xyz.com:xxxx"]``.
     */
    Endpoints?: {
      /**
       * The list of bootstrap servers for your Kafka brokers in the following format:
       * ``"KafkaBootstrapServers": ["abc.xyz.com:xxxx","abc2.xyz.com:xxxx"]``.
       * @minItems 1
       * @maxItems 10
       * @uniqueItems true
       */
      KafkaBootstrapServers?: string[];
    };
  };
  /**
   * Specific configuration settings for an Amazon Managed Streaming for Apache Kafka (Amazon MSK) event
   * source.
   */
  AmazonManagedKafkaEventSourceConfig?: {
    /**
     * The identifier for the Kafka consumer group to join. The consumer group ID must be unique among all
     * your Kafka event sources. After creating a Kafka event source mapping with the consumer group ID
     * specified, you cannot update this value. For more information, see [Customizable consumer group
     * ID](https://docs.aws.amazon.com/lambda/latest/dg/with-msk.html#services-msk-consumer-group-id).
     */
    ConsumerGroupId?: string;
    /** Specific configuration settings for a Kafka schema registry. */
    SchemaRegistryConfig?: {
      /**
       * The URI for your schema registry. The correct URI format depends on the type of schema registry
       * you're using.
       * +  For GLU schema registries, use the ARN of the registry.
       * +  For Confluent schema registries, use the URL of the registry.
       * @minLength 1
       * @maxLength 10000
       * @pattern [a-zA-Z0-9-/*:_+=.@-]*
       */
      SchemaRegistryURI?: string;
      /**
       * The record format that Lambda delivers to your function after schema validation.
       * +  Choose ``JSON`` to have Lambda deliver the record to your function as a standard JSON object.
       * +  Choose ``SOURCE`` to have Lambda deliver the record to your function in its original source
       * format. Lambda removes all schema metadata, such as the schema ID, before sending the record to
       * your function.
       * @enum ["JSON","SOURCE"]
       */
      EventRecordFormat?: "JSON" | "SOURCE";
      /**
       * An array of access configuration objects that tell Lambda how to authenticate with your schema
       * registry.
       * @maxItems 2
       * @uniqueItems true
       */
      AccessConfigs?: ({
        /**
         * The type of authentication Lambda uses to access your schema registry.
         * @enum ["BASIC_AUTH","CLIENT_CERTIFICATE_TLS_AUTH","SERVER_ROOT_CA_CERTIFICATE"]
         */
        Type?: "BASIC_AUTH" | "CLIENT_CERTIFICATE_TLS_AUTH" | "SERVER_ROOT_CA_CERTIFICATE";
        /**
         * The URI of the secret (Secrets Manager secret ARN) to authenticate with your schema registry.
         * @minLength 1
         * @maxLength 10000
         * @pattern arn:(aws[a-zA-Z0-9-]*):([a-zA-Z0-9\-])+:((eusc-)?[a-z]{2}((-gov)|(-iso([a-z]?)))?-[a-z]+-\d{1})?:(\d{12})?:(.*)
         */
        URI?: string;
      })[];
      /**
       * An array of schema validation configuration objects, which tell Lambda the message attributes you
       * want to validate and filter using your schema registry.
       * @minItems 1
       * @maxItems 2
       * @uniqueItems true
       */
      SchemaValidationConfigs?: ({
        /**
         * The attributes you want your schema registry to validate and filter for. If you selected ``JSON``
         * as the ``EventRecordFormat``, Lambda also deserializes the selected message attributes.
         * @enum ["KEY","VALUE"]
         */
        Attribute?: "KEY" | "VALUE";
      })[];
    };
  };
  /** Specific configuration settings for a self-managed Apache Kafka event source. */
  SelfManagedKafkaEventSourceConfig?: {
    /**
     * The identifier for the Kafka consumer group to join. The consumer group ID must be unique among all
     * your Kafka event sources. After creating a Kafka event source mapping with the consumer group ID
     * specified, you cannot update this value. For more information, see [Customizable consumer group
     * ID](https://docs.aws.amazon.com/lambda/latest/dg/with-kafka-process.html#services-smaa-topic-add).
     */
    ConsumerGroupId?: string;
    /** Specific configuration settings for a Kafka schema registry. */
    SchemaRegistryConfig?: {
      /**
       * The URI for your schema registry. The correct URI format depends on the type of schema registry
       * you're using.
       * +  For GLU schema registries, use the ARN of the registry.
       * +  For Confluent schema registries, use the URL of the registry.
       * @minLength 1
       * @maxLength 10000
       * @pattern [a-zA-Z0-9-/*:_+=.@-]*
       */
      SchemaRegistryURI?: string;
      /**
       * The record format that Lambda delivers to your function after schema validation.
       * +  Choose ``JSON`` to have Lambda deliver the record to your function as a standard JSON object.
       * +  Choose ``SOURCE`` to have Lambda deliver the record to your function in its original source
       * format. Lambda removes all schema metadata, such as the schema ID, before sending the record to
       * your function.
       * @enum ["JSON","SOURCE"]
       */
      EventRecordFormat?: "JSON" | "SOURCE";
      /**
       * An array of access configuration objects that tell Lambda how to authenticate with your schema
       * registry.
       * @maxItems 2
       * @uniqueItems true
       */
      AccessConfigs?: ({
        /**
         * The type of authentication Lambda uses to access your schema registry.
         * @enum ["BASIC_AUTH","CLIENT_CERTIFICATE_TLS_AUTH","SERVER_ROOT_CA_CERTIFICATE"]
         */
        Type?: "BASIC_AUTH" | "CLIENT_CERTIFICATE_TLS_AUTH" | "SERVER_ROOT_CA_CERTIFICATE";
        /**
         * The URI of the secret (Secrets Manager secret ARN) to authenticate with your schema registry.
         * @minLength 1
         * @maxLength 10000
         * @pattern arn:(aws[a-zA-Z0-9-]*):([a-zA-Z0-9\-])+:((eusc-)?[a-z]{2}((-gov)|(-iso([a-z]?)))?-[a-z]+-\d{1})?:(\d{12})?:(.*)
         */
        URI?: string;
      })[];
      /**
       * An array of schema validation configuration objects, which tell Lambda the message attributes you
       * want to validate and filter using your schema registry.
       * @minItems 1
       * @maxItems 2
       * @uniqueItems true
       */
      SchemaValidationConfigs?: ({
        /**
         * The attributes you want your schema registry to validate and filter for. If you selected ``JSON``
         * as the ``EventRecordFormat``, Lambda also deserializes the selected message attributes.
         * @enum ["KEY","VALUE"]
         */
        Attribute?: "KEY" | "VALUE";
      })[];
    };
  };
  /**
   * This property is for Amazon SQS event sources only. You cannot use ``ProvisionedPollerConfig``
   * while using ``ScalingConfig``. These options are mutually exclusive. To remove the scaling
   * configuration, pass an empty value.
   */
  ScalingConfig?: {
    /** Limits the number of concurrent instances that the SQS event source can invoke. */
    MaximumConcurrency?: number;
  };
  /** Specific configuration settings for a DocumentDB event source. */
  DocumentDBEventSourceConfig?: {
    /**
     * The name of the database to consume within the DocumentDB cluster.
     * @minLength 1
     * @maxLength 63
     */
    DatabaseName?: string;
    /**
     * The name of the collection to consume within the database. If you do not specify a collection,
     * Lambda consumes all collections.
     * @minLength 1
     * @maxLength 57
     */
    CollectionName?: string;
    /**
     * Determines what DocumentDB sends to your event stream during document update operations. If set to
     * UpdateLookup, DocumentDB sends a delta describing the changes, along with a copy of the entire
     * document. Otherwise, DocumentDB sends only a partial document that contains the changes.
     * @enum ["UpdateLookup","Default"]
     */
    FullDocument?: "UpdateLookup" | "Default";
  };
  /**
   * (Amazon SQS, Amazon MSK, and self-managed Apache Kafka only) The provisioned mode configuration for
   * the event source. For more information, see [provisioned
   * mode](https://docs.aws.amazon.com/lambda/latest/dg/invocation-eventsourcemapping.html#invocation-eventsourcemapping-provisioned-mode).
   */
  ProvisionedPollerConfig?: {
    /**
     * The minimum number of event pollers this event source can scale down to. For Amazon SQS events
     * source mappings, default is 2, and minimum 2 required. For Amazon MSK and self-managed Apache Kafka
     * event source mappings, default is 1.
     * @minimum 1
     * @maximum 200
     */
    MinimumPollers?: number;
    /**
     * The maximum number of event pollers this event source can scale up to. For Amazon SQS events source
     * mappings, default is 200, and minimum value allowed is 2. For Amazon MSK and self-managed Apache
     * Kafka event source mappings, default is 200, and minimum value allowed is 1.
     * @minimum 1
     * @maximum 2000
     */
    MaximumPollers?: number;
    /**
     * @minLength 0
     * @maxLength 128
     */
    PollerGroupName?: string;
  };
  /**
   * The metrics configuration for your event source. For more information, see [Event source mapping
   * metrics](https://docs.aws.amazon.com/lambda/latest/dg/monitoring-metrics-types.html#event-source-mapping-metrics).
   */
  MetricsConfig?: {
    /**
     * The metrics you want your event source mapping to produce. Include ``EventCount`` to receive event
     * source mapping metrics related to the number of events processed by your event source mapping. For
     * more information about these metrics, see [Event source mapping
     * metrics](https://docs.aws.amazon.com/lambda/latest/dg/monitoring-metrics-types.html#event-source-mapping-metrics).
     * @minItems 0
     * @maxItems 3
     * @uniqueItems true
     */
    Metrics?: ("EventCount" | "ErrorCount" | "KafkaMetrics")[];
  };
  /** The function's Amazon CloudWatch Logs configuration settings. */
  LoggingConfig?: {
    /**
     * Set this property to filter the system logs for your function that Lambda sends to CloudWatch.
     * Lambda only sends system logs at the selected level of detail and lower, where ``DEBUG`` is the
     * highest level and ``WARN`` is the lowest.
     * @enum ["DEBUG","INFO","WARN"]
     */
    SystemLogLevel?: "DEBUG" | "INFO" | "WARN";
  };
};
