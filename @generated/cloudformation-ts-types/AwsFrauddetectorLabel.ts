// This file is auto-generated. Do not edit manually.
// Source: aws-frauddetector-label.json

/** An label for fraud detector. */
export type AwsFrauddetectorLabel = {
  /**
   * The name of the label.
   * @minLength 1
   * @maxLength 64
   * @pattern ^[0-9a-z_-]+$
   */
  Name: string;
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
  /**
   * The label description.
   * @minLength 1
   * @maxLength 128
   */
  Description?: string;
  /** The label ARN. */
  Arn?: string;
  /** The timestamp when the label was created. */
  CreatedTime?: string;
  /** The timestamp when the label was last updated. */
  LastUpdatedTime?: string;
};
