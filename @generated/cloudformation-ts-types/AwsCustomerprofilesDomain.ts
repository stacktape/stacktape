// This file is auto-generated. Do not edit manually.
// Source: aws-customerprofiles-domain.json

/** A domain defined for 3rd party data source in Profile Service */
export type AwsCustomerprofilesDomain = {
  /**
   * The unique name of the domain.
   * @minLength 1
   * @maxLength 64
   * @pattern ^[a-zA-Z0-9_-]+$
   */
  DomainName: string;
  /**
   * The URL of the SQS dead letter queue
   * @minLength 0
   * @maxLength 255
   */
  DeadLetterQueueUrl?: string;
  /**
   * The default encryption key
   * @minLength 0
   * @maxLength 255
   */
  DefaultEncryptionKey?: string;
  /**
   * The default number of days until the data within the domain expires.
   * @minimum 1
   * @maximum 1098
   */
  DefaultExpirationDays: number;
  Matching?: {
    /** The flag that enables the matching process of duplicate profiles. */
    Enabled: boolean;
    AutoMerging?: {
      /** The flag that enables the auto-merging of duplicate profiles. */
      Enabled: boolean;
      ConflictResolution?: {
        /**
         * How the auto-merging process should resolve conflicts between different profiles.
         * @enum ["RECENCY","SOURCE"]
         */
        ConflictResolvingModel: "RECENCY" | "SOURCE";
        /**
         * The ObjectType name that is used to resolve profile merging conflicts when choosing SOURCE as the
         * ConflictResolvingModel.
         * @minLength 1
         * @maxLength 255
         */
        SourceName?: string;
      };
      Consolidation?: {
        /**
         * A list of matching criteria.
         * @minItems 1
         * @maxItems 10
         */
        MatchingAttributesList: string[][];
      };
      /**
       * A number between 0 and 1 that represents the minimum confidence score required for profiles within
       * a matching group to be merged during the auto-merge process. A higher score means higher similarity
       * required to merge profiles.
       * @minimum 0
       * @maximum 1
       */
      MinAllowedConfidenceScoreForMerging?: number;
    };
    ExportingConfig?: {
      S3Exporting?: {
        /**
         * The name of the S3 bucket where Identity Resolution Jobs write result files.
         * @minLength 3
         * @maxLength 63
         * @pattern ^[a-z0-9.-]+$
         */
        S3BucketName: string;
        /**
         * The S3 key name of the location where Identity Resolution Jobs write result files.
         * @minLength 1
         * @maxLength 800
         * @pattern .*
         */
        S3KeyName?: string;
      };
    };
    JobSchedule?: {
      /**
       * The day when the Identity Resolution Job should run every week.
       * @enum ["SUNDAY","MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY"]
       */
      DayOfTheWeek: "SUNDAY" | "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY";
      /**
       * The time when the Identity Resolution Job should run every week.
       * @minLength 3
       * @maxLength 5
       * @pattern ^([0-9]|0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$
       */
      Time: string;
    };
  };
  RuleBasedMatching?: {
    /** The flag that enables the rule-based matching process of duplicate profiles. */
    Enabled: boolean;
    AttributeTypesSelector?: {
      /**
       * Configures the AttributeMatchingModel, you can either choose ONE_TO_ONE or MANY_TO_MANY.
       * @enum ["ONE_TO_ONE","MANY_TO_MANY"]
       */
      AttributeMatchingModel: "ONE_TO_ONE" | "MANY_TO_MANY";
      /**
       * The Address type. You can choose from Address, BusinessAddress, MaillingAddress, and
       * ShippingAddress. You only can use the Address type in the MatchingRule. For example, if you want to
       * match profile based on BusinessAddress.City or MaillingAddress.City, you need to choose the
       * BusinessAddress and the MaillingAddress to represent the Address type and specify the Address.City
       * on the matching rule.
       * @minItems 1
       * @maxItems 4
       */
      Address?: string[];
      /**
       * The Email type. You can choose from EmailAddress, BusinessEmailAddress and PersonalEmailAddress.
       * You only can use the EmailAddress type in the MatchingRule. For example, if you want to match
       * profile based on PersonalEmailAddress or BusinessEmailAddress, you need to choose the
       * PersonalEmailAddress and the BusinessEmailAddress to represent the EmailAddress type and only
       * specify the EmailAddress on the matching rule.
       * @minItems 1
       * @maxItems 3
       */
      EmailAddress?: string[];
      /**
       * The PhoneNumber type. You can choose from PhoneNumber, HomePhoneNumber, and MobilePhoneNumber. You
       * only can use the PhoneNumber type in the MatchingRule. For example, if you want to match a profile
       * based on Phone or HomePhone, you need to choose the Phone and the HomePhone to represent the
       * PhoneNumber type and only specify the PhoneNumber on the matching rule.
       * @minItems 1
       * @maxItems 4
       */
      PhoneNumber?: string[];
    };
    ConflictResolution?: {
      /**
       * How the auto-merging process should resolve conflicts between different profiles.
       * @enum ["RECENCY","SOURCE"]
       */
      ConflictResolvingModel: "RECENCY" | "SOURCE";
      /**
       * The ObjectType name that is used to resolve profile merging conflicts when choosing SOURCE as the
       * ConflictResolvingModel.
       * @minLength 1
       * @maxLength 255
       */
      SourceName?: string;
    };
    ExportingConfig?: {
      S3Exporting?: {
        /**
         * The name of the S3 bucket where Identity Resolution Jobs write result files.
         * @minLength 3
         * @maxLength 63
         * @pattern ^[a-z0-9.-]+$
         */
        S3BucketName: string;
        /**
         * The S3 key name of the location where Identity Resolution Jobs write result files.
         * @minLength 1
         * @maxLength 800
         * @pattern .*
         */
        S3KeyName?: string;
      };
    };
    /**
     * Configures how the rule-based matching process should match profiles. You can have up to 15
     * MatchingRule in the MatchingRules.
     * @minItems 1
     * @maxItems 15
     */
    MatchingRules?: {
      Rule: string[];
    }[];
    /**
     * Indicates the maximum allowed rule level for matching.
     * @minimum 1
     * @maximum 15
     */
    MaxAllowedRuleLevelForMatching?: number;
    /**
     * Indicates the maximum allowed rule level for merging.
     * @minimum 1
     * @maximum 15
     */
    MaxAllowedRuleLevelForMerging?: number;
    /** @enum ["PENDING","IN_PROGRESS","ACTIVE"] */
    Status?: "PENDING" | "IN_PROGRESS" | "ACTIVE";
  };
  DataStore?: {
    /** Whether the data store is enabled. */
    Enabled?: boolean;
    Readiness?: {
      /**
       * The percentage of progress completed.
       * @minimum 0
       * @maximum 100
       */
      ProgressPercentage?: number;
      /** A message describing the current progress. */
      Message?: string;
    };
  };
  Stats?: {
    /**
     * The number of profiles that you are currently paying for in the domain. If you have more than 100
     * objects associated with a single profile, that profile counts as two profiles. If you have more
     * than 200 objects, that profile counts as three, and so on.
     */
    MeteringProfileCount?: number;
    /** The total number of objects in domain. */
    ObjectCount?: number;
    /** The total number of profiles currently in the domain. */
    ProfileCount?: number;
    /** The total size, in bytes, of all objects in the domain. */
    TotalSize?: number;
  };
  /**
   * The tags (keys and values) associated with the domain
   * @minItems 0
   * @maxItems 50
   */
  Tags?: {
    /**
     * @minLength 1
     * @maxLength 128
     * @pattern ^(?!aws:)[a-zA-Z+-=._:/]+$
     */
    Key: string;
    /**
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
  /** The time of this integration got created */
  CreatedAt?: string;
  /** The time of this integration got last updated at */
  LastUpdatedAt?: string;
};
