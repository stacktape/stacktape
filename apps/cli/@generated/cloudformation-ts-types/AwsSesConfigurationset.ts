// This file is auto-generated. Do not edit manually.
// Source: aws-ses-configurationset.json

/** Resource schema for AWS::SES::ConfigurationSet. */
export type AwsSesConfigurationset = {
  /**
   * The name of the configuration set.
   * @pattern ^[a-zA-Z0-9_-]{1,64}$
   */
  Name?: string;
  TrackingOptions?: {
    /** The domain to use for tracking open and click events. */
    CustomRedirectDomain?: string;
    /**
     * The https policy to use for tracking open and click events.
     * @pattern REQUIRE|REQUIRE_OPEN_ONLY|OPTIONAL
     */
    HttpsPolicy?: string;
  };
  DeliveryOptions?: {
    /**
     * Specifies whether messages that use the configuration set are required to use Transport Layer
     * Security (TLS). If the value is Require , messages are only delivered if a TLS connection can be
     * established. If the value is Optional , messages can be delivered in plain text if a TLS connection
     * can't be established.
     * @pattern REQUIRE|OPTIONAL
     */
    TlsPolicy?: string;
    /** The name of the dedicated IP pool to associate with the configuration set. */
    SendingPoolName?: string;
    /**
     * Specifies the maximum time until which SES will retry sending emails
     * @minimum 300
     * @maximum 50400
     */
    MaxDeliverySeconds?: number;
  };
  ReputationOptions?: {
    /**
     * If true , tracking of reputation metrics is enabled for the configuration set. If false , tracking
     * of reputation metrics is disabled for the configuration set.
     * @pattern true|false
     */
    ReputationMetricsEnabled?: boolean;
  };
  SendingOptions?: {
    /** @pattern true|false */
    SendingEnabled?: boolean;
  };
  SuppressionOptions?: {
    /**
     * A list that contains the reasons that email addresses are automatically added to the suppression
     * list for your account.
     * @uniqueItems false
     */
    SuppressedReasons?: string[];
  };
  VdmOptions?: {
    DashboardOptions?: {
      /**
       * Whether emails sent with this configuration set have engagement tracking enabled.
       * @pattern ENABLED|DISABLED
       */
      EngagementMetrics: string;
    };
    GuardianOptions?: {
      /**
       * Whether emails sent with this configuration set have optimized delivery algorithm enabled.
       * @pattern ENABLED|DISABLED
       */
      OptimizedSharedDelivery: string;
    };
  };
  /**
   * The tags (keys and values) associated with the contact list.
   * @minItems 0
   * @maxItems 50
   */
  Tags?: {
    /**
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
};
