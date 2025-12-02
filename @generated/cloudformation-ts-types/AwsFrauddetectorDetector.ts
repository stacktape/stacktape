// This file is auto-generated. Do not edit manually.
// Source: aws-frauddetector-detector.json

/** A resource schema for a Detector in Amazon Fraud Detector. */
export type AwsFrauddetectorDetector = {
  /**
   * The ID of the detector
   * @minLength 1
   * @maxLength 64
   * @pattern ^[0-9a-z_-]+$
   */
  DetectorId: string;
  /**
   * The desired detector version status for the detector
   * @enum ["DRAFT","ACTIVE"]
   */
  DetectorVersionStatus?: "DRAFT" | "ACTIVE";
  /** The active version ID of the detector */
  DetectorVersionId?: string;
  /** @enum ["FIRST_MATCHED","ALL_MATCHED"] */
  RuleExecutionMode?: "FIRST_MATCHED" | "ALL_MATCHED";
  /**
   * Tags associated with this detector.
   * @maxItems 200
   * @uniqueItems false
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
  /**
   * The description of the detector.
   * @minLength 1
   * @maxLength 128
   */
  Description?: string;
  /**
   * @minItems 1
   * @uniqueItems false
   */
  Rules: {
    RuleId?: string;
    RuleVersion?: string;
    DetectorId?: string;
    Expression?: string;
    /** @enum ["DETECTORPL"] */
    Language?: "DETECTORPL";
    /**
     * @minItems 1
     * @uniqueItems false
     */
    Outcomes?: {
      Arn?: string;
      Inline?: boolean;
      Name?: string;
      /**
       * The description.
       * @minLength 1
       * @maxLength 256
       */
      Description?: string;
      /**
       * Tags associated with this outcome.
       * @maxItems 200
       * @uniqueItems false
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
      /** The time when the outcome was created. */
      CreatedTime?: string;
      /** The time when the outcome was last updated. */
      LastUpdatedTime?: string;
    }[];
    Arn?: string;
    /**
     * The description.
     * @minLength 1
     * @maxLength 256
     */
    Description?: string;
    /**
     * Tags associated with this event type.
     * @maxItems 200
     * @uniqueItems false
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
    /** The time when the event type was created. */
    CreatedTime?: string;
    /** The time when the event type was last updated. */
    LastUpdatedTime?: string;
  }[];
  /** The event type to associate this detector with. */
  EventType: {
    /**
     * The name for the event type
     * @minLength 1
     * @maxLength 64
     * @pattern ^[0-9a-z_-]+$
     */
    Name?: string;
    Inline?: boolean;
    /**
     * Tags associated with this event type.
     * @maxItems 200
     * @uniqueItems false
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
    /**
     * The description of the event type.
     * @minLength 1
     * @maxLength 128
     */
    Description?: string;
    /**
     * @minItems 1
     * @uniqueItems false
     */
    EventVariables?: ({
      Arn?: string;
      Inline?: boolean;
      Name?: string;
      /** @enum ["EVENT"] */
      DataSource?: "EVENT";
      /** @enum ["STRING","INTEGER","FLOAT","BOOLEAN"] */
      DataType?: "STRING" | "INTEGER" | "FLOAT" | "BOOLEAN";
      DefaultValue?: string;
      /** @enum ["AUTH_CODE","AVS","BILLING_ADDRESS_L1","BILLING_ADDRESS_L2","BILLING_CITY","BILLING_COUNTRY","BILLING_NAME","BILLING_PHONE","BILLING_STATE","BILLING_ZIP","CARD_BIN","CATEGORICAL","CURRENCY_CODE","EMAIL_ADDRESS","FINGERPRINT","FRAUD_LABEL","FREE_FORM_TEXT","IP_ADDRESS","NUMERIC","ORDER_ID","PAYMENT_TYPE","PHONE_NUMBER","PRICE","PRODUCT_CATEGORY","SHIPPING_ADDRESS_L1","SHIPPING_ADDRESS_L2","SHIPPING_CITY","SHIPPING_COUNTRY","SHIPPING_NAME","SHIPPING_PHONE","SHIPPING_STATE","SHIPPING_ZIP","USERAGENT"] */
      VariableType?: "AUTH_CODE" | "AVS" | "BILLING_ADDRESS_L1" | "BILLING_ADDRESS_L2" | "BILLING_CITY" | "BILLING_COUNTRY" | "BILLING_NAME" | "BILLING_PHONE" | "BILLING_STATE" | "BILLING_ZIP" | "CARD_BIN" | "CATEGORICAL" | "CURRENCY_CODE" | "EMAIL_ADDRESS" | "FINGERPRINT" | "FRAUD_LABEL" | "FREE_FORM_TEXT" | "IP_ADDRESS" | "NUMERIC" | "ORDER_ID" | "PAYMENT_TYPE" | "PHONE_NUMBER" | "PRICE" | "PRODUCT_CATEGORY" | "SHIPPING_ADDRESS_L1" | "SHIPPING_ADDRESS_L2" | "SHIPPING_CITY" | "SHIPPING_COUNTRY" | "SHIPPING_NAME" | "SHIPPING_PHONE" | "SHIPPING_STATE" | "SHIPPING_ZIP" | "USERAGENT";
      /**
       * The description.
       * @minLength 1
       * @maxLength 256
       */
      Description?: string;
      /**
       * Tags associated with this event variable.
       * @maxItems 200
       * @uniqueItems false
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
      /** The time when the event variable was created. */
      CreatedTime?: string;
      /** The time when the event variable was last updated. */
      LastUpdatedTime?: string;
    })[];
    /**
     * @minItems 2
     * @uniqueItems false
     */
    Labels?: {
      Arn?: string;
      Inline?: boolean;
      Name?: string;
      /**
       * The description.
       * @minLength 1
       * @maxLength 256
       */
      Description?: string;
      /**
       * Tags associated with this label.
       * @maxItems 200
       * @uniqueItems false
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
      /** The time when the label was created. */
      CreatedTime?: string;
      /** The time when the label was last updated. */
      LastUpdatedTime?: string;
    }[];
    /**
     * @minItems 1
     * @uniqueItems false
     */
    EntityTypes?: {
      Arn?: string;
      Inline?: boolean;
      Name?: string;
      /**
       * The description.
       * @minLength 1
       * @maxLength 256
       */
      Description?: string;
      /**
       * Tags associated with this entity type.
       * @maxItems 200
       * @uniqueItems false
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
      /** The time when the entity type was created. */
      CreatedTime?: string;
      /** The time when the entity type was last updated. */
      LastUpdatedTime?: string;
    }[];
    /** The ARN of the event type. */
    Arn?: string;
    /** The time when the event type was created. */
    CreatedTime?: string;
    /** The time when the event type was last updated. */
    LastUpdatedTime?: string;
  };
  /** The ARN of the detector. */
  Arn?: string;
  /** The time when the detector was created. */
  CreatedTime?: string;
  /** The time when the detector was last updated. */
  LastUpdatedTime?: string;
  /**
   * The models to associate with this detector.
   * @maxItems 10
   * @uniqueItems false
   */
  AssociatedModels?: {
    Arn?: string;
  }[];
};
