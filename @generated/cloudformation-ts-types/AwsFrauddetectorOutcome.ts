// This file is auto-generated. Do not edit manually.
// Source: aws-frauddetector-outcome.json

/** An outcome for rule evaluation. */
export type AwsFrauddetectorOutcome = {
  /**
   * The name of the outcome.
   * @minLength 1
   * @maxLength 64
   * @pattern ^[0-9a-z_-]+$
   */
  Name: string;
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
  /**
   * The outcome description.
   * @minLength 1
   * @maxLength 128
   */
  Description?: string;
  /** The outcome ARN. */
  Arn?: string;
  /** The timestamp when the outcome was created. */
  CreatedTime?: string;
  /** The timestamp when the outcome was last updated. */
  LastUpdatedTime?: string;
};
