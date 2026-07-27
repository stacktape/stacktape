// This file is auto-generated. Do not edit manually.
// Source: aws-frauddetector-entitytype.json

/** An entity type for fraud detector. */
export type AwsFrauddetectorEntitytype = {
  /**
   * The name of the entity type.
   * @minLength 1
   * @maxLength 64
   * @pattern ^[0-9a-z_-]+$
   */
  Name: string;
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
  /**
   * The entity type description.
   * @minLength 1
   * @maxLength 128
   */
  Description?: string;
  /** The entity type ARN. */
  Arn?: string;
  /** The timestamp when the entity type was created. */
  CreatedTime?: string;
  /** The timestamp when the entity type was last updated. */
  LastUpdatedTime?: string;
};
