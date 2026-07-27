// This file is auto-generated. Do not edit manually.
// Source: aws-frauddetector-variable.json

/** A resource schema for a Variable in Amazon Fraud Detector. */
export type AwsFrauddetectorVariable = {
  /**
   * The name of the variable.
   * @pattern ^[a-z_][a-z0-9_]{0,99}?$
   */
  Name: string;
  /**
   * The source of the data.
   * @enum ["EVENT","EXTERNAL_MODEL_SCORE"]
   */
  DataSource: "EVENT" | "EXTERNAL_MODEL_SCORE";
  /**
   * The data type.
   * @enum ["STRING","INTEGER","FLOAT","BOOLEAN"]
   */
  DataType: "STRING" | "INTEGER" | "FLOAT" | "BOOLEAN";
  /** The default value for the variable when no value is received. */
  DefaultValue: string;
  /**
   * The description.
   * @minLength 1
   * @maxLength 256
   */
  Description?: string;
  /**
   * Tags associated with this variable.
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
   * The variable type. For more information see
   * https://docs.aws.amazon.com/frauddetector/latest/ug/create-a-variable.html#variable-types
   * @enum ["AUTH_CODE","AVS","BILLING_ADDRESS_L1","BILLING_ADDRESS_L2","BILLING_CITY","BILLING_COUNTRY","BILLING_NAME","BILLING_PHONE","BILLING_STATE","BILLING_ZIP","CARD_BIN","CATEGORICAL","CURRENCY_CODE","EMAIL_ADDRESS","FINGERPRINT","FRAUD_LABEL","FREE_FORM_TEXT","IP_ADDRESS","NUMERIC","ORDER_ID","PAYMENT_TYPE","PHONE_NUMBER","PRICE","PRODUCT_CATEGORY","SHIPPING_ADDRESS_L1","SHIPPING_ADDRESS_L2","SHIPPING_CITY","SHIPPING_COUNTRY","SHIPPING_NAME","SHIPPING_PHONE","SHIPPING_STATE","SHIPPING_ZIP","USERAGENT"]
   */
  VariableType?: "AUTH_CODE" | "AVS" | "BILLING_ADDRESS_L1" | "BILLING_ADDRESS_L2" | "BILLING_CITY" | "BILLING_COUNTRY" | "BILLING_NAME" | "BILLING_PHONE" | "BILLING_STATE" | "BILLING_ZIP" | "CARD_BIN" | "CATEGORICAL" | "CURRENCY_CODE" | "EMAIL_ADDRESS" | "FINGERPRINT" | "FRAUD_LABEL" | "FREE_FORM_TEXT" | "IP_ADDRESS" | "NUMERIC" | "ORDER_ID" | "PAYMENT_TYPE" | "PHONE_NUMBER" | "PRICE" | "PRODUCT_CATEGORY" | "SHIPPING_ADDRESS_L1" | "SHIPPING_ADDRESS_L2" | "SHIPPING_CITY" | "SHIPPING_COUNTRY" | "SHIPPING_NAME" | "SHIPPING_PHONE" | "SHIPPING_STATE" | "SHIPPING_ZIP" | "USERAGENT";
  /** The ARN of the variable. */
  Arn?: string;
  /** The time when the variable was created. */
  CreatedTime?: string;
  /** The time when the variable was last updated. */
  LastUpdatedTime?: string;
};
