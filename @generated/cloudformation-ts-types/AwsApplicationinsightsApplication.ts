// This file is auto-generated. Do not edit manually.
// Source: aws-applicationinsights-application.json

/** Resource Type definition for AWS::ApplicationInsights::Application */
export type AwsApplicationinsightsApplication = {
  /**
   * The name of the resource group.
   * @minLength 1
   * @maxLength 256
   * @pattern [a-zA-Z0-9.-_]*
   */
  ResourceGroupName: string;
  /** The ARN of the ApplicationInsights application. */
  ApplicationARN?: string;
  /**
   * Indicates whether Application Insights can listen to CloudWatch events for the application
   * resources.
   */
  CWEMonitorEnabled?: boolean;
  /** When set to true, creates opsItems for any problems detected on an application. */
  OpsCenterEnabled?: boolean;
  /**
   * The SNS topic provided to Application Insights that is associated to the created opsItem.
   * @minLength 20
   * @maxLength 300
   * @pattern ^arn:aws(-[\w]+)*:[\w\d-]+:([\w\d-]*)?:[\w\d_-]*([:/].+)*$
   */
  OpsItemSNSTopicArn?: string;
  /**
   * Application Insights sends notifications to this SNS topic whenever there is a problem update in
   * the associated application.
   * @minLength 20
   * @maxLength 300
   * @pattern ^arn:aws(-[\w]+)*:[\w\d-]+:([\w\d-]*)?:[\w\d_-]*([:/].+)*$
   */
  SNSNotificationArn?: string;
  /**
   * The tags of Application Insights application.
   * @minItems 1
   */
  Tags?: {
    /**
     * The key name of the tag. You can specify a value that is 1 to 127 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * The value for the tag. You can specify a value that is 1 to 255 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
  /**
   * The custom grouped components.
   * @minItems 1
   */
  CustomComponents?: {
    /**
     * The name of the component.
     * @minLength 1
     * @maxLength 128
     * @pattern ^[\d\w\-_.+]*$
     */
    ComponentName: string;
    /**
     * The list of resource ARNs that belong to the component.
     * @minItems 1
     */
    ResourceList: string[];
  }[];
  /**
   * The log pattern sets.
   * @minItems 1
   */
  LogPatternSets?: {
    /**
     * The name of the log pattern set.
     * @minLength 1
     * @maxLength 30
     * @pattern [a-zA-Z0-9.-_]*
     */
    PatternSetName: string;
    /**
     * The log patterns of a set.
     * @minItems 1
     */
    LogPatterns: {
      /**
       * The name of the log pattern.
       * @minLength 1
       * @maxLength 50
       * @pattern [a-zA-Z0-9.-_]*
       */
      PatternName: string;
      /**
       * The log pattern.
       * @minLength 1
       * @maxLength 50
       */
      Pattern: string;
      /** Rank of the log pattern. */
      Rank: number;
    }[];
  }[];
  /** If set to true, application will be configured with recommended monitoring configuration. */
  AutoConfigurationEnabled?: boolean;
  /**
   * The monitoring settings of the components.
   * @minItems 1
   */
  ComponentMonitoringSettings?: (unknown | unknown)[];
  /**
   * The grouping type of the application
   * @enum ["ACCOUNT_BASED"]
   */
  GroupingType?: "ACCOUNT_BASED";
  /**
   * If set to true, the managed policies for SSM and CW will be attached to the instance roles if they
   * are missing
   */
  AttachMissingPermission?: boolean;
};
