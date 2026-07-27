// This file is auto-generated. Do not edit manually.
// Source: aws-cleanrooms-privacybudgettemplate.json

/** Represents a privacy budget within a collaboration */
export type AwsCleanroomsPrivacybudgettemplate = {
  /** @maxLength 200 */
  Arn?: string;
  /** @maxLength 100 */
  CollaborationArn?: string;
  /**
   * @minLength 36
   * @maxLength 36
   * @pattern [0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}
   */
  CollaborationIdentifier?: string;
  /**
   * @minLength 36
   * @maxLength 36
   * @pattern [0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}
   */
  PrivacyBudgetTemplateIdentifier?: string;
  /** An arbitrary set of tags (key-value pairs) for this cleanrooms privacy budget template. */
  Tags?: {
    /**
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * @minLength 1
     * @maxLength 256
     */
    Value: string;
  }[];
  /** @enum ["CALENDAR_MONTH","NONE"] */
  AutoRefresh: "CALENDAR_MONTH" | "NONE";
  /** @enum ["DIFFERENTIAL_PRIVACY","ACCESS_BUDGET"] */
  PrivacyBudgetType: "DIFFERENTIAL_PRIVACY" | "ACCESS_BUDGET";
  Parameters: {
    /**
     * @minimum 1
     * @maximum 20
     */
    Epsilon?: number;
    /**
     * @minimum 10
     * @maximum 100
     */
    UsersNoisePerQuery?: number;
    /**
     * @minItems 1
     * @maxItems 2
     */
    BudgetParameters?: ({
      /** @enum ["CALENDAR_DAY","CALENDAR_MONTH","CALENDAR_WEEK","LIFETIME"] */
      Type: "CALENDAR_DAY" | "CALENDAR_MONTH" | "CALENDAR_WEEK" | "LIFETIME";
      /** @minimum 0 */
      Budget: number;
      /** @enum ["ENABLED","DISABLED"] */
      AutoRefresh?: "ENABLED" | "DISABLED";
    })[];
    /** @maxLength 200 */
    ResourceArn?: string;
  };
  /** @maxLength 100 */
  MembershipArn?: string;
  /**
   * @minLength 36
   * @maxLength 36
   * @pattern [0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}
   */
  MembershipIdentifier: string;
};
