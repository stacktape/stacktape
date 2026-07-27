// This file is auto-generated. Do not edit manually.
// Source: aws-dynamodb-table.json

/**
 * The ``AWS::DynamoDB::Table`` resource creates a DDB table. For more information, see
 * [CreateTable](https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_CreateTable.html)
 * in the *API Reference*.
 * You should be aware of the following behaviors when working with DDB tables:
 * +  CFNlong typically creates DDB tables in parallel. However, if your template includes multiple
 * DDB tables with indexes, you must declare dependencies so that the tables are created sequentially.
 * DDBlong limits the number of tables with secondary indexes that are in the creating state. If you
 * create multiple tables with indexes at the same time, DDB returns an error and the stack operation
 * fails. For an example, see [DynamoDB Table with a DependsOn
 * Attribute](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-dynamodb-table.html#aws-resource-dynamodb-table--examples--DynamoDB_Table_with_a_DependsOn_Attribute).
 * Our guidance is to use the latest schema documented for your CFNlong templates. This schema
 * supports the provisioning of all table settings below. When using this schema in your CFNlong
 * templates, please ensure that your Identity and Access Management (IAM) policies are updated with
 * appropriate permissions to allow for the authorization of these setting changes.
 */
export type AwsDynamodbTable = {
  /**
   * Sets the maximum number of read and write units for the specified on-demand table. If you use this
   * property, you must specify ``MaxReadRequestUnits``, ``MaxWriteRequestUnits``, or both.
   */
  OnDemandThroughput?: {
    /**
     * Maximum number of read request units for the specified table.
     * To specify a maximum ``OnDemandThroughput`` on your table, set the value of
     * ``MaxReadRequestUnits`` as greater than or equal to 1. To remove the maximum ``OnDemandThroughput``
     * that is currently set on your table, set the value of ``MaxReadRequestUnits`` to -1.
     * @minimum 1
     */
    MaxReadRequestUnits?: number;
    /**
     * Maximum number of write request units for the specified table.
     * To specify a maximum ``OnDemandThroughput`` on your table, set the value of
     * ``MaxWriteRequestUnits`` as greater than or equal to 1. To remove the maximum
     * ``OnDemandThroughput`` that is currently set on your table, set the value of
     * ``MaxWriteRequestUnits`` to -1.
     * @minimum 1
     */
    MaxWriteRequestUnits?: number;
  };
  /** Specifies the settings to enable server-side encryption. */
  SSESpecification?: {
    /**
     * Indicates whether server-side encryption is done using an AWS managed key or an AWS owned key. If
     * enabled (true), server-side encryption type is set to ``KMS`` and an AWS managed key is used (KMS
     * charges apply). If disabled (false) or not specified, server-side encryption is set to AWS owned
     * key.
     */
    SSEEnabled: boolean;
    /**
     * Server-side encryption type. The only supported value is:
     * +  ``KMS`` - Server-side encryption that uses KMSlong. The key is stored in your account and is
     * managed by KMS (KMS charges apply).
     */
    SSEType?: string;
    /**
     * The KMS key that should be used for the KMS encryption. To specify a key, use its key ID, Amazon
     * Resource Name (ARN), alias name, or alias ARN. Note that you should only provide this parameter if
     * the key is different from the default DynamoDB key ``alias/aws/dynamodb``.
     */
    KMSMasterKeyId?: unknown | unknown | unknown;
  };
  /** The Kinesis Data Streams configuration for the specified table. */
  KinesisStreamSpecification?: {
    /**
     * The precision for the time and date that the stream was created.
     * @enum ["MICROSECOND","MILLISECOND"]
     */
    ApproximateCreationDateTimePrecision?: "MICROSECOND" | "MILLISECOND";
    /**
     * The ARN for a specific Kinesis data stream.
     * Length Constraints: Minimum length of 37. Maximum length of 1024.
     */
    StreamArn: string;
  };
  /**
   * The settings for the DDB table stream, which captures changes to items stored in the table.
   * Including this property in your CFNlong template automatically enables streaming.
   */
  StreamSpecification?: {
    /**
     * When an item in the table is modified, ``StreamViewType`` determines what information is written to
     * the stream for this table. Valid values for ``StreamViewType`` are:
     * +  ``KEYS_ONLY`` - Only the key attributes of the modified item are written to the stream.
     * +  ``NEW_IMAGE`` - The entire item, as it appears after it was modified, is written to the
     * stream.
     * +  ``OLD_IMAGE`` - The entire item, as it appeared before it was modified, is written to the
     * stream.
     * +  ``NEW_AND_OLD_IMAGES`` - Both the new and the old item images of the item are written to the
     * stream.
     */
    StreamViewType: string;
    /**
     * Creates or updates a resource-based policy document that contains the permissions for DDB
     * resources, such as a table's streams. Resource-based policies let you define access permissions by
     * specifying who has access to each resource, and the actions they are allowed to perform on each
     * resource.
     * When you remove the ``StreamSpecification`` property from the template, DynamoDB disables the
     * stream but retains any attached resource policy until the stream is deleted after 24 hours. When
     * you modify the ``StreamViewType`` property, DynamoDB creates a new stream and retains the old
     * stream's resource policy. The old stream and its resource policy are deleted after the 24-hour
     * retention period.
     * In a CFNshort template, you can provide the policy in JSON or YAML format because CFNshort
     * converts YAML to JSON before submitting it to DDB. For more information about resource-based
     * policies, see [Using resource-based policies
     * for](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/access-control-resource-based.html)
     * and [Resource-based policy
     * examples](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/rbac-examples.html).
     */
    ResourcePolicy?: {
      /**
       * A resource-based policy document that contains permissions to add to the specified DDB table,
       * index, or both. In a CFNshort template, you can provide the policy in JSON or YAML format because
       * CFNshort converts YAML to JSON before submitting it to DDB. For more information about
       * resource-based policies, see [Using resource-based policies
       * for](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/access-control-resource-based.html)
       * and [Resource-based policy
       * examples](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/rbac-examples.html).
       */
      PolicyDocument: Record<string, unknown>;
    };
  };
  /**
   * The settings used to specify whether to enable CloudWatch Contributor Insights for the table and
   * define which events to monitor.
   */
  ContributorInsightsSpecification?: {
    /**
     * Specifies the CloudWatch Contributor Insights mode for a table. Valid values are
     * ``ACCESSED_AND_THROTTLED_KEYS`` (tracks all access and throttled events) or ``THROTTLED_KEYS``
     * (tracks only throttled events). This setting determines what type of contributor insights data is
     * collected for the table.
     * @enum ["ACCESSED_AND_THROTTLED_KEYS","THROTTLED_KEYS"]
     */
    Mode?: "ACCESSED_AND_THROTTLED_KEYS" | "THROTTLED_KEYS";
    /** Indicates whether CloudWatch Contributor Insights are to be enabled (true) or disabled (false). */
    Enabled: boolean;
  };
  /**
   * Specifies the properties of data being imported from the S3 bucket source to the" table.
   * If you specify the ``ImportSourceSpecification`` property, and also specify either the
   * ``StreamSpecification``, the ``TableClass`` property, the ``DeletionProtectionEnabled`` property,
   * or the ``WarmThroughput`` property, the IAM entity creating/updating stack must have
   * ``UpdateTable`` permission.
   */
  ImportSourceSpecification?: {
    /** The S3 bucket that provides the source for the import. */
    S3BucketSource: {
      /** The S3 bucket that is being imported from. */
      S3Bucket: string;
      /** The key prefix shared by all S3 Objects that are being imported. */
      S3KeyPrefix?: string;
      /**
       * The account number of the S3 bucket that is being imported from. If the bucket is owned by the
       * requester this is optional.
       */
      S3BucketOwner?: string;
    };
    /**
     * The format of the source data. Valid values for ``ImportFormat`` are ``CSV``, ``DYNAMODB_JSON`` or
     * ``ION``.
     */
    InputFormat: string;
    /** Additional properties that specify how the input is formatted, */
    InputFormatOptions?: {
      /** The options for imported source files in CSV format. The values are Delimiter and HeaderList. */
      Csv?: {
        /** The delimiter used for separating items in the CSV file being imported. */
        Delimiter?: string;
        /**
         * List of the headers used to specify a common header for all source CSV files being imported. If
         * this field is specified then the first line of each CSV file is treated as data instead of the
         * header. If this field is not specified the the first line of each CSV file is treated as the
         * header.
         * @uniqueItems true
         */
        HeaderList?: string[];
      };
    };
    /** Type of compression to be used on the input coming from the imported table. */
    InputCompressionType?: string;
  };
  /** The settings used to enable point in time recovery. */
  PointInTimeRecoverySpecification?: {
    /** Indicates whether point in time recovery is enabled (true) or disabled (false) on the table. */
    PointInTimeRecoveryEnabled?: boolean;
    /**
     * The number of preceding days for which continuous backups are taken and maintained. Your table data
     * is only recoverable to any point-in-time from within the configured recovery period. This parameter
     * is optional. If no value is provided, the value will default to 35.
     * @minimum 1
     * @maximum 35
     */
    RecoveryPeriodInDays?: number;
  };
  /**
   * Throughput for the specified table, which consists of values for ``ReadCapacityUnits`` and
   * ``WriteCapacityUnits``. For more information about the contents of a provisioned throughput
   * structure, see [Amazon DynamoDB Table
   * ProvisionedThroughput](https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_ProvisionedThroughput.html).
   * If you set ``BillingMode`` as ``PROVISIONED``, you must specify this property. If you set
   * ``BillingMode`` as ``PAY_PER_REQUEST``, you cannot specify this property.
   */
  ProvisionedThroughput?: {
    /**
     * The maximum number of writes consumed per second before DynamoDB returns a ``ThrottlingException``.
     * For more information, see [Specifying Read and Write
     * Requirements](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/ProvisionedThroughput.html)
     * in the *Amazon DynamoDB Developer Guide*.
     * If read/write capacity mode is ``PAY_PER_REQUEST`` the value is set to 0.
     */
    WriteCapacityUnits: number;
    /**
     * The maximum number of strongly consistent reads consumed per second before DynamoDB returns a
     * ``ThrottlingException``. For more information, see [Specifying Read and Write
     * Requirements](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/ProvisionedThroughput.html)
     * in the *Amazon DynamoDB Developer Guide*.
     * If read/write capacity mode is ``PAY_PER_REQUEST`` the value is set to 0.
     */
    ReadCapacityUnits: number;
  };
  /**
   * Represents the warm throughput (in read units per second and write units per second) for creating a
   * table.
   */
  WarmThroughput?: unknown | unknown;
  /**
   * A name for the table. If you don't specify a name, CFNlong generates a unique physical ID and uses
   * that ID for the table name. For more information, see [Name
   * Type](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-name.html).
   * If you specify a name, you cannot perform updates that require replacement of this resource. You
   * can perform updates that require no or some interruption. If you must replace the resource, specify
   * a new name.
   */
  TableName?: string;
  /**
   * A list of attributes that describe the key schema for the table and indexes.
   * This property is required to create a DDB table.
   * Update requires: [Some
   * interruptions](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/using-cfn-updating-stacks-update-behaviors.html#update-some-interrupt).
   * Replacement if you edit an existing AttributeDefinition.
   * @uniqueItems true
   */
  AttributeDefinitions?: {
    /**
     * The data type for the attribute, where:
     * +  ``S`` - the attribute is of type String
     * +  ``N`` - the attribute is of type Number
     * +  ``B`` - the attribute is of type Binary
     */
    AttributeType: string;
    /** A name for the attribute. */
    AttributeName: string;
  }[];
  /**
   * Global secondary indexes to be created on the table. You can create up to 20 global secondary
   * indexes.
   * If you update a table to include a new global secondary index, CFNlong initiates the index
   * creation and then proceeds with the stack update. CFNlong doesn't wait for the index to complete
   * creation because the backfilling phase can take a long time, depending on the size of the table.
   * You can't use the index or update the table until the index's status is ``ACTIVE``. You can track
   * its status by using the DynamoDB
   * [DescribeTable](https://docs.aws.amazon.com/cli/latest/reference/dynamodb/describe-table.html)
   * command.
   * If you add or delete an index during an update, we recommend that you don't update any other
   * resources. If your stack fails to update and is rolled back while adding a new index, you must
   * manually delete the index.
   * Updates are not supported. The following are exceptions:
   * +  If you update either the contributor insights specification or the provisioned throughput
   * values of global secondary indexes, you can update the table without interruption.
   * +  You can delete or add one global secondary index without interruption. If you do both in the
   * same update (for example, by changing the index's logical ID), the update fails.
   * @uniqueItems false
   */
  GlobalSecondaryIndexes?: ({
    /**
     * The name of the global secondary index. The name must be unique among all other indexes on this
     * table.
     */
    IndexName: string;
    /**
     * The maximum number of read and write units for the specified global secondary index. If you use
     * this parameter, you must specify ``MaxReadRequestUnits``, ``MaxWriteRequestUnits``, or both. You
     * must use either ``OnDemandThroughput`` or ``ProvisionedThroughput`` based on your table's capacity
     * mode.
     */
    OnDemandThroughput?: {
      /**
       * Maximum number of read request units for the specified table.
       * To specify a maximum ``OnDemandThroughput`` on your table, set the value of
       * ``MaxReadRequestUnits`` as greater than or equal to 1. To remove the maximum ``OnDemandThroughput``
       * that is currently set on your table, set the value of ``MaxReadRequestUnits`` to -1.
       * @minimum 1
       */
      MaxReadRequestUnits?: number;
      /**
       * Maximum number of write request units for the specified table.
       * To specify a maximum ``OnDemandThroughput`` on your table, set the value of
       * ``MaxWriteRequestUnits`` as greater than or equal to 1. To remove the maximum
       * ``OnDemandThroughput`` that is currently set on your table, set the value of
       * ``MaxWriteRequestUnits`` to -1.
       * @minimum 1
       */
      MaxWriteRequestUnits?: number;
    };
    /**
     * The settings used to specify whether to enable CloudWatch Contributor Insights for the global table
     * and define which events to monitor.
     */
    ContributorInsightsSpecification?: {
      /**
       * Specifies the CloudWatch Contributor Insights mode for a table. Valid values are
       * ``ACCESSED_AND_THROTTLED_KEYS`` (tracks all access and throttled events) or ``THROTTLED_KEYS``
       * (tracks only throttled events). This setting determines what type of contributor insights data is
       * collected for the table.
       * @enum ["ACCESSED_AND_THROTTLED_KEYS","THROTTLED_KEYS"]
       */
      Mode?: "ACCESSED_AND_THROTTLED_KEYS" | "THROTTLED_KEYS";
      /** Indicates whether CloudWatch Contributor Insights are to be enabled (true) or disabled (false). */
      Enabled: boolean;
    };
    /**
     * Represents attributes that are copied (projected) from the table into the global secondary index.
     * These are in addition to the primary key attributes and index key attributes, which are
     * automatically projected.
     */
    Projection: {
      /**
       * Represents the non-key attribute names which will be projected into the index.
       * For global and local secondary indexes, the total count of ``NonKeyAttributes`` summed across all
       * of the secondary indexes, must not exceed 100. If you project the same attribute into two different
       * indexes, this counts as two distinct attributes when determining the total. This limit only applies
       * when you specify the ProjectionType of ``INCLUDE``. You still can specify the ProjectionType of
       * ``ALL`` to project all attributes from the source table, even if the table has more than 100
       * attributes.
       * @uniqueItems false
       */
      NonKeyAttributes?: string[];
      /**
       * The set of attributes that are projected into the index:
       * +  ``KEYS_ONLY`` - Only the index and primary keys are projected into the index.
       * +  ``INCLUDE`` - In addition to the attributes described in ``KEYS_ONLY``, the secondary index
       * will include other non-key attributes that you specify.
       * +  ``ALL`` - All of the table attributes are projected into the index.
       * When using the DynamoDB console, ``ALL`` is selected by default.
       */
      ProjectionType?: string;
    };
    /**
     * Represents the provisioned throughput settings for the specified global secondary index. You must
     * use either ``OnDemandThroughput`` or ``ProvisionedThroughput`` based on your table's capacity mode.
     * For current minimum and maximum provisioned throughput values, see [Service, Account, and Table
     * Quotas](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Limits.html) in the
     * *Amazon DynamoDB Developer Guide*.
     */
    ProvisionedThroughput?: {
      /**
       * The maximum number of writes consumed per second before DynamoDB returns a ``ThrottlingException``.
       * For more information, see [Specifying Read and Write
       * Requirements](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/ProvisionedThroughput.html)
       * in the *Amazon DynamoDB Developer Guide*.
       * If read/write capacity mode is ``PAY_PER_REQUEST`` the value is set to 0.
       */
      WriteCapacityUnits: number;
      /**
       * The maximum number of strongly consistent reads consumed per second before DynamoDB returns a
       * ``ThrottlingException``. For more information, see [Specifying Read and Write
       * Requirements](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/ProvisionedThroughput.html)
       * in the *Amazon DynamoDB Developer Guide*.
       * If read/write capacity mode is ``PAY_PER_REQUEST`` the value is set to 0.
       */
      ReadCapacityUnits: number;
    };
    /**
     * The complete key schema for a global secondary index, which consists of one or more pairs of
     * attribute names and key types:
     * +  ``HASH`` - partition key
     * +  ``RANGE`` - sort key
     * The partition key of an item is also known as its *hash attribute*. The term "hash attribute"
     * derives from DynamoDB's usage of an internal hash function to evenly distribute data items across
     * partitions, based on their partition key values.
     * The sort key of an item is also known as its *range attribute*. The term "range attribute" derives
     * from the way DynamoDB stores items with the same partition key physically close together, in sorted
     * order by the sort key value.
     * @uniqueItems true
     */
    KeySchema: {
      /**
       * The role that this key attribute will assume:
       * +  ``HASH`` - partition key
       * +  ``RANGE`` - sort key
       * The partition key of an item is also known as its *hash attribute*. The term "hash attribute"
       * derives from DynamoDB's usage of an internal hash function to evenly distribute data items across
       * partitions, based on their partition key values.
       * The sort key of an item is also known as its *range attribute*. The term "range attribute" derives
       * from the way DynamoDB stores items with the same partition key physically close together, in sorted
       * order by the sort key value.
       */
      KeyType: string;
      /** The name of a key attribute. */
      AttributeName: string;
    }[];
    /**
     * Represents the warm throughput value (in read units per second and write units per second) for the
     * specified secondary index. If you use this parameter, you must specify ``ReadUnitsPerSecond``,
     * ``WriteUnitsPerSecond``, or both.
     */
    WarmThroughput?: unknown | unknown;
  })[];
  /**
   * Specify how you are charged for read and write throughput and how you manage capacity.
   * Valid values include:
   * +  ``PAY_PER_REQUEST`` - We recommend using ``PAY_PER_REQUEST`` for most DynamoDB workloads.
   * ``PAY_PER_REQUEST`` sets the billing mode to [On-demand capacity
   * mode](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/on-demand-capacity-mode.html).
   * +  ``PROVISIONED`` - We recommend using ``PROVISIONED`` for steady workloads with predictable
   * growth where capacity requirements can be reliably forecasted. ``PROVISIONED`` sets the billing
   * mode to [Provisioned capacity
   * mode](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/provisioned-capacity-mode.html).
   * If not specified, the default is ``PROVISIONED``.
   */
  BillingMode?: string;
  /**
   * An AWS resource-based policy document in JSON format that will be attached to the table.
   * When you attach a resource-based policy while creating a table, the policy application is
   * *strongly consistent*.
   * The maximum size supported for a resource-based policy document is 20 KB. DynamoDB counts
   * whitespaces when calculating the size of a policy against this limit. For a full list of all
   * considerations that apply for resource-based policies, see [Resource-based policy
   * considerations](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/rbac-considerations.html).
   * You need to specify the ``CreateTable`` and ``PutResourcePolicy`` IAM actions for authorizing a
   * user to create a table with a resource-based policy.
   */
  ResourcePolicy?: {
    /**
     * A resource-based policy document that contains permissions to add to the specified DDB table,
     * index, or both. In a CFNshort template, you can provide the policy in JSON or YAML format because
     * CFNshort converts YAML to JSON before submitting it to DDB. For more information about
     * resource-based policies, see [Using resource-based policies
     * for](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/access-control-resource-based.html)
     * and [Resource-based policy
     * examples](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/rbac-examples.html).
     */
    PolicyDocument: Record<string, unknown>;
  };
  /**
   * Local secondary indexes to be created on the table. You can create up to 5 local secondary indexes.
   * Each index is scoped to a given hash key value. The size of each hash key can be up to 10
   * gigabytes.
   * @uniqueItems false
   */
  LocalSecondaryIndexes?: {
    /**
     * The name of the local secondary index. The name must be unique among all other indexes on this
     * table.
     */
    IndexName: string;
    /**
     * Represents attributes that are copied (projected) from the table into the local secondary index.
     * These are in addition to the primary key attributes and index key attributes, which are
     * automatically projected.
     */
    Projection: {
      /**
       * Represents the non-key attribute names which will be projected into the index.
       * For global and local secondary indexes, the total count of ``NonKeyAttributes`` summed across all
       * of the secondary indexes, must not exceed 100. If you project the same attribute into two different
       * indexes, this counts as two distinct attributes when determining the total. This limit only applies
       * when you specify the ProjectionType of ``INCLUDE``. You still can specify the ProjectionType of
       * ``ALL`` to project all attributes from the source table, even if the table has more than 100
       * attributes.
       * @uniqueItems false
       */
      NonKeyAttributes?: string[];
      /**
       * The set of attributes that are projected into the index:
       * +  ``KEYS_ONLY`` - Only the index and primary keys are projected into the index.
       * +  ``INCLUDE`` - In addition to the attributes described in ``KEYS_ONLY``, the secondary index
       * will include other non-key attributes that you specify.
       * +  ``ALL`` - All of the table attributes are projected into the index.
       * When using the DynamoDB console, ``ALL`` is selected by default.
       */
      ProjectionType?: string;
    };
    /**
     * The complete key schema for the local secondary index, consisting of one or more pairs of attribute
     * names and key types:
     * +  ``HASH`` - partition key
     * +  ``RANGE`` - sort key
     * The partition key of an item is also known as its *hash attribute*. The term "hash attribute"
     * derives from DynamoDB's usage of an internal hash function to evenly distribute data items across
     * partitions, based on their partition key values.
     * The sort key of an item is also known as its *range attribute*. The term "range attribute" derives
     * from the way DynamoDB stores items with the same partition key physically close together, in sorted
     * order by the sort key value.
     * @uniqueItems true
     */
    KeySchema: {
      /**
       * The role that this key attribute will assume:
       * +  ``HASH`` - partition key
       * +  ``RANGE`` - sort key
       * The partition key of an item is also known as its *hash attribute*. The term "hash attribute"
       * derives from DynamoDB's usage of an internal hash function to evenly distribute data items across
       * partitions, based on their partition key values.
       * The sort key of an item is also known as its *range attribute*. The term "range attribute" derives
       * from the way DynamoDB stores items with the same partition key physically close together, in sorted
       * order by the sort key value.
       */
      KeyType: string;
      /** The name of a key attribute. */
      AttributeName: string;
    }[];
  }[];
  /**
   * Specifies the attributes that make up the primary key for the table. The attributes in the
   * ``KeySchema`` property must also be defined in the ``AttributeDefinitions`` property.
   */
  KeySchema: {
    /**
     * The role that this key attribute will assume:
     * +  ``HASH`` - partition key
     * +  ``RANGE`` - sort key
     * The partition key of an item is also known as its *hash attribute*. The term "hash attribute"
     * derives from DynamoDB's usage of an internal hash function to evenly distribute data items across
     * partitions, based on their partition key values.
     * The sort key of an item is also known as its *range attribute*. The term "range attribute" derives
     * from the way DynamoDB stores items with the same partition key physically close together, in sorted
     * order by the sort key value.
     */
    KeyType: string;
    /** The name of a key attribute. */
    AttributeName: string;
  }[] | Record<string, unknown>;
  Arn?: string;
  StreamArn?: string;
  /**
   * Determines if a table is protected from deletion. When enabled, the table cannot be deleted by any
   * user or process. This setting is disabled by default. For more information, see [Using deletion
   * protection](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/WorkingWithTables.Basics.html#WorkingWithTables.Basics.DeletionProtection)
   * in the *Developer Guide*.
   */
  DeletionProtectionEnabled?: boolean;
  /** The table class of the new table. Valid values are ``STANDARD`` and ``STANDARD_INFREQUENT_ACCESS``. */
  TableClass?: string;
  /**
   * An array of key-value pairs to apply to this resource.
   * For more information, see
   * [Tag](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-resource-tags.html).
   * @uniqueItems false
   */
  Tags?: {
    /** The value of the tag. Tag values are case-sensitive and can be null. */
    Value: string;
    /**
     * The key of the tag. Tag keys are case sensitive. Each DynamoDB table can only have up to one tag
     * with the same key. If you try to add an existing tag (same key), the existing tag value will be
     * updated to the new value.
     */
    Key: string;
  }[];
  /**
   * Specifies the Time to Live (TTL) settings for the table.
   * For detailed information about the limits in DynamoDB, see [Limits in Amazon
   * DynamoDB](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Limits.html) in the
   * Amazon DynamoDB Developer Guide.
   */
  TimeToLiveSpecification?: {
    /** Indicates whether TTL is to be enabled (true) or disabled (false) on the table. */
    Enabled: boolean;
    /**
     * The name of the TTL attribute used to store the expiration time for items in the table.
     * +  The ``AttributeName`` property is required when enabling the TTL, or when TTL is already
     * enabled.
     * +  To update this property, you must first disable TTL and then enable TTL with the new attribute
     * name.
     */
    AttributeName?: string;
  };
};
