// This file is auto-generated. Do not edit manually.
// Source: aws-iot-mitigationaction.json

/**
 * Mitigation actions can be used to take actions to mitigate issues that were found in an Audit
 * finding or Detect violation.
 */
export type AwsIotMitigationaction = {
  /**
   * A unique identifier for the mitigation action.
   * @minLength 1
   * @maxLength 128
   * @pattern [a-zA-Z0-9:_-]+
   */
  ActionName?: string;
  RoleArn: string;
  /**
   * An array of key-value pairs to apply to this resource.
   * @maxItems 50
   * @uniqueItems true
   */
  Tags?: {
    /**
     * The tag's key.
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * The tag's value.
     * @minLength 1
     * @maxLength 256
     */
    Value: string;
  }[];
  ActionParams: {
    AddThingsToThingGroupParams?: {
      /**
       * Specifies if this mitigation action can move the things that triggered the mitigation action out of
       * one or more dynamic thing groups.
       */
      OverrideDynamicGroups?: boolean;
      /**
       * The list of groups to which you want to add the things that triggered the mitigation action.
       * @minItems 1
       * @maxItems 10
       * @uniqueItems true
       */
      ThingGroupNames: string[];
    };
    EnableIoTLoggingParams?: {
      /**
       * Specifies which types of information are logged.
       * @enum ["DEBUG","INFO","ERROR","WARN","UNSET_VALUE"]
       */
      LogLevel: "DEBUG" | "INFO" | "ERROR" | "WARN" | "UNSET_VALUE";
      /**
       * The ARN of the IAM role used for logging.
       * @minLength 11
       * @maxLength 2048
       */
      RoleArnForLogging: string;
    };
    PublishFindingToSnsParams?: {
      /**
       * The ARN of the topic to which you want to publish the findings.
       * @minLength 11
       * @maxLength 2048
       */
      TopicArn: string;
    };
    ReplaceDefaultPolicyVersionParams?: {
      /** @enum ["BLANK_POLICY","UNSET_VALUE"] */
      TemplateName: "BLANK_POLICY" | "UNSET_VALUE";
    };
    UpdateCACertificateParams?: {
      /** @enum ["DEACTIVATE","UNSET_VALUE"] */
      Action: "DEACTIVATE" | "UNSET_VALUE";
    };
    UpdateDeviceCertificateParams?: {
      /** @enum ["DEACTIVATE","UNSET_VALUE"] */
      Action: "DEACTIVATE" | "UNSET_VALUE";
    };
  };
  MitigationActionArn?: string;
  MitigationActionId?: string;
};
