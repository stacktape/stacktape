// This file is auto-generated. Do not edit manually.
// Source: aws-cloudtrail-trail.json

/**
 * Creates a trail that specifies the settings for delivery of log data to an Amazon S3 bucket. A
 * maximum of five trails can exist in a region, irrespective of the region in which they were
 * created.
 */
export type AwsCloudtrailTrail = {
  /** Specifies whether the trail is publishing events from global services such as IAM to the log files. */
  IncludeGlobalServiceEvents?: boolean;
  /**
   * Use event selectors to further specify the management and data event settings for your trail. By
   * default, trails created without specific event selectors will be configured to log all read and
   * write management events, and no data events. When an event occurs in your account, CloudTrail
   * evaluates the event selector for all trails. For each trail, if the event matches any event
   * selector, the trail processes and logs the event. If the event doesn't match any event selector,
   * the trail doesn't log the event. You can configure up to five event selectors for a trail.
   * @maxItems 5
   * @uniqueItems true
   */
  EventSelectors?: ({
    /** Specify if you want your event selector to include management events for your trail. */
    IncludeManagementEvents?: boolean;
    /**
     * Specify if you want your trail to log read-only events, write-only events, or all. For example, the
     * EC2 GetConsoleOutput is a read-only API operation and RunInstances is a write-only API operation.
     * @enum ["All","ReadOnly","WriteOnly"]
     */
    ReadWriteType?: "All" | "ReadOnly" | "WriteOnly";
    /**
     * An optional list of service event sources from which you do not want management events to be logged
     * on your trail. In this release, the list can be empty (disables the filter), or it can filter out
     * AWS Key Management Service events by containing "kms.amazonaws.com". By default,
     * ExcludeManagementEventSources is empty, and AWS KMS events are included in events that are logged
     * to your trail.
     * @uniqueItems true
     */
    ExcludeManagementEventSources?: string[];
    /** @uniqueItems true */
    DataResources?: {
      /**
       * The resource type in which you want to log data events. You can specify AWS::S3::Object or
       * AWS::Lambda::Function resources.
       */
      Type: string;
      /**
       * An array of Amazon Resource Name (ARN) strings or partial ARN strings for the specified objects.
       * @uniqueItems true
       */
      Values?: string[];
    }[];
  })[];
  /**
   * Specifies the KMS key ID to use to encrypt the logs delivered by CloudTrail. The value can be an
   * alias name prefixed by 'alias/', a fully specified ARN to an alias, a fully specified ARN to a key,
   * or a globally unique identifier.
   */
  KMSKeyId?: string;
  /**
   * Specifies the aggregation configuration to aggregate CloudTrail Events. A maximum of 1 aggregation
   * configuration is allowed.
   * @maxItems 1
   * @uniqueItems true
   */
  AggregationConfigurations?: ({
    /**
     * The category of events to be aggregated.
     * @enum ["Data"]
     */
    EventCategory: "Data";
    /**
     * Contains all templates in an aggregation configuration.
     * @minItems 1
     * @maxItems 50
     * @uniqueItems true
     */
    Templates: ("API_ACTIVITY" | "RESOURCE_ACCESS" | "USER_ACTIONS")[];
  })[];
  /** Specifies the role for the CloudWatch Logs endpoint to assume to write to a user's log group. */
  CloudWatchLogsRoleArn?: string;
  /**
   * Specifies the Amazon S3 key prefix that comes after the name of the bucket you have designated for
   * log file delivery. For more information, see Finding Your CloudTrail Log Files. The maximum length
   * is 200 characters.
   * @maxLength 200
   */
  S3KeyPrefix?: string;
  /**
   * The advanced event selectors that were used to select events for the data store.
   * @uniqueItems true
   */
  AdvancedEventSelectors?: {
    /**
     * Contains all selector statements in an advanced event selector.
     * @minItems 1
     * @uniqueItems true
     */
    FieldSelectors: {
      /**
       * A field in an event record on which to filter events to be logged. Supported fields include
       * readOnly, eventCategory, eventSource (for management events), eventName, resources.type, and
       * resources.ARN.
       * @minLength 1
       * @maxLength 1000
       * @pattern ([\w|\d|\.|_]+)
       */
      Field: string;
      /**
       * An operator that includes events that match the exact value of the event record field specified as
       * the value of Field. This is the only valid operator that you can use with the readOnly,
       * eventCategory, and resources.type fields.
       * @minItems 1
       * @uniqueItems true
       */
      Equals?: string[];
      /**
       * An operator that excludes events that match the first few characters of the event record field
       * specified as the value of Field.
       * @minItems 1
       * @uniqueItems true
       */
      NotStartsWith?: string[];
      /**
       * An operator that excludes events that match the last few characters of the event record field
       * specified as the value of Field.
       * @minItems 1
       * @uniqueItems true
       */
      NotEndsWith?: string[];
      /**
       * An operator that includes events that match the first few characters of the event record field
       * specified as the value of Field.
       * @minItems 1
       * @uniqueItems true
       */
      StartsWith?: string[];
      /**
       * An operator that includes events that match the last few characters of the event record field
       * specified as the value of Field.
       * @minItems 1
       * @uniqueItems true
       */
      EndsWith?: string[];
      /**
       * An operator that excludes events that match the exact value of the event record field specified as
       * the value of Field.
       * @minItems 1
       * @uniqueItems true
       */
      NotEquals?: string[];
    }[];
    /**
     * An optional, descriptive name for an advanced event selector, such as "Log data events for only two
     * S3 buckets".
     * @minLength 1
     * @maxLength 1000
     */
    Name?: string;
  }[];
  /**
   * @minLength 3
   * @maxLength 128
   * @pattern (^[a-zA-Z0-9]$)|(^[a-zA-Z0-9]([a-zA-Z0-9\._-])*[a-zA-Z0-9]$)
   */
  TrailName?: string;
  /**
   * Specifies whether the trail is created for all accounts in an organization in AWS Organizations, or
   * only for the current AWS account. The default is false, and cannot be true unless the call is made
   * on behalf of an AWS account that is the master account for an organization in AWS Organizations.
   */
  IsOrganizationTrail?: boolean;
  /**
   * Lets you enable Insights event logging by specifying the Insights selectors that you want to enable
   * on an existing trail.
   * @uniqueItems true
   */
  InsightSelectors?: ({
    /** The type of insight to log on a trail. */
    InsightType?: string;
    /**
     * The categories of events for which to log insights. By default, insights are logged for management
     * events only.
     * @uniqueItems true
     */
    EventCategories?: ("Management" | "Data")[];
  })[];
  /**
   * Specifies a log group name using an Amazon Resource Name (ARN), a unique identifier that represents
   * the log group to which CloudTrail logs will be delivered. Not required unless you specify
   * CloudWatchLogsRoleArn.
   */
  CloudWatchLogsLogGroupArn?: string;
  /**
   * Specifies the name of the Amazon SNS topic defined for notification of log file delivery. The
   * maximum length is 256 characters.
   * @maxLength 256
   */
  SnsTopicName?: string;
  /**
   * Specifies whether the trail applies only to the current region or to all regions. The default is
   * false. If the trail exists only in the current region and this value is set to true, shadow trails
   * (replications of the trail) will be created in the other regions. If the trail exists in all
   * regions and this value is set to false, the trail will remain in the region where it was created,
   * and its shadow trails in other regions will be deleted. As a best practice, consider using trails
   * that log events in all regions.
   */
  IsMultiRegionTrail?: boolean;
  /**
   * Specifies the name of the Amazon S3 bucket designated for publishing log files. See Amazon S3
   * Bucket Naming Requirements.
   */
  S3BucketName: string;
  SnsTopicArn?: string;
  /** Specifies whether log file validation is enabled. The default is false. */
  EnableLogFileValidation?: boolean;
  Arn?: string;
  /** @uniqueItems false */
  Tags?: {
    /**
     * The value for the tag. You can specify a value that is 1 to 255 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     */
    Value: string;
    /**
     * The key name of the tag. You can specify a value that is 1 to 127 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     */
    Key: string;
  }[];
  /** Whether the CloudTrail is currently logging AWS API calls. */
  IsLogging: boolean;
};
