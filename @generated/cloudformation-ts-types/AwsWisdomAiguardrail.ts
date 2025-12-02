// This file is auto-generated. Do not edit manually.
// Source: aws-wisdom-aiguardrail.json

/** Definition of AWS::Wisdom::AIGuardrail Resource Type */
export type AwsWisdomAiguardrail = {
  /** @pattern ^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$|^arn:[a-z-]*?:wisdom:[a-z0-9-]*?:[0-9]{12}:[a-z-]*?/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}(?:/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}){0,2}$ */
  AssistantId: string;
  /** @pattern ^arn:[a-z-]*?:wisdom:[a-z0-9-]*?:[0-9]{12}:[a-z-]*?/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}(?:/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}){0,2}$ */
  AssistantArn?: string;
  /** @pattern ^arn:[a-z-]*?:wisdom:[a-z0-9-]*?:[0-9]{12}:[a-z-]*?/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}(?:/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}){0,2}$ */
  AIGuardrailArn?: string;
  /** @pattern ^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}(:[A-Z0-9_$]+){0,1}$|^arn:[a-z-]*?:wisdom:[a-z0-9-]*?:[0-9]{12}:[a-z-]*?/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}(?:/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}){0,2}(:[A-Z0-9_$]+){0,1}$ */
  AIGuardrailId?: string;
  /**
   * @minLength 1
   * @maxLength 255
   * @pattern ^[a-zA-Z0-9\s_.,-]+
   */
  Name?: string;
  /**
   * Messaging for when violations are detected in text
   * @minLength 1
   * @maxLength 500
   */
  BlockedInputMessaging: string;
  /**
   * Messaging for when violations are detected in text
   * @minLength 1
   * @maxLength 500
   */
  BlockedOutputsMessaging: string;
  /**
   * Description of the guardrail or its version
   * @minLength 1
   * @maxLength 200
   */
  Description?: string;
  TopicPolicyConfig?: {
    /**
     * List of topic configs in topic policy.
     * @minItems 1
     */
    TopicsConfig: {
      /**
       * Name of topic in topic policy
       * @minLength 1
       * @maxLength 100
       * @pattern ^[0-9a-zA-Z-_ !?.]+$
       */
      Name: string;
      /**
       * Definition of topic in topic policy
       * @minLength 1
       * @maxLength 200
       */
      Definition: string;
      /**
       * List of text examples
       * @minItems 0
       */
      Examples?: string[];
      Type: "DENY";
    }[];
  };
  ContentPolicyConfig?: {
    /**
     * List of content filter configs in content policy.
     * @minItems 1
     * @maxItems 6
     */
    FiltersConfig: ({
      Type: "SEXUAL" | "VIOLENCE" | "HATE" | "INSULTS" | "MISCONDUCT" | "PROMPT_ATTACK";
      InputStrength: "NONE" | "LOW" | "MEDIUM" | "HIGH";
      OutputStrength: "NONE" | "LOW" | "MEDIUM" | "HIGH";
    })[];
  };
  WordPolicyConfig?: {
    /**
     * List of custom word configs.
     * @minItems 1
     */
    WordsConfig?: {
      /**
       * The custom word text.
       * @minLength 1
       */
      Text: string;
    }[];
    /** A config for the list of managed words. */
    ManagedWordListsConfig?: {
      Type: "PROFANITY";
    }[];
  };
  SensitiveInformationPolicyConfig?: {
    /**
     * List of entities.
     * @minItems 1
     * @uniqueItems true
     */
    PiiEntitiesConfig?: ({
      Type: "ADDRESS" | "AGE" | "AWS_ACCESS_KEY" | "AWS_SECRET_KEY" | "CA_HEALTH_NUMBER" | "CA_SOCIAL_INSURANCE_NUMBER" | "CREDIT_DEBIT_CARD_CVV" | "CREDIT_DEBIT_CARD_EXPIRY" | "CREDIT_DEBIT_CARD_NUMBER" | "DRIVER_ID" | "EMAIL" | "INTERNATIONAL_BANK_ACCOUNT_NUMBER" | "IP_ADDRESS" | "LICENSE_PLATE" | "MAC_ADDRESS" | "NAME" | "PASSWORD" | "PHONE" | "PIN" | "SWIFT_CODE" | "UK_NATIONAL_HEALTH_SERVICE_NUMBER" | "UK_NATIONAL_INSURANCE_NUMBER" | "UK_UNIQUE_TAXPAYER_REFERENCE_NUMBER" | "URL" | "USERNAME" | "US_BANK_ACCOUNT_NUMBER" | "US_BANK_ROUTING_NUMBER" | "US_INDIVIDUAL_TAX_IDENTIFICATION_NUMBER" | "US_PASSPORT_NUMBER" | "US_SOCIAL_SECURITY_NUMBER" | "VEHICLE_IDENTIFICATION_NUMBER";
      Action: "BLOCK" | "ANONYMIZE";
    })[];
    /**
     * List of regex.
     * @minItems 1
     */
    RegexesConfig?: ({
      /**
       * The regex name.
       * @minLength 1
       * @maxLength 100
       */
      Name: string;
      /**
       * The regex description.
       * @minLength 1
       * @maxLength 1000
       */
      Description?: string;
      /**
       * The regex pattern.
       * @minLength 1
       */
      Pattern: string;
      Action: "BLOCK" | "ANONYMIZE";
    })[];
  };
  ContextualGroundingPolicyConfig?: {
    /**
     * List of contextual grounding filter configs.
     * @minItems 1
     */
    FiltersConfig: ({
      Type: "GROUNDING" | "RELEVANCE";
      /**
       * The threshold for this filter.
       * @default 0
       * @minimum 0
       */
      Threshold: number;
    })[];
  };
  Tags?: Record<string, string>;
};
