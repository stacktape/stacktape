// This file is auto-generated. Do not edit manually.
// Source: aws-connect-rule.json

/** Creates a rule for the specified CON instance. */
export type AwsConnectRule = {
  /**
   * The name of the rule.
   * @pattern ^[a-zA-Z0-9._-]{1,200}$
   */
  Name: string;
  /** @pattern ^arn:aws[-a-z0-9]*:connect:[-a-z0-9]*:[0-9]{12}:instance/[-a-zA-Z0-9]*/rule/[-a-zA-Z0-9]*$ */
  RuleArn?: string;
  /**
   * The Amazon Resource Name (ARN) of the instance.
   * @pattern ^arn:aws[-a-z0-9]*:connect:[-a-z0-9]*:[0-9]{12}:instance/[-a-zA-Z0-9]*$
   */
  InstanceArn: string;
  /** The event source to trigger the rule. */
  TriggerEventSource: {
    /**
     * The name of the event source.
     * @enum ["OnContactEvaluationSubmit","OnPostCallAnalysisAvailable","OnRealTimeCallAnalysisAvailable","OnRealTimeChatAnalysisAvailable","OnPostChatAnalysisAvailable","OnZendeskTicketCreate","OnZendeskTicketStatusUpdate","OnSalesforceCaseCreate","OnMetricDataUpdate","OnCaseCreate","OnCaseUpdate"]
     */
    EventSourceName: "OnContactEvaluationSubmit" | "OnPostCallAnalysisAvailable" | "OnRealTimeCallAnalysisAvailable" | "OnRealTimeChatAnalysisAvailable" | "OnPostChatAnalysisAvailable" | "OnZendeskTicketCreate" | "OnZendeskTicketStatusUpdate" | "OnSalesforceCaseCreate" | "OnMetricDataUpdate" | "OnCaseCreate" | "OnCaseUpdate";
    /**
     * The Amazon Resource Name (ARN) of the integration association. ``IntegrationAssociationArn`` is
     * required if ``TriggerEventSource`` is one of the following values: ``OnZendeskTicketCreate`` |
     * ``OnZendeskTicketStatusUpdate`` | ``OnSalesforceCaseCreate``
     * @pattern ^$|arn:aws[-a-z0-9]*:connect:[-a-z0-9]*:[0-9]{12}:instance/[-a-zA-Z0-9]*/integration-association/[-a-zA-Z0-9]*$
     */
    IntegrationAssociationArn?: string;
  };
  /** The conditions of the rule. */
  Function: string;
  /** A list of actions to be run when the rule is triggered. */
  Actions: {
    /** Information about the contact category action. The syntax can be empty, for example, ``{}``. */
    AssignContactCategoryActions?: Record<string, unknown>[];
    /** Information about the EV action. */
    EventBridgeActions?: {
      /**
       * The name.
       * @pattern ^[a-zA-Z0-9._-]{1,100}$
       */
      Name: string;
    }[];
    /**
     * Information about the task action. This field is required if ``TriggerEventSource`` is one of the
     * following values: ``OnZendeskTicketCreate`` | ``OnZendeskTicketStatusUpdate`` |
     * ``OnSalesforceCaseCreate``
     */
    TaskActions?: {
      /**
       * The name. Supports variable injection. For more information, see [JSONPath
       * reference](https://docs.aws.amazon.com/connect/latest/adminguide/contact-lens-variable-injection.html)
       * in the *Administrators Guide*.
       * @minLength 1
       * @maxLength 512
       */
      Name: string;
      /**
       * The description. Supports variable injection. For more information, see [JSONPath
       * reference](https://docs.aws.amazon.com/connect/latest/adminguide/contact-lens-variable-injection.html)
       * in the *Administrators Guide*.
       * @minLength 0
       * @maxLength 4096
       */
      Description?: string;
      /**
       * The Amazon Resource Name (ARN) of the flow.
       * @pattern ^$|arn:aws[-a-z0-9]*:connect:[-a-z0-9]*:[0-9]{12}:instance/[-a-zA-Z0-9]*/contact-flow/[-a-zA-Z0-9]*$
       */
      ContactFlowArn: string;
      /**
       * Information about the reference when the ``referenceType`` is ``URL``. Otherwise, null. ``URL`` is
       * the only accepted type. (Supports variable injection in the ``Value`` field.)
       */
      References?: unknown;
    }[];
    /** Information about the send notification action. */
    SendNotificationActions?: {
      /**
       * Notification delivery method.
       * *Allowed value*: ``EMAIL``
       * @enum ["EMAIL"]
       */
      DeliveryMethod: "EMAIL";
      /**
       * The subject of the email if the delivery method is ``EMAIL``. Supports variable injection. For more
       * information, see [JSONPath
       * reference](https://docs.aws.amazon.com/connect/latest/adminguide/contact-lens-variable-injection.html)
       * in the *Administrators Guide*.
       * @minLength 1
       * @maxLength 200
       */
      Subject?: string;
      /**
       * Notification content. Supports variable injection. For more information, see [JSONPath
       * reference](https://docs.aws.amazon.com/connect/latest/adminguide/contact-lens-variable-injection.html)
       * in the *Administrators Guide*.
       * @minLength 1
       * @maxLength 1024
       */
      Content: string;
      /**
       * Content type format.
       * *Allowed value*: ``PLAIN_TEXT``
       * @enum ["PLAIN_TEXT"]
       */
      ContentType: "PLAIN_TEXT";
      /** Notification recipient. */
      Recipient: {
        /**
         * The tags used to organize, track, or control access for this resource. For example, { "tags":
         * {"key1":"value1", "key2":"value2"} }. CON users with the specified tags will be notified.
         */
        UserTags?: unknown;
        /**
         * The Amazon Resource Name (ARN) of the user account.
         * @minItems 1
         * @maxItems 5
         * @uniqueItems true
         */
        UserArns?: string[];
      };
    }[];
    CreateCaseActions?: {
      Fields: {
        /**
         * @minLength 1
         * @maxLength 500
         */
        Id: string;
        Value: {
          StringValue?: string;
          BooleanValue?: boolean;
          DoubleValue?: number;
          EmptyValue?: Record<string, unknown>;
        };
      }[];
      /**
       * @minLength 1
       * @maxLength 500
       */
      TemplateId: string;
    }[];
    UpdateCaseActions?: {
      Fields: {
        /**
         * @minLength 1
         * @maxLength 500
         */
        Id: string;
        Value: {
          StringValue?: string;
          BooleanValue?: boolean;
          DoubleValue?: number;
          EmptyValue?: Record<string, unknown>;
        };
      }[];
    }[];
    EndAssociatedTasksActions?: Record<string, unknown>[];
    SubmitAutoEvaluationActions?: {
      /** @pattern ^$|arn:aws[-a-z0-9]*:connect:[-a-z0-9]*:[0-9]{12}:instance/[-a-zA-Z0-9]*/evaluation-form/[-a-zA-Z0-9]*$ */
      EvaluationFormArn: string;
    }[];
  };
  /**
   * The publish status of the rule.
   * *Allowed values*: ``DRAFT`` | ``PUBLISHED``
   * @enum ["DRAFT","PUBLISHED"]
   */
  PublishStatus: "DRAFT" | "PUBLISHED";
  /**
   * The tags used to organize, track, or control access for this resource. For example, { "tags":
   * {"key1":"value1", "key2":"value2"} }.
   * @maxItems 50
   * @uniqueItems true
   */
  Tags?: {
    /**
     * The key name of the tag. You can specify a value that is 1 to 128 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -
     * @minLength 1
     * @maxLength 128
     * @pattern ^(?!aws:)[a-zA-Z+-=._:/]+$
     */
    Key: string;
    /**
     * The value for the tag. You can specify a value that is 0 to 256 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -
     * @maxLength 256
     */
    Value: string;
  }[];
};
