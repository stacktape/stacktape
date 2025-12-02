// This file is auto-generated. Do not edit manually.
// Source: aws-securityhub-automationrulev2.json

/** Resource schema for AWS::SecurityHub::AutomationRuleV2 */
export type AwsSecurityhubAutomationrulev2 = {
  /**
   * The name of the automation rule
   * @minLength 1
   * @maxLength 256
   * @pattern .*\S.*
   */
  RuleName: string;
  /**
   * The status of the automation rule
   * @enum ["ENABLED","DISABLED"]
   */
  RuleStatus?: "ENABLED" | "DISABLED";
  /**
   * A description of the automation rule
   * @minLength 1
   * @maxLength 256
   * @pattern .*\S.*
   */
  Description: string;
  /**
   * The value for the rule priority
   * @minimum 1
   * @maximum 1000
   */
  RuleOrder: number;
  Criteria: {
    OcsfFindingCriteria?: {
      /**
       * Enables the creation of complex filtering conditions by combining filter
       * @uniqueItems true
       */
      CompositeFilters?: ({
        /**
         * Enables filtering based on string field values
         * @minItems 1
         * @maxItems 20
         * @uniqueItems true
         */
        StringFilters?: ({
          FieldName: "activity_name" | "cloud.account.name" | "cloud.account.uid" | "cloud.provider" | "cloud.region" | "compliance.assessments.category" | "compliance.assessments.name" | "compliance.control" | "compliance.status" | "compliance.standards" | "finding_info.desc" | "finding_info.src_url" | "finding_info.title" | "finding_info.types" | "finding_info.uid" | "finding_info.related_events.uid" | "finding_info.related_events.product.uid" | "finding_info.related_events.title" | "metadata.product.feature.uid" | "metadata.product.name" | "metadata.product.uid" | "metadata.product.vendor_name" | "remediation.desc" | "remediation.references" | "resources.cloud_partition" | "resources.name" | "resources.region" | "resources.type" | "resources.uid" | "vulnerabilities.fix_coverage" | "class_name" | "vendor_attributes.severity";
          Filter: {
            /**
             * The string filter value
             * @minLength 1
             * @maxLength 4096
             */
            Value: string;
            /**
             * The condition to apply to a string value when filtering findings
             * @enum ["EQUALS","PREFIX","NOT_EQUALS","PREFIX_NOT_EQUALS","CONTAINS"]
             */
            Comparison: "EQUALS" | "PREFIX" | "NOT_EQUALS" | "PREFIX_NOT_EQUALS" | "CONTAINS";
          };
        })[];
        /**
         * Enables filtering based on date and timestamp fields
         * @minItems 1
         * @maxItems 20
         * @uniqueItems true
         */
        DateFilters?: ({
          /**
           * The name of the field
           * @enum ["finding_info.created_time_dt","finding_info.first_seen_time_dt","finding_info.last_seen_time_dt","finding_info.modified_time_dt"]
           */
          FieldName: "finding_info.created_time_dt" | "finding_info.first_seen_time_dt" | "finding_info.last_seen_time_dt" | "finding_info.modified_time_dt";
          Filter: {
            DateRange?: {
              /**
               * A date range unit for the date filter
               * @enum ["DAYS"]
               */
              Unit: "DAYS";
              /** A date range value for the date filter */
              Value: number;
            };
            End?: string;
            Start?: string;
          };
        })[];
        /**
         * Enables filtering based on boolean field values
         * @minItems 1
         * @maxItems 20
         * @uniqueItems true
         */
        BooleanFilters?: ({
          /**
           * The name of the field
           * @enum ["compliance.assessments.meets_criteria","vulnerabilities.is_exploit_available","vulnerabilities.is_fix_available"]
           */
          FieldName: "compliance.assessments.meets_criteria" | "vulnerabilities.is_exploit_available" | "vulnerabilities.is_fix_available";
          Filter: {
            /** The value of the boolean */
            Value: boolean;
          };
        })[];
        /**
         * Enables filtering based on numerical field values
         * @minItems 1
         * @maxItems 20
         * @uniqueItems true
         */
        NumberFilters?: ({
          /**
           * The name of the field
           * @enum ["activity_id","compliance.status_id","confidence_score","finding_info.related_events_count","vendor_attributes.severity_id"]
           */
          FieldName: "activity_id" | "compliance.status_id" | "confidence_score" | "finding_info.related_events_count" | "vendor_attributes.severity_id";
          Filter: {
            /** The equal-to condition to be applied to a single field when querying for findings */
            Eq?: number;
            /** The greater-than-equal condition to be applied to a single field when querying for findings */
            Gte?: number;
            /** The less-than-equal condition to be applied to a single field when querying for findings */
            Lte?: number;
          };
        })[];
        /**
         * Enables filtering based on map field value
         * @minItems 1
         * @maxItems 20
         */
        MapFilters?: ({
          /**
           * The name of the field
           * @enum ["resources.tags"]
           */
          FieldName: "resources.tags";
          Filter: {
            /**
             * The condition to apply to the key value when filtering findings with a map filter
             * @enum ["EQUALS","NOT_EQUALS"]
             */
            Comparison: "EQUALS" | "NOT_EQUALS";
            /**
             * The key of the map filter
             * @minLength 1
             * @maxLength 4096
             */
            Key: string;
            /**
             * The value for the key in the map filter
             * @minLength 1
             * @maxLength 4096
             */
            Value: string;
          };
        })[];
        Operator?: "AND" | "OR";
      })[];
      CompositeOperator?: "AND" | "OR";
    };
  };
  /**
   * A list of actions to be performed when the rule criteria is met
   * @minItems 1
   * @maxItems 1
   * @uniqueItems true
   */
  Actions: ({
    /**
     * The category of action to be executed by the automation rule
     * @enum ["FINDING_FIELDS_UPDATE","EXTERNAL_INTEGRATION"]
     */
    Type: "FINDING_FIELDS_UPDATE" | "EXTERNAL_INTEGRATION";
    FindingFieldsUpdate?: {
      /** The severity level to be assigned to findings that match the automation rule criteria */
      SeverityId?: number;
      /**
       * Notes or contextual information for findings that are modified by the automation rule
       * @pattern .*\S.*
       */
      Comment?: string;
      /** The status to be applied to findings that match automation rule criteria */
      StatusId?: number;
    };
    ExternalIntegrationConfiguration?: {
      /**
       * The ARN of the connector that establishes the integration
       * @pattern .*\S.*
       */
      ConnectorArn?: string;
    };
  })[];
  Tags?: Record<string, string>;
  /**
   * The ARN of the automation rule
   * @pattern ^arn:aws\S*:securityhub:[a-z0-9-]+:[0-9]{12}:automation-rulev2/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$
   */
  RuleArn?: string;
  /**
   * The ID of the automation rule
   * @pattern ^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$
   */
  RuleId?: string;
  CreatedAt?: string;
  UpdatedAt?: string;
};
