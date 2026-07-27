// This file is auto-generated. Do not edit manually.
// Source: aws-ssmincidents-responseplan.json

/** Resource type definition for AWS::SSMIncidents::ResponsePlan */
export type AwsSsmincidentsResponseplan = {
  /**
   * The ARN of the response plan.
   * @maxLength 1000
   * @pattern ^arn:aws(-(cn|us-gov))?:[a-z-]+:(([a-z]+-)+[0-9])?:([0-9]{12})?:[^.]+$
   */
  Arn?: string;
  /**
   * The name of the response plan.
   * @minLength 1
   * @maxLength 200
   * @pattern ^[a-zA-Z0-9_-]*$
   */
  Name: string;
  /**
   * The display name of the response plan.
   * @minLength 1
   * @maxLength 200
   */
  DisplayName?: string;
  ChatChannel?: {
    ChatbotSns?: string[];
  };
  /**
   * The list of engagements to use.
   * @default []
   * @maxItems 5
   * @uniqueItems true
   */
  Engagements?: string[];
  /**
   * The list of actions.
   * @default []
   * @maxItems 1
   * @uniqueItems true
   */
  Actions?: ({
    SsmAutomation?: {
      /**
       * The role ARN to use when starting the SSM automation document.
       * @maxLength 1000
       * @pattern ^arn:aws(-(cn|us-gov))?:[a-z-]+:(([a-z]+-)+[0-9])?:([0-9]{12})?:[^.]+$
       */
      RoleArn: string;
      /**
       * The document name to use when starting the SSM automation document.
       * @maxLength 128
       */
      DocumentName: string;
      /**
       * The version of the document to use when starting the SSM automation document.
       * @maxLength 128
       */
      DocumentVersion?: string;
      /**
       * The account type to use when starting the SSM automation document.
       * @enum ["IMPACTED_ACCOUNT","RESPONSE_PLAN_OWNER_ACCOUNT"]
       */
      TargetAccount?: "IMPACTED_ACCOUNT" | "RESPONSE_PLAN_OWNER_ACCOUNT";
      /**
       * The parameters to set when starting the SSM automation document.
       * @default []
       * @minItems 1
       * @maxItems 200
       * @uniqueItems true
       */
      Parameters?: {
        /**
         * @minLength 1
         * @maxLength 50
         */
        Key: string;
        /**
         * @maxItems 10
         * @uniqueItems true
         */
        Values: string[];
      }[];
      /**
       * The parameters with dynamic values to set when starting the SSM automation document.
       * @default []
       * @maxItems 200
       * @uniqueItems true
       */
      DynamicParameters?: ({
        /**
         * @minLength 1
         * @maxLength 50
         */
        Key: string;
        Value: {
          Variable?: "INCIDENT_RECORD_ARN" | "INVOLVED_RESOURCES";
        };
      })[];
    };
  })[];
  /**
   * The list of integrations.
   * @default []
   * @maxItems 1
   * @uniqueItems true
   */
  Integrations?: unknown[];
  /**
   * The tags to apply to the response plan.
   * @default []
   * @maxItems 50
   * @uniqueItems true
   */
  Tags?: {
    /**
     * @minLength 1
     * @maxLength 128
     * @pattern ^(?!aws:)[a-zA-Z+-=._:/]+$
     */
    Key: string;
    /**
     * @minLength 1
     * @maxLength 256
     */
    Value: string;
  }[];
  IncidentTemplate: {
    /**
     * The deduplication string.
     * @minLength 1
     * @maxLength 1000
     */
    DedupeString?: string;
    /**
     * The impact value.
     * @minimum 1
     * @maximum 5
     */
    Impact: number;
    /**
     * The list of notification targets.
     * @default []
     * @maxItems 10
     */
    NotificationTargets?: {
      SnsTopicArn?: string;
    }[];
    /**
     * The summary string.
     * @minLength 1
     * @maxLength 4000
     */
    Summary?: string;
    /**
     * The title string.
     * @maxLength 200
     */
    Title: string;
    /**
     * Tags that get applied to incidents created by the StartIncident API action.
     * @default []
     * @maxItems 50
     * @uniqueItems true
     */
    IncidentTags?: {
      /**
       * @minLength 1
       * @maxLength 128
       * @pattern ^(?!aws:)[a-zA-Z+-=._:/]+$
       */
      Key: string;
      /**
       * @minLength 1
       * @maxLength 256
       */
      Value: string;
    }[];
  };
};
