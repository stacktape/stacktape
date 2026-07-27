// This file is auto-generated. Do not edit manually.
// Source: aws-billing-billingview.json

/** A billing view is a container of cost & usage metadata. */
export type AwsBillingBillingview = {
  Arn?: string;
  BillingViewType?: "PRIMARY" | "BILLING_GROUP" | "CUSTOM";
  DataFilterExpression?: {
    Dimensions?: {
      Key?: "LINKED_ACCOUNT";
      /**
       * @minItems 1
       * @maxItems 200
       */
      Values?: string[];
    };
    Tags?: {
      /**
       * @maxLength 1024
       * @pattern [\S\s]*
       */
      Key?: string;
      /**
       * @minItems 1
       * @maxItems 200
       */
      Values?: string[];
    };
  };
  /** The time when the billing view was created. */
  CreatedAt?: number;
  /** @maxLength 1024 */
  Description?: string;
  /**
   * @minLength 1
   * @maxLength 128
   * @pattern [a-zA-Z0-9_\+=\.\-@]+
   */
  Name: string;
  /** @pattern [0-9]{12} */
  OwnerAccountId?: string;
  /**
   * An array of key-value pairs associated to the billing view being created.
   * @maxItems 200
   * @uniqueItems true
   */
  Tags?: {
    /**
     * The key name of the tag. You can specify a value that is 1 to 128 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * The value for the tag. You can specify a value that is 0 to 256 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
  /**
   * An array of strings that define the billing view's source.
   * @uniqueItems true
   */
  SourceViews: string[];
  /** The time when the billing view was last updated. */
  UpdatedAt?: number;
};
