// This file is auto-generated. Do not edit manually.
// Source: aws-bedrock-guardrail.json

/** Definition of AWS::Bedrock::Guardrail Resource Type */
export type AwsBedrockGuardrail = {
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
  AutomatedReasoningPolicyConfig?: {
    /**
     * The confidence threshold for triggering guardrail actions based on Automated Reasoning policy
     * violations.
     * @minimum 0
     * @maximum 1
     */
    ConfidenceThreshold?: number;
    /**
     * The list of Automated Reasoning policy ARNs to include in the guardrail configuration
     * @minItems 1
     * @maxItems 2
     * @uniqueItems true
     */
    Policies: string[];
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
      /**
       * List of modalities
       * @minItems 1
       */
      InputModalities?: ("TEXT" | "IMAGE")[];
      /**
       * List of modalities
       * @minItems 1
       */
      OutputModalities?: ("TEXT" | "IMAGE")[];
      InputAction?: "BLOCK" | "NONE";
      OutputAction?: "BLOCK" | "NONE";
      InputEnabled?: boolean;
      OutputEnabled?: boolean;
    })[];
    /** Guardrail tier config for content policy */
    ContentFiltersTierConfig?: {
      TierName: "CLASSIC" | "STANDARD";
    };
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
       * @minimum 0
       */
      Threshold: number;
      Action?: "BLOCK" | "NONE";
      Enabled?: boolean;
    })[];
  };
  /** Time Stamp */
  CreatedAt?: string;
  CrossRegionConfig?: {
    /**
     * The Amazon Resource Name (ARN) of the guardrail profile
     * @minLength 15
     * @maxLength 2048
     * @pattern ^arn:aws(-[^:]+)?:bedrock:[a-z0-9-]{1,20}:[0-9]{12}:guardrail-profile/[a-z0-9-]+[.]{1}guardrail[.]{1}v[0-9:]+$
     */
    GuardrailProfileArn: string;
  };
  /**
   * Description of the guardrail or its version
   * @minLength 1
   * @maxLength 200
   */
  Description?: string;
  /**
   * List of failure recommendations
   * @maxItems 100
   */
  FailureRecommendations?: string[];
  /**
   * Arn representation for the guardrail
   * @maxLength 2048
   * @pattern ^arn:aws(-[^:]+)?:bedrock:[a-z0-9-]{1,20}:[0-9]{12}:guardrail/[a-z0-9]+$
   */
  GuardrailArn?: string;
  /**
   * Unique id for the guardrail
   * @maxLength 64
   * @pattern ^[a-z0-9]+$
   */
  GuardrailId?: string;
  /**
   * The KMS key with which the guardrail was encrypted at rest
   * @minLength 1
   * @maxLength 2048
   * @pattern ^arn:aws(-[^:]+)?:kms:[a-zA-Z0-9-]*:[0-9]{12}:key/[a-zA-Z0-9-]{36}$
   */
  KmsKeyArn?: string;
  /**
   * Name of the guardrail
   * @minLength 1
   * @maxLength 50
   * @pattern ^[0-9a-zA-Z-_]+$
   */
  Name: string;
  SensitiveInformationPolicyConfig?: {
    /**
     * List of entities.
     * @minItems 1
     * @uniqueItems true
     */
    PiiEntitiesConfig?: ({
      Type: "ADDRESS" | "AGE" | "AWS_ACCESS_KEY" | "AWS_SECRET_KEY" | "CA_HEALTH_NUMBER" | "CA_SOCIAL_INSURANCE_NUMBER" | "CREDIT_DEBIT_CARD_CVV" | "CREDIT_DEBIT_CARD_EXPIRY" | "CREDIT_DEBIT_CARD_NUMBER" | "DRIVER_ID" | "EMAIL" | "INTERNATIONAL_BANK_ACCOUNT_NUMBER" | "IP_ADDRESS" | "LICENSE_PLATE" | "MAC_ADDRESS" | "NAME" | "PASSWORD" | "PHONE" | "PIN" | "SWIFT_CODE" | "UK_NATIONAL_HEALTH_SERVICE_NUMBER" | "UK_NATIONAL_INSURANCE_NUMBER" | "UK_UNIQUE_TAXPAYER_REFERENCE_NUMBER" | "URL" | "USERNAME" | "US_BANK_ACCOUNT_NUMBER" | "US_BANK_ROUTING_NUMBER" | "US_INDIVIDUAL_TAX_IDENTIFICATION_NUMBER" | "US_PASSPORT_NUMBER" | "US_SOCIAL_SECURITY_NUMBER" | "VEHICLE_IDENTIFICATION_NUMBER";
      Action: "BLOCK" | "ANONYMIZE" | "NONE";
      InputAction?: "BLOCK" | "ANONYMIZE" | "NONE";
      OutputAction?: "BLOCK" | "ANONYMIZE" | "NONE";
      InputEnabled?: boolean;
      OutputEnabled?: boolean;
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
      Action: "BLOCK" | "ANONYMIZE" | "NONE";
      InputAction?: "BLOCK" | "ANONYMIZE" | "NONE";
      OutputAction?: "BLOCK" | "ANONYMIZE" | "NONE";
      InputEnabled?: boolean;
      OutputEnabled?: boolean;
    })[];
  };
  Status?: "CREATING" | "UPDATING" | "VERSIONING" | "READY" | "FAILED" | "DELETING";
  /**
   * List of status reasons
   * @maxItems 100
   */
  StatusReasons?: string[];
  /**
   * List of Tags
   * @minItems 0
   * @maxItems 200
   */
  Tags?: {
    /**
     * Tag Key
     * @minLength 1
     * @maxLength 128
     * @pattern ^[a-zA-Z0-9\s._:/=+@-]*$
     */
    Key: string;
    /**
     * Tag Value
     * @minLength 0
     * @maxLength 256
     * @pattern ^[a-zA-Z0-9\s._:/=+@-]*$
     */
    Value: string;
  }[];
  TopicPolicyConfig?: {
    /**
     * List of topic configs in topic policy.
     * @minItems 1
     */
    TopicsConfig: ({
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
       * @maxLength 1000
       */
      Definition: string;
      /**
       * List of text examples
       * @minItems 0
       */
      Examples?: string[];
      Type: "DENY";
      InputAction?: "BLOCK" | "NONE";
      OutputAction?: "BLOCK" | "NONE";
      InputEnabled?: boolean;
      OutputEnabled?: boolean;
    })[];
    /** Guardrail tier config for topic policy */
    TopicsTierConfig?: {
      TierName: "CLASSIC" | "STANDARD";
    };
  };
  /** Time Stamp */
  UpdatedAt?: string;
  /**
   * Guardrail version
   * @pattern ^(([1-9][0-9]{0,7})|(DRAFT))$
   */
  Version?: string;
  WordPolicyConfig?: {
    /**
     * List of custom word configs.
     * @minItems 1
     */
    WordsConfig?: ({
      /**
       * The custom word text.
       * @minLength 1
       */
      Text: string;
      InputAction?: "BLOCK" | "NONE";
      OutputAction?: "BLOCK" | "NONE";
      InputEnabled?: boolean;
      OutputEnabled?: boolean;
    })[];
    /** A config for the list of managed words. */
    ManagedWordListsConfig?: ({
      Type: "PROFANITY";
      InputAction?: "BLOCK" | "NONE";
      OutputAction?: "BLOCK" | "NONE";
      InputEnabled?: boolean;
      OutputEnabled?: boolean;
    })[];
  };
};
